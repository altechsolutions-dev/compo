import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { currentPlayerId } from "../../data/currentPlayerId/currentPlayerId";
import { players } from "../../data/players/players";
import { readMatches } from "../../data/readMatches/readMatches";
import { supabase } from "../../lib/supabase/supabase";
import type { MatchGoal, MatchSlot, OrganizationMember } from "../../types";

type MatchSlotRow = {
  id: string;
  match_date: string;
  match_time: string;
  venue: string;
  max_players: number;
  attendees: string[];
  status?: MatchSlot["status"];
  started_at?: string | null;
  elapsed_seconds?: number;
  team_a?: string[] | null;
  team_b?: string[] | null;
  goals?: {
    id: string;
    scorer_id: string;
    team: number;
    elapsed_seconds: number;
    created_at: string;
  }[];
};

type UseMatchesOptions = {
  session: Session | null;
  organizationId: string | null;
  organizationMembers: OrganizationMember[];
  isLiveView?: boolean;
};

export function useMatches({
  session,
  organizationId,
  organizationMembers,
  isLiveView = false,
}: UseMatchesOptions) {
  const [matches, setMatches] = useState(() =>
    supabase && session ? [] : readMatches(),
  );
  const [selectedMatchId, setSelectedMatchId] = useState(matches[0]?.id ?? "");
  const [matchFilter, setMatchFilter] = useState<
    "all" | "available" | "finished"
  >("all");
  const [matchDrawerOpen, setMatchDrawerOpen] = useState(false);
  const [matchDrawerMounted, setMatchDrawerMounted] = useState(false);
  const [matchNotice, setMatchNotice] = useState("");
  const matchDrawerCloseTimer = useRef<number | null>(null);
  const sessionUserId = session?.user.id ?? null;

  useEffect(() => {
    if (supabase && session) return;
    localStorage.setItem("compo-matches", JSON.stringify(matches));
  }, [matches, session]);

  useEffect(() => {
    if (!supabase || !sessionUserId || !organizationId) return;

    let cancelled = false;
    void supabase
      .rpc("get_match_slots", { p_organization_id: organizationId })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setMatchNotice(`Impossible de charger les matchs : ${error.message}`);
          return;
        }
        const loadedMatches = ((data ?? []) as MatchSlotRow[]).map(
          (row): MatchSlot => ({
            id: row.id,
            date: row.match_date,
            time: row.match_time,
            venue: row.venue,
            maxPlayers: row.max_players,
            attendees: row.attendees ?? [],
            status: row.status ?? "scheduled",
            startedAt: row.started_at ?? undefined,
            elapsedSeconds: row.elapsed_seconds ?? 0,
            teams:
              row.team_a && row.team_b ? [row.team_a, row.team_b] : undefined,
            goals: (row.goals ?? []).map(
              (goal): MatchGoal => ({
                id: goal.id,
                scorerId: goal.scorer_id,
                team: goal.team === 0 ? 0 : 1,
                elapsedSeconds: goal.elapsed_seconds,
                createdAt: goal.created_at,
              }),
            ),
          }),
        );
        setMatches(loadedMatches);
        setSelectedMatchId((current) =>
          loadedMatches.some((match) => match.id === current)
            ? current
            : (loadedMatches[0]?.id ?? ""),
        );
        setMatchNotice("");
      });

    return () => {
      cancelled = true;
    };
  }, [isLiveView, organizationId, sessionUserId]);

  useEffect(() => {
    if (!supabase || !sessionUserId || !organizationId) return;
    const refreshTimer = window.setInterval(() => {
      void supabase
        ?.rpc("get_match_slots", { p_organization_id: organizationId })
        .then(({ data, error }) => {
          if (error) return;
          const loadedMatches = ((data ?? []) as MatchSlotRow[]).map(
            (row): MatchSlot => ({
              id: row.id,
              date: row.match_date,
              time: row.match_time,
              venue: row.venue,
              maxPlayers: row.max_players,
              attendees: row.attendees ?? [],
              status: row.status ?? "scheduled",
              startedAt: row.started_at ?? undefined,
              elapsedSeconds: row.elapsed_seconds ?? 0,
              teams:
                row.team_a && row.team_b ? [row.team_a, row.team_b] : undefined,
              goals: (row.goals ?? []).map((goal) => ({
                id: goal.id,
                scorerId: goal.scorer_id,
                team: goal.team === 0 ? (0 as const) : (1 as const),
                elapsedSeconds: goal.elapsed_seconds,
                createdAt: goal.created_at,
              })),
            }),
          );
          setMatches(loadedMatches);
          setSelectedMatchId((current) =>
            loadedMatches.some((match) => match.id === current)
              ? current
              : (loadedMatches[0]?.id ?? ""),
          );
        });
    }, 60_000);
    return () => window.clearInterval(refreshTimer);
  }, [organizationId, sessionUserId]);

  useEffect(
    () => () => {
      if (matchDrawerCloseTimer.current !== null) {
        window.clearTimeout(matchDrawerCloseTimer.current);
      }
    },
    [],
  );

  function openMatchDrawer(matchId: string) {
    if (matchDrawerCloseTimer.current !== null) {
      window.clearTimeout(matchDrawerCloseTimer.current);
    }
    setSelectedMatchId(matchId);
    setMatchDrawerMounted(true);
    requestAnimationFrame(() => setMatchDrawerOpen(true));
  }

  function closeMatchDrawer() {
    setMatchDrawerOpen(false);
    matchDrawerCloseTimer.current = window.setTimeout(() => {
      setMatchDrawerMounted(false);
      matchDrawerCloseTimer.current = null;
    }, 300);
  }

  const currentAttendeeId = session?.user.id ?? currentPlayerId;
  const selectedMatch = matches.find((match) => match.id === selectedMatchId);
  const allMatches = matches;
  const visibleMatches = matches.filter((match) => match.status !== "finished");
  const filteredMatches =
    matchFilter === "finished"
      ? matches.filter((match) => match.status === "finished")
      : visibleMatches.filter(
          (match) =>
            matchFilter === "all" ||
            match.status === "in_progress" ||
            match.status === "paused" ||
            match.attendees.length < match.maxPlayers,
        );
  const playerNames = Object.fromEntries([
    ...players.map((player) => [player.id, player.name]),
    ...organizationMembers.map((member) => [
      member.user_id,
      member.display_name,
    ]),
  ]);

  return {
    matches,
    allMatches,
    setMatches,
    selectedMatchId,
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
  };
}
