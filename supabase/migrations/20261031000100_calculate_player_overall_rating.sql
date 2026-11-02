create or replace function public.calculate_player_overall_rating(
  p_matches_played integer,
  p_wins integer,
  p_draws integer,
  p_goals integer,
  p_man_of_the_match_count integer,
  p_best_scorer_count integer
)
returns integer
language sql
immutable
parallel safe
set search_path = ''
as $$
  select least(
    99,
    greatest(
      51,
      round(
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
          11 * least(
            (p_wins::numeric + 0.5 * p_draws) / p_matches_played,
            1
          )
          else 0
        end
        + case when p_matches_played > 0 then
          20 * least(
            p_goals::numeric / p_matches_played / 4,
            1
          )
          else 0
        end
        + case when p_matches_played > 0 then
          5 * least(
            p_man_of_the_match_count::numeric / p_matches_played,
            1
          )
          else 0
        end
        + case when p_matches_played > 0 then
          5 * least(
            p_best_scorer_count::numeric / p_matches_played,
            1
          )
          else 0
        end
      )::integer
    )
  );
$$;

create or replace function public.update_player_overall_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.overall_rating := public.calculate_player_overall_rating(
    new.matches_played,
    new.wins,
    new.draws,
    new.goals,
    new.man_of_the_match_count,
    new.best_scorer_count
  );
  return new;
end;
$$;

revoke all on function public.update_player_overall_rating() from public;

drop trigger if exists players_update_overall_rating
  on public.players;

create trigger players_update_overall_rating
  before insert or update of matches_played, wins, draws, goals,
    man_of_the_match_count, best_scorer_count
  on public.players
  for each row execute function public.update_player_overall_rating();

alter table public.players
  alter column overall_rating set default 51;

alter table public.players
  drop constraint if exists players_overall_rating_check;

update public.players as player
set overall_rating = public.calculate_player_overall_rating(
  player.matches_played,
  player.wins,
  player.draws,
  player.goals,
  player.man_of_the_match_count,
  player.best_scorer_count
);

alter table public.players
  add constraint players_overall_rating_check
  check (overall_rating between 51 and 99);

notify pgrst, 'reload schema';