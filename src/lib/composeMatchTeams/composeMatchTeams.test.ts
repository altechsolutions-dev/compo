import { describe, expect, it } from "vitest";
import { players } from "../../data/players/players";
import { composeMatchTeams } from "./composeMatchTeams";

describe("composeMatchTeams", () => {
  it("répartit dix joueurs en deux équipes complètes et conserve chaque joueur", () => {
    const attendeeIds = players.map((player) => player.id);
    const [teamA, teamB] = composeMatchTeams(attendeeIds);

    expect(teamA).toHaveLength(5);
    expect(teamB).toHaveLength(5);
    expect([...teamA, ...teamB].sort()).toEqual([...attendeeIds].sort());
  });

  it("répartit les effectifs incomplets aussi équitablement que possible", () => {
    expect(composeMatchTeams(["alex", "sarah", "malik"])).toEqual([
      ["alex", "sarah"],
      ["malik"],
    ]);
  });
});
