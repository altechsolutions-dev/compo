import { useState } from "react";
import { Drawer } from "../../components/Drawer/Drawer";
import { MatchCard } from "../../components/MatchCard/MatchCard";
import { renderMatchDetailsContent } from "../../components/MatchDetails/matchDetailsContent";
import { dateAfter } from "../../data/dateAfter/dateAfter";
import { players } from "../../data/players/players";
import { composeMatchTeams } from "../../lib/composeMatchTeams/composeMatchTeams";
import type { MatchGoal, MatchSlot } from "../../types";

const mockPlayers = players.slice(0, 10);
const mockPlayerNames = Object.fromEntries([
  ...mockPlayers.map((player) => [player.id, player.name]),
  ["mock-viewer", "Vous (aperçu)"],
]);

export function FullMatchMock() {
  const [attendeeIds, setAttendeeIds] = useState(() =>
    mockPlayers.map((player) => player.id),
  );
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [startedAt, setStartedAt] = useState<string>();
  const [goals, setGoals] = useState<MatchGoal[]>([]);
  const [matchTeams, setMatchTeams] = useState<[string[], string[]]>();
  const match: MatchSlot = {
    id: "mock-full-match",
    date: dateAfter(3),
    time: "19:30",
    venue: "Urban Soccer · Porte d'Italie",
    maxPlayers: 10,
    attendees: attendeeIds,
    status: startedAt ? "in_progress" : "scheduled",
    startedAt,
    goals,
  };
  const isFull = attendeeIds.length >= match.maxPlayers;
  const teams = matchTeams ?? composeMatchTeams(attendeeIds);

  function registerForMatch() {
    setAttendeeIds((current) =>
      current.length >= match.maxPlayers || current.includes("mock-viewer")
        ? current
        : [...current, "mock-viewer"],
    );
  }

  function startMatch(teamLists: [string[], string[]]) {
    setStartedAt(new Date().toISOString());
    setGoals([]);
    setMatchTeams(teamLists);
  }

  function recordGoal(scorerId: string) {
    if (!startedAt) return;
    const team = teams[0].includes(scorerId) ? 0 : 1;
    setGoals((current) => [
      ...current,
      {
        id: `mock-goal-${Date.now()}-${current.length}`,
        scorerId,
        team,
        elapsedSeconds: Math.max(
          0,
          Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000),
        ),
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  return (
    <main className="min-h-svh px-5 py-8 text-(--text-primary) sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-5 border-b border-(--line) pb-5">
          <div>
            <p className="mb-2 text-[10px] font-bold tracking-[1.5px] text-(--team-b-blue)">
              APERÇU LOCAL
            </p>
            <h1 className="m-0 text-2xl font-semibold">Match complet</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="min-h-9 cursor-pointer rounded-md border border-(--line) bg-(--bg-surface) px-3 text-xs font-semibold text-(--text-primary) hover:border-(--team-b-blue)"
              disabled={attendeeIds.length === 0}
              onClick={() => {
                setAttendeeIds((current) => current.slice(0, -1));
                setMatchTeams(undefined);
                setStartedAt(undefined);
                setGoals([]);
              }}
              type="button"
            >
              Retirer un joueur
            </button>
            <button
              className="min-h-9 cursor-pointer rounded-md border border-(--line) bg-(--bg-surface) px-3 text-xs font-semibold text-(--text-primary) hover:border-(--team-b-blue)"
              onClick={() => {
                setAttendeeIds(mockPlayers.map((player) => player.id));
                setMatchTeams(undefined);
                setStartedAt(undefined);
                setGoals([]);
              }}
              type="button"
            >
              Réinitialiser à 10/10
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(260px,360px)_1fr]">
          <MatchCard
            match={match}
            isSelected
            currentAttendeeId="mock-viewer"
            matchRegistering={false}
            onOpen={() => setDrawerOpen(true)}
            onRegister={registerForMatch}
          />
          <div className="hidden min-h-36 items-center border-l border-(--line) pl-6 text-sm text-(--text-secondary) md:flex">
            {attendeeIds.length}/{match.maxPlayers} joueurs inscrits
          </div>
        </div>
      </div>

      <Drawer
        mounted
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        labelledBy="match-drawer-title"
        panelClassName="h-full w-full max-w-180 overflow-y-auto border-l border-(--line) bg-(--bg-main) p-8 text-(--text-primary) shadow-[-18px_0_48px_#0005] max-[600px]:max-w-full max-[600px]:border-l-0 max-[600px]:p-5 [&>h2]:mb-2.25 [&>h2]:font-sans [&>h2]:text-2xl [&>h2]:font-normal [&>h2_span]:text-[#9bb5a4]"
      >
        {renderMatchDetailsContent({
          match,
          isFull,
          isRegistered: attendeeIds.includes("mock-viewer"),
          isRegistering: false,
          teams: isFull ? teams : undefined,
          playerNames: mockPlayerNames,
          onClose: () => setDrawerOpen(false),
          onRegister: registerForMatch,
          onStartMatch: startMatch,
          onRecordGoal: recordGoal,
        })}
      </Drawer>
    </main>
  );
}
