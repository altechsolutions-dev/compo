import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { ModalManager } from "../../components/ModalManager/ModalManager";
import { useMatchActions } from "../../hooks/useMatchActions/useMatchActions";
import { useMatches } from "../../hooks/useMatches/useMatches";
import { useOrganizationWorkflow } from "../../hooks/useOrganizationWorkflow/useOrganizationWorkflow";
import { useAuthContext } from "../../hooks/useAuth/AuthContext";
import { supabase } from "../../lib/supabase/supabase";
import { DashboardLayout } from "../DashboardLayout/DashboardLayout";
import type { WorkspaceRouteContext } from "./WorkspaceRouteContext";
import { composeMatchTeams } from "../../lib/composeMatchTeams/composeMatchTeams";
import { playerRating } from "../../lib/playerRating/playerRating";
import { dateAfter } from "../../data/dateAfter/dateAfter";
import { players } from "../../data/players/players";
import type { DialogKind, OrganizationPlayerStats } from "../../types";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function WorkspaceLayout() {
  const navigate = useNavigate();
  const auth = useAuthContext();
  const [playerStats, setPlayerStats] = useState<OrganizationPlayerStats[]>([]);
  const [playerStatsNotice, setPlayerStatsNotice] = useState("");
  const {
    session,
    authLoading,
    setPendingCreateOrganization,
    pendingInviteCode,
    setPendingInviteCode,
    createOrganizationIntentReady,
    setCreateOrganizationIntentReady,
    setAuthNotice,
    setAuthMode,
    signOut,
  } = auth;
  const [modal, setModalState] = useState<DialogKind | null>(() => {
    if (createOrganizationIntentReady) return "organization";
    const hasInvite = new URLSearchParams(window.location.search).has("invite");
    return hasInvite && !supabase ? "code" : null;
  });
  const visibleModal = createOrganizationIntentReady ? "organization" : modal;

  function setModal(kind: DialogKind | null) {
    if (createOrganizationIntentReady) setCreateOrganizationIntentReady(false);
    setModalState(kind);
  }
  const organizationWorkflow = useOrganizationWorkflow({
    authLoading,
    session,
    pendingInviteCode,
    setPendingInviteCode,
    setPendingCreateOrganization,
    setAuthNotice,
    setAuthMode,
    navigate,
    setModal,
  });
  const {
    organization,
    organizationId,
    organizations,
    isLoadingOrganizations,
    inviteCode,
    organizationMembers,
    organizationName,
    setOrganizationName,
    joinOrganizationAsPlayer,
    setJoinOrganizationAsPlayer,
    joinCode,
    setJoinCode,
    inviteOrganizationName,
    inviteLink,
    featureNotice: organizationFeatureNotice,
    isLeavingOrganization,
    leaveOrganizationNotice,
    removingMemberId,
    removeMemberNotice,
    copyNotice,
    setFeatureNotice: setOrganizationFeatureNotice,
    selectOrganization,
    openOrganizationCreation,
    createOrganization,
    joinOrganization,
    leaveOrganization,
    removeOrganizationMember,
    copyText,
    openInviteDialog,
    clearOrganizationSession,
  } = organizationWorkflow;

  useEffect(() => {
    const client = supabase;
    if (!client || !organizationId) {
      setPlayerStats([]);
      setPlayerStatsNotice("");
      return;
    }

    let cancelled = false;
    setPlayerStats([]);
    setPlayerStatsNotice("");
    void client
      .from("players")
      .select(
        "user_id, overall_rating, matches_played, wins, draws, losses, man_of_the_match_count, goals",
      )
      .eq("organization_id", organizationId)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setPlayerStatsNotice(
            `Impossible de charger les statistiques des joueurs : ${error.message}`,
          );
          return;
        }
        setPlayerStats((data ?? []) as OrganizationPlayerStats[]);
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  const matchState = useMatches({
    session,
    organizationId,
    organizationMembers,
  });
  const {
    matches,
    setMatches,
    setSelectedMatchId,
    selectedMatch,
    matchFilter,
    setMatchFilter,
    matchDrawerOpen,
    matchDrawerMounted,
    matchNotice,
    setMatchNotice,
    currentAttendeeId,
    visibleMatches,
    filteredMatches,
    playerNames,
    openMatchDrawer,
    closeMatchDrawer,
  } = matchState;
  const [venue, setVenue] = useState("");
  const [matchDate, setMatchDate] = useState(dateAfter(3));
  const [matchTime, setMatchTime] = useState("19:30");
  const [matchMaxPlayers, setMatchMaxPlayers] = useState(10);
  const [joinMatchOnCreate, setJoinMatchOnCreate] = useState(true);
  const [matchSaving, setMatchSaving] = useState(false);
  const [matchRegistering, setMatchRegistering] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(
    null,
  );
  const {
    registerForMatch,
    createMatch,
    startMatch,
    setMatchState,
    recordGoal,
    swapPlayers,
  } = useMatchActions({
    matches,
    setMatches,
    session,
    organizationId,
    currentAttendeeId,
    matchRegistering,
    setMatchRegistering,
    venue,
    setVenue,
    matchDate,
    matchTime,
    matchMaxPlayers,
    joinMatchOnCreate,
    setMatchSaving,
    setMatchNotice,
    setFeatureNotice: setOrganizationFeatureNotice,
    setSelectedMatchId,
    closeMatchDialog: () => setModal(null),
    showMatchesView: () => navigate("/app/matches"),
  });

  function installApp() {
    if (!installPrompt) return;
    void installPrompt.prompt();
    setInstallPrompt(null);
  }

  const modalManager = (
    <ModalManager
      kind={visibleModal}
      matchDialog={{
        date: matchDate,
        minDate: dateAfter(0),
        time: matchTime,
        venue,
        maxPlayers: matchMaxPlayers,
        joinOnCreate: joinMatchOnCreate,
        saving: matchSaving,
        onClose: () => setModal(null),
        onDateChange: setMatchDate,
        onTimeChange: setMatchTime,
        onVenueChange: setVenue,
        onMaxPlayersChange: setMatchMaxPlayers,
        onJoinOnCreateChange: setJoinMatchOnCreate,
        onSubmit: createMatch,
      }}
      organizationDialog={{
        organizations,
        activeOrganizationId: organizationId,
        organizationName,
        joinAsPlayer: joinOrganizationAsPlayer,
        joinCode,
        inviteCode,
        inviteOrganizationName,
        inviteLink,
        featureNotice: organizationFeatureNotice,
        copyNotice,
        onClose: () => setModal(null),
        onSelectOrganization: (item) => {
          setMatchNotice("");
          void selectOrganization(item);
        },
        onOpenOrganizationCreation: openOrganizationCreation,
        onOpenJoinByCode: () => {
          setJoinCode("");
          setOrganizationFeatureNotice("");
          setModal("code");
        },
        onOrganizationNameChange: setOrganizationName,
        onJoinAsPlayerChange: setJoinOrganizationAsPlayer,
        onCreateOrganization: createOrganization,
        onJoinCodeChange: setJoinCode,
        onJoinOrganization: joinOrganization,
        onCopyInviteLink: () => void copyText(inviteLink, "Lien"),
        onCopyInviteCode: () => void copyText(inviteCode, "Code"),
      }}
    />
  );

  const avatarLabel = session?.user.user_metadata.full_name
    ? String(session.user.user_metadata.full_name)
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : (session?.user.email?.slice(0, 2).toUpperCase() ?? "AM");

  const layout = {
    organization,
    organizationMemberCount: organizationMembers.length,
    avatarLabel,
    isSignedIn: Boolean(session),
    canShareInvite: Boolean(organizationId && inviteCode),
    canInstall: Boolean(installPrompt),
    onNavigate: (nextView: "matches" | "live" | "organization") =>
      navigate(
        nextView === "matches"
          ? "/app/matches"
          : nextView === "live"
            ? "/app/live"
            : "/app/organizations",
      ),
    onChooseOrganization: () => setModal("organizations"),
    onShareInvite: () => openInviteDialog(organization, inviteCode),
    onJoinWithCode: () => {
      setJoinCode("");
      setOrganizationFeatureNotice("");
      setModal("code");
    },
    onSignOut: () => {
      void (async () => {
        await signOut();
        clearOrganizationSession();
      })();
    },
    onInstall: installApp,
    isSynchronized: Boolean(session),
  };

  const routeContext: WorkspaceRouteContext = {
    organization,
    organizationId,
    isLoadingOrganizations,
    matchCount: visibleMatches.length,
    canShareInvite: Boolean(organizationId && inviteCode),
    onCreateMatch: () => {
      setJoinMatchOnCreate(true);
      setModal("match");
    },
    matches: filteredMatches,
    allMatches: visibleMatches,
    selectedMatchId: selectedMatch?.id,
    currentAttendeeId,
    matchRegistering,
    matchFilter,
    matchNotice,
    onFilterChange: setMatchFilter,
    onOpenMatch: (matchId: string) => {
      const match = visibleMatches.find((item) => item.id === matchId);
      if (match?.status === "in_progress" || match?.status === "paused") {
        navigate(`/app/live?match=${encodeURIComponent(matchId)}`);
        return;
      }
      openMatchDrawer(matchId);
    },
    onRegisterForMatch: (matchId: string) => void registerForMatch(matchId),
    onStartMatch: async (matchId, teams) => {
      if (await startMatch(matchId, teams)) {
        navigate(`/app/live?match=${encodeURIComponent(matchId)}`);
      }
    },
    onSetMatchState: (matchId, action) => void setMatchState(matchId, action),
    onRecordGoal: (matchId, scorerId) => void recordGoal(matchId, scorerId),
    onSwapPlayers: (matchId, redPlayerId, bluePlayerId) =>
      void swapPlayers(matchId, redPlayerId, bluePlayerId),
    drawerMatch: selectedMatch,
    drawerMounted: matchDrawerMounted,
    drawerOpen: matchDrawerOpen,
    playerNames,
    composeTeams: composeMatchTeams,
    onCloseDrawer: closeMatchDrawer,
    members: organizationMembers,
    isOrganizationOwner:
      organizations.find((item) => item.organization_id === organizationId)
        ?.role === "owner",
    players,
    playerStats,
    playerStatsNotice,
    getPlayerRating: playerRating,
    currentUserId: session?.user.id,
    onInvite: () => openInviteDialog(organization, inviteCode),
    onJoinWithCode: () => {
      setJoinCode("");
      setOrganizationFeatureNotice("");
      setModal("code");
    },
    canLeaveOrganization: Boolean(organizationId),
    isLeavingOrganization,
    leaveOrganizationNotice,
    onLeaveOrganization: leaveOrganization,
    removingMemberId,
    removeMemberNotice,
    onRemoveOrganizationMember: removeOrganizationMember,
    isSynchronized: Boolean(session),
  };

  return (
    <>
      <DashboardLayout {...layout}>
        <Outlet context={routeContext} />
      </DashboardLayout>
      {modalManager}
    </>
  );
}
