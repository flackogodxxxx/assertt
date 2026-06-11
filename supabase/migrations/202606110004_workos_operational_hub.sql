create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

alter table public.production_tasks
  add column if not exists blocked_reason text,
  add column if not exists blocked_category text,
  add column if not exists blocked_from_status text,
  add column if not exists blocked_at timestamptz,
  add column if not exists blocked_by text,
  add column if not exists stage_entered_at timestamptz not null default now(),
  add column if not exists stage_sla_due_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by text;

do $$
declare
  constraint_row record;
begin
  for constraint_row in
    select conname
    from pg_constraint
    where conrelid = 'public.production_tasks'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format(
      'alter table public.production_tasks drop constraint if exists %I',
      constraint_row.conname
    );
  end loop;
end
$$;

update public.production_tasks
set status = case status
  when 'todo' then 'planned'
  when 'approval' then 'review'
  else status
end
where status in ('todo', 'approval');

alter table public.production_tasks
  add constraint production_tasks_workflow_status_check
  check (status in (
    'draft',
    'planned',
    'production',
    'review',
    'adjustments',
    'approved',
    'delivered',
    'blocked'
  ));

create table if not exists public.demand_items (
  id uuid primary key default gen_random_uuid(),
  task_id text not null references public.production_tasks(id) on delete cascade,
  position integer not null check (position > 0),
  title text not null,
  item_type text not null default 'piece',
  instruction text not null default '',
  is_required boolean not null default true,
  estimated_minutes integer not null default 0 check (estimated_minutes >= 0),
  status text not null default 'planned' check (
    status in ('planned', 'production', 'review', 'adjustments', 'approved', 'delivered')
  ),
  assignee_id text references public.profiles(id) on delete set null,
  approved_at timestamptz,
  approved_by text references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (task_id, position)
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  task_id text not null references public.production_tasks(id) on delete cascade,
  version integer not null check (version > 0),
  submitted_by text not null references public.profiles(id) on delete restrict,
  description text not null default '',
  status text not null default 'pending_review' check (
    status in ('pending_review', 'changes_requested', 'partially_approved', 'approved')
  ),
  created_at timestamptz not null default now(),
  unique (task_id, version)
);

create table if not exists public.submission_items (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  demand_item_id uuid not null references public.demand_items(id) on delete cascade,
  url text not null,
  media_type text not null default 'link',
  review_status text not null default 'pending' check (
    review_status in ('pending', 'changes_requested', 'approved')
  ),
  reviewed_at timestamptz,
  reviewed_by text references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (submission_id, demand_item_id)
);

