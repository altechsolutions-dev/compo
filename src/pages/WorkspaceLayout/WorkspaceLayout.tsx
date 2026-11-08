import { useCallback, useEffect, useRef, useState } from "react";
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
import { notifyMatchEvent } from "../../lib/pushNotifications/notifyMatchEvent";
import type {
  DialogKind,
  MatchSlot,
  MatchManOfTheMatchPoll,
  GuestMatchVoteLink,
  OrganizationPlayerStats,
} from "../../types";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function minimumMatchTime() {
  const now = new Date();
  if (now.getSeconds() > 0 || now.getMilliseconds() > 0) {
    now.setMinutes(now.getMinutes() + 1);
  }
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function describeError(error: unknown) {
  if (typeof error === "string") return error;
  if (typeof error !== "object" || error === null) return String(error);

  const detail = error as Record<string, unknown>;
  const parts = [
    typeof detail.message === "string" ? detail.message : "",
    typeof detail.details === "string" ? `Détails : ${detail.details}` : "",
    typeof detail.hint === "string" ? `Indication : ${detail.hint}` : "",
    typeof detail.code === "string" ? `Code : ${detail.code}` : "",
  ].filter(Boolean);

  return parts.join(" · ") || JSON.stringify(error);
}

export function WorkspaceLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuthContext();
  const [playerStats, setPlayerStats] = useState<OrganizationPlayerStats[]>([]);
  const [unreadDiscussionState, setUnreadDiscussionState] = useState<{
    organizationId: string | null;
    count: number;
  }>({ organizationId: null, count: 0 });
  const [unreadDiscussionRefreshVersion, setUnreadDiscussionRefreshVersion] =
    useState(0);
  const onDiscussionRead = useCallback(() => {
    setUnreadDiscussionRefreshVersion((version) => version + 1);
  }, []);
  const [playerStatsNotice, setPlayerStatsNotice] = useState("");
  const [manOfTheMatchPoll, setManOfTheMatchPoll] =
    useState<MatchManOfTheMatchPoll | null>(null);
  const [manOfTheMatchPollLoading, setManOfTheMatchPollLoading] =
    useState(false);
  const [manOfTheMatchVoteSaving, setManOfTheMatchVoteSaving] = useState(false);
  const [manOfTheMatchVoteError, setManOfTheMatchVoteError] = useState("");
  const [guestVoteLinks, setGuestVoteLinks] = useState<GuestMatchVoteLink[]>(
    [],
  );
  const [guestVoteLinksMatchId, setGuestVoteLinksMatchId] = useState("");
  const [guestVoteLinksError, setGuestVoteLinksError] = useState("");
  const guestVoteLinkGenerations = useRef(new Set<string>());
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

  const unreadDiscussionCount =
    session && unreadDiscussionState.organizationId === organizationId
      ? unreadDiscussionState.count
      : 0;

  useEffect(() => {
    const client = supabase;
    if (!client || !session || !organizationId) return;

    let cancelled = false;
    const refreshUnreadCount = async () => {
      const { data, error } = await client.rpc(
        "get_unread_match_discussion_count",
        { p_organization_id: organizationId },
      );
      if (cancelled || error) return;
      setUnreadDiscussionState({
        organizationId,
        count: typeof data === "number" ? data : 0,
      });
    };
    void refreshUnreadCount();
    const timer = window.setInterval(() => void refreshUnreadCount(), 15_000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refreshUnreadCount();
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [organizationId, session, unreadDiscussionRefreshVersion]);

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
    const previousPoll = manOfTheMatchPoll;
    setManOfTheMatchVoteSaving(true);
    setManOfTheMatchVoteError("");
    if (previousPoll && !previousPoll.isComplete) {
      setManOfTheMatchPoll({ ...previousPoll, myVote: candidateId });
    }
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
    } catch (error) {
      if (previousPoll) setManOfTheMatchPoll(previousPoll);
      setManOfTheMatchVoteError(
        `Impossible d’enregistrer votre vote : ${describeError(error)}`,
      );
    } finally {
      setManOfTheMatchVoteSaving(false);
    }
  }

  const generateGuestVoteLinks = useCallback(
    async (matchId: string) => {
      const match = matchState.allMatches.find((item) => item.id === matchId);
      if (!supabase || !session || !match) return;
      if (!Object.keys(match.attendeeNames ?? {}).length) return;
      if (guestVoteLinksMatchId === matchId) return;
      if (guestVoteLinkGenerations.current.has(matchId)) return;

      guestVoteLinkGenerations.current.add(matchId);
      try {
        const storageKey = `compo-guest-motm-link:${matchId}`;
        let token = window.localStorage.getItem(storageKey) ?? "";
        if (token) {
          const { data, error } = await supabase.rpc(
            "get_guest_match_motm_vote",
            { p_token: token, p_voter_id: null },
          );
          if (error || !data?.length) {
            window.localStorage.removeItem(storageKey);
            token = "";
          }
        }
        if (!token) {
          const randomBytes = window.crypto.getRandomValues(new Uint8Array(32));
          token = Array.from(randomBytes, (byte) =>
            byte.toString(16).padStart(2, "0"),
          ).join("");
          const { data, error } = await supabase.rpc(
            "create_guest_match_motm_vote_link",
            { p_match_id: matchId, p_token: token },
          );
          if (error) throw error;
          if (data !== token)
            throw new Error("Le serveur n’a pas confirmé le lien partagé.");
          window.localStorage.setItem(storageKey, token);
        }
        setGuestVoteLinks([
          { attendeeId: matchId, guestName: "Tous les invités", token },
        ]);
        setGuestVoteLinksMatchId(matchId);
        setGuestVoteLinksError("");
      } catch (error) {
        setGuestVoteLinksError(
          `Impossible de créer les liens : ${describeError(error)}`,
        );
      } finally {
        guestVoteLinkGenerations.current.delete(matchId);
      }
    },
    [guestVoteLinksMatchId, matchState.allMatches, session],
  );

  const [venue, setVenue] = useState("");
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
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
    updateMatch,
    cancelMatch,
    startMatch,
    saveScheduledMatchTeams,
    setMatchState,
    resetMatch,
    recordGoal,
    removeGoal,
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
    closeMatchDialog: () => {
      setEditingMatchId(null);
      setModal(null);
    },
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
        minTime: matchDate === dateAfter(0) ? minimumMatchTime() : undefined,
        time: matchTime,
        venue,
        maxPlayers: matchMaxPlayers,
        joinOnCreate: joinMatchOnCreate,
        editing: Boolean(editingMatchId),
        saving: matchSaving,
        onClose: () => setModal(null),
        onDateChange: setMatchDate,
        onTimeChange: setMatchTime,
        onVenueChange: setVenue,
        onMaxPlayersChange: setMatchMaxPlayers,
        onJoinOnCreateChange: setJoinMatchOnCreate,
        onSubmit: (event) => {
          if (editingMatchId) void updateMatch(editingMatchId, event);
          else void createMatch(event);
        },
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
    unreadDiscussionCount,
    avatarLabel,
    isSignedIn: Boolean(session),
    canShareInvite: Boolean(organizationId && inviteCode),
    canInstall: Boolean(installPrompt),
    onNavigate: (
      nextView: "matches" | "live" | "discussions" | "organization",
    ) =>
      navigate(
        nextView === "matches"
          ? "/app/matches"
          : nextView === "live"
            ? "/app/live"
            : nextView === "discussions"
              ? "/app/discussions"
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
      setEditingMatchId(null);
      setVenue("");
      setMatchDate(dateAfter(3));
      setMatchTime("19:30");
      setMatchMaxPlayers(10);
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
      if (
        match?.status === "finished" &&
        session &&
        (match.createdBy === session.user.id ||
          organizations.find((item) => item.organization_id === organizationId)
            ?.role === "owner")
      ) {
        void generateGuestVoteLinks(match.id);
      }
      openMatchDrawer(matchId);
    },
    onOpenDiscussion: (matchId: string) =>
      navigate(`/app/discussions?match=${encodeURIComponent(matchId)}`),
    onDiscussionRead,
    onRegisterForMatch: (matchId: string) => void registerForMatch(matchId),
    onAddGuestToMatch: (matchId: string, guestName: string) =>
      void addGuestToMatch(matchId, guestName),
    onEditMatch: (match: MatchSlot) => {
      if (
        match.createdBy !== currentAttendeeId ||
        (match.status && match.status !== "scheduled")
      ) {
        return;
      }
      setEditingMatchId(match.id);
      setMatchDate(match.date);
      setMatchTime(match.time);
      setVenue(match.venue);
      setMatchMaxPlayers(match.maxPlayers);
      setJoinMatchOnCreate(false);
      setModal("match");
    },
    onCancelMatch: (matchId: string) => {
      void (async () => {
        if (await cancelMatch(matchId)) closeMatchDrawer();
      })();
    },
    onStartMatch: async (matchId, teams) => {
      const started = await startMatch(matchId, teams);
      if (started) navigate(`/app/live?match=${encodeURIComponent(matchId)}`);
      return started;
    },
    onSaveScheduledMatchTeams: saveScheduledMatchTeams,
    onSetMatchState: (matchId, action) => {
      void (async () => {
        const updated = await setMatchState(matchId, action);
        if (!updated || action !== "finish") return;

        void notifyMatchEvent("match_finished", matchId);
        navigate(`/app/matches?match=${encodeURIComponent(matchId)}`);

        if (!supabase || !organizationId) return;

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
    onResetMatch: (matchId) => resetMatch(matchId),
    onRecordGoal: (matchId, scorerId) => void recordGoal(matchId, scorerId),
    onRemoveGoal: (matchId, goalId) => void removeGoal(matchId, goalId),
    manOfTheMatchPoll,
    manOfTheMatchPollLoading,
    manOfTheMatchVoteSaving,
    manOfTheMatchVoteError,
    onVoteForManOfTheMatch: (candidateId) =>
      void voteForManOfTheMatch(candidateId),
    guestVoteLinks:
      guestVoteLinksMatchId === selectedMatch?.id ? guestVoteLinks : [],
    guestVoteLinksError,
    onGenerateGuestVoteLinks: (matchId) => void generateGuestVoteLinks(matchId),
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
