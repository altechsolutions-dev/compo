import { players } from "../../data/players/players";
import type { Player } from "../../types";
import { playerRating } from "../playerRating/playerRating";

function balanceTeams(attendeeIds: string[]): [string[], string[]] {
  const roster = attendeeIds
    .map((id) => players.find((player) => player.id === id))
    .filter((player): player is Player => Boolean(player));
  if (roster.length !== 10) return [[], []];

  let bestTeams: [Player[], Player[]] = [[], []];
  let bestCost = Number.POSITIVE_INFINITY;
  const combinationCount = 1 << roster.length;

  for (let mask = 0; mask < combinationCount; mask += 1) {
    if (
      (mask & 1) === 0 ||
      roster.filter((_, index) => mask & (1 << index)).length !== 5
    )
      continue;

    const first = roster.filter((_, index) => mask & (1 << index));
    const second = roster.filter((_, index) => !(mask & (1 << index)));
    const statDifference = (key: "attack" | "defense" | "stamina") =>
      Math.abs(
        first.reduce((sum, player) => sum + player[key], 0) -
          second.reduce((sum, player) => sum + player[key], 0),
      );
    const roleDifference = (position: Player["position"]) =>
      Math.abs(
        first.filter((player) => player.position === position).length -
          second.filter((player) => player.position === position).length,
      );
    const cost =
      Math.abs(
        first.reduce((sum, player) => sum + playerRating(player), 0) -
          second.reduce((sum, player) => sum + playerRating(player), 0),
      ) *
        2 +
      statDifference("attack") * 0.12 +
      statDifference("defense") * 0.12 +
      statDifference("stamina") * 0.08 +
      roleDifference("Gardien") * 18 +
      roleDifference("Défenseur") * 5 +
      roleDifference("Attaquant") * 5;

    if (cost < bestCost) {
      bestCost = cost;
      bestTeams = [first, second];
    }
  }

  return [
    bestTeams[0].map((player) => player.id),
    bestTeams[1].map((player) => player.id),
  ];
}

export function composeMatchTeams(attendeeIds: string[]): [string[], string[]] {
  const balancedTeams = balanceTeams(attendeeIds);
  if (balancedTeams[0].length > 0 && balancedTeams[1].length > 0) {
    return balancedTeams;
  }

  const splitIndex = Math.ceil(attendeeIds.length / 2);
  return [attendeeIds.slice(0, splitIndex), attendeeIds.slice(splitIndex)];
}
