import type { FormEvent } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Session } from "@supabase/supabase-js";
import type { MatchGoal, MatchSlot, MatchStateAction } from "../../types";
import { supabase } from "../../lib/supabase/supabase";

type MatchSlotRow = {
  id: string;
  match_date: string;
  match_time: string;
  venue: string;
  max_players: number;
  attendees: string[];
};

type LiveMatchRow = {
  status: "in_progress";
  started_at: string;
  team_a: string[];
  team_b: string[];
};

type MatchStateRow = {
  status: "in_progress" | "paused" | "finished";
  started_at: string | null;
  elapsed_seconds: number;
};

type MatchGoalRow = {
  id: string;
  scorer_id: string;
  team: number;
  elapsed_seconds: number;
  created_at: string;
};

type MatchTeamsRow = {
  team_a: string[];
  team_b: string[];
};

function getCurrentElapsedSeconds(match: MatchSlot) {
  const elapsedSeconds = match.elapsedSeconds ?? 0;
  if (match.status !== "in_progress" || !match.startedAt) return elapsedSeconds;
  return (
    elapsedSeconds +
    Math.max(
      0,
      Math.floor((Date.now() - new Date(match.startedAt).getTime()) / 1000),
    )
  );
}

type UseMatchActionsOptions = {
  matches: MatchSlot[];
  setMatches: Dispatch<SetStateAction<MatchSlot[]>>;
  session: Session | null;
  organizationId: string | null;
  currentAttendeeId: string;
  matchRegistering: boolean;
  setMatchRegistering: Dispatch<SetStateAction<boolean>>;
  venue: string;
  setVenue: Dispatch<SetStateAction<string>>;
  matchDate: string;
  matchTime: string;
  matchMaxPlayers: number;
  joinMatchOnCreate: boolean;
  setMatchSaving: Dispatch<SetStateAction<boolean>>;
  setMatchNotice: Dispatch<SetStateAction<string>>;
  setFeatureNotice: Dispatch<SetStateAction<string>>;
  setSelectedMatchId: Dispatch<SetStateAction<string>>;
  closeMatchDialog: () => void;
  showMatchesView: () => void;
};

