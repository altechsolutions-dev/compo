import { fireEvent, render, screen } from "@testing-library/react";
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
});
