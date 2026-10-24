import type { ReactNode } from "react";
import { ArrowRight, Check, CircleDot, MapPin, Shirt, X } from "lucide-react";
import type { MatchManOfTheMatchPoll, MatchSlot } from "../../types";
import { formatMatchDate } from "../../helpers/formatMatchDate/formatMatchDate";
import { LiveMatchPanel } from "../LiveMatchPanel/LiveMatchPanel";
import "./MatchDetails.css";

export type MatchDetailsContentOptions = {
  match: MatchSlot;
  isFull: boolean;
  isRegistered: boolean;
  isRegistering: boolean;
  teams?: [string[], string[]];
  playerNames: Record<string, string>;
  onClose: () => void;
  onRegister: () => void;
  onStartMatch?: (teams: [string[], string[]]) => void;
  onRecordGoal?: (scorerId: string) => void;
  manOfTheMatchPoll?: MatchManOfTheMatchPoll | null;
  manOfTheMatchPollLoading?: boolean;
  manOfTheMatchVoteSaving?: boolean;
  manOfTheMatchVoteError?: string;
  onVoteForManOfTheMatch?: (candidateId: string) => void;
};

export function renderMatchDetailsContent({
  match,
  isFull,
  isRegistered,
  isRegistering,
  teams,
  playerNames,
  onClose,
  onRegister,
  onStartMatch,
  onRecordGoal,
  manOfTheMatchPoll,
  manOfTheMatchPollLoading = false,
  manOfTheMatchVoteSaving = false,
  manOfTheMatchVoteError = "",
  onVoteForManOfTheMatch,
}: MatchDetailsContentOptions): ReactNode {
  const spotsRemaining = match.maxPlayers - match.attendees.length;

  if (match.status === "finished") {
    const goals = match.goals ?? [];
    const score = [
      goals.filter((goal) => goal.team === 0).length,
      goals.filter((goal) => goal.team === 1).length,
    ];
    const scorerTotals = goals.reduce<Record<string, number>>(
      (totals, goal) => {
        totals[goal.scorerId] = (totals[goal.scorerId] ?? 0) + 1;
        return totals;
      },
      {},
    );
    const bestScorerCount = Math.max(0, ...Object.values(scorerTotals));
    const bestScorerIds = Object.entries(scorerTotals)
      .filter(([, count]) => count === bestScorerCount && count > 0)
      .map(([id]) => id);
    const matchTeams = teams ?? match.teams;

    return (
      <>
        <div className="mb-5.5 flex items-center justify-between">
          <span className="text-[9px] font-bold tracking-[1.5px] text-(--text-secondary)">
            MATCH TERMINÉ
          </span>
          <button
            className="grid size-9 cursor-pointer place-items-center rounded-md border border-(--line) bg-(--bg-surface) text-(--ink)"
            onClick={onClose}
            type="button"
            aria-label="Fermer les détails du match"
          >
            <X size={17} />
          </button>
        </div>
        <p className="mb-2 text-xs capitalize text-(--text-secondary)">
          {formatMatchDate(match.date)} · {match.time}
        </p>
        <h2 id="match-drawer-title">{match.venue}</h2>

        <section
          aria-label="Résultat final"
          className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-y border-(--line) text-center"
        >
          <div className="flex flex-col justify-center bg-linear-to-r from-(--team-b-blue)/15 to-transparent px-2 py-4">
            <p className="mb-1 text-[9px] font-bold uppercase text-(--team-b-blue)">
              Équipe bleue
            </p>
            <strong className="font-mono text-4xl tabular-nums text-(--team-b-blue)">
              {score[1]}
            </strong>
          </div>
          <div className="flex flex-col items-center justify-center border-x border-(--line) px-2 py-4">
            <p className="mb-1 text-[9px] font-bold uppercase text-(--text-secondary)">
              Chrono
            </p>
            <strong className="font-mono text-lg tabular-nums text-(--text-primary)">
              {formatElapsedTime(match.elapsedSeconds ?? 0)}
            </strong>
          </div>
          <div className="flex flex-col justify-center bg-linear-to-l from-(--team-a-red)/15 to-transparent px-2 py-4">
            <p className="mb-1 text-[9px] font-bold uppercase text-(--team-a-red)">
              Équipe rouge
            </p>
            <strong className="font-mono text-4xl tabular-nums text-(--team-a-red)">
              {score[0]}
            </strong>
          </div>
        </section>

        <section
          aria-label="Distinctions du match"
          className="mt-6 grid gap-x-10 gap-y-5 py-2 sm:grid-cols-2"
        >
          <div className="min-w-0">
            <h3 className="mb-2 text-sm font-bold text-(--text-primary)">
              Homme du match
            </h3>
            {manOfTheMatchPollLoading ? (
              <p className="m-0 text-xs text-(--text-secondary)" role="status">
                Chargement du sondage…
              </p>
            ) : manOfTheMatchPoll?.isComplete ? (
              <p className="m-0 text-sm font-semibold text-(--team-b-blue)">
                {manOfTheMatchPoll.winnerIds
                  .map((id) => playerNames[id] ?? "Joueur")
                  .join(", ") || "Aucun vote"}
              </p>
            ) : manOfTheMatchPoll ? (
              <>
                <p
                  className="mb-3 text-[10px] text-(--text-secondary)"
                  role="status"
                >
                  Vote en cours · {manOfTheMatchPoll.voteCount}/
                  {manOfTheMatchPoll.eligibleVoterCount} votes
                </p>
                <div className="grid gap-1.5">
                  {match.attendees.map((candidateId) => {
                    const candidateVotes =
                      manOfTheMatchPoll.voteTotals.find(
                        (vote) => vote.candidateId === candidateId,
                      )?.voteCount ?? 0;
                    const isSelected = manOfTheMatchPoll.myVote === candidateId;

                    return (
                      <button
                        aria-pressed={isSelected}
                        className={`flex min-h-10 items-center justify-between gap-3 rounded-md border px-3 text-left text-xs font-semibold ${isSelected ? "border-(--team-b-blue) bg-(--team-b-blue)/10 text-(--team-b-blue)" : "border-(--line) bg-(--bg-surface) text-(--text-primary)"}`}
                        disabled={
                          manOfTheMatchVoteSaving || !onVoteForManOfTheMatch
                        }
                        key={candidateId}
                        onClick={() => onVoteForManOfTheMatch?.(candidateId)}
                        type="button"
                      >
                        <span className="truncate">
                          {playerNames[candidateId] ?? "Joueur"}
                          {isSelected ? " · Votre vote" : ""}
                        </span>
                        <span className="shrink-0 font-mono tabular-nums">
                          {candidateVotes}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {manOfTheMatchVoteError && (
                  <p
                    className="mb-0 mt-2 text-xs text-(--team-a-red)"
                    role="alert"
                  >
                    {manOfTheMatchVoteError}
                  </p>
                )}
              </>
            ) : (
              <p className="m-0 text-xs text-(--text-secondary)" role="status">
                {manOfTheMatchVoteError || "Sondage indisponible."}
              </p>
            )}
          </div>
          <div>
            <h3 className="mb-2 text-sm font-bold text-(--text-primary)">
              Meilleur buteur
            </h3>
            {bestScorerIds.length ? (
              <ul className="m-0 list-none space-y-1 p-0 text-sm font-semibold">
                {bestScorerIds.map((id) => {
                  const team = matchTeams?.findIndex((players) =>
                    players.includes(id),
                  );

                  return (
                    <li
                      className={
                        team === 0
                          ? "text-(--team-a-red)"
                          : team === 1
                            ? "text-(--team-b-blue)"
                            : "text-(--text-primary)"
                      }
                      key={id}
                    >
                      {playerNames[id] ?? "Joueur"} · {bestScorerCount} but
                      {bestScorerCount === 1 ? "" : "s"}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="m-0 text-xs text-(--text-secondary)">
                Aucun buteur
              </p>
            )}
          </div>
        </section>

        <section
          className="mt-6 border-t border-(--line) pt-5"
          aria-labelledby="finished-scorers-title"
        >
          <h3
            className="mb-4 text-sm font-bold text-(--text-primary)"
            id="finished-scorers-title"
          >
            Buteurs
          </h3>
          <div className="grid gap-x-10 gap-y-5 sm:grid-cols-2">
            {([1, 0] as const).map((team) => {
              const teamGoals = goals.filter((goal) => goal.team === team);
              const teamLabel = team === 0 ? "rouge" : "bleue";

              return (
                <section
                  aria-label={`Buteurs de l'équipe ${teamLabel}`}
                  className="min-w-0"
                  key={team}
                >
                  <h4
                    className={`mb-3 text-[10px] font-bold uppercase ${team === 0 ? "text-(--team-a-red)" : "text-(--team-b-blue)"}`}
                  >
                    Équipe {teamLabel}
                  </h4>
                  {teamGoals.length ? (
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="text-[9px] uppercase text-(--text-secondary)">
                          <th className="py-2 font-semibold">Buteur</th>
                          <th className="py-2 text-right font-semibold">
                            Minute
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamGoals.map((goal) => (
                          <tr key={goal.id}>
                            <td className="py-2.5 text-(--text-primary)">
                              {playerNames[goal.scorerId] ?? "Joueur"}
                            </td>
                            <td className="py-2.5 text-right font-mono tabular-nums text-(--text-secondary)">
                              {formatElapsedTime(goal.elapsedSeconds)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="m-0 text-xs text-(--text-secondary)">
                      Aucun but
                    </p>
                  )}
                </section>
              );
            })}
          </div>
        </section>

        <section
          aria-labelledby="finished-composition-title"
          className="mt-7 border-t border-(--line) pt-5"
        >
          <h3
            className="mb-4 text-sm font-bold text-(--text-primary)"
            id="finished-composition-title"
          >
            Composition
          </h3>
          <div className="grid gap-x-10 gap-y-5 sm:grid-cols-2">
            {([1, 0] as const).map((team) => {
              const teamLabel = team === 0 ? "rouge" : "bleue";
              const teamPlayers = teams?.[team] ?? match.teams?.[team] ?? [];

              return (
                <section
                  aria-label={`Composition de l'équipe ${teamLabel}`}
                  className="min-w-0"
                  key={team}
                >
                  <h4
                    className={`mb-2 text-[10px] font-bold uppercase ${team === 0 ? "text-(--team-a-red)" : "text-(--team-b-blue)"}`}
                  >
                    Équipe {teamLabel}
                  </h4>
                  {teamPlayers.length ? (
                    <ul className="m-0 list-none space-y-1 p-0 text-xs text-(--text-secondary)">
                      {teamPlayers.map((id) => (
                        <li key={id}>{playerNames[id] ?? "Joueur"}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="m-0 text-xs text-(--text-secondary)">
                      Composition non enregistrée
                    </p>
                  )}
                </section>
              );
            })}
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <div className="mb-5.5 flex items-center justify-between">
        <span className="text-[9px] font-bold tracking-[1.5px] text-(--text-secondary)">
          {match.status === "in_progress"
            ? "MATCH EN COURS"
            : isFull
              ? "MATCH COMPLET"
              : "PROCHAIN MATCH"}
        </span>
        <button
          className="grid size-9 cursor-pointer place-items-center rounded-md border border-(--line) bg-(--bg-surface) text-(--ink)"
          onClick={onClose}
          type="button"
          aria-label="Fermer les détails du match"
        >
          <X size={17} />
        </button>
      </div>
      <p className="mb-2 text-xs capitalize text-(--text-secondary)">
        {formatMatchDate(match.date)}
      </p>
      <h2 id="match-drawer-title">
        {match.time}
        <span> · </span> Foot à 5
      </h2>
      <p className="m-0 flex items-center gap-1.75 text-[11px] text-(--text-secondary)">
        <MapPin className="shrink-0 text-(--team-b-blue)" size={15} />
        {match.venue}
      </p>

      <div className="mt-6 border-t border-white/15 pt-4.25">
        <div className="mb-2.25 flex items-center justify-between text-[11px] text-(--text-secondary)">
          <span>Inscriptions</span>
          <strong className="text-xs text-white">
            {match.attendees.length}
            <span className="font-normal text-(--text-secondary)">
              {" "}
              / {match.maxPlayers}
            </span>
          </strong>
        </div>
        <div
          className="h-1 overflow-hidden bg-(--border-neutral) [&>span]:block [&>span]:h-full [&>span]:bg-(--team-b-blue) [&>span]:transition-[width] [&>span]:duration-200"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={match.maxPlayers}
          aria-valuenow={match.attendees.length}
          aria-label={`${match.attendees.length} joueurs inscrits sur ${match.maxPlayers}`}
        >
          <span
            style={{
              width: `${Math.min((match.attendees.length / match.maxPlayers) * 100, 100)}%`,
            }}
          />
        </div>
        <div className="mt-3 flex min-h-7.5 items-center">
          {match.attendees.slice(0, 5).map((id) => {
            const name = playerNames[id] ?? "Joueur";
            return (
              <span
                className="-mr-1.25 grid size-6.25 place-items-center rounded-full border-2 border-(--border-neutral) bg-(--bg-elevated) text-[7px] font-bold text-(--text-secondary)"
                key={id}
                title={name}
              >
                {name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")}
              </span>
            );
          })}
          <span className="ml-3 text-[10px] text-(--text-secondary)">
            {match.attendees.length > 5 ? `+${match.attendees.length - 5}` : ""}
          </span>
          <span className="ml-auto text-[10px] text-(--text-secondary)">
            joueurs confirmés
          </span>
        </div>
      </div>

      {match.status === "in_progress" && match.startedAt && teams ? (
        <LiveMatchPanel
          startedAt={match.startedAt}
          teams={teams}
          goals={match.goals ?? []}
          playerNames={playerNames}
          onRecordGoal={onRecordGoal ?? (() => undefined)}
        />
      ) : teams ? (
        <section className="match-drawer-line mt-4.75 border-t border-white/15 pt-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="m-0 text-sm font-bold text-(--ink)">
              Composition du match
            </h3>
            {isFull && (
              <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-(--status-success)">
                <Check size={13} /> COMPLET
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            {teams.map((team, index) => (
              <div className="min-w-0" key={index}>
                <h4 className="mb-2.25 flex items-center gap-1.5 text-[10px] font-semibold text-[#f5f7f3]">
                  <Shirt
                    size={14}
                    color={
                      index === 0 ? "var(--team-a-red)" : "var(--team-b-blue)"
                    }
                    aria-hidden="true"
                  />
                  Équipe {index === 0 ? "A" : "B"}
                </h4>
                {team.map((id, playerIndex) => (
                  <p
                    className="mb-1.5 overflow-hidden text-ellipsis whitespace-nowrap text-[9px] text-(--text-secondary)"
                    key={id}
                  >
                    {playerNames[id] ?? `Joueur ${playerIndex + 1}`}
                  </p>
                ))}
              </div>
            ))}
          </div>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-[9px] text-(--status-success)">
            <Check size={14} /> Équipes équilibrées selon les stats
          </p>
          {isFull && match.status !== "in_progress" && onStartMatch && (
            <button
              className="mt-4 flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md border-0 bg-(--team-b-blue) text-xs font-bold text-(--bg-main) hover:brightness-110"
              onClick={() => onStartMatch(teams)}
              type="button"
            >
              <CircleDot size={15} /> Lancer le match
            </button>
          )}
        </section>
      ) : isFull ? (
        <p className="mt-4.75 text-center text-[10px] text-(--text-secondary)">
          Ce match est complet.
        </p>
      ) : (
        <button
          className="mt-5.5 flex min-h-10.5 w-full cursor-pointer items-center justify-center gap-2.25 rounded-[3px] border-0 bg-(--team-b-blue) text-xs font-bold text-(--bg-main) transition-colors hover:brightness-110 disabled:cursor-default disabled:bg-(--bg-elevated) disabled:text-(--text-secondary)"
          onClick={onRegister}
          disabled={isRegistered || isRegistering}
          type="button"
        >
          {isRegistered ? (
            <>
              <Check size={16} /> Vous êtes inscrit
            </>
          ) : (
            <>
              {isRegistering ? "Inscription…" : "Je m'inscris"}
              {!isRegistering && <ArrowRight size={16} />}
            </>
          )}
        </button>
      )}
      <p className="mt-2.5 text-center text-[10px] text-(--text-secondary)">
        {isFull
          ? `Les ${match.maxPlayers} places sont prises.`
          : `Encore ${spotsRemaining} place${spotsRemaining > 1 ? "s" : ""} disponible${spotsRemaining > 1 ? "s" : ""}`}
      </p>
    </>
  );
}

function formatElapsedTime(totalSeconds: number) {
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`;
}
