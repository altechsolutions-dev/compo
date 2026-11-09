alter table public.match_slots
  add column goalkeeper_interval_seconds integer not null default 300
    check (goalkeeper_interval_seconds >= 60 and goalkeeper_interval_seconds % 60 = 0),
  add column goalkeeper_anchor_elapsed_seconds integer not null default 0
    check (goalkeeper_anchor_elapsed_seconds >= 0),
  add column goalkeeper_anchor_turn integer not null default 0
    check (goalkeeper_anchor_turn >= 0);

create or replace function public.reset_goalkeeper_rotation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'scheduled' and old.status in ('in_progress', 'paused') then
    new.goalkeeper_anchor_elapsed_seconds := 0;
    new.goalkeeper_anchor_turn := 0;
  end if;
  return new;
end;
$$;

create trigger reset_goalkeeper_rotation
before update of status on public.match_slots
for each row execute function public.reset_goalkeeper_rotation();

create or replace function public.set_match_goalkeeper_interval(
  p_match_id uuid,
  p_interval_seconds integer
)
returns table (
  goalkeeper_interval_seconds integer,
  goalkeeper_anchor_elapsed_seconds integer,
  goalkeeper_anchor_turn integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_row public.match_slots%rowtype;
  current_elapsed integer;
  completed_turns integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if p_interval_seconds is null or p_interval_seconds < 60 or p_interval_seconds % 60 <> 0 then
    raise exception 'Interval must be a positive whole number of minutes';
  end if;

  select slot.* into match_row
  from public.match_slots as slot
  join public.organization_members as membership
    on membership.organization_id = slot.organization_id
   and membership.user_id = auth.uid()
  join public.match_slot_attendees as caller
    on caller.match_slot_id = slot.id and caller.user_id = auth.uid()
  where slot.id = p_match_id and slot.status in ('in_progress', 'paused')
  for update of slot;

  if not found then
    raise exception 'Active match attendee required';
  end if;

  current_elapsed := match_row.elapsed_seconds + case
    when match_row.status = 'in_progress' then
      greatest(0, floor(extract(epoch from (now() - match_row.started_at)))::integer)
    else 0
  end;
  completed_turns := greatest(0, current_elapsed - match_row.goalkeeper_anchor_elapsed_seconds)
    / match_row.goalkeeper_interval_seconds;

  return query
  update public.match_slots as slot
  set goalkeeper_interval_seconds = p_interval_seconds,
      goalkeeper_anchor_elapsed_seconds = match_row.goalkeeper_anchor_elapsed_seconds
        + completed_turns * match_row.goalkeeper_interval_seconds,
      goalkeeper_anchor_turn = match_row.goalkeeper_anchor_turn + completed_turns
  where slot.id = p_match_id
  returning slot.goalkeeper_interval_seconds,
    slot.goalkeeper_anchor_elapsed_seconds, slot.goalkeeper_anchor_turn;
end;
$$;

drop function public.get_match_slots(uuid);
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
  created_by uuid,
  goalkeeper_interval_seconds integer,
  goalkeeper_anchor_elapsed_seconds integer,
  goalkeeper_anchor_turn integer
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
        'elapsed_seconds', goal.elapsed_seconds, 'created_at', goal.created_at,
        'undoable', goal.undoable
      ) order by goal.created_at, goal.id)
      from public.match_slot_goals as goal where goal.match_slot_id = slot.id
    ), '[]'::jsonb),
    coalesce((
      select jsonb_object_agg(attendee.user_id::text, attendee.guest_name)
      from public.match_slot_attendees as attendee
      where attendee.match_slot_id = slot.id and attendee.guest_name is not null
    ), '{}'::jsonb),
    slot.created_by, slot.goalkeeper_interval_seconds,
    slot.goalkeeper_anchor_elapsed_seconds, slot.goalkeeper_anchor_turn
  from public.match_slots as slot
  where slot.organization_id = p_organization_id
  order by slot.match_date, slot.match_time;
end;
$$;

revoke all on function public.reset_goalkeeper_rotation() from public;
revoke all on function public.set_match_goalkeeper_interval(uuid, integer) from public;
revoke all on function public.get_match_slots(uuid) from public;
grant execute on function public.set_match_goalkeeper_interval(uuid, integer) to authenticated;
grant execute on function public.get_match_slots(uuid) to authenticated;

notify pgrst, 'reload schema';
