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

function renderCard(match: MatchSlot = baseMatch) {
  const onOpen = vi.fn();
  const onRegister = vi.fn();
  render(
    <MatchCard
      match={match}
      isSelected={false}
      currentAttendeeId="current-player"
      matchRegistering={false}
      onOpen={onOpen}
      onRegister={onRegister}
    />,
  );
  return { onOpen, onRegister };
}

describe("MatchCard", () => {
  it("affiche les inscriptions et ouvre le drawer depuis la date", () => {
    const { onOpen } = renderCard();

    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "2",
    );
    expect(screen.getByText("Urban Soccer")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /Afficher les détails du match/ }),
    );
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it("signale un match complet et désactive l’inscription", () => {
    const fullMatch = {
      ...baseMatch,
      attendees: Array.from({ length: 10 }, (_, index) => `player-${index}`),
    };
    const { onRegister } = renderCard(fullMatch);

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
  });

  it("déclenche l’inscription sans ouvrir le drawer", () => {
    const { onOpen, onRegister } = renderCard();

    fireEvent.click(screen.getByRole("button", { name: /Rejoindre le match/ }));

    expect(onRegister).toHaveBeenCalledOnce();
    expect(onOpen).not.toHaveBeenCalled();
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

    expect(screen.getByText("EN COURS · 1 - 0")).toBeInTheDocument();
    fireEvent.click(liveButton);

    expect(onOpen).toHaveBeenCalledOnce();
    expect(onRegister).not.toHaveBeenCalled();
  });
});
