import { describe, expect, it } from "vitest";
import { players } from "../../data/players/players";
import { playerRating } from "./playerRating";

describe("playerRating", () => {
  it("calcule la note joueur à partir des pondérations de référence", () => {
    expect(playerRating(players[0])).toBe(75);
  });
});
