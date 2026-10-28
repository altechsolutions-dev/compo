import type { MatchGoal } from "../../types";

type MatchScoreboardProps = {
  goals: MatchGoal[];
  elapsedSeconds: number;
  status: "in_progress" | "paused" | "finished";
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
}: MatchScoreboardProps) {
  const blueScore = goals.filter((goal) => goal.team === 1).length;
  const redScore = goals.filter((goal) => goal.team === 0).length;

  return (
    <section
      aria-label="Score du match"
      className="mt-6 grid min-h-44 grid-cols-[minmax(0,1fr)_7.5rem_minmax(0,1fr)] overflow-hidden rounded-xl border border-(--line) bg-(--bg-surface) sm:min-h-47 sm:grid-cols-[minmax(0,1fr)_9rem_minmax(0,1fr)]"
    >
      <div className="flex min-w-0 flex-col justify-center bg-linear-to-r from-(--team-b-blue)/15 to-transparent px-5 py-5 max-[380px]:px-3">
        <p className="mb-3 flex items-center gap-2 text-[9px] font-bold tracking-[1px] text-(--text-secondary)">
          <span className="size-1.5 rounded-full bg-(--team-b-blue)" /> ÉQUIPE
          BLEUE
        </p>
        <strong className="text-5xl font-bold leading-none tabular-nums text-(--team-b-blue) sm:text-6xl">
          {blueScore}
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
          className={`mb-0 mt-2 text-[9px] font-bold ${status === "in_progress" ? "text-(--status-success)" : "text-(--text-secondary)"}`}
        >
          {status === "in_progress"
            ? "EN JEU"
            : status === "paused"
              ? "EN PAUSE"
              : "TERMINÉ"}
        </p>
      </div>
      <div className="flex min-w-0 flex-col items-end justify-center bg-linear-to-l from-(--team-a-red)/15 to-transparent px-5 py-5 text-right max-[380px]:px-3">
        <p className="mb-3 flex items-center gap-2 text-[9px] font-bold tracking-[1px] text-(--text-secondary)">
          ÉQUIPE ROUGE{" "}
          <span className="size-1.5 rounded-full bg-(--team-a-red)" />
        </p>
        <strong className="text-5xl font-bold leading-none tabular-nums text-(--team-a-red) sm:text-6xl">
          {redScore}
        </strong>
      </div>
    </section>
  );
}
