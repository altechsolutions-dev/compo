alter table public.match_slots
  add column if not exists status text not null default 'scheduled'
    check (status in ('scheduled', 'in_progress', 'finished')),
  add column if not exists started_at timestamptz,
  add column if not exists team_a uuid[],
  add column if not exists team_b uuid[];

create table if not exists public.match_slot_goals (
  id uuid primary key default gen_random_uuid(),
  match_slot_id uuid not null references public.match_slots (id) on delete cascade,
  scorer_id uuid not null,
  team smallint not null check (team in (0, 1)),
  elapsed_seconds integer not null check (elapsed_seconds >= 0),
  created_at timestamptz not null default now(),
  foreign key (match_slot_id, scorer_id)
    references public.match_slot_attendees (match_slot_id, user_id)
    on delete cascade
);

create index if not exists match_slot_goals_match_created_idx
  on public.match_slot_goals (match_slot_id, created_at);

alter table public.match_slot_goals enable row level security;
revoke all on table public.match_slot_goals from anon, authenticated;

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
  team_a uuid[],
  team_b uuid[],
  goals jsonb
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
    coalesce((
      select array_agg(attendee.user_id order by attendee.registered_at)
      from public.match_slot_attendees as attendee
      where attendee.match_slot_id = slot.id
    ), array[]::uuid[]),
    slot.status,
    slot.started_at,
    slot.team_a,
    slot.team_b,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', goal.id,
        'scorer_id', goal.scorer_id,
        'team', goal.team,
        'elapsed_seconds', goal.elapsed_seconds,
        'created_at', goal.created_at
      ) order by goal.created_at)
      from public.match_slot_goals as goal
      where goal.match_slot_id = slot.id
    ), '[]'::jsonb)
  from public.match_slots as slot
  where slot.organization_id = p_organization_id
  order by slot.match_date, slot.match_time;
end;
$$;

create or replace function public.start_match(
  p_match_id uuid,
  p_team_a uuid[],
  p_team_b uuid[]
)
returns table (status text, started_at timestamptz, team_a uuid[], team_b uuid[])
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_organization_id uuid;
  match_capacity integer;
  attendee_count integer;
  start_time timestamptz := now();
  all_team_ids uuid[] := coalesce(p_team_a, array[]::uuid[]) || coalesce(p_team_b, array[]::uuid[]);
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
  if not exists (
    select 1 from public.match_slot_attendees as attendee
    where attendee.match_slot_id = p_match_id and attendee.user_id = auth.uid()
  ) then
    raise exception 'Match attendee required';
  end if;
  if exists (
    select 1 from public.match_slots as slot
    where slot.id = p_match_id and slot.status <> 'scheduled'
  ) then
    raise exception 'Match has already started';
  end if;

  select count(*)::integer
  into attendee_count
  from public.match_slot_attendees as attendee
  where attendee.match_slot_id = p_match_id;

  if attendee_count < match_capacity then
    raise exception 'Match must be full before it can start';
  end if;
  if cardinality(all_team_ids) <> attendee_count
    or exists (
      select 1 from unnest(all_team_ids) as player_id
      group by player_id having count(*) > 1
    )
    or exists (
      select 1 from public.match_slot_attendees as attendee
      where attendee.match_slot_id = p_match_id
        and not (attendee.user_id = any(all_team_ids))
    ) then
    raise exception 'Teams must contain every attendee exactly once';
  end if;

  update public.match_slots as slot
  set status = 'in_progress',
      started_at = start_time,
      team_a = p_team_a,
      team_b = p_team_b
  where slot.id = p_match_id;

  return query select 'in_progress'::text, start_time, p_team_a, p_team_b;
end;
$$;

create or replace function public.record_match_goal(
  p_match_id uuid,
  p_scorer_id uuid
)
returns table (
  id uuid,
  scorer_id uuid,
  team smallint,
  elapsed_seconds integer,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_started_at timestamptz;
  match_team_a uuid[];
  match_team_b uuid[];
  goal_team smallint;
  goal_time timestamptz := now();
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select slot.started_at, slot.team_a, slot.team_b
  into match_started_at, match_team_a, match_team_b
  from public.match_slots as slot
  join public.organization_members as membership
    on membership.organization_id = slot.organization_id
   and membership.user_id = auth.uid()
  join public.match_slot_attendees as caller
    on caller.match_slot_id = slot.id and caller.user_id = auth.uid()
  where slot.id = p_match_id and slot.status = 'in_progress'
  for update of slot;

  if match_started_at is null then
    raise exception 'Active match attendee required';
  end if;
  if p_scorer_id = any(match_team_a) then
    goal_team := 0;
  elsif p_scorer_id = any(match_team_b) then
    goal_team := 1;
  else
    raise exception 'Scorer is not part of the match';
  end if;

  return query
  insert into public.match_slot_goals as goal (
    match_slot_id, scorer_id, team, elapsed_seconds, created_at
  ) values (
    p_match_id,
    p_scorer_id,
    goal_team,
    greatest(0, floor(extract(epoch from (goal_time - match_started_at)))::integer),
    goal_time
  )
  returning goal.id, goal.scorer_id, goal.team, goal.elapsed_seconds, goal.created_at;
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
  if match_status <> 'scheduled' and not exists (
    select 1 from public.match_slot_attendees as attendee
    where attendee.match_slot_id = p_match_id
      and attendee.user_id = auth.uid()
  ) then
    raise exception 'Match has already started';
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

create or replace function public.switch_match_team(
  p_match_id uuid,
  p_player_id uuid
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
  if p_player_id = any(current_team_a) then
    current_team_a := array_remove(current_team_a, p_player_id);
    current_team_b := array_append(current_team_b, p_player_id);
  elsif p_player_id = any(current_team_b) then
    current_team_b := array_remove(current_team_b, p_player_id);
    current_team_a := array_append(current_team_a, p_player_id);
  else
    raise exception 'Player is not part of the match';
  end if;

  update public.match_slots as slot
  set team_a = current_team_a, team_b = current_team_b
  where slot.id = p_match_id;

  return query select current_team_a, current_team_b;
end;
$$;

revoke all on function public.get_match_slots(uuid) from public;
revoke all on function public.start_match(uuid, uuid[], uuid[]) from public;
revoke all on function public.record_match_goal(uuid, uuid) from public;
revoke all on function public.register_for_match(uuid) from public;
revoke all on function public.switch_match_team(uuid, uuid) from public;
grant execute on function public.get_match_slots(uuid) to authenticated;
grant execute on function public.start_match(uuid, uuid[], uuid[]) to authenticated;
grant execute on function public.record_match_goal(uuid, uuid) to authenticated;
grant execute on function public.register_for_match(uuid) to authenticated;
grant execute on function public.switch_match_team(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';