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

/** The thresholds a rank is resolved against for this quiz's configured rank mode. */
export function rankThresholds(config: EngineConfig): RankThreshold[] {
  return config.rankMode === "percent" ? config.percentRanks : config.absoluteRanks;
}

/** The raw value (percent of max score, or absolute score) a rank is resolved from. */
export function rankValue(config: EngineConfig, score: number, max: number): number {
  return config.rankMode === "percent" ? (max > 0 ? (score / max) * 100 : 0) : score;
}

export function resolveRank(config: EngineConfig, score: number, max: number): string {
  const value = rankValue(config, score, max);
  return rankThresholds(config).find((t) => value >= t.min)?.rank ?? "E";
}

/**
 * One line per rank explaining exactly what earns it, lowest cutoff last, plus
 * a trailing "below every threshold" line for the unlabelled fallback rank.
 * Plain ASCII throughout -- shared verbatim with the PDF certificate, whose
 * base-14 fonts cannot render outside Latin-1.
 */
export function formatRankCriteria(config: EngineConfig): string[] {
  const unit = config.rankMode === "percent" ? "%" : " pts";
  const thresholds = rankThresholds(config);
  const lines = thresholds.map((t) => `${t.rank}: ${t.min}${unit} or higher`);
  const lowest = thresholds[thresholds.length - 1];
  if (lowest) lines.push(`Below ${lowest.min}${unit}: no rank awarded`);
  return lines;
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
  /** Wrong submissions across every puzzle at this level, including ones later solved. */
  mistakes: number;
  /** Seconds spent solving puzzles at this level, from first shown to solved correctly. */
  timeSpentSeconds: number;
}

/**
 * Score, per Bloom's Taxonomy cognitive level, from the quiz's authored
 * bloomLevel tags and the player's puzzle results. Every puzzle must be solved
 * to finish the quiz, so this also rolls up how many wrong attempts and how
 * much time each level cost -- the two signals raw correctness alone hides.
 * Levels with no puzzles in this quiz are omitted rather than shown as an
 * empty row.
 */
export function computeBloomBreakdown(
  data: QuizData,
  results: Record<string, PuzzleResult | undefined>,
  attempts: Record<string, number>,
): BloomLevelStats[] {
  const stats = new Map<BloomLevel, BloomLevelStats>(
    BLOOM_LEVELS.map(({ level, label }) => [
      level,
      {
        level,
        label,
        totalPuzzles: 0,
        correctCount: 0,
        maxPoints: 0,
        earnedPoints: 0,
        mistakes: 0,
        timeSpentSeconds: 0,
      },
    ]),
  );

  for (const [puzzleId, puzzle] of Object.entries(data.puzzleData)) {
    const stat = stats.get(puzzle.bloomLevel);
    if (!stat) continue;
    stat.totalPuzzles += 1;
    stat.maxPoints += puzzle.points;
    stat.mistakes += Math.max(0, (attempts[puzzleId] ?? 0) - 1);
    const result = results[puzzleId];
    if (result?.correct) {
      stat.correctCount += 1;
      stat.earnedPoints += result.points;
      stat.timeSpentSeconds += result.timeSpent ?? 0;
    }
  }

  return BLOOM_LEVELS.map(({ level }) => stats.get(level)).filter(
    (stat): stat is BloomLevelStats => stat !== undefined && stat.totalPuzzles > 0,
  );
}
