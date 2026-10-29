create table if not exists public.match_discussion_messages (
  id uuid primary key default gen_random_uuid(),
  match_slot_id uuid not null references public.match_slots (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists match_discussion_messages_match_created_idx
  on public.match_discussion_messages (match_slot_id, created_at desc);

alter table public.match_discussion_messages enable row level security;
revoke all on table public.match_discussion_messages from anon, authenticated;

create table if not exists public.match_chat_push_claims (
  message_id uuid primary key references public.match_discussion_messages (id) on delete cascade,
  claimed_at timestamptz not null default now()
);

alter table public.match_chat_push_claims enable row level security;
revoke all on table public.match_chat_push_claims from anon, authenticated;

create or replace function public.get_match_discussions(p_organization_id uuid)
returns table (
  match_id uuid,
  match_date text,
  match_time text,
  venue text,
  status text,
  last_message_body text,
  last_author_name text,
  last_message_at timestamptz
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
    slot.status,
    latest.body,
    coalesce(author.display_name, 'Joueur'),
    latest.created_at
  from public.match_slots as slot
  join lateral (
    select message.body, message.author_id, message.created_at
    from public.match_discussion_messages as message
    where message.match_slot_id = slot.id
    order by message.created_at desc, message.id desc
    limit 1
  ) as latest on true
  left join public.organization_members as author
    on author.organization_id = slot.organization_id
    and author.user_id = latest.author_id
  where slot.organization_id = p_organization_id
  order by latest.created_at desc;
end;
$$;

create or replace function public.get_match_discussion_messages(p_match_id uuid)
returns table (
  id uuid,
  author_id uuid,
  author_name text,
  body text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  match_organization_id uuid;
begin
  select slot.organization_id
  into match_organization_id
  from public.match_slots as slot
  where slot.id = p_match_id;

  if match_organization_id is null then
    raise exception 'Match not found';
  end if;
  if auth.uid() is null or not exists (
    select 1 from public.organization_members as membership
    where membership.organization_id = match_organization_id
      and membership.user_id = auth.uid()
  ) then
    raise exception 'Organization membership required';
  end if;

  return query
  select recent.id, recent.author_id,
    coalesce(author.display_name, 'Joueur'), recent.body, recent.created_at
  from (
    select message.id, message.author_id, message.body, message.created_at
    from public.match_discussion_messages as message
    where message.match_slot_id = p_match_id
    order by message.created_at desc, message.id desc
    limit 500
  ) as recent
  left join public.organization_members as author
    on author.organization_id = match_organization_id
    and author.user_id = recent.author_id
  order by recent.created_at, recent.id;
end;
$$;

create or replace function public.send_match_discussion_message(
  p_match_id uuid,
  p_body text
)
returns table (
  id uuid,
  author_id uuid,
  author_name text,
  body text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_organization_id uuid;
  match_status text;
  clean_body text := trim(p_body);
  new_message_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select slot.organization_id, slot.status
  into match_organization_id, match_status
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
  if match_status in ('finished', 'cancelled') then
    raise exception 'Discussion is read-only';
  end if;
  if clean_body is null or char_length(clean_body) not between 1 and 2000 then
    raise exception 'Message must contain 1 to 2000 characters';
  end if;

  insert into public.match_discussion_messages (match_slot_id, author_id, body)
  values (p_match_id, auth.uid(), clean_body)
  returning match_discussion_messages.id into new_message_id;

  return query
  select message.id, message.author_id,
    coalesce(author.display_name, 'Joueur'), message.body, message.created_at
  from public.match_discussion_messages as message
  left join public.organization_members as author
    on author.organization_id = match_organization_id
    and author.user_id = message.author_id
  where message.id = new_message_id;
end;
$$;

create or replace function public.delete_match_discussion(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_organization_id uuid;
  match_creator_id uuid;
  match_status text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select slot.organization_id, slot.created_by, slot.status
  into match_organization_id, match_creator_id, match_status
  from public.match_slots as slot
  where slot.id = p_match_id
  for update;

  if match_organization_id is null then
    raise exception 'Match not found';
  end if;
  if match_status <> 'finished' then
    raise exception 'Only finished match discussions can be deleted';
  end if;
  if not exists (
    select 1 from public.organization_members as membership
    where membership.organization_id = match_organization_id
      and membership.user_id = auth.uid()
      and (membership.role = 'owner' or match_creator_id = auth.uid())
  ) then
    raise exception 'Only the match creator or organization owner can delete this discussion';
  end if;

  delete from public.match_discussion_messages as message
  where message.match_slot_id = p_match_id;
end;
$$;

revoke all on function public.get_match_discussions(uuid) from public;
revoke all on function public.get_match_discussion_messages(uuid) from public;
revoke all on function public.send_match_discussion_message(uuid, text) from public;
revoke all on function public.delete_match_discussion(uuid) from public;
grant execute on function public.get_match_discussions(uuid) to authenticated;
grant execute on function public.get_match_discussion_messages(uuid) to authenticated;
grant execute on function public.send_match_discussion_message(uuid, text) to authenticated;
grant execute on function public.delete_match_discussion(uuid) to authenticated;

notify pgrst, 'reload schema';