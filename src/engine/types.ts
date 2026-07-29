import type { QuizData, Puzzle } from "../schema/quiz.ts";

export type { QuizData, Puzzle };

/** Highest threshold first; the first entry whose `min` is met wins. */
export interface RankThreshold {
  min: number;
  rank: string;
}

export interface EngineConfig {
  wrongPenalty: number;
  rankMode: "absolute" | "percent";
  roomLabel: string; // e.g. "Room" vs "Zone"
  absoluteRanks: RankThreshold[];
  percentRanks: RankThreshold[];
}

export interface EngineState {
  currentRoom: number;
  score: number;
  puzzlesCompleted: number;
  hintsUsed: number;
  maxHints: number;
  soundEnabled: boolean;
  timeElapsed: number;
  activePuzzles: Record<string, number>;
  codes: Record<string, boolean>;
  roomCompleted: Record<string, boolean>;
  puzzleSolved: Record<string, boolean>;
  puzzleAttempts: Record<string, number>;
  timerInterval?: ReturnType<typeof setInterval>;
}
