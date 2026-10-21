import { useOutletContext } from "react-router-dom";
import { DashboardHero } from "../../components/DashboardHero/DashboardHero";
import { OrganizationRoster } from "../../components/OrganizationRoster/OrganizationRoster";
import type { WorkspaceRouteContext } from "../WorkspaceLayout/WorkspaceRouteContext";

export function OrganizationPage() {
  const {
    organization,
    matchCount,
    onCreateMatch,
    members,
    players,
    currentUserId,
    canShareInvite,
    getPlayerRating,
    onInvite,
  } = useOutletContext<WorkspaceRouteContext>();

  return (
    <>
      <DashboardHero
        organization={organization}
        matchCount={matchCount}
        activeView="organization"
        onCreateMatch={onCreateMatch}
      />
      <OrganizationRoster
        organization={organization}
        members={members}
        players={players}
        currentUserId={currentUserId}
        canInvite={canShareInvite}
        getPlayerRating={getPlayerRating}
        onInvite={onInvite}
      />
    </>
  );
}
