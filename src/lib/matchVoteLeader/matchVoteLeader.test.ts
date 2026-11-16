import { describe, expect, it } from "vitest";
import { matchVoteLeader } from "./matchVoteLeader";

describe("matchVoteLeader", () => {
  it("finds the sole leader regardless of order", () => {
    expect(matchVoteLeader([
      { candidateId: "a", voteCount: 1 },
      { candidateId: "b", voteCount: 5 },
      { candidateId: "c", voteCount: 1 },
    ])).toBe("b");
  });

  it("does not name a leader when there are no votes or a tie", () => {
    expect(matchVoteLeader([])).toBeNull();
    expect(matchVoteLeader([{ candidateId: "a", voteCount: 0 }])).toBeNull();
    expect(matchVoteLeader([
      { candidateId: "a", voteCount: 2 },
      { candidateId: "b", voteCount: 2 },
    ])).toBeNull();
  });
});
