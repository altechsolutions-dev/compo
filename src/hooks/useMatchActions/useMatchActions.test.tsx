import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { MatchSlot } from "../../types";
import { currentPlayerId } from "../../data/currentPlayerId/currentPlayerId";
import { useMatchActions } from "./useMatchActions";

function setup(matches: MatchSlot[]) {
  let currentMatches = matches;
  const setMatches = vi.fn(
    (update: MatchSlot[] | ((current: MatchSlot[]) => MatchSlot[])) => {
      currentMatches =
        typeof update === "function" ? update(currentMatches) : update;
    },
  );
  const props = {
    matches,
    setMatches,
    session: null,
    organizationId: null,
    currentAttendeeId: currentPlayerId,
    matchRegistering: false,
    setMatchRegistering: vi.fn(),
    venue: "Stade municipal",
    setVenue: vi.fn(),
    matchDate: "2030-06-15",
    matchTime: "19:30",
    matchMaxPlayers: 10,
    joinMatchOnCreate: true,
    setMatchSaving: vi.fn(),
    setMatchNotice: vi.fn(),
    setFeatureNotice: vi.fn(),
    setSelectedMatchId: vi.fn(),
    closeMatchDialog: vi.fn(),
    showMatchesView: vi.fn(),
  };
  return {
    ...renderHook(() => useMatchActions(props)),
    props,
    getMatches: () => currentMatches,
  };
}

describe("useMatchActions", () => {
  it("inscrit le joueur courant dans un match de démonstration", async () => {
    const match: MatchSlot = {
      id: "match-1",
      date: "2030-06-15",
      time: "19:30",
      venue: "Stade municipal",
      maxPlayers: 10,
      attendees: ["player-1"],
    };
    const { result, getMatches } = setup([match]);

    await act(() => result.current.registerForMatch("match-1"));

    expect(getMatches()[0].attendees).toEqual(["player-1", currentPlayerId]);
  });

  it("crée un match local et ferme le dialogue", async () => {
    const { result, props, getMatches } = setup([]);
    const preventDefault = vi.fn();

    await act(() => result.current.createMatch({ preventDefault } as never));

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(getMatches()).toHaveLength(1);
    expect(getMatches()[0]).toMatchObject({
      venue: "Stade municipal",
      attendees: [currentPlayerId],
    });
    expect(props.closeMatchDialog).toHaveBeenCalledOnce();
    expect(props.showMatchesView).toHaveBeenCalledOnce();
  });
});
