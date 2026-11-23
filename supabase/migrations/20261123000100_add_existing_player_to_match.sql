create or replace function public.add_player_to_match(
  p_match_id uuid,
  p_player_id uuid
)
returns table (attendees uuid[], attendee_names jsonb)
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_organization_id uuid;
  match_capacity integer;
  match_status text;
  attendee_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select slot.organization_id, slot.max_players, slot.status
  into match_organization_id, match_capacity, match_status
  from public.match_slots as slot
  where slot.id = p_match_id
  for update;

  if not found then
    raise exception 'Match not found';
  end if;
  if not exists (
    select 1 from public.organization_members as membership
    where membership.organization_id = match_organization_id
      and membership.user_id = auth.uid()
  ) then
    raise exception 'Organization membership required';
  end if;
  if match_status <> 'scheduled' then
    raise exception 'Match is not open';
  end if;

  perform 1
  from public.organization_members as membership
  where membership.organization_id = match_organization_id
    and membership.user_id = p_player_id
    and membership.is_player
  for share;
  if not found then
    raise exception 'Player must belong to the club roster';
  end if;

  if exists (
    select 1 from public.match_slot_attendees as attendee
    where attendee.match_slot_id = p_match_id
      and attendee.user_id = p_player_id
  ) then
    raise exception 'Player is already registered';
  end if;

  select count(*)::integer into attendee_count
  from public.match_slot_attendees as attendee
  where attendee.match_slot_id = p_match_id;
  if attendee_count >= match_capacity then
    raise exception 'Match is full';
  end if;

  insert into public.match_slot_attendees (
    match_slot_id, user_id, account_user_id
  ) values (p_match_id, p_player_id, p_player_id);

  update public.match_slots as slot
  set team_a = null,
      team_b = null
  where slot.id = p_match_id;

  return query
  select
    array_agg(attendee.user_id order by attendee.registered_at),
    coalesce(
      jsonb_object_agg(attendee.user_id::text, attendee.guest_name)
        filter (where attendee.guest_name is not null),
      '{}'::jsonb
    )
  from public.match_slot_attendees as attendee
  where attendee.match_slot_id = p_match_id;
end;
$$;

revoke all on function public.add_player_to_match(uuid, uuid) from public;
grant execute on function public.add_player_to_match(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
