create or replace function public.edit_match_discussion_message(
  p_message_id uuid,
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
  message_match_id uuid;
  message_author_id uuid;
  match_organization_id uuid;
  match_status text;
  clean_body text := trim(p_body);
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select message.match_slot_id, message.author_id,
    slot.organization_id, slot.status
  into message_match_id, message_author_id,
    match_organization_id, match_status
  from public.match_discussion_messages as message
  join public.match_slots as slot on slot.id = message.match_slot_id
  where message.id = p_message_id
  for update of message, slot;

  if message_match_id is null then
    raise exception 'Message not found';
  end if;
  if message_author_id <> auth.uid() then
    raise exception 'Only the message author can edit it';
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

  update public.match_discussion_messages as message
  set body = clean_body
  where message.id = p_message_id;

  return query
  select message.id, message.author_id,
    coalesce(author.display_name, 'Joueur'), message.body, message.created_at
  from public.match_discussion_messages as message
  left join public.organization_members as author
    on author.organization_id = match_organization_id
    and author.user_id = message.author_id
  where message.id = p_message_id;
end;
$$;

create or replace function public.delete_match_discussion_message(
  p_message_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  message_match_id uuid;
  message_author_id uuid;
  match_organization_id uuid;
  match_status text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select message.match_slot_id, message.author_id,
    slot.organization_id, slot.status
  into message_match_id, message_author_id,
    match_organization_id, match_status
  from public.match_discussion_messages as message
  join public.match_slots as slot on slot.id = message.match_slot_id
  where message.id = p_message_id
  for update of message, slot;

  if message_match_id is null then
    raise exception 'Message not found';
  end if;
  if message_author_id <> auth.uid() then
    raise exception 'Only the message author can delete it';
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

  delete from public.match_discussion_messages as message
  where message.id = p_message_id;
end;
$$;

revoke all on function public.edit_match_discussion_message(uuid, text) from public;
revoke all on function public.delete_match_discussion_message(uuid) from public;
grant execute on function public.edit_match_discussion_message(uuid, text) to authenticated;
grant execute on function public.delete_match_discussion_message(uuid) to authenticated;

notify pgrst, 'reload schema';