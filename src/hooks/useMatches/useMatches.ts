import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { currentPlayerId } from "../../data/currentPlayerId/currentPlayerId";
import { players } from "../../data/players/players";
import { readMatches } from "../../data/readMatches/readMatches";
import { supabase } from "../../lib/supabase/supabase";
import type { MatchSlot, OrganizationMember } from "../../types";

type MatchSlotRow = {
  id: string;
  match_date: string;
  match_time: string;
  venue: string;
  max_players: number;
  attendees: string[];
};

type UseMatchesOptions = {
  session: Session | null;
  organizationId: string | null;
  organizationMembers: OrganizationMember[];
};

export function useMatches({
  session,
  organizationId,
  organizationMembers,
}: UseMatchesOptions) {
  const [matches, setMatches] = useState(() =>
    supabase && session ? [] : readMatches(),
  );
  const [selectedMatchId, setSelectedMatchId] = useState(matches[0]?.id ?? "");
  const [matchFilter, setMatchFilter] = useState<"all" | "available">("all");
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
    }, 260);
  }

  const currentAttendeeId = session?.user.id ?? currentPlayerId;
  const selectedMatch = matches.find((match) => match.id === selectedMatchId);
  const visibleMatches = matches;
  const filteredMatches = visibleMatches.filter(
    (match) =>
      matchFilter === "all" || match.attendees.length < match.maxPlayers,
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
