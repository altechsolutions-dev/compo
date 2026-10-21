alter table public.match_slots
  add column if not exists max_players integer not null default 10;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'match_slots_max_players_check'
      and conrelid = 'public.match_slots'::regclass
  ) then
    alter table public.match_slots
      add constraint match_slots_max_players_check
      check (max_players between 2 and 30);
  end if;
end;
$$;

drop function if exists public.get_match_slots(uuid);
drop function if exists public.create_match_slot(uuid, date, time, text);
drop function if exists public.create_match_slot(uuid, date, time, text, integer);

create function public.get_match_slots(p_organization_id uuid)
returns table (
  id uuid,
  match_date text,
  match_time text,
  venue text,
  max_players integer,
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
    slot.max_players,
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

create function public.create_match_slot(
  p_organization_id uuid,
  p_match_date date,
  p_match_time time,
  p_venue text,
  p_max_players integer
)
returns table (
  id uuid,
  match_date text,
  match_time text,
  venue text,
  max_players integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_venue text := trim(p_venue);
  new_match_id uuid;
begin
  if auth.uid() is null or not exists (
    select 1 from public.organization_members as membership
    where membership.organization_id = p_organization_id
      and membership.user_id = auth.uid()
  ) then
    raise exception 'Organization membership required';
  end if;
  if clean_venue is null or char_length(clean_venue) not between 1 and 160 then
    raise exception 'Venue must contain 1 to 160 characters';
  end if;
  if p_max_players is null or p_max_players not between 2 and 30 then
    raise exception 'Match capacity must be between 2 and 30';
  end if;

  insert into public.match_slots (
    organization_id,
    match_date,
    match_time,
    venue,
    max_players,
    created_by
  ) values (
    p_organization_id,
    p_match_date,
    p_match_time,
    clean_venue,
    p_max_players,
    auth.uid()
  ) returning match_slots.id into new_match_id;

  return query
  select
    slot.id,
    to_char(slot.match_date, 'YYYY-MM-DD'),
    to_char(slot.match_time, 'HH24:MI'),
    slot.venue,
    slot.max_players
  from public.match_slots as slot
  where slot.id = new_match_id;
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
  match_capacity integer;
  attendee_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select slot.organization_id, slot.max_players
  into match_organization_id, match_capacity
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

  if attendee_count >= match_capacity and not exists (
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
revoke all on function public.create_match_slot(uuid, date, time, text, integer) from public;
revoke all on function public.register_for_match(uuid) from public;
grant execute on function public.get_match_slots(uuid) to authenticated;
grant execute on function public.create_match_slot(uuid, date, time, text, integer) to authenticated;
grant execute on function public.register_for_match(uuid) to authenticated;

notify pgrst, 'reload schema';