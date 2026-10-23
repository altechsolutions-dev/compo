import type { FormEvent } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Session } from "@supabase/supabase-js";
import type { MatchSlot } from "../../types";
import { supabase } from "../../lib/supabase/supabase";

type MatchSlotRow = {
  id: string;
  match_date: string;
  match_time: string;
  venue: string;
  max_players: number;
  attendees: string[];
};

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

  return { registerForMatch, createMatch };
}
