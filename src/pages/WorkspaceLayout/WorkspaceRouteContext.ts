import type {
  MatchSlot,
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
  matchFilter: "all" | "available";
  matchNotice: string;
  onFilterChange: (filter: "all" | "available") => void;
  onOpenMatch: (matchId: string) => void;
  onRegisterForMatch: (matchId: string) => void;
  onStartMatch: (matchId: string, teams: [string[], string[]]) => void;
  onSetMatchState: (matchId: string, action: MatchStateAction) => void;
  onRecordGoal: (matchId: string, scorerId: string) => void;
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