create table if not exists public.review_comments (
  id uuid primary key default gen_random_uuid(),
  task_id text not null references public.production_tasks(id) on delete cascade,
  submission_id uuid references public.submissions(id) on delete cascade,
  demand_item_id uuid references public.demand_items(id) on delete cascade,
  author_id text not null references public.profiles(id) on delete restrict,
  body text not null check (length(trim(body)) > 0),
  start_seconds numeric check (start_seconds is null or start_seconds >= 0),
  end_seconds numeric check (
    end_seconds is null
    or (end_seconds >= 0 and (start_seconds is null or end_seconds >= start_seconds))
  ),
  reference_attachments jsonb not null default '[]'::jsonb,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by text references public.profiles(id) on delete set null
);

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  task_id text,
  client_id text,
  actor_id text references public.profiles(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.notification_preferences (
  user_id text primary key references public.profiles(id) on delete cascade,
  desktop_enabled boolean not null default false,
  sound_enabled boolean not null default true,
  assignment_enabled boolean not null default true,
  review_enabled boolean not null default true,
  deadline_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.automation_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  source text not null,
  task_id text references public.production_tasks(id) on delete cascade,
  status text not null default 'processed' check (status in ('pending', 'processed', 'failed')),
  payload jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists demand_items_task_status_idx
  on public.demand_items(task_id, status, position);
create index if not exists demand_items_assignee_idx
  on public.demand_items(assignee_id, status);
create index if not exists submissions_task_created_idx
  on public.submissions(task_id, created_at desc);
create index if not exists submission_items_piece_idx
  on public.submission_items(demand_item_id, created_at desc);
create index if not exists review_comments_task_status_idx
  on public.review_comments(task_id, status, created_at desc);
create index if not exists activity_events_task_created_idx
  on public.activity_events(task_id, created_at desc);
create index if not exists activity_events_client_created_idx
  on public.activity_events(client_id, created_at desc);
create index if not exists production_tasks_status_due_idx
  on public.production_tasks(status, due_date);

insert into public.demand_items(
  task_id,
  position,
  title,
  item_type,
  instruction,
  assignee_id,
  status
)
select
  task.id,
  piece.position,
  'Peça ' || piece.position,
  task.type,
  coalesce(task.checklist->'pieceInstructions'->>(piece.position - 1), ''),
  task.assignee_id,
  case task.status
    when 'production' then 'production'
    when 'review' then 'review'
    when 'adjustments' then 'adjustments'
    when 'approved' then 'approved'
    when 'delivered' then 'delivered'
    else 'planned'
  end
from public.production_tasks task
cross join lateral generate_series(
  1,
  greatest(
    1,
    least(
      50,
      case
        when task.checklist->>'pieceCount' ~ '^[0-9]+$'
          then (task.checklist->>'pieceCount')::integer
        else 1
      end
    )
  )
) as piece(position)
on conflict (task_id, position) do nothing;

create or replace function private.current_profile_id()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.id
  from public.profiles p
  where p.auth_user_id = auth.uid()
  limit 1
$$;

create or replace function private.current_profile_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.auth_user_id = auth.uid()
  limit 1
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
        or exists (
          select 1
          from public.demand_items di
          where di.task_id = t.id
            and di.assignee_id = private.current_profile_id()
        )
      )
  )
$$;

create or replace function private.stage_sla_interval(target_status text)
returns interval
language sql
immutable
set search_path = ''
as $$
  select case target_status
    when 'planned' then interval '24 hours'
    when 'production' then interval '72 hours'
    when 'review' then interval '24 hours'
    when 'adjustments' then interval '48 hours'
    when 'approved' then interval '24 hours'
    else null
  end
$$;

