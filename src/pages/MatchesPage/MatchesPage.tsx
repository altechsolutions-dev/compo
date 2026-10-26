import { useOutletContext } from "react-router-dom";
import { DashboardHero } from "../../components/DashboardHero/DashboardHero";
import { MatchList } from "../../components/MatchList/MatchList";
import { OrganizationRequired } from "../../components/OrganizationRequired/OrganizationRequired";
import { MatchDrawerContainer } from "../../containers/MatchDrawerContainer/MatchDrawerContainer";
import type { WorkspaceRouteContext } from "../WorkspaceLayout/WorkspaceRouteContext";

export function MatchesPage() {
  const {
    organization,
    organizationId,
    isLoadingOrganizations,
    matchCount,
    onCreateMatch,
    matches,
    allMatches,
    selectedMatchId,
    currentAttendeeId,
    matchRegistering,
    matchFilter,
    matchNotice,
    onFilterChange,
    onOpenMatch,
    onRegisterForMatch,
    onAddGuestToMatch,
    onStartMatch,
    onRecordGoal,
    manOfTheMatchPoll,
    manOfTheMatchPollLoading,
    manOfTheMatchVoteSaving,
    manOfTheMatchVoteError,
    onVoteForManOfTheMatch,
    drawerMatch,
    drawerMounted,
    drawerOpen,
    playerNames,
    composeTeams,
    onCloseDrawer,
    onJoinWithCode,
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

  const latestFinishedMatch = allMatches
    .filter((match) => match.status === "finished")
    .sort((first, second) =>
      `${second.date}T${second.time}`.localeCompare(
        `${first.date}T${first.time}`,
      ),
    )[0];

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
          totalMatchCount={
            matchFilter === "finished"
              ? allMatches.filter((match) => match.status === "finished").length
              : matchCount
          }
          selectedMatchId={selectedMatchId}
          currentAttendeeId={currentAttendeeId}
          matchRegistering={matchRegistering}
          playerNames={playerNames}
          filter={matchFilter}
          notice={matchNotice}
          latestFinishedMatch={latestFinishedMatch}
          onFilterChange={onFilterChange}
          onOpenMatch={onOpenMatch}
          onRegister={onRegisterForMatch}
          onAddGuest={onAddGuestToMatch}
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
          onStartMatch={onStartMatch}
          onRecordGoal={onRecordGoal}
          manOfTheMatchPoll={manOfTheMatchPoll}
          manOfTheMatchPollLoading={manOfTheMatchPollLoading}
          manOfTheMatchVoteSaving={manOfTheMatchVoteSaving}
          manOfTheMatchVoteError={manOfTheMatchVoteError}
          onVoteForManOfTheMatch={onVoteForManOfTheMatch}
        />
      </div>
    </>
  );
}
