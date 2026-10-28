import type {
  MatchSlot,
  MatchManOfTheMatchPoll,
  OrganizationMember,
  OrganizationPlayerStats,
  Player,
  MatchStateAction,
} from "../../types";

export type WorkspaceRouteContext = {
  organization: string;
  organizationId: string | null;
  isLoadingOrganizations: boolean;
  matchCount: number;
  canShareInvite: boolean;
  onCreateMatch: () => void;
  matches: MatchSlot[];
  allMatches: MatchSlot[];
  selectedMatchId?: string;
  currentAttendeeId: string;
  matchRegistering: boolean;
  matchFilter: "all" | "available" | "finished";
  matchNotice: string;
  onFilterChange: (filter: "all" | "available" | "finished") => void;
  onOpenMatch: (matchId: string) => void;
  onRegisterForMatch: (matchId: string) => void;
  onAddGuestToMatch: (matchId: string, guestName: string) => void;
  onEditMatch: (match: MatchSlot) => void;
  onCancelMatch: (matchId: string) => void;
  onStartMatch: (matchId: string, teams: [string[], string[]]) => void;
  onSaveScheduledMatchTeams: (
    matchId: string,
    teams: [string[], string[]],
  ) => Promise<boolean>;
  onSetMatchState: (matchId: string, action: MatchStateAction) => void;
  onResetMatch: (matchId: string) => Promise<boolean>;
  onRecordGoal: (matchId: string, scorerId: string) => void;
  onRemoveGoal: (matchId: string, goalId: string) => void;
  manOfTheMatchPoll: MatchManOfTheMatchPoll | null;
  manOfTheMatchPollLoading: boolean;
  manOfTheMatchVoteSaving: boolean;
  manOfTheMatchVoteError: string;
  onVoteForManOfTheMatch: (candidateId: string) => void;
  onSwapPlayers: (
    matchId: string,
    redPlayerId: string,
    bluePlayerId: string,
  ) => void;
  drawerMatch?: MatchSlot;
  drawerMounted: boolean;
  drawerOpen: boolean;
  playerNames: Record<string, string>;
  composeTeams: (attendeeIds: string[]) => [string[], string[]];
  onCloseDrawer: () => void;
  members: OrganizationMember[];
  isOrganizationOwner: boolean;
  players: Player[];
  playerStats: OrganizationPlayerStats[];
  playerStatsNotice: string;
  getPlayerRating: (player: Player) => number;
  currentUserId?: string;
  onInvite: () => void;
  onJoinWithCode: () => void;
  canLeaveOrganization: boolean;
  isLeavingOrganization: boolean;
  leaveOrganizationNotice: string;
  onLeaveOrganization: () => Promise<boolean>;
  removingMemberId: string | null;
  removeMemberNotice: string;
  onRemoveOrganizationMember: (userId: string) => Promise<boolean>;
  isSynchronized: boolean;
};
