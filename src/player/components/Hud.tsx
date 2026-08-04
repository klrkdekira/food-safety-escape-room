import React, { useEffect, useState } from "react";
import { CircleCheckIcon, ClockIcon, FlameIcon, KeyIcon, ShieldCheckIcon } from "lucide-animated";
import { Lightbulb } from "lucide-react";
import { useGame } from "../GameContext.ts";
import { formatTime } from "../lib/quiz.ts";
import { saveState } from "../lib/storage.ts";

export const Hud: React.FC = () => {
  const { state, dispatch, ctx, quizId, debug, preview } = useGame();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 1500);
    return () => clearTimeout(timer);
  }, [saved]);

  const pct = ctx.totalPuzzles ? Math.floor((state.puzzlesCompleted / ctx.totalPuzzles) * 100) : 0;
  const activePuzzleId = state.activePuzzles[String(state.currentRoom)];

  const onSave = () => {
    saveState(quizId, state);
    dispatch({ type: "ANNOUNCE", text: "Progress saved." });
    setSaved(true);
  };

  return (
    <div id="hud" className="visible">
      {/* Identity on the left, metrics on the right */}
      <div className="hud-group hud-identity">{ctx.quiz.config.titleLogo}</div>

      <div className="hud-group">
        <div className="hud-item">
          <span className="hud-label">
            <ShieldCheckIcon size={14} className="hud-icon" /> Score
          </span>
          <span className="hud-value" id="hud-score">
            {state.score}
          </span>
        </div>
        <div className="hud-item">
          <span className="hud-label">
            <KeyIcon size={14} className="hud-icon" /> Room
          </span>
          <span className="hud-value" id="hud-room">
            {state.currentRoom}
          </span>
        </div>
        <div className="hud-item">
          <span className="hud-label">
            <ClockIcon size={14} className="hud-icon" /> Time
          </span>
          <span className="hud-value" id="hud-time">
            {formatTime(state.timeElapsed)}
          </span>
        </div>
        <div className="hud-item">
          <span className="hud-label">
            <CircleCheckIcon size={14} className="hud-icon" /> Solved
          </span>
          <span className="hud-value" id="hud-puzzles">
            {state.puzzlesCompleted}/{ctx.totalPuzzles}
          </span>
        </div>
      </div>

      <div id="hud-buttons">
        {debug && (
          <button
            type="button"
            className="hud-btn btn-danger flex-btn"
            onClick={() => dispatch({ type: "DEBUG_NEXT" })}
          >
            <FlameIcon size={14} />
            <span>Dev next</span>
          </button>
        )}
        <button
          type="button"
          className="hud-btn flex-btn"
          disabled={activePuzzleId == null || state.hintsUsed >= state.maxHints}
          onClick={() => {
            if (activePuzzleId != null) {
              dispatch({ type: "REQUEST_HINT", puzzleId: activePuzzleId });
            }
          }}
        >
          <Lightbulb size={14} />
          <span>Hint</span>
        </button>
        <button
          type="button"
          className="hud-btn"
          onClick={() => dispatch({ type: "TOGGLE_SOUND" })}
        >
          {state.soundEnabled ? "Sound on" : "Sound off"}
        </button>
        {/* Saving into the studio preview would overwrite the real player's
            progress for this quiz id, so the control is hidden there. */}
        {!preview && (
          <button type="button" className="hud-btn flex-btn" onClick={onSave}>
            <CircleCheckIcon size={14} />
            <span>{saved ? "Saved" : "Save"}</span>
          </button>
        )}
      </div>

      {/* Sits on the bar's bottom edge as a 2px rule, so overall progress is
          always visible without occupying a slot in the layout. */}
      <div className="progress-bar-container">
        <div className="progress-bar-fill" id="progress-bar" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};
