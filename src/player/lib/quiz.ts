import type { EngineConfig, QuizData, RankThreshold } from "../types.ts";

const DEFAULT_ABSOLUTE_RANKS: RankThreshold[] = [
  { min: 1800, rank: "S" },
  { min: 1500, rank: "A" },
  { min: 1200, rank: "B" },
  { min: 900, rank: "C" },
  { min: 600, rank: "D" },
];

const DEFAULT_PERCENT_RANKS: RankThreshold[] = [
  { min: 95, rank: "S" },
  { min: 85, rank: "A" },
  { min: 70, rank: "B" },
  { min: 60, rank: "C" },
  { min: 50, rank: "D" },
];

export const DEFAULT_MAX_HINTS = 3;
export const HINT_COST = 10;
/** A puzzle solved on a retry is worth half, rounded down. */
export const RETRY_CREDIT = 0.5;

export function readEngineConfig(data: QuizData): EngineConfig {
  return {
    wrongPenalty: data.config.wrongPenalty ?? 0,
    rankMode: data.config.rankMode ?? "absolute",
    roomLabel: data.config.roomLabel ?? "Room",
    absoluteRanks: data.config.absoluteRanks ?? DEFAULT_ABSOLUTE_RANKS,
    percentRanks: data.config.percentRanks ?? DEFAULT_PERCENT_RANKS,
  };
}

/** Room number to the puzzle ids in it, in ascending puzzle-id order. */
export function buildRoomPuzzleMap(data: QuizData): Record<number, number[]> {
  const map: Record<number, number[]> = {};
  for (const [id, puzzle] of Object.entries(data.puzzleData)) {
    (map[puzzle.room] ??= []).push(Number(id));
  }
  for (const ids of Object.values(map)) ids.sort((a, b) => a - b);
  return map;
}

export function totalRooms(data: QuizData): number {
  return Object.keys(data.roomCodes).length;
}

export function maxScore(data: QuizData): number {
  return Object.values(data.puzzleData).reduce((sum, p) => sum + p.points, 0);
}

export function resolveRank(config: EngineConfig, score: number, max: number): string {
  const thresholds = config.rankMode === "percent" ? config.percentRanks : config.absoluteRanks;
  const value = config.rankMode === "percent" ? (max > 0 ? (score / max) * 100 : 0) : score;
  return thresholds.find((t) => value >= t.min)?.rank ?? "E";
}

export function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
