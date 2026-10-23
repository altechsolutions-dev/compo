import { useState } from "react";
import { DashboardLayout } from "../DashboardLayout/DashboardLayout";
import { LiveMatchPage } from "../LiveMatchPage/LiveMatchPage";
import { dateAfter } from "../../data/dateAfter/dateAfter";
import { players } from "../../data/players/players";
import { composeMatchTeams } from "../../lib/composeMatchTeams/composeMatchTeams";
import type { MatchGoal, MatchSlot } from "../../types";
import type { WorkspaceRouteContext } from "../WorkspaceLayout/WorkspaceRouteContext";

const attendees = players.map((player) => player.id);
const playerNames = Object.fromEntries(
  players.map((player) => [player.id, player.name]),
);

export function LiveMatchMockPage() {
  const [match, setMatch] = useState<MatchSlot>(() => ({
    id: "mock-live-match",
    date: dateAfter(2),
    time: "17:00",
    venue: "UrbanSoccer Porte d’Aubervilliers · Terrain 3",
    maxPlayers: 10,
    attendees,
    status: "scheduled",
    elapsedSeconds: 0,
    teams: composeMatchTeams(attendees),
    goals: [],
  }));

  const context = {
    organization: "Les Panthères",
    organizationId: "mock-organization",
    isLoadingOrganizations: false,
    matchCount: 1,
    canShareInvite: false,
    onCreateMatch: () => undefined,
    matches: [match],
    allMatches: [match],
    selectedMatchId: match.id,
    currentAttendeeId: attendees[0],
    matchRegistering: false,
    matchFilter: "all",
    matchNotice: "",
    onFilterChange: () => undefined,
    onOpenMatch: () => undefined,
    onRegisterForMatch: () => undefined,
    onStartMatch: (matchId: string, teams: [string[], string[]]) => {
      setMatch((current) =>
        current.id === matchId
          ? {
              ...current,
              status: "in_progress",
              startedAt: new Date().toISOString(),
              elapsedSeconds: 0,
              teams,
              goals: [],
            }
          : current,
      );
    },
    onRecordGoal: (matchId: string, scorerId: string) => {
      setMatch((current) => {
        if (
          current.id !== matchId ||
          (current.status !== "in_progress" && current.status !== "paused") ||
          (current.status === "in_progress" && !current.startedAt) ||
          !current.teams
        ) {
          return current;
        }
        const team = current.teams[0].includes(scorerId) ? 0 : 1;
        const createdAt = new Date();
        const goal: MatchGoal = {
          id: `mock-goal-${createdAt.getTime()}`,
          scorerId,
          team,
          elapsedSeconds:
            (current.elapsedSeconds ?? 0) +
            (current.status === "in_progress" && current.startedAt
              ? Math.max(
                  0,
                  Math.floor(
                    (createdAt.getTime() -
                      new Date(current.startedAt).getTime()) /
                      1000,
                  ),
                )
              : 0),
          createdAt: createdAt.toISOString(),
        };
        return { ...current, goals: [...(current.goals ?? []), goal] };
      });
    },
    onSwapPlayers: (
      matchId: string,
      redPlayerId: string,
      bluePlayerId: string,
    ) => {
      setMatch((current) => {
        if (
          current.id !== matchId ||
          (current.status !== "in_progress" && current.status !== "paused") ||
          !current.teams
        )
          return current;
        const redIndex = current.teams[0].indexOf(redPlayerId);
        const blueIndex = current.teams[1].indexOf(bluePlayerId);
        if (redIndex < 0 || blueIndex < 0 || redPlayerId === bluePlayerId) {
          return current;
        }
        const teams = [...current.teams] as [string[], string[]];
        teams[0][redIndex] = bluePlayerId;
        teams[1][blueIndex] = redPlayerId;
        return { ...current, teams };
      });
    },
    onSetMatchState: (
      matchId: string,
      action: "pause" | "resume" | "finish",
    ) => {
      setMatch((current) => {
        if (current.id !== matchId) return current;
        const elapsedSeconds =
          (current.elapsedSeconds ?? 0) +
          (current.status === "in_progress" && current.startedAt
            ? Math.max(
                0,
                Math.floor(
                  (Date.now() - new Date(current.startedAt).getTime()) / 1000,
                ),
              )
            : 0);
        if (action === "pause" && current.status === "in_progress") {
          return {
            ...current,
            status: "paused",
            startedAt: undefined,
            elapsedSeconds,
          };
        }
        if (action === "resume" && current.status === "paused") {
          return {
            ...current,
            status: "in_progress",
            startedAt: new Date().toISOString(),
            elapsedSeconds,
          };
        }
        if (
          action === "finish" &&
          (current.status === "in_progress" || current.status === "paused")
        ) {
          return {
            ...current,
            status: "finished",
            startedAt: undefined,
            elapsedSeconds,
          };
        }
        return current;
      });
    },
    drawerMounted: false,
    drawerOpen: false,
    playerNames,
    composeTeams: composeMatchTeams,
    onCloseDrawer: () => undefined,
    members: [],
    isOrganizationOwner: false,
    players,
    playerStats: [],
    playerStatsNotice: "",
    getPlayerRating: () => 0,
    onInvite: () => undefined,
    onJoinWithCode: () => undefined,
    canLeaveOrganization: false,
    isLeavingOrganization: false,
    leaveOrganizationNotice: "",
    onLeaveOrganization: async () => false,
    removingMemberId: null,
    removeMemberNotice: "",
    onRemoveOrganizationMember: async () => false,
    isSynchronized: false,
  } as WorkspaceRouteContext;

  return (
    <DashboardLayout
      organization={context.organization}
      organizationMemberCount={10}
      avatarLabel="LM"
      isSignedIn={false}
      canShareInvite={false}
      canInstall={false}
      onNavigate={() => undefined}
      onChooseOrganization={() => undefined}
      onShareInvite={() => undefined}
      onJoinWithCode={() => undefined}
      onSignOut={() => undefined}
      onInstall={() => undefined}
      isSynchronized={false}
    >
      <LiveMatchPage contextOverride={context} />
    </DashboardLayout>
  );
}
