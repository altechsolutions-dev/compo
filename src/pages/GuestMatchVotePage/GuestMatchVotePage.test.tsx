import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GuestMatchVotePage } from "./GuestMatchVotePage";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock("../../lib/supabase/supabase", () => ({
  supabase: { rpc },
}));

const poll = {
  match_id: "match-1",
  venue: "Urban Soccer",
  match_date: "2026-11-08",
  match_time: "19:30",
  guest_name: null,
  my_vote: null,
  vote_totals: [],
  vote_count: 0,
  eligible_voter_count: 4,
  is_complete: false,
  winner_ids: [],
  guest_voters: [
    { id: "guest-2", name: "Invité Paul" },
    { id: "guest-3", name: "Invité Marc" },
  ],
  candidates: [
    { id: "player-1", name: "Alex Martin", team: 0 },
    { id: "guest-1", name: "Inès Laurent", team: 1 },
    { id: "guest-2", name: "Invité Paul", team: 0 },
    { id: "guest-3", name: "Invité Marc", team: 1 },
  ],
};

describe("GuestMatchVotePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rpc.mockImplementation(
      async (name: string, args: { p_voter_id?: string | null }) => {
        if (name === "get_guest_match_summary") {
          return {
            data: [
              {
                elapsed_seconds: 900,
                goals: [
                  {
                    id: "goal-1",
                    scorer_id: "player-1",
                    team: 0,
                    elapsed_seconds: 300,
                    created_at: "2026-11-08T19:35:00.000Z",
                  },
                ],
              },
            ],
            error: null,
          };
        }
        if (name === "get_guest_match_motm_vote" && args.p_voter_id) {
          return {
            data: [{ ...poll, guest_name: "Invité Paul" }],
            error: null,
          };
        }
        if (name === "vote_guest_match_motm") {
          return {
            data: [{ ...poll, guest_name: "Invité Paul", my_vote: "guest-1" }],
            error: null,
          };
        }
        return { data: [poll], error: null };
      },
    );
  });

  it("permet de choisir son identité puis de voter via le lien partagé", async () => {
    render(
      <MemoryRouter initialEntries={["/vote?token=private-token"]}>
        <GuestMatchVotePage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", { name: "Choisis ton nom" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Sélectionne le nom sous lequel tu as été inscrit/))
      .toBeInTheDocument();
    expect(screen.getByText("ÉTAPE 1 · IDENTITÉ")).toBeInTheDocument();

    fireEvent.click(
      await screen.findByRole("button", { name: "Choisir Invité Paul" }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: /Inès Laurent/ }),
    );

    await waitFor(() =>
      expect(rpc).toHaveBeenCalledWith("vote_guest_match_motm", {
        p_token: "private-token",
        p_voter_id: "guest-2",
        p_candidate_id: "guest-1",
      }),
    );
  });

  it("affiche les distinctions par équipe après le meilleur buteur et permet le vote invité", async () => {
    const awardPolls = ["defender", "goalkeeper", "butcher", "missed_chances"].map((category) => ({
      category,
      my_vote: null,
      vote_totals: [],
      vote_count: 0,
      eligible_voter_count: 4,
      is_complete: false,
      winner_ids: [],
    }));
    rpc.mockImplementation(async (name: string, args: { p_voter_id?: string | null }) => {
      if (name === "get_guest_match_summary") {
        return { data: [{ elapsed_seconds: 900, goals: [] }], error: null };
      }
      if (name === "get_match_award_polls" || name === "vote_match_award") {
        return { data: awardPolls, error: null };
      }
      return {
        data: [{ ...poll, guest_name: args.p_voter_id ? "Invité Paul" : null }],
        error: null,
      };
    });
    render(
      <MemoryRouter initialEntries={["/vote?token=private-token"]}>
        <GuestMatchVotePage />
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByRole("button", { name: "Choisir Invité Paul" }));
    const selector = await screen.findByRole("group", { name: "Choisir une distinction" });
    expect(within(selector).getByRole("button", { name: "Homme du match" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(within(selector).getByRole("button", { name: "Meilleur défenseur" }));
    const defender = await screen.findByRole("region", { name: "Vote Meilleur défenseur" });
    const redTeam = within(defender).getByRole("region", { name: "Équipe Rouge" });
    fireEvent.click(within(redTeam).getByRole("button", { name: /Alex Martin/ }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("vote_match_award", {
      p_match_id: "match-1",
      p_category: "defender",
      p_candidate_id: "player-1",
      p_token: "private-token",
      p_voter_id: "guest-2",
    }));
    expect(within(selector).getAllByRole("button").map((button) => button.textContent)).toEqual([
      "Homme du match", "Meilleur défenseur", "Meilleur gardien",
      "Plus gros boucher", "Plus d’occasions ratées",
    ]);
    fireEvent.click(within(selector).getByRole("button", { name: "Homme du match" }));
    expect(screen.getByRole("region", { name: "Vote homme du match" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Vote Meilleur défenseur" })).not.toBeInTheDocument();
  });

  it("affiche les identités dans deux colonnes par équipe", async () => {
    render(
      <MemoryRouter initialEntries={["/vote?token=private-token"]}>
        <GuestMatchVotePage />
      </MemoryRouter>,
    );

    const redGuest = await screen.findByRole("button", {
      name: "Choisir Invité Paul",
    });
    const blueGuest = screen.getByRole("button", {
      name: "Choisir Invité Marc",
    });
    const blueTeam = screen.getByRole("region", { name: "Équipe Bleue" });
    const redTeam = screen.getByRole("region", { name: "Équipe Rouge" });
    const teamsGrid = blueTeam.parentElement;
    expect(teamsGrid).toHaveClass("grid-cols-2");
    expect(
      Array.from(teamsGrid!.children).map((team) =>
        team.getAttribute("aria-label"),
      ),
    ).toEqual(["Équipe Bleue", "Équipe Rouge"]);
    expect(within(blueTeam).getByRole("button", { name: "Choisir Invité Marc" }))
      .toBeInTheDocument();
    expect(within(redTeam).getByRole("button", { name: "Choisir Invité Paul" }))
      .toBeInTheDocument();
    expect(redGuest).toHaveClass(
      "border-(--team-a-red)/35",
      "text-(--team-a-red)",
    );
    expect(blueGuest).toHaveClass(
      "border-(--team-b-blue)/35",
      "text-(--team-b-blue)",
    );
  });

  it("présente le résumé complet du match comme dans la fiche joueur", async () => {
    render(
      <MemoryRouter initialEntries={["/vote?token=private-token"]}>
        <GuestMatchVotePage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("link", { name: "Compo, accueil" }),
    ).toHaveAttribute("href", "/");
    expect(
      screen.getByRole("link", { name: "Rejoindre l’application" }),
    ).toHaveAttribute("href", "/");

    const voterButton = await screen.findByRole("button", {
      name: "Choisir Invité Paul",
    });
    expect(screen.queryByRole("region", { name: "Score du match" })).toBeNull();
    fireEvent.click(voterButton);

    expect(
      await screen.findByRole("region", { name: "Score du match" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Distinctions du match" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Fil du match" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Composition du match" }),
    ).not.toBeInTheDocument();
    const totals = screen.getByRole("region", { name: "Buts par joueur" });
    const timeline = screen.getByRole("region", { name: "Fil du match" });
    expect(totals.parentElement?.children[0]).toBe(totals);
    expect(totals.parentElement?.children[1]).toBe(timeline);
    expect(totals).toHaveClass("lg:order-2");
    expect(timeline).toHaveClass("lg:order-1");
    expect(screen.getAllByText("Alex Martin")).toHaveLength(4);
    const bestScorerSection = screen.getByRole("region", {
      name: "Meilleur buteur",
    });
    expect(within(bestScorerSection).getByText("Alex Martin")).toHaveClass(
      "text-(--team-a-red)",
    );
    expect(bestScorerSection.querySelector("svg.lucide-goal")?.parentElement)
      .toHaveClass("text-(--team-a-red)");
  });

  it("affiche les buts de tous les joueurs dans le résumé invité", async () => {
    rpc.mockImplementation(
      async (name: string, args: { p_voter_id?: string | null }) => {
        if (name === "get_guest_match_summary") {
          return {
            data: [
              {
                elapsed_seconds: 900,
                goals: [
                  {
                    id: "1",
                    scorer_id: "player-1",
                    team: 0,
                    elapsed_seconds: 100,
                    created_at: "",
                  },
                  {
                    id: "2",
                    scorer_id: "guest-1",
                    team: 1,
                    elapsed_seconds: 200,
                    created_at: "",
                  },
                  {
                    id: "3",
                    scorer_id: "player-1",
                    team: 0,
                    elapsed_seconds: 300,
                    created_at: "",
                  },
                ],
              },
            ],
            error: null,
          };
        }
        return {
          data: [{ ...poll, guest_name: args.p_voter_id ? "Invité Paul" : null }],
          error: null,
        };
      },
    );

    render(
      <MemoryRouter initialEntries={["/vote?token=private-token"]}>
        <GuestMatchVotePage />
      </MemoryRouter>,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Choisir Invité Paul" }),
    );

    const totals = await screen.findByRole("region", { name: "Buts par joueur" });
    expect(
      within(within(totals).getByRole("region", { name: "Équipe Bleue" }))
        .getAllByRole("listitem").map((item) => item.textContent),
    ).toEqual(["Inès Laurent1", "Invité Marc0"]);
    expect(
      within(within(totals).getByRole("region", { name: "Équipe Rouge" }))
        .getAllByRole("listitem").map((item) => item.textContent),
    ).toEqual(["Alex Martin2", "Invité Paul0"]);
    expect(within(totals).getByText("Inès Laurent").parentElement)
      .toHaveClass("match-team-player", "match-team-player--blue");
    expect(within(totals).getByText("Alex Martin").parentElement)
      .toHaveClass("match-team-player", "match-team-player--red");
    expect(
      screen.getByRole("region", { name: "Meilleur buteur" }),
    ).toHaveTextContent("Alex Martin avec 2 buts");
  });

  it("colore l’icône du meilleur buteur en bleu dans le résumé invité", async () => {
    rpc.mockImplementation(
      async (name: string, args: { p_voter_id?: string | null }) => {
        if (name === "get_guest_match_summary") {
          return {
            data: [{
              elapsed_seconds: 900,
              goals: [{
                id: "goal-blue",
                scorer_id: "guest-1",
                team: 1,
                elapsed_seconds: 300,
                created_at: "",
              }],
            }],
            error: null,
          };
        }
        return {
          data: [{ ...poll, guest_name: args.p_voter_id ? "Invité Paul" : null }],
          error: null,
        };
      },
    );
    render(
      <MemoryRouter initialEntries={["/vote?token=private-token"]}>
        <GuestMatchVotePage />
      </MemoryRouter>,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Choisir Invité Paul" }),
    );

    const bestScorer = await screen.findByRole("region", {
      name: "Meilleur buteur",
    });
    expect(bestScorer.querySelector("svg.lucide-goal")?.parentElement)
      .toHaveClass("text-(--team-b-blue)");
  });

  it("colore l’homme du match selon son équipe après clôture", async () => {
    rpc.mockImplementation(
      async (name: string, args: { p_voter_id?: string | null }) => {
        if (name === "get_guest_match_summary") {
          return { data: [{ elapsed_seconds: 900, goals: [] }], error: null };
        }
        if (name === "get_guest_match_motm_vote") {
          return {
            data: [
              {
                ...poll,
                guest_name: args.p_voter_id ? "Invité Paul" : null,
                is_complete: true,
                winner_ids: ["guest-1"],
              },
            ],
            error: null,
          };
        }
        return { data: [], error: null };
      },
    );
    render(
      <MemoryRouter initialEntries={["/vote?token=private-token"]}>
        <GuestMatchVotePage />
      </MemoryRouter>,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Choisir Invité Paul" }),
    );

    const voteSection = await screen.findByRole("region", {
      name: "Vote homme du match",
    });
    expect(screen.getByRole("region", { name: "Meilleur buteur" }))
      .toHaveTextContent("Aucun buteur");
    expect(
      within(screen.getByRole("region", { name: "Buts par joueur" }))
        .getAllByRole("listitem"),
    ).toHaveLength(4);
    expect(
      within(screen.getByRole("region", { name: "Buts par joueur" }))
        .getAllByText("0"),
    ).toHaveLength(4);
    expect(
      within(voteSection).getByText("Inès Laurent").closest("li"),
    ).toHaveClass(
      "border-(--team-b-blue)/35",
      "bg-(--team-b-blue)/10",
      "text-(--team-b-blue)",
    );
  });

  it("affiche un message neutre pour un jeton invalide", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: new Error("Invalid vote link"),
    });
    render(
      <MemoryRouter initialEntries={["/vote?token=invalid"]}>
        <GuestMatchVotePage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ce lien de vote est invalide ou n’est plus disponible.",
    );
  });
});
