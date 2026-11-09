import { Fragment, useEffect, useState } from "react";
import { ArrowRight, Goal, Shirt, Trophy } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { formatMatchDate } from "../../helpers/formatMatchDate/formatMatchDate";
import { supabase } from "../../lib/supabase/supabase";
import logo from "../../assets/logo.png";
import type { MatchGoal, MatchSlot } from "../../types";
import { MatchGoalTimeline } from "../../components/MatchGoalTimeline/MatchGoalTimeline";
import { MatchScoreboard } from "../../components/MatchScoreboard/MatchScoreboard";
import { MatchTeamComposition } from "../../components/MatchDetails/MatchTeamComposition";
import "../../components/MatchDetails/MatchDetails.css";

type GuestCandidate = {
  id: string;
  name: string;
  team: 0 | 1 | null;
};

type GuestVoter = {
  id: string;
  name: string;
};

type GuestPoll = {
  match_id: string;
  venue: string;
  match_date: string;
  match_time: string;
  guest_name: string | null;
  my_vote: string | null;
  vote_totals: { candidate_id: string; vote_count: number }[];
  vote_count: number;
  eligible_voter_count: number;
  is_complete: boolean;
  winner_ids: string[];
  guest_voters: GuestVoter[];
  candidates: GuestCandidate[];
};

type GuestSummaryRow = {
  elapsed_seconds: number;
  goals: {
    id: string;
    scorer_id: string;
    team: number;
    elapsed_seconds: number;
    created_at: string;
  }[];
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Erreur inconnue.";
}

