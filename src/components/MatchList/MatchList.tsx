import { CalendarDays } from "lucide-react";
import { MatchCard } from "../MatchCard/MatchCard";
import type { MatchSlot } from "../../types";
import "./MatchList.css";

export type MatchFilter = "all" | "available" | "finished";

export type MatchListProps = {
  matches: MatchSlot[];
  totalMatchCount: number;
  selectedMatchId?: string;
  currentAttendeeId: string;
  matchRegistering: boolean;
  playerNames?: Record<string, string>;
  filter: MatchFilter;
  notice: string;
  latestFinishedMatch?: MatchSlot;
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
  playerNames = {},
  filter,
  notice,
  latestFinishedMatch,
  onFilterChange,
  onOpenMatch,
  onRegister,
}: MatchListProps) {
  return (
    <section className="match-list min-w-0" aria-labelledby="match-list-title">
      {filter !== "finished" && latestFinishedMatch && (
        <div className="mb-6 border-y border-(--line) py-4">
          <p className="mb-3 text-[9px] font-bold tracking-[1.5px] text-(--text-secondary)">
            DERNIER RÉSULTAT
          </p>
          <FinishedMatchCard
            match={latestFinishedMatch}
            onOpen={() => onOpenMatch(latestFinishedMatch.id)}
            featured
          />
        </div>
      )}
      <div className="mb-4 flex items-end justify-between gap-4 max-[500px]:items-start">
        <div>
          <p className="mb-1.5 text-[9px] font-bold tracking-[1.5px] text-(--muted)">
            AVEC TON ÉQUIPE
          </p>
          <h2
            className="m-0 font-sans text-2xl font-bold text-(--ink) max-[500px]:text-xl"
            id="match-list-title"
          >
            {filter === "finished" ? "Matchs terminés" : "Prochains matchs"}
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
          <button
            className={`min-h-8 cursor-pointer rounded-[5px] border-0 px-3 text-[10px] font-semibold transition-colors ${filter === "finished" ? "bg-(--bg-elevated) text-(--ink)" : "bg-transparent text-(--muted) hover:text-(--ink)"}`}
            onClick={() => onFilterChange("finished")}
            aria-pressed={filter === "finished"}
            type="button"
          >
            Terminés
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
              ? filter === "finished"
                ? "Aucun match terminé pour le moment."
                : "Aucun match prévu pour le moment."
              : "Tous les matchs sont complets."}
          </p>
        </div>
      ) : (
        <div className="match-list__grid grid grid-cols-3 gap-3.5 max-[900px]:grid-cols-2 max-[600px]:grid-cols-1">
          {matches.map((match) =>
            filter === "finished" ? (
              <FinishedMatchCard
                key={match.id}
                match={match}
                onOpen={() => onOpenMatch(match.id)}
              />
            ) : (
              <MatchCard
                key={match.id}
                match={match}
                isSelected={selectedMatchId === match.id}
                currentAttendeeId={currentAttendeeId}
                matchRegistering={matchRegistering}
                playerNames={playerNames}
                onOpen={() => onOpenMatch(match.id)}
                onRegister={() => onRegister(match.id)}
              />
            ),
          )}
        </div>
      )}
    </section>
  );
}

function FinishedMatchCard({
  match,
  onOpen,
  featured = false,
}: {
  match: MatchSlot;
  onOpen: () => void;
  featured?: boolean;
}) {
  const goals = match.goals ?? [];
  const redScore = goals.filter((goal) => goal.team === 0).length;
  const blueScore = goals.filter((goal) => goal.team === 1).length;
  const date = new Date(`${match.date}T12:00:00`);
  const elapsedMinutes = Math.floor((match.elapsedSeconds ?? 0) / 60);
  const elapsedRemainder = String((match.elapsedSeconds ?? 0) % 60).padStart(
    2,
    "0",
  );
  const winnerTeam = featured
    ? redScore > blueScore
      ? "red"
      : blueScore > redScore
        ? "blue"
        : undefined
    : undefined;

  return (
    <article
      className={`min-w-0 rounded-lg border border-(--line) bg-(--bg-surface) p-4 ${winnerTeam ? "match-list__winner-gradient" : ""} ${featured ? "sm:flex sm:items-center sm:justify-between sm:gap-5" : ""}`}
      data-winner={winnerTeam}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-(--text-secondary)">
              {new Intl.DateTimeFormat("fr-FR", {
                weekday: "short",
                day: "numeric",
                month: "long",
              })
                .format(date)
                .replace(".", "")}{" "}
              · {match.time}
            </p>
            <h3 className="mb-0 mt-2 truncate text-sm font-bold text-(--text-primary)">
              {match.venue}
            </h3>
          </div>
          <span className="shrink-0 font-mono text-xl font-bold tabular-nums">
            <span className="text-(--team-b-blue)">{blueScore}</span>
            <span className="px-1.5 text-(--text-secondary)">–</span>
            <span className="text-(--team-a-red)">{redScore}</span>
          </span>
        </div>
        <p className="mb-0 mt-2 font-mono text-xs tabular-nums text-(--text-secondary)">
          Chrono · {elapsedMinutes}:{elapsedRemainder}
        </p>
      </div>
      <button
        className="mt-4 min-h-10 w-full cursor-pointer rounded-md border border-(--line) bg-(--bg-elevated) text-xs font-bold text-(--text-primary) hover:border-(--team-b-blue) sm:w-auto sm:px-4"
        onClick={onOpen}
        type="button"
      >
        Voir le résumé
      </button>
    </article>
  );
}
