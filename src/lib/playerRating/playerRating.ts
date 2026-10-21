import type { Player } from "../../types";

export function playerRating(player: Player) {
  return Math.round(
    player.attack * 0.4 + player.defense * 0.35 + player.stamina * 0.25,
  );
}