export function useMatchActions({
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
  setFeatureNotice,
  setSelectedMatchId,
  closeMatchDialog,
  showMatchesView,
}: UseMatchActionsOptions) {
  async function registerForMatch(matchId: string) {
    const matchToRegister = matches.find((match) => match.id === matchId);
    if (!matchToRegister || matchRegistering) return;
    if (matchToRegister.attendees.includes(currentAttendeeId)) return;
    if (matchToRegister.attendees.length >= matchToRegister.maxPlayers) {
      setMatchNotice(
        `Les ${matchToRegister.maxPlayers} places sont déjà prises pour ce match.`,
      );
      return;
    }
    if (supabase && session) {
      setMatchRegistering(true);
      setMatchNotice("");
      try {
        const { data, error } = await supabase.rpc("register_for_match", {
          p_match_id: matchToRegister.id,
        });
        if (error) throw error;
        const registeredAttendees = (data?.[0]?.attendees ?? []) as string[];
        setMatches((current) =>
          current.map((match) =>
            match.id === matchToRegister.id
              ? { ...match, attendees: registeredAttendees, teams: undefined }
              : match,
          ),
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message.toLowerCase() : "";
        setMatchNotice(
          message.includes("match is full")
            ? "Désolé, la dernière place vient d’être prise. Ce match est complet."
            : `Impossible de vous inscrire : ${error instanceof Error ? error.message : "erreur inconnue"}`,
        );
      } finally {
        setMatchRegistering(false);
      }
      return;
    }

    setMatches((current) =>
      current.map((match) =>
        match.id === matchToRegister.id
          ? {
              ...match,
              attendees: [...match.attendees, currentAttendeeId],
              teams: undefined,
            }
          : match,
      ),
    );
  }

  async function createMatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!venue.trim()) return;

    if (supabase && session) {
      if (!organizationId) {
        setFeatureNotice(
          "Créez ou rejoignez un club avant d’ajouter un match dans Supabase.",
        );
        return;
      }

      setMatchSaving(true);
      setFeatureNotice("");
      try {
        const { data, error } = await supabase.rpc("create_match_slot", {
          p_organization_id: organizationId,
          p_match_date: matchDate,
          p_match_time: matchTime,
          p_venue: venue.trim(),
          p_max_players: matchMaxPlayers,
          p_register_creator: joinMatchOnCreate,
        });
        if (error) throw error;
        const row = ((data ?? []) as MatchSlotRow[])[0];
        if (!row) throw new Error("Supabase n’a renvoyé aucun créneau créé.");

        const match: MatchSlot = {
          id: row.id,
          date: row.match_date,
          time: row.match_time,
          venue: row.venue,
          maxPlayers: row.max_players,
          attendees: row.attendees ?? [],
        };
        setMatches((current) =>
          [...current, match].sort((a, b) =>
            `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`),
          ),
        );
        setSelectedMatchId(match.id);
        setVenue("");
        setMatchNotice("");
        closeMatchDialog();
        showMatchesView();
      } catch (error) {
        setFeatureNotice(
          `Impossible d’ajouter le match dans Supabase : ${error instanceof Error ? error.message : "erreur inconnue"}`,
        );
      } finally {
        setMatchSaving(false);
      }
      return;
    }

    const match: MatchSlot = {
      id: crypto.randomUUID(),
      date: matchDate,
      time: matchTime,
      venue: venue.trim(),
      maxPlayers: matchMaxPlayers,
      attendees: joinMatchOnCreate ? [currentAttendeeId] : [],
    };
    setMatches((current) =>
      [...current, match].sort((a, b) =>
        `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`),
      ),
    );
    setSelectedMatchId(match.id);
    setVenue("");
    closeMatchDialog();
    showMatchesView();
  }

  async function startMatch(
    matchId: string,
    teams: [string[], string[]],
  ): Promise<boolean> {
    const match = matches.find((item) => item.id === matchId);
    if (!match || (match.status && match.status !== "scheduled")) return false;
    if (match.attendees.length < match.maxPlayers) {
      setMatchNotice("Le match doit être complet pour pouvoir être lancé.");
      return false;
    }

    try {
      let startedAt = new Date().toISOString();
      let savedTeams = teams;
      if (supabase && session) {
        const { data, error } = await supabase.rpc("start_match", {
          p_match_id: matchId,
          p_team_a: teams[0],
          p_team_b: teams[1],
        });
        if (error) throw error;
        const row = ((data ?? []) as LiveMatchRow[])[0];
        if (!row) throw new Error("Supabase n’a renvoyé aucun match lancé.");
        startedAt = row.started_at;
        savedTeams = [row.team_a, row.team_b];
      }
      setMatches((current) =>
        current.map((item) =>
          item.id === matchId
            ? {
                ...item,
                status: "in_progress",
                startedAt,
                elapsedSeconds: 0,
                teams: savedTeams,
                goals: item.goals ?? [],
              }
            : item,
        ),
      );
      setMatchNotice("");
      return true;
    } catch (error) {
      setMatchNotice(
        `Impossible de lancer le match : ${error instanceof Error ? error.message : "erreur inconnue"}`,
      );
      return false;
    }
  }

  async function setMatchState(
    matchId: string,
    action: MatchStateAction,
  ): Promise<boolean> {
    const match = matches.find((item) => item.id === matchId);
    const allowed =
      (action === "pause" && match?.status === "in_progress") ||
      (action === "resume" && match?.status === "paused") ||
      (action === "finish" &&
        (match?.status === "in_progress" || match?.status === "paused"));
    if (!match || !allowed) return false;

    try {
      let status: MatchSlot["status"];
      let startedAt: string | undefined;
      let elapsedSeconds = getCurrentElapsedSeconds(match);

      if (supabase && session) {
        const { data, error } = await supabase.rpc("set_match_state", {
          p_match_id: matchId,
          p_action: action,
        });
        if (error) throw error;
        const row = ((data ?? []) as MatchStateRow[])[0];
        if (!row) throw new Error("Supabase n’a renvoyé aucun état de match.");
        status = row.status;
        startedAt = row.started_at ?? undefined;
        elapsedSeconds = row.elapsed_seconds;
      } else if (action === "pause") {
        status = "paused";
      } else if (action === "resume") {
        status = "in_progress";
        startedAt = new Date().toISOString();
      } else {
        status = "finished";
      }

      setMatches((current) =>
        current.map((item) =>
          item.id === matchId
            ? { ...item, status, startedAt, elapsedSeconds }
            : item,
        ),
      );
      setMatchNotice("");
      return true;
    } catch (error) {
      setMatchNotice(
        `Impossible de mettre à jour le match : ${error instanceof Error ? error.message : "erreur inconnue"}`,
      );
      return false;
    }
  }

  async function recordGoal(matchId: string, scorerId: string) {
    const match = matches.find((item) => item.id === matchId);
    const teamIndex = match?.teams?.findIndex((team) =>
      team.includes(scorerId),
    );
    if (
      !match ||
      (match.status !== "in_progress" && match.status !== "paused") ||
      (match.status === "in_progress" && !match.startedAt) ||
      (teamIndex !== 0 && teamIndex !== 1)
    ) {
      return;
    }

    try {
      let goal: MatchGoal;
      if (supabase && session) {
        const { data, error } = await supabase.rpc("record_match_goal", {
          p_match_id: matchId,
          p_scorer_id: scorerId,
        });
        if (error) throw error;
        const row = ((data ?? []) as MatchGoalRow[])[0];
        if (!row) throw new Error("Supabase n’a renvoyé aucun but ajouté.");
        goal = {
          id: row.id,
          scorerId: row.scorer_id,
          team: row.team === 0 ? 0 : 1,
          elapsedSeconds: row.elapsed_seconds,
          createdAt: row.created_at,
        };
      } else {
        const createdAt = new Date();
        goal = {
          id: crypto.randomUUID(),
          scorerId,
          team: teamIndex,
          elapsedSeconds: getCurrentElapsedSeconds(match),
          createdAt: createdAt.toISOString(),
        };
      }
      setMatches((current) =>
        current.map((item) =>
          item.id === matchId
            ? { ...item, goals: [...(item.goals ?? []), goal] }
            : item,
        ),
      );
      setMatchNotice("");
    } catch (error) {
      setMatchNotice(
        `Impossible d’ajouter le but : ${error instanceof Error ? error.message : "erreur inconnue"}`,
      );
    }
  }

  async function swapPlayers(
    matchId: string,
    redPlayerId: string,
    bluePlayerId: string,
  ) {
    const match = matches.find((item) => item.id === matchId);
    if (
      (match?.status !== "in_progress" && match?.status !== "paused") ||
      !match.teams
    )
      return;
    if (
      !match.teams[0].includes(redPlayerId) ||
      !match.teams[1].includes(bluePlayerId) ||
      redPlayerId === bluePlayerId
    )
      return;

    try {
      let nextTeams: [string[], string[]];
      if (supabase && session) {
        const { data, error } = await supabase.rpc("swap_match_teams", {
          p_match_id: matchId,
          p_red_player_id: redPlayerId,
          p_blue_player_id: bluePlayerId,
        });
        if (error) throw error;
        const row = ((data ?? []) as MatchTeamsRow[])[0];
        if (!row)
          throw new Error("Supabase n’a renvoyé aucune équipe mise à jour.");
        nextTeams = [row.team_a, row.team_b];
      } else {
        nextTeams = [...match.teams] as [string[], string[]];
        const redIndex = nextTeams[0].indexOf(redPlayerId);
        const blueIndex = nextTeams[1].indexOf(bluePlayerId);
        nextTeams[0][redIndex] = bluePlayerId;
        nextTeams[1][blueIndex] = redPlayerId;
      }
      setMatches((current) =>
        current.map((item) =>
          item.id === matchId ? { ...item, teams: nextTeams } : item,
        ),
      );
      setMatchNotice("");
    } catch (error) {
      setMatchNotice(
        `Impossible d’échanger les joueurs : ${error instanceof Error ? error.message : "erreur inconnue"}`,
      );
    }
  }

  return {
    registerForMatch,
    createMatch,
    startMatch,
    setMatchState,
    recordGoal,
    swapPlayers,
  };
}
