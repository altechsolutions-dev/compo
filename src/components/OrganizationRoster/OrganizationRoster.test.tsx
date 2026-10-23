import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OrganizationRoster } from "./OrganizationRoster";
import type { OrganizationMember, OrganizationPlayerStats } from "../../types";

const members: OrganizationMember[] = [
  { user_id: "player-1", display_name: "Alex Martin", role: "owner" },
  { user_id: "player-2", display_name: "Sam Lee", role: "member" },
];

const playerStats: OrganizationPlayerStats[] = [
  {
    user_id: "player-1",
    overall_rating: 82,
    matches_played: 12,
    wins: 8,
    draws: 2,
    losses: 2,
    man_of_the_match_count: 3,
    goals: 5,
  },
];

describe("OrganizationRoster", () => {
  it("affiche les membres, leurs stats et identifie l’utilisateur courant", () => {
    render(
      <OrganizationRoster
        organization="Les Panthères"
        members={members}
        playerStats={playerStats}
        playerStatsNotice=""
        currentUserId="player-1"
        canInvite
        canLeave={false}
        isCurrentUserOwner
        isLeaving={false}
        leaveNotice=""
        canManageMembers={false}
        removingMemberId={null}
        removeMemberNotice=""
        onInvite={vi.fn()}
        onLeave={vi.fn().mockResolvedValue(true)}
        onRemoveMember={vi.fn().mockResolvedValue(true)}
      />,
    );

    expect(
      screen.getByRole("table", { name: "Effectif du club" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Alex Martin")).toBeInTheDocument();
    expect(screen.getByText("Vous")).toBeInTheDocument();
    expect(screen.getByText("82")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "BUTS" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("—")).toHaveLength(7);
  });

  it("signale un effectif vide et permet de déclencher une invitation", () => {
    const onInvite = vi.fn();
    render(
      <OrganizationRoster
        organization="Les Panthères"
        members={[]}
        playerStats={[]}
        playerStatsNotice=""
        canInvite
        canLeave={false}
        isCurrentUserOwner={false}
        isLeaving={false}
        leaveNotice=""
        canManageMembers={false}
        removingMemberId={null}
        removeMemberNotice=""
        onInvite={onInvite}
        onLeave={vi.fn().mockResolvedValue(true)}
        onRemoveMember={vi.fn().mockResolvedValue(true)}
      />,
    );

    expect(
      screen.getByText("Aucun joueur dans ce club pour le moment."),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Inviter des joueurs" }),
    );
    expect(onInvite).toHaveBeenCalledOnce();
  });

  it("garde le départ discret et demande une confirmation", () => {
    const onLeave = vi.fn().mockResolvedValue(true);
    render(
      <OrganizationRoster
        organization="Les Panthères"
        members={members}
        playerStats={playerStats}
        playerStatsNotice=""
        canInvite
        canLeave
        isCurrentUserOwner
        isLeaving={false}
        leaveNotice=""
        canManageMembers
        removingMemberId={null}
        removeMemberNotice=""
        onInvite={vi.fn()}
        onLeave={onLeave}
        onRemoveMember={vi.fn().mockResolvedValue(true)}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Quitter le club" }));
    expect(
      screen.getByText(/ton rôle sera transmis à un autre membre/),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmer le départ" }),
    );
    expect(onLeave).toHaveBeenCalledOnce();
  });

  it("permet à l’admin de confirmer le retrait d’un membre ordinaire", () => {
    const onRemoveMember = vi.fn().mockResolvedValue(true);
    render(
      <OrganizationRoster
        organization="Les Panthères"
        members={members}
        playerStats={playerStats}
        playerStatsNotice=""
        currentUserId="player-1"
        canInvite
        canLeave={false}
        isCurrentUserOwner
        isLeaving={false}
        leaveNotice=""
        canManageMembers
        removingMemberId={null}
        removeMemberNotice=""
        onInvite={vi.fn()}
        onLeave={vi.fn().mockResolvedValue(true)}
        onRemoveMember={onRemoveMember}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Retirer Sam Lee" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmer" }));
    expect(onRemoveMember).toHaveBeenCalledWith("player-2");
  });
});
