import React, { useEffect, useState } from "react";
import { CircleCheckIcon, LockIcon, LockOpenIcon, SparklesIcon } from "lucide-animated";
import { useGame } from "../GameContext.ts";
import { playSound } from "../lib/sound.ts";
import { getPuzzleType } from "../puzzles/index.ts";
import { RichText } from "./RichText.tsx";

interface PuzzlePanelProps {
  id: number;
  /** Position within the room, for the "PUZZLE 2 OF 5" label. */
  index: number;
  total: number;
  onSolved?: () => void;
}

export const PuzzlePanel: React.FC<PuzzlePanelProps> = ({ id, index, total, onSolved }) => {
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
    if (result.correct) {
      if (onSolved) onSolved();
      return;
    }
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
      <div className="puzzle-label flex-btn">
        <span className="puzzle-index">
          {index + 1} / {total}
        </span>
        <span className="puzzle-label-sep" aria-hidden="true" />
        <span className="puzzle-title">{puzzle.title}</span>
        {solved ? (
          <LockOpenIcon
            size={18}
            className="puzzle-lock"
            style={{ color: "var(--green, #10b981)" }}
          />
        ) : (
          <LockIcon size={18} className="puzzle-lock" />
        )}
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
            className="btn-primary flex-btn"
            disabled={solved}
            onClick={() => dispatch({ type: "SUBMIT", puzzleId: id })}
          >
            {solved ? (
              <>
                <CircleCheckIcon size={16} />
                <span>Solved</span>
              </>
            ) : (
              <>
                <SparklesIcon size={16} />
                <span>Submit answer</span>
              </>
            )}
          </button>
        </div>

        {result && (
          <div
            className={`puzzle-result ${result.correct ? "correct" : "incorrect"}`}
            id={`result-${id}`}
          >
            {result.correct ? (
              <>
                <div className="puzzle-result-headline flex-btn">
                  <CircleCheckIcon size={18} style={{ color: "var(--green, #10b981)" }} />
                  <span>Correct — +{result.points} points</span>
                </div>
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