create or replace function private.append_activity(
  target_task_id text,
  target_client_id text,
  target_actor_id text,
  target_event_type text,
  target_payload jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.activity_events(task_id, client_id, actor_id, event_type, payload)
  values (
    target_task_id,
    target_client_id,
    target_actor_id,
    target_event_type,
    coalesce(target_payload, '{}'::jsonb)
  )
$$;

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
$$;

alter table public.demand_items enable row level security;
alter table public.submissions enable row level security;
alter table public.submission_items enable row level security;
alter table public.review_comments enable row level security;
alter table public.activity_events enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.automation_events enable row level security;
alter table public.profiles enable row level security;

grant select, insert, update, delete on public.demand_items to authenticated;
grant select, insert, update, delete on public.submissions to authenticated;
grant select, insert, update, delete on public.submission_items to authenticated;
grant select, insert, update, delete on public.review_comments to authenticated;
grant select, insert on public.activity_events to authenticated;
grant select, insert, update on public.notification_preferences to authenticated;
grant select on public.automation_events to authenticated;
grant select on public.profiles to authenticated;

drop policy if exists "Team reads profiles" on public.profiles;
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
create policy "Team reads profiles"
on public.profiles
for select
to authenticated
using (auth.uid() is not null);

drop policy if exists "Production tasks select authenticated." on public.production_tasks;
drop policy if exists "Production tasks insert authenticated." on public.production_tasks;
drop policy if exists "Production tasks update authenticated." on public.production_tasks;

create policy "Authorized users read production tasks"
on public.production_tasks
for select
to authenticated
using (private.can_access_task(id));

create policy "Management creates production tasks"
on public.production_tasks
for insert
to authenticated
with check (private.current_profile_role() in ('Admin', 'Organizador'));

create policy "Authorized users update production tasks"
on public.production_tasks
for update
to authenticated
using (private.can_access_task(id))
with check (private.can_access_task(id));

drop policy if exists "Notifications insert authenticated." on public.notifications;
drop policy if exists "Users delete targeted notifications" on public.notifications;
create policy "Users delete targeted notifications"
on public.notifications
for delete
to authenticated
using (target_user_id = private.current_profile_id());

drop policy if exists "Authorized users read demand items" on public.demand_items;
create policy "Authorized users read demand items"
on public.demand_items
for select
to authenticated
using (private.can_access_task(task_id));

drop policy if exists "Authorized users manage demand items" on public.demand_items;
create policy "Authorized users manage demand items"
on public.demand_items
for all
to authenticated
using (private.can_access_task(task_id))
with check (private.can_access_task(task_id));

drop policy if exists "Authorized users read submissions" on public.submissions;
create policy "Authorized users read submissions"
on public.submissions
for select
to authenticated
using (private.can_access_task(task_id));

drop policy if exists "Assignees create submissions" on public.submissions;
create policy "Assignees create submissions"
on public.submissions
for insert
to authenticated
with check (
  private.can_access_task(task_id)
  and submitted_by = private.current_profile_id()
);

drop policy if exists "Reviewers update submissions" on public.submissions;
create policy "Reviewers update submissions"
on public.submissions
for update
to authenticated
using (
  private.can_access_task(task_id)
  and private.current_profile_role() in ('Admin', 'Organizador')
)
with check (
  private.can_access_task(task_id)
  and private.current_profile_role() in ('Admin', 'Organizador')
);

drop policy if exists "Authorized users read submission items" on public.submission_items;
create policy "Authorized users read submission items"
on public.submission_items
for select
to authenticated
using (
  exists (
    select 1
    from public.submissions s
    where s.id = submission_items.submission_id
      and private.can_access_task(s.task_id)
  )
);

drop policy if exists "Submitters create submission items" on public.submission_items;
create policy "Submitters create submission items"
on public.submission_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.submissions s
    where s.id = submission_items.submission_id
      and s.submitted_by = private.current_profile_id()
      and private.can_access_task(s.task_id)
  )
);

drop policy if exists "Reviewers update submission items" on public.submission_items;
create policy "Reviewers update submission items"
on public.submission_items
for update
to authenticated
using (
  private.current_profile_role() in ('Admin', 'Organizador')
  and exists (
    select 1
    from public.submissions s
    where s.id = submission_items.submission_id
      and private.can_access_task(s.task_id)
  )
)
with check (
  private.current_profile_role() in ('Admin', 'Organizador')
  and exists (
    select 1
    from public.submissions s
    where s.id = submission_items.submission_id
      and private.can_access_task(s.task_id)
  )
);

drop policy if exists "Authorized users read review comments" on public.review_comments;
create policy "Authorized users read review comments"
on public.review_comments
for select
to authenticated
using (private.can_access_task(task_id));

drop policy if exists "Authorized users create review comments" on public.review_comments;
create policy "Authorized users create review comments"
on public.review_comments
for insert
to authenticated
with check (
  private.can_access_task(task_id)
  and author_id = private.current_profile_id()
);

drop policy if exists "Authorized users resolve review comments" on public.review_comments;
create policy "Authorized users resolve review comments"
on public.review_comments
for update
to authenticated
using (private.can_access_task(task_id))
with check (private.can_access_task(task_id));

drop policy if exists "Authorized users read activity" on public.activity_events;
create policy "Authorized users read activity"
on public.activity_events
for select
to authenticated
using (
  task_id is null
  or private.can_access_task(task_id)
  or private.current_profile_role() in ('Admin', 'Organizador')
);

drop policy if exists "Users read own notification preferences" on public.notification_preferences;
create policy "Users read own notification preferences"
on public.notification_preferences
for select
to authenticated
using (user_id = private.current_profile_id());

