import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ConnectedPage } from "./ConnectedPage";
import { playerRating } from "../../lib/playerRating/playerRating";

describe("ConnectedPage", () => {
  it("affiche la page Matchs et propose la navigation vers l’organisation", () => {
    render(
      <MemoryRouter>
        <ConnectedPage
          activeView="matches"
          organization="Les Panthères"
          organizationMemberCount={4}
          avatarLabel="AM"
          isSignedIn
          canShareInvite
          canInstall={false}
          onNavigate={vi.fn()}
          onChooseOrganization={vi.fn()}
          onShareInvite={vi.fn()}
          onJoinWithCode={vi.fn()}
          onSignOut={vi.fn()}
          onInstall={vi.fn()}
          matchCount={0}
          onCreateMatch={vi.fn()}
          matches={[]}
          currentAttendeeId="player-1"
          matchRegistering={false}
          matchFilter="all"
          matchNotice=""
          onFilterChange={vi.fn()}
          onOpenMatch={vi.fn()}
          onRegisterForMatch={vi.fn()}
          drawerMounted={false}
          drawerOpen={false}
          playerNames={{}}
          composeTeams={() => [[], []]}
          onCloseDrawer={vi.fn()}
          members={[]}
          players={[]}
          getPlayerRating={playerRating}
          onInvite={vi.fn()}
          isSynchronized
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("tab", { name: /Matchs/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: /Organisation/ })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });
});
