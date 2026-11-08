create extension if not exists pgcrypto with schema extensions;

create table if not exists public.match_slot_guest_motm_tokens (
  match_slot_id uuid not null,
  attendee_id uuid not null,
  token_hash bytea not null,
  created_at timestamptz not null default now(),
  primary key (match_slot_id, attendee_id),
  foreign key (match_slot_id, attendee_id)
    references public.match_slot_attendees (match_slot_id, user_id)
    on delete cascade
);

alter table public.match_slot_guest_motm_tokens enable row level security;
revoke all on table public.match_slot_guest_motm_tokens
  from public, anon, authenticated;

create or replace function public.resolve_guest_match_motm_token(p_token text)
returns table (match_slot_id uuid, attendee_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select token.match_slot_id, token.attendee_id
  from public.match_slot_guest_motm_tokens as token
  where p_token ~ '^[0-9a-f]{64}$'
    and token.token_hash = extensions.digest(
      convert_to(p_token, 'UTF8'), 'sha256'
    )
$$;

revoke all on function public.resolve_guest_match_motm_token(text)
  from public, anon, authenticated;

create or replace function public.create_guest_match_motm_vote_links(
  p_match_id uuid,
  p_guest_tokens jsonb
)
returns table (attendee_id uuid, guest_name text, token text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_organization_id uuid;
  match_creator_id uuid;
  match_status text;
  guest_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select slot.organization_id, slot.created_by, slot.status
  into match_organization_id, match_creator_id, match_status
  from public.match_slots as slot
  where slot.id = p_match_id
  for update;

  if match_organization_id is null or match_status <> 'finished' then
    raise exception 'Finished match required';
  end if;
  if match_creator_id <> auth.uid() and not exists (
    select 1
    from public.organization_members as membership
    where membership.organization_id = match_organization_id
      and membership.user_id = auth.uid()
      and membership.role = 'owner'
  ) then
    raise exception 'Match creator or organization owner required';
  end if;
  if exists (
    select 1 from public.match_slots as slot
    where slot.id = p_match_id and slot.motm_awarded_at is not null
  ) then
    raise exception 'Voting is closed';
  end if;
  if p_guest_tokens is null or jsonb_typeof(p_guest_tokens) <> 'array' then
    raise exception 'Guest tokens must be an array';
  end if;

  select count(*)::integer into guest_count
  from public.match_slot_attendees as attendee
  where attendee.match_slot_id = p_match_id
    and attendee.account_user_id is null;

  if jsonb_array_length(p_guest_tokens) <> guest_count then
    raise exception 'A token is required for every guest';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(p_guest_tokens) as link(attendee_id uuid, token text)
    where link.attendee_id is null or link.token is null
      or link.token !~ '^[0-9a-f]{64}$'
  ) then
    raise exception 'Invalid guest token';
  end if;
  if (
    select count(distinct link.attendee_id)
    from jsonb_to_recordset(p_guest_tokens) as link(attendee_id uuid, token text)
  ) <> guest_count or (
    select count(distinct link.token)
    from jsonb_to_recordset(p_guest_tokens) as link(attendee_id uuid, token text)
  ) <> guest_count then
    raise exception 'Guest tokens must be unique';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(p_guest_tokens) as link(attendee_id uuid, token text)
    left join public.match_slot_attendees as attendee
      on attendee.match_slot_id = p_match_id
     and attendee.user_id = link.attendee_id
     and attendee.account_user_id is null
    where attendee.user_id is null
  ) then
    raise exception 'Guest attendee required';
  end if;

  insert into public.match_slot_guest_motm_tokens (
    match_slot_id, attendee_id, token_hash
  )
  select p_match_id, link.attendee_id,
    extensions.digest(convert_to(link.token, 'UTF8'), 'sha256')
  from jsonb_to_recordset(p_guest_tokens) as link(attendee_id uuid, token text)
  on conflict (match_slot_id, attendee_id)
  do update set token_hash = excluded.token_hash, created_at = now();

  return query
  select link.attendee_id, attendee.guest_name, link.token
  from jsonb_to_recordset(p_guest_tokens) as link(attendee_id uuid, token text)
  join public.match_slot_attendees as attendee
    on attendee.match_slot_id = p_match_id
   and attendee.user_id = link.attendee_id;
end;
$$;

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
  poll_is_complete boolean;
begin
  select slot.organization_id, slot.motm_voting_deadline,
    slot.motm_awarded_at is not null
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
     where attendee.match_slot_id = p_match_id)
  into current_vote_count, current_voter_count;

  if (current_vote_count = current_voter_count and current_voter_count > 0)
    or (voting_deadline <= now() and current_vote_count >= 3) then
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

    return true;
  end if;

  return false;
end;
$$;

revoke all on function public.complete_match_motm_if_ready(uuid)
  from public, anon, authenticated;