drop policy if exists "Users insert own notification preferences" on public.notification_preferences;
create policy "Users insert own notification preferences"
on public.notification_preferences
for insert
to authenticated
with check (user_id = private.current_profile_id());

drop policy if exists "Users update own notification preferences" on public.notification_preferences;
create policy "Users update own notification preferences"
on public.notification_preferences
for update
to authenticated
using (user_id = private.current_profile_id())
with check (user_id = private.current_profile_id());

drop policy if exists "Managers read automation events" on public.automation_events;
create policy "Managers read automation events"
on public.automation_events
for select
to authenticated
using (private.current_profile_role() in ('Admin', 'Organizador'));

create or replace function public.transition_demand(
  p_task_id text,
  p_to_status text,
  p_reason text default null,
  p_block_category text default null
)
returns public.production_tasks
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_task public.production_tasks;
  actor_id text := private.current_profile_id();
  actor_role text := private.current_profile_role();
  allowed boolean := false;
  next_due timestamptz;
  previous_status text;
begin
  select *
  into current_task
  from public.production_tasks
  where id = p_task_id
  for update;

  if current_task.id is null or not private.can_access_task(p_task_id) then
    raise exception 'Demand not found or access denied' using errcode = '42501';
  end if;

  previous_status := current_task.status;

  if current_task.status = 'blocked' then
    allowed := p_to_status = coalesce(current_task.blocked_from_status, 'planned');
  elsif p_to_status = 'blocked' then
    allowed := current_task.status in ('planned', 'production', 'review', 'adjustments');
  else
    allowed := (current_task.status, p_to_status) in (
      ('draft', 'planned'),
      ('planned', 'production'),
      ('production', 'review'),
      ('review', 'adjustments'),
      ('adjustments', 'review'),
      ('review', 'approved'),
      ('approved', 'delivered')
    );
  end if;

  if not allowed then
    raise exception 'Workflow transition is not allowed' using errcode = '22023';
  end if;

  if p_to_status = 'blocked' and length(trim(coalesce(p_reason, ''))) = 0 then
    raise exception 'Block reason is required' using errcode = '22023';
  end if;

  if p_to_status in ('adjustments', 'approved', 'delivered')
     and actor_role not in ('Admin', 'Organizador') then
    raise exception 'Only management can review or deliver demands' using errcode = '42501';
  end if;

  if p_to_status = 'approved' and exists (
    select 1
    from public.demand_items di
    where di.task_id = p_task_id
      and di.is_required
      and di.status <> 'approved'
  ) then
    raise exception 'Every required piece must be approved' using errcode = '22023';
  end if;

  next_due := case
    when p_to_status = 'blocked' then current_task.stage_sla_due_at
    when current_task.status = 'blocked'
      and current_task.blocked_category = 'external_dependency'
      and current_task.stage_sla_due_at is not null
      and current_task.blocked_at is not null
      then current_task.stage_sla_due_at + (now() - current_task.blocked_at)
    else now() + private.stage_sla_interval(p_to_status)
  end;

  update public.production_tasks
  set
    status = p_to_status,
    blocked_reason = case when p_to_status = 'blocked' then trim(p_reason) else null end,
    blocked_category = case when p_to_status = 'blocked' then p_block_category else null end,
    blocked_from_status = case
      when p_to_status = 'blocked' then current_task.status
      when current_task.status = 'blocked' then null
      else blocked_from_status
    end,
    blocked_at = case when p_to_status = 'blocked' then now() else null end,
    blocked_by = case when p_to_status = 'blocked' then actor_id else null end,
    stage_entered_at = case when p_to_status = 'blocked' then stage_entered_at else now() end,
    stage_sla_due_at = next_due,
    archived_at = case when p_to_status = 'delivered' then now() else archived_at end,
    archived_by = case when p_to_status = 'delivered' then actor_id else archived_by end,
    updated_at = now()
  where id = p_task_id
  returning * into current_task;

  perform private.append_activity(
    current_task.id,
    current_task.client_id,
    actor_id,
    case
      when p_to_status = 'blocked' then 'demand_blocked'
      when previous_status = 'blocked' then 'demand_unblocked'
      when p_to_status = 'delivered' then 'demand_archived'
      else 'workflow_transition'
    end,
    jsonb_build_object(
      'from', previous_status,
      'to', p_to_status,
      'reason', p_reason,
      'block_category', p_block_category,
      'stage_sla_due_at', next_due
    )
  );

  return current_task;
