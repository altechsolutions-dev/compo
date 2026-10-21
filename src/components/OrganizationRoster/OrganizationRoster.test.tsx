import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OrganizationRoster } from "./OrganizationRoster";
import type { OrganizationMember, Player } from "../../types";

const members: OrganizationMember[] = [
  { user_id: "player-1", display_name: "Alex Martin", role: "owner" },
  { user_id: "player-2", display_name: "Sam Lee", role: "member" },
];

const players: Player[] = [
  {
    id: "player-1",
    name: "Alex Martin",
    position: "Milieu",
    attack: 80,
    defense: 70,
    stamina: 90,
  },
];

describe("OrganizationRoster", () => {
  it("affiche les membres, leurs stats et identifie l’utilisateur courant", () => {
    render(
      <OrganizationRoster
        organization="Les Panthères"
        members={members}
        players={players}
        currentUserId="player-1"
        canInvite
        getPlayerRating={(player) =>
          Math.round((player.attack + player.defense + player.stamina) / 3)
        }
        onInvite={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("table", { name: "Effectif de l’organisation" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Alex Martin")).toBeInTheDocument();
    expect(screen.getByText("Vous")).toBeInTheDocument();
    expect(screen.getAllByText("80")).toHaveLength(2);
    expect(screen.getByText("Joueur")).toBeInTheDocument();
  });

  it("signale un effectif vide et permet de déclencher une invitation", () => {
    const onInvite = vi.fn();
    render(
      <OrganizationRoster
        organization="Les Panthères"
        members={[]}
        players={[]}
        canInvite
        getPlayerRating={() => 0}
        onInvite={onInvite}
      />,
    );

    expect(
      screen.getByText("Aucun joueur dans cette organisation pour le moment."),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Inviter des joueurs" }),
    );
    expect(onInvite).toHaveBeenCalledOnce();
  });
});
