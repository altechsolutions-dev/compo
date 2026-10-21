create table if not exists public.match_slots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  match_date date not null,
  match_time time not null,
  venue text not null check (char_length(trim(venue)) between 1 and 160),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists match_slots_organization_schedule_idx
  on public.match_slots (organization_id, match_date, match_time);

alter table public.match_slots enable row level security;
revoke all on table public.match_slots from anon, authenticated;

drop function if exists public.get_match_slots(uuid);

create function public.get_match_slots(p_organization_id uuid)
returns table (id uuid, match_date text, match_time text, venue text)
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
    slot.venue
  from public.match_slots as slot
  where slot.organization_id = p_organization_id
  order by slot.match_date, slot.match_time;
end;
$$;

drop function if exists public.create_match_slot(uuid, date, time, text);

create function public.create_match_slot(
  p_organization_id uuid,
  p_match_date date,
  p_match_time time,
  p_venue text
)
returns table (id uuid, match_date text, match_time text, venue text)
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

  insert into public.match_slots (
    organization_id,
    match_date,
    match_time,
    venue,
    created_by
  ) values (
    p_organization_id,
    p_match_date,
    p_match_time,
    clean_venue,
    auth.uid()
  ) returning match_slots.id into new_match_id;

  return query
  select
    slot.id,
    to_char(slot.match_date, 'YYYY-MM-DD'),
    to_char(slot.match_time, 'HH24:MI'),
    slot.venue
  from public.match_slots as slot
  where slot.id = new_match_id;
end;
$$;

revoke all on function public.get_match_slots(uuid) from public;
revoke all on function public.create_match_slot(uuid, date, time, text) from public;
grant execute on function public.get_match_slots(uuid) to authenticated;
grant execute on function public.create_match_slot(uuid, date, time, text) to authenticated;

notify pgrst, 'reload schema';