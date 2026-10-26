alter table public.match_slot_attendees
  drop constraint if exists match_slot_attendees_user_id_fkey,
  add column if not exists account_user_id uuid references auth.users (id) on delete cascade,
  add column if not exists guest_name text;

update public.match_slot_attendees
set account_user_id = user_id
where account_user_id is null and guest_name is null;

alter table public.match_slot_attendees
  add constraint match_slot_attendees_identity_check check (
    (account_user_id is not null and guest_name is null and user_id = account_user_id)
    or (account_user_id is null and guest_name is not null
        and char_length(trim(guest_name)) between 1 and 40)
  );

create or replace function public.create_match_slot(
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
    organization_id, match_date, match_time, venue, max_players, created_by
  ) values (
    p_organization_id, p_match_date, p_match_time, clean_venue,
    p_max_players, auth.uid()
  ) returning match_slots.id into new_match_id;

  if p_register_creator then
    insert into public.match_slot_attendees (
      match_slot_id, user_id, account_user_id
    ) values (new_match_id, auth.uid(), auth.uid());
  end if;

  return query
  select slot.id, to_char(slot.match_date, 'YYYY-MM-DD'),
    to_char(slot.match_time, 'HH24:MI'), slot.venue, slot.max_players,
    coalesce(array_agg(attendee.user_id order by attendee.registered_at)
      filter (where attendee.user_id is not null), array[]::uuid[])
  from public.match_slots as slot
  left join public.match_slot_attendees as attendee on attendee.match_slot_id = slot.id
  where slot.id = new_match_id
  group by slot.id;
end;
$$;

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
  attendee_names jsonb
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
    ), '{}'::jsonb)
  from public.match_slots as slot
  where slot.organization_id = p_organization_id
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
  match_capacity integer;
  match_status text;
  attendee_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select slot.organization_id, slot.max_players, slot.status
  into match_organization_id, match_capacity, match_status
  from public.match_slots as slot where slot.id = p_match_id for update;

  if match_organization_id is null then raise exception 'Match not found'; end if;
  if not exists (
    select 1 from public.organization_members as membership
    where membership.organization_id = match_organization_id
      and membership.user_id = auth.uid()
  ) then raise exception 'Organization membership required'; end if;
  if match_status <> 'scheduled' then raise exception 'Match is not open'; end if;

  select count(*)::integer into attendee_count
  from public.match_slot_attendees as attendee
  where attendee.match_slot_id = p_match_id;

  if attendee_count >= match_capacity and not exists (
    select 1 from public.match_slot_attendees as attendee
    where attendee.match_slot_id = p_match_id and attendee.user_id = auth.uid()
  ) then raise exception 'Match is full'; end if;

  insert into public.match_slot_attendees (match_slot_id, user_id, account_user_id)
  values (p_match_id, auth.uid(), auth.uid())
  on conflict (match_slot_id, user_id) do nothing;

  return query select coalesce(
    array_agg(attendee.user_id order by attendee.registered_at), array[]::uuid[]
  ) from public.match_slot_attendees as attendee
  where attendee.match_slot_id = p_match_id;
end;
$$;

create or replace function public.add_guest_to_match(
  p_match_id uuid,
  p_guest_name text
)
returns table (guest_id uuid, attendees uuid[], attendee_names jsonb)
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_organization_id uuid;
  match_capacity integer;
  match_status text;
  attendee_count integer;
  new_guest_id uuid;
  clean_name text := trim(p_guest_name);
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  loop
    new_guest_id := gen_random_uuid();
    exit when not exists (
      select 1 from auth.users where id = new_guest_id
    ) and not exists (
      select 1 from public.players where user_id = new_guest_id
    );
  end loop;
  select slot.organization_id, slot.max_players, slot.status
  into match_organization_id, match_capacity, match_status
  from public.match_slots as slot where slot.id = p_match_id for update;
  if match_organization_id is null then raise exception 'Match not found'; end if;
  if not exists (
    select 1 from public.organization_members as membership
    where membership.organization_id = match_organization_id
      and membership.user_id = auth.uid()
  ) then raise exception 'Organization membership required'; end if;
  if match_status <> 'scheduled' then raise exception 'Match is not open'; end if;
  if clean_name is null or char_length(clean_name) not between 1 and 40 then
    raise exception 'Guest name must contain 1 to 40 characters';
  end if;
  select count(*)::integer into attendee_count
  from public.match_slot_attendees as attendee
  where attendee.match_slot_id = p_match_id;
  if attendee_count >= match_capacity then raise exception 'Match is full'; end if;

  insert into public.match_slot_attendees (
    match_slot_id, user_id, guest_name
  ) values (p_match_id, new_guest_id, clean_name);

  return query
  select
    new_guest_id,
    array_agg(attendee.user_id order by attendee.registered_at),
    coalesce(jsonb_object_agg(attendee.user_id::text, attendee.guest_name)
      filter (where attendee.guest_name is not null), '{}'::jsonb)
  from public.match_slot_attendees as attendee
  where attendee.match_slot_id = p_match_id;
