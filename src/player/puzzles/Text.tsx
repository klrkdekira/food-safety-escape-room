import React from "react";
import type { PuzzleType, PuzzleViewProps } from "./types.ts";

type TextAnswer = string | null;

/** Lowercase, trimmed, internal whitespace collapsed to one space. */
function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

const TextView: React.FC<PuzzleViewProps<any, TextAnswer>> = ({
  id,
  answer,
  disabled,
  onChange,
}) => (
  <input
    className="text-answer-input"
    id={`puzzle-${id}-text`}
    type="text"
    autoComplete="off"
    spellCheck={false}
    placeholder="Type your answer…"
    value={answer ?? ""}
    disabled={disabled}
    onChange={(e) => onChange(e.target.value)}
  />
);

export const TextPuzzle: PuzzleType<any, TextAnswer> = {
  id: "text",
  label: "Free Text (Keyword Match)",
  View: TextView,
  init: () => ({ answer: "", displayOrder: [] }),
  // Lenient on purpose: correct if the answer contains any one keyword, not an
  // exact match. Punctuation/case/extra words around the keyword don't matter.
  check: (puzzle, answer) => {
    if (!answer) return false;
    const normalized = normalize(answer);
    if (!normalized) return false;
    return puzzle.keywords.some((keyword: string) => normalized.includes(normalize(keyword)));
  },
};
