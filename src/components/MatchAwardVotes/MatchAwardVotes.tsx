import { useEffect, useRef, useState, type ReactNode } from "react";
import { Trophy } from "lucide-react";
import { supabase } from "../../lib/supabase/supabase";
import { matchVoteLeader } from "../../lib/matchVoteLeader/matchVoteLeader";
import { MatchVoteCandidates, MatchVoteWinners } from "../MatchDetails/MatchVoteCandidates";

type Category = "butcher" | "missed_chances" | "defender" | "goalkeeper";
type Poll = {
  category: Category;
  my_vote: string | null;
  vote_totals: { candidate_id: string; vote_count: number }[];
  vote_count: number;
  eligible_voter_count: number;
  is_complete: boolean;
  winner_ids: string[];
};

const categories: { id: Category; label: string }[] = [
  { id: "defender", label: "Meilleur défenseur" },
  { id: "goalkeeper", label: "Meilleur gardien" },
  { id: "butcher", label: "Plus gros boucher" },
  { id: "missed_chances", label: "Plus d’occasions ratées" },
];

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Erreur inconnue.";
}

export function MatchAwardVotes({
  matchId,
  candidates,
  teams,
  playerNames,
  token,
  voterId,
  enabled = true,
  children,
  actions,
}: {
  matchId: string;
  candidates: string[];
  teams: [string[], string[]];
  playerNames: Record<string, string>;
  token?: string;
  voterId?: string;
  enabled?: boolean;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const [selectedCategory, setSelectedCategory] = useState<Category | "motm">("motm");
  const [polls, setPolls] = useState<Poll[] | null>(null);
  const [error, setError] = useState("");
  const [voteError, setVoteError] = useState<{ category: Category; message: string } | null>(null);
  const [savingCategory, setSavingCategory] = useState<Category | null>(null);
  const saving = savingCategory !== null;
  const requestVersion = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const client = supabase;
    if (!client || !enabled) return;
    async function refresh() {
      if (!client) return;
      const version = ++requestVersion.current;
      try {
        const { data, error: requestError } = await client.rpc(
          "get_match_award_polls",
          { p_match_id: matchId, p_token: token ?? null, p_voter_id: voterId ?? null },
        );
        if (requestError) throw new Error(requestError.message);
        if (!Array.isArray(data)) throw new Error("Aucun résultat de vote reçu.");
        if (cancelled || version !== requestVersion.current) return;
        setPolls(data as Poll[]);
        setError("");
      } catch (requestError) {
        if (!cancelled && version === requestVersion.current) {
          setError(`Impossible de charger les votes : ${errorMessage(requestError)}`);
        }
      }
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [matchId, token, voterId, enabled]);

  async function vote(category: Category, candidateId: string) {
    if (!supabase || saving || !candidateId) return;
    const previousPolls = polls;
    requestVersion.current++;
    setSavingCategory(category);
    setVoteError(null);
    setPolls((current) => current?.map((poll) =>
      poll.category === category ? { ...poll, my_vote: candidateId } : poll
    ) ?? null);
    try {
      const { data, error: requestError } = await supabase.rpc("vote_match_award", {
        p_match_id: matchId,
        p_category: category,
        p_candidate_id: candidateId,
        p_token: token ?? null,
        p_voter_id: voterId ?? null,
      });
      if (requestError) throw new Error(requestError.message);
      if (!Array.isArray(data)) throw new Error("Aucun résultat de vote reçu.");
      setPolls(data as Poll[]);
    } catch (requestError) {
      setPolls(previousPolls);
      setVoteError({
        category,
        message: `Impossible d’enregistrer le vote : ${errorMessage(requestError)}`,
      });
    } finally {
      requestVersion.current++;
      setSavingCategory(null);
    }
  }

  if (!enabled) return <>{actions}{children}</>;

  const activeCategory = categories.find(({ id }) => id === selectedCategory);
  const poll = polls?.find((item) => item.category === selectedCategory);
  const leader = poll && matchVoteLeader(poll.vote_totals.map((vote) => ({
    candidateId: vote.candidate_id,
    voteCount: vote.vote_count,
  })));

  return (
    <>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div aria-label="Choisir une distinction" className="flex flex-wrap gap-2" role="group">
          {([{ id: "motm", label: "Homme du match" }, ...categories] as const).map(({ id, label }) => (
            <button
              aria-pressed={selectedCategory === id}
              className={`min-h-10 cursor-pointer border px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--team-b-blue) ${selectedCategory === id ? "border-(--team-b-blue) bg-(--team-b-blue)/15 text-(--team-b-blue)" : "border-(--line) bg-(--bg-surface) text-(--text-secondary) hover:bg-(--bg-elevated)"}`}
              key={id}
              onClick={() => setSelectedCategory(id)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
        {actions}
      </div>
      {selectedCategory === "motm" ? children : (
        <div>
          {!supabase && <p role="alert">Le service de vote est indisponible.</p>}
          {error && <p className="m-0 text-sm text-(--team-a-red)" role="alert">{error}</p>}
          {supabase && !polls && !error && <p role="status">Chargement des distinctions…</p>}
          {polls && !poll && activeCategory && (
            <p role="alert">Sondage {activeCategory.label} indisponible.</p>
          )}
          {poll && activeCategory && (
            <section aria-label={`Vote ${activeCategory.label}`}>
              <div className="mb-5 flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-(--team-b-blue)/15 text-(--team-b-blue)">
                  <Trophy aria-hidden="true" size={21} />
                </span>
                <h3 className="m-0 text-lg font-bold text-(--text-primary)">{activeCategory.label}</h3>
              </div>
              {poll.is_complete ? (
                <div aria-live="polite">
                  <p className="mb-3 text-xs text-(--text-secondary)" role="status">
                    Vote clôturé · {poll.vote_count} / {poll.eligible_voter_count} votes exprimés
                  </p>
                  <MatchVoteWinners winnerIds={poll.winner_ids} teams={teams} playerNames={playerNames} />
                </div>
              ) : (
                <>
                  <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                    <p className="m-0 text-sm font-semibold text-(--text-primary)" role="status">
                      {poll.vote_count} / {poll.eligible_voter_count} participants ont voté
                    </p>
                    <p className="m-0 text-xs text-(--text-secondary)">
                      Cliquez pour voter ou changer votre choix.
                    </p>
                  </div>
                  {leader && <p className="mb-4 text-sm font-semibold text-(--text-primary)">En tête provisoirement : {playerNames[leader] ?? "Joueur"}</p>}
                  <div
                    aria-label={`Participation au vote ${activeCategory.label}`}
                    aria-valuemax={poll.eligible_voter_count}
                    aria-valuemin={0}
                    aria-valuenow={poll.vote_count}
                    className="mb-5 h-2 overflow-hidden rounded-full bg-(--bg-elevated)"
                    role="progressbar"
                  >
                    <span
                      className="block h-full bg-(--team-b-blue) transition-[width]"
                      style={{
                        width: `${poll.eligible_voter_count ? Math.min((poll.vote_count / poll.eligible_voter_count) * 100, 100) : 0}%`,
                      }}
                    />
                  </div>
                  <MatchVoteCandidates
                    candidates={candidates}
                    teams={teams}
                    playerNames={playerNames}
                    voteTotals={poll.vote_totals.map((vote) => ({
                      candidateId: vote.candidate_id,
                      voteCount: vote.vote_count,
                    }))}
                    myVote={poll.my_vote}
                    saving={saving}
                    onVote={(candidateId) => void vote(activeCategory.id, candidateId)}
                  />
                  {savingCategory === activeCategory.id && (
                    <p className="mt-2 text-xs text-(--text-secondary)" role="status">
                      Enregistrement de votre vote…
                    </p>
                  )}
                  {voteError?.category === activeCategory.id && (
                    <p className="mt-2 text-xs text-(--team-a-red)" role="alert">
                      {voteError.message}
                    </p>
                  )}
                </>
              )}
            </section>
          )}
        </div>
      )}
    </>
  );
}
