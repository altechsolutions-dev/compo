import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowRightLeft,
  CalendarDays,
  CircleDot,
  Flag,
  Goal,
  MapPin,
  MinusCircle,
  Pause,
  Play,
} from "lucide-react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { OrganizationRequired } from "../../components/OrganizationRequired/OrganizationRequired";
import type { MatchGoal, MatchSlot } from "../../types";
import type { WorkspaceRouteContext } from "../WorkspaceLayout/WorkspaceRouteContext";

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getElapsedSeconds(startedAt?: string) {
  return startedAt
    ? Math.max(
        0,
        Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000),
      )
    : 0;
}

function getMatchElapsedSeconds(
  status: MatchSlot["status"],
  elapsedSeconds: number,
  startedAt?: string,
) {
  if (status !== "in_progress" || !startedAt) return elapsedSeconds;
  return elapsedSeconds + getElapsedSeconds(startedAt);
}

function countGoals(goals: MatchGoal[], team: 0 | 1) {
  return goals.filter((goal) => goal.team === team).length;
}

function matchLabel(match: MatchSlot) {
  return `${match.venue.split("·")[0].trim()} · ${match.time}`;
}

export function LiveMatchPage({
  contextOverride,
}: {
  contextOverride?: WorkspaceRouteContext;
} = {}) {
  const routeContext = useOutletContext<WorkspaceRouteContext | null>();
  const context = contextOverride ?? routeContext;
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedMatchId = searchParams.get("match");
  const liveCandidates = (context?.allMatches ?? []).filter(
    (match) =>
      match.status === "in_progress" ||
      match.status === "paused" ||
      match.attendees.length >= match.maxPlayers ||
      (match.status === "finished" && match.id === requestedMatchId),
  );
  const match =
    liveCandidates.find((item) => item.id === requestedMatchId) ??
    liveCandidates.find(
      (item) => item.status === "in_progress" || item.status === "paused",
    ) ??
    liveCandidates[0];
  const teams: [string[], string[]] =
    match && context
      ? (match.teams ?? context.composeTeams(match.attendees))
      : [[], []];
  const goals = match?.goals ?? [];
  const isLive = match?.status === "in_progress";
  const isPaused = match?.status === "paused";
  const isFinished = match?.status === "finished";
  const isScheduled = !match?.status || match.status === "scheduled";
  const matchElapsedSeconds = match?.elapsedSeconds ?? 0;
  const matchWeekday = match
    ? new Intl.DateTimeFormat("fr-FR", { weekday: "long" }).format(
        new Date(`${match.date}T12:00:00`),
      )
    : "";
  const [elapsedSeconds, setElapsedSeconds] = useState(() =>
    getMatchElapsedSeconds(
      match?.status,
      matchElapsedSeconds,
      match?.startedAt,
    ),
  );
  const [goalTeam, setGoalTeam] = useState<0 | 1>(0);
  const [scorerId, setScorerId] = useState("");
  const [playerToMove, setPlayerToMove] = useState("");

  useEffect(() => {
    const updateClock = () =>
      setElapsedSeconds(
        getMatchElapsedSeconds(
          match?.status,
          matchElapsedSeconds,
          match?.startedAt,
        ),
      );
    updateClock();
    if (!isLive) return;
    const timer = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(timer);
  }, [isLive, matchElapsedSeconds, match?.startedAt, match?.status]);

  if (!context) return null;

  if (context.isLoadingOrganizations) {
    return (
      <section
        className="grid min-h-80 place-items-center text-sm text-(--text-secondary)"
        role="status"
      >
        Chargement de votre club…
      </section>
    );
  }

  if (!context.organizationId && !context.organization.trim()) {
    return <OrganizationRequired onJoinWithCode={context.onJoinWithCode} />;
  }

  if (!match) {
    return (
      <section className="grid min-h-96 place-content-center justify-items-center px-5 text-center">
        <CircleDot className="mb-4 text-(--text-secondary)" size={28} />
        <p className="mb-2 text-[10px] font-bold tracking-[1.5px] text-(--team-b-blue)">
          EN DIRECT
        </p>
        <h1 className="m-0 text-2xl font-bold">Pas de match à l’écran</h1>
        <p className="mb-0 mt-2 max-w-md text-sm text-(--text-secondary)">
          Les matchs complets et les rencontres lancées apparaîtront ici.
        </p>
      </section>
    );
  }

  const score = [countGoals(goals, 0), countGoals(goals, 1)];
  const currentPlayerTeam = teams.findIndex((team) =>
    team.includes(playerToMove),
  );
  const eligibleScorers = teams[goalTeam];

  function selectMatch(matchId: string) {
    setSearchParams({ match: matchId });
  }

  function submitGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isLive || !scorerId) return;
    context?.onRecordGoal(match.id, scorerId);
    setScorerId("");
  }

  function submitTeamChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isLive || !playerToMove) return;
    context?.onSwitchTeam(match.id, playerToMove);
    setPlayerToMove("");
    setScorerId("");
  }

  return (
    <section className="pb-10">
      <header className="flex flex-wrap items-end justify-between gap-6 border-b border-(--line) py-8 sm:py-10">
        <div className="min-w-0">
          <p className="mb-3 flex items-center gap-2 text-[10px] font-bold tracking-[1.5px] text-(--text-secondary)">
            <span
              className={`size-1.5 rounded-full ${isLive ? "bg-(--team-a-red)" : isPaused ? "bg-(--team-b-blue)" : isFinished ? "bg-(--text-secondary)" : "bg-(--status-success)"}`}
            />
            {isLive
              ? "MATCH EN COURS"
              : isPaused
                ? "MATCH EN PAUSE"
                : isFinished
                  ? "MATCH TERMINÉ"
                  : "MATCH À LANCER"}
          </p>
          <h1 className="m-0 overflow-hidden text-ellipsis font-sans text-4xl font-bold leading-tight sm:text-5xl">
            Five du {matchWeekday}
          </h1>
          <p className="mb-0 mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-(--text-secondary)">
            <MapPin aria-hidden="true" size={13} /> {match.venue}
            <span aria-hidden="true">·</span>
            <CalendarDays aria-hidden="true" size={13} />
            {new Intl.DateTimeFormat("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            }).format(new Date(`${match.date}T12:00:00`))}
          </p>
          {liveCandidates.length > 1 && (
            <label className="mt-4 inline-flex items-center gap-2 text-xs text-(--text-secondary)">
              Match affiché
              <select
                className="min-h-9 max-w-72 rounded-md border border-(--line) bg-(--bg-surface) px-2.5 text-xs text-(--text-primary)"
                onChange={(event) => selectMatch(event.target.value)}
                value={match.id}
              >
                {liveCandidates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {matchLabel(candidate)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        {isScheduled && (
          <button
            className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-md border-0 bg-(--team-b-blue) px-4 text-xs font-bold text-(--bg-main) transition hover:brightness-110"
            onClick={() => context.onStartMatch(match.id, teams)}
            type="button"
          >
            <Play aria-hidden="true" fill="currentColor" size={14} />
            Lancer le match
          </button>
        )}
        {(isLive || isPaused) && (
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-(--line) bg-(--bg-elevated) px-4 text-xs font-bold text-(--text-primary) transition hover:brightness-110"
              onClick={() =>
                context.onSetMatchState(match.id, isLive ? "pause" : "resume")
              }
              type="button"
            >
              {isLive ? (
                <Pause aria-hidden="true" fill="currentColor" size={14} />
              ) : (
                <Play aria-hidden="true" fill="currentColor" size={14} />
              )}
              {isLive ? "Mettre en pause" : "Reprendre"}
            </button>
            <button
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-(--team-a-red)/40 bg-(--team-a-red)/10 px-4 text-xs font-bold text-(--team-a-red) transition hover:brightness-110"
              onClick={() => context.onSetMatchState(match.id, "finish")}
              type="button"
            >
              <Flag aria-hidden="true" size={14} /> Siffler la fin
            </button>
          </div>
        )}
      </header>

      {context.matchNotice && (
        <p className="my-3 text-sm text-(--team-a-red)" role="alert">
          {context.matchNotice}
        </p>
      )}

      <section
        aria-label="Score du match"
        className="mt-6 grid min-h-44 grid-cols-[1fr_0.5fr_1fr] overflow-hidden rounded-xl border border-(--line) bg-(--bg-surface) sm:min-h-47"
      >
        <div className="flex min-w-0 flex-col justify-center px-3 py-5 sm:px-8">
          <p className="mb-3 flex items-center gap-2 text-[9px] font-bold tracking-[1px] text-(--text-secondary)">
            <span className="size-1.5 rounded-full bg-(--team-a-red)" /> ÉQUIPE
            ROUGE
          </p>
          <strong className="text-5xl font-bold leading-none tabular-nums text-(--team-a-red) sm:text-6xl">
            {score[0]}
          </strong>
          <p className="mb-0 mt-4 flex flex-wrap gap-x-3 gap-y-1 text-[9px] text-(--text-secondary)">
            {teams[0].map((id) => (
              <span key={id}>{context.playerNames[id] ?? "Joueur"}</span>
            ))}
          </p>
        </div>
        <div className="flex flex-col items-center justify-center border-x border-(--line) px-2 text-center">
          <p className="mb-1 text-[9px] font-bold tracking-[1px] text-(--text-secondary)">
            CHRONO
          </p>
          <time
            aria-label="Temps de jeu"
            className="font-sans text-3xl font-bold tabular-nums text-(--text-primary) sm:text-4xl"
            role="timer"
          >
            {formatClock(elapsedSeconds)}
          </time>
          <p
            className={`mb-0 mt-2 text-[9px] font-bold ${isLive ? "text-(--status-success)" : "text-(--text-secondary)"}`}
          >
            {isLive
              ? "EN JEU"
              : isPaused
                ? "EN PAUSE"
                : isFinished
                  ? "TERMINÉ"
                  : "PRÊT À JOUER"}
          </p>
        </div>
        <div className="flex min-w-0 flex-col items-end justify-center px-3 py-5 text-right sm:px-8">
          <p className="mb-3 flex items-center gap-2 text-[9px] font-bold tracking-[1px] text-(--text-secondary)">
            ÉQUIPE BLEUE{" "}
            <span className="size-1.5 rounded-full bg-(--team-b-blue)" />
          </p>
          <strong className="text-5xl font-bold leading-none tabular-nums text-(--team-b-blue) sm:text-6xl">
            {score[1]}
          </strong>
          <p className="mb-0 mt-4 flex flex-wrap justify-end gap-x-3 gap-y-1 text-[9px] text-(--text-secondary)">
            {teams[1].map((id) => (
              <span key={id}>{context.playerNames[id] ?? "Joueur"}</span>
            ))}
          </p>
        </div>
      </section>

      <div className="mt-3 flex items-center justify-between text-[10px] text-(--text-secondary)">
        <span>{match.attendees.length} joueurs confirmés</span>
        <span>
          {score[0] + score[1]} but{score[0] + score[1] === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mt-3 grid items-start gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.85fr)]">
        <section
          className="order-2 min-h-80 rounded-xl border border-(--line) bg-(--bg-surface) p-5 sm:order-2 sm:p-6 lg:order-1"
          aria-labelledby="match-events-title"
        >
          <div className="flex items-center justify-between border-b border-(--line) pb-4">
            <div>
              <p className="mb-1 text-[9px] font-bold tracking-[1.4px] text-(--text-secondary)">
                FIL DU MATCH
              </p>
              <h2 className="m-0 text-base font-bold" id="match-events-title">
                Buts &amp; événements
              </h2>
            </div>
            <span className="rounded-full bg-(--bg-elevated) px-2.5 py-1 text-[9px] text-(--text-secondary)">
              {goals.length} but{goals.length === 1 ? "" : "s"}
            </span>
          </div>
          {goals.length ? (
            <ol aria-label="Événements du match" className="m-0 list-none p-0">
              {[...goals].reverse().map((goal) => (
                <li
                  className="flex items-center gap-3 border-b border-(--line) py-4"
                  key={goal.id}
                >
                  <span
                    className={`grid size-9 shrink-0 place-items-center rounded-full ${goal.team === 0 ? "bg-(--team-a-red)/10 text-(--team-a-red)" : "bg-(--team-b-blue)/10 text-(--team-b-blue)"}`}
                  >
                    <Goal aria-hidden="true" size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-xs text-(--text-primary)">
                      {context.playerNames[goal.scorerId] ?? "Joueur"}
                    </strong>
                    <span className="text-[10px] text-(--text-secondary)">
                      Équipe {goal.team === 0 ? "rouge" : "bleue"}
                    </span>
                  </span>
                  <time className="font-mono text-xs tabular-nums text-(--text-secondary)">
                    {formatClock(goal.elapsedSeconds)}
                  </time>
                </li>
              ))}
            </ol>
          ) : (
            <div className="grid min-h-56 place-content-center justify-items-center text-center">
              <span className="mb-3 grid size-10 place-items-center rounded-full bg-(--bg-elevated) text-(--text-secondary)">
                <MinusCircle aria-hidden="true" size={17} />
              </span>
              <p className="mb-1 text-xs font-semibold">
                Le match n’a pas encore tremblé
              </p>
              <p className="m-0 max-w-sm text-[10px] text-(--text-secondary)">
                Les buts ajoutés apparaîtront ici avec le nom du buteur.
              </p>
            </div>
          )}
        </section>

        <aside className="order-1 rounded-xl border border-(--line) bg-(--bg-surface) p-5 sm:order-1 sm:p-6 lg:order-2">
          <div className="border-b border-(--line) pb-4">
            <p className="mb-1 text-[9px] font-bold tracking-[1.4px] text-(--text-secondary)">
              TABLE DE MARQUE
            </p>
            <h2 className="m-0 text-base font-bold">Actions rapides</h2>
          </div>

          <form className="border-b border-(--line) py-4" onSubmit={submitGoal}>
            <h3 className="mb-2.5 text-[9px] font-bold tracking-[1px] text-(--text-secondary)">
              AJOUTER UN BUT
            </h3>
            <div
              aria-label="Équipe du buteur"
              className="grid grid-cols-2 rounded-md bg-(--bg-main) p-1"
              role="group"
            >
              {([0, 1] as const).map((team) => (
                <button
                  aria-pressed={goalTeam === team}
                  className={`min-h-8 cursor-pointer rounded border-0 text-[10px] font-bold ${goalTeam === team ? (team === 0 ? "bg-(--team-a-red)/10 text-(--team-a-red)" : "bg-(--team-b-blue)/10 text-(--team-b-blue)") : "bg-transparent text-(--text-secondary)"}`}
                  key={team}
                  onClick={() => {
                    setGoalTeam(team);
                    setScorerId("");
                  }}
                  type="button"
                >
                  {team === 0 ? "Rouge" : "Bleue"}
                </button>
              ))}
            </div>
            <label
              className="mt-3 block text-[9px] text-(--text-secondary)"
              htmlFor="live-goal-scorer"
            >
              Buteur
            </label>
            <select
              className="mt-1 w-full rounded-md border border-(--line) bg-(--bg-main) px-2.5 py-2 text-[10px] text-(--text-primary)"
              disabled={!isLive}
              id="live-goal-scorer"
              onChange={(event) => setScorerId(event.target.value)}
              value={scorerId}
            >
              <option value="">Choisir un joueur</option>
              {eligibleScorers.map((id) => (
                <option key={id} value={id}>
                  {context.playerNames[id] ?? "Joueur"}
                </option>
              ))}
            </select>
            <button
              className="mt-2.5 inline-flex min-h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-md border-0 bg-(--team-b-blue) text-[10px] font-bold text-(--bg-main) disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!isLive || !scorerId}
              type="submit"
            >
              <Goal aria-hidden="true" size={14} /> Valider le but
            </button>
          </form>

          <form className="pt-4" onSubmit={submitTeamChange}>
            <h3 className="mb-2.5 text-[9px] font-bold tracking-[1px] text-(--text-secondary)">
              CHANGER UN JOUEUR D’ÉQUIPE
            </h3>
            <label
              className="block text-[9px] text-(--text-secondary)"
              htmlFor="team-change-player"
            >
              Joueur
            </label>
            <select
              className="mt-1 w-full rounded-md border border-(--line) bg-(--bg-main) px-2.5 py-2 text-[10px] text-(--text-primary)"
              disabled={!isLive}
              id="team-change-player"
              onChange={(event) => setPlayerToMove(event.target.value)}
              value={playerToMove}
            >
              <option value="">Choisir un joueur</option>
              {[...teams[0], ...teams[1]].map((id) => (
                <option key={id} value={id}>
                  {context.playerNames[id] ?? "Joueur"}
                </option>
              ))}
            </select>
            <button
              className="mt-2.5 inline-flex min-h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-(--line) bg-(--bg-elevated) text-[10px] font-bold text-(--text-primary) disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!isLive || currentPlayerTeam < 0}
              type="submit"
            >
              <ArrowRightLeft aria-hidden="true" size={14} /> Changer d’équipe
            </button>
          </form>

          {!isLive && (
            <p className="mb-0 mt-3 text-center text-[9px] text-(--text-secondary)">
              {isPaused
                ? "Reprenez le match pour enregistrer des actions."
                : isFinished
                  ? "Le match est terminé, les actions sont désactivées."
                  : "Les actions seront disponibles au coup d’envoi."}
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}
