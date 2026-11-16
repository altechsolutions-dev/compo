alter table public.players
  add column if not exists best_defender_count integer not null default 0
    check (best_defender_count >= 0),
  add column if not exists best_goalkeeper_count integer not null default 0
    check (best_goalkeeper_count >= 0);

create or replace function public.calculate_player_overall_rating(
  p_matches_played integer, p_wins integer, p_draws integer, p_goals integer,
  p_man_of_the_match_count integer, p_best_scorer_count integer,
  p_best_defender_count integer, p_best_goalkeeper_count integer
)
returns integer
language sql
immutable
parallel safe
set search_path = ''
as $$
  select least(99, greatest(51, round(
    51
    + case
        when p_matches_played <= 0 then 0
        when p_matches_played <= 3 then 2
        when p_matches_played <= 5 then 3
        when p_matches_played <= 10 then 4
        when p_matches_played <= 15 then 5
        when p_matches_played < 20 then 6
        else 7
      end
    + case when p_matches_played > 0 then
        11 * least((p_wins::numeric + 0.5 * p_draws) / p_matches_played, 1)
        + 20 * least(p_goals::numeric / p_matches_played / 4, 1)
        + 5 * least(p_man_of_the_match_count::numeric / p_matches_played, 1)
        + 5 * least(p_best_scorer_count::numeric / p_matches_played, 1)
        + 3 * least(p_best_defender_count::numeric / p_matches_played, 1)
        + 3 * least(p_best_goalkeeper_count::numeric / p_matches_played, 1)
      else 0 end
  )::integer));
$$;

create or replace function public.update_player_overall_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.overall_rating := public.calculate_player_overall_rating(
    new.matches_played, new.wins, new.draws, new.goals,
    new.man_of_the_match_count, new.best_scorer_count,
    new.best_defender_count, new.best_goalkeeper_count
  );
  return new;
end;
$$;

drop trigger if exists players_update_overall_rating on public.players;
create trigger players_update_overall_rating
before insert or update of matches_played, wins, draws, goals,
  man_of_the_match_count, best_scorer_count, best_defender_count,
  best_goalkeeper_count on public.players
for each row execute function public.update_player_overall_rating();

