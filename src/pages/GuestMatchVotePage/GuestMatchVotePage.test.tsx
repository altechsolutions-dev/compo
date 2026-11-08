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

  it("colore la liste des invités selon leur équipe", async () => {
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
      screen.getByRole("heading", { name: "Composition du match" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Alex Martin")).toHaveLength(4);
    const bestScorerSection = screen.getByRole("region", {
      name: "Meilleur buteur",
    });
    expect(within(bestScorerSection).getByText("Alex Martin")).toHaveClass(
      "text-(--team-a-red)",
    );
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
