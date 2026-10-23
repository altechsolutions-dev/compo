import { useOutletContext } from "react-router-dom";
import { DashboardHero } from "../../components/DashboardHero/DashboardHero";
import { OrganizationRequired } from "../../components/OrganizationRequired/OrganizationRequired";
import { OrganizationRoster } from "../../components/OrganizationRoster/OrganizationRoster";
import type { WorkspaceRouteContext } from "../WorkspaceLayout/WorkspaceRouteContext";

export function OrganizationPage() {
  const {
    organization,
    organizationId,
    isLoadingOrganizations,
    matchCount,
    onCreateMatch,
    members,
    players,
    currentUserId,
    canShareInvite,
    getPlayerRating,
    onInvite,
    onJoinWithCode,
    canLeaveOrganization,
    isOrganizationOwner,
    isLeavingOrganization,
    leaveOrganizationNotice,
    onLeaveOrganization,
    removingMemberId,
    removeMemberNotice,
    onRemoveOrganizationMember,
  } = useOutletContext<WorkspaceRouteContext>();

  if (isLoadingOrganizations) {
    return (
      <section
        className="grid min-h-80 place-items-center border-b border-(--line) px-6 py-16 text-center text-sm text-(--text-secondary)"
        role="status"
      >
        Chargement de votre organisation…
      </section>
    );
  }

  if (!organizationId && !organization.trim()) {
    return <OrganizationRequired onJoinWithCode={onJoinWithCode} />;
  }

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
        canLeave={canLeaveOrganization}
        isCurrentUserOwner={isOrganizationOwner}
        isLeaving={isLeavingOrganization}
        leaveNotice={leaveOrganizationNotice}
        onLeave={onLeaveOrganization}
        canManageMembers={isOrganizationOwner}
        removingMemberId={removingMemberId}
        removeMemberNotice={removeMemberNotice}
        onRemoveMember={onRemoveOrganizationMember}
      />
    </>
  );
}
