import { CalendarDays } from "lucide-react";
import { MatchCard } from "../MatchCard/MatchCard";
import type { MatchSlot } from "../../types";
import "./MatchList.css";

export type MatchFilter = "all" | "available";

export type MatchListProps = {
  matches: MatchSlot[];
  totalMatchCount: number;
  selectedMatchId?: string;
  currentAttendeeId: string;
  matchRegistering: boolean;
  filter: MatchFilter;
  notice: string;
  onFilterChange: (filter: MatchFilter) => void;
  onOpenMatch: (matchId: string) => void;
  onRegister: (matchId: string) => void;
};

export function MatchList({
  matches,
  totalMatchCount,
  selectedMatchId,
  currentAttendeeId,
  matchRegistering,
  filter,
  notice,
  onFilterChange,
  onOpenMatch,
  onRegister,
}: MatchListProps) {
  return (
    <section className="match-list min-w-0" aria-labelledby="match-list-title">
      <div className="mb-4 flex items-end justify-between gap-4 max-[500px]:items-start">
        <div>
          <p className="mb-1.5 text-[9px] font-bold tracking-[1.5px] text-(--muted)">
            AVEC TON ÉQUIPE
          </p>
          <h2
            className="m-0 font-sans text-2xl font-bold text-(--ink) max-[500px]:text-xl"
            id="match-list-title"
          >
            Prochains matchs
          </h2>
        </div>
        <div
          className="flex shrink-0 items-center gap-1 rounded-[7px] bg-(--bg-surface) p-1"
          role="group"
          aria-label="Filtrer les matchs"
        >
          <button
            className={`min-h-8 cursor-pointer rounded-[5px] border-0 px-3 text-[10px] font-semibold transition-colors ${filter === "all" ? "bg-(--bg-elevated) text-(--ink)" : "bg-transparent text-(--muted) hover:text-(--ink)"}`}
            onClick={() => onFilterChange("all")}
            aria-pressed={filter === "all"}
            type="button"
          >
            Tous
          </button>
          <button
            className={`min-h-8 cursor-pointer rounded-[5px] border-0 px-3 text-[10px] font-semibold transition-colors ${filter === "available" ? "bg-(--bg-elevated) text-(--ink)" : "bg-transparent text-(--muted) hover:text-(--ink)"}`}
            onClick={() => onFilterChange("available")}
            aria-pressed={filter === "available"}
            type="button"
          >
            Places libres
          </button>
        </div>
      </div>
      {notice && (
        <p
          className="my-3.5 wrap-anywhere text-[11px] leading-1.5 text-(--status-success)"
          role="alert"
        >
          {notice}
        </p>
      )}
      {matches.length === 0 ? (
        <div className="match-list__empty grid min-h-32.5 place-content-center justify-items-center gap-2.5 border-y border-(--line) text-center text-(--muted) [&>p]:m-0 [&>p]:max-w-62.5 [&>p]:text-xs">
          <CalendarDays size={24} />
          <p>
            {totalMatchCount === 0
              ? "Aucun match prévu pour le moment."
              : "Tous les matchs sont complets."}
          </p>
        </div>
      ) : (
        <div className="match-list__grid grid grid-cols-3 gap-3.5 max-[900px]:grid-cols-2 max-[600px]:grid-cols-1">
          {matches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              isSelected={selectedMatchId === match.id}
              currentAttendeeId={currentAttendeeId}
              matchRegistering={matchRegistering}
              onOpen={() => onOpenMatch(match.id)}
              onRegister={() => onRegister(match.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
