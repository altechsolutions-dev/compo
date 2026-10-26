import { act, renderHook } from "@testing-library/react";
import type { Session } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { useMatches } from "./useMatches";

const { supabaseRpc } = vi.hoisted(() => ({ supabaseRpc: vi.fn() }));

vi.mock("../../lib/supabase/supabase", () => ({
  supabase: { rpc: supabaseRpc },
}));

describe("useMatches", () => {
  it("filtre les matchs disponibles et persiste les modifications locales", () => {
    localStorage.setItem(
      "compo-matches",
      JSON.stringify([
        {
          id: "full",
          date: "2030-06-15",
          time: "19:30",
          venue: "Terrain A",
          maxPlayers: 1,
          attendees: ["player-1"],
        },
        {
          id: "open",
          date: "2030-06-16",
          time: "19:30",
          venue: "Terrain B",
          maxPlayers: 2,
          attendees: [],
        },
        {
          id: "live",
          date: "2030-06-17",
          time: "19:30",
          venue: "Terrain C",
          maxPlayers: 2,
          attendees: ["player-1", "player-2"],
          status: "in_progress",
          startedAt: "2030-06-17T19:30:00.000Z",
          teams: [["player-1"], ["player-2"]],
          goals: [],
        },
        {
          id: "finished",
          date: "2030-06-18",
          time: "19:30",
          venue: "Terrain D",
          maxPlayers: 2,
          attendees: ["player-1", "player-2"],
          status: "finished",
          elapsedSeconds: 3600,
          teams: [["player-1"], ["player-2"]],
          goals: [],
        },
      ]),
    );
    const { result } = renderHook(() =>
      useMatches({
        session: null,
        organizationId: null,
        organizationMembers: [],
      }),
    );

    act(() => result.current.setMatchFilter("available"));

    expect(result.current.filteredMatches.map((match) => match.id)).toEqual([
      "open",
      "live",
    ]);
    expect(
      result.current.visibleMatches.map((match) => match.id),
    ).not.toContain("finished");
    expect(result.current.allMatches.map((match) => match.id)).toContain(
      "finished",
    );

    act(() => result.current.setMatches([]));

    expect(JSON.parse(localStorage.getItem("compo-matches") ?? "null")).toEqual(
      [],
    );
  });

  it("ne recharge pas les matchs si la référence de session change pour le même utilisateur", async () => {
    supabaseRpc.mockResolvedValue({ data: [], error: null });
    const session = { user: { id: "user-1" } } as Session;
    const { rerender } = renderHook(
      ({ currentSession }) =>
        useMatches({
          session: currentSession,
          organizationId: "organization-1",
          organizationMembers: [],
        }),
      { initialProps: { currentSession: session } },
    );

    rerender({ currentSession: { user: { id: "user-1" } } as Session });

    expect(supabaseRpc).toHaveBeenCalledTimes(1);
    expect(supabaseRpc).toHaveBeenCalledWith("get_match_slots", {
      p_organization_id: "organization-1",
    });
  });

  it("rafraîchit les matchs toutes les minutes", async () => {
    vi.useFakeTimers();
    supabaseRpc.mockResolvedValue({
      data: [
        {
          id: "match-1",
          created_by: "user-1",
          match_date: "2030-06-17",
          match_time: "19:30",
          venue: "Terrain A",
          max_players: 2,
          attendees: ["user-1", "user-2"],
          status: "in_progress",
          started_at: "2030-06-17T19:30:00.000Z",
          elapsed_seconds: 0,
          team_a: ["user-1"],
          team_b: ["user-2"],
          goals: [],
        },
      ],
      error: null,
    });
    const session = { user: { id: "user-1" } } as Session;
    const { result, rerender, unmount } = renderHook(
      ({ isLiveView }) =>
        useMatches({
          session,
          organizationId: "organization-1",
          organizationMembers: [],
          isLiveView,
        }),
      { initialProps: { isLiveView: false } },
    );

    try {
      await act(async () => {
        await supabaseRpc.mock.results[0].value;
        await Promise.resolve();
      });
      expect(supabaseRpc).toHaveBeenCalledTimes(1);
      expect(result.current.matches[0].createdBy).toBe("user-1");

      await act(async () => {
        await vi.advanceTimersByTimeAsync(59_999);
      });
      expect(supabaseRpc).toHaveBeenCalledTimes(1);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
      });
      expect(supabaseRpc).toHaveBeenCalledTimes(2);

      rerender({ isLiveView: false });
      await act(async () => {
        await Promise.resolve();
      });
      expect(supabaseRpc).toHaveBeenCalledTimes(2);
    } finally {
      unmount();
      vi.useRealTimers();
    }
  });
});