export function GuestMatchVotePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [poll, setPoll] = useState<GuestPoll | null>(null);
  const [summary, setSummary] = useState<{
    elapsedSeconds: number;
    goals: MatchGoal[];
  } | null>(null);
  const [representedGuestId, setRepresentedGuestId] = useState("");
  const [loading, setLoading] = useState(Boolean(supabase && token));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const client = supabase;
    if (!client || !token) return;

    void Promise.all([
      client.rpc("get_guest_match_motm_vote", {
        p_token: token,
        p_voter_id: null,
      }),
      client.rpc("get_guest_match_summary", { p_token: token }),
    ]).then(([pollResult, summaryResult]) => {
      if (cancelled) return;
      if (pollResult.error || summaryResult.error) {
        setError("Ce lien de vote est invalide ou n’est plus disponible.");
      } else {
        const pollRow = pollResult.data?.[0] as GuestPoll | undefined;
        const summaryRow = summaryResult.data?.[0] as
          | GuestSummaryRow
          | undefined;
        if (!pollRow || !summaryRow) {
          setError("Ce lien de vote est invalide ou n’est plus disponible.");
        } else {
          setPoll(pollRow);
          setSummary({
            elapsedSeconds: summaryRow.elapsed_seconds,
            goals: summaryRow.goals.map((goal) => ({
              id: goal.id,
              scorerId: goal.scorer_id,
              team: goal.team === 0 ? 0 : 1,
              elapsedSeconds: goal.elapsed_seconds,
              createdAt: goal.created_at,
            })),
          });
        }
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function chooseGuest(guestId: string) {
    setError("");
    if (!guestId) {
      setRepresentedGuestId("");
      if (poll) setPoll({ ...poll, guest_name: null, my_vote: null });
      return;
    }
    if (!supabase || !token) return;

    setLoading(true);
    const { data, error: requestError } = await supabase.rpc(
      "get_guest_match_motm_vote",
      { p_token: token, p_voter_id: guestId },
    );
    if (requestError) {
      setError(getErrorMessage(requestError));
    } else if (data?.[0]) {
      setPoll(data[0] as GuestPoll);
      setRepresentedGuestId(guestId);
    } else {
      setError("Impossible de confirmer votre identité d’invité.");
    }
    setLoading(false);
  }

  async function vote(candidateId: string) {
    if (
      !supabase ||
      !token ||
      !poll ||
      !representedGuestId ||
      saving ||
      poll.is_complete
    )
      return;
    setSaving(true);
    setError("");
    try {
      const { data, error: requestError } = await supabase.rpc(
        "vote_guest_match_motm",
        {
          p_token: token,
          p_voter_id: representedGuestId,
          p_candidate_id: candidateId,
        },
      );
      if (requestError) throw requestError;
      const updatedPoll = (data?.[0] ?? null) as GuestPoll | null;
      if (!updatedPoll) throw new Error("Aucun résultat de vote reçu.");
      setPoll(updatedPoll);
    } catch (voteError) {
      setError(
        `Impossible d’enregistrer votre vote : ${getErrorMessage(voteError)}`,
      );
    } finally {
      setSaving(false);
    }
  }

  const summaryMatch: MatchSlot | null =
    poll && summary
      ? {
          id: poll.match_id,
          date: poll.match_date,
          time: poll.match_time,
          venue: poll.venue,
          maxPlayers: poll.candidates.length,
          attendees: poll.candidates.map((candidate) => candidate.id),
          attendeeNames: Object.fromEntries(
            poll.guest_voters.map((guest) => [guest.id, guest.name]),
          ),
          teams: [
            poll.candidates
              .filter((candidate) => candidate.team === 0)
              .map((candidate) => candidate.id),
            poll.candidates
              .filter((candidate) => candidate.team === 1)
              .map((candidate) => candidate.id),
          ],
          status: "finished",
          elapsedSeconds: summary.elapsedSeconds,
          goals: summary.goals,
        }
      : null;
  const playerNames = Object.fromEntries(
    (poll?.candidates ?? []).map((candidate) => [candidate.id, candidate.name]),
  );
  const scorerTotals = (summary?.goals ?? []).reduce<Record<string, number>>(
    (totals, goal) => {
      totals[goal.scorerId] = (totals[goal.scorerId] ?? 0) + 1;
      return totals;
    },
    {},
  );
  const bestScorerCount = Math.max(0, ...Object.values(scorerTotals));
  const bestScorerIds = Object.entries(scorerTotals)
    .filter(([, count]) => count === bestScorerCount && count > 0)
    .map(([id]) => id);
  const renderCandidateButton = (candidate: GuestCandidate) => {
    const selected = poll?.my_vote === candidate.id;
    const teamIndex = candidate.team;
    const teamColorClass =
      teamIndex === 0
        ? "text-(--team-a-red)"
        : teamIndex === 1
          ? "text-(--team-b-blue)"
          : "text-(--text-primary)";
    const teamBorderClass =
      teamIndex === 0
        ? "border-l-(--team-a-red)"
        : teamIndex === 1
          ? "border-l-(--team-b-blue)"
          : "";
    const teamHoverClass =
      teamIndex === 0
        ? "enabled:hover:border-(--team-a-red) enabled:hover:bg-(--team-a-red)/10"
        : "enabled:hover:border-(--team-b-blue) enabled:hover:bg-(--team-b-blue)/10";
    const voteCount =
      poll?.vote_totals.find((vote) => vote.candidate_id === candidate.id)
        ?.vote_count ?? 0;

    return (
      <button
        aria-pressed={selected}
        className={`flex min-h-14 cursor-pointer items-center justify-between gap-3 border border-l-4 px-4 py-3 text-left text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${teamBorderClass} ${selected ? "border-(--team-b-blue) bg-(--team-b-blue)/10" : `border-(--line) bg-(--bg-surface) enabled:hover:bg-(--bg-elevated) ${teamHoverClass}`}`}
        disabled={saving || loading}
        key={candidate.id}
        onClick={() => void vote(candidate.id)}
        type="button"
      >
        <span className={`min-w-0 truncate ${teamColorClass}`}>
          {candidate.name}
        </span>
        <span className="shrink-0 text-xs tabular-nums">{voteCount}</span>
      </button>
    );
  };

  return (
    <main className="mx-auto flex min-h-svh w-[min(calc(100%-56px),1440px)] flex-col bg-(--bg-main) text-(--text-primary) min-[681px]:max-[1024px]:w-[calc(100%-40px)] max-[1024px]:pb-[calc(72px+env(safe-area-inset-bottom))] max-[680px]:w-[calc(100%-32px)] max-[380px]:w-[calc(100%-24px)]">
      <div className="flex-1">
        <header className="mb-8 flex min-h-15 items-center justify-between border-b border-(--line) pb-4">
          <Link
            aria-label="Compo, accueil"
            className="inline-flex items-center"
            to="/"
          >
            <img className="block h-auto w-30" src={logo} alt="Compo" />
          </Link>
          <span className="text-[10px] font-bold tracking-[1.5px] text-(--text-secondary)">
            INVITATION MATCH
          </span>
        </header>
        {loading ? (
          <p className="mt-8 text-sm text-(--text-secondary)" role="status">
            Chargement du résumé et du vote…
          </p>
        ) : !poll || !summaryMatch ? (
          <p
            className="mt-8 border-l-4 border-(--team-a-red) bg-(--bg-surface) px-4 py-3 text-sm"
            role="alert"
          >
            {error ||
              (!token
                ? "Ce lien de vote est invalide."
                : "Le service de vote est indisponible. Réessayez plus tard.")}
          </p>
        ) : !representedGuestId ? (
          <>
            <p className="mb-3 flex items-center gap-2 text-[10px] font-bold tracking-[1.7px] text-(--text-secondary)">
              <span className="size-1.5 rounded-full bg-(--status-success)" />
              ÉTAPE 1 · IDENTITÉ
            </p>
            <section
              aria-label="Choisir son identité d’invité"
              className="max-w-xl border-t border-(--line) pt-6"
            >
              <h1 className="mb-4 mt-0 font-sans text-3xl font-bold leading-tight sm:text-4xl">
                Choisis ton nom
              </h1>
              <p className="mb-5 text-sm text-(--text-secondary)">
                Sélectionne le nom sous lequel tu as été inscrit. Tu pourras
                ensuite voter pour l’homme du match.
              </p>
              <p className="mb-2 text-sm font-semibold">Je suis</p>
              <div className="grid grid-cols-2 gap-3.5">
                {([1, 0] as const).map((teamIndex) => {
                  const teamGuests = poll.guest_voters.filter((guest) =>
                    poll.candidates.some(
                      (candidate) =>
                        candidate.id === guest.id &&
                        candidate.team === teamIndex,
                    ),
                  );
                  const teamName = teamIndex === 1 ? "Bleue" : "Rouge";
                  const teamColorClass =
                    teamIndex === 1
                      ? "text-(--team-b-blue)"
                      : "text-(--team-a-red)";

                  return (
                    <section
                      aria-label={`Équipe ${teamName}`}
                      className="min-w-0"
                      key={teamIndex}
                    >
                      <h4
                        className={`mb-2.5 flex items-center gap-1.5 text-xs font-semibold ${teamColorClass}`}
                      >
                        <Shirt
                          aria-hidden="true"
                          color={
                            teamIndex === 1
                              ? "var(--team-b-blue)"
                              : "var(--team-a-red)"
                          }
                          size={14}
                        />
                        Équipe {teamName}
                      </h4>
                      <div className="grid gap-2">
                        {teamGuests.map((guest) => (
                          <button
                            aria-label={`Choisir ${guest.name}`}
                            className={`flex min-h-12 cursor-pointer items-center justify-between gap-3 border px-3 py-3 text-left text-sm font-semibold disabled:cursor-wait disabled:opacity-60 ${
                              teamIndex === 1
                                ? "border-(--team-b-blue)/35 bg-(--team-b-blue)/5 text-(--team-b-blue) hover:border-(--team-b-blue) hover:bg-(--team-b-blue)/10"
                                : "border-(--team-a-red)/35 bg-(--team-a-red)/5 text-(--team-a-red) hover:border-(--team-a-red) hover:bg-(--team-a-red)/10"
                            }`}
                            disabled={loading}
                            key={guest.id}
                            onClick={() => void chooseGuest(guest.id)}
                            type="button"
                          >
                            <span>{guest.name}</span>
                            <ArrowRight aria-hidden="true" size={16} />
                          </button>
                        ))}
                      </div>
                    </section>
                  );
                })}
                {poll.guest_voters.some(
                  (guest) =>
                    !poll.candidates.some(
                      (candidate) =>
                        candidate.id === guest.id && candidate.team !== null,
                    ),
                ) && (
                  <section
                    aria-label="Autres participants"
                    className="col-span-2 min-w-0"
                  >
                    <h4 className="mb-2.5 text-xs font-semibold text-(--text-secondary)">
                      Autres participants
                    </h4>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {poll.guest_voters
                        .filter(
                          (guest) =>
                            !poll.candidates.some(
                              (candidate) =>
                                candidate.id === guest.id &&
                                candidate.team !== null,
                            ),
                        )
                        .map((guest) => (
                          <button
                            aria-label={`Choisir ${guest.name}`}
                            className="flex min-h-12 cursor-pointer items-center justify-between gap-3 border border-(--line) bg-(--bg-surface) px-3 py-3 text-left text-sm font-semibold text-(--text-primary) hover:border-(--team-b-blue) hover:bg-(--bg-elevated) disabled:cursor-wait disabled:opacity-60"
                            disabled={loading}
                            key={guest.id}
                            onClick={() => void chooseGuest(guest.id)}
                            type="button"
                          >
                            <span>{guest.name}</span>
                            <ArrowRight aria-hidden="true" size={16} />
                          </button>
                        ))}
                    </div>
                  </section>
                )}
              </div>
              {error && (
                <p
                  className="mb-0 mt-3 text-sm text-(--team-a-red)"
                  role="alert"
                >
                  {error}
                </p>
              )}
            </section>
          </>
        ) : (
          <>
            <p className="mb-3 text-[10px] font-bold tracking-[1.5px] text-(--text-secondary)">
              MATCH TERMINÉ
            </p>
            <p className="mb-2 text-xs capitalize text-(--text-secondary)">
              {formatMatchDate(poll.match_date)} · {poll.match_time}
            </p>
            <h1 className="drawer-title" id="guest-match-title">
              {poll.venue}
            </h1>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="m-0 text-sm text-(--text-secondary)">
                Vous votez en tant que <strong>{poll.guest_name}</strong>.
              </p>
              <label className="flex items-center gap-2 text-xs font-semibold">
                Changer
                <select
                  className="min-h-9 border border-(--line) bg-(--bg-surface) px-2 text-xs text-(--text-primary)"
                  disabled={saving || loading}
                  onChange={(event) => void chooseGuest(event.target.value)}
                  value={representedGuestId}
                >
                  {poll.guest_voters.map((guest) => (
                    <option key={guest.id} value={guest.id}>
                      {guest.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <MatchScoreboard
              elapsedSeconds={summaryMatch.elapsedSeconds ?? 0}
              goals={summaryMatch.goals ?? []}
              status="finished"
            />

            <section
              aria-labelledby="match-awards-title"
              className="mt-7 border-l-4 border-(--team-b-blue) bg-linear-to-r from-(--team-b-blue)/10 to-(--bg-surface) px-5 py-5 sm:px-7 sm:py-6"
            >
              <h2
                className="mb-5 text-xl font-bold text-(--text-primary)"
                id="match-awards-title"
              >
                Distinctions du match
              </h2>
              <div className="mb-5 flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-(--team-b-blue)/15 text-(--team-b-blue)">
                  <Trophy aria-hidden="true" size={21} />
                </span>
                <h3 className="m-0 text-lg font-bold">Homme du match</h3>
              </div>

              <section aria-label="Vote homme du match">
                {poll.is_complete ? (
                  <div aria-live="polite">
                    <p
                      className="mb-3 text-xs text-(--text-secondary)"
                      role="status"
                    >
                      Vote clôturé · {poll.vote_count} /{" "}
                      {poll.eligible_voter_count} votes exprimés
                    </p>
                    {poll.winner_ids.length ? (
                      <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
                        {poll.winner_ids.map((winnerId) => {
                          const winningTeam =
                            summaryMatch.teams?.findIndex((team) =>
                              team.includes(winnerId),
                            ) ?? -1;
                          const winnerTeamClass =
                            winningTeam === 0
                              ? "border-(--team-a-red)/35 bg-(--team-a-red)/10 text-(--team-a-red)"
                              : winningTeam === 1
                                ? "border-(--team-b-blue)/35 bg-(--team-b-blue)/10 text-(--team-b-blue)"
                                : "border-(--line) bg-(--bg-surface) text-(--text-primary)";

                          return (
                            <li
                              className={`flex min-h-14 items-center gap-3 border px-4 py-3 text-sm font-bold ${winnerTeamClass}`}
                              key={winnerId}
                            >
                              <Trophy aria-hidden="true" size={17} />
                              {playerNames[winnerId] ?? "Joueur"}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="m-0 text-sm font-semibold text-(--text-secondary)">
                        Aucun vote enregistré
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                      <p className="m-0 text-sm font-semibold" role="status">
                        {poll.vote_count} / {poll.eligible_voter_count}{" "}
                        participants ont voté
                      </p>
                      <p className="m-0 text-xs text-(--text-secondary)">
                        Cliquez pour voter ou changer votre choix.
                      </p>
                    </div>
                    <div
                      aria-label="Participation au vote"
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
                    <div className="grid gap-5 sm:grid-cols-2">
                      {([1, 0] as const).map((teamIndex) => {
                        const teamCandidates = poll.candidates.filter(
                          (candidate) => candidate.team === teamIndex,
                        );
                        const teamColorClass =
                          teamIndex === 1
                            ? "text-(--team-b-blue)"
                            : "text-(--team-a-red)";
                        return (
                          <section
                            aria-label={
                              teamIndex === 1 ? "Équipe Bleue" : "Équipe Rouge"
                            }
                            className="min-w-0"
                            key={teamIndex}
                          >
                            <h4
                              className={`mb-2 flex items-center gap-2 text-xs font-bold ${teamColorClass}`}
                            >
                              <span
                                aria-hidden="true"
                                className={`size-2 rounded-full ${teamIndex === 1 ? "bg-(--team-b-blue)" : "bg-(--team-a-red)"}`}
                              />
                              Équipe {teamIndex === 1 ? "Bleue" : "Rouge"}
                            </h4>
                            <div className="grid gap-2">
                              {representedGuestId &&
                                teamCandidates.map(renderCandidateButton)}
                            </div>
                          </section>
                        );
                      })}
                      {poll.candidates.some(
                        (candidate) => candidate.team === null,
                      ) && (
                        <section
                          aria-label="Autres participants"
                          className="min-w-0 sm:col-span-2"
                        >
                          <h4 className="mb-2 text-xs font-bold text-(--text-secondary)">
                            Autres participants
                          </h4>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {representedGuestId &&
                              poll.candidates
                                .filter((candidate) => candidate.team === null)
                                .map(renderCandidateButton)}
                          </div>
                        </section>
                      )}
                    </div>
                    <div className="mt-2 min-h-3">
                      {saving ? (
                        <p
                          className="m-0 text-xs leading-3 text-(--text-secondary)"
                          role="status"
                        >
                          Enregistrement de votre vote…
                        </p>
                      ) : error ? (
                        <p
                          className="m-0 text-xs leading-3 text-(--team-a-red)"
                          role="alert"
                        >
                          {error}
                        </p>
                      ) : poll.my_vote ? (
                        <p className="m-0 text-xs text-(--text-secondary)">
                          Vous pouvez modifier votre choix jusqu’à la clôture du
                          vote.
                        </p>
                      ) : null}
                    </div>
                  </>
                )}
              </section>

              <section
                aria-labelledby="best-scorer-title"
                className="mt-6 flex items-start gap-3"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-(--team-a-red)/10 text-(--team-a-red)">
                  <Goal aria-hidden="true" size={19} />
                </span>
                <div className="min-w-0">
                  <h3 className="m-0 text-lg font-bold" id="best-scorer-title">
                    {bestScorerIds.length > 1
                      ? "Meilleurs buteurs"
                      : "Meilleur buteur"}
                  </h3>
                  {bestScorerIds.length ? (
                    <p className="m-0 text-sm leading-relaxed">
                      {bestScorerIds.map((id, index) => {
                        const scorerTeam =
                          summaryMatch.teams?.findIndex((team) =>
                            team.includes(id),
                          ) ?? -1;
                        const scorerTeamClass =
                          scorerTeam === 0
                            ? "text-(--team-a-red)"
                            : scorerTeam === 1
                              ? "text-(--team-b-blue)"
                              : "text-(--text-primary)";

                        return (
                          <Fragment key={id}>
                            {index > 0 ? " et " : ""}
                            <span
                              className={`font-semibold ${scorerTeamClass}`}
                            >
                              {playerNames[id] ?? "Joueur"}
                            </span>
                          </Fragment>
                        );
                      })}{" "}
                      avec {bestScorerCount} but
                      {bestScorerCount === 1 ? "" : "s"}
                      {bestScorerIds.length > 1 ? " chacun" : ""}
                    </p>
                  ) : (
                    <p className="m-0 text-sm text-(--text-secondary)">
                      Aucun buteur
                    </p>
                  )}
                </div>
              </section>
            </section>

            <div className="mt-6 grid gap-x-8 gap-y-5 lg:grid-cols-2">
              <section
                className="pt-1"
                aria-labelledby="finished-scorers-title"
              >
                <h2
                  className="mb-4 text-sm font-bold"
                  id="finished-scorers-title"
                >
                  Fil du match
                </h2>
                <MatchGoalTimeline
                  goals={summaryMatch.goals ?? []}
                  playerNames={playerNames}
                />
              </section>
              <MatchTeamComposition
                className="mt-0 pt-1"
                isFull
                match={summaryMatch}
                playerNames={playerNames}
                teams={summaryMatch.teams ?? [[], []]}
              />
            </div>
          </>
        )}
        <footer className="mt-12 border-t border-(--line) py-8 sm:mt-16">
          <p className="mb-2 text-[10px] font-bold tracking-[1.5px] text-(--text-secondary)">
            TON ÉQUIPE. TON TERRAIN.
          </p>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="m-0 text-lg font-bold">Rejoins Compo</h2>
              <p className="mb-0 mt-1 text-sm text-(--text-secondary)">
                Organise tes matchs et retrouve ton équipe.
              </p>
            </div>
            <Link
              className="inline-flex min-h-11 items-center gap-2 bg-(--team-b-blue) px-4 text-sm font-bold text-(--bg-main) no-underline hover:brightness-110"
              to="/"
            >
              Rejoindre l’application
              <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
