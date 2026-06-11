create extension if not exists pg_cron;

drop policy if exists "Authenticated users read WORKOS presence"
  on realtime.messages;
drop policy if exists "Authenticated users write WORKOS presence"
  on realtime.messages;

create policy "Authenticated users read WORKOS presence"
on realtime.messages
for select
to authenticated
using (
  (select realtime.topic()) = 'crm-online-presence'
  and extension = 'presence'
);

create policy "Authenticated users write WORKOS presence"
on realtime.messages
for insert
to authenticated
with check (
  (select realtime.topic()) = 'crm-online-presence'
  and extension = 'presence'
);

create index if not exists activity_events_actor_idx
  on public.activity_events(actor_id);
create index if not exists demand_items_approved_by_idx
  on public.demand_items(approved_by);
create index if not exists review_comments_author_idx
  on public.review_comments(author_id);
create index if not exists review_comments_item_idx
  on public.review_comments(demand_item_id);
create index if not exists review_comments_resolved_by_idx
  on public.review_comments(resolved_by);
create index if not exists review_comments_submission_idx
  on public.review_comments(submission_id);
create index if not exists submission_items_reviewed_by_idx
  on public.submission_items(reviewed_by);
create index if not exists submissions_submitted_by_idx
  on public.submissions(submitted_by);

