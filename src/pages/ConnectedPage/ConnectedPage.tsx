import { DashboardFooter } from "../../components/DashboardFooter/DashboardFooter";
import { DashboardHeader } from "../../components/DashboardHeader/DashboardHeader";
import { DashboardHero } from "../../components/DashboardHero/DashboardHero";
import { MatchList } from "../../components/MatchList/MatchList";
import { OrganizationRoster } from "../../components/OrganizationRoster/OrganizationRoster";
import { MatchDrawerContainer } from "../../containers/MatchDrawerContainer/MatchDrawerContainer";
import type { MatchSlot, OrganizationMember, Player } from "../../types";
import type { DashboardView } from "../../components/DashboardHero/DashboardHero";
import "./ConnectedPage.css";

export type ConnectedPageProps = {
  activeView: DashboardView;
  organization: string;
  organizationMemberCount: number;
  avatarLabel: string;
  isSignedIn: boolean;
  canShareInvite: boolean;
  canInstall: boolean;
  onNavigate: (view: DashboardView) => void;
  onChooseOrganization: () => void;
  onShareInvite: () => void;
  onJoinWithCode: () => void;
  onSignOut: () => void;
  onInstall: () => void;
  matchCount: number;
  onCreateMatch: () => void;
  matches: MatchSlot[];
  selectedMatchId?: string;
  currentAttendeeId: string;
  matchRegistering: boolean;
  matchFilter: "all" | "available";
  matchNotice: string;
  onFilterChange: (filter: "all" | "available") => void;
  onOpenMatch: (matchId: string) => void;
  onRegisterForMatch: (matchId: string) => void;
  drawerMatch?: MatchSlot;
  drawerMounted: boolean;
  drawerOpen: boolean;
  playerNames: Record<string, string>;
  composeTeams: (attendeeIds: string[]) => [string[], string[]];
  onCloseDrawer: () => void;
  members: OrganizationMember[];
  players: Player[];
  getPlayerRating: (player: Player) => number;
  currentUserId?: string;
  onInvite: () => void;
  isSynchronized: boolean;
};

export function ConnectedPage({
  activeView,
  organization,
  organizationMemberCount,
  avatarLabel,
  isSignedIn,
  canShareInvite,
  canInstall,
  onNavigate,
  onChooseOrganization,
  onShareInvite,
  onJoinWithCode,
  onSignOut,
  onInstall,
  matchCount,
  onCreateMatch,
  matches,
  selectedMatchId,
  currentAttendeeId,
  matchRegistering,
  matchFilter,
  matchNotice,
  onFilterChange,
  onOpenMatch,
  onRegisterForMatch,
  drawerMatch,
  drawerMounted,
  drawerOpen,
  playerNames,
  composeTeams,
  onCloseDrawer,
  members,
  players,
  getPlayerRating,
  currentUserId,
  onInvite,
  isSynchronized,
}: ConnectedPageProps) {
  return (
    <main className="connected-page mx-auto flex min-h-svh w-[min(calc(100%-56px),1440px)] flex-col animate-[appear_500ms_ease-out_both] max-[680px]:w-[calc(100%-32px)] max-[380px]:w-[calc(100%-24px)]">
      <DashboardHeader
        organization={organization}
        organizationMemberCount={organizationMemberCount}
        activeView={activeView}
        avatarLabel={avatarLabel}
        isSignedIn={isSignedIn}
        canShareInvite={canShareInvite}
        canInstall={canInstall}
        onNavigate={onNavigate}
        onChooseOrganization={onChooseOrganization}
        onShareInvite={onShareInvite}
        onJoinWithCode={onJoinWithCode}
        onSignOut={onSignOut}
        onInstall={onInstall}
      />

      <div className="dashboard-content flex-1">
        <DashboardHero
          organization={organization}
          matchCount={matchCount}
          activeView={activeView}
          onCreateMatch={onCreateMatch}
        />

        {activeView === "matches" ? (
          <div className="match-layout grid grid-cols-1 items-start gap-8 pb-12 max-[680px]:gap-6 max-[680px]:pb-7.5">
            <MatchList
              matches={matches}
              totalMatchCount={matchCount}
              selectedMatchId={selectedMatchId}
              currentAttendeeId={currentAttendeeId}
              matchRegistering={matchRegistering}
              filter={matchFilter}
              notice={matchNotice}
              onFilterChange={onFilterChange}
              onOpenMatch={onOpenMatch}
              onRegister={onRegisterForMatch}
            />
            <MatchDrawerContainer
              match={drawerMatch}
              mounted={drawerMounted}
              open={drawerOpen}
              currentAttendeeId={currentAttendeeId}
              isRegistering={matchRegistering}
              playerNames={playerNames}
              composeTeams={composeTeams}
              onClose={onCloseDrawer}
              onRegister={onRegisterForMatch}
            />
          </div>
        ) : (
          <OrganizationRoster
            organization={organization}
            members={members}
            players={players}
            currentUserId={currentUserId}
            canInvite={canShareInvite}
            getPlayerRating={getPlayerRating}
            onInvite={onInvite}
          />
        )}
      </div>

      <DashboardFooter
        organization={organization}
        isSynchronized={isSynchronized}
      />
    </main>
  );
}
