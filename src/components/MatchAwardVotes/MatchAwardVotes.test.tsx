import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MatchAwardVotes } from "./MatchAwardVotes";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("../../lib/supabase/supabase", () => ({ supabase: { rpc } }));

const categories = ["butcher", "missed_chances", "defender", "goalkeeper"];
const polls = categories.map((category) => ({
  category,
  my_vote: null,
  vote_totals: [],
  vote_count: 0,
  eligible_voter_count: 4,
  is_complete: false,
  winner_ids: [],
}));

describe("MatchAwardVotes", () => {
  beforeEach(() => {
    rpc.mockReset();
    rpc.mockResolvedValue({ data: polls, error: null });
  });

  it("permet à un invité de voter indépendamment et affiche le résultat", async () => {
    rpc.mockImplementation(async (name: string) => ({
      data: name === "vote_match_award"
        ? polls.map((poll) => poll.category === "defender"
          ? {
              ...poll,
              my_vote: "a",
              vote_count: 1,
              vote_totals: [{ candidate_id: "a", vote_count: 1 }],
            }
          : poll)
        : polls,
      error: null,
    }));
    render(
      <MatchAwardVotes
        matchId="match"
        candidates={["a", "b", "c"]}
        teams={[["a"], ["b"]]}
        playerNames={{ a: "Alex", b: "Sam", c: "Cam" }}
        token="token"
        voterId="guest"
      >
        <section aria-label="Vote homme du match">Vote homme du match</section>
      </MatchAwardVotes>,
    );
    const selector = screen.getByRole("group", { name: "Choisir une distinction" });
    expect(within(selector).getAllByRole("button").map((button) => button.textContent)).toEqual([
      "Homme du match", "Meilleur défenseur", "Meilleur gardien",
      "Plus gros boucher", "Plus d’occasions ratées",
    ]);
    expect(within(selector).getByRole("button", { name: "Homme du match" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("region", { name: "Vote homme du match" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Vote Meilleur défenseur" })).not.toBeInTheDocument();
    fireEvent.click(within(selector).getByRole("button", { name: "Meilleur défenseur" }));
    const section = await screen.findByRole("region", { name: "Vote Meilleur défenseur" });
    expect(screen.queryByRole("region", { name: "Vote homme du match" })).not.toBeInTheDocument();
    const redTeam = within(section).getByRole("region", { name: "Équipe Rouge" });
    const blueTeam = within(section).getByRole("region", { name: "Équipe Bleue" });
    expect(within(blueTeam).getByRole("button", { name: /Sam/ })).toBeInTheDocument();
    expect(within(within(section).getByRole("region", { name: "Autres joueurs" })).getByRole("button", { name: /Cam/ })).toBeInTheDocument();
    const alex = within(redTeam).getByRole("button", { name: /Alex/ });
    fireEvent.click(alex);
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("vote_match_award", {
      p_match_id: "match",
      p_category: "defender",
      p_candidate_id: "a",
      p_token: "token",
      p_voter_id: "guest",
    }));
    expect(await within(section).findByText("En tête provisoirement : Alex")).toBeInTheDocument();
    expect(alex).toHaveAttribute("aria-pressed", "true");
    expect(alex).toHaveTextContent("1");
    expect(within(section).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
    fireEvent.click(within(selector).getByRole("button", { name: "Meilleur gardien" }));
    expect(within(screen.getByRole("region", { name: "Vote Meilleur gardien" })).getByRole("button", { name: /Alex/ })).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(within(selector).getByRole("button", { name: "Meilleur défenseur" }));
    expect(within(screen.getByRole("region", { name: "Vote Meilleur défenseur" })).getByRole("button", { name: /Alex/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("présente les gagnants ex æquo et rend une erreur de vote visible", async () => {
    rpc.mockImplementation(async (name: string) => name === "vote_match_award"
      ? { data: null, error: { message: "Refusé" } }
      : { data: polls.map((poll) => poll.category === "butcher"
          ? { ...poll, is_complete: true, winner_ids: ["a", "b"] }
          : poll), error: null });
    render(<MatchAwardVotes matchId="match" candidates={["a", "b"]} teams={[["a"], ["b"]]} playerNames={{ a: "Alex", b: "Sam" }}>Homme du match</MatchAwardVotes>);
    fireEvent.click(screen.getByRole("button", { name: "Plus gros boucher" }));
    const butcher = await screen.findByRole("region", { name: "Vote Plus gros boucher" });
    expect(within(butcher).getAllByRole("listitem")).toHaveLength(2);
    expect(within(butcher).queryByRole("button")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Meilleur gardien" }));
    const goalkeeper = screen.getByRole("region", { name: "Vote Meilleur gardien" });
    const sam = within(goalkeeper).getByRole("button", { name: /Sam/ });
    fireEvent.click(sam);
    expect(await screen.findByRole("alert")).toHaveTextContent("Refusé");
    expect(sam).toHaveAttribute("aria-pressed", "false");
  });
});
