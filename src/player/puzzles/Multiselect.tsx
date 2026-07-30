import React from "react";
import { shuffle } from "../lib/shuffle.ts";
import type { PuzzleType, PuzzleViewProps } from "./types.ts";

type MultiselectAnswer = string[];

const MultiselectView: React.FC<PuzzleViewProps<any, MultiselectAnswer>> = ({
  id,
  puzzle,
  answer,
  displayOrder,
  disabled,
  onChange,
}) => {
  const byKey = new Map<string, any>(puzzle.options.map((o: any) => [o.key, o]));

  const toggle = (key: string) => {
    onChange(answer.includes(key) ? answer.filter((k) => k !== key) : [...answer, key]);
  };

  return (
    <fieldset className="multi-select-options-fieldset" id={`puzzle-${id}-options`}>
      <legend className="sr-only">{puzzle.title}</legend>
      {displayOrder.map((key) => {
        const option = byKey.get(key);
        if (!option) return null;
        return (
          <label className="multi-option" key={key}>
            <input
              className="sr-only-input"
              type="checkbox"
              name={`puzzle-${id}-check`}
              value={key}
              checked={answer.includes(key)}
              disabled={disabled}
              onChange={() => toggle(key)}
            />
            <span className="checkbox"></span>
            <span>{option.text}</span>
          </label>
        );
      })}
    </fieldset>
  );
};

export const MultiselectPuzzle: PuzzleType<any, MultiselectAnswer> = {
  id: "multiselect",
  label: "Multiple Choice (Multiple Answers)",
  View: MultiselectView,
  init: (puzzle) => ({
    answer: [],
    displayOrder: shuffle(puzzle.options.map((o: any) => o.key)),
  }),
  check: (puzzle, answer) => {
    const selected = [...answer].sort();
    const correct = [...puzzle.correct].sort();
    return JSON.stringify(selected) === JSON.stringify(correct);
  },
};
