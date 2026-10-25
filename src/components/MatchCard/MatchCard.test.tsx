import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MatchCard } from "./MatchCard";
import type { MatchSlot } from "../../types";

const baseMatch: MatchSlot = {
  id: "match-1",
  date: "2026-10-22",
  time: "19:30",
  venue: "Urban Soccer",
  maxPlayers: 10,
  attendees: ["alex", "sarah"],
};

function renderCard(
  match: MatchSlot = baseMatch,
  playerNames: Record<string, string> = {},
) {
  const onOpen = vi.fn();
  const onRegister = vi.fn();
  render(
    <MatchCard
      match={match}
      isSelected={false}
      currentAttendeeId="current-player"
      matchRegistering={false}
      playerNames={playerNames}
      onOpen={onOpen}
      onRegister={onRegister}
    />,
  );
  return { onOpen, onRegister };
}

describe("MatchCard", () => {
  it("affiche directement les bulles des inscrits sans ouvrir le drawer", () => {
    const { onOpen } = renderCard(baseMatch, {
      alex: "Alex Martin",
      sarah: "Sarah Doe",
    });

    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "2",
    );
    expect(screen.getByText("Urban Soccer")).toBeInTheDocument();
    expect(screen.getByTitle("Alex Martin")).toHaveTextContent("AM");
    expect(screen.getByTitle("Sarah Doe")).toHaveTextContent("SD");
    expect(
      screen.getByRole("button", { name: /Afficher les inscrits du match/ }),
    ).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(
      screen.getByRole("button", { name: /Afficher les inscrits du match/ }),
    );
    expect(onOpen).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Match de foot à 5" }));
    expect(onOpen).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: /Afficher les inscrits du match/ }),
    ).toHaveAttribute("aria-expanded", "true");
  });

  it("signale un match complet et désactive l’inscription", () => {
    const fullMatch = {
      ...baseMatch,
      attendees: Array.from({ length: 10 }, (_, index) => `player-${index}`),
    };
    const { onOpen, onRegister } = renderCard(fullMatch);

    expect(screen.getByText("COMPLET · COMPO DISPONIBLE")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "10",
    );
    expect(
      screen.getByRole("button", { name: "Match complet" }),
    ).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Match complet" }));
    expect(onRegister).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", { name: /Afficher les détails du match/ }),
    );
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it("déclenche l’inscription sans ouvrir le drawer", () => {
    const { onOpen, onRegister } = renderCard();

    fireEvent.click(screen.getByRole("button", { name: /Rejoindre le match/ }));

    expect(onRegister).toHaveBeenCalledOnce();
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("met en évidence l’inscription et verrouille le bouton", () => {
    const signedMatch = {
      ...baseMatch,
      attendees: [...baseMatch.attendees, "current-player"],
    };
    const { onRegister } = renderCard(signedMatch);
    const signedButton = screen.getByRole("button", {
      name: "Vous êtes inscrit",
    });

    expect(signedButton).toBeDisabled();
    expect(signedButton).toHaveClass(
      "bg-(--team-b-blue)/15",
      "text-(--team-b-blue)",
      "disabled:opacity-100",
    );
    expect(signedButton.querySelector("svg")).toHaveClass("lucide-check");

    fireEvent.click(signedButton);
    expect(onRegister).not.toHaveBeenCalled();
  });

  it("affiche le score du direct et ouvre les détails du match en cours", () => {
    const liveMatch: MatchSlot = {
      ...baseMatch,
      attendees: Array.from({ length: 10 }, (_, index) => `player-${index}`),
      status: "in_progress",
      goals: [
        {
          id: "goal-1",
          scorerId: "alex",
          team: 0,
          elapsedSeconds: 125,
          createdAt: "2030-06-15T19:32:05.000Z",
        },
      ],
    };
    const { onOpen, onRegister } = renderCard(liveMatch);
    const liveButton = screen.getByRole("button", { name: "Voir le direct" });

    expect(screen.getByText("EN COURS · 0 - 1")).toBeInTheDocument();
    fireEvent.click(liveButton);

    expect(onOpen).toHaveBeenCalledOnce();
    expect(onRegister).not.toHaveBeenCalled();
  });
});