create or replace function private.notify_user(
  target_user_id text,
  target_task_id text,
  notification_title text,
  notification_body text,
  notification_type text
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications(
    body,
    created_by,
    target_user_id,
    task_id,
    title,
    type
  )
  select
    notification_body,
    null,
    target_user_id,
    target_task_id,
    notification_title,
    notification_type
  where target_user_id is not null
    and coalesce((
      select case notification_type
        when 'assignment' then np.assignment_enabled
        when 'review' then np.review_enabled
        when 'deadline' then np.deadline_enabled
        else true
      end
      from public.notification_preferences np
      where np.user_id = target_user_id
    ), true)
$$;

create or replace function private.can_access_task(target_task_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.production_tasks t
    where t.id = target_task_id
      and (
        private.current_profile_role() in ('Admin', 'Organizador')
        or t.assignee_id = private.current_profile_id()
        or t.reviewer_id = private.current_profile_id()
        or coalesce(t.checklist->'assigneeIds', '[]'::jsonb)
          ? private.current_profile_id()
        or exists (
          select 1
          from public.demand_items di
          where di.task_id = t.id
            and di.assignee_id = private.current_profile_id()
        )
      )
  )
$$;

create or replace function private.handle_new_task()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  piece_count integer;
  piece_instructions jsonb;
  position_index integer;
  initial_item_status text;
  assignee_ids text[];
  item_assignee text;
  target_assignee text;
begin
  piece_count := greatest(1, least(
    50,
    case
      when new.checklist->>'pieceCount' ~ '^[0-9]+$'
        then (new.checklist->>'pieceCount')::integer
      else 1
    end
  ));
  piece_instructions := coalesce(
    new.checklist->'pieceInstructions',
    '[]'::jsonb
  );
  initial_item_status := case
    when new.status in (
      'production',
      'review',
      'adjustments',
      'approved',
      'delivered'
    ) then new.status
    else 'planned'
  end;

  select coalesce(array_agg(value), array[new.assignee_id])
  into assignee_ids
  from jsonb_array_elements_text(
    coalesce(new.checklist->'assigneeIds', '[]'::jsonb)
  ) as value;

  if coalesce(array_length(assignee_ids, 1), 0) = 0 then
    assignee_ids := array[new.assignee_id];
  end if;

  for position_index in 1..piece_count
  loop
    item_assignee := assignee_ids[
      ((position_index - 1) % array_length(assignee_ids, 1)) + 1
    ];

    insert into public.demand_items(
      task_id,
      position,
      title,
      item_type,
      instruction,
      assignee_id,
      status
    )
    values (
      new.id,
      position_index,
      'Peca ' || position_index,
      new.type,
      coalesce(piece_instructions->>(position_index - 1), ''),
      item_assignee,
      initial_item_status
    )
    on conflict (task_id, position) do nothing;
  end loop;

  perform private.append_activity(
    new.id,
    new.client_id,
    private.current_profile_id(),
    'demand_created',
    jsonb_build_object(
      'status', new.status,
      'piece_count', piece_count,
      'assignee_ids', assignee_ids
    )
  );

  foreach target_assignee in array assignee_ids
  loop
    perform private.notify_user(
      target_assignee,
      new.id,
      'Nova demanda atribuida',
      new.title || ' entrou na sua fila.',
      'assignment'
    );
  end loop;

  return new;
end
$$;

create or replace function private.handle_task_assignee_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.assignee_id is distinct from old.assignee_id
     and new.assignee_id is not null then
    update public.demand_items
    set assignee_id = new.assignee_id, updated_at = now()
    where task_id = new.id
      and assignee_id is not distinct from old.assignee_id;

    perform private.notify_user(
      new.assignee_id,
      new.id,
      'Demanda atribuida',
      new.title || ' foi atribuida a voce.',
      'assignment'
    );
  end if;

  return new;
end
$$;

drop trigger if exists workos_task_assignee_change
  on public.production_tasks;
create trigger workos_task_assignee_change
after update of assignee_id on public.production_tasks
for each row execute function private.handle_task_assignee_change();

create or replace function private.handle_task_stage_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    if new.status <> 'blocked'
       and new.stage_entered_at is not distinct from old.stage_entered_at then
      new.stage_entered_at := now();
      new.stage_sla_due_at :=
        now() + private.stage_sla_interval(new.status);
    end if;

    if new.status = 'delivered' and new.archived_at is null then
      new.archived_at := now();
      new.archived_by := private.current_profile_id();
    end if;
  end if;

  return new;
end
$$;

drop trigger if exists workos_task_stage_change
  on public.production_tasks;
create trigger workos_task_stage_change
before update of status on public.production_tasks
for each row execute function private.handle_task_stage_change();

create or replace function public.reassign_demand(
  p_task_id text,
  p_assignee_id text,
  p_reason text
)
returns public.production_tasks
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_task public.production_tasks;
  old_assignee text;
  actor_id text := private.current_profile_id();
begin
  if private.current_profile_role() not in ('Admin', 'Organizador') then
    raise exception 'Only management can reassign demands'
      using errcode = '42501';
  end if;

  if length(trim(coalesce(p_reason, ''))) = 0 then
    raise exception 'Reassignment reason is required'
      using errcode = '22023';
  end if;

  select assignee_id into old_assignee
  from public.production_tasks
  where id = p_task_id
  for update;

  update public.production_tasks
  set assignee_id = p_assignee_id, updated_at = now()
  where id = p_task_id
  returning * into current_task;

  if current_task.id is null then
    raise exception 'Demand not found' using errcode = 'P0002';
  end if;

  update public.demand_items
  set assignee_id = p_assignee_id, updated_at = now()
  where task_id = p_task_id
    and (assignee_id = old_assignee or assignee_id is null);

  perform private.append_activity(
    current_task.id,
    current_task.client_id,
    actor_id,
    'demand_reassigned',
    jsonb_build_object(
      'from_assignee_id', old_assignee,
      'to_assignee_id', p_assignee_id,
      'reason', trim(p_reason)
    )
  );

  return current_task;
end
$$;

drop policy if exists "Team reads profiles" on public.profiles;
create policy "Team reads profiles"
on public.profiles
for select
to authenticated
using ((select auth.uid()) is not null);

drop policy if exists "Automation events insert authenticated."
  on public.automation_events;
drop policy if exists "Automation events select authenticated."
  on public.automation_events;
drop policy if exists "Automation events update authenticated."
  on public.automation_events;
drop policy if exists "Authorized users read demand items"
  on public.demand_items;
drop policy if exists "Authorized users manage demand items"
  on public.demand_items;
drop policy if exists "Management inserts demand items"
  on public.demand_items;
drop policy if exists "Management updates demand items"
  on public.demand_items;
drop policy if exists "Management deletes demand items"
  on public.demand_items;

create policy "Authorized users read demand items"
on public.demand_items
for select
to authenticated
using (private.can_access_task(task_id));

create policy "Management inserts demand items"
on public.demand_items
for insert
to authenticated
with check (
  private.current_profile_role() in ('Admin', 'Organizador')
);

create policy "Management updates demand items"
on public.demand_items
for update
to authenticated
using (
  private.current_profile_role() in ('Admin', 'Organizador')
  and private.can_access_task(task_id)
)
with check (
  private.current_profile_role() in ('Admin', 'Organizador')
  and private.can_access_task(task_id)
);

create policy "Management deletes demand items"
on public.demand_items
for delete
to authenticated
using (
  private.current_profile_role() in ('Admin', 'Organizador')
  and private.can_access_task(task_id)
);

drop policy if exists "Admins delete archived task notifications"
  on public.notifications;
drop policy if exists "Users delete targeted notifications"
  on public.notifications;
drop policy if exists "Authorized notification deletion"
  on public.notifications;
create policy "Authorized notification deletion"
on public.notifications
for delete
to authenticated
using (
  target_user_id = private.current_profile_id()
  or (
    private.current_profile_role() = 'Admin'
    and exists (
      select 1
      from public.production_tasks t
      where t.id = notifications.task_id
        and t.status = 'delivered'
        and t.archived_at is not null
    )
  )
);

revoke all on function private.notify_user(text, text, text, text, text)
  from public, anon, authenticated;
revoke all on function private.can_access_task(text)
  from public, anon, authenticated;
revoke all on function private.handle_new_task()
  from public, anon, authenticated;
revoke all on function private.handle_task_assignee_change()
  from public, anon, authenticated;
revoke all on function private.handle_task_stage_change()
  from public, anon, authenticated;
revoke all on function public.generate_workos_alerts()
  from public, anon, authenticated;
grant execute on function public.generate_workos_alerts()
  to service_role;

do $$
begin
  if not exists (
    select 1
    from cron.job
    where jobname = 'workos-deadline-sla-alerts'
  ) then
    perform cron.schedule(
      'workos-deadline-sla-alerts',
      '*/15 * * * *',
      'select public.generate_workos_alerts()'
    );
  end if;
end
$$;
