import type { MatchSlot } from "../../types";
import { currentPlayerId } from "../currentPlayerId/currentPlayerId";
import { dateAfter } from "../dateAfter/dateAfter";
import { players } from "../players/players";

function initialMatches(): MatchSlot[] {
  const attendees = players
    .filter((player) => player.id !== currentPlayerId)
    .map((player) => player.id);
  return [
    {
      id: "match-1",
      date: dateAfter(2),
      time: "19:30",
      venue: "Urban Soccer · Porte d'Italie",
      maxPlayers: 10,
      attendees: attendees.slice(0, 9),
    },
    {
      id: "match-2",
      date: dateAfter(5),
      time: "20:00",
      venue: "Five Paris · La Villette",
      maxPlayers: 10,
      attendees: attendees.slice(1, 7),
    },
  ];
}

export function readMatches(): MatchSlot[] {
  try {
    const saved: unknown = JSON.parse(
      localStorage.getItem("compo-matches") ?? "null",
    );
    return Array.isArray(saved)
      ? saved.map((match) => ({
          ...match,
          maxPlayers:
            typeof match.maxPlayers === "number" ? match.maxPlayers : 10,
        }))
      : initialMatches();
  } catch {
    return initialMatches();
  }
}
