import { Fragment, type ReactNode } from "react";
import {
  ArrowRight,
  Check,
  Link2,
  MapPin,
  Trophy,
  X,
} from "lucide-react";
import type {
  GuestMatchVoteLink,
  MatchManOfTheMatchPoll,
  MatchSlot,
} from "../../types";
import { formatMatchDate } from "../../helpers/formatMatchDate/formatMatchDate";
import { matchVoteLeader } from "../../lib/matchVoteLeader/matchVoteLeader";
import { LiveMatchPanel } from "../LiveMatchPanel/LiveMatchPanel";
import { MatchGoalTimeline } from "../MatchGoalTimeline/MatchGoalTimeline";
import { MatchGoalTotals } from "../MatchGoalTotals/MatchGoalTotals";
import { MatchScoreboard } from "../MatchScoreboard/MatchScoreboard";
import { MatchAwardVotes } from "../MatchAwardVotes/MatchAwardVotes";
import { MatchVoteCandidates, MatchVoteWinners } from "./MatchVoteCandidates";
import { MatchTeamComposition } from "./MatchTeamComposition";
import { BestScorerIcons } from "./BestScorerIcons";
import { MatchShareButton } from "./MatchShareButton";
import { GuestVoteLinksList } from "./GuestVoteLinksList";
import "./MatchDetails.css";

export type MatchDetailsContentOptions = {
  match: MatchSlot;
  isFull: boolean;
  isRegistered: boolean;
  isRegistering: boolean;
  currentAttendeeId?: string;
  teams?: [string[], string[]];
  playerNames: Record<string, string>;
  onClose: () => void;
  onRegister: () => void;
  canManageAttendees?: boolean;
  onRemoveAttendee?: (attendeeId: string) => void;
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
  guestVoteLinks?: GuestMatchVoteLink[];
  guestVoteLinksError?: string;
  canManageGuestVoteLinks?: boolean;
  onGenerateGuestVoteLinks?: () => void;
};

