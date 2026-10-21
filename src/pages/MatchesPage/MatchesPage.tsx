import { useOutletContext } from "react-router-dom";
import { DashboardHero } from "../../components/DashboardHero/DashboardHero";
import { MatchList } from "../../components/MatchList/MatchList";
import { MatchDrawerContainer } from "../../containers/MatchDrawerContainer/MatchDrawerContainer";
import type { WorkspaceRouteContext } from "../WorkspaceLayout/WorkspaceRouteContext";

export function MatchesPage() {
  const {
    organization,
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
  } = useOutletContext<WorkspaceRouteContext>();

  return (
    <>
      <DashboardHero
        organization={organization}
        matchCount={matchCount}
        activeView="matches"
        onCreateMatch={onCreateMatch}
      />
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
    </>
  );
}
