import { useEffect } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Check, CircleDot, MapPin, Shirt, X } from "lucide-react";
import type { MatchSlot } from "../../types";
import { LiveMatchPanel } from "../LiveMatchPanel/LiveMatchPanel";
import "./MatchDrawer.css";

export type MatchDrawerProps = {
  match: MatchSlot;
  mounted: boolean;
  open: boolean;
  isFull: boolean;
  isRegistered: boolean;
  isRegistering: boolean;
  teams?: [string[], string[]];
  playerNames: Record<string, string>;
  onClose: () => void;
  onRegister: () => void;
  onStartMatch?: (teams: [string[], string[]]) => void;
  onRecordGoal?: (scorerId: string) => void;
};

function formatMatchDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${value}T12:00:00`));
}

export function MatchDrawer({
  match,
  mounted,
  open,
  isFull,
  isRegistered,
  isRegistering,
  teams,
  playerNames,
  onClose,
  onRegister,
  onStartMatch,
  onRecordGoal,
}: MatchDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  if (!mounted) return null;

  const spotsRemaining = match.maxPlayers - match.attendees.length;

  return createPortal(
    <div
      className={`match-drawer-backdrop fixed inset-0 z-20 flex justify-end ${open ? "is-open" : ""}`}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        className={`match-drawer-panel h-full w-full max-w-180 overflow-y-auto border-l border-(--line) bg-(--bg-main) p-8 text-(--text-primary) shadow-[-18px_0_48px_#0005] max-[600px]:max-w-full max-[600px]:border-l-0 max-[600px]:p-5 [&>h2]:mb-2.25 [&>h2]:font-sans [&>h2]:text-2xl [&>h2]:font-normal [&>h2_span]:text-[#9bb5a4] ${open ? "is-open" : ""}`}
        aria-label="Détails du match sélectionné"
        role="dialog"
        aria-modal="true"
        aria-labelledby="match-drawer-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-5.5 flex items-center justify-between">
          <span className="text-[9px] font-bold tracking-[1.5px] text-(--text-secondary)">
            {match.status === "in_progress"
              ? "MATCH EN COURS"
              : isFull
                ? "MATCH COMPLET"
                : "PROCHAIN MATCH"}
          </span>
          <button
            className="grid size-9 cursor-pointer place-items-center rounded-md border border-(--line) bg-(--bg-surface) text-(--ink)"
            onClick={onClose}
            type="button"
            aria-label="Fermer les détails du match"
          >
            <X size={17} />
          </button>
        </div>
        <p className="mb-2 text-xs capitalize text-(--text-secondary)">
          {formatMatchDate(match.date)}
        </p>
        <h2 id="match-drawer-title">
          {match.time}
          <span> · </span> Foot à 5
        </h2>
        <p className="m-0 flex items-center gap-1.75 text-[11px] text-(--text-secondary)">
          <MapPin className="shrink-0 text-(--team-b-blue)" size={15} />
          {match.venue}
        </p>

        <div className="mt-6 border-t border-white/15 pt-4.25">
          <div className="mb-2.25 flex items-center justify-between text-[11px] text-(--text-secondary)">
            <span>Inscriptions</span>
            <strong className="text-xs text-white">
              {match.attendees.length}
              <span className="font-normal text-(--text-secondary)">
                {" "}
                / {match.maxPlayers}
              </span>
            </strong>
          </div>
          <div
            className="h-1 overflow-hidden bg-(--border-neutral) [&>span]:block [&>span]:h-full [&>span]:bg-(--team-b-blue) [&>span]:transition-[width] [&>span]:duration-200"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={match.maxPlayers}
            aria-valuenow={match.attendees.length}
            aria-label={`${match.attendees.length} joueurs inscrits sur ${match.maxPlayers}`}
          >
            <span
              style={{
                width: `${Math.min((match.attendees.length / match.maxPlayers) * 100, 100)}%`,
              }}
            />
          </div>
          <div className="mt-3 flex min-h-7.5 items-center">
            {match.attendees.slice(0, 5).map((id) => {
              const name = playerNames[id] ?? "Joueur";
              return (
                <span
                  className="-mr-1.25 grid size-6.25 place-items-center rounded-full border-2 border-(--border-neutral) bg-(--bg-elevated) text-[7px] font-bold text-(--text-secondary)"
                  key={id}
                  title={name}
                >
                  {name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")}
                </span>
              );
            })}
            <span className="ml-3 text-[10px] text-(--text-secondary)">
              {match.attendees.length > 5
                ? `+${match.attendees.length - 5}`
                : ""}
            </span>
            <span className="ml-auto text-[10px] text-(--text-secondary)">
              joueurs confirmés
            </span>
          </div>
        </div>

        {match.status === "in_progress" && match.startedAt && teams ? (
          <LiveMatchPanel
            startedAt={match.startedAt}
            teams={teams}
            goals={match.goals ?? []}
            playerNames={playerNames}
            onRecordGoal={onRecordGoal ?? (() => undefined)}
          />
        ) : teams ? (
          <section className="match-drawer-line mt-4.75 border-t border-white/15 pt-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="m-0 text-sm font-bold text-(--ink)">
                Composition du match
              </h3>
              {isFull && (
                <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-(--status-success)">
                  <Check size={13} /> COMPLET
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3.5">
              {teams.map((team, index) => (
                <div className="min-w-0" key={index}>
                  <h4 className="mb-2.25 flex items-center gap-1.5 text-[10px] font-semibold text-[#f5f7f3]">
                    <Shirt
                      size={14}
                      color={
                        index === 0 ? "var(--team-a-red)" : "var(--team-b-blue)"
                      }
                      aria-hidden="true"
                    />
                    Équipe {index === 0 ? "A" : "B"}
                  </h4>
                  {team.map((id, playerIndex) => (
                    <p
                      className="mb-1.5 overflow-hidden text-ellipsis whitespace-nowrap text-[9px] text-(--text-secondary)"
                      key={id}
                    >
                      {playerNames[id] ?? `Joueur ${playerIndex + 1}`}
                    </p>
                  ))}
                </div>
              ))}
            </div>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-[9px] text-(--status-success)">
              <Check size={14} /> Équipes équilibrées selon les stats
            </p>
            {isFull && match.status !== "in_progress" && onStartMatch && (
              <button
                className="mt-4 flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md border-0 bg-(--team-b-blue) text-xs font-bold text-(--bg-main) hover:brightness-110"
                onClick={() => onStartMatch(teams)}
                type="button"
              >
                <CircleDot size={15} /> Lancer le match
              </button>
            )}
          </section>
        ) : isFull ? (
          <p className="mt-4.75 text-center text-[10px] text-(--text-secondary)">
            Ce match est complet.
          </p>
        ) : (
          <button
            className="mt-5.5 flex min-h-10.5 w-full cursor-pointer items-center justify-center gap-2.25 rounded-[3px] border-0 bg-(--team-b-blue) text-xs font-bold text-(--bg-main) transition-colors hover:brightness-110 disabled:cursor-default disabled:bg-(--bg-elevated) disabled:text-(--text-secondary)"
            onClick={onRegister}
            disabled={isRegistered || isRegistering}
            type="button"
          >
            {isRegistered ? (
              <>
                <Check size={16} /> Vous êtes inscrit
              </>
            ) : (
              <>
                {isRegistering ? "Inscription…" : "Je m'inscris"}
                {!isRegistering && <ArrowRight size={16} />}
              </>
            )}
          </button>
        )}
        <p className="mt-2.5 text-center text-[10px] text-(--text-secondary)">
          {isFull
            ? `Les ${match.maxPlayers} places sont prises.`
            : `Encore ${spotsRemaining} place${spotsRemaining > 1 ? "s" : ""} disponible${spotsRemaining > 1 ? "s" : ""}`}
        </p>
      </aside>
    </div>,
    document.body,
  );
}
