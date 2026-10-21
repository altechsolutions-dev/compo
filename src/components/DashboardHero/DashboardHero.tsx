import { Plus } from "lucide-react";
import "./DashboardHero.css";

export type DashboardView = "matches" | "organization";

export type DashboardHeroProps = {
  organization: string;
  matchCount: number;
  activeView: DashboardView;
  onCreateMatch: () => void;
};

export function DashboardHero({
  organization,
  matchCount,
  activeView,
  onCreateMatch,
}: DashboardHeroProps) {
  return (
    <section className="dashboard-hero relative flex min-h-82 items-center justify-between gap-8 border-b border-(--line) py-10 max-[680px]:min-h-0 max-[680px]:items-start max-[680px]:gap-4 max-[680px]:py-9">
      <div>
        <p className="mb-4 flex items-center gap-2 text-[10px] font-bold tracking-[1.7px] text-(--muted) max-[680px]:text-[9px]">
          <span className="size-1.5 rounded-full bg-(--status-success)" />
          {organization.toUpperCase()} · {matchCount} MATCH
          {matchCount === 1 ? "" : "S"} AU PROGRAMME
        </p>
        <h1
          className="m-0 font-sans text-[64px] font-bold leading-[0.98] max-[900px]:text-[54px] max-[680px]:text-[42px] max-[380px]:text-[36px]"
          aria-label={
            activeView === "matches"
              ? "Ton équipe. Ton terrain."
              : "Ton équipe. Ton collectif."
          }
        >
          {activeView === "matches" ? (
            <>
              Ton équipe.
              <br />
              <em className="not-italic">
                Ton <span className="text-(--team-b-blue)">terrain.</span>
              </em>
            </>
          ) : (
            <>
              Ton équipe.
              <br />
              <em className="not-italic">
                Ton <span className="text-(--team-b-blue)">collectif.</span>
              </em>
            </>
          )}
        </h1>
        <p className="mb-0 mt-5 max-w-120 text-sm leading-relaxed text-(--text-secondary) max-[680px]:mt-4 max-[680px]:text-xs">
          Trouve un match près de chez toi, choisis ton équipe et viens jouer.
          Simplement.
        </p>
      </div>
      {activeView === "matches" && (
        <button
          className="inline-flex min-h-12 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border-0 bg-(--team-b-blue) px-5 text-sm font-bold text-(--bg-main) transition duration-150 hover:-translate-y-px hover:brightness-110 max-[680px]:size-11 max-[680px]:min-w-11 max-[680px]:self-end max-[680px]:p-0 [&>svg]:max-[680px]:shrink-0 [&>span]:max-[680px]:sr-only"
          onClick={onCreateMatch}
          type="button"
        >
          <Plus size={18} /> <span>Créer un match</span>
        </button>
      )}
    </section>
  );
}
