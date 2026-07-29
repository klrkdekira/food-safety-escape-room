import { McqHandler } from "./mcq.ts";
import { MultiselectHandler } from "./multiselect.ts";
import { OrderHandler } from "./order.ts";
import { MatchHandler } from "./match.ts";
import type { PuzzleHandler } from "./types.ts";

export const PuzzleRegistry: Record<string, PuzzleHandler> = {
  mcq: McqHandler,
  multiselect: MultiselectHandler,
  order: OrderHandler,
  match: MatchHandler,
};

export function getPuzzleHandler(type: string): PuzzleHandler | undefined {
  return PuzzleRegistry[type];
}

export type { PuzzleHandler };
