import type { ReactNode } from "react";
import { X } from "lucide-react";

export type LiveMatchCompositionOptions = {
  teams: [string[], string[]];
  playerNames: Record<string, string>;
  onClose: () => void;
};

export function renderLiveMatchComposition({
  teams,
  playerNames,
  onClose,
}: LiveMatchCompositionOptions): ReactNode {
  return (
    <>
      <div className="mb-7 flex items-center justify-between gap-4 border-b border-(--line) pb-4">
        <div>
          <p className="mb-1 text-[9px] font-bold tracking-[1.5px] text-(--text-secondary)">
            AVANT LE COUP D’ENVOI
          </p>
          <h2 className="m-0 text-xl font-bold" id="match-composition-title">
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
      <div className="grid gap-4">
        {teams.map((teamPlayers, teamIndex) => {
          const isRedTeam = teamIndex === 0;
          return (
            <section
              aria-label={`Équipe ${isRedTeam ? "rouge" : "bleue"}`}
              className={`rounded-md border p-4 ${isRedTeam ? "border-(--team-a-red)/25 bg-(--team-a-red)/5" : "border-(--team-b-blue)/25 bg-(--team-b-blue)/5"}`}
              key={teamIndex}
            >
              <h3
                className={`mb-3 mt-0 text-sm font-bold uppercase ${isRedTeam ? "text-(--team-a-red)" : "text-(--team-b-blue)"}`}
              >
                Équipe {isRedTeam ? "rouge" : "bleue"}
              </h3>
              <ul className="m-0 grid list-none gap-1 p-0 text-sm text-(--text-primary)">
                {teamPlayers.map((id) => (
                  <li className="border-t border-(--line) py-3" key={id}>
                    {playerNames[id] ?? "Joueur"}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
