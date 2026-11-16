import { Shirt } from "lucide-react";
import type { ReactNode } from "react";

type TeamIndex = 0 | 1;

export function MatchTeamHeading({ teamIndex }: { teamIndex: TeamIndex }) {
  return (
    <h4
      className={`mb-2.5 flex items-center gap-1.5 text-xs font-semibold ${teamIndex === 0 ? "text-(--team-a-red)" : "text-(--team-b-blue)"}`}
    >
      <Shirt
        size={14}
        color={teamIndex === 0 ? "var(--team-a-red)" : "var(--team-b-blue)"}
        aria-hidden="true"
      />
      Équipe {teamIndex === 0 ? "Rouge" : "Bleue"}
    </h4>
  );
}

export function MatchTeamPlayer({
  children,
  teamIndex,
  selected = false,
  isEditing = false,
}: {
  children: ReactNode;
  teamIndex: TeamIndex | null;
  selected?: boolean;
  isEditing?: boolean;
}) {
  const teamColorClass =
    teamIndex === 0
      ? selected
        ? "border-(--team-a-red) bg-(--team-a-red)/20 text-(--team-a-red)"
        : "border-(--team-a-red)/25 bg-(--team-a-red)/5 text-(--team-a-red)"
      : teamIndex === 1
        ? selected
          ? "border-(--team-b-blue) bg-(--team-b-blue)/20 text-(--team-b-blue)"
          : "border-(--team-b-blue)/25 bg-(--team-b-blue)/5 text-(--team-b-blue)"
        : "border-(--line) bg-(--bg-surface) text-(--text-primary)";

  return (
    <div
      className={`match-team-player mb-1.5 flex min-h-9 w-full items-center overflow-hidden rounded-sm border px-2 py-1.5 text-xs font-semibold ${teamColorClass} ${teamIndex === 0 ? "match-team-player--red" : teamIndex === 1 ? "match-team-player--blue" : ""} ${selected ? "is-selected" : ""} ${isEditing && !selected ? "hover:brightness-110" : ""}`}
    >
      {children}
    </div>
  );
}
