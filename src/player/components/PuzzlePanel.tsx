import React, { useEffect, useState } from "react";
import { useGame } from "../GameContext.ts";
import { playSound } from "../lib/sound.ts";
import { getPuzzleType } from "../puzzles/index.ts";
import { RichText } from "./RichText.tsx";

interface PuzzlePanelProps {
  id: number;
  /** Position within the room, for the "PUZZLE 2 OF 5" label. */
  index: number;
  total: number;
}

export const PuzzlePanel: React.FC<PuzzlePanelProps> = ({ id, index, total }) => {
  const { state, dispatch, ctx } = useGame();
  const puzzle = ctx.quiz.puzzleData[String(id)];
  const result = state.results[String(id)];
  const solved = Boolean(state.puzzleSolved[String(id)]);
  const [shake, setShake] = useState(false);

  // One effect per submission, keyed on the attempt counter so two identical
  // wrong answers in a row both blip and both shake.
  useEffect(() => {
    if (!result) return;
    if (state.soundEnabled) playSound(result.correct ? "correct" : "incorrect");
    if (result.correct) return;
    setShake(true);
    const timer = setTimeout(() => setShake(false), 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.seq]);

  if (!puzzle) return null;
  const handler = getPuzzleType(puzzle.type);

  const panelClass = [
    "puzzle-panel",
    "active-page",
    solved && result?.correct ? "correct" : "",
    shake ? "incorrect" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={panelClass} id={`p${id}`}>
      <div className="puzzle-label">
        <span className="puzzle-index">
          {index + 1} / {total}
        </span>
        <span className="puzzle-label-sep" aria-hidden="true" />
        <span className="puzzle-title">{puzzle.title}</span>
        {/* Padlock, closed while unsolved. It swings open on `.correct` purely
            through the stroke colour, so no second icon is needed. */}
        <svg
          className="puzzle-lock"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      </div>
      <RichText className="puzzle-question" text={puzzle.question} />

      {handler && (
        <handler.View
          id={id}
          puzzle={puzzle}
          answer={state.answers[String(id)]}
          displayOrder={state.displayOrder[String(id)] ?? []}
          disabled={solved}
          onChange={(answer) => dispatch({ type: "SET_ANSWER", puzzleId: id, answer })}
        />
      )}

      <div className="puzzle-input-area">
        <div className="puzzle-actions">
          <button
            type="button"
            className="btn-primary"
            disabled={solved}
            onClick={() => dispatch({ type: "SUBMIT", puzzleId: id })}
          >
            Submit answer
          </button>
        </div>

        {result && (
          <div
            className={`puzzle-result ${result.correct ? "correct" : "incorrect"}`}
            id={`result-${id}`}
          >
            {result.correct ? (
              <>
                <div className="puzzle-result-headline">Correct — +{result.points} points</div>
                {/* The explanation is the teaching moment, so it is set as body
                    copy rather than tinted to match the banner. */}
                {result.explanation && <RichText text={result.explanation} />}
              </>
            ) : (
              <div className="puzzle-result-headline">
                {result.penalty > 0
                  ? `Not quite — try again (-${result.penalty} pts)`
                  : "Not quite — try again"}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