end
$$;

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
    raise exception 'Only management can reassign demands' using errcode = '42501';
  end if;

  if length(trim(coalesce(p_reason, ''))) = 0 then
    raise exception 'Reassignment reason is required' using errcode = '22023';
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

  perform private.notify_user(
    p_assignee_id,
    p_task_id,
    'Nova demanda atribuída',
    current_task.title || ' foi atribuída a você.',
    'assignment'
  );

  return current_task;
end
$$;

create or replace function public.create_partial_submission(
  p_task_id text,
  p_description text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  submission_id uuid;
  next_version integer;
  actor_id text := private.current_profile_id();
  current_task public.production_tasks;
  item jsonb;
begin
  if not private.can_access_task(p_task_id)
     or not (
       private.current_profile_role() in ('Admin', 'Organizador')
       or exists (
         select 1
         from public.production_tasks t
         where t.id = p_task_id
           and t.assignee_id = actor_id
       )
       or exists (
         select 1
         from public.demand_items di
         where di.task_id = p_task_id
           and di.assignee_id = actor_id
       )
     ) then
    raise exception 'Demand not found or access denied' using errcode = '42501';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one submitted piece is required' using errcode = '22023';
  end if;

  select * into current_task
  from public.production_tasks
  where id = p_task_id
  for update;

  if current_task.status not in ('production', 'adjustments', 'review') then
    raise exception 'Demand must be in production or adjustments before submission'
      using errcode = '22023';
  end if;

  select coalesce(max(version), 0) + 1
  into next_version
  from public.submissions
  where task_id = p_task_id;

  insert into public.submissions(task_id, version, submitted_by, description)
  values (p_task_id, next_version, actor_id, coalesce(p_description, ''))
  returning id into submission_id;

  for item in select * from jsonb_array_elements(p_items)
  loop
    if length(trim(coalesce(item->>'url', ''))) = 0 then
      raise exception 'Every submitted piece requires a URL'
        using errcode = '22023';
    end if;

    if not exists (
      select 1
      from public.demand_items di
      where di.id = (item->>'demand_item_id')::uuid
        and di.task_id = p_task_id
    ) then
      raise exception 'Submitted piece does not belong to demand'
        using errcode = '22023';
    end if;

    insert into public.submission_items(
      submission_id,
      demand_item_id,
      url,
      media_type
    )
    values (
      submission_id,
      (item->>'demand_item_id')::uuid,
      trim(item->>'url'),
      coalesce(item->>'media_type', 'link')
    );

    update public.demand_items
    set status = 'review', updated_at = now()
    where id = (item->>'demand_item_id')::uuid
      and task_id = p_task_id;
  end loop;

  update public.production_tasks
  set
    status = 'review',
    stage_entered_at = now(),
    stage_sla_due_at = now() + private.stage_sla_interval('review'),
    updated_at = now()
  where id = p_task_id;

  perform private.append_activity(
    p_task_id,
    current_task.client_id,
    actor_id,
    'submission_created',
    jsonb_build_object(
      'submission_id', submission_id,
      'version', next_version,
      'piece_count', jsonb_array_length(p_items)
    )
  );

  return submission_id;
end
$$;

create or replace function public.review_submission_item(
  p_submission_item_id uuid,
  p_decision text
)
returns public.submission_items
language plpgsql
security definer
set search_path = ''
as $$
declare
  reviewed_item public.submission_items;
  target_task_id text;
  target_client_id text;
  target_submission_id uuid;
  target_demand_item_id uuid;
  actor_id text := private.current_profile_id();
  remaining_pending integer;
  approved_count integer;
begin
  if private.current_profile_role() not in ('Admin', 'Organizador') then
    raise exception 'Only management can review submissions' using errcode = '42501';
  end if;

  if p_decision not in ('approved', 'changes_requested') then
    raise exception 'Invalid review decision' using errcode = '22023';
  end if;

  select s.task_id, s.id, t.client_id, si.demand_item_id
  into
    target_task_id,
    target_submission_id,
    target_client_id,
    target_demand_item_id
  from public.submission_items si
  join public.submissions s on s.id = si.submission_id
  join public.production_tasks t on t.id = s.task_id
  where si.id = p_submission_item_id;

  if target_task_id is null then
    raise exception 'Submission item not found' using errcode = '22023';
  end if;

  if p_decision = 'changes_requested'
     and not exists (
       select 1
       from public.review_comments rc
       where rc.task_id = target_task_id
         and rc.status = 'open'
         and (
           rc.submission_id is null
           or rc.submission_id = target_submission_id
         )
         and (
           rc.demand_item_id is null
           or rc.demand_item_id = target_demand_item_id
         )
     ) then
    raise exception 'An open correction comment is required'
      using errcode = '22023';
  end if;

  if p_decision = 'approved'
     and exists (
       select 1
       from public.review_comments rc
       where rc.task_id = target_task_id
         and rc.status = 'open'
         and (
           rc.submission_id is null
           or rc.submission_id = target_submission_id
         )
         and (
           rc.demand_item_id is null
           or rc.demand_item_id = target_demand_item_id
         )
     ) then
    raise exception 'Resolve open correction comments before approval'
      using errcode = '22023';
  end if;

  update public.submission_items
  set
    review_status = p_decision,
    reviewed_at = now(),
    reviewed_by = actor_id
  where id = p_submission_item_id
  returning * into reviewed_item;

  update public.demand_items
  set
    status = case when p_decision = 'approved' then 'approved' else 'adjustments' end,
    approved_at = case when p_decision = 'approved' then now() else null end,
    approved_by = case when p_decision = 'approved' then actor_id else null end,
    updated_at = now()
  where id = reviewed_item.demand_item_id;

  select count(*) filter (where review_status = 'pending'),
         count(*) filter (where review_status = 'approved')
  into remaining_pending, approved_count
  from public.submission_items
  where submission_id = target_submission_id;

  update public.submissions
  set status = case
    when p_decision = 'changes_requested' then 'changes_requested'
    when remaining_pending = 0 then 'approved'
    when approved_count > 0 then 'partially_approved'
    else 'pending_review'
  end
  where id = target_submission_id;

  update public.production_tasks
  set
    status = case
      when exists (
        select 1 from public.demand_items di
        where di.task_id = target_task_id
          and di.is_required
          and di.status = 'adjustments'
      ) then 'adjustments'
      when not exists (
        select 1 from public.demand_items di
        where di.task_id = target_task_id
          and di.is_required
          and di.status <> 'approved'
      ) then 'approved'
      else 'review'
    end,
    updated_at = now()
  where id = target_task_id;

  perform private.append_activity(
    target_task_id,
    target_client_id,
    actor_id,
    'piece_reviewed',
    jsonb_build_object(
      'submission_item_id', p_submission_item_id,
      'demand_item_id', reviewed_item.demand_item_id,
      'decision', p_decision
    )
  );

  return reviewed_item;
end
$$;

create or replace function public.resolve_review_comment(p_comment_id uuid)
returns public.review_comments
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_comment public.review_comments;
begin
  update public.review_comments
  set
    status = 'resolved',
    resolved_at = now(),
    resolved_by = private.current_profile_id()
  where id = p_comment_id
    and private.can_access_task(task_id)
  returning * into resolved_comment;

  if resolved_comment.id is null then
    raise exception 'Comment not found or access denied' using errcode = '42501';
  end if;

  perform private.append_activity(
    resolved_comment.task_id,
    null,
    private.current_profile_id(),
    'review_comment_resolved',
    jsonb_build_object('comment_id', resolved_comment.id)
  );

  return resolved_comment;
end
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
begin
  piece_count := greatest(1, least(
    50,
    case
      when new.checklist->>'pieceCount' ~ '^[0-9]+$'
        then (new.checklist->>'pieceCount')::integer
      else 1
    end
  ));
  piece_instructions := coalesce(new.checklist->'pieceInstructions', '[]'::jsonb);

  for position_index in 1..piece_count
  loop
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
      'Peça ' || position_index,
      new.type,
      coalesce(piece_instructions->>(position_index - 1), ''),
      new.assignee_id,
      case when new.status = 'draft' then 'planned' else new.status end
    )
    on conflict (task_id, position) do nothing;
  end loop;

  perform private.append_activity(
    new.id,
    new.client_id,
    private.current_profile_id(),
    'demand_created',
    jsonb_build_object('status', new.status, 'piece_count', piece_count)
  );

  perform private.notify_user(
    new.assignee_id,
    new.id,
    'Nova demanda atribuída',
    new.title || ' acaba de entrar na sua fila.',
    'assignment'
  );

  return new;
