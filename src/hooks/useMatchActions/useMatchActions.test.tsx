import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { MatchSlot } from "../../types";
import { currentPlayerId } from "../../data/currentPlayerId/currentPlayerId";
import { useMatchActions } from "./useMatchActions";

vi.mock("../../lib/supabase/supabase", () => ({ supabase: null }));

function setup(
  matches: MatchSlot[],
  overrides: Partial<{ matchDate: string; matchTime: string }> = {},
) {
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
    ...overrides,
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

  it("enregistre un but d’invité pour le résumé sans fiche de joueur", async () => {
    const match: MatchSlot = {
      id: "match-guest",
      date: "2030-06-15",
      time: "19:30",
      venue: "Stade municipal",
      maxPlayers: 2,
      attendees: ["player-1"],
      status: "in_progress",
      startedAt: new Date().toISOString(),
      teams: [["player-1"], ["guest-id"]],
      attendeeNames: { "guest-id": "Pote de Sam" },
      goals: [],
    };
    const { result, getMatches } = setup([match]);

    await act(() => result.current.recordGoal("match-guest", "guest-id"));

    expect(getMatches()[0].goals).toHaveLength(1);
    expect(getMatches()[0].goals?.[0]).toMatchObject({
      scorerId: "guest-id",
      team: 1,
    });
    expect(getMatches()[0].attendeeNames?.["guest-id"]).toBe("Pote de Sam");
  });

  it("ajoute l’ami au match avec son pseudo et sans profil joueur", async () => {
    const match: MatchSlot = {
      id: "match-guest",
      date: "2030-06-15",
      time: "19:30",
      venue: "Stade municipal",
      maxPlayers: 4,
      attendees: ["player-1"],
    };
    const { result, getMatches } = setup([match]);

    await act(() => result.current.addGuestToMatch("match-guest", "  Alex  "));

    const updatedMatch = getMatches()[0];
    const guestId = updatedMatch.attendees[1];
    expect(updatedMatch.attendeeNames).toEqual({ [guestId]: "Alex" });
    expect(updatedMatch.attendees).toHaveLength(2);
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

  it("modifie un créneau local créé par le joueur courant", async () => {
    const match: MatchSlot = {
      id: "match-edit",
      createdBy: currentPlayerId,
      date: "2030-06-15",
      time: "19:30",
      venue: "Ancien terrain",
      maxPlayers: 10,
      attendees: [currentPlayerId, "player-2"],
    };
    const { result, props, getMatches } = setup([match]);
    const preventDefault = vi.fn();

    await act(() =>
      result.current.updateMatch("match-edit", { preventDefault } as never),
    );

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(getMatches()[0]).toMatchObject({
      date: "2030-06-15",
      time: "19:30",
      venue: "Stade municipal",
      maxPlayers: 10,
    });
    expect(props.closeMatchDialog).toHaveBeenCalledOnce();
  });

  it("refuse de modifier un créneau à une date et heure passées", async () => {
    const match: MatchSlot = {
      id: "match-past-edit",
      createdBy: currentPlayerId,
      date: "2030-06-15",
      time: "19:30",
      venue: "Terrain actuel",
      maxPlayers: 10,
      attendees: [],
    };
    const { result, props, getMatches } = setup([match], {
      matchDate: "2000-01-01",
      matchTime: "12:00",
    });

    await act(() =>
      result.current.updateMatch("match-past-edit", {
        preventDefault: vi.fn(),
      } as never),
    );

    expect(getMatches()[0]).toEqual(match);
    expect(props.setFeatureNotice).toHaveBeenCalledWith(
      "La date et l’heure du créneau doivent être dans le futur.",
    );
    expect(props.closeMatchDialog).not.toHaveBeenCalled();
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

  it("enregistre les équipes d’un match complet sans le démarrer", async () => {
    const match: MatchSlot = {
      id: "match-scheduled-teams",
      date: "2030-06-15",
      time: "19:30",
      venue: "Stade municipal",
      maxPlayers: 4,
      attendees: ["alex", "ava", "sam", "sasha"],
    };
    const { result, getMatches, props } = setup([match]);

    let saved = false;
    await act(async () => {
      saved = await result.current.saveScheduledMatchTeams(
        "match-scheduled-teams",
        [
          ["sam", "ava"],
          ["alex", "sasha"],
        ],
      );
    });

    expect(saved).toBe(true);
    expect(getMatches()[0].status).toBeUndefined();
    expect(getMatches()[0].teams).toEqual([
      ["sam", "ava"],
      ["alex", "sasha"],
    ]);
    expect(props.setMatchNotice).toHaveBeenCalledWith("");
  });

  it("échange un joueur de chaque équipe en conservant les effectifs", async () => {
    const match: MatchSlot = {
      id: "match-live",
      date: "2030-06-15",
      time: "19:30",
      venue: "Stade municipal",
      maxPlayers: 4,
      attendees: ["alex", "ava", "sam", "sasha"],
      status: "in_progress",
      startedAt: "2030-06-15T19:30:00.000Z",
      teams: [
        ["alex", "ava"],
        ["sam", "sasha"],
      ],
      goals: [],
    };
    const { result, getMatches } = setup([match]);

    await act(() => result.current.swapPlayers("match-live", "alex", "sasha"));

    expect(getMatches()[0].teams).toEqual([
      ["sasha", "ava"],
      ["sam", "alex"],
    ]);
  });

  it("autorise les buts et échanges pendant la pause sans avancer le chrono", async () => {
    const match: MatchSlot = {
      id: "match-paused",
      date: "2030-06-15",
      time: "19:30",
      venue: "Stade municipal",
      maxPlayers: 4,
      attendees: ["alex", "ava", "sam", "sasha"],
      status: "paused",
      elapsedSeconds: 78,
      teams: [
        ["alex", "ava"],
        ["sam", "sasha"],
      ],
      goals: [],
    };
    const { result, getMatches } = setup([match]);

    await act(() => result.current.recordGoal("match-paused", "alex"));
    await act(() =>
      result.current.swapPlayers("match-paused", "alex", "sasha"),
    );

    expect(getMatches()[0].goals?.[0]).toMatchObject({
      scorerId: "alex",
      elapsedSeconds: 78,
    });
    expect(getMatches()[0].teams).toEqual([
      ["sasha", "ava"],
      ["sam", "alex"],
    ]);
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
