create policy "Admins delete archived task notifications"
on public.notifications
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.auth_user_id = (select auth.uid())
      and p.role = 'Admin'
  )
  and exists (
    select 1
    from public.production_tasks t
    where t.id = notifications.task_id
      and t.status = 'delivered'
  )
);

create policy "Admins delete archived production tasks"
on public.production_tasks
for delete
to authenticated
using (
  status = 'delivered'
  and exists (
    select 1
    from public.profiles p
    where p.auth_user_id = (select auth.uid())
      and p.role = 'Admin'
  )
);

create or replace function public.delete_archived_demand(demand_id text)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  deleted_task_count integer;
begin
  delete from public.notifications where task_id = demand_id;
  delete from public.production_tasks
  where id = demand_id
    and status = 'delivered';

  get diagnostics deleted_task_count = row_count;

  if deleted_task_count = 0 then
    raise exception 'Demand not found, not archived, or caller is not an admin'
      using errcode = '42501';
  end if;

  return true;
end;
$$;

revoke all on function public.delete_archived_demand(text) from public;
revoke all on function public.delete_archived_demand(text) from anon;
grant execute on function public.delete_archived_demand(text) to authenticated;