create or replace function public.get_guest_match_motm_vote(p_token text)
returns table (
  match_id uuid,
  venue text,
  match_date text,
  match_time text,
  guest_name text,
  my_vote uuid,
  vote_totals jsonb,
  vote_count integer,
  eligible_voter_count integer,
  is_complete boolean,
  winner_ids uuid[],
  candidates jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  guest_match_id uuid;
  guest_attendee_id uuid;
  match_organization_id uuid;
  match_status text;
  poll_is_complete boolean;
begin
  select resolved.match_slot_id, resolved.attendee_id
  into guest_match_id, guest_attendee_id
  from public.resolve_guest_match_motm_token(p_token) as resolved;
  if guest_match_id is null then raise exception 'Invalid vote link'; end if;

  select slot.organization_id, slot.status, slot.motm_awarded_at is not null
  into match_organization_id, match_status, poll_is_complete
  from public.match_slots as slot
  where slot.id = guest_match_id
  for update;
  if match_status <> 'finished' then raise exception 'Match is not finished'; end if;

  select public.complete_match_motm_if_ready(guest_match_id)
  into poll_is_complete;

  return query
  select slot.id, slot.venue, to_char(slot.match_date, 'YYYY-MM-DD'),
    to_char(slot.match_time, 'HH24:MI'), guest.guest_name,
    (select vote.candidate_id
     from public.match_slot_motm_votes as vote
     where vote.match_slot_id = guest_match_id
       and vote.voter_id = guest_attendee_id),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'candidate_id', totals.candidate_id,
        'vote_count', totals.vote_count
      ) order by totals.vote_count desc, totals.candidate_id)
      from (
        select vote.candidate_id, count(*)::integer as vote_count
        from public.match_slot_motm_votes as vote
        where vote.match_slot_id = guest_match_id
        group by vote.candidate_id
      ) as totals
    ), '[]'::jsonb),
    (select count(*)::integer from public.match_slot_motm_votes as vote
     where vote.match_slot_id = guest_match_id),
    (select count(*)::integer from public.match_slot_attendees as attendee
     where attendee.match_slot_id = guest_match_id),
    poll_is_complete,
    case when poll_is_complete then coalesce((
      select array_agg(totals.candidate_id order by totals.candidate_id)
      from (
        select vote.candidate_id, count(*) as vote_count
        from public.match_slot_motm_votes as vote
        where vote.match_slot_id = guest_match_id
        group by vote.candidate_id
      ) as totals
      where totals.vote_count = (
        select max(counts.vote_count)
        from (
          select count(*) as vote_count
          from public.match_slot_motm_votes as vote
          where vote.match_slot_id = guest_match_id
          group by vote.candidate_id
        ) as counts
      )
    ), array[]::uuid[]) else array[]::uuid[] end,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', attendee.user_id,
        'name', coalesce(attendee.guest_name, membership.display_name),
        'team', case
          when attendee.user_id = any(slot.team_a) then 0
          when attendee.user_id = any(slot.team_b) then 1
          else null
        end
      ) order by attendee.registered_at)
      from public.match_slot_attendees as attendee
      left join public.organization_members as membership
        on membership.organization_id = match_organization_id
       and membership.user_id = attendee.account_user_id
      where attendee.match_slot_id = guest_match_id
    ), '[]'::jsonb)
  from public.match_slots as slot
  join public.match_slot_attendees as guest
    on guest.match_slot_id = slot.id
   and guest.user_id = guest_attendee_id
   and guest.account_user_id is null
  where slot.id = guest_match_id;
end;
$$;

create or replace function public.vote_guest_match_motm(
  p_token text,
  p_candidate_id uuid
)
returns table (
  match_id uuid,
  venue text,
  match_date text,
  match_time text,
  guest_name text,
  my_vote uuid,
  vote_totals jsonb,
  vote_count integer,
  eligible_voter_count integer,
  is_complete boolean,
  winner_ids uuid[],
  candidates jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  guest_match_id uuid;
  guest_attendee_id uuid;
  poll_is_complete boolean;
begin
  select resolved.match_slot_id, resolved.attendee_id
  into guest_match_id, guest_attendee_id
  from public.resolve_guest_match_motm_token(p_token) as resolved;
  if guest_match_id is null then raise exception 'Invalid vote link'; end if;

  select poll.is_complete into poll_is_complete
  from public.get_guest_match_motm_vote(p_token) as poll;
  if poll_is_complete then
    return query select poll.*
      from public.get_guest_match_motm_vote(p_token) as poll;
    return;
  end if;
  if not exists (
    select 1
    from public.match_slot_attendees as attendee
    where attendee.match_slot_id = guest_match_id
      and attendee.user_id = p_candidate_id
  ) then
    raise exception 'Candidate must be a match attendee';
  end if;

  insert into public.match_slot_motm_votes (
    match_slot_id, voter_id, candidate_id
  ) values (guest_match_id, guest_attendee_id, p_candidate_id)
  on conflict (match_slot_id, voter_id)
  do update set candidate_id = excluded.candidate_id;

  perform public.complete_match_motm_if_ready(guest_match_id);
  return query select poll.*
    from public.get_guest_match_motm_vote(p_token) as poll;
end;
$$;

drop trigger if exists match_slot_votes_reject_guest_stats
  on public.match_slot_motm_votes;

revoke all on function public.create_guest_match_motm_vote_links(uuid, jsonb)
  from public;
revoke all on function public.get_guest_match_motm_vote(text)
  from public;
revoke all on function public.vote_guest_match_motm(text, uuid)
  from public;
grant execute on function public.create_guest_match_motm_vote_links(uuid, jsonb)
  to authenticated;
grant execute on function public.get_guest_match_motm_vote(text)
  to anon, authenticated;
grant execute on function public.vote_guest_match_motm(text, uuid)
  to anon, authenticated;

notify pgrst, 'reload schema';