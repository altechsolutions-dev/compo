import { ArrowUpRight, CalendarDays, Goal } from "lucide-react";
import type { MatchSlot } from "../../types";

type FinishedMatchesListProps = {
  matches: MatchSlot[];
  playerNames: Record<string, string>;
  onOpenMatch: (matchId: string) => void;
};

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatMatchDate(match: MatchSlot) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${match.date}T12:00:00`));
}

export function FinishedMatchesList({
  matches,
  playerNames,
  onOpenMatch,
}: FinishedMatchesListProps) {
  const orderedMatches = [...matches].sort((first, second) =>
    `${second.date}T${second.time}`.localeCompare(
      `${first.date}T${first.time}`,
    ),
  );

  return (
    <ol
      aria-label="Résultats des matchs terminés"
      className="m-0 list-none p-0"
    >
      {orderedMatches.map((match) => {
        const goals = match.goals ?? [];
        const score = [
          goals.filter((goal) => goal.team === 0).length,
          goals.filter((goal) => goal.team === 1).length,
        ];
        const teams = match.teams ?? [[], []];

        return (
          <li className="border-b border-(--line) py-5 sm:py-6" key={match.id}>
            <article aria-labelledby={`finished-match-${match.id}`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="mb-1 flex items-center gap-2 text-xs font-semibold capitalize text-(--text-secondary)">
                    <CalendarDays aria-hidden="true" size={14} />
                    {formatMatchDate(match)} · {match.time}
                  </p>
                  <h3
                    className="m-0 truncate text-lg font-bold"
                    id={`finished-match-${match.id}`}
                  >
                    {match.venue}
                  </h3>
                </div>
                <button
                  className="inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-2 rounded-md border border-(--line) bg-(--bg-surface) px-3 text-xs font-bold text-(--text-primary) hover:brightness-110"
                  onClick={() => onOpenMatch(match.id)}
                  type="button"
                >
                  Voir le résumé <ArrowUpRight aria-hidden="true" size={15} />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-y border-(--line) py-4">
                <div className="min-w-0">
                  <p className="m-0 text-[10px] font-bold uppercase text-(--team-b-blue)">
                    Équipe bleue
                  </p>
                  <p className="mb-0 mt-1 truncate text-xs text-(--text-secondary)">
                    {teams[1]
                      .map((id) => playerNames[id] ?? "Joueur")
                      .join(", ") || "Composition non enregistrée"}
                  </p>
                </div>
                <p
                  aria-label={`Score final : équipe bleue ${score[1]}, équipe rouge ${score[0]}`}
                  className="m-0 flex items-center gap-2 font-mono text-2xl font-bold tabular-nums"
                >
                  <span className="text-(--team-b-blue)">{score[1]}</span>
                  <span className="text-(--text-secondary)">–</span>
                  <span className="text-(--team-a-red)">{score[0]}</span>
                </p>
                <div className="min-w-0 text-right">
                  <p className="m-0 text-[10px] font-bold uppercase text-(--team-a-red)">
                    Équipe rouge
                  </p>
                  <p className="mb-0 mt-1 truncate text-xs text-(--text-secondary)">
                    {teams[0]
                      .map((id) => playerNames[id] ?? "Joueur")
                      .join(", ") || "Composition non enregistrée"}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 flex-wrap gap-x-4 gap-y-2">
                  {goals.length ? (
                    goals.map((goal) => (
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs ${goal.team === 0 ? "text-(--team-a-red)" : "text-(--team-b-blue)"}`}
                        key={goal.id}
                      >
                        <Goal aria-hidden="true" size={13} />
                        {playerNames[goal.scorerId] ?? "Joueur"}
                        <time className="font-mono text-(--text-secondary)">
                          {formatClock(goal.elapsedSeconds)}
                        </time>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-(--text-secondary)">
                      Aucun but
                    </span>
                  )}
                </div>
                <span className="shrink-0 font-mono text-xs tabular-nums text-(--text-secondary)">
                  {formatClock(match.elapsedSeconds ?? 0)}
                </span>
              </div>
            </article>
          </li>
        );
      })}
    </ol>
  );
}
