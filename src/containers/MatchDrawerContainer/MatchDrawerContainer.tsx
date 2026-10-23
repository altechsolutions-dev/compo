import { MatchDrawer } from "../../components/MatchDrawer/MatchDrawer";
import type { MatchSlot } from "../../types";
import "./MatchDrawerContainer.css";

export type MatchDrawerContainerProps = {
  match?: MatchSlot;
  mounted: boolean;
  open: boolean;
  currentAttendeeId: string;
  isRegistering: boolean;
  playerNames: Record<string, string>;
  composeTeams: (attendeeIds: string[]) => [string[], string[]];
  onClose: () => void;
  onRegister: (matchId: string) => void;
  onStartMatch: (matchId: string, teams: [string[], string[]]) => void;
  onRecordGoal: (matchId: string, scorerId: string) => void;
};

export function MatchDrawerContainer({
  match,
  mounted,
  open,
  currentAttendeeId,
  isRegistering,
  playerNames,
  composeTeams,
  onClose,
  onRegister,
  onStartMatch,
  onRecordGoal,
}: MatchDrawerContainerProps) {
  if (!match) return null;

  const isFull = match.attendees.length >= match.maxPlayers;
  const teams =
    match.teams ?? (isFull ? composeTeams(match.attendees) : undefined);

  return (
    <div className="match-drawer-container">
      <MatchDrawer
        match={match}
        mounted={mounted}
        open={open}
        isFull={isFull}
        isRegistered={match.attendees.includes(currentAttendeeId)}
        isRegistering={isRegistering}
        teams={teams}
        playerNames={playerNames}
        onClose={onClose}
        onRegister={() => onRegister(match.id)}
        onStartMatch={(nextTeams) => onStartMatch(match.id, nextTeams)}
        onRecordGoal={(scorerId) => onRecordGoal(match.id, scorerId)}
      />
    </div>
  );
}