export function renderMatchDetailsContent({
  match,
  isFull,
  isRegistered,
  isRegistering,
  currentAttendeeId,
  teams,
  playerNames,
  onClose,
  onRegister,
  canManageAttendees = false,
  onRemoveAttendee,
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
  guestVoteLinks = [],
  guestVoteLinksError = "",
  canManageGuestVoteLinks = false,
  onGenerateGuestVoteLinks,
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
    const votingCandidates = match.attendees;
    const provisionalLeader = manOfTheMatchPoll && !manOfTheMatchPoll.isComplete
      ? matchVoteLeader(manOfTheMatchPoll.voteTotals)
      : null;

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
          <MatchAwardVotes
            key={match.id}
            matchId={match.id}
            candidates={votingCandidates}
            teams={matchTeams}
            playerNames={playerNames}
            enabled={isRegistered}
            actions={canManageGuestVoteLinks &&
              Object.keys(match.attendeeNames ?? {}).length > 0 && (
                <div className="flex min-w-0 shrink items-center justify-end">
                  {guestVoteLinks.length > 0 ? (
                    <GuestVoteLinksList links={guestVoteLinks} />
                  ) : !guestVoteLinksError ? (
                    <span
                      className="text-xs text-(--text-secondary)"
                      role="status"
                    >
                      Préparation du lien…
                    </span>
                  ) : (
                    <button
                      aria-label="Réessayer la création du lien invité"
                      className="grid size-8 cursor-pointer place-items-center border border-(--line) bg-(--bg-surface) text-(--text-secondary) hover:bg-(--bg-elevated)"
                      onClick={onGenerateGuestVoteLinks}
                      title="Réessayer"
                      type="button"
                    >
                      <Link2 aria-hidden="true" size={15} />
                    </button>
                  )}
                </div>
              )}
          >
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-(--team-b-blue)/15 text-(--team-b-blue)">
                <Trophy aria-hidden="true" size={21} />
              </span>
              <h3 className="m-0 text-lg font-bold text-(--text-primary)">
                Homme du match
              </h3>
            </div>
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
                <MatchVoteWinners
                  winnerIds={manOfTheMatchPoll.winnerIds}
                  teams={matchTeams}
                  playerNames={playerNames}
                />
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
                {provisionalLeader && (
                  <p className="mb-4 text-sm font-semibold text-(--text-primary)">
                    En tête provisoirement : {playerNames[provisionalLeader] ?? "Joueur"}
                  </p>
                )}
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
                <MatchVoteCandidates
                  candidates={votingCandidates}
                  teams={matchTeams}
                  playerNames={playerNames}
                  voteTotals={manOfTheMatchPoll.voteTotals}
                  myVote={manOfTheMatchPoll.myVote}
                  saving={manOfTheMatchVoteSaving}
                  onVote={onVoteForManOfTheMatch}
                />
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
          </MatchAwardVotes>

          {canManageGuestVoteLinks &&
            Object.keys(match.attendeeNames ?? {}).length > 0 && (
              <section
                aria-label="Vote des invités"
                className="mt-6 border-t border-(--line) pt-5"
              >
                {guestVoteLinksError && (
                  <p
                    className="mb-0 mt-3 text-xs text-(--team-a-red)"
                    role="alert"
                  >
                    {guestVoteLinksError}
                  </p>
                )}
              </section>
            )}

          <section
            aria-labelledby="best-scorer-title"
            className="mt-6 flex items-start gap-3"
          >
            <BestScorerIcons scorerIds={bestScorerIds} teams={matchTeams} />
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
          <MatchGoalTotals
            className="mt-0 pt-1 lg:order-2"
            goals={goals}
            playerIds={match.attendees}
            playerNames={playerNames}
            teams={matchTeams}
          />

          <section
            className="pt-1 lg:order-1"
            aria-labelledby="finished-scorers-title"
          >
            <h3
              className="mb-4 text-sm font-bold text-(--text-primary)"
              id="finished-scorers-title"
            >
              Fil du match
            </h3>
            <MatchGoalTimeline goals={goals} playerNames={playerNames} />
          </section>
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

      {canManageAttendees &&
        onRemoveAttendee &&
        (!match.status || match.status === "scheduled") && (
          <section
            aria-label="Gestion des joueurs inscrits"
            className="mt-4 border-t border-(--line) pt-3"
          >
            <ul className="m-0 grid list-none gap-1 p-0">
              {match.attendees.map((attendeeId) => {
                const name =
                  match.attendeeNames?.[attendeeId] ??
                  playerNames[attendeeId] ??
                  "Joueur";
                return (
                  <li
                    className="flex min-h-9 items-center justify-between gap-2 border-b border-(--line) py-1.5 text-xs text-(--text-primary) last:border-b-0"
                    key={attendeeId}
                  >
                    <span className="min-w-0 max-w-[75%] truncate">{name}</span>
                    <button
                      aria-label={`Retirer ${name} du match`}
                      className="shrink-0 cursor-pointer border border-(--team-a-red)/30 bg-transparent px-2 py-1 text-[10px] font-semibold text-(--team-a-red) hover:bg-(--team-a-red)/5 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isRegistering}
                      onClick={() => onRemoveAttendee(attendeeId)}
                      type="button"
                    >
                      Retirer
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

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
      {isRegistered &&
        !canManageAttendees &&
        onRemoveAttendee &&
        (!match.status || match.status === "scheduled") && (
          <button
            className="mt-2 flex min-h-9 w-full cursor-pointer items-center justify-center rounded-[3px] border border-(--line) bg-transparent text-xs font-semibold text-(--text-secondary) hover:border-(--team-a-red) hover:text-(--team-a-red) disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isRegistering}
            onClick={() => {
              const attendeeId = match.attendees.find(
                (id) => id === currentAttendeeId,
              );
              if (attendeeId) onRemoveAttendee(attendeeId);
            }}
            type="button"
          >
            Me désister
          </button>
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
