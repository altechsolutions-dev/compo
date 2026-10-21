create table if not exists public.match_slot_attendees (
  match_slot_id uuid not null references public.match_slots (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  registered_at timestamptz not null default now(),
  primary key (match_slot_id, user_id)
);

create index if not exists match_slot_attendees_user_id_idx
  on public.match_slot_attendees (user_id);

alter table public.match_slot_attendees enable row level security;
revoke all on table public.match_slot_attendees from anon, authenticated;

drop function if exists public.get_match_slots(uuid);

create function public.get_match_slots(p_organization_id uuid)
returns table (
  id uuid,
  match_date text,
  match_time text,
  venue text,
  attendees uuid[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.organization_members as membership
    where membership.organization_id = p_organization_id
      and membership.user_id = auth.uid()
  ) then
    raise exception 'Organization membership required';
  end if;

  return query
  select
    slot.id,
    to_char(slot.match_date, 'YYYY-MM-DD'),
    to_char(slot.match_time, 'HH24:MI'),
    slot.venue,
    coalesce(
      array_agg(attendee.user_id order by attendee.registered_at)
        filter (where attendee.user_id is not null),
      array[]::uuid[]
    )
  from public.match_slots as slot
  left join public.match_slot_attendees as attendee
    on attendee.match_slot_id = slot.id
  where slot.organization_id = p_organization_id
  group by slot.id
  order by slot.match_date, slot.match_time;
end;
$$;

create or replace function public.register_for_match(p_match_id uuid)
returns table (attendees uuid[])
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_organization_id uuid;
  attendee_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select slot.organization_id
  into match_organization_id
  from public.match_slots as slot
  where slot.id = p_match_id
  for update;

  if match_organization_id is null then
    raise exception 'Match not found';
  end if;
  if not exists (
    select 1 from public.organization_members as membership
    where membership.organization_id = match_organization_id
      and membership.user_id = auth.uid()
  ) then
    raise exception 'Organization membership required';
  end if;

  select count(*)::integer
  into attendee_count
  from public.match_slot_attendees as attendee
  where attendee.match_slot_id = p_match_id;

  if attendee_count >= 10 and not exists (
    select 1 from public.match_slot_attendees as attendee
    where attendee.match_slot_id = p_match_id
      and attendee.user_id = auth.uid()
  ) then
    raise exception 'Match is full';
  end if;

  insert into public.match_slot_attendees (match_slot_id, user_id)
  values (p_match_id, auth.uid())
  on conflict (match_slot_id, user_id) do nothing;

  return query
  select coalesce(
    array_agg(attendee.user_id order by attendee.registered_at),
    array[]::uuid[]
  )
  from public.match_slot_attendees as attendee
  where attendee.match_slot_id = p_match_id;
end;
$$;

revoke all on function public.get_match_slots(uuid) from public;
revoke all on function public.register_for_match(uuid) from public;
grant execute on function public.get_match_slots(uuid) to authenticated;
grant execute on function public.register_for_match(uuid) to authenticated;

notify pgrst, 'reload schema';