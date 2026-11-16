export function matchVoteLeader(
  totals: { candidateId: string; voteCount: number }[],
): string | null {
  const sorted = totals
    .filter((vote) => vote.voteCount > 0)
    .sort((a, b) => b.voteCount - a.voteCount);
  if (!sorted.length || sorted[0].voteCount === sorted[1]?.voteCount) {
    return null;
  }
  return sorted[0].candidateId;
}
