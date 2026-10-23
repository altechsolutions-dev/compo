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
});
