import React from "react";
import type { PuzzleType, PuzzleViewProps } from "./types.ts";

type MatchAnswer = Record<string, string>;

const MatchView: React.FC<PuzzleViewProps<any, MatchAnswer>> = ({
  id,
  puzzle,
  answer,
  disabled,
  onChange,
}) => (
  <div className="match-select-wrapper">
    {puzzle.leftItems.map((left: any) => (
      <div className="match-row" key={left.id}>
        <label htmlFor={`match-${id}-${left.id}`}>{left.text}</label>
        {/* A native <select> rather than a custom two-column widget: this is
            what made match puzzles WCAG 2.2 AA compliant. Do not swap it for
            click-to-pair boxes. */}
        <select
          id={`match-${id}-${left.id}`}
          className="match-select-input"
          value={answer[left.id] ?? ""}
          disabled={disabled}
          onChange={(e) => {
            const next = { ...answer };
            if (e.target.value) next[left.id] = e.target.value;
            else delete next[left.id];
            onChange(next);
          }}
        >
          <option value="">Select a match…</option>
          {puzzle.rightItems.map((right: any) => (
            <option value={right.id} key={right.id}>
              {right.text}
            </option>
          ))}
        </select>
      </div>
    ))}
  </div>
);

export const MatchPuzzle: PuzzleType<any, MatchAnswer> = {
  id: "match",
  label: "Matching & Classification",
  View: MatchView,
  // Left items keep their authored order; only the right-hand options repeat, and
  // several left items may legitimately map to the same right item.
  init: (puzzle) => ({
    answer: {},
    displayOrder: puzzle.leftItems.map((item: any) => item.id),
  }),
  check: (puzzle, answer) => {
    const correctKeys = Object.keys(puzzle.correct);
    const answered = Object.keys(answer);
    return (
      correctKeys.length === answered.length &&
      correctKeys.every((leftId) => answer[leftId] === puzzle.correct[leftId])
    );
  },
};
