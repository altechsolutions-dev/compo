import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MatchList } from "./MatchList";
import type { MatchSlot } from "../../types";

const availableMatch: MatchSlot = {
  id: "available",
  date: "2026-10-22",
  time: "19:30",
  venue: "Urban Soccer",
  maxPlayers: 10,
  attendees: ["alex"],
};

const fullMatch: MatchSlot = {
  ...availableMatch,
  id: "full",
  attendees: Array.from({ length: 10 }, (_, index) => `player-${index}`),
};

function renderList(matches: MatchSlot[], totalMatchCount = matches.length) {
  const onFilterChange = vi.fn();
  const onOpenMatch = vi.fn();
  const onRegister = vi.fn();
  render(
    <MatchList
      matches={matches}
      totalMatchCount={totalMatchCount}
      currentAttendeeId="current-player"
      matchRegistering={false}
      filter="all"
      notice=""
      onFilterChange={onFilterChange}
      onOpenMatch={onOpenMatch}
      onRegister={onRegister}
    />,
  );
  return { onFilterChange, onOpenMatch, onRegister };
}

describe("MatchList", () => {
  it("affiche les matchs et transmet le changement de filtre", () => {
    const { onFilterChange } = renderList([availableMatch, fullMatch]);

    expect(screen.getAllByTestId("match-card")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Places libres" }));
    expect(onFilterChange).toHaveBeenCalledWith("available");
  });

  it("distingue une liste vide de matchs complets d’une liste sans matchs", () => {
    const { rerender } = render(
      <MatchList
        matches={[]}
        totalMatchCount={0}
        currentAttendeeId="alex"
        matchRegistering={false}
        filter="all"
        notice=""
        onFilterChange={vi.fn()}
        onOpenMatch={vi.fn()}
        onRegister={vi.fn()}
      />,
    );
    expect(
      screen.getByText("Aucun match prévu pour le moment."),
    ).toBeInTheDocument();

    rerender(
      <MatchList
        matches={[]}
        totalMatchCount={2}
        currentAttendeeId="alex"
        matchRegistering={false}
        filter="available"
        notice=""
        onFilterChange={vi.fn()}
        onOpenMatch={vi.fn()}
        onRegister={vi.fn()}
      />,
    );
    expect(
      screen.getByText("Tous les matchs sont complets."),
    ).toBeInTheDocument();
  });
});
