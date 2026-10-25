import { useEffect, useState } from "react";
import { Check, CircleDot, Goal } from "lucide-react";
import type { MatchGoal } from "../../types";

type LiveMatchPanelProps = {
  startedAt: string;
  teams: [string[], string[]];
  goals: MatchGoal[];
  playerNames: Record<string, string>;
  onRecordGoal: (scorerId: string) => void;
};

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function elapsedSince(startedAt: string) {
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000),
  );
}

export function LiveMatchPanel({
  startedAt,
  teams,
  goals,
  playerNames,
  onRecordGoal,
}: LiveMatchPanelProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(() =>
    elapsedSince(startedAt),
  );
  const [scorerId, setScorerId] = useState("");
  const score = [
    goals.filter((goal) => goal.team === 0).length,
    goals.filter((goal) => goal.team === 1).length,
  ];
  const roster = [...teams[0], ...teams[1]];

  useEffect(() => {
    const updateClock = () => setElapsedSeconds(elapsedSince(startedAt));
    updateClock();
    const timer = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(timer);
  }, [startedAt]);

  return (
    <section
      aria-label="Match en cours"
      className="mt-5 border-y border-(--line) py-4"
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-[10px] font-bold tracking-[1px] text-(--status-success)">
          <CircleDot aria-hidden="true" className="animate-pulse" size={13} />
          EN DIRECT
        </span>
        <span
          aria-label="Temps de jeu"
          className="font-mono text-sm tabular-nums text-(--text-primary)"
          role="timer"
        >
          {formatClock(elapsedSeconds)}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4 text-center">
        <div>
          <p className="m-0 text-[10px] font-semibold text-(--text-secondary)">
            ÉQUIPE BLEUE
          </p>
          <p className="m-0 text-4xl font-bold tabular-nums text-(--text-primary)">
            {score[1]}
          </p>
        </div>
        <span className="text-sm text-(--text-secondary)">–</span>
        <div>
          <p className="m-0 text-[10px] font-semibold text-(--text-secondary)">
            ÉQUIPE ROUGE
          </p>
          <p className="m-0 text-4xl font-bold tabular-nums text-(--text-primary)">
            {score[0]}
          </p>
        </div>
      </div>

      <form
        className="mt-4 flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!scorerId) return;
          onRecordGoal(scorerId);
          setScorerId("");
        }}
      >
        <label className="sr-only" htmlFor="goal-scorer">
          Joueur qui a marqué
        </label>
        <select
          className="min-h-10 min-w-0 flex-1 rounded-md border border-(--line) bg-(--bg-surface) px-3 text-xs text-(--text-primary)"
          id="goal-scorer"
          onChange={(event) => setScorerId(event.target.value)}
          value={scorerId}
        >
          <option value="">Choisir le buteur</option>
          {roster.map((id) => (
            <option key={id} value={id}>
              {playerNames[id] ?? "Joueur"}
            </option>
          ))}
        </select>
        <button
          className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md border-0 bg-(--team-b-blue) px-3 text-xs font-bold text-(--bg-main) disabled:cursor-default disabled:opacity-45"
          disabled={!scorerId}
          type="submit"
        >
          <Goal aria-hidden="true" size={15} /> Ajouter un but
        </button>
      </form>

      <ol
        aria-label="Buts marqués"
        className="mt-3 max-h-36 list-none divide-y divide-(--line) overflow-y-auto p-0"
      >
        {[...goals].reverse().map((goal) => (
          <li
            className="flex items-center gap-2 py-2 text-[10px] text-(--text-secondary)"
            key={goal.id}
          >
            <Check
              aria-hidden="true"
              className={
                goal.team === 0 ? "text-(--team-a-red)" : "text-(--team-b-blue)"
              }
              size={13}
            />
            <span className="min-w-0 flex-1 truncate">
              {playerNames[goal.scorerId] ?? "Joueur"} · Équipe{" "}
              {goal.team === 0 ? "A" : "B"}
            </span>
            <time className="font-mono tabular-nums">
              {formatClock(goal.elapsedSeconds)}
            </time>
          </li>
        ))}
      </ol>
      {goals.length === 0 && (
        <p className="mb-0 mt-3 text-center text-[10px] text-(--text-secondary)">
          Aucun but pour le moment
        </p>
      )}
    </section>
  );
}
