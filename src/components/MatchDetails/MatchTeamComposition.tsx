import { useState } from "react";
import { ArrowLeftRight, Check, CircleDot, Pencil, Shirt } from "lucide-react";
import type { MatchSlot } from "../../types";

type MatchTeamCompositionProps = {
  isFull: boolean;
  match: MatchSlot;
  onSaveTeams?: (teams: [string[], string[]]) => Promise<boolean>;
  onStartMatch?: (teams: [string[], string[]]) => void;
  playerNames: Record<string, string>;
  teams: [string[], string[]];
};

export function MatchTeamComposition({
  isFull,
  match,
  onSaveTeams,
  onStartMatch,
  playerNames,
  teams: initialTeams,
}: MatchTeamCompositionProps) {
  const [teams, setTeams] = useState<[string[], string[]]>(initialTeams);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState<
    [string | null, string | null]
  >([null, null]);
  const [isSaving, setIsSaving] = useState(false);
  const isEditable = isFull && match.status !== "in_progress" && onStartMatch;

  function selectPlayer(teamIndex: number, playerId: string) {
    setSelectedPlayers((current) => {
      const next = [...current] as [string | null, string | null];
      next[teamIndex] = next[teamIndex] === playerId ? null : playerId;
      return next;
    });
  }

  async function swapSelectedPlayers() {
    const [redPlayerId, bluePlayerId] = selectedPlayers;
    if (!redPlayerId || !bluePlayerId || isSaving) return;
    const nextTeams = [...teams] as [string[], string[]];
    const redIndex = nextTeams[0].indexOf(redPlayerId);
    const blueIndex = nextTeams[1].indexOf(bluePlayerId);
    nextTeams[0][redIndex] = bluePlayerId;
    nextTeams[1][blueIndex] = redPlayerId;

    setIsSaving(true);
    const saved = onSaveTeams ? await onSaveTeams(nextTeams) : true;
    setIsSaving(false);
    if (!saved) return;

    setTeams(nextTeams);
    setSelectedPlayers([null, null]);
  }

  return (
    <section className="match-drawer-line mt-4.75 border-t border-white/15 pt-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="m-0 text-sm font-bold text-(--ink)">
          Composition du match
        </h3>
        <div className="flex items-center gap-3">
          {isFull && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-(--status-success)">
              <Check size={14} /> COMPLET
            </span>
          )}
          {isEditable && (
            <button
              aria-pressed={isEditing}
              className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md border border-(--line) bg-(--bg-surface) px-2.5 text-xs font-semibold text-(--text-primary) hover:border-(--team-b-blue)"
              onClick={() => {
                setIsEditing((editing) => !editing);
                setSelectedPlayers([null, null]);
              }}
              type="button"
            >
              {isEditing ? <Check size={13} /> : <Pencil size={13} />}
              {isEditing ? "Terminer" : "Modifier"}
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3.5">
        {teams.map((team, teamIndex) => (
          <div className="min-w-0" key={teamIndex}>
            <h4
              className={`mb-2.5 flex items-center gap-1.5 text-xs font-semibold ${teamIndex === 0 ? "text-(--team-a-red)" : "text-(--team-b-blue)"}`}
            >
              <Shirt
                size={14}
                color={
                  teamIndex === 0 ? "var(--team-a-red)" : "var(--team-b-blue)"
                }
                aria-hidden="true"
              />
              Équipe {teamIndex === 0 ? "A" : "B"}
            </h4>
            {team.map((id, playerIndex) => {
              const selected = selectedPlayers[teamIndex] === id;
              const teamColorClass =
                teamIndex === 0
                  ? selected
                    ? "border-(--team-a-red) bg-(--team-a-red)/20 text-(--team-a-red)"
                    : "border-(--team-a-red)/25 bg-(--team-a-red)/5 text-(--team-a-red)"
                  : selected
                    ? "border-(--team-b-blue) bg-(--team-b-blue)/20 text-(--team-b-blue)"
                    : "border-(--team-b-blue)/25 bg-(--team-b-blue)/5 text-(--team-b-blue)";

              return (
                <div
                  className={`mb-1.5 flex min-h-9 w-full items-center overflow-hidden rounded-sm border px-2 py-1.5 text-xs font-semibold ${teamColorClass} ${isEditing && !selected ? "hover:brightness-110" : ""}`}
                  key={id}
                >
                  {isEditing ? (
                    <button
                      aria-pressed={selected}
                      aria-label={`Sélectionner ${playerNames[id] ?? `Joueur ${playerIndex + 1}`} dans l'équipe ${teamIndex === 0 ? "A" : "B"}`}
                      className="flex min-w-0 flex-1 items-center justify-between gap-1.5 overflow-hidden text-left"
                      onClick={() => selectPlayer(teamIndex, id)}
                      type="button"
                    >
                      <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {playerNames[id] ?? `Joueur ${playerIndex + 1}`}
                      </span>
                      <span
                        aria-hidden="true"
                        className={`grid size-4 shrink-0 place-items-center rounded-[3px] border ${selected ? "border-current bg-current/15" : "border-current/60"}`}
                      >
                        {selected && <Check size={12} />}
                      </span>
                    </button>
                  ) : (
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                      {playerNames[id] ?? `Joueur ${playerIndex + 1}`}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div
        aria-hidden={!isEditing}
        className={`mt-3 min-h-25 border-t border-(--line) pt-3 ${isEditing ? "visible" : "invisible pointer-events-none"}`}
      >
        <p className="mb-3 text-center text-xs text-(--text-primary)">
          Cochez un joueur dans chaque équipe
        </p>
        <button
          aria-label="Échanger les joueurs sélectionnés"
          className="mx-auto flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-(--line) bg-(--bg-elevated) px-4 text-sm font-bold text-(--text-primary) transition-colors enabled:hover:border-(--team-b-blue) enabled:hover:text-(--team-b-blue) disabled:cursor-not-allowed disabled:opacity-45"
          disabled={
            !isEditing || isSaving || !selectedPlayers[0] || !selectedPlayers[1]
          }
          onClick={swapSelectedPlayers}
          type="button"
        >
          <ArrowLeftRight aria-hidden="true" size={17} />
          {isSaving ? "Enregistrement…" : "Échanger"}
        </button>
      </div>
      {isFull && match.status !== "in_progress" && onStartMatch && (
        <button
          className="mt-4 flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-md border-0 bg-(--team-b-blue) text-sm font-bold text-(--bg-main) hover:brightness-110"
          onClick={() => onStartMatch(teams)}
          type="button"
        >
          <CircleDot size={17} /> Lancer le match
        </button>
      )}
    </section>
  );
}
