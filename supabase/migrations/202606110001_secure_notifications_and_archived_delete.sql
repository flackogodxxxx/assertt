alter table public.notifications enable row level security;
alter table public.production_tasks enable row level security;

drop policy if exists "Notifications select authenticated." on public.notifications;
drop policy if exists "Notifications update authenticated." on public.notifications;
drop policy if exists "Notifications delete authenticated." on public.notifications;

create policy "Users read targeted notifications"
on public.notifications
for select
to authenticated
using (
  target_user_id is null
  or target_user_id = (
    select p.id
    from public.profiles p
    where p.auth_user_id = (select auth.uid())
    limit 1
  )
);

create policy "Users update targeted notifications"
on public.notifications
for update
to authenticated
using (
  target_user_id = (
    select p.id
    from public.profiles p
    where p.auth_user_id = (select auth.uid())
    limit 1
  )
)
with check (
  target_user_id = (
    select p.id
    from public.profiles p
    where p.auth_user_id = (select auth.uid())
    limit 1
  )
);

drop policy if exists "Production tasks delete authenticated." on public.production_tasks;

create or replace function public.delete_archived_demand(demand_id text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_is_admin boolean;
  task_is_archived boolean;
begin
  select exists (
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.role = 'Admin'
  )
  into caller_is_admin;

  if not caller_is_admin then
    raise exception 'Only admins can permanently delete archived demands'
      using errcode = '42501';
  end if;

  select exists (
    select 1
    from public.production_tasks t
    where t.id = demand_id
      and t.status = 'delivered'
  )
  into task_is_archived;

  if not task_is_archived then
    raise exception 'Demand must be archived before permanent deletion'
      using errcode = '22023';
  end if;

  delete from public.notifications where task_id = demand_id;
  delete from public.production_tasks where id = demand_id;

  return true;
end;
$$;

revoke all on function public.delete_archived_demand(text) from public;
revoke all on function public.delete_archived_demand(text) from anon;
grant execute on function public.delete_archived_demand(text) to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'production_tasks'
  ) then
    alter publication supabase_realtime add table public.production_tasks;
  end if;
end
$$;
