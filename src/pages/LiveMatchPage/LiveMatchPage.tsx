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
  Check,
  CircleDot,
  Eye,
  Flag,
  Goal,
  MapPin,
  MinusCircle,
  Pause,
  Play,
  RotateCcw,
  Undo2,
  X,
} from "lucide-react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { Drawer } from "../../components/Drawer/Drawer";
import { LiveMatchComposition } from "../../components/LiveMatchComposition/renderLiveMatchComposition";
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

const goalUndoWindowSeconds = 10;

function getRemainingGoalUndoSeconds(goal: MatchGoal, now: number) {
  return Math.max(
    0,
    Math.ceil(
      (goalUndoWindowSeconds * 1000 -
        Math.max(0, now - new Date(goal.createdAt).getTime())) /
        1000,
    ),
  );
}

function GoalUndoButton({
  goal,
  matchId,
  playerName,
  remainingSeconds,
  disabled,
  onRemoveGoal,
}: {
  goal: MatchGoal;
  matchId: string;
  playerName: string;
  remainingSeconds: number;
  disabled: boolean;
  onRemoveGoal: (matchId: string, goalId: string) => void;
}) {
  const [elapsedAtMountMs] = useState(() =>
    Math.max(0, Date.now() - new Date(goal.createdAt).getTime()),
  );

  return (
    <button
      aria-label={`Annuler le dernier but de ${playerName}`}
      className="relative isolate inline-flex h-8 shrink-0 cursor-pointer items-center gap-1 overflow-hidden rounded-md border border-(--line) bg-(--bg-elevated) px-1.5 text-[9px] font-semibold text-(--text-secondary) transition-colors hover:border-(--team-a-red) hover:text-(--team-a-red) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--team-a-red) disabled:cursor-not-allowed disabled:opacity-40"
      disabled={disabled}
      onClick={() => onRemoveGoal(matchId, goal.id)}
      title={`Annuler le dernier but de ${playerName} (${remainingSeconds} s)`}
      type="button"
    >
      <span
        aria-hidden="true"
        className="goal-undo-slider pointer-events-none absolute inset-y-0 left-0 -z-10 bg-(--team-a-red)/15"
        style={{ animationDelay: `-${elapsedAtMountMs}ms` }}
      />
      <span className="relative inline-flex items-center gap-1">
        <Undo2 aria-hidden="true" size={13} />
        Annuler
      </span>
    </button>
  );
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

function MatchLaunchList({
  matches,
  context,
}: {
  matches: MatchSlot[];
  context: WorkspaceRouteContext;
}) {
  const [compositionMatchId, setCompositionMatchId] = useState<string | null>(
    null,
  );
  const [compositionOpen, setCompositionOpen] = useState(false);
  const compositionDrawer = useDrawerTransition(compositionOpen);
  const compositionDialogRef = useRef<HTMLElement | null>(null);
  const compositionTriggerRef = useRef<HTMLElement | null>(null);
  const compositionMatch = matches.find(
    (match) => match.id === compositionMatchId,
  );
  const compositionTeams: [string[], string[]] = compositionMatch
    ? (compositionMatch.teams ??
      context.composeTeams(compositionMatch.attendees))
    : [[], []];

  useDialogAccessibility(
    compositionDrawer.open,
    compositionDialogRef,
    compositionTriggerRef,
  );

  function openComposition(match: MatchSlot, trigger: HTMLButtonElement) {
    compositionTriggerRef.current = trigger;
    setCompositionMatchId(match.id);
    setCompositionOpen(true);
  }

  function closeComposition() {
    setCompositionOpen(false);
  }

  return (
    <section className="pb-10">
      <header className="border-b border-(--line) py-8 sm:py-10">
        <p className="mb-3 text-[10px] font-bold tracking-[1.5px] text-(--text-secondary)">
          EN DIRECT
        </p>
        <h1 className="m-0 font-sans text-3xl font-bold leading-tight sm:text-4xl">
          Matchs à lancer
        </h1>
      </header>
      {context.matchNotice && !compositionDrawer.mounted && (
        <p className="my-3 text-sm text-(--team-a-red)" role="alert">
          {context.matchNotice}
        </p>
      )}
      {matches.length === 0 ? (
        <div className="grid min-h-48 place-content-center justify-items-center gap-3 border-b border-(--line) text-center text-(--text-secondary)">
          <CircleDot aria-hidden="true" size={26} />
          <p className="m-0 text-sm">
            Aucun match complet à lancer pour le moment.
          </p>
        </div>
      ) : (
        <ol className="m-0 list-none p-0">
          {matches.map((match) => (
            <li
              className="flex flex-col gap-4 border-b border-(--line) py-5 sm:flex-row sm:items-center sm:justify-between"
              key={match.id}
            >
              <div className="min-w-0">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.7px] text-(--team-b-blue)">
                  {new Intl.DateTimeFormat("fr-FR", {
                    weekday: "short",
                    day: "numeric",
                    month: "long",
                  })
                    .format(new Date(`${match.date}T12:00:00`))
                    .replace(".", "")}
                  <span className="ml-2 font-semibold text-(--text-primary)">
                    {match.time}
                  </span>
                </p>
                <h2 className="m-0 truncate text-lg font-bold">
                  {match.venue}
                </h2>
                <p className="mb-0 mt-1 text-xs text-(--text-secondary)">
                  {match.attendees.length} joueurs
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-(--line) bg-(--bg-elevated) px-3 text-xs font-semibold text-(--text-primary)"
                  onClick={(event) =>
                    openComposition(match, event.currentTarget)
                  }
                  type="button"
                >
                  <Eye aria-hidden="true" size={15} />
                  Voir la compo
                </button>
                <button
                  aria-label={`Lancer le match de ${match.venue}`}
                  className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md bg-(--team-b-blue) px-3 text-xs font-bold text-(--bg-main) transition hover:brightness-110"
                  onClick={() =>
                    context.onStartMatch(
                      match.id,
                      match.teams ?? context.composeTeams(match.attendees),
                    )
                  }
                  type="button"
                >
                  <Play aria-hidden="true" size={14} />
                  Lancer le match
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
      {compositionDrawer.mounted && compositionMatch && (
        <Drawer
          mounted={compositionDrawer.mounted}
          open={compositionDrawer.open}
          onClose={closeComposition}
          labelledBy="match-composition-title"
          panelId="match-composition-drawer"
          panelRef={compositionDialogRef}
          backdropClassName="z-50 overflow-hidden"
          panelClassName="h-full w-full max-w-180 overflow-y-auto border-l border-(--line) bg-(--bg-main) p-8 text-(--text-primary) shadow-[-18px_0_48px_#0005] max-[600px]:max-w-full max-[600px]:border-l-0 max-[600px]:p-5"
        >
          {context.matchNotice && (
            <p className="mb-4 text-sm text-(--team-a-red)" role="alert">
              {context.matchNotice}
            </p>
          )}
          <LiveMatchComposition
            teams={compositionTeams}
            playerNames={context.playerNames}
            onClose={closeComposition}
            isEditable
            onSaveTeams={(nextTeams) =>
              context.onSaveScheduledMatchTeams(compositionMatch.id, nextTeams)
            }
          />
        </Drawer>
      )}
    </section>
  );
}

export function LiveMatchPage({
  contextOverride,
}: {
  contextOverride?: WorkspaceRouteContext;
} = {}) {
  const routeContext = useOutletContext<WorkspaceRouteContext | null>();
  const context = contextOverride ?? routeContext;
  const [searchParams] = useSearchParams();
  const requestedMatchId = searchParams.get("match");
  const liveCandidates = (context?.allMatches ?? []).filter(
    (match) =>
      (match.status === undefined || match.status === "scheduled") &&
      match.attendees.length >= match.maxPlayers,
  );
  const activeMatches = (context?.allMatches ?? []).filter(
    (item) => item.status === "in_progress" || item.status === "paused",
  );
  const match =
    activeMatches.find((item) => item.id === requestedMatchId) ??
    activeMatches[0];
  const teams: [string[], string[]] =
    match && context
      ? (match.teams ?? context.composeTeams(match.attendees))
      : [[], []];
  const goals = match?.goals ?? [];
  const latestMatchGoal = goals[goals.length - 1];
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
  const [undoClock, setUndoClock] = useState(() => Date.now());
  const [swapPickerOpen, setSwapPickerOpen] = useState(false);
  const [compositionOpen, setCompositionOpen] = useState(false);
  const [compositionMounted, setCompositionMounted] = useState(false);
  const [redPlayerToSwap, setRedPlayerToSwap] = useState("");
  const [bluePlayerToSwap, setBluePlayerToSwap] = useState("");
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [isResettingMatch, setIsResettingMatch] = useState(false);
  const swapDrawer = useDrawerTransition(swapPickerOpen);
  const finishDrawer = useDrawerTransition(confirmFinish);
  const resetDrawer = useDrawerTransition(confirmReset);
  const compositionDialogRef = useRef<HTMLElement | null>(null);
  const swapDialogRef = useRef<HTMLElement | null>(null);
  const finishDialogRef = useRef<HTMLElement | null>(null);
  const resetDialogRef = useRef<HTMLElement | null>(null);
  const compositionTriggerRef = useRef<HTMLButtonElement | null>(null);
  const swapTriggerRef = useRef<HTMLButtonElement | null>(null);
  const finishTriggerRef = useRef<HTMLButtonElement | null>(null);
  const resetTriggerRef = useRef<HTMLButtonElement | null>(null);
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
  useDialogAccessibility(swapDrawer.open, swapDialogRef, swapTriggerRef);
  useDialogAccessibility(finishDrawer.open, finishDialogRef, finishTriggerRef);
  useDialogAccessibility(resetDrawer.open, resetDialogRef, resetTriggerRef);

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
    if (!canRecordActions) return;
    const timer = window.setInterval(() => setUndoClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [canRecordActions]);

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
    return <MatchLaunchList matches={liveCandidates} context={context} />;
  }

  const score = [countGoals(goals, 0), countGoals(goals, 1)];
  async function resetCurrentMatch() {
    if (!context) return;
    setIsResettingMatch(true);
    const reset = await context.onResetMatch(match.id);
    setIsResettingMatch(false);
    if (reset) setConfirmReset(false);
  }

  function closeSwapPicker() {
    setRedPlayerToSwap("");
    setBluePlayerToSwap("");
    setSwapPickerOpen(false);
  }

  function selectPlayerToSwap(team: 0 | 1, playerId: string) {
    if (!context || !canRecordActions) return;

    const redPlayerId = team === 0 ? playerId : redPlayerToSwap;
    const bluePlayerId = team === 1 ? playerId : bluePlayerToSwap;
    if (team === 0) setRedPlayerToSwap(playerId);
    else setBluePlayerToSwap(playerId);

    if (redPlayerId && bluePlayerId) {
      context.onSwapPlayers(match.id, redPlayerId, bluePlayerId);
      setRedPlayerToSwap("");
      setBluePlayerToSwap("");
      swapDialogRef.current?.focus({ preventScroll: true });
    }
  }

  return (
    <section
      className={
        canRecordActions
          ? "pb-[calc(5rem+env(safe-area-inset-bottom))] sm:pb-10"
          : "pb-10"
      }
    >
      {!canRecordActions && (
        <header className="flex flex-wrap items-end justify-between gap-6 border-b border-(--line) py-8 sm:py-10">
          {!canRecordActions && (
            <div className="min-w-0">
              <p className="mb-3 flex items-center gap-2 text-[10px] font-bold tracking-[1.5px] text-(--text-secondary)">
                <span
                  className={`size-1.5 rounded-full ${isFinished ? "bg-(--text-secondary)" : "bg-(--status-success)"}`}
                />
                {isFinished ? "MATCH TERMINÉ" : "MATCH À LANCER"}
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
            </div>
          )}
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
        </header>
      )}

      {(isLive || isPaused) && (
        <nav
          aria-label="Actions du match"
          className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-(--line) bg-(--bg-surface) px-4 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] shadow-[0_-12px_32px_#0008] sm:static sm:flex sm:shrink-0 sm:gap-2 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none"
        >
          <button
            aria-label="Réinitialiser"
            className="inline-flex min-h-11 w-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-(--line) bg-(--bg-elevated) px-0 text-xs font-bold text-(--text-secondary) transition hover:border-(--team-a-red) hover:text-(--team-a-red) max-sm:h-12 max-sm:w-full max-sm:rounded-none max-sm:border-0 max-sm:bg-transparent max-sm:px-0 sm:w-auto sm:px-4"
            onClick={() => setConfirmReset(true)}
            ref={resetTriggerRef}
            type="button"
          >
            <RotateCcw aria-hidden="true" size={18} />
            <span className="hidden sm:inline">Réinitialiser</span>
          </button>
          <button
            aria-label={isLive ? "Mettre en pause" : "Reprendre"}
            className="inline-flex min-h-11 w-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-(--line) bg-(--bg-elevated) px-0 text-xs font-bold text-(--text-primary) transition hover:brightness-110 max-sm:h-12 max-sm:w-full max-sm:rounded-none max-sm:border-0 max-sm:border-l max-sm:border-l-(--line) max-sm:bg-transparent max-sm:px-0 sm:w-auto sm:px-4"
            onClick={() =>
              context.onSetMatchState(match.id, isLive ? "pause" : "resume")
            }
            type="button"
          >
            {isLive ? (
              <Pause aria-hidden="true" fill="currentColor" size={18} />
            ) : (
              <Play aria-hidden="true" fill="currentColor" size={18} />
            )}
            <span className="hidden sm:inline">
              {isLive ? "Mettre en pause" : "Reprendre"}
            </span>
          </button>
          <button
            aria-label="Siffler la fin"
            className="inline-flex min-h-11 w-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-(--team-a-red)/40 bg-(--team-a-red)/10 px-0 text-xs font-bold text-(--team-a-red) transition hover:brightness-110 max-sm:h-12 max-sm:w-full max-sm:rounded-none max-sm:border-0 max-sm:border-l max-sm:border-l-(--line) max-sm:bg-transparent max-sm:px-0 sm:w-auto sm:px-4"
            onClick={() => setConfirmFinish(true)}
            ref={finishTriggerRef}
            type="button"
          >
            <Flag aria-hidden="true" size={18} />
            <span className="hidden sm:inline">Siffler la fin</span>
          </button>
        </nav>
      )}

      {isFinished && (
        <h2 className="mb-0 mt-6 text-lg font-bold">Résumé du match</h2>
      )}

      <Drawer
        mounted={resetDrawer.mounted}
        open={resetDrawer.open}
        onClose={() => setConfirmReset(false)}
        labelledBy="reset-match-title"
        panelClassName="live-match-action-drawer live-match-action-drawer--confirm"
        backdropClassName="z-50"
        dialogRole="alertdialog"
        panelRef={resetDialogRef}
      >
        <div className="live-match-action-drawer__content">
          <div className="mb-5.75 flex items-center justify-between gap-5">
            <div>
              <p className="drawer-eyebrow mb-1.75">GESTION DU MATCH</p>
              <h2 className="drawer-title m-0" id="reset-match-title">
                Réinitialiser ce match ?
              </h2>
            </div>
            <button
              aria-label="Fermer"
              className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-[3px] border border-(--line) bg-transparent text-(--text-secondary) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--team-b-blue)"
              onClick={() => setConfirmReset(false)}
              type="button"
            >
              <X aria-hidden="true" size={19} />
            </button>
          </div>
          <p className="mb-0 mt-2 text-sm text-(--text-secondary)">
            Le chrono et tous les buts seront effacés. Les joueurs inscrits et
            les équipes seront conservés. Les statistiques joueurs de ce match
            ne seront pas comptabilisées.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              className="min-h-12 cursor-pointer rounded-md border border-(--line) bg-(--bg-elevated) px-3 text-sm font-bold text-(--text-primary)"
              disabled={isResettingMatch}
              onClick={() => setConfirmReset(false)}
              type="button"
            >
              Garder le match
            </button>
            <button
              className="min-h-12 cursor-pointer rounded-md border-0 bg-(--team-a-red) px-3 text-sm font-bold text-(--bg-main) disabled:cursor-wait disabled:opacity-60"
              disabled={isResettingMatch}
              onClick={() => void resetCurrentMatch()}
              type="button"
            >
              {isResettingMatch ? "Réinitialisation…" : "Confirmer le reset"}
            </button>
          </div>
        </div>
      </Drawer>

      <Drawer
        mounted={finishDrawer.mounted}
        open={finishDrawer.open}
        onClose={() => setConfirmFinish(false)}
        labelledBy="finish-match-title"
        panelClassName="live-match-action-drawer live-match-action-drawer--confirm"
        backdropClassName="z-50"
        dialogRole="alertdialog"
        panelRef={finishDialogRef}
      >
        <div className="live-match-action-drawer__content">
          <div className="mb-5.75 flex items-center justify-between gap-5">
            <div>
              <p className="drawer-eyebrow mb-1.75">GESTION DU MATCH</p>
              <h2 className="drawer-title m-0" id="finish-match-title">
                Siffler la fin du match ?
              </h2>
            </div>
            <button
              aria-label="Fermer"
              className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-[3px] border border-(--line) bg-transparent text-(--text-secondary) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--team-b-blue)"
              onClick={() => setConfirmFinish(false)}
              type="button"
            >
              <X aria-hidden="true" size={19} />
            </button>
          </div>
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
        mounted={swapDrawer.mounted}
        open={swapDrawer.open}
        onClose={closeSwapPicker}
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
            onClick={closeSwapPicker}
            type="button"
          >
            <X aria-hidden="true" size={16} />
          </button>
        </div>
        <p className="mb-3 text-center text-xs text-(--text-secondary)">
          Choisissez un joueur dans chaque équipe
        </p>
        <div className="grid grid-cols-2 gap-3.5">
          {([1, 0] as const).map((team) => {
            const isRedTeam = team === 0;
            const selectedPlayer = isRedTeam
              ? redPlayerToSwap
              : bluePlayerToSwap;

            return (
              <section
                aria-label={`Équipe ${isRedTeam ? "rouge" : "bleue"}`}
                className="min-w-0"
                key={team}
              >
                <h3
                  className={`mb-2.5 mt-0 text-xs font-semibold ${isRedTeam ? "text-(--team-a-red)" : "text-(--team-b-blue)"}`}
                >
                  Équipe {isRedTeam ? "rouge" : "bleue"}
                </h3>
                <ul className="m-0 list-none p-0">
                  {teams[team].map((id) => {
                    const selected = selectedPlayer === id;
                    const playerName = context.playerNames[id] ?? "Joueur";

                    return (
                      <li className="m-0" key={id}>
                        <button
                          aria-label={`Sélectionner ${playerName} dans l'équipe ${isRedTeam ? "rouge" : "bleue"}`}
                          aria-pressed={selected}
                          className={`mb-1.5 flex min-h-9 w-full items-center justify-between gap-1.5 overflow-hidden rounded-sm border px-2 py-1.5 text-left text-xs font-semibold transition-colors ${isRedTeam ? (selected ? "border-(--team-a-red) bg-(--team-a-red)/20 text-(--team-a-red)" : "border-(--team-a-red)/25 bg-(--team-a-red)/5 text-(--team-a-red) hover:brightness-110") : selected ? "border-(--team-b-blue) bg-(--team-b-blue)/20 text-(--team-b-blue)" : "border-(--team-b-blue)/25 bg-(--team-b-blue)/5 text-(--team-b-blue) hover:brightness-110"}`}
                          onClick={() => selectPlayerToSwap(team, id)}
                          type="button"
                        >
                          <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                            {playerName}
                          </span>
                          <span
                            aria-hidden="true"
                            className={`grid size-4.5 shrink-0 place-items-center rounded-[3px] border ${selected ? "border-current bg-current/15" : "border-current/60"}`}
                          >
                            {selected && <Check size={12} />}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </Drawer>

      {context.matchNotice && (
        <p className="my-3 text-sm text-(--team-a-red)" role="alert">
          {context.matchNotice}
        </p>
      )}

      {!isScheduled && (
        <section
          aria-label="Score du match"
          className="mt-6 grid min-h-44 grid-cols-[minmax(0,1fr)_7.5rem_minmax(0,1fr)] overflow-hidden rounded-xl border border-(--line) bg-(--bg-surface) sm:min-h-47 sm:grid-cols-[minmax(0,1fr)_9rem_minmax(0,1fr)]"
        >
          <div className="flex min-w-0 flex-col justify-center bg-linear-to-r from-(--team-b-blue)/15 to-transparent px-5 py-5 max-[380px]:px-3">
            <p className="mb-3 flex items-center gap-2 text-[9px] font-bold tracking-[1px] text-(--text-secondary)">
              <span className="size-1.5 rounded-full bg-(--team-b-blue)" />{" "}
              ÉQUIPE BLEUE
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
              className="inline-block w-[6ch] text-center font-sans text-3xl font-bold tabular-nums text-(--text-primary) sm:text-4xl"
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
          <div className="flex min-w-0 flex-col items-end justify-center bg-linear-to-l from-(--team-a-red)/15 to-transparent px-5 py-5 text-right max-[380px]:px-3">
            <p className="mb-3 flex items-center gap-2 text-[9px] font-bold tracking-[1px] text-(--text-secondary)">
              ÉQUIPE ROUGE{" "}
              <span className="size-1.5 rounded-full bg-(--team-a-red)" />
            </p>
            <strong className="text-5xl font-bold leading-none tabular-nums text-(--team-a-red) sm:text-6xl">
              {score[0]}
            </strong>
          </div>
        </section>
      )}

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
          <LiveMatchComposition
            teams={teams}
            playerNames={context.playerNames}
            onClose={closeComposition}
            isEditable
            onSaveTeams={(nextTeams) =>
              context.onSaveScheduledMatchTeams(match.id, nextTeams)
            }
          />
        </Drawer>
      )}

      {!isScheduled && (
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
              <ol
                aria-label="Événements du match"
                className="m-0 list-none p-0"
              >
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
                    {canRecordActions && (
                      <button
                        aria-label={`Supprimer le but de ${context.playerNames[goal.scorerId] ?? "Joueur"}`}
                        className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-md border border-(--line) bg-(--bg-elevated) text-(--text-secondary) transition-colors hover:border-(--team-a-red) hover:text-(--team-a-red) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--team-a-red)"
                        onClick={() => context.onRemoveGoal(match.id, goal.id)}
                        title="Supprimer ce but"
                        type="button"
                      >
                        <X aria-hidden="true" size={14} />
                      </button>
                    )}
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

              <div className="grid grid-cols-2 gap-3 border-b border-(--line) py-4">
                {([1, 0] as const).map((team) => {
                  const isRedTeam = team === 0;
                  return (
                    <section
                      aria-label={`Équipe ${isRedTeam ? "rouge" : "bleue"}`}
                      className="min-w-0"
                      key={team}
                    >
                      <h3
                        className={`mb-2 mt-0 text-[9px] font-bold uppercase ${isRedTeam ? "text-(--team-a-red)" : "text-(--team-b-blue)"}`}
                      >
                        {isRedTeam ? "Rouge" : "Bleue"}
                      </h3>
                      <ul className="m-0 list-none space-y-1.5 p-0">
                        {teams[team].map((playerId) => {
                          const latestGoal =
                            latestMatchGoal?.scorerId === playerId
                              ? latestMatchGoal
                              : undefined;
                          const remainingUndoSeconds = latestGoal
                            ? getRemainingGoalUndoSeconds(latestGoal, undoClock)
                            : 0;
                          const playerName =
                            context.playerNames[playerId] ?? "Joueur";

                          return (
                            <li
                              className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-1 gap-y-1"
                              key={playerId}
                            >
                              <span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-(--text-primary)">
                                {playerName}
                              </span>
                              <button
                                aria-label={`Ajouter un but pour ${playerName}`}
                                className={`grid size-8 shrink-0 cursor-pointer place-items-center rounded-md border bg-(--bg-elevated) transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${isRedTeam ? "border-(--team-a-red)/35 text-(--team-a-red) hover:bg-(--team-a-red)/10" : "border-(--team-b-blue)/35 text-(--team-b-blue) hover:bg-(--team-b-blue)/10"}`}
                                disabled={!canRecordActions}
                                onClick={() =>
                                  context.onRecordGoal(match.id, playerId)
                                }
                                title={`Ajouter un but pour ${playerName}`}
                                type="button"
                              >
                                <Goal aria-hidden="true" size={15} />
                              </button>
                              {latestGoal &&
                                latestGoal.undoable !== false &&
                                remainingUndoSeconds > 0 && (
                                  <GoalUndoButton
                                    goal={latestGoal}
                                    key={latestGoal.id}
                                    matchId={match.id}
                                    onRemoveGoal={context.onRemoveGoal}
                                    playerName={playerName}
                                    remainingSeconds={remainingUndoSeconds}
                                    disabled={!canRecordActions}
                                  />
                                )}
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  );
                })}
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
      )}
    </section>
  );
}