end;
$$;

create or replace function public.remove_departed_member_from_match_signups()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.match_slot_attendees as attendee
  using public.match_slots as slot
  where attendee.match_slot_id = slot.id
    and slot.organization_id = old.organization_id
    and slot.status = 'scheduled'
    and attendee.account_user_id = old.user_id;
  return old;
end;
$$;

create or replace function public.reject_guest_motm_vote()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.match_slot_attendees as attendee
    where attendee.match_slot_id = new.match_slot_id
      and attendee.user_id = new.candidate_id
      and attendee.account_user_id is null
  ) then
    raise exception 'Guest attendees cannot receive player statistics';
  end if;

  return new;
end;
$$;

drop trigger if exists match_slot_goals_reject_guest_stats
  on public.match_slot_goals;

drop trigger if exists match_slot_votes_reject_guest_stats
  on public.match_slot_motm_votes;
create trigger match_slot_votes_reject_guest_stats
before insert or update of candidate_id on public.match_slot_motm_votes
for each row execute function public.reject_guest_motm_vote();

revoke all on function public.add_guest_to_match(uuid, text) from public;
grant execute on function public.add_guest_to_match(uuid, text) to authenticated;
revoke all on function public.get_match_slots(uuid) from public;
grant execute on function public.get_match_slots(uuid) to authenticated;

create or replace function public.get_match_man_of_the_match(p_match_id uuid)
returns table (
  my_vote uuid,
  vote_totals jsonb,
  vote_count integer,
  eligible_voter_count integer,
  is_complete boolean,
  winner_ids uuid[]
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_organization_id uuid;
  match_status text;
  poll_is_complete boolean;
  voting_deadline timestamptz;
  current_vote_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select slot.organization_id, slot.status,
    slot.motm_awarded_at is not null, slot.motm_voting_deadline
  into match_organization_id, match_status, poll_is_complete, voting_deadline
  from public.match_slots as slot
  where slot.id = p_match_id for update;
  if match_organization_id is null then raise exception 'Match not found'; end if;
  if match_status <> 'finished' then
    raise exception 'Match must be finished before voting';
  end if;
  if not exists (
    select 1
    from public.organization_members as membership
    join public.match_slot_attendees as attendee
      on attendee.match_slot_id = p_match_id
     and attendee.account_user_id = membership.user_id
    where membership.organization_id = match_organization_id
      and membership.user_id = auth.uid()
  ) then raise exception 'Match attendee required'; end if;

  if not poll_is_complete and voting_deadline <= now() then
    select count(*)::integer into current_vote_count
    from public.match_slot_motm_votes as vote
    where vote.match_slot_id = p_match_id;
    if current_vote_count >= 3 then
      update public.match_slots as slot
      set motm_awarded_at = now()
      where slot.id = p_match_id and slot.motm_awarded_at is null;
      with vote_totals as (
        select vote.candidate_id, count(*) as total_votes
        from public.match_slot_motm_votes as vote
        where vote.match_slot_id = p_match_id
        group by vote.candidate_id
      ), highest_vote_count as (
        select max(totals.total_votes) as total_votes from vote_totals as totals
      )
      update public.players as player
      set man_of_the_match_count = player.man_of_the_match_count + 1
      from vote_totals as totals
      cross join highest_vote_count as highest
      where totals.total_votes = highest.total_votes
        and player.organization_id = match_organization_id
        and player.user_id = totals.candidate_id;
      poll_is_complete := true;
    end if;
  end if;

  return query
  select
    (select vote.candidate_id from public.match_slot_motm_votes as vote
      where vote.match_slot_id = p_match_id and vote.voter_id = auth.uid()),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'candidate_id', totals.candidate_id,
        'vote_count', totals.vote_count
      ) order by totals.vote_count desc, totals.candidate_id)
      from (
        select vote.candidate_id, count(*)::integer as vote_count
        from public.match_slot_motm_votes as vote
        where vote.match_slot_id = p_match_id
        group by vote.candidate_id
      ) as totals
    ), '[]'::jsonb),
    (select count(*)::integer from public.match_slot_motm_votes as vote
      where vote.match_slot_id = p_match_id),
    (select count(*)::integer from public.match_slot_attendees as attendee
      where attendee.match_slot_id = p_match_id
        and attendee.account_user_id is not null),
    poll_is_complete,
    case when poll_is_complete then coalesce((
      select array_agg(totals.candidate_id order by totals.candidate_id)
      from (
        select vote.candidate_id, count(*) as vote_count
        from public.match_slot_motm_votes as vote
        where vote.match_slot_id = p_match_id
        group by vote.candidate_id
      ) as totals
      where totals.vote_count = (
        select max(counts.vote_count)
        from (
          select count(*) as vote_count
          from public.match_slot_motm_votes as vote
          where vote.match_slot_id = p_match_id
          group by vote.candidate_id
        ) as counts
      )
    ), array[]::uuid[]) else array[]::uuid[] end;
