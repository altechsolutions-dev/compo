import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowRightLeft,
  CalendarDays,
  CircleDot,
  Eye,
  Flag,
  Goal,
  MapPin,
  MinusCircle,
  Pause,
  Play,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
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
  const canRecordActions = isLive || isPaused;
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
  const [goalPickerOpen, setGoalPickerOpen] = useState(false);
  const [compositionOpen, setCompositionOpen] = useState(false);
  const [redPlayerToSwap, setRedPlayerToSwap] = useState("");
  const [bluePlayerToSwap, setBluePlayerToSwap] = useState("");
  const [confirmFinish, setConfirmFinish] = useState(false);

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

  useEffect(() => {
    if (!compositionOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCompositionOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [compositionOpen]);

  useEffect(() => {
    if (!goalPickerOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setGoalPickerOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [goalPickerOpen]);

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
  function selectMatch(matchId: string) {
    setSearchParams({ match: matchId });
  }

  function recordGoal(scorerId: string) {
    if (!canRecordActions) return;
    context?.onRecordGoal(match.id, scorerId);
    setGoalPickerOpen(false);
  }

  function submitTeamChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canRecordActions || !redPlayerToSwap || !bluePlayerToSwap) return;
    context?.onSwapPlayers(match.id, redPlayerToSwap, bluePlayerToSwap);
    setRedPlayerToSwap("");
    setBluePlayerToSwap("");
    setGoalPickerOpen(false);
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
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              aria-expanded={compositionOpen}
              aria-controls="match-composition-drawer"
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-(--line) bg-(--bg-elevated) px-4 text-xs font-bold text-(--text-primary) transition hover:brightness-110"
              onClick={() => setCompositionOpen(true)}
              type="button"
            >
              <Eye aria-hidden="true" size={15} /> Voir la compo
            </button>
            <button
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border-0 bg-(--team-b-blue) px-4 text-xs font-bold text-(--bg-main) transition hover:brightness-110"
              onClick={() => context.onStartMatch(match.id, teams)}
              type="button"
            >
              <Play aria-hidden="true" fill="currentColor" size={14} />
              Lancer le match
            </button>
          </div>
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
              onClick={() => setConfirmFinish(true)}
              type="button"
            >
              <Flag aria-hidden="true" size={14} /> Siffler la fin
            </button>
          </div>
        )}
      </header>

      {confirmFinish &&
        createPortal(
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-0 sm:p-5"
            onClick={() => setConfirmFinish(false)}
            role="presentation"
          >
            <section
              aria-labelledby="finish-match-title"
              aria-modal="true"
              className="w-full rounded-none border-x-0 border-y border-(--line) bg-(--bg-surface) p-5 shadow-xl sm:max-w-sm sm:rounded-lg sm:border-x"
              onClick={(event) => event.stopPropagation()}
              role="alertdialog"
            >
              <h2 className="m-0 text-lg font-bold" id="finish-match-title">
                Siffler la fin du match ?
              </h2>
              <p className="mb-0 mt-2 text-sm text-(--text-secondary)">
                Le chrono sera arrêté et les actions de jeu désactivées.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  className="min-h-12 cursor-pointer rounded-md border border-(--line) bg-(--bg-elevated) px-3 text-sm font-bold text-(--text-primary)"
                  onClick={() => setConfirmFinish(false)}
                  type="button"
                >
                  Continuer le match
                </button>
                <button
                  className="min-h-12 cursor-pointer rounded-md border-0 bg-(--team-a-red) px-3 text-sm font-bold text-(--bg-main)"
                  onClick={() => {
                    context.onSetMatchState(match.id, "finish");
                    setConfirmFinish(false);
                  }}
                  type="button"
                >
                  Confirmer la fin
                </button>
              </div>
            </section>
          </div>,
          document.body,
        )}

      {goalPickerOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 p-0 sm:p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget)
                setGoalPickerOpen(false);
            }}
            role="presentation"
          >
            <section
              aria-labelledby="goal-scorer-title"
              aria-modal="true"
              className="my-auto w-full rounded-none border-x-0 border-y border-(--line) bg-(--bg-surface) p-4 text-(--text-primary) shadow-xl sm:max-w-xl sm:rounded-lg sm:border-x sm:p-6"
              id="goal-scorer-picker"
              onMouseDown={(event) => event.stopPropagation()}
              role="dialog"
            >
              <div className="mb-4 flex items-center justify-between gap-3 border-b border-(--line) pb-4">
                <div>
                  <p className="mb-1 text-[9px] font-bold tracking-[1.4px] text-(--text-secondary)">
                    NOUVEAU BUT
                  </p>
                  <h2
                    className="m-0 text-base font-bold"
                    id="goal-scorer-title"
                  >
                    Qui a marqué ?
                  </h2>
                </div>
                <button
                  aria-label="Annuler la saisie du but"
                  className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-md border border-(--line) bg-(--bg-main) text-(--text-secondary)"
                  onClick={() => setGoalPickerOpen(false)}
                  type="button"
                >
                  <X aria-hidden="true" size={16} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {teams.map((teamPlayers, teamIndex) => {
                  const team = teamIndex as 0 | 1;
                  const isRedTeam = team === 0;
                  return (
                    <section
                      aria-label={`Équipe ${isRedTeam ? "rouge" : "bleue"}`}
                      className={`min-w-0 rounded-md border p-2 sm:p-3 ${isRedTeam ? "border-(--team-a-red)/25 bg-(--team-a-red)/5" : "border-(--team-b-blue)/25 bg-(--team-b-blue)/5"}`}
                      key={team}
                    >
                      <h3
                        className={`mb-2 mt-0 text-center text-[10px] font-bold uppercase ${isRedTeam ? "text-(--team-a-red)" : "text-(--team-b-blue)"}`}
                      >
                        {isRedTeam ? "Rouge" : "Bleue"}
                      </h3>
                      <div className="grid gap-1.5">
                        {teamPlayers.map((id) => (
                          <button
                            className={`min-h-12 cursor-pointer rounded border px-2 text-left text-xs font-semibold leading-tight transition ${isRedTeam ? "border-(--team-a-red)/30 bg-(--bg-main) text-(--text-primary) hover:bg-(--team-a-red)/15" : "border-(--team-b-blue)/30 bg-(--bg-main) text-(--text-primary) hover:bg-(--team-b-blue)/15"}`}
                            key={id}
                            onClick={() => recordGoal(id)}
                            type="button"
                          >
                            <span className="block truncate">
                              {context.playerNames[id] ?? "Joueur"}
                            </span>
                          </button>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            </section>
          </div>,
          document.body,
        )}

      {context.matchNotice && (
        <p className="my-3 text-sm text-(--team-a-red)" role="alert">
          {context.matchNotice}
        </p>
      )}

      <section
        aria-label="Score du match"
        className="mt-6 grid min-h-44 grid-cols-[1fr_0.5fr_1fr] overflow-hidden rounded-xl border border-(--line) bg-(--bg-surface) sm:min-h-47"
      >
        <div className="flex min-w-0 flex-col justify-center bg-linear-to-r from-(--team-b-blue)/15 to-transparent px-3 py-5 sm:px-8">
          <p className="mb-3 flex items-center gap-2 text-[9px] font-bold tracking-[1px] text-(--text-secondary)">
            <span className="size-1.5 rounded-full bg-(--team-b-blue)" /> ÉQUIPE
            BLEUE
          </p>
          <strong className="text-5xl font-bold leading-none tabular-nums text-(--team-b-blue) sm:text-6xl">
            {score[1]}
          </strong>
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
        <div className="flex min-w-0 flex-col items-end justify-center bg-linear-to-l from-(--team-a-red)/15 to-transparent px-3 py-5 text-right sm:px-8">
          <p className="mb-3 flex items-center gap-2 text-[9px] font-bold tracking-[1px] text-(--text-secondary)">
            ÉQUIPE ROUGE{" "}
            <span className="size-1.5 rounded-full bg-(--team-a-red)" />
          </p>
          <strong className="text-5xl font-bold leading-none tabular-nums text-(--team-a-red) sm:text-6xl">
            {score[0]}
          </strong>
        </div>
      </section>

      {isScheduled &&
        createPortal(
          <div
            aria-hidden={!compositionOpen}
            className={`fixed inset-0 z-50 flex justify-end overflow-hidden bg-black/70 transition-opacity duration-300 ease-out motion-reduce:transition-none ${compositionOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
            inert={!compositionOpen}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget)
                setCompositionOpen(false);
            }}
            role="presentation"
          >
            <aside
              aria-labelledby="match-composition-title"
              aria-modal="true"
              className={`h-full w-full max-w-140 overflow-y-auto border-l border-(--line) bg-(--bg-main) p-5 text-(--text-primary) shadow-[-18px_0_48px_#0005] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] max-[600px]:max-w-full max-[600px]:border-l-0 motion-reduce:transition-none sm:p-8 ${compositionOpen ? "translate-x-0" : "translate-x-full"}`}
              id="match-composition-drawer"
              onMouseDown={(event) => event.stopPropagation()}
              role="dialog"
            >
              <div className="mb-7 flex items-center justify-between gap-4 border-b border-(--line) pb-4">
                <div>
                  <p className="mb-1 text-[9px] font-bold tracking-[1.5px] text-(--text-secondary)">
                    AVANT LE COUP D’ENVOI
                  </p>
                  <h2
                    className="m-0 text-xl font-bold"
                    id="match-composition-title"
                  >
                    Composition du match
                  </h2>
                </div>
                <button
                  aria-label="Fermer la composition"
                  className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-md border border-(--line) bg-(--bg-surface) text-(--text-primary)"
                  onClick={() => setCompositionOpen(false)}
                  type="button"
                >
                  <X aria-hidden="true" size={18} />
                </button>
              </div>
              <div className="grid gap-4">
                {teams.map((teamPlayers, teamIndex) => {
                  const isRedTeam = teamIndex === 0;
                  return (
                    <section
                      aria-label={`Équipe ${isRedTeam ? "rouge" : "bleue"}`}
                      className={`rounded-md border p-4 ${isRedTeam ? "border-(--team-a-red)/25 bg-(--team-a-red)/5" : "border-(--team-b-blue)/25 bg-(--team-b-blue)/5"}`}
                      key={teamIndex}
                    >
                      <h3
                        className={`mb-3 mt-0 text-sm font-bold uppercase ${isRedTeam ? "text-(--team-a-red)" : "text-(--team-b-blue)"}`}
                      >
                        Équipe {isRedTeam ? "rouge" : "bleue"}
                      </h3>
                      <ul className="m-0 grid list-none gap-1 p-0 text-sm text-(--text-primary)">
                        {teamPlayers.map((id) => (
                          <li
                            className="border-t border-(--line) py-3"
                            key={id}
                          >
                            {context.playerNames[id] ?? "Joueur"}
                          </li>
                        ))}
                      </ul>
                    </section>
                  );
                })}
              </div>
            </aside>
          </div>,
          document.body,
        )}

      <div className="mt-3 flex items-center justify-between text-[10px] text-(--text-secondary)">
        <span>{match.attendees.length} joueurs confirmés</span>
        <span>
          {score[0] + score[1]} but{score[0] + score[1] === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mt-3 grid items-start gap-4 lg:items-stretch lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.85fr)]">
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

          <div className="border-b border-(--line) py-4">
            <button
              aria-expanded={goalPickerOpen}
              aria-controls="goal-scorer-picker"
              className="inline-flex min-h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-md border-0 bg-(--team-b-blue) px-3 text-base font-extrabold text-(--bg-main) disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!canRecordActions}
              onClick={() => setGoalPickerOpen(true)}
              type="button"
            >
              <Goal aria-hidden="true" size={20} /> But !
            </button>
          </div>

          <details className="group border-b border-(--line) py-3">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-xs font-bold text-(--text-secondary) [&::-webkit-details-marker]:hidden">
              Échanger deux joueurs
              <ArrowRightLeft aria-hidden="true" size={16} />
            </summary>
            <form className="pt-2" onSubmit={submitTeamChange}>
              <div className="grid gap-3 sm:grid-cols-2">
                <label
                  className="block text-xs text-(--team-a-red)"
                  htmlFor="swap-red-player"
                >
                  Joueur de l’équipe rouge
                  <select
                    className="mt-1 min-h-12 w-full rounded-md border border-(--line) bg-(--bg-main) px-3 text-base text-(--text-primary)"
                    disabled={!canRecordActions}
                    id="swap-red-player"
                    onChange={(event) => setRedPlayerToSwap(event.target.value)}
                    value={redPlayerToSwap}
                  >
                    <option value="">Choisir un joueur rouge</option>
                    {teams[0].map((id) => (
                      <option key={id} value={id}>
                        {context.playerNames[id] ?? "Joueur"}
                      </option>
                    ))}
                  </select>
                </label>
                <label
                  className="block text-xs text-(--team-b-blue)"
                  htmlFor="swap-blue-player"
                >
                  Joueur de l’équipe bleue
                  <select
                    className="mt-1 min-h-12 w-full rounded-md border border-(--line) bg-(--bg-main) px-3 text-base text-(--text-primary)"
                    disabled={!canRecordActions}
                    id="swap-blue-player"
                    onChange={(event) =>
                      setBluePlayerToSwap(event.target.value)
                    }
                    value={bluePlayerToSwap}
                  >
                    <option value="">Choisir un joueur bleu</option>
                    {teams[1].map((id) => (
                      <option key={id} value={id}>
                        {context.playerNames[id] ?? "Joueur"}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <button
                className="mt-2 inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-(--line) bg-(--bg-elevated) text-sm font-bold text-(--text-primary) disabled:cursor-not-allowed disabled:opacity-40"
                disabled={
                  !canRecordActions || !redPlayerToSwap || !bluePlayerToSwap
                }
                type="submit"
              >
                Échanger les joueurs
              </button>
            </form>
          </details>

          {!canRecordActions && (
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