end
$$;

drop trigger if exists workos_new_task on public.production_tasks;
create trigger workos_new_task
after insert on public.production_tasks
for each row execute function private.handle_new_task();

create or replace function private.handle_new_submission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_task public.production_tasks;
  manager record;
begin
  select * into target_task
  from public.production_tasks
  where id = new.task_id;

  perform private.notify_user(
    target_task.reviewer_id,
    new.task_id,
    'Entrega aguardando revisão',
    target_task.title || ' recebeu a versão ' || new.version || '.',
    'review'
  );

  for manager in
    select p.id
    from public.profiles p
    left join public.notification_preferences np on np.user_id = p.id
    where p.role in ('Admin', 'Organizador')
      and coalesce(np.review_enabled, true)
      and p.id is distinct from target_task.reviewer_id
  loop
    perform private.notify_user(
      manager.id,
      new.task_id,
      'Entrega aguardando revisão',
      target_task.title || ' recebeu a versão ' || new.version || '.',
      'review'
    );
  end loop;

  return new;
end
$$;

drop trigger if exists workos_new_submission on public.submissions;
create trigger workos_new_submission
after insert on public.submissions
for each row execute function private.handle_new_submission();

create or replace function public.generate_workos_alerts()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_task public.production_tasks;
  target_user text;
  event_key text;
  alert_title text;
  generated_count integer := 0;
  hours_until_due numeric;
  sla_ratio numeric;
