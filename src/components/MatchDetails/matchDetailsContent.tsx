import { Fragment, type ReactNode } from "react";
import { ArrowRight, Check, Goal, MapPin, Trophy, X } from "lucide-react";
import type { MatchManOfTheMatchPoll, MatchSlot } from "../../types";
import { formatMatchDate } from "../../helpers/formatMatchDate/formatMatchDate";
import { LiveMatchPanel } from "../LiveMatchPanel/LiveMatchPanel";
import { MatchGoalTimeline } from "../MatchGoalTimeline/MatchGoalTimeline";
import { MatchScoreboard } from "../MatchScoreboard/MatchScoreboard";
import { MatchTeamComposition } from "./MatchTeamComposition";
import { MatchShareButton } from "./MatchShareButton";
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
  canCancel?: boolean;
  onCancelMatch?: () => void;
  onSaveTeams?: (teams: [string[], string[]]) => Promise<boolean>;
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
  canCancel = false,
  onCancelMatch,
  onSaveTeams,
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
    const matchTeams = teams ?? match.teams ?? [[], []];
    const votingCandidates = match.attendees.filter(
      (candidateId) => !(candidateId in (match.attendeeNames ?? {})),
    );
    const renderCandidateButton = (candidateId: string): ReactNode => {
      const candidateVotes =
        manOfTheMatchPoll?.voteTotals.find(
          (vote) => vote.candidateId === candidateId,
        )?.voteCount ?? 0;
      const isSelected = manOfTheMatchPoll?.myVote === candidateId;
      const candidateTeam = matchTeams.findIndex((players) =>
        players.includes(candidateId),
      );
      const teamColorClass =
        candidateTeam === 0
          ? "text-(--team-a-red)"
          : candidateTeam === 1
            ? "text-(--team-b-blue)"
            : "text-(--text-primary)";
      const teamBorderClass =
        candidateTeam === 0
          ? "border-l-(--team-a-red)"
          : candidateTeam === 1
            ? "border-l-(--team-b-blue)"
            : "";
      const selectedTeamClass =
        candidateTeam === 0
          ? "border-(--team-a-red) bg-(--team-a-red)/15 text-(--team-a-red) ring-1 ring-(--team-a-red) enabled:hover:bg-(--team-a-red)/25"
          : "border-(--team-b-blue) bg-(--team-b-blue)/15 text-(--team-b-blue) ring-1 ring-(--team-b-blue) enabled:hover:bg-(--team-b-blue)/25";
      const teamHoverClass =
        candidateTeam === 0
          ? "enabled:hover:border-(--team-a-red) enabled:hover:bg-(--team-a-red)/10 enabled:hover:text-(--team-a-red)"
          : "enabled:hover:border-(--team-b-blue) enabled:hover:bg-(--team-b-blue)/10 enabled:hover:text-(--team-b-blue)";

      return (
        <button
          aria-pressed={isSelected}
          aria-disabled={manOfTheMatchVoteSaving || !onVoteForManOfTheMatch}
          className={`flex min-h-16 cursor-pointer items-center justify-between gap-3 border border-l-4 px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--team-b-blue) disabled:cursor-not-allowed disabled:opacity-50 ${teamBorderClass} ${isSelected ? selectedTeamClass : `border-(--line) bg-(--bg-surface) text-(--text-primary) ${teamHoverClass}`}`}
          disabled={!onVoteForManOfTheMatch}
          key={candidateId}
          onClick={() => {
            if (!manOfTheMatchVoteSaving) onVoteForManOfTheMatch?.(candidateId);
          }}
          type="button"
        >
          <span className="min-w-0">
            <span
              className={`block truncate text-sm font-bold ${teamColorClass}`}
            >
              {playerNames[candidateId] ?? "Joueur"}
            </span>
            {isSelected && (
              <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.8px]">
                Votre choix
              </span>
            )}
          </span>
          <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold tabular-nums">
            {candidateVotes}
            {isSelected && <Check aria-hidden="true" size={15} />}
          </span>
        </button>
      );
    };
    const unassignedCandidates = votingCandidates.filter(
      (candidateId) =>
        !matchTeams.some((players) => players.includes(candidateId)),
    );

    return (
      <>
        <div className="mb-5.5 flex items-center justify-between">
          <span className="drawer-eyebrow">MATCH TERMINÉ</span>
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
        <h2 className="drawer-title" id="match-drawer-title">
          {match.venue}
        </h2>
        <div className="mb-5">
          <MatchShareButton matchId={match.id} />
        </div>

        <MatchScoreboard
          goals={goals}
          elapsedSeconds={match.elapsedSeconds ?? 0}
          status="finished"
        />

        <section
          aria-labelledby="match-awards-title"
          className="mt-7 border-l-4 border-(--team-b-blue) bg-linear-to-r from-(--team-b-blue)/10 to-(--bg-surface) px-5 py-5 sm:px-7 sm:py-6"
        >
          <h2
            className="mb-5 text-xl font-bold text-(--text-primary)"
            id="match-awards-title"
          >
            Distinctions du match
          </h2>
          <div className="mb-5 flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-(--team-b-blue)/15 text-(--team-b-blue)">
              <Trophy aria-hidden="true" size={21} />
            </span>
            <h3 className="m-0 text-lg font-bold text-(--text-primary)">
              Homme du match
            </h3>
          </div>

          <section aria-label="Vote homme du match">
            {manOfTheMatchPollLoading ? (
              <p className="m-0 text-sm text-(--text-secondary)" role="status">
                Chargement du sondage…
              </p>
            ) : manOfTheMatchPoll?.isComplete ? (
              <div aria-live="polite">
                <p
                  className="mb-3 text-xs text-(--text-secondary)"
                  role="status"
                >
                  Vote clôturé · {manOfTheMatchPoll.voteCount} /{" "}
                  {manOfTheMatchPoll.eligibleVoterCount} votes exprimés
                </p>
                {manOfTheMatchPoll.winnerIds.length ? (
                  <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
                    {manOfTheMatchPoll.winnerIds.map((id) => {
                      const winnerTeam = matchTeams.findIndex((players) =>
                        players.includes(id),
                      );
                      const winnerTeamClass =
                        winnerTeam === 0
                          ? "border-(--team-a-red)/35 bg-(--team-a-red)/10 text-(--team-a-red)"
                          : winnerTeam === 1
                            ? "border-(--team-b-blue)/35 bg-(--team-b-blue)/10 text-(--team-b-blue)"
                            : "border-(--line) bg-(--bg-surface) text-(--text-primary)";

                      return (
                        <li
                          className={`flex min-h-14 items-center gap-3 border px-4 py-3 text-sm font-bold ${winnerTeamClass}`}
                          key={id}
                        >
                          <Trophy aria-hidden="true" size={17} />
                          {playerNames[id] ?? "Joueur"}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="m-0 text-sm font-semibold text-(--text-secondary)">
                    Aucun vote enregistré
                  </p>
                )}
              </div>
            ) : manOfTheMatchPoll ? (
              <>
                <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                  <p
                    className="m-0 text-sm font-semibold text-(--text-primary)"
                    role="status"
                  >
                    {manOfTheMatchPoll.voteCount} /{" "}
                    {manOfTheMatchPoll.eligibleVoterCount} participants ont voté
                  </p>
                  <p className="m-0 text-xs text-(--text-secondary)">
                    Cliquez pour voter ou changer votre choix.
                  </p>
                </div>
                <div
                  aria-label="Participation au vote"
                  aria-valuemax={manOfTheMatchPoll.eligibleVoterCount}
                  aria-valuemin={0}
                  aria-valuenow={manOfTheMatchPoll.voteCount}
                  className="mb-5 h-2 overflow-hidden rounded-full bg-(--bg-elevated)"
                  role="progressbar"
                >
                  <span
                    className="block h-full bg-(--team-b-blue) transition-[width]"
                    style={{
                      width: `${manOfTheMatchPoll.eligibleVoterCount ? Math.min((manOfTheMatchPoll.voteCount / manOfTheMatchPoll.eligibleVoterCount) * 100, 100) : 0}%`,
                    }}
                  />
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  {(
                    [
                      { index: 1, name: "Équipe Bleue" },
                      { index: 0, name: "Équipe Rouge" },
                    ] as const
                  ).map(({ index, name }) => {
                    const teamColorClass =
                      index === 1
                        ? "text-(--team-b-blue)"
                        : "text-(--team-a-red)";
                    const teamCandidates = votingCandidates.filter(
                      (candidateId) => matchTeams[index].includes(candidateId),
                    );

                    return (
                      <section
                        aria-label={name}
                        className="min-w-0"
                        key={index}
                      >
                        <h4
                          className={`mb-2 flex items-center gap-2 text-xs font-bold ${teamColorClass}`}
                        >
                          <span
                            aria-hidden="true"
                            className={`size-2 rounded-full ${index === 1 ? "bg-(--team-b-blue)" : "bg-(--team-a-red)"}`}
                          />
                          {name}
                        </h4>
                        <div className="grid gap-2">
                          {teamCandidates.map(renderCandidateButton)}
                        </div>
                      </section>
                    );
                  })}
                  {unassignedCandidates.length > 0 && (
                    <section
                      aria-label="Autres joueurs"
                      className="min-w-0 sm:col-span-2"
                    >
                      <h4 className="mb-2 text-xs font-bold text-(--text-secondary)">
                        Autres joueurs
                      </h4>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {unassignedCandidates.map(renderCandidateButton)}
                      </div>
                    </section>
                  )}
                </div>
                <div className="mt-2 min-h-3">
                  {manOfTheMatchVoteError ? (
                    <p
                      className="m-0 text-xs leading-3 text-(--team-a-red)"
                      role="alert"
                    >
                      {manOfTheMatchVoteError}
                    </p>
                  ) : manOfTheMatchVoteSaving ? (
                    <p
                      className="m-0 text-xs leading-3 text-(--text-secondary)"
                      role="status"
                    >
                      Enregistrement de votre vote…
                    </p>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="m-0 text-sm text-(--text-secondary)" role="status">
                {manOfTheMatchVoteError || "Sondage indisponible."}
              </p>
            )}
          </section>

          <section
            aria-labelledby="best-scorer-title"
            className="mt-6 flex items-start gap-3"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-(--team-a-red)/10 text-(--team-a-red)">
              <Goal aria-hidden="true" size={19} />
            </span>
            <div className="min-w-0">
              <h3
                className="m-0 text-lg font-bold text-(--text-primary)"
                id="best-scorer-title"
              >
                {bestScorerIds.length > 1
                  ? "Meilleurs buteurs"
                  : "Meilleur buteur"}
              </h3>
              {bestScorerIds.length ? (
                <p className="m-0 text-sm leading-relaxed text-(--text-primary)">
                  {bestScorerIds.map((id, index) => {
                    const team = matchTeams.findIndex((players) =>
                      players.includes(id),
                    );

                    return (
                      <Fragment key={id}>
                        {index > 0 ? " et " : ""}
                        <span
                          className={`font-semibold ${team === 0 ? "text-(--team-a-red)" : team === 1 ? "text-(--team-b-blue)" : "text-(--text-primary)"}`}
                        >
                          {playerNames[id] ?? "Joueur"}
                        </span>
                      </Fragment>
                    );
                  })}
                  {` avec ${bestScorerCount} but${bestScorerCount === 1 ? "" : "s"}`}
                  {bestScorerIds.length > 1 ? " chacun" : ""}
                </p>
              ) : (
                <p className="m-0 text-sm text-(--text-secondary)">
                  Aucun buteur
                </p>
              )}
            </div>
          </section>
        </section>

        <div className="mt-6 grid gap-x-8 gap-y-5 lg:grid-cols-2">
          <section className="pt-1" aria-labelledby="finished-scorers-title">
            <h3
              className="mb-4 text-sm font-bold text-(--text-primary)"
              id="finished-scorers-title"
            >
              Fil du match
            </h3>
            <MatchGoalTimeline goals={goals} playerNames={playerNames} />
          </section>

          <MatchTeamComposition
            className="mt-0 pt-1"
            isFull={match.attendees.length >= match.maxPlayers}
            match={match}
            playerNames={playerNames}
            teams={matchTeams}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="mb-5.5 flex items-center justify-between">
        <span className="drawer-eyebrow">
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
      <h2 className="drawer-title" id="match-drawer-title">
        {match.time}
        <span className="drawer-title__muted"> · </span> Foot à 5
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
        <MatchTeamComposition
          key={`${match.id}-${match.attendees.join(":")}`}
          isFull={isFull}
          match={match}
          onSaveTeams={onSaveTeams}
          onStartMatch={onStartMatch}
          playerNames={playerNames}
          teams={teams}
        />
      ) : isFull ? (
        <p className="mt-4.75 text-center text-[10px] text-(--text-secondary)">
          Ce match est complet.
        </p>
      ) : (
        <>
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
        </>
      )}
      <p className="mt-2.5 text-center text-[10px] text-(--text-secondary)">
        {isFull
          ? `Les ${match.maxPlayers} places sont prises.`
          : `Encore ${spotsRemaining} place${spotsRemaining > 1 ? "s" : ""} disponible${spotsRemaining > 1 ? "s" : ""}`}
      </p>
      {canCancel &&
        (!match.status || match.status === "scheduled") &&
        onCancelMatch && (
          <button
            className="mt-5 flex min-h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-[3px] border border-(--team-a-red)/40 bg-transparent text-xs font-semibold text-(--team-a-red) hover:bg-(--team-a-red)/5"
            onClick={() => {
              if (
                window.confirm(
                  "Annuler ce match et prévenir les joueurs inscrits ?",
                )
              ) {
                onCancelMatch();
              }
            }}
            type="button"
          >
            Annuler le match
          </button>
        )}
    </>
  );
}
