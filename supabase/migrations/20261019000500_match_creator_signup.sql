drop function if exists public.create_match_slot(uuid, date, time, text, integer);
drop function if exists public.create_match_slot(uuid, date, time, text, integer, boolean);

create function public.create_match_slot(
  p_organization_id uuid,
  p_match_date date,
  p_match_time time,
  p_venue text,
  p_max_players integer,
  p_register_creator boolean
)
returns table (
  id uuid,
  match_date text,
  match_time text,
  venue text,
  max_players integer,
  attendees uuid[]
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

  if p_register_creator then
    insert into public.match_slot_attendees (match_slot_id, user_id)
    values (new_match_id, auth.uid());
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
  where slot.id = new_match_id
  group by slot.id;
end;
$$;

revoke all on function public.create_match_slot(uuid, date, time, text, integer, boolean) from public;
grant execute on function public.create_match_slot(uuid, date, time, text, integer, boolean) to authenticated;

notify pgrst, 'reload schema';
