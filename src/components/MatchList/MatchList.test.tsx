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
    fireEvent.click(screen.getByRole("button", { name: "Terminés" }));
    expect(onFilterChange).toHaveBeenCalledWith("finished");
  });

  it("affiche seulement le score et le chrono avant d’ouvrir le résumé", () => {
    const finishedMatch: MatchSlot = {
      ...availableMatch,
      id: "finished",
      status: "finished",
      elapsedSeconds: 2730,
      goals: [
        {
          id: "goal-1",
          scorerId: "alex",
          team: 0,
          elapsedSeconds: 90,
          createdAt: "2026-10-22T19:31:30.000Z",
        },
      ],
    };
    const onOpenMatch = vi.fn();
    render(
      <MatchList
        matches={[finishedMatch]}
        totalMatchCount={1}
        currentAttendeeId="current-player"
        matchRegistering={false}
        filter="finished"
        notice=""
        onFilterChange={vi.fn()}
        onOpenMatch={onOpenMatch}
        onRegister={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Matchs terminés" }),
    ).toBeInTheDocument();
    expect(screen.getByText("1", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("Chrono · 45:30")).toBeInTheDocument();
    expect(screen.queryByText("Buteurs · Alex")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Voir le résumé" }));
    expect(onOpenMatch).toHaveBeenCalledWith("finished");
    expect(
      screen.queryByRole("button", { name: "Rejoindre le match" }),
    ).not.toBeInTheDocument();
  });

  it("met le dernier résultat en évidence au-dessus des prochains matchs", () => {
    const latestFinishedMatch: MatchSlot = {
      ...availableMatch,
      id: "latest",
      status: "finished",
      goals: [
        {
          id: "latest-goal",
          scorerId: "alex",
          team: 1,
          elapsedSeconds: 125,
          createdAt: "2030-06-15T19:32:05.000Z",
        },
      ],
    };
    render(
      <MatchList
        matches={[availableMatch]}
        totalMatchCount={1}
        currentAttendeeId="current-player"
        matchRegistering={false}
        filter="all"
        notice=""
        latestFinishedMatch={latestFinishedMatch}
        onFilterChange={vi.fn()}
        onOpenMatch={vi.fn()}
        onRegister={vi.fn()}
      />,
    );

    expect(screen.getByText("DERNIER RÉSULTAT")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Voir le résumé" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Voir le résumé" }).closest("article"),
    ).toHaveClass("match-list__winner-gradient");
    expect(
      screen.getByRole("button", { name: "Voir le résumé" }).closest("article"),
    ).toHaveAttribute("data-winner", "blue");
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

  it("affiche un état vide dédié au filtre des matchs terminés", () => {
    render(
      <MatchList
        matches={[]}
        totalMatchCount={0}
        currentAttendeeId="alex"
        matchRegistering={false}
        filter="finished"
        notice=""
        onFilterChange={vi.fn()}
        onOpenMatch={vi.fn()}
        onRegister={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Aucun match terminé pour le moment."),
    ).toBeInTheDocument();
  });
});
