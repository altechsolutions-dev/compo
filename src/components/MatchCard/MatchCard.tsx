import { ArrowRight, Clock3, MapPin, Sparkles } from "lucide-react";
import type { MouseEvent } from "react";
import type { MatchSlot } from "../../types";
import "./MatchCard.css";

export type MatchCardProps = {
  match: MatchSlot;
  isSelected: boolean;
  currentAttendeeId: string;
  matchRegistering: boolean;
  onOpen: () => void;
  onRegister: () => void;
};

export function MatchCard({
  match,
  isSelected,
  currentAttendeeId,
  matchRegistering,
  onOpen,
  onRegister,
}: MatchCardProps) {
  const isSignedUp = match.attendees.includes(currentAttendeeId);
  const isFull = match.attendees.length >= match.maxPlayers;
  const isLive = match.status === "in_progress";
  const liveScore = [
    match.goals?.filter((goal) => goal.team === 0).length ?? 0,
    match.goals?.filter((goal) => goal.team === 1).length ?? 0,
  ];
  const date = new Date(`${match.date}T12:00:00`);

  function stopAndOpen(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    onOpen();
  }

  return (
    <article
      className={`match-card min-w-0 rounded-xl border border-solid p-4 transition-colors ${isFull ? "match-full-card border-(--team-b-blue) bg-(--bg-surface)" : isSelected ? "border-(--team-b-blue) bg-(--bg-surface)" : "border-(--line) bg-(--bg-surface) hover:border-(--text-secondary)"}`}
      data-testid="match-card"
      onClick={onOpen}
    >
      <button
        className="flex w-full cursor-pointer items-start justify-between gap-3 border-0 bg-transparent p-0 text-left text-(--ink)"
        onClick={stopAndOpen}
        type="button"
        aria-pressed={isSelected}
        aria-label={`Afficher les détails du match du ${date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} à ${match.time}`}
      >
        <span className="pt-0.5 text-[9px] font-bold uppercase tracking-[0.7px] text-(--team-b-blue)">
          {new Intl.DateTimeFormat("fr-FR", {
            weekday: "short",
            day: "numeric",
            month: "long",
          })
            .format(date)
            .replace(".", "")}
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-[10px] text-(--text-secondary)">
          <Clock3 size={12} /> {match.time}
        </span>
      </button>
      <button
        className="mt-3 block w-full cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap border-0 bg-transparent p-0 text-left text-base font-semibold text-(--ink) hover:text-(--team-b-blue)"
        onClick={stopAndOpen}
        type="button"
      >
        Match de foot à 5
      </button>
      <p className="mt-2 flex min-w-0 items-center gap-1.5 text-[11px] text-(--text-secondary)">
        <MapPin className="shrink-0" size={13} />
        <span className="overflow-hidden text-ellipsis whitespace-nowrap">
          {match.venue}
        </span>
      </p>
      {isLive ? (
        <p className="match-full-badge mt-3 flex min-h-8 items-center gap-2 border border-(--status-success) px-2.5 text-[9px] font-bold tracking-[0.7px] text-(--status-success)">
          <Sparkles size={13} /> EN COURS · {liveScore[0]} - {liveScore[1]}
        </p>
      ) : isFull ? (
        <p className="match-full-badge mt-3 flex min-h-8 items-center gap-2 border border-(--team-b-blue) px-2.5 text-[9px] font-bold tracking-[0.7px] text-(--team-b-blue)">
          <Sparkles size={13} /> COMPLET · COMPO DISPONIBLE
        </p>
      ) : null}
      <div className="mt-4 border-t border-(--line) pt-3.5">
        <div className="mb-2.5 flex items-center justify-between text-[10px] text-(--text-secondary)">
          <span>Places réservées</span>
          <strong className="text-(--ink)">
            {match.attendees.length}/{match.maxPlayers}
          </strong>
        </div>
        <div
          className="mb-3.5 h-1.5 overflow-hidden rounded-full bg-(--bg-elevated)"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={match.maxPlayers}
          aria-valuenow={match.attendees.length}
          aria-label={`${match.attendees.length} joueurs inscrits sur ${match.maxPlayers}`}
        >
          <span
            className="block h-full rounded-full bg-(--team-b-blue)"
            style={{
              width: `${Math.min((match.attendees.length / match.maxPlayers) * 100, 100)}%`,
            }}
          />
        </div>
        <button
          className="flex min-h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-(--line) bg-(--bg-elevated) text-[11px] font-bold text-(--ink) transition-colors hover:border-(--team-b-blue) hover:text-(--team-b-blue) disabled:cursor-default disabled:opacity-55"
          onClick={(event) => {
            event.stopPropagation();
            if (isLive) onOpen();
            else onRegister();
          }}
          disabled={isLive ? false : isSignedUp || isFull || matchRegistering}
          type="button"
        >
          {isLive
            ? "Voir le direct"
            : isSignedUp
              ? "Vous êtes inscrit"
              : isFull
                ? "Match complet"
                : matchRegistering
                  ? "Inscription…"
                  : "Rejoindre le match"}
          {!isSignedUp && !isFull && !matchRegistering && (
            <ArrowRight size={14} />
          )}
        </button>
      </div>
    </article>
  );
}
