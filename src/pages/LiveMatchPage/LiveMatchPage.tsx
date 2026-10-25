import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
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
import { useOutletContext, useSearchParams } from "react-router-dom";
import { Drawer } from "../../components/Drawer/Drawer";
import { renderLiveMatchComposition } from "../../components/LiveMatchComposition/renderLiveMatchComposition";
import { OrganizationRequired } from "../../components/OrganizationRequired/OrganizationRequired";
import { useDrawerTransition } from "../../hooks/useDrawerTransition/useDrawerTransition";
import type { MatchGoal, MatchSlot } from "../../types";
import type { WorkspaceRouteContext } from "../WorkspaceLayout/WorkspaceRouteContext";
import "./LiveMatchPage.css";

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

function useDialogAccessibility(
  open: boolean,
  dialogRef: RefObject<HTMLElement | null>,
  triggerRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;

    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const returnFocusTarget = triggerRef.current ?? previousFocus;
    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const getFocusableElements = () =>
      Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
    const focusWithoutScrolling = (element: HTMLElement) =>
      element.focus({ preventScroll: true });

    const focusTimer = window.setTimeout(() => {
      focusWithoutScrolling(getFocusableElements()[0] ?? dialog);
    }, 40);

    const keepFocusInside = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const focusableElements = getFocusableElements();
      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      if (!first || !last) {
        event.preventDefault();
        focusWithoutScrolling(dialog);
      } else if (
        event.shiftKey &&
        (document.activeElement === first ||
          !dialog.contains(document.activeElement))
      ) {
        event.preventDefault();
        focusWithoutScrolling(last);
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !dialog.contains(document.activeElement))
      ) {
        event.preventDefault();
        focusWithoutScrolling(first);
      }
    };

    document.addEventListener("keydown", keepFocusInside, true);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", keepFocusInside, true);
      if (returnFocusTarget?.isConnected)
        focusWithoutScrolling(returnFocusTarget);
    };
  }, [dialogRef, open, triggerRef]);
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
      (match.status !== "finished" &&
        match.attendees.length >= match.maxPlayers),
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
  const [swapPickerOpen, setSwapPickerOpen] = useState(false);
  const [compositionOpen, setCompositionOpen] = useState(false);
  const [compositionMounted, setCompositionMounted] = useState(false);
  const [redPlayerToSwap, setRedPlayerToSwap] = useState("");
  const [bluePlayerToSwap, setBluePlayerToSwap] = useState("");
  const [confirmFinish, setConfirmFinish] = useState(false);
  const goalDrawer = useDrawerTransition(goalPickerOpen);
  const swapDrawer = useDrawerTransition(swapPickerOpen);
  const finishDrawer = useDrawerTransition(confirmFinish);
  const compositionDialogRef = useRef<HTMLElement | null>(null);
  const goalDialogRef = useRef<HTMLElement | null>(null);
  const swapDialogRef = useRef<HTMLElement | null>(null);
  const finishDialogRef = useRef<HTMLElement | null>(null);
  const compositionTriggerRef = useRef<HTMLButtonElement | null>(null);
  const goalTriggerRef = useRef<HTMLButtonElement | null>(null);
  const swapTriggerRef = useRef<HTMLButtonElement | null>(null);
  const finishTriggerRef = useRef<HTMLButtonElement | null>(null);
  const compositionCloseTimerRef = useRef<number | null>(null);

  const openComposition = useCallback(() => {
    if (compositionCloseTimerRef.current !== null) {
      window.clearTimeout(compositionCloseTimerRef.current);
      compositionCloseTimerRef.current = null;
    }
    setCompositionMounted(true);
    requestAnimationFrame(() => setCompositionOpen(true));
  }, []);

  const closeComposition = useCallback(() => {
    setCompositionOpen(false);
    if (compositionCloseTimerRef.current !== null) {
      window.clearTimeout(compositionCloseTimerRef.current);
    }
    compositionCloseTimerRef.current = window.setTimeout(() => {
      setCompositionMounted(false);
      compositionCloseTimerRef.current = null;
    }, 300);
  }, []);

  useDialogAccessibility(
    compositionOpen,
    compositionDialogRef,
    compositionTriggerRef,
  );
  useDialogAccessibility(goalDrawer.open, goalDialogRef, goalTriggerRef);
  useDialogAccessibility(swapDrawer.open, swapDialogRef, swapTriggerRef);
  useDialogAccessibility(finishDrawer.open, finishDialogRef, finishTriggerRef);

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

  useEffect(
    () => () => {
      if (compositionCloseTimerRef.current !== null) {
        window.clearTimeout(compositionCloseTimerRef.current);
      }
    },
    [],
  );

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

  function confirmTeamSwap() {
    if (!canRecordActions || !redPlayerToSwap || !bluePlayerToSwap) return;
    context?.onSwapPlayers(match.id, redPlayerToSwap, bluePlayerToSwap);
    setRedPlayerToSwap("");
    setBluePlayerToSwap("");
    setSwapPickerOpen(false);
  }

  function cancelTeamSwap() {
    setRedPlayerToSwap("");
    setBluePlayerToSwap("");
    setSwapPickerOpen(false);
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
              onClick={openComposition}
              ref={compositionTriggerRef}
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
              ref={finishTriggerRef}
              type="button"
            >
              <Flag aria-hidden="true" size={14} /> Siffler la fin
            </button>
          </div>
        )}
      </header>

      {isFinished && (
        <h2 className="mb-0 mt-6 text-lg font-bold">Résumé du match</h2>
      )}

      <Drawer
        mounted={finishDrawer.mounted}
        open={finishDrawer.open}
        onClose={() => setConfirmFinish(false)}
        labelledBy="finish-match-title"
        panelClassName="live-match-action-drawer"
        backdropClassName="z-50"
        dialogRole="alertdialog"
        panelRef={finishDialogRef}
      >
        <div className="live-match-action-drawer__content">
          <h2 className="drawer-title m-0" id="finish-match-title">
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
        </div>
      </Drawer>

      <Drawer
        mounted={goalDrawer.mounted}
        open={goalDrawer.open}
        onClose={() => setGoalPickerOpen(false)}
        labelledBy="goal-scorer-title"
        panelClassName="live-match-action-drawer live-match-action-drawer--wide"
        backdropClassName="z-50"
        panelRef={goalDialogRef}
      >
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-(--line) pb-4">
          <div>
            <p className="drawer-eyebrow mb-1">NOUVEAU BUT</p>
            <h2 className="drawer-title m-0" id="goal-scorer-title">
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
          {([1, 0] as const).map((team) => {
            const teamPlayers = teams[team];
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
      </Drawer>

      <Drawer
        mounted={swapDrawer.mounted}
        open={swapDrawer.open}
        onClose={cancelTeamSwap}
        labelledBy="swap-players-title"
        panelClassName="live-match-action-drawer live-match-action-drawer--wide"
        backdropClassName="z-50"
        panelRef={swapDialogRef}
      >
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-(--line) pb-4">
          <div>
            <p className="drawer-eyebrow mb-1">CHANGEMENT D’ÉQUIPE</p>
            <h2 className="drawer-title m-0" id="swap-players-title">
              Quels joueurs échanger ?
            </h2>
          </div>
          <button
            aria-label="Annuler l’échange des joueurs"
            className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-md border border-(--line) bg-(--bg-main) text-(--text-secondary)"
            onClick={cancelTeamSwap}
            type="button"
          >
            <X aria-hidden="true" size={16} />
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label
            className="block text-xs text-(--team-b-blue)"
            htmlFor="swap-blue-player"
          >
            Joueur de l’équipe bleue
            <select
              className="mt-1 min-h-12 w-full rounded-md border border-(--line) bg-(--bg-main) px-3 text-base text-(--text-primary)"
              id="swap-blue-player"
              onChange={(event) => setBluePlayerToSwap(event.target.value)}
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
          <label
            className="block text-xs text-(--team-a-red)"
            htmlFor="swap-red-player"
          >
            Joueur de l’équipe rouge
            <select
              className="mt-1 min-h-12 w-full rounded-md border border-(--line) bg-(--bg-main) px-3 text-base text-(--text-primary)"
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
        </div>
        <button
          className="mt-4 inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-(--line) bg-(--bg-elevated) text-sm font-bold text-(--text-primary) disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!redPlayerToSwap || !bluePlayerToSwap}
          onClick={confirmTeamSwap}
          type="button"
        >
          <ArrowRightLeft aria-hidden="true" size={16} />
          Échanger les joueurs
        </button>
      </Drawer>

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

      {isScheduled && compositionMounted && (
        <Drawer
          mounted={compositionMounted}
          open={compositionOpen}
          onClose={closeComposition}
          labelledBy="match-composition-title"
          panelId="match-composition-drawer"
          panelRef={compositionDialogRef}
          backdropClassName="z-50 overflow-hidden"
          panelClassName="h-full w-full max-w-180 overflow-y-auto border-l border-(--line) bg-(--bg-main) p-8 text-(--text-primary) shadow-[-18px_0_48px_#0005] max-[600px]:max-w-full max-[600px]:border-l-0 max-[600px]:p-5"
        >
          {renderLiveMatchComposition({
            teams,
            playerNames: context.playerNames,
            onClose: closeComposition,
          })}
        </Drawer>
      )}

      <div className="mt-3 flex items-center justify-between text-[10px] text-(--text-secondary)">
        <span>{match.attendees.length} joueurs confirmés</span>
        <span>
          {score[0] + score[1]} but{score[0] + score[1] === 1 ? "" : "s"}
        </span>
      </div>

      <div
        className={`mt-3 grid items-start gap-4 lg:items-stretch ${isFinished ? "grid-cols-1" : "lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.85fr)]"}`}
      >
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
                {isFinished ? "Buteurs" : "Buts & événements"}
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

        {!isFinished && (
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
                ref={goalTriggerRef}
                type="button"
              >
                <Goal aria-hidden="true" size={20} /> But !
              </button>
            </div>

            <div className="border-b border-(--line) py-3">
              <button
                aria-expanded={swapPickerOpen}
                aria-controls="swap-players-picker"
                className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 border-0 bg-transparent p-0 text-left text-xs font-bold text-(--text-secondary)"
                disabled={!canRecordActions}
                onClick={() => {
                  setRedPlayerToSwap("");
                  setBluePlayerToSwap("");
                  setSwapPickerOpen(true);
                }}
                ref={swapTriggerRef}
                type="button"
              >
                Échanger deux joueurs
                <ArrowRightLeft aria-hidden="true" size={16} />
              </button>
            </div>

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
        )}
      </div>
    </section>
  );
}
