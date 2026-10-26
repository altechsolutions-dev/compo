import {
  ArrowRight,
  Check,
  Clock3,
  MapPin,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { useState } from "react";
import type { FormEvent, MouseEvent } from "react";
import type { MatchSlot } from "../../types";
import "./MatchCard.css";

export type MatchCardProps = {
  match: MatchSlot;
  isSelected: boolean;
  currentAttendeeId: string;
  matchRegistering: boolean;
  playerNames?: Record<string, string>;
  onOpen: () => void;
  onRegister: () => void;
  onAddGuest?: (guestName: string) => void;
};

export function MatchCard({
  match,
  isSelected,
  currentAttendeeId,
  matchRegistering,
  playerNames = {},
  onOpen,
  onRegister,
  onAddGuest,
}: MatchCardProps) {
  const [isGuestFormOpen, setIsGuestFormOpen] = useState(false);
  const isSignedUp = match.attendees.includes(currentAttendeeId);
  const isFull = match.attendees.length >= match.maxPlayers;
  const isLive = match.status === "in_progress";
  const isRegistrationOpen =
    !isFull && (!match.status || match.status === "scheduled");
  const showAttendees = isRegistrationOpen;
  const liveScore = [
    match.goals?.filter((goal) => goal.team === 0).length ?? 0,
    match.goals?.filter((goal) => goal.team === 1).length ?? 0,
  ];
  const date = new Date(`${match.date}T12:00:00`);

  function handleMatchAction() {
    if (isRegistrationOpen) {
      return;
    }
    onOpen();
  }

  function stopAndOpen(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    handleMatchAction();
  }

  function handleCardClick(event: MouseEvent<HTMLElement>) {
    if (
      event.target instanceof Element &&
      event.target.closest("button, a, input, select, textarea")
    ) {
      return;
    }
    handleMatchAction();
  }

  function handleAddGuest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    const name = new FormData(event.currentTarget).get("guestName");
    if (typeof name !== "string" || !name.trim()) return;
    onAddGuest?.(name.trim());
    event.currentTarget.reset();
    setIsGuestFormOpen(false);
  }

  return (
    <article
      className={`match-card min-w-0 rounded-xl border border-solid p-4 transition-colors ${isFull ? "match-full-card border-(--team-b-blue) bg-(--bg-surface)" : isSelected || showAttendees ? "border-(--team-b-blue) bg-(--bg-surface)" : "border-(--line) bg-(--bg-surface) hover:border-(--text-secondary)"}`}
      data-testid="match-card"
      onClick={handleCardClick}
    >
      <div className="flex items-start gap-2">
        <button
          className="flex min-w-0 flex-1 cursor-pointer flex-col items-start gap-1 border-0 bg-transparent p-0 text-left text-(--ink)"
          onClick={stopAndOpen}
          type="button"
          aria-controls={`match-attendees-${match.id}`}
          aria-expanded={showAttendees}
          aria-pressed={isRegistrationOpen ? showAttendees : isSelected}
          aria-label={`${isRegistrationOpen ? "Afficher les inscrits" : "Afficher les détails"} du match du ${date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} à ${match.time}`}
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
        {isRegistrationOpen && onAddGuest && (
          <div className="group relative shrink-0">
            <button
              aria-controls={`guest-form-${match.id}`}
              aria-expanded={isGuestFormOpen}
              aria-label="Inscrire un ami"
              className="grid size-8 cursor-pointer place-items-center rounded-md border border-(--line) bg-(--bg-elevated) text-(--text-secondary) transition-colors hover:border-(--team-b-blue) hover:text-(--team-b-blue) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--team-b-blue)"
              onClick={(event) => {
                event.stopPropagation();
                setIsGuestFormOpen((open) => !open);
              }}
              title="Inscrire un ami"
              type="button"
            >
              <UserPlus aria-hidden="true" size={15} />
            </button>
            <span
              className="pointer-events-none invisible absolute right-0 top-full z-10 mt-2 whitespace-nowrap rounded bg-(--ink) px-2 py-1 text-[10px] font-semibold text-(--bg-main) opacity-0 transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
              role="tooltip"
            >
              Inscrire un ami
            </span>
          </div>
        )}
      </div>
      <button
        className="mt-3 block w-full cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap border-0 bg-transparent p-0 text-left text-base font-semibold text-(--ink)"
        onClick={stopAndOpen}
        type="button"
        aria-controls={`match-attendees-${match.id}`}
        aria-expanded={showAttendees}
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
          <Sparkles size={13} /> EN COURS · {liveScore[1]} - {liveScore[0]}
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
        {isRegistrationOpen && (
          <div
            className={`match-card__attendees ${showAttendees ? "is-expanded" : ""}`}
            id={`match-attendees-${match.id}`}
            aria-hidden={!showAttendees}
            onClick={(event) => event.stopPropagation()}
          >
            {match.attendees.length > 0 ? (
              <div
                className="flex min-h-7.5 items-center pb-4"
                aria-label="Joueurs inscrits"
              >
                {match.attendees.slice(0, 5).map((id) => {
                  const name = playerNames[id] ?? "Joueur";
                  return (
                    <span
                      className="-mr-1.25 grid size-6.25 place-items-center rounded-full border-2 border-(--line) bg-(--bg-elevated) text-[7px] font-bold text-(--text-secondary)"
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
                {match.attendees.length > 5 && (
                  <span className="ml-3 text-[10px] text-(--text-secondary)">
                    +{match.attendees.length - 5}
                  </span>
                )}
                <span className="ml-auto text-[10px] text-(--text-secondary)">
                  joueurs confirmés
                </span>
              </div>
            ) : (
              <p className="m-0 py-1 text-[10px] text-(--text-secondary)">
                Aucun joueur inscrit
              </p>
            )}
          </div>
        )}
        <button
          className={`flex min-h-10 w-full items-center justify-center gap-2 rounded-md border text-[11px] font-bold transition-colors ${isSignedUp ? "cursor-default border-(--team-b-blue)/35 bg-(--team-b-blue)/15 text-(--team-b-blue) disabled:opacity-100" : "cursor-pointer border-(--line) bg-(--bg-elevated) text-(--ink) hover:border-(--team-b-blue) hover:text-(--team-b-blue) disabled:cursor-default disabled:opacity-55"}`}
          onClick={(event) => {
            event.stopPropagation();
            if (isLive) onOpen();
            else onRegister();
          }}
          disabled={isLive ? false : isSignedUp || isFull || matchRegistering}
          type="button"
        >
          {isLive ? (
            "Voir le direct"
          ) : isSignedUp ? (
            <>
              <Check aria-hidden="true" size={14} /> Vous êtes inscrit
            </>
          ) : isFull ? (
            "Match complet"
          ) : matchRegistering ? (
            "Inscription…"
          ) : (
            "Rejoindre le match"
          )}
          {!isSignedUp && !isFull && !matchRegistering && (
            <ArrowRight size={14} />
          )}
        </button>
        {isRegistrationOpen && onAddGuest && isGuestFormOpen && (
          <form
            className="mt-3 grid gap-1.5 border-t border-(--line) pt-3"
            id={`guest-form-${match.id}`}
            onSubmit={handleAddGuest}
          >
            <label
              className="text-[10px] font-semibold text-(--text-secondary)"
              htmlFor={`guest-name-${match.id}`}
            >
              Inscrire un ami
            </label>
            <div className="flex min-w-0 gap-2">
              <input
                autoComplete="off"
                className="min-h-9 min-w-0 flex-1 rounded-md border border-(--line) bg-(--bg-surface) px-2.5 text-xs text-(--ink)"
                id={`guest-name-${match.id}`}
                maxLength={40}
                name="guestName"
                placeholder="Pseudo du joueur"
                required
              />
              <button
                className="min-h-9 cursor-pointer rounded-md border border-(--line) bg-(--bg-elevated) px-2.5 text-[10px] font-bold text-(--ink) disabled:cursor-default disabled:opacity-55"
                disabled={matchRegistering}
                type="submit"
              >
                Ajouter
              </button>
            </div>
          </form>
        )}
      </div>
    </article>
  );
}
