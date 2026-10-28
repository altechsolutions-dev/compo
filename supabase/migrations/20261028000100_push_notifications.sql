create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
revoke all on table public.push_subscriptions from anon, authenticated;
grant select, insert, update, delete on table public.push_subscriptions to authenticated;

drop policy if exists push_subscriptions_select_own
  on public.push_subscriptions;
create policy push_subscriptions_select_own
  on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists push_subscriptions_insert_own
  on public.push_subscriptions;
create policy push_subscriptions_insert_own
  on public.push_subscriptions for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists push_subscriptions_update_own
  on public.push_subscriptions;
create policy push_subscriptions_update_own
  on public.push_subscriptions for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists push_subscriptions_delete_own
  on public.push_subscriptions;
create policy push_subscriptions_delete_own
  on public.push_subscriptions for delete to authenticated
  using (user_id = (select auth.uid()));

alter table public.match_slots
  drop constraint if exists match_slots_status_check;

alter table public.match_slots
  add constraint match_slots_status_check
  check (status in ('scheduled', 'in_progress', 'paused', 'finished', 'cancelled'));

create or replace function public.cancel_match_slot(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_creator_id uuid;
  match_organization_id uuid;
  match_status text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select slot.created_by, slot.organization_id, slot.status
  into match_creator_id, match_organization_id, match_status
  from public.match_slots as slot
  where slot.id = p_match_id
  for update;

  if not found then
    raise exception 'Match not found';
  end if;
  if match_creator_id <> auth.uid() then
    raise exception 'Only the match creator can cancel this match';
  end if;
  if not exists (
    select 1 from public.organization_members as membership
    where membership.organization_id = match_organization_id
      and membership.user_id = auth.uid()
  ) then
    raise exception 'Organization membership required';
  end if;
  if match_status <> 'scheduled' then
    raise exception 'Only scheduled matches can be cancelled';
  end if;

  update public.match_slots as slot
  set status = 'cancelled'
  where slot.id = p_match_id;
end;
$$;

revoke all on function public.cancel_match_slot(uuid) from public;
grant execute on function public.cancel_match_slot(uuid) to authenticated;

notify pgrst, 'reload schema';