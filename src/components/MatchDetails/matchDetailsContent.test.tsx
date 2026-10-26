import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderMatchDetailsContent } from "./matchDetailsContent";
import type { MatchSlot } from "../../types";

const match: MatchSlot = {
  id: "match-1",
  date: "2026-10-22",
  time: "19:30",
  venue: "Urban Soccer",
  maxPlayers: 4,
  attendees: ["alex", "sarah", "malik", "ines"],
};

const playerNames = {
  alex: "Alex Martin",
  sarah: "Sarah Benali",
  malik: "Malik Diallo",
  ines: "Inès Laurent",
};

function renderContent({
  isFull = true,
  isRegistered = true,
  teams = [
    ["alex", "sarah"],
    ["malik", "ines"],
  ] as [string[], string[]],
} = {}) {
  const onClose = vi.fn();
  const onRegister = vi.fn();
  const renderedMatch = isFull
    ? match
    : { ...match, attendees: match.attendees.slice(0, 2) };
  const renderedTeams = isFull ? teams : undefined;
  render(
    renderMatchDetailsContent({
      match: renderedMatch,
      isFull,
      isRegistered,
      isRegistering: false,
      teams: renderedTeams,
      playerNames,
      onClose,
      onRegister,
    }),
  );
  return { onClose, onRegister };
}

