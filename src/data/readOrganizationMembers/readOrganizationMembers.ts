import type { OrganizationMember } from "../../types";
import { currentPlayerId } from "../currentPlayerId/currentPlayerId";
import { players } from "../players/players";

export function readOrganizationMembers(): OrganizationMember[] {
  try {
    const saved: unknown = JSON.parse(
      localStorage.getItem("compo-organization-members") ?? "null",
    );
    if (!Array.isArray(saved)) {
      return players.map((player) => ({
        user_id: player.id,
        display_name: player.name,
        role: player.id === currentPlayerId ? "owner" : "member",
      }));
    }
    return saved.map((member) => {
      if (typeof member === "string") {
        const player = players.find((candidate) => candidate.id === member);
        return {
          user_id: member,
          display_name: player?.name ?? "Joueur",
          role: member === currentPlayerId ? "owner" : "member",
        } satisfies OrganizationMember;
      }
      return member as OrganizationMember;
    });
  } catch {
    return players.map((player) => ({
      user_id: player.id,
      display_name: player.name,
      role: player.id === currentPlayerId ? "owner" : "member",
    }));
  }
}
