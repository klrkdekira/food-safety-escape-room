import type React from "react";

export interface PuzzleViewProps<TPuzzle = any, TAnswer = any> {
  id: number;
  puzzle: TPuzzle;
  answer: TAnswer;
  /**
   * Option keys (or item ids) in the order they should be shown. Fixed once per
   * session so a re-render never reshuffles the options under the player.
   */
  displayOrder: string[];
  /** A solved puzzle stays on screen but stops accepting input. */
  disabled: boolean;
  onChange: (answer: TAnswer) => void;
}

export interface PuzzleInit<TAnswer = any> {
  answer: TAnswer;
  displayOrder: string[];
}

export interface PuzzleType<TPuzzle = any, TAnswer = any> {
  id: string;
  label: string;
  View: React.FC<PuzzleViewProps<TPuzzle, TAnswer>>;
  /**
   * Blank answer plus display order, derived together so the single shuffle is
   * shared: an order puzzle's answer *is* its display order.
   */
  init: (puzzle: TPuzzle) => PuzzleInit<TAnswer>;
  /**
   * Pure -- it grades the answer it is handed. The vanilla handlers read the
   * live DOM with querySelector, which meant grading could not be tested and
   * depended on what happened to be rendered.
   */
  check: (puzzle: TPuzzle, answer: TAnswer) => boolean;
}
