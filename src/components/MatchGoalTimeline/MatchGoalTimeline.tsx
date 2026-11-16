import { Goal, X } from "lucide-react";
import type { MatchGoal } from "../../types";

type MatchGoalTimelineProps = {
  goals: MatchGoal[];
  playerNames: Record<string, string>;
  onRemoveGoal?: (goalId: string) => void;
};

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function MatchGoalTimeline({
  goals,
  playerNames,
  onRemoveGoal,
}: MatchGoalTimelineProps) {
  if (goals.length === 0) {
    return (
      <div className="grid h-80 place-content-center justify-items-center text-center">
        <p className="mb-1 text-xs font-semibold">Aucun but pour le moment</p>
        <p className="m-0 max-w-sm text-[10px] text-(--text-secondary)">
          Les buts apparaîtront ici au fil du match.
        </p>
      </div>
    );
  }

  return (
    <ol
      aria-label="Événements du match"
      className="relative m-0 grid h-80 list-none content-start gap-2 overflow-y-auto p-0 pr-2 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-(--team-b-blue)"
      tabIndex={0}
    >
      {[...goals].reverse().map((goal) => {
        const playerName = playerNames[goal.scorerId] ?? "Joueur";
        const isRedTeam = goal.team === 0;

        return (
          <li
            className={`flex items-center gap-3 rounded-sm bg-linear-to-r to-transparent px-2 py-4 ${isRedTeam ? "from-(--team-a-red)/10" : "from-(--team-b-blue)/10"}`}
            key={goal.id}
          >
            <span
              className={`grid size-9 shrink-0 place-items-center rounded-full ${isRedTeam ? "bg-(--team-a-red)/10 text-(--team-a-red)" : "bg-(--team-b-blue)/10 text-(--team-b-blue)"}`}
            >
              <Goal aria-hidden="true" size={16} />
            </span>
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-xs text-(--text-primary)">
                {playerName}
              </strong>
              <span className="sr-only">
                Équipe {isRedTeam ? "rouge" : "bleue"}
              </span>
            </span>
            <time className="font-mono text-xs tabular-nums text-(--text-secondary)">
              {formatClock(goal.elapsedSeconds)}
            </time>
            {onRemoveGoal && (
              <button
                aria-label={`Supprimer le but de ${playerName}`}
                className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-md border border-(--line) bg-(--bg-elevated) text-(--text-secondary) transition-colors hover:border-(--team-a-red) hover:text-(--team-a-red) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--team-a-red)"
                onClick={() => onRemoveGoal(goal.id)}
                title="Supprimer ce but"
                type="button"
              >
                <X aria-hidden="true" size={14} />
              </button>
            )}
          </li>
        );
      })}
    </ol>
  );
}
