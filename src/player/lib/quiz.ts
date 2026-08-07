import { BLOOM_LEVELS } from "../../schema/quiz.ts";
import type { BloomLevel } from "../../schema/quiz.ts";
import type { EngineConfig, PuzzleResult, QuizData, RankThreshold } from "../types.ts";

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

export interface BloomLevelStats {
  level: BloomLevel;
  label: string;
  totalPuzzles: number;
  correctCount: number;
  maxPoints: number;
  earnedPoints: number;
}

/**
 * Score, per Bloom's Taxonomy cognitive level, from the quiz's authored
 * bloomLevel tags and the player's puzzle results. Levels with no puzzles in
 * this quiz are omitted rather than shown as an empty row.
 */
export function computeBloomBreakdown(
  data: QuizData,
  results: Record<string, PuzzleResult | undefined>,
): BloomLevelStats[] {
  const stats = new Map<BloomLevel, BloomLevelStats>(
    BLOOM_LEVELS.map(({ level, label }) => [
      level,
      { level, label, totalPuzzles: 0, correctCount: 0, maxPoints: 0, earnedPoints: 0 },
    ]),
  );

  for (const [puzzleId, puzzle] of Object.entries(data.puzzleData)) {
    const stat = stats.get(puzzle.bloomLevel);
    if (!stat) continue;
    stat.totalPuzzles += 1;
    stat.maxPoints += puzzle.points;
    const result = results[puzzleId];
    if (result?.correct) {
      stat.correctCount += 1;
      stat.earnedPoints += result.points;
    }
  }

  return BLOOM_LEVELS.map(({ level }) => stats.get(level)).filter(
    (stat): stat is BloomLevelStats => stat !== undefined && stat.totalPuzzles > 0,
  );
}
