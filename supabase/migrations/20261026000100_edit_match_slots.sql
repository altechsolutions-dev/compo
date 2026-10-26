drop function if exists public.get_match_slots(uuid);

create function public.get_match_slots(p_organization_id uuid)
returns table (
  id uuid,
  match_date text,
  match_time text,
  venue text,
  max_players integer,
  attendees uuid[],
  status text,
  started_at timestamptz,
  elapsed_seconds integer,
  team_a uuid[],
  team_b uuid[],
  goals jsonb,
  attendee_names jsonb,
  created_by uuid
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
  select slot.id, to_char(slot.match_date, 'YYYY-MM-DD'),
    to_char(slot.match_time, 'HH24:MI'), slot.venue, slot.max_players,
    coalesce((
      select array_agg(attendee.user_id order by attendee.registered_at)
      from public.match_slot_attendees as attendee
      where attendee.match_slot_id = slot.id
    ), array[]::uuid[]),
    slot.status, slot.started_at, slot.elapsed_seconds,
    slot.team_a, slot.team_b,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', goal.id, 'scorer_id', goal.scorer_id, 'team', goal.team,
        'elapsed_seconds', goal.elapsed_seconds, 'created_at', goal.created_at
      ) order by goal.created_at)
      from public.match_slot_goals as goal where goal.match_slot_id = slot.id
    ), '[]'::jsonb),
    coalesce((
      select jsonb_object_agg(attendee.user_id::text, attendee.guest_name)
      from public.match_slot_attendees as attendee
      where attendee.match_slot_id = slot.id and attendee.guest_name is not null
    ), '{}'::jsonb),
    slot.created_by
  from public.match_slots as slot
  where slot.organization_id = p_organization_id
  order by slot.match_date, slot.match_time;
end;
$$;

create or replace function public.update_match_slot(
  p_match_id uuid,
  p_match_date date,
  p_match_time time,
  p_venue text,
  p_max_players integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_venue text := trim(p_venue);
  match_creator_id uuid;
  match_organization_id uuid;
  match_status text;
  attendee_count integer;
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
    raise exception 'Only the match creator can edit this match';
  end if;
  if not exists (
    select 1 from public.organization_members as membership
    where membership.organization_id = match_organization_id
      and membership.user_id = auth.uid()
  ) then
    raise exception 'Organization membership required';
  end if;
  if match_status <> 'scheduled' then
    raise exception 'Only scheduled matches can be edited';
  end if;
  if clean_venue is null or char_length(clean_venue) not between 1 and 160 then
    raise exception 'Venue must contain 1 to 160 characters';
  end if;
  if p_max_players is null or p_max_players not between 2 and 30 then
    raise exception 'Match capacity must be between 2 and 30';
  end if;

  select count(*)::integer into attendee_count
  from public.match_slot_attendees as attendee
  where attendee.match_slot_id = p_match_id;

  if p_max_players < attendee_count then
    raise exception 'Match capacity cannot be lower than current attendance';
  end if;

  update public.match_slots as slot
  set match_date = p_match_date,
      match_time = p_match_time,
      venue = clean_venue,
      max_players = p_max_players
  where slot.id = p_match_id;
end;
$$;

revoke all on function public.get_match_slots(uuid) from public;
revoke all on function public.update_match_slot(uuid, date, time, text, integer) from public;
grant execute on function public.get_match_slots(uuid) to authenticated;
grant execute on function public.update_match_slot(uuid, date, time, text, integer) to authenticated;

notify pgrst, 'reload schema';