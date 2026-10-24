import { Drawer } from "../../components/Drawer/Drawer";
import { renderMatchDetailsContent } from "../../components/MatchDetails/matchDetailsContent";
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
      <Drawer
        mounted={mounted}
        open={open}
        onClose={onClose}
        labelledBy="match-drawer-title"
        panelClassName="h-full w-full max-w-180 overflow-y-auto border-l border-(--line) bg-(--bg-main) p-8 text-(--text-primary) shadow-[-18px_0_48px_#0005] max-[600px]:max-w-full max-[600px]:border-l-0 max-[600px]:p-5 [&>h2]:mb-2.25 [&>h2]:font-sans [&>h2]:text-2xl [&>h2]:font-normal [&>h2_span]:text-[#9bb5a4]"
      >
        {renderMatchDetailsContent({
          match,
          isFull,
          isRegistered: match.attendees.includes(currentAttendeeId),
          isRegistering,
          teams,
          playerNames,
          onClose,
          onRegister: () => onRegister(match.id),
          onStartMatch: (nextTeams) => onStartMatch(match.id, nextTeams),
          onRecordGoal: (scorerId) => onRecordGoal(match.id, scorerId),
        })}
      </Drawer>
    </div>
  );
}
