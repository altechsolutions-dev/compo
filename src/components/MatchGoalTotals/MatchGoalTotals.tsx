import type { MatchGoal } from "../../types";
import { MatchTeamHeading, MatchTeamPlayer } from "../MatchDetails/MatchTeamDisplay";

type MatchGoalTotalsProps = {
  goals: MatchGoal[];
  playerIds: string[];
  playerNames: Record<string, string>;
  teams: [string[], string[]];
  className?: string;
};

export function MatchGoalTotals({
  goals,
  playerIds,
  playerNames,
  teams,
  className = "mt-6",
}: MatchGoalTotalsProps) {
  const totals = new Map<string, number>();
  for (const id of [...playerIds, ...teams[0], ...teams[1]]) totals.set(id, 0);
  for (const goal of goals) {
    totals.set(goal.scorerId, (totals.get(goal.scorerId) ?? 0) + 1);
  }
  const players = [...totals].sort((a, b) => b[1] - a[1]);
  const groups = [
    {
      label: "Équipe Bleue",
      teamIndex: 1 as const,
      players: players.filter(([id]) => teams[1].includes(id)),
    },
    {
      label: "Équipe Rouge",
      teamIndex: 0 as const,
      players: players.filter(([id]) => teams[0].includes(id)),
    },
    {
      label: "Autres joueurs",
      teamIndex: null,
      players: players.filter(([id]) => !teams.some((team) => team.includes(id))),
    },
  ];

  return (
    <section aria-labelledby="match-goal-totals-title" className={className}>
      <h3
        className="mb-3 text-sm font-bold text-(--text-primary)"
        id="match-goal-totals-title"
      >
        Buts par joueur
      </h3>
      {players.length ? (
        <div className="grid grid-cols-2 gap-3.5">
          {groups.map((group, index) =>
            index < 2 || group.players.length ? (
              <section
                aria-label={group.label}
                className={index === 2 ? "col-span-2" : "min-w-0"}
                key={group.label}
              >
                {group.teamIndex === null ? (
                  <h4 className="mb-2.5 text-xs font-semibold text-(--text-primary)">
                    {group.label}
                  </h4>
                ) : (
                  <MatchTeamHeading teamIndex={group.teamIndex} />
                )}
                <ul className="m-0 list-none p-0">
                  {group.players.map(([id, count]) => (
                    <li key={id}>
                      <MatchTeamPlayer teamIndex={group.teamIndex}>
                        <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                          {playerNames[id] ?? "Joueur"}
                        </span>
                        <span className="ml-auto shrink-0 pl-2 tabular-nums">
                          {count}
                        </span>
                      </MatchTeamPlayer>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null,
          )}
        </div>
      ) : (
        <p className="m-0 text-sm text-(--text-secondary)">Aucun joueur</p>
      )}
    </section>
  );
}
