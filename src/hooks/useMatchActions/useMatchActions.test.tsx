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
  const hook = renderHook(() =>
    useMatchActions({ ...props, matches: currentMatches }),
  );
  return {
    ...hook,
    rerenderMatches: () => hook.rerender(),
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

  it("lance un match complet et attribue un but à la bonne équipe", async () => {
    const match: MatchSlot = {
      id: "match-live",
      date: "2030-06-15",
      time: "19:30",
      venue: "Stade municipal",
      maxPlayers: 2,
      attendees: ["alex", "sam"],
    };
    const { result, getMatches, rerenderMatches } = setup([match]);

    await act(() =>
      result.current.startMatch("match-live", [["alex"], ["sam"]]),
    );

    expect(getMatches()[0]).toMatchObject({
      status: "in_progress",
      teams: [["alex"], ["sam"]],
    });
    rerenderMatches();
    await act(() => result.current.recordGoal("match-live", "alex"));

    expect(getMatches()[0].goals).toHaveLength(1);
    expect(getMatches()[0].goals?.[0]).toMatchObject({
      scorerId: "alex",
      team: 0,
    });
  });

  it("déplace un joueur dans l’autre équipe pendant un match", async () => {
    const match: MatchSlot = {
      id: "match-live",
      date: "2030-06-15",
      time: "19:30",
      venue: "Stade municipal",
      maxPlayers: 2,
      attendees: ["alex", "sam"],
      status: "in_progress",
      startedAt: "2030-06-15T19:30:00.000Z",
      teams: [["alex"], ["sam"]],
      goals: [],
    };
    const { result, getMatches } = setup([match]);

    await act(() => result.current.switchTeam("match-live", "alex"));

    expect(getMatches()[0].teams).toEqual([[], ["sam", "alex"]]);
  });

  it("met en pause, reprend puis termine un match en conservant le temps", async () => {
    const match: MatchSlot = {
      id: "match-live",
      date: "2030-06-15",
      time: "19:30",
      venue: "Stade municipal",
      maxPlayers: 2,
      attendees: ["alex", "sam"],
      status: "in_progress",
      startedAt: new Date(Date.now() - 5_000).toISOString(),
      elapsedSeconds: 12,
      teams: [["alex"], ["sam"]],
      goals: [],
    };
    const { result, getMatches, rerenderMatches } = setup([match]);

    await act(() => result.current.setMatchState("match-live", "pause"));
    expect(getMatches()[0]).toMatchObject({ status: "paused" });
    expect(getMatches()[0].elapsedSeconds).toBeGreaterThanOrEqual(17);
    const elapsedAtPause = getMatches()[0].elapsedSeconds;

    rerenderMatches();
    await act(() => result.current.setMatchState("match-live", "resume"));
    expect(getMatches()[0]).toMatchObject({ status: "in_progress" });
    expect(getMatches()[0].elapsedSeconds).toBe(elapsedAtPause);

    rerenderMatches();
    await act(() => result.current.setMatchState("match-live", "finish"));
    expect(getMatches()[0]).toMatchObject({ status: "finished" });
    expect(getMatches()[0].startedAt).toBeUndefined();
  });
});