end;
$$;

create or replace function public.vote_match_man_of_the_match(
  p_match_id uuid,
  p_candidate_id uuid
)
returns table (
  my_vote uuid,
  vote_totals jsonb,
  vote_count integer,
  eligible_voter_count integer,
  is_complete boolean,
  winner_ids uuid[]
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_organization_id uuid;
  match_status text;
  poll_is_complete boolean;
  current_vote_count integer;
  current_voter_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select slot.organization_id, slot.status, slot.motm_awarded_at is not null
  into match_organization_id, match_status, poll_is_complete
  from public.match_slots as slot
  where slot.id = p_match_id for update;
  if match_organization_id is null then raise exception 'Match not found'; end if;
  if match_status <> 'finished' then
    raise exception 'Match must be finished before voting';
  end if;
  if not exists (
    select 1
    from public.organization_members as membership
    join public.match_slot_attendees as attendee
      on attendee.match_slot_id = p_match_id
     and attendee.account_user_id = membership.user_id
    where membership.organization_id = match_organization_id
      and membership.user_id = auth.uid()
  ) then raise exception 'Match attendee required'; end if;
  if not exists (
    select 1 from public.match_slot_attendees as attendee
    where attendee.match_slot_id = p_match_id
      and attendee.user_id = p_candidate_id
      and attendee.account_user_id is not null
  ) then raise exception 'Candidate must be a registered player'; end if;

  select poll.is_complete into poll_is_complete
  from public.get_match_man_of_the_match(p_match_id) as poll;
  if poll_is_complete then
    return query select poll.*
    from public.get_match_man_of_the_match(p_match_id) as poll;
    return;
  end if;

  insert into public.match_slot_motm_votes (
    match_slot_id, voter_id, candidate_id
  ) values (p_match_id, auth.uid(), p_candidate_id)
  on conflict (match_slot_id, voter_id)
  do update set candidate_id = excluded.candidate_id;

  select
    (select count(*)::integer from public.match_slot_motm_votes as vote
      where vote.match_slot_id = p_match_id),
    (select count(*)::integer from public.match_slot_attendees as attendee
      where attendee.match_slot_id = p_match_id
        and attendee.account_user_id is not null)
  into current_vote_count, current_voter_count;

  if current_vote_count = current_voter_count then
    update public.match_slots as slot
    set motm_awarded_at = now()
    where slot.id = p_match_id and slot.motm_awarded_at is null;
    with vote_totals as (
      select vote.candidate_id, count(*) as total_votes
      from public.match_slot_motm_votes as vote
      where vote.match_slot_id = p_match_id
      group by vote.candidate_id
    ), highest_vote_count as (
      select max(totals.total_votes) as total_votes from vote_totals as totals
    )
    update public.players as player
    set man_of_the_match_count = player.man_of_the_match_count + 1
    from vote_totals as totals
    cross join highest_vote_count as highest
    where totals.total_votes = highest.total_votes
      and player.organization_id = match_organization_id
      and player.user_id = totals.candidate_id;
  end if;

  return query select poll.*
  from public.get_match_man_of_the_match(p_match_id) as poll;
end;
$$;

revoke all on function public.get_match_man_of_the_match(uuid) from public;
revoke all on function public.vote_match_man_of_the_match(uuid, uuid) from public;
grant execute on function public.get_match_man_of_the_match(uuid) to authenticated;
grant execute on function public.vote_match_man_of_the_match(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';