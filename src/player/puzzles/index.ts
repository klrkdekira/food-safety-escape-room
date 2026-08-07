import { McqPuzzle } from "./Mcq.tsx";
import { MatchPuzzle } from "./Match.tsx";
import { MultiselectPuzzle } from "./Multiselect.tsx";
import { OrderPuzzle } from "./Order.tsx";
import { TextPuzzle } from "./Text.tsx";
import type { PuzzleType } from "./types.ts";

export const PuzzleRegistry: Record<string, PuzzleType> = {
  mcq: McqPuzzle,
  multiselect: MultiselectPuzzle,
  order: OrderPuzzle,
  match: MatchPuzzle,
  text: TextPuzzle,
};

export function getPuzzleType(type: string): PuzzleType | undefined {
  return PuzzleRegistry[type];
}

export type { PuzzleType, PuzzleViewProps } from "./types.ts";
