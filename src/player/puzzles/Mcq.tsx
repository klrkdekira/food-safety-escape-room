import React from "react";
import { shuffle } from "../lib/shuffle.ts";
import type { PuzzleType, PuzzleViewProps } from "./types.ts";

type McqAnswer = string | null;

const McqView: React.FC<PuzzleViewProps<any, McqAnswer>> = ({
  id,
  puzzle,
  answer,
  displayOrder,
  disabled,
  onChange,
}) => {
  const byKey = new Map<string, any>(puzzle.options.map((o: any) => [o.key, o]));

  return (
    <fieldset className="mcq-options-fieldset" id={`puzzle-${id}-options`}>
      <legend className="sr-only">{puzzle.title}</legend>
      {displayOrder.map((key, i) => {
        const option = byKey.get(key);
        if (!option) return null;
        return (
          <label className="mcq-option" key={key}>
            {/* A real radio in a fieldset: the browser supplies arrow-key
                navigation, aria-checked, and position-in-set announcements. */}
            <input
              className="sr-only-input"
              type="radio"
              name={`puzzle-${id}-radio`}
              value={key}
              checked={answer === key}
              disabled={disabled}
              onChange={() => onChange(key)}
            />
            {/* Positional letter -- hint and explanation text must never say
                "option B", because the order is shuffled per session. */}
            <span className="marker">{String.fromCharCode(65 + i)}</span>
            <span>{option.text}</span>
          </label>
        );
      })}
    </fieldset>
  );
};

export const McqPuzzle: PuzzleType<any, McqAnswer> = {
  id: "mcq",
  label: "Multiple Choice (Single Answer)",
  View: McqView,
  init: (puzzle) => ({
    answer: null,
    displayOrder: shuffle(puzzle.options.map((o: any) => o.key)),
  }),
  check: (puzzle, answer) => answer !== null && answer === puzzle.correct,
};