begin
  for target_task in
    select *
    from public.production_tasks
    where status not in ('draft', 'delivered', 'blocked')
  loop
    target_user := coalesce(target_task.assignee_id, target_task.reviewer_id);
    hours_until_due := extract(epoch from (target_task.due_date::timestamptz - now())) / 3600;
    alert_title := case
      when hours_until_due < 0 then 'Demanda atrasada'
      when hours_until_due <= 24 then 'Prazo em até 24 horas'
      when hours_until_due <= 48 then 'Prazo em até 48 horas'
      else null
    end;

    if alert_title is not null then
      event_key := 'deadline:' || target_task.id || ':' ||
        case
          when hours_until_due < 0 then 'overdue'
          when hours_until_due <= 24 then '24h'
          else '48h'
        end;

      insert into public.automation_events(
        event_key,
        source,
        task_id,
        status,
        payload,
        processed_at
      )
      values (
        event_key,
        'deadline_cron',
        target_task.id,
        'processed',
        jsonb_build_object('hours_until_due', hours_until_due),
        now()
      )
      on conflict (event_key) do nothing;

      if found then
        perform private.notify_user(
          target_user,
          target_task.id,
          alert_title,
          target_task.title || ' precisa de atenção ao prazo.',
          'deadline'
        );
        generated_count := generated_count + 1;
      end if;
    end if;

    if target_task.stage_sla_due_at is not null then
      sla_ratio := extract(epoch from (now() - target_task.stage_entered_at)) /
        nullif(extract(epoch from (target_task.stage_sla_due_at - target_task.stage_entered_at)), 0);

      if sla_ratio >= 0.75 then
        event_key := 'sla:' || target_task.id || ':' || target_task.status || ':' ||
          case
            when now() > target_task.stage_sla_due_at then 'breached'
            else '75'
          end;

        insert into public.automation_events(
          event_key,
          source,
          task_id,
          status,
          payload,
          processed_at
        )
        values (
          event_key,
          'sla_cron',
          target_task.id,
          'processed',
          jsonb_build_object(
            'stage', target_task.status,
            'ratio', sla_ratio,
            'due_at', target_task.stage_sla_due_at
          ),
          now()
        )
        on conflict (event_key) do nothing;

        if found then
          perform private.notify_user(
            target_user,
            target_task.id,
            case when now() > target_task.stage_sla_due_at then 'SLA ultrapassado' else 'SLA próximo do limite' end,
            target_task.title || ' está há muito tempo na etapa atual.',
            'deadline'
          );
          perform private.append_activity(
            target_task.id,
            target_task.client_id,
            null,
            'sla_alert',
            jsonb_build_object('stage', target_task.status, 'ratio', sla_ratio)
          );
          generated_count := generated_count + 1;
        end if;
      end if;
    end if;
  end loop;

  return generated_count;
