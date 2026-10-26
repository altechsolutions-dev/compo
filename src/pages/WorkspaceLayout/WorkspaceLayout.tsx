import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
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
import type {
  DialogKind,
  MatchManOfTheMatchPoll,
  OrganizationPlayerStats,
} from "../../types";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function WorkspaceLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuthContext();
  const [playerStats, setPlayerStats] = useState<OrganizationPlayerStats[]>([]);
  const [playerStatsNotice, setPlayerStatsNotice] = useState("");
  const [manOfTheMatchPoll, setManOfTheMatchPoll] =
    useState<MatchManOfTheMatchPoll | null>(null);
  const [manOfTheMatchPollLoading, setManOfTheMatchPollLoading] =
    useState(false);
  const [manOfTheMatchVoteSaving, setManOfTheMatchVoteSaving] = useState(false);
  const [manOfTheMatchVoteError, setManOfTheMatchVoteError] = useState("");
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
    registerPasskey,
    passkeySubmitting,
    passkeyNotice,
    passkeyPromptOpen,
    setPasskeyPromptOpen,
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
        "user_id, overall_rating, matches_played, wins, draws, losses, man_of_the_match_count, best_scorer_count, goals",
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
    isLiveView: location.pathname.endsWith("/live"),
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

  useEffect(() => {
    const client = supabase;
    if (
      !client ||
      !session ||
      !selectedMatch ||
      selectedMatch.status !== "finished" ||
      !matchDrawerOpen
    ) {
      setManOfTheMatchPoll(null);
      setManOfTheMatchPollLoading(false);
      setManOfTheMatchVoteError("");
      return;
    }

    let cancelled = false;
    const refreshPoll = async () => {
      const { data, error } = await client.rpc("get_match_man_of_the_match", {
        p_match_id: selectedMatch.id,
      });
      if (cancelled) return;
      if (error) {
        setManOfTheMatchVoteError(error.message);
        setManOfTheMatchPollLoading(false);
        return;
      }
      const row = (data?.[0] ?? null) as {
        my_vote: string | null;
        vote_totals: { candidate_id: string; vote_count: number }[];
        vote_count: number;
        eligible_voter_count: number;
        is_complete: boolean;
        winner_ids: string[];
      } | null;
      setManOfTheMatchPoll(
        row
          ? {
              myVote: row.my_vote,
              voteTotals: (row.vote_totals ?? []).map((vote) => ({
                candidateId: vote.candidate_id,
                voteCount: vote.vote_count,
              })),
              voteCount: row.vote_count,
              eligibleVoterCount: row.eligible_voter_count,
              isComplete: row.is_complete,
              winnerIds: row.winner_ids ?? [],
            }
          : null,
      );
      setManOfTheMatchVoteError("");
      setManOfTheMatchPollLoading(false);
    };

    setManOfTheMatchPollLoading(true);
    void refreshPoll();
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refreshPoll();
    };
    const refreshTimer = window.setInterval(() => void refreshPoll(), 60_000);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [matchDrawerOpen, selectedMatch?.id, selectedMatch?.status, session]);

  useEffect(() => {
    if (!supabase || !organizationId || !manOfTheMatchPoll?.isComplete) return;
    let cancelled = false;
    void supabase
      .from("players")
      .select(
        "user_id, overall_rating, matches_played, wins, draws, losses, man_of_the_match_count, best_scorer_count, goals",
      )
      .eq("organization_id", organizationId)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setPlayerStatsNotice(
            `Impossible d’actualiser les statistiques des joueurs : ${error.message}`,
          );
          return;
        }
        setPlayerStats((data ?? []) as OrganizationPlayerStats[]);
        setPlayerStatsNotice("");
      });
    return () => {
      cancelled = true;
    };
  }, [organizationId, manOfTheMatchPoll?.isComplete]);

  async function voteForManOfTheMatch(candidateId: string) {
    if (!supabase || !selectedMatch || manOfTheMatchVoteSaving) return;
    setManOfTheMatchVoteSaving(true);
    setManOfTheMatchVoteError("");
    try {
      const { data, error } = await supabase.rpc(
        "vote_match_man_of_the_match",
        { p_match_id: selectedMatch.id, p_candidate_id: candidateId },
      );
      if (error) throw error;
      const row = (data?.[0] ?? null) as {
        my_vote: string | null;
        vote_totals: { candidate_id: string; vote_count: number }[];
        vote_count: number;
        eligible_voter_count: number;
        is_complete: boolean;
        winner_ids: string[];
      } | null;
      if (!row) throw new Error("Supabase n’a renvoyé aucun résultat de vote.");
      setManOfTheMatchPoll({
        myVote: row.my_vote,
        voteTotals: (row.vote_totals ?? []).map((vote) => ({
          candidateId: vote.candidate_id,
          voteCount: vote.vote_count,
        })),
        voteCount: row.vote_count,
        eligibleVoterCount: row.eligible_voter_count,
        isComplete: row.is_complete,
        winnerIds: row.winner_ids ?? [],
      });
      if (row.is_complete && organizationId) {
        const { data: stats, error: statsError } = await supabase
          .from("players")
          .select(
            "user_id, overall_rating, matches_played, wins, draws, losses, man_of_the_match_count, best_scorer_count, goals",
          )
          .eq("organization_id", organizationId);
        if (statsError) throw statsError;
        setPlayerStats((stats ?? []) as OrganizationPlayerStats[]);
      }
    } catch (error) {
      setManOfTheMatchVoteError(
        `Impossible d’enregistrer votre vote : ${error instanceof Error ? error.message : "erreur inconnue"}`,
      );
    } finally {
      setManOfTheMatchVoteSaving(false);
    }
  }
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
    addGuestToMatch,
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
        organizationName: organization,
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

  const layout = {
    organization,
    organizationMemberCount: organizationMembers.length,
    isSignedIn: Boolean(session),
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
    onSignOut: () => {
      void (async () => {
        await signOut();
        clearOrganizationSession();
      })();
    },
    onRegisterPasskey: () => void registerPasskey(),
    passkeySubmitting,
    passkeyNotice,
    passkeyPromptOpen,
    onDismissPasskeyPrompt: () => setPasskeyPromptOpen(false),
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
    allMatches: matchState.allMatches,
    selectedMatchId: selectedMatch?.id,
    currentAttendeeId,
    matchRegistering,
    matchFilter,
    matchNotice,
    onFilterChange: setMatchFilter,
    onOpenMatch: (matchId: string) => {
      const match = matchState.allMatches.find((item) => item.id === matchId);
      if (match?.status === "in_progress" || match?.status === "paused") {
        navigate(`/app/live?match=${encodeURIComponent(matchId)}`);
        return;
      }
      openMatchDrawer(matchId);
    },
    onRegisterForMatch: (matchId: string) => void registerForMatch(matchId),
    onAddGuestToMatch: (matchId: string, guestName: string) =>
      void addGuestToMatch(matchId, guestName),
    onStartMatch: async (matchId, teams) => {
      if (await startMatch(matchId, teams)) {
        navigate(`/app/live?match=${encodeURIComponent(matchId)}`);
      }
    },
    onSetMatchState: (matchId, action) => {
      void (async () => {
        const updated = await setMatchState(matchId, action);
        if (!updated || action !== "finish" || !supabase || !organizationId)
          return;

        const { data, error } = await supabase
          .from("players")
          .select(
            "user_id, overall_rating, matches_played, wins, draws, losses, man_of_the_match_count, best_scorer_count, goals",
          )
          .eq("organization_id", organizationId);
        if (error) {
          setPlayerStatsNotice(
            `Impossible d’actualiser les statistiques des joueurs : ${error.message}`,
          );
          return;
        }
        setPlayerStats((data ?? []) as OrganizationPlayerStats[]);
        setPlayerStatsNotice("");
      })();
    },
    onRecordGoal: (matchId, scorerId) => void recordGoal(matchId, scorerId),
    manOfTheMatchPoll,
    manOfTheMatchPollLoading,
    manOfTheMatchVoteSaving,
    manOfTheMatchVoteError,
    onVoteForManOfTheMatch: (candidateId) =>
      void voteForManOfTheMatch(candidateId),
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
