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
      screen
        .getAllByRole("heading", { level: 4 })
        .map((heading) => heading.textContent),
    ).toEqual(["Équipe Bleue", "Équipe Rouge"]);
    expect(screen.queryByText("COMPLET", { selector: "span" })).toBeNull();
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

    fireEvent.click(
      screen.getByRole("button", { name: "Modifier la composition" }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Sélectionner Alex Martin dans l'équipe Rouge",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Sélectionner Malik Diallo dans l'équipe Bleue",
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

  it("affiche le fil chronologique et la composition standard pour un match terminé", () => {
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

    expect(
      within(
        screen.getByRole("region", { name: "Score du match" }),
      ).getAllByText("1", { selector: "strong" }),
    ).toHaveLength(2);
    expect(
      within(screen.getByRole("region", { name: "Score du match" })).getByText(
        "TERMINÉ",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("timer", { name: "Temps de jeu" }),
    ).toHaveTextContent("60:00");
    expect(
      within(screen.getByRole("region", { name: "Score du match" })).getByText(
        "60:00",
      ),
    ).toBeInTheDocument();
    const goalTimeline = screen.getByRole("list", {
      name: "Événements du match",
    });
    expect(within(goalTimeline).getAllByRole("listitem")[0]).toHaveTextContent(
      "Malik Diallo",
    );
    expect(within(goalTimeline).getAllByRole("listitem")[0]).toHaveTextContent(
      "04:05",
    );
    expect(within(goalTimeline).getAllByRole("listitem")[1]).toHaveTextContent(
      "Alex Martin",
    );
    expect(within(goalTimeline).getAllByRole("listitem")[1]).toHaveTextContent(
      "02:05",
    );
    expect(
      screen.getByRole("heading", { name: "Composition du match" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Composition du match" })
        .parentElement?.parentElement,
    ).toHaveClass("mt-0", "pt-1");
    expect(screen.getByText("Sarah Benali")).toBeInTheDocument();
    expect(screen.getByText("Inès Laurent")).toBeInTheDocument();
  });

  it("copie le lien du résumé terminé avec l’identifiant du match", async () => {
    const finishedMatch: MatchSlot = {
      ...match,
      id: "match / 1",
      status: "finished",
    };
    const writeText = vi.fn().mockResolvedValue(undefined);
    const clipboardDescriptor = Object.getOwnPropertyDescriptor(
      navigator,
      "clipboard",
    );
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    try {
      render(
        renderMatchDetailsContent({
          match: finishedMatch,
          isFull: true,
          isRegistered: true,
          isRegistering: false,
          playerNames,
          onClose: vi.fn(),
          onRegister: vi.fn(),
        }),
      );

      fireEvent.click(
        screen.getByRole("button", { name: "Partager le résumé" }),
      );

      await waitFor(() =>
        expect(writeText).toHaveBeenCalledWith(
          `${window.location.origin}/app/matches?match=match+%2F+1`,
        ),
      );
      expect(
        screen.getByRole("button", { name: "Lien copié" }),
      ).toBeInTheDocument();
    } finally {
      if (clipboardDescriptor) {
        Object.defineProperty(navigator, "clipboard", clipboardDescriptor);
      } else {
        Reflect.deleteProperty(navigator, "clipboard");
      }
    }
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
        screen.getByRole("list", { name: "Événements du match" }),
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
          myVote: "malik",
          voteTotals: [{ candidateId: "alex", voteCount: 1 }],
          voteCount: 1,
          eligibleVoterCount: 4,
          isComplete: false,
          winnerIds: [],
        },
        onVoteForManOfTheMatch: onVote,
      }),
    );

    expect(
      screen.getByRole("button", { name: /Malik Diallo/ }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Malik Diallo/ })).toHaveClass(
      "cursor-pointer",
      "focus-visible:outline-2",
      "enabled:hover:bg-(--team-b-blue)/25",
      "border-l-(--team-b-blue)",
    );
    expect(screen.getByRole("button", { name: /Alex Martin/ })).toHaveClass(
      "border-l-(--team-a-red)",
      "enabled:hover:border-(--team-a-red)",
      "enabled:hover:bg-(--team-a-red)/10",
    );
    expect(
      within(screen.getByRole("button", { name: /Alex Martin/ })).getByText(
        "Alex Martin",
      ),
    ).toHaveClass("text-(--team-a-red)");
    fireEvent.click(screen.getByRole("button", { name: /Malik Diallo/ }));

    expect(onVote).toHaveBeenCalledWith("malik");
    expect(
      screen.getByRole("region", { name: "Distinctions du match" }),
    ).toHaveClass("border-l-4");
    expect(
      screen.getByRole("progressbar", { name: "Participation au vote" }),
    ).toHaveAttribute("aria-valuenow", "1");
    const motmSection = screen.getByRole("region", {
      name: "Vote homme du match",
    });
    expect(
      within(
        within(motmSection).getByRole("region", { name: "Équipe Bleue" }),
      ).getByRole("button", { name: /Malik Diallo/ }),
    ).toBeInTheDocument();
    expect(
      within(
        within(motmSection).getByRole("region", { name: "Équipe Rouge" }),
      ).getByRole("button", { name: /Alex Martin/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Cliquez pour voter ou changer votre choix."),
    ).toBeInTheDocument();
    const distinctions = screen.getByRole("region", {
      name: "Distinctions du match",
    });
    expect(
      within(distinctions).getByRole("heading", {
        level: 2,
        name: "Distinctions du match",
      }),
    ).toBeInTheDocument();
    expect(
      within(distinctions).getByRole("heading", {
        level: 3,
        name: "Homme du match",
      }),
    ).toBeInTheDocument();
    const bestScorers = within(distinctions).getByRole("region", {
      name: /Meilleurs? buteurs?/,
    });
    expect(
      within(bestScorers).getByRole("heading", {
        level: 3,
        name: "Meilleurs buteurs",
      }),
    ).toBeInTheDocument();
    expect(bestScorers).toHaveTextContent(
      "Meilleurs buteursAlex Martin et Malik Diallo avec 1 but chacun",
    );
    expect(within(bestScorers).getByText("Alex Martin")).toHaveClass(
      "text-(--team-a-red)",
    );
    expect(within(bestScorers).getByText("Malik Diallo")).toHaveClass(
      "text-(--team-b-blue)",
    );
    expect(bestScorers).toHaveTextContent("avec 1 but chacun");
  });

  it("réserve un emplacement fixe au message d'enregistrement du vote", () => {
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
        teams: [
          ["alex", "sarah"],
          ["malik", "ines"],
        ],
        playerNames,
        onClose: vi.fn(),
        onRegister: vi.fn(),
        manOfTheMatchPoll: {
          myVote: null,
          voteTotals: [],
          voteCount: 0,
          eligibleVoterCount: 4,
          isComplete: false,
          winnerIds: [],
        },
        manOfTheMatchVoteSaving: true,
        onVoteForManOfTheMatch: vi.fn(),
      }),
    );

    const savingMessage = screen.getByText("Enregistrement de votre vote…");
    expect(savingMessage.parentElement).toHaveClass("mt-2", "min-h-3");
    const candidateButton = screen.getByRole("button", { name: /Alex Martin/ });
    expect(candidateButton).toHaveAttribute("aria-disabled", "true");
    expect(candidateButton).not.toBeDisabled();
    expect(candidateButton).toHaveClass(
      "cursor-pointer",
      "enabled:hover:bg-(--team-a-red)/10",
    );
  });

  it("conserve la couleur rouge de l'équipe pour le joueur sélectionné", () => {
    const finishedMatch: MatchSlot = {
      ...match,
      status: "finished",
      teams: [
        ["alex", "sarah"],
        ["malik", "ines"],
      ],
      goals: [],
    };

    render(
      renderMatchDetailsContent({
        match: finishedMatch,
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
        manOfTheMatchPoll: {
          myVote: "alex",
          voteTotals: [],
          voteCount: 1,
          eligibleVoterCount: 4,
          isComplete: false,
          winnerIds: [],
        },
      }),
    );

    expect(screen.getByRole("button", { name: /Alex Martin/ })).toHaveClass(
      "border-(--team-a-red)",
      "bg-(--team-a-red)/15",
      "ring-(--team-a-red)",
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
        teams: [
          ["alex", "sarah"],
          ["malik", "ines"],
        ],
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

    const motmSection = screen.getByRole("region", {
      name: "Vote homme du match",
    });
    expect(motmSection).toHaveTextContent("Vote clôturé");
    expect(within(motmSection).getAllByRole("listitem")).toHaveLength(2);
    expect(
      within(motmSection).getByText("Alex Martin").closest("li"),
    ).toHaveClass("border-(--team-a-red)/35", "text-(--team-a-red)");
    expect(
      within(motmSection).getByText("Malik Diallo").closest("li"),
    ).toHaveClass("border-(--team-b-blue)/35", "text-(--team-b-blue)");
  });
});
