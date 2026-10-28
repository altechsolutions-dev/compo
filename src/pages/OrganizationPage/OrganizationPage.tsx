import { useOutletContext } from "react-router-dom";
import { DashboardHero } from "../../components/DashboardHero/DashboardHero";
import { OrganizationRequired } from "../../components/OrganizationRequired/OrganizationRequired";
import { OrganizationRoster } from "../../components/OrganizationRoster/OrganizationRoster";
import { PushNotificationsControl } from "../../components/PushNotificationsControl/PushNotificationsControl";
import type { WorkspaceRouteContext } from "../WorkspaceLayout/WorkspaceRouteContext";

export function OrganizationPage() {
  const {
    organization,
    organizationId,
    isLoadingOrganizations,
    matchCount,
    onCreateMatch,
    members,
    playerStats,
    playerStatsNotice,
    currentUserId,
    canShareInvite,
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
        Chargement de votre club…
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
      <PushNotificationsControl />
      <OrganizationRoster
        organization={organization}
        members={members}
        playerStats={playerStats}
        playerStatsNotice={playerStatsNotice}
        currentUserId={currentUserId}
        canInvite={canShareInvite}
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
