import { useState, type Dispatch, type SetStateAction } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ModalManager } from "../../components/ModalManager/ModalManager";
import { useMatchActions } from "../../hooks/useMatchActions/useMatchActions";
import { useMatches } from "../../hooks/useMatches/useMatches";
import { useOrganizationWorkflow } from "../../hooks/useOrganizationWorkflow/useOrganizationWorkflow";
import { useAuthContext } from "../../hooks/useAuth/AuthContext";
import { ConnectedPage } from "../ConnectedPage/ConnectedPage";
import { composeMatchTeams } from "../../lib/composeMatchTeams/composeMatchTeams";
import { playerRating } from "../../lib/playerRating/playerRating";
import { dateAfter } from "../../data/dateAfter/dateAfter";
import { players } from "../../data/players/players";
import type { DialogKind } from "../../types";

type ConnectedAppProps = {
  modal: DialogKind | null;
  setModal: Dispatch<SetStateAction<DialogKind | null>>;
};

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function ConnectedApp({ modal, setModal }: ConnectedAppProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuthContext();
  const activeView =
    location.pathname === "/app/organizations" ? "organization" : "matches";
  const {
    session,
    authLoading,
    setPendingCreateOrganization,
    pendingInviteCode,
    setPendingInviteCode,
    setAuthNotice,
    setAuthMode,
    signOut,
  } = auth;
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
    copyNotice,
    setFeatureNotice: setOrganizationFeatureNotice,
    selectOrganization,
    openOrganizationCreation,
    createOrganization,
    joinOrganization,
    copyText,
    openInviteDialog,
    clearOrganizationSession,
  } = organizationWorkflow;
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
  const { registerForMatch, createMatch } = useMatchActions({
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
      kind={modal}
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

  return (
    <>
      <ConnectedPage
        activeView={activeView}
        organization={organization}
        organizationMemberCount={organizationMembers.length}
        avatarLabel={avatarLabel}
        isSignedIn={Boolean(session)}
        canShareInvite={Boolean(organizationId && inviteCode)}
        canInstall={Boolean(installPrompt)}
        onNavigate={(nextView) =>
          navigate(
            nextView === "matches" ? "/app/matches" : "/app/organizations",
          )
        }
        onChooseOrganization={() => setModal("organizations")}
        onShareInvite={() => openInviteDialog(organization, inviteCode)}
        onJoinWithCode={() => {
          setJoinCode("");
          setOrganizationFeatureNotice("");
          setModal("code");
        }}
        onSignOut={() => {
          void (async () => {
            await signOut();
            clearOrganizationSession();
          })();
        }}
        onInstall={installApp}
        matchCount={visibleMatches.length}
        onCreateMatch={() => {
          setJoinMatchOnCreate(true);
          setModal("match");
        }}
        matches={filteredMatches}
        selectedMatchId={selectedMatch?.id}
        currentAttendeeId={currentAttendeeId}
        matchRegistering={matchRegistering}
        matchFilter={matchFilter}
        matchNotice={matchNotice}
        onFilterChange={setMatchFilter}
        onOpenMatch={openMatchDrawer}
        onRegisterForMatch={(matchId) => void registerForMatch(matchId)}
        drawerMatch={selectedMatch}
        drawerMounted={matchDrawerMounted}
        drawerOpen={matchDrawerOpen}
        playerNames={playerNames}
        composeTeams={composeMatchTeams}
        onCloseDrawer={closeMatchDrawer}
        members={organizationMembers}
        players={players}
        getPlayerRating={playerRating}
        currentUserId={session?.user.id}
        onInvite={() => openInviteDialog(organization, inviteCode)}
        isSynchronized={Boolean(session)}
      />
      {modalManager}
    </>
  );
}
