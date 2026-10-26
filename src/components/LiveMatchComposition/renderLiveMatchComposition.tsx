import { useState } from "react";
import type { ReactNode } from "react";
import { ArrowLeftRight, Check, Pencil, Shirt, X } from "lucide-react";

export type LiveMatchCompositionOptions = {
  teams: [string[], string[]];
  playerNames: Record<string, string>;
  onClose: () => void;
  onSaveTeams?: (teams: [string[], string[]]) => Promise<boolean>;
  isEditable?: boolean;
};

export function LiveMatchComposition({
  teams,
  playerNames,
  onClose,
  onSaveTeams,
  isEditable = false,
}: LiveMatchCompositionOptions): ReactNode {
  return (
    <LiveMatchCompositionView
      teams={teams}
      playerNames={playerNames}
      onClose={onClose}
      onSaveTeams={onSaveTeams}
      isEditable={isEditable}
    />
  );
}

function LiveMatchCompositionView({
  teams: initialTeams,
  playerNames,
  onClose,
  onSaveTeams,
  isEditable,
}: LiveMatchCompositionOptions) {
  const [teams, setTeams] = useState<[string[], string[]]>(initialTeams);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState<
    [string | null, string | null]
  >([null, null]);
  const [isSaving, setIsSaving] = useState(false);

  function selectPlayer(teamIndex: number, playerId: string) {
    setSelectedPlayers((current) => {
      const next = [...current] as [string | null, string | null];
      next[teamIndex] = next[teamIndex] === playerId ? null : playerId;
      return next;
    });
  }

  async function swapSelectedPlayers() {
    const [redPlayerId, bluePlayerId] = selectedPlayers;
    if (!redPlayerId || !bluePlayerId || isSaving || !onSaveTeams) return;

    const nextTeams = [...teams] as [string[], string[]];
    const redIndex = nextTeams[0].indexOf(redPlayerId);
    const blueIndex = nextTeams[1].indexOf(bluePlayerId);
    if (redIndex < 0 || blueIndex < 0) return;
    nextTeams[0][redIndex] = bluePlayerId;
    nextTeams[1][blueIndex] = redPlayerId;

    setIsSaving(true);
    const saved = await onSaveTeams(nextTeams);
    setIsSaving(false);
    if (!saved) return;

    setTeams(nextTeams);
    setSelectedPlayers([null, null]);
  }

  return (
    <>
      <div className="mb-7 flex items-center justify-between gap-4 border-b border-(--line) pb-4">
        <div>
          <p className="drawer-eyebrow mb-1">
            {isEditable ? "AVANT LE COUP D’ENVOI" : "COMPOSITION DU MATCH"}
          </p>
          <h2
            className="drawer-title live-match-composition-title m-0"
            id="match-composition-title"
          >
            Composition du match
          </h2>
        </div>
        <button
          aria-label="Fermer la composition"
          className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-md border border-(--line) bg-(--bg-surface) text-(--text-primary)"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" size={18} />
        </button>
      </div>
      {isEditable && (
        <div className="mb-4 flex justify-end">
          <button
            aria-pressed={isEditing}
            className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-(--line) bg-(--bg-elevated) px-3 text-xs font-semibold text-(--text-primary)"
            onClick={() => {
              setIsEditing((editing) => !editing);
              setSelectedPlayers([null, null]);
            }}
            type="button"
          >
            {isEditing ? <Check size={14} /> : <Pencil size={14} />}
            {isEditing ? "Terminer" : "Modifier la composition"}
          </button>
        </div>
      )}
      <div className="grid gap-3.5 sm:grid-cols-2">
        {([1, 0] as const).map((teamIndex) => {
          const teamPlayers = teams[teamIndex];
          const isRedTeam = teamIndex === 0;
          return (
            <section
              aria-label={`Équipe ${isRedTeam ? "rouge" : "bleue"}`}
              className="min-w-0"
              key={teamIndex}
            >
              <h3
                className={`mb-2.5 mt-0 flex items-center gap-1.5 text-xs font-semibold ${isRedTeam ? "text-(--team-a-red)" : "text-(--team-b-blue)"}`}
              >
                <Shirt
                  aria-hidden="true"
                  color={isRedTeam ? "var(--team-a-red)" : "var(--team-b-blue)"}
                  size={14}
                />
                Équipe {isRedTeam ? "rouge" : "bleue"}
              </h3>
              <ul className="m-0 list-none p-0">
                {teamPlayers.map((id) => (
                  <li className="m-0" key={id}>
                    <button
                      aria-label={
                        isEditing
                          ? `Sélectionner ${playerNames[id] ?? "Joueur"} dans l'équipe ${isRedTeam ? "rouge" : "bleue"}`
                          : undefined
                      }
                      aria-pressed={
                        isEditing && selectedPlayers[teamIndex] === id
                      }
                      className={`mb-1.5 flex min-h-9 w-full items-center justify-between gap-1.5 overflow-hidden rounded-sm border px-2 py-1.5 text-left text-xs font-semibold transition-colors ${isRedTeam ? (selectedPlayers[teamIndex] === id ? "border-(--team-a-red) bg-(--team-a-red)/20 text-(--team-a-red)" : "border-(--team-a-red)/25 bg-(--team-a-red)/5 text-(--team-a-red) hover:brightness-110") : selectedPlayers[teamIndex] === id ? "border-(--team-b-blue) bg-(--team-b-blue)/20 text-(--team-b-blue)" : "border-(--team-b-blue)/25 bg-(--team-b-blue)/5 text-(--team-b-blue) hover:brightness-110"}`}
                      disabled={!isEditing}
                      onClick={() => selectPlayer(teamIndex, id)}
                      type="button"
                    >
                      <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                        {playerNames[id] ?? "Joueur"}
                      </span>
                      <span
                        aria-hidden="true"
                        className={`grid size-4.5 shrink-0 place-items-center rounded-[3px] border ${isEditing ? "visible" : "invisible"} ${selectedPlayers[teamIndex] === id ? "border-current bg-current/15" : "border-current/60"}`}
                      >
                        {selectedPlayers[teamIndex] === id && (
                          <Check size={12} />
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        {isEditing && (
          <div className="col-span-full mt-4 w-full border-t border-(--line) pt-4">
            <p className="mb-3 text-center text-[11px] text-(--text-secondary)">
              Cochez un joueur dans chaque équipe pour les échanger
            </p>
            <button
              aria-label="Échanger les joueurs sélectionnés"
              className="mx-auto flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-(--line) bg-(--bg-elevated) px-4 text-xs font-bold text-(--text-primary) disabled:cursor-not-allowed disabled:opacity-45"
              disabled={!selectedPlayers[0] || !selectedPlayers[1] || isSaving}
              onClick={() => void swapSelectedPlayers()}
              type="button"
            >
              <ArrowLeftRight aria-hidden="true" size={17} />
              {isSaving ? "Enregistrement…" : "Échanger"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
