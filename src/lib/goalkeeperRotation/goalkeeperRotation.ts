import type { GoalkeeperRotation, MatchSlot } from "../../types";

export const defaultGoalkeeperRotation: GoalkeeperRotation = {
  intervalSeconds: 300,
  anchorElapsedSeconds: 0,
  anchorTurn: 0,
};

export function getGoalkeeperRotation(
  rotation: GoalkeeperRotation = defaultGoalkeeperRotation,
  elapsedSeconds: number,
) {
  const elapsed = Math.max(0, elapsedSeconds - rotation.anchorElapsedSeconds);
  const completedTurns = Math.floor(elapsed / rotation.intervalSeconds);
  return {
    turn: rotation.anchorTurn + completedTurns,
    lastChangeSeconds:
      rotation.anchorElapsedSeconds + completedTurns * rotation.intervalSeconds,
    remainingSeconds: rotation.intervalSeconds - (elapsed % rotation.intervalSeconds),
  };
}

export function changeGoalkeeperInterval(
  rotation: GoalkeeperRotation | undefined,
  elapsedSeconds: number,
  intervalSeconds: number,
): GoalkeeperRotation {
  const current = getGoalkeeperRotation(rotation, elapsedSeconds);
  return {
    intervalSeconds,
    anchorElapsedSeconds: current.lastChangeSeconds,
    anchorTurn: current.turn,
  };
}

export function getGoalkeeperIds(
  teams: [string[], string[]],
  turn: number,
): [string | undefined, string | undefined] {
  return [
    teams[0][turn % teams[0].length],
    teams[1][turn % teams[1].length],
  ];
}

export function getCurrentMatchSeconds(match: MatchSlot) {
  return (match.elapsedSeconds ?? 0) +
    (match.status === "in_progress" && match.startedAt
      ? Math.max(0, Math.floor((Date.now() - Date.parse(match.startedAt)) / 1000))
      : 0);
}
