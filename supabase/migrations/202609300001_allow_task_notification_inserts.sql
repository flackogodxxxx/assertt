drop policy if exists "Authenticated users create task notifications" on public.notifications;

create policy "Authenticated users create task notifications"
on public.notifications
for insert
to authenticated
with check (
  target_user_id is null
  or exists (
    select 1
    from public.profiles p
    where p.id = target_user_id
  )
);
