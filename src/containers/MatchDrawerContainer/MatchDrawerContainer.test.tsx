import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MatchDrawerContainer } from "./MatchDrawerContainer";
import type { MatchSlot } from "../../types";

const fullMatch: MatchSlot = {
  id: "full-match",
  date: "2026-10-23",
  time: "19:30",
  venue: "Urban Soccer",
  maxPlayers: 2,
  attendees: ["alex", "sam"],
};

describe("MatchDrawerContainer", () => {
  it("calcule l’état complet, l’inscription et compose les équipes", () => {
    const composeTeams = vi.fn(
      () => [["alex"], ["sam"]] as [string[], string[]],
    );
    render(
      <MatchDrawerContainer
        match={fullMatch}
        mounted
        open
        currentAttendeeId="alex"
        isRegistering={false}
        playerNames={{ alex: "Alex Martin", sam: "Sam Lee" }}
        composeTeams={composeTeams}
        onClose={vi.fn()}
        onRegister={vi.fn()}
        onStartMatch={vi.fn()}
        onRecordGoal={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("dialog", { name: /19:30.*Foot à 5/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("MATCH COMPLET")).toBeInTheDocument();
    expect(screen.getByText("Composition du match")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Je m'inscris" }),
    ).not.toBeInTheDocument();
    expect(composeTeams).toHaveBeenCalledWith(fullMatch.attendees);
  });

  it("ne rend rien sans match sélectionné", () => {
    const { container } = render(
      <MatchDrawerContainer
        mounted={false}
        open={false}
        currentAttendeeId="alex"
        isRegistering={false}
        playerNames={{}}
        composeTeams={() => [[], []]}
        onClose={vi.fn()}
        onRegister={vi.fn()}
        onStartMatch={vi.fn()}
        onRecordGoal={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
