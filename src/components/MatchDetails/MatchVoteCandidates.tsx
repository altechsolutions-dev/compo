import { Check, Trophy } from "lucide-react";

type MatchVoteCandidatesProps = {
  candidates: string[];
  teams: [string[], string[]];
  playerNames: Record<string, string>;
  voteTotals: { candidateId: string; voteCount: number }[];
  myVote: string | null;
  saving: boolean;
  onVote?: (candidateId: string) => void;
};

export function MatchVoteCandidates({
  candidates,
  teams,
  playerNames,
  voteTotals,
  myVote,
  saving,
  onVote,
}: MatchVoteCandidatesProps) {
  const renderCandidate = (candidateId: string) => {
    const candidateVotes =
      voteTotals.find((vote) => vote.candidateId === candidateId)?.voteCount ?? 0;
    const isSelected = myVote === candidateId;
    const team = teams.findIndex((players) => players.includes(candidateId));
    const teamColorClass =
      team === 0 ? "text-(--team-a-red)" :
        team === 1 ? "text-(--team-b-blue)" : "text-(--text-primary)";
    const teamBorderClass =
      team === 0 ? "border-l-(--team-a-red)" :
        team === 1 ? "border-l-(--team-b-blue)" : "";
    const selectedTeamClass =
      team === 0
        ? "border-(--team-a-red) bg-(--team-a-red)/15 text-(--team-a-red) ring-1 ring-(--team-a-red) enabled:hover:bg-(--team-a-red)/25"
        : "border-(--team-b-blue) bg-(--team-b-blue)/15 text-(--team-b-blue) ring-1 ring-(--team-b-blue) enabled:hover:bg-(--team-b-blue)/25";
    const teamHoverClass =
      team === 0
        ? "enabled:hover:border-(--team-a-red) enabled:hover:bg-(--team-a-red)/10 enabled:hover:text-(--team-a-red)"
        : "enabled:hover:border-(--team-b-blue) enabled:hover:bg-(--team-b-blue)/10 enabled:hover:text-(--team-b-blue)";

    return (
      <button
        aria-pressed={isSelected}
        aria-disabled={saving || !onVote}
        className={`flex min-h-16 cursor-pointer items-center justify-between gap-3 border border-l-4 px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--team-b-blue) disabled:cursor-not-allowed disabled:opacity-50 ${teamBorderClass} ${isSelected ? selectedTeamClass : `border-(--line) bg-(--bg-surface) text-(--text-primary) ${teamHoverClass}`}`}
        disabled={!onVote}
        key={candidateId}
        onClick={() => {
          if (!saving) onVote?.(candidateId);
        }}
        type="button"
      >
        <span className="min-w-0">
          <span className={`block truncate text-sm font-bold ${teamColorClass}`}>
            {playerNames[candidateId] ?? "Joueur"}
          </span>
          {isSelected && (
            <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.8px]">
              Votre choix
            </span>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold tabular-nums">
          {candidateVotes}
          {isSelected && <Check aria-hidden="true" size={15} />}
        </span>
      </button>
    );
  };
  const unassigned = candidates.filter(
    (candidate) => !teams.some((players) => players.includes(candidate)),
  );

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {([
        { index: 1, name: "Équipe Bleue" },
        { index: 0, name: "Équipe Rouge" },
      ] as const).map(({ index, name }) => (
        <section aria-label={name} className="min-w-0" key={index}>
          <h4 className={`mb-2 flex items-center gap-2 text-xs font-bold ${index === 1 ? "text-(--team-b-blue)" : "text-(--team-a-red)"}`}>
            <span aria-hidden="true" className={`size-2 rounded-full ${index === 1 ? "bg-(--team-b-blue)" : "bg-(--team-a-red)"}`} />
            {name}
          </h4>
          <div className="grid gap-2">
            {candidates.filter((candidate) => teams[index].includes(candidate)).map(renderCandidate)}
          </div>
        </section>
      ))}
      {unassigned.length > 0 && (
        <section aria-label="Autres joueurs" className="min-w-0 sm:col-span-2">
          <h4 className="mb-2 text-xs font-bold text-(--text-secondary)">
            Autres participants
          </h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {unassigned.map(renderCandidate)}
          </div>
        </section>
      )}
    </div>
  );
}

export function MatchVoteWinners({
  winnerIds,
  teams,
  playerNames,
}: {
  winnerIds: string[];
  teams: [string[], string[]];
  playerNames: Record<string, string>;
}) {
  if (!winnerIds.length) {
    return <p className="m-0 text-sm font-semibold text-(--text-secondary)">Aucun vote enregistré</p>;
  }
  return (
    <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
      {winnerIds.map((id) => {
        const team = teams.findIndex((players) => players.includes(id));
        const teamClass =
          team === 0
            ? "border-(--team-a-red)/35 bg-(--team-a-red)/10 text-(--team-a-red)"
            : team === 1
              ? "border-(--team-b-blue)/35 bg-(--team-b-blue)/10 text-(--team-b-blue)"
              : "border-(--line) bg-(--bg-surface) text-(--text-primary)";
        return (
          <li className={`flex min-h-14 items-center gap-3 border px-4 py-3 text-sm font-bold ${teamClass}`} key={id}>
            <Trophy aria-hidden="true" size={17} />
            {playerNames[id] ?? "Joueur"}
          </li>
        );
      })}
    </ul>
  );
}