describe("MatchDetailsContent", () => {
  it("affiche les deux équipes et les inscrits du match complet", () => {
    renderContent();

    expect(
      screen.getByRole("heading", { name: "Composition du match" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Alex Martin")).toBeInTheDocument();
    expect(screen.getByText("Inès Laurent")).toBeInTheDocument();
    expect(
      screen.getByText("COMPLET", { selector: "span" }),
    ).toBeInTheDocument();
  });

  it("enregistre les joueurs échangés avant de lancer le match", async () => {
    const onStartMatch = vi.fn();
    const onSaveTeams = vi.fn().mockResolvedValue(true);
    render(
      renderMatchDetailsContent({
        match,
        isFull: true,
        isRegistered: true,
        isRegistering: false,
        teams: [
          ["alex", "sarah"],
          ["malik", "ines"],
        ],
        playerNames,
        onClose: vi.fn(),
        onRegister: vi.fn(),
        onSaveTeams,
        onStartMatch,
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Modifier" }));
    fireEvent.click(
      screen.getByRole("button", {
        name: "Sélectionner Alex Martin dans l'équipe A",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Sélectionner Malik Diallo dans l'équipe B",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Échanger les joueurs sélectionnés",
      }),
    );
    await waitFor(() =>
      expect(onSaveTeams).toHaveBeenCalledWith([
        ["malik", "sarah"],
        ["alex", "ines"],
      ]),
    );
    fireEvent.click(screen.getByRole("button", { name: /Lancer le match/ }));

    expect(onStartMatch).toHaveBeenCalledWith([
      ["malik", "sarah"],
      ["alex", "ines"],
    ]);
  });

  it("demande la fermeture via son bouton", () => {
    const { onClose } = renderContent();

    fireEvent.click(
      screen.getByRole("button", { name: "Fermer les détails du match" }),
    );

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("propose l’inscription tant que des places restent libres", () => {
    const { onRegister } = renderContent({
      isFull: false,
      isRegistered: false,
      teams: undefined,
    });

    fireEvent.click(screen.getByRole("button", { name: /Je m'inscris/ }));

    expect(onRegister).toHaveBeenCalledOnce();
  });

  it("affiche les buteurs dans des tableaux séparés par équipe pour un match terminé", () => {
    const finishedMatch: MatchSlot = {
      ...match,
      status: "finished",
      elapsedSeconds: 3600,
      teams: [
        ["alex", "sarah"],
        ["malik", "ines"],
      ],
      goals: [
        {
          id: "goal-red",
          scorerId: "alex",
          team: 0,
          elapsedSeconds: 125,
          createdAt: "2026-10-22T19:32:05.000Z",
        },
        {
          id: "goal-blue",
          scorerId: "malik",
          team: 1,
          elapsedSeconds: 245,
          createdAt: "2026-10-22T19:34:05.000Z",
        },
      ],
    };
    render(
      renderMatchDetailsContent({
        match: finishedMatch,
        isFull: true,
        isRegistered: true,
        isRegistering: false,
        teams: finishedMatch.teams,
        playerNames,
        onClose: vi.fn(),
        onRegister: vi.fn(),
      }),
    );

    expect(screen.getAllByText("1", { selector: "strong" })).toHaveLength(2);
    expect(
      within(screen.getByRole("region", { name: "Résultat final" })).getByText(
        "60:00",
      ),
    ).toBeInTheDocument();
    const redScorers = screen.getByRole("region", {
      name: "Buteurs de l'équipe rouge",
    });
    const blueScorers = screen.getByRole("region", {
      name: "Buteurs de l'équipe bleue",
    });
    expect(within(redScorers).getByText("Alex Martin")).toBeInTheDocument();
    expect(within(redScorers).getByText("02:05")).toBeInTheDocument();
    expect(within(blueScorers).getByText("Malik Diallo")).toBeInTheDocument();
    expect(within(blueScorers).getByText("04:05")).toBeInTheDocument();
    expect(
      within(redScorers).queryByText("Malik Diallo"),
    ).not.toBeInTheDocument();
    expect(
      within(blueScorers).queryByText("Alex Martin"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Composition" }),
    ).toBeInTheDocument();
    const redComposition = screen.getByRole("region", {
      name: "Composition de l'équipe rouge",
    });
    const blueComposition = screen.getByRole("region", {
      name: "Composition de l'équipe bleue",
    });
    expect(
      within(redComposition).getByText("Sarah Benali"),
    ).toBeInTheDocument();
    expect(
      within(blueComposition).getByText("Inès Laurent"),
    ).toBeInTheDocument();
  });

  it("affiche le pseudo d’un invité comme buteur dans le résumé", () => {
    const guestFinishedMatch: MatchSlot = {
      ...match,
      status: "finished",
      attendees: [...match.attendees, "guest-id"],
      attendeeNames: { "guest-id": "Pote de Sam" },
      teams: [
        ["alex", "guest-id"],
        ["sarah", "malik", "ines"],
      ],
      goals: [
        {
          id: "guest-goal",
          scorerId: "guest-id",
          team: 0,
          elapsedSeconds: 360,
          createdAt: "2026-10-22T19:36:00.000Z",
        },
      ],
    };

    render(
      renderMatchDetailsContent({
        match: guestFinishedMatch,
        isFull: true,
        isRegistered: true,
        isRegistering: false,
        teams: guestFinishedMatch.teams,
        playerNames: { ...playerNames, "guest-id": "Pote de Sam" },
        onClose: vi.fn(),
        onRegister: vi.fn(),
      }),
    );

    expect(
      within(
        screen.getByRole("region", { name: "Buteurs de l'équipe rouge" }),
      ).getByText("Pote de Sam"),
    ).toBeInTheDocument();
  });

  it("affiche les meilleurs buteurs ex æquo et permet de voter pour l'homme du match", () => {
    const finishedMatch: MatchSlot = {
      ...match,
      status: "finished",
      teams: [
        ["alex", "sarah"],
        ["malik", "ines"],
      ],
      goals: [
        {
          id: "goal-1",
          scorerId: "alex",
          team: 0,
          elapsedSeconds: 120,
          createdAt: "2026-10-22T19:32:00.000Z",
        },
        {
          id: "goal-2",
          scorerId: "malik",
          team: 1,
          elapsedSeconds: 180,
          createdAt: "2026-10-22T19:33:00.000Z",
        },
      ],
    };
    const onVote = vi.fn();
    render(
      renderMatchDetailsContent({
        match: finishedMatch,
        isFull: true,
        isRegistered: true,
        isRegistering: false,
        teams: finishedMatch.teams,
        playerNames,
        onClose: vi.fn(),
        onRegister: vi.fn(),
        manOfTheMatchPoll: {
          myVote: null,
          voteTotals: [{ candidateId: "alex", voteCount: 1 }],
          voteCount: 1,
          eligibleVoterCount: 4,
          isComplete: false,
          winnerIds: [],
        },
        onVoteForManOfTheMatch: onVote,
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: /Malik Diallo/ }));

    expect(onVote).toHaveBeenCalledWith("malik");
    expect(
      screen.getByRole("heading", { name: "Meilleur buteur" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Alex Martin · 1 but").closest("li")).toHaveClass(
      "text-(--team-a-red)",
    );
    expect(screen.getByText("Malik Diallo · 1 but").closest("li")).toHaveClass(
      "text-(--team-b-blue)",
    );
  });

  it("affiche tous les hommes du match en cas d'égalité", () => {
    const finishedMatch: MatchSlot = {
      ...match,
      status: "finished",
      goals: [],
    };
    render(
      renderMatchDetailsContent({
        match: finishedMatch,
        isFull: true,
        isRegistered: true,
        isRegistering: false,
        playerNames,
        onClose: vi.fn(),
        onRegister: vi.fn(),
        manOfTheMatchPoll: {
          myVote: "alex",
          voteTotals: [
            { candidateId: "alex", voteCount: 2 },
            { candidateId: "malik", voteCount: 2 },
          ],
          voteCount: 4,
          eligibleVoterCount: 4,
          isComplete: true,
          winnerIds: ["alex", "malik"],
        },
      }),
    );

    expect(screen.getByText("Alex Martin, Malik Diallo")).toBeInTheDocument();
  });
});
