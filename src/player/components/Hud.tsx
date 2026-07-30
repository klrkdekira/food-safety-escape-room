import React, { useEffect, useState } from "react";
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
      {/* Identity on the left, metrics on the right. A lone "Score 0" pinned to
          the far edge left the bar looking unbalanced and told the player nothing
          about where they were. */}
      <div className="hud-group hud-identity">{ctx.quiz.config.titleLogo}</div>

      <div className="hud-group">
        <div className="hud-item">
          <span className="hud-label">Score</span>
          <span className="hud-value" id="hud-score">
            {state.score}
          </span>
        </div>
        <div className="hud-item">
          <span className="hud-label">Room</span>
          <span className="hud-value" id="hud-room">
            {state.currentRoom}
          </span>
        </div>
        <div className="hud-item">
          <span className="hud-label">Time</span>
          <span className="hud-value" id="hud-time">
            {formatTime(state.timeElapsed)}
          </span>
        </div>
        <div className="hud-item">
          <span className="hud-label">Solved</span>
          <span className="hud-value" id="hud-puzzles">
            {state.puzzlesCompleted}/{ctx.totalPuzzles}
          </span>
        </div>
      </div>

      <div id="hud-buttons">
        {debug && (
          <button
            type="button"
            className="hud-btn btn-danger"
            onClick={() => dispatch({ type: "DEBUG_NEXT" })}
          >
            Dev next
          </button>
        )}
        <button
          type="button"
          className="hud-btn"
          disabled={activePuzzleId == null || state.hintsUsed >= state.maxHints}
          onClick={() => {
            if (activePuzzleId != null) {
              dispatch({ type: "REQUEST_HINT", puzzleId: activePuzzleId });
            }
          }}
        >
          Hint
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
          <button type="button" className="hud-btn" onClick={onSave}>
            {saved ? "Saved" : "Save"}
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
