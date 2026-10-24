drop function if exists public.switch_match_team(uuid, uuid);

create or replace function public.swap_match_teams(
  p_match_id uuid,
  p_red_player_id uuid,
  p_blue_player_id uuid
)
returns table (team_a uuid[], team_b uuid[])
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_organization_id uuid;
  match_status text;
  current_team_a uuid[];
  current_team_b uuid[];
  red_player_index integer;
  blue_player_index integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select slot.organization_id, slot.status, slot.team_a, slot.team_b
  into match_organization_id, match_status, current_team_a, current_team_b
  from public.match_slots as slot
  where slot.id = p_match_id
  for update;

  if match_organization_id is null or match_status <> 'in_progress' then
    raise exception 'Active match required';
  end if;
  if not exists (
    select 1 from public.organization_members as membership
    join public.match_slot_attendees as caller
      on caller.match_slot_id = p_match_id
     and caller.user_id = membership.user_id
    where membership.organization_id = match_organization_id
      and membership.user_id = auth.uid()
  ) then
    raise exception 'Match attendee required';
  end if;

  red_player_index := array_position(current_team_a, p_red_player_id);
  blue_player_index := array_position(current_team_b, p_blue_player_id);
  if red_player_index is null or blue_player_index is null then
    raise exception 'Players must belong to opposing teams';
  end if;

  current_team_a[red_player_index] := p_blue_player_id;
  current_team_b[blue_player_index] := p_red_player_id;

  update public.match_slots as slot
  set team_a = current_team_a,
      team_b = current_team_b
  where slot.id = p_match_id;

  return query select current_team_a, current_team_b;
end;
$$;

revoke all on function public.swap_match_teams(uuid, uuid, uuid) from public;
grant execute on function public.swap_match_teams(uuid, uuid, uuid) to authenticated;

notify pgrst, 'reload schema';