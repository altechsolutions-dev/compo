import { Goal } from "lucide-react";

type BestScorerIconsProps = {
  scorerIds: string[];
  teams: [string[], string[]];
};

export function BestScorerIcons({ scorerIds, teams }: BestScorerIconsProps) {
  const scorerTeams = new Set(
    scorerIds.map((id) => teams.findIndex((team) => team.includes(id))),
  );
  if (scorerTeams.size === 0) scorerTeams.add(-1);

  return (
    <span className="flex shrink-0 gap-1" aria-hidden="true">
      {[-1, 1, 0].filter((team) => scorerTeams.has(team)).map((team) => (
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-full ${team === 0 ? "bg-(--team-a-red)/10 text-(--team-a-red)" : team === 1 ? "bg-(--team-b-blue)/10 text-(--team-b-blue)" : "bg-(--bg-elevated) text-(--text-secondary)"}`}
          key={team}
        >
          <Goal size={19} />
        </span>
      ))}
    </span>
  );
}
