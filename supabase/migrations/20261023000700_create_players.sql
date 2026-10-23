create table if not exists public.players (
  organization_id uuid not null,
  user_id uuid not null,
  overall_rating integer not null default 50 check (overall_rating between 0 and 100),
  matches_played integer not null default 0 check (matches_played >= 0),
  wins integer not null default 0 check (wins >= 0),
  draws integer not null default 0 check (draws >= 0),
  losses integer not null default 0 check (losses >= 0),
  man_of_the_match_count integer not null default 0 check (man_of_the_match_count >= 0),
  goals integer not null default 0 check (goals >= 0),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id),
  foreign key (organization_id, user_id)
    references public.organization_members (organization_id, user_id)
    on delete cascade
);

alter table public.players enable row level security;
revoke all on table public.players from anon, authenticated;
grant select on table public.players to authenticated;

create or replace function public.is_organization_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_members as membership
    where membership.organization_id = p_organization_id
      and membership.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_organization_member(uuid) from public;
grant execute on function public.is_organization_member(uuid) to authenticated;

drop policy if exists players_select_for_organization_members
  on public.players;

create policy players_select_for_organization_members
  on public.players
  for select
  to authenticated
  using (public.is_organization_member(players.organization_id));

create or replace function public.create_player_for_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_player then
    insert into public.players (organization_id, user_id)
    values (new.organization_id, new.user_id)
    on conflict (organization_id, user_id) do nothing;
  else
    delete from public.players
    where organization_id = new.organization_id
      and user_id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists organization_members_create_player_after_insert
  on public.organization_members;

create trigger organization_members_create_player_after_insert
  after insert on public.organization_members
  for each row execute function public.create_player_for_membership();

drop trigger if exists organization_members_create_player_after_player_update
  on public.organization_members;

create trigger organization_members_create_player_after_player_update
  after update of is_player on public.organization_members
  for each row execute function public.create_player_for_membership();

revoke all on function public.create_player_for_membership() from public;

insert into public.players (organization_id, user_id)
select membership.organization_id, membership.user_id
from public.organization_members as membership
where membership.is_player
on conflict (organization_id, user_id) do nothing;

notify pgrst, 'reload schema';