end
$$;

revoke all on function public.transition_demand(text, text, text, text) from public, anon;
revoke all on function public.reassign_demand(text, text, text) from public, anon;
revoke all on function public.create_partial_submission(text, text, jsonb) from public, anon;
revoke all on function public.review_submission_item(uuid, text) from public, anon;
revoke all on function public.resolve_review_comment(uuid) from public, anon;
revoke all on function public.generate_workos_alerts() from public, anon;

grant execute on function public.transition_demand(text, text, text, text) to authenticated;
grant execute on function public.reassign_demand(text, text, text) to authenticated;
grant execute on function public.create_partial_submission(text, text, jsonb) to authenticated;
grant execute on function public.review_submission_item(uuid, text) to authenticated;
grant execute on function public.resolve_review_comment(uuid) to authenticated;

create or replace function public.delete_archived_demand(demand_id text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_task public.production_tasks;
begin
  if private.current_profile_role() <> 'Admin' then
    raise exception 'Only admins can permanently delete archived demands'
      using errcode = '42501';
  end if;

  select * into target_task
  from public.production_tasks
  where id = demand_id
    and status = 'delivered'
    and archived_at is not null
  for update;

  if target_task.id is null then
    raise exception 'Demand must be delivered and archived before deletion'
      using errcode = '22023';
  end if;

  perform private.append_activity(
    target_task.id,
    target_task.client_id,
    private.current_profile_id(),
    'demand_permanently_deleted',
    jsonb_build_object('title', target_task.title)
  );

  delete from public.notifications where task_id = demand_id;
  delete from public.production_tasks where id = demand_id;
  return true;
end
$$;

revoke all on function public.delete_archived_demand(text) from public, anon;
grant execute on function public.delete_archived_demand(text) to authenticated;

revoke all on function private.append_activity(text, text, text, text, jsonb)
  from public, anon, authenticated;
revoke all on function private.notify_user(text, text, text, text, text)
  from public, anon, authenticated;
revoke all on function private.handle_new_task()
  from public, anon, authenticated;
revoke all on function private.handle_new_submission()
  from public, anon, authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'demand_items',
    'submissions',
    'submission_items',
    'review_comments',
    'activity_events',
    'notification_preferences',
    'automation_events'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end
$$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if not exists (
      select 1 from cron.job where jobname = 'workos-deadline-sla-alerts'
    ) then
      perform cron.schedule(
        'workos-deadline-sla-alerts',
        '*/15 * * * *',
        'select public.generate_workos_alerts()'
      );
    end if;
  end if;
end
$$;