create or replace function public.complete_match_motm_if_ready(p_match_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_organization_id uuid;
  voting_deadline timestamptz;
  current_vote_count integer;
  current_voter_count integer;
  first_votes integer;
  second_votes integer;
  poll_is_complete boolean;
begin
  select slot.organization_id, slot.motm_voting_deadline, slot.motm_awarded_at is not null
  into match_organization_id, voting_deadline, poll_is_complete
  from public.match_slots as slot
  where slot.id = p_match_id and slot.status = 'finished'
  for update;
  if match_organization_id is null or poll_is_complete then
    return coalesce(poll_is_complete, false);
  end if;
  select
    (select count(*)::integer from public.match_slot_motm_votes as vote
      where vote.match_slot_id = p_match_id),
    (select count(*)::integer from public.match_slot_attendees as attendee
      where attendee.match_slot_id = p_match_id),
    coalesce((select count(*)::integer from public.match_slot_motm_votes as vote
      where vote.match_slot_id = p_match_id group by vote.candidate_id
      order by count(*) desc limit 1), 0),
    coalesce((select count(*)::integer from public.match_slot_motm_votes as vote
      where vote.match_slot_id = p_match_id group by vote.candidate_id
      order by count(*) desc offset 1 limit 1), 0)
  into current_vote_count, current_voter_count, first_votes, second_votes;

  if (current_vote_count = current_voter_count and current_voter_count > 0)
    or (first_votes > second_votes + current_voter_count - current_vote_count)
    or (voting_deadline <= now() and current_vote_count >= 3) then
    update public.match_slots as slot set motm_awarded_at = now()
    where slot.id = p_match_id and slot.motm_awarded_at is null;
    with totals as (
      select vote.candidate_id, count(*) as votes
      from public.match_slot_motm_votes as vote
      where vote.match_slot_id = p_match_id group by vote.candidate_id
    )
    update public.players as player
    set man_of_the_match_count = player.man_of_the_match_count + 1
    from totals
    where player.organization_id = match_organization_id
      and player.user_id = totals.candidate_id
      and totals.votes = (select max(t.votes) from totals as t);
    return true;
  end if;
  return false;
end;
$$;

create or replace function public.get_match_man_of_the_match(p_match_id uuid)
returns table (
  my_vote uuid, vote_totals jsonb, vote_count integer,
  eligible_voter_count integer, is_complete boolean, winner_ids uuid[]
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_organization_id uuid;
  match_status text;
  poll_is_complete boolean;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select slot.organization_id, slot.status
  into match_organization_id, match_status
  from public.match_slots as slot where slot.id = p_match_id for update;
  if match_organization_id is null then raise exception 'Match not found'; end if;
  if match_status <> 'finished' then raise exception 'Match must be finished before voting'; end if;
  if not exists (
    select 1 from public.organization_members as membership
    join public.match_slot_attendees as attendee
      on attendee.match_slot_id = p_match_id and attendee.account_user_id = membership.user_id
    where membership.organization_id = match_organization_id and membership.user_id = auth.uid()
  ) then raise exception 'Match attendee required'; end if;
  poll_is_complete := public.complete_match_motm_if_ready(p_match_id);

  return query
  select
    (select vote.candidate_id from public.match_slot_motm_votes as vote
      where vote.match_slot_id = p_match_id and vote.voter_id = auth.uid()),
    coalesce((select jsonb_agg(jsonb_build_object(
      'candidate_id', totals.candidate_id, 'vote_count', totals.votes
    ) order by totals.votes desc, totals.candidate_id)
      from (select vote.candidate_id, count(*)::integer as votes
        from public.match_slot_motm_votes as vote where vote.match_slot_id = p_match_id
        group by vote.candidate_id) as totals), '[]'::jsonb),
    (select count(*)::integer from public.match_slot_motm_votes as vote
      where vote.match_slot_id = p_match_id),
    (select count(*)::integer from public.match_slot_attendees as attendee
      where attendee.match_slot_id = p_match_id),
    poll_is_complete,
    case when poll_is_complete then coalesce((
      select array_agg(totals.candidate_id order by totals.candidate_id)
      from (select vote.candidate_id, count(*) as votes
        from public.match_slot_motm_votes as vote where vote.match_slot_id = p_match_id
        group by vote.candidate_id) as totals
      where totals.votes = (select max(counts.votes) from (
        select count(*) as votes from public.match_slot_motm_votes as vote
        where vote.match_slot_id = p_match_id group by vote.candidate_id
      ) as counts)
    ), array[]::uuid[]) else array[]::uuid[] end;
end;
$$;

create table public.match_slot_award_polls (
  match_slot_id uuid not null references public.match_slots(id) on delete cascade,
  category text not null check (category in ('butcher', 'missed_chances', 'defender', 'goalkeeper')),
  awarded_at timestamptz,
  primary key (match_slot_id, category)
);

create table public.match_slot_award_votes (
  match_slot_id uuid not null,
  category text not null,
  voter_id uuid not null,
  candidate_id uuid not null,
  primary key (match_slot_id, category, voter_id),
  foreign key (match_slot_id, category)
    references public.match_slot_award_polls(match_slot_id, category) on delete cascade,
  foreign key (match_slot_id, voter_id)
    references public.match_slot_attendees(match_slot_id, user_id) on delete cascade,
  foreign key (match_slot_id, candidate_id)
    references public.match_slot_attendees(match_slot_id, user_id) on delete cascade
);
alter table public.match_slot_award_polls enable row level security;
alter table public.match_slot_award_votes enable row level security;
revoke all on public.match_slot_award_polls, public.match_slot_award_votes
  from public, anon, authenticated;

create or replace function public.match_award_voter(
  p_match_id uuid, p_token text, p_voter_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_token is not null then
    if public.resolve_guest_match_motm_token(p_token) is distinct from p_match_id
      or not exists (
        select 1 from public.match_slot_attendees as attendee
        where attendee.match_slot_id = p_match_id
          and attendee.user_id = p_voter_id
          and attendee.account_user_id is null
      ) then
      raise exception 'Invalid vote link or guest attendee';
    end if;
    return p_voter_id;
  end if;
  if auth.uid() is null or not exists (
    select 1 from public.match_slots as slot
    join public.organization_members as member
      on member.organization_id = slot.organization_id and member.user_id = auth.uid()
    join public.match_slot_attendees as attendee
      on attendee.match_slot_id = slot.id and attendee.account_user_id = member.user_id
    where slot.id = p_match_id
  ) then
    raise exception 'Match attendee required';
  end if;
  return auth.uid();
end;
$$;
revoke all on function public.match_award_voter(uuid, text, uuid)
  from public, anon, authenticated;

create or replace function public.get_match_award_polls(
  p_match_id uuid, p_token text default null, p_voter_id uuid default null
)
returns table (
  category text, my_vote uuid, vote_totals jsonb, vote_count integer,
  eligible_voter_count integer, is_complete boolean, winner_ids uuid[]
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  voter uuid;
  organization uuid;
  deadline timestamptz;
  current_category text;
  total integer;
  eligible integer;
  first_votes integer;
  second_votes integer;
begin
  voter := public.match_award_voter(p_match_id, p_token, p_voter_id);
  select slot.organization_id, slot.motm_voting_deadline
    into organization, deadline
  from public.match_slots as slot
  where slot.id = p_match_id and slot.status = 'finished'
  for update;
  if organization is null then raise exception 'Finished match required'; end if;

  insert into public.match_slot_award_polls (match_slot_id, category)
  select p_match_id, item.category
  from (values ('butcher'), ('missed_chances'), ('defender'), ('goalkeeper')) as item(category)
  on conflict do nothing;

  select count(*)::integer into eligible from public.match_slot_attendees as attendee
  where attendee.match_slot_id = p_match_id;
  for current_category in
    select poll.category from public.match_slot_award_polls as poll
    where poll.match_slot_id = p_match_id and poll.awarded_at is null
  loop
    select count(*)::integer into total from public.match_slot_award_votes as vote
    where vote.match_slot_id = p_match_id and vote.category = current_category;
    select
      coalesce((select count(*)::integer from public.match_slot_award_votes as vote
        where vote.match_slot_id = p_match_id and vote.category = current_category
        group by vote.candidate_id order by count(*) desc limit 1), 0),
      coalesce((select count(*)::integer from public.match_slot_award_votes as vote
        where vote.match_slot_id = p_match_id and vote.category = current_category
        group by vote.candidate_id order by count(*) desc offset 1 limit 1), 0)
    into first_votes, second_votes;
    if (total = eligible and eligible > 0)
      or (first_votes > second_votes + eligible - total)
      or (deadline <= now() and total >= 3) then
      update public.match_slot_award_polls as poll set awarded_at = now()
      where poll.match_slot_id = p_match_id and poll.category = current_category;
      if current_category in ('defender', 'goalkeeper') then
        with totals as (
          select vote.candidate_id, count(*) as votes
          from public.match_slot_award_votes as vote
          where vote.match_slot_id = p_match_id and vote.category = current_category
          group by vote.candidate_id
        )
        update public.players as player
        set best_defender_count = player.best_defender_count
              + case when current_category = 'defender' then 1 else 0 end,
            best_goalkeeper_count = player.best_goalkeeper_count
              + case when current_category = 'goalkeeper' then 1 else 0 end
        from totals
        where player.organization_id = organization
          and player.user_id = totals.candidate_id
          and totals.votes = (select max(t.votes) from totals as t);
      end if;
    end if;
  end loop;

  return query
  select poll.category,
    (select vote.candidate_id from public.match_slot_award_votes as vote
      where vote.match_slot_id = p_match_id and vote.category = poll.category
        and vote.voter_id = voter),
    coalesce((select jsonb_agg(jsonb_build_object(
      'candidate_id', totals.candidate_id, 'vote_count', totals.votes
    ) order by totals.votes desc, totals.candidate_id)
      from (select vote.candidate_id, count(*)::integer as votes
        from public.match_slot_award_votes as vote
        where vote.match_slot_id = p_match_id and vote.category = poll.category
        group by vote.candidate_id) as totals), '[]'::jsonb),
    (select count(*)::integer from public.match_slot_award_votes as vote
      where vote.match_slot_id = p_match_id and vote.category = poll.category),
    eligible, poll.awarded_at is not null,
    case when poll.awarded_at is not null then coalesce((
      select array_agg(totals.candidate_id order by totals.candidate_id)
      from (select vote.candidate_id, count(*) as votes
        from public.match_slot_award_votes as vote
        where vote.match_slot_id = p_match_id and vote.category = poll.category
        group by vote.candidate_id) as totals
      where totals.votes = (select max(counts.votes) from (
        select count(*) as votes from public.match_slot_award_votes as vote
        where vote.match_slot_id = p_match_id and vote.category = poll.category
        group by vote.candidate_id
      ) as counts)
    ), array[]::uuid[]) else array[]::uuid[] end
  from public.match_slot_award_polls as poll
  where poll.match_slot_id = p_match_id order by poll.category;
end;
$$;

create or replace function public.vote_match_award(
  p_match_id uuid, p_category text, p_candidate_id uuid,
  p_token text default null, p_voter_id uuid default null
)
returns table (
  category text, my_vote uuid, vote_totals jsonb, vote_count integer,
  eligible_voter_count integer, is_complete boolean, winner_ids uuid[]
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  voter uuid;
  completed boolean;
begin
  voter := public.match_award_voter(p_match_id, p_token, p_voter_id);
  if p_category is null or p_category not in ('butcher', 'missed_chances', 'defender', 'goalkeeper') then
    raise exception 'Invalid award category';
  end if;
  if not exists (select 1 from public.match_slot_attendees as attendee
    where attendee.match_slot_id = p_match_id and attendee.user_id = p_candidate_id) then
    raise exception 'Candidate must be a match attendee';
  end if;
  select poll.is_complete into completed
  from public.get_match_award_polls(p_match_id, p_token, p_voter_id) as poll
  where poll.category = p_category;
  if completed then
    return query select poll.* from public.get_match_award_polls(p_match_id, p_token, p_voter_id) as poll;
    return;
  end if;
  insert into public.match_slot_award_votes (match_slot_id, category, voter_id, candidate_id)
  values (p_match_id, p_category, voter, p_candidate_id)
  on conflict on constraint match_slot_award_votes_pkey
  do update set candidate_id = excluded.candidate_id;
  return query select poll.* from public.get_match_award_polls(p_match_id, p_token, p_voter_id) as poll;
end;
$$;

revoke all on function public.get_match_award_polls(uuid, text, uuid) from public;
revoke all on function public.vote_match_award(uuid, text, uuid, text, uuid) from public;
grant execute on function public.get_match_award_polls(uuid, text, uuid) to anon, authenticated;
grant execute on function public.vote_match_award(uuid, text, uuid, text, uuid) to anon, authenticated;

create or replace function public.create_guest_match_motm_vote_link(
  p_match_id uuid, p_token text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_organization_id uuid;
  match_creator_id uuid;
  match_status text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid vote token';
  end if;
  select slot.organization_id, slot.created_by, slot.status
  into match_organization_id, match_creator_id, match_status
  from public.match_slots as slot where slot.id = p_match_id for update;
  if match_organization_id is null or match_status <> 'finished' then
    raise exception 'Finished match required';
  end if;
  if match_creator_id <> auth.uid() and not exists (
    select 1 from public.organization_members as membership
    where membership.organization_id = match_organization_id
      and membership.user_id = auth.uid() and membership.role = 'owner'
  ) then raise exception 'Match creator or organization owner required'; end if;
  if not exists (
    select 1 from public.match_slot_attendees as attendee
    where attendee.match_slot_id = p_match_id and attendee.account_user_id is null
  ) then raise exception 'Guest attendee required'; end if;
  insert into public.match_slot_guest_motm_links (match_slot_id, token_hash)
  values (p_match_id, extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'))
  on conflict (match_slot_id)
  do update set token_hash = excluded.token_hash, created_at = now();
  return p_token;
end;
$$;

notify pgrst, 'reload schema';
