import type { MatchGoal } from "../../types";

type MatchScoreboardProps = {
  goals: MatchGoal[];
  elapsedSeconds: number;
  status: "in_progress" | "paused" | "finished";
  compact?: boolean;
  onSelectTeam?: (team: 0 | 1) => void;
};

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function MatchScoreboard({
  goals,
  elapsedSeconds,
  status,
  compact = false,
  onSelectTeam,
}: MatchScoreboardProps) {
  const blueScore = goals.filter((goal) => goal.team === 1).length;
  const redScore = goals.filter((goal) => goal.team === 0).length;

  return (
    <section
      aria-label="Score du match"
      className={`live-match-scoreboard mt-3 grid overflow-hidden rounded-xl border border-(--line) bg-(--bg-surface) ${compact ? "live-match-scoreboard--compact min-h-32 grid-cols-[minmax(0,1fr)_6rem_minmax(0,1fr)] sm:min-h-36 sm:grid-cols-[minmax(0,1fr)_7rem_minmax(0,1fr)]" : "mt-6 min-h-44 grid-cols-[minmax(0,1fr)_7.5rem_minmax(0,1fr)] sm:min-h-54 sm:grid-cols-[minmax(0,1fr)_9rem_minmax(0,1fr)]"}`}
    >
      {onSelectTeam ? (
        <button
          aria-label="Ajouter un but à l’équipe bleue"
          className="live-match-score-team--blue flex min-w-0 cursor-pointer flex-col justify-center border-0 bg-linear-to-r from-(--team-b-blue)/15 to-transparent px-10 py-5 text-left text-inherit transition hover:brightness-125 focus-visible:z-10 max-[380px]:px-3"
          onClick={() => onSelectTeam(1)}
          type="button"
        >
          <p className="mb-3 flex items-center gap-2 text-[9px] font-bold tracking-[1px] text-(--text-secondary)">
            <span className="size-1.5 rounded-full bg-(--team-b-blue)" /> ÉQUIPE
            BLEUE
          </p>
          <strong
            className={`live-match-score-value font-bold leading-none tabular-nums text-(--team-b-blue) ${compact ? "text-5xl sm:text-6xl" : "text-6xl sm:text-7xl"}`}
          >
            {blueScore}
          </strong>
        </button>
      ) : (
        <div className="live-match-score-team--blue flex min-w-0 flex-col justify-center bg-linear-to-r from-(--team-b-blue)/15 to-transparent px-10 py-5 max-[380px]:px-3">
          <p className="mb-3 flex items-center gap-2 text-[9px] font-bold tracking-[1px] text-(--text-secondary)">
            <span className="size-1.5 rounded-full bg-(--team-b-blue)" /> ÉQUIPE
            BLEUE
          </p>
          <strong
            className={`live-match-score-value font-bold leading-none tabular-nums text-(--team-b-blue) ${compact ? "text-5xl sm:text-6xl" : "text-6xl sm:text-7xl"}`}
          >
            {blueScore}
          </strong>
        </div>
      )}
      <div className="flex flex-col items-center justify-center border-x border-(--line) px-2 text-center">
        <p className="mb-1 text-[9px] font-bold tracking-[1px] text-(--text-secondary)">
          CHRONO
        </p>
        <time
          aria-label="Temps de jeu"
          className={`live-match-score-clock inline-block w-[6ch] text-center font-sans font-bold tabular-nums text-(--text-primary) ${compact ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl"}`}
          role="timer"
        >
          {formatClock(elapsedSeconds)}
        </time>
        <p
          className={`mb-0 mt-2 text-[9px] font-bold ${status === "in_progress" ? "text-(--status-success)" : "text-(--text-secondary)"}`}
        >
          {status === "in_progress"
            ? "EN JEU"
            : status === "paused"
              ? "EN PAUSE"
              : "TERMINÉ"}
        </p>
      </div>
      {onSelectTeam ? (
        <button
          aria-label="Ajouter un but à l’équipe rouge"
          className="live-match-score-team--red flex min-w-0 cursor-pointer flex-col items-end justify-center border-0 bg-linear-to-l from-(--team-a-red)/15 to-transparent px-10 py-5 text-right text-inherit transition hover:brightness-125 focus-visible:z-10 max-[380px]:px-3"
          onClick={() => onSelectTeam(0)}
          type="button"
        >
          <p className="mb-3 flex items-center gap-2 text-[9px] font-bold tracking-[1px] text-(--text-secondary)">
            ÉQUIPE ROUGE{" "}
            <span className="size-1.5 rounded-full bg-(--team-a-red)" />
          </p>
          <strong
            className={`live-match-score-value font-bold leading-none tabular-nums text-(--team-a-red) ${compact ? "text-5xl sm:text-6xl" : "text-6xl sm:text-7xl"}`}
          >
            {redScore}
          </strong>
        </button>
      ) : (
        <div className="live-match-score-team--red flex min-w-0 flex-col items-end justify-center bg-linear-to-l from-(--team-a-red)/15 to-transparent px-10 py-5 text-right max-[380px]:px-3">
          <p className="mb-3 flex items-center gap-2 text-[9px] font-bold tracking-[1px] text-(--text-secondary)">
            ÉQUIPE ROUGE{" "}
            <span className="size-1.5 rounded-full bg-(--team-a-red)" />
          </p>
          <strong
            className={`live-match-score-value font-bold leading-none tabular-nums text-(--team-a-red) ${compact ? "text-5xl sm:text-6xl" : "text-6xl sm:text-7xl"}`}
          >
            {redScore}
          </strong>
        </div>
      )}
    </section>
  );
}
