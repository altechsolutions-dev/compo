import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MatchDrawer } from "./MatchDrawer";
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

function renderDrawer({
  isOpen = true,
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
    <MatchDrawer
      match={renderedMatch}
      mounted
      open={isOpen}
      isFull={isFull}
      isRegistered={isRegistered}
      isRegistering={false}
      teams={renderedTeams}
      playerNames={playerNames}
      onClose={onClose}
      onRegister={onRegister}
    />,
  );
  return { onClose, onRegister };
}

describe("MatchDrawer", () => {
  it("affiche les deux équipes et les inscrits du match complet", () => {
    renderDrawer();

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Composition du match" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Alex Martin")).toBeInTheDocument();
    expect(screen.getByText("Inès Laurent")).toBeInTheDocument();
    expect(
      screen.getByText("COMPLET", { selector: "span" }),
    ).toBeInTheDocument();
  });

  it("ferme le drawer via le bouton et la touche Échap", () => {
    const { onClose } = renderDrawer();

    fireEvent.click(
      screen.getByRole("button", { name: "Fermer les détails du match" }),
    );
    fireEvent.keyDown(window, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("propose l’inscription tant que des places restent libres", () => {
    const { onRegister } = renderDrawer({
      isFull: false,
      isRegistered: false,
      teams: undefined,
    });

    fireEvent.click(screen.getByRole("button", { name: /Je m'inscris/ }));

    expect(onRegister).toHaveBeenCalledOnce();
  });
});
