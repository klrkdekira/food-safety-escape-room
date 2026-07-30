import React, { useEffect, useRef, useState } from "react";
import { useGame } from "../GameContext.ts";
import { fadeIn } from "../lib/animate.ts";
import { HINT_COST } from "../lib/quiz.ts";
import { CodePad } from "./CodePad.tsx";
import { PuzzlePanel } from "./PuzzlePanel.tsx";
import { RichText } from "./RichText.tsx";

export const Room: React.FC = () => {
  const { state, dispatch, ctx } = useGame();
  const roomNum = state.currentRoom;
  const roomData = ctx.quiz.roomData[String(roomNum)];
  const puzzleIds = ctx.roomPuzzles[roomNum] ?? [];
  const completed = Boolean(state.roomCompleted[String(roomNum)]);
  const unlocked = Boolean(state.codes[String(roomNum)]);
  const activeId = state.activePuzzles[String(roomNum)];
  const hint = state.hints[String(roomNum)];

  const screenRef = useRef<HTMLDivElement>(null);
  const [code, setCode] = useState("");
  const [wrong, setWrong] = useState(false);

  useEffect(() => {
    fadeIn(screenRef.current, { y: 20, durationMs: 500 });
    window.scrollTo(0, 0);
    setCode("");
    setWrong(false);
  }, [roomNum]);

  useEffect(() => {
    if (!wrong) return;
    const timer = setTimeout(() => {
      setWrong(false);
      setCode("");
    }, 1500);
    return () => clearTimeout(timer);
  }, [wrong]);

  if (!roomData) return null;

  const submitCode = () => {
    if (code === ctx.quiz.roomCodes[String(roomNum)]) {
      dispatch({ type: "UNLOCK_ROOM", roomNum });
    } else {
      setWrong(true);
      dispatch({ type: "ANNOUNCE", text: "Wrong code. Try again." });
    }
  };

  const hintExhausted = state.hintsUsed >= state.maxHints;

  return (
    <div id={`room${roomNum}`} className="screen active" ref={screenRef}>
      <div className="room-header">
        <div className="room-number">{roomData.number}</div>
        <div className="room-title">{roomData.title}</div>
        <div className="room-subtitle">{roomData.subtitle}</div>
      </div>

      {roomData.imageUrl && (
        <div className="room-artwork">
          <img src={roomData.imageUrl} alt={roomData.title} className="room-image" />
          {roomData.imageAttribution && (
            <div className="room-image-attribution">{roomData.imageAttribution}</div>
          )}
        </div>
      )}

      <RichText className="narrative-box" text={roomData.narrative} />

      <div id={`room${roomNum}-puzzles`}>
        {!completed && activeId != null && (
          <>
            <PuzzlePanel
              id={activeId}
              index={puzzleIds.indexOf(activeId)}
              total={puzzleIds.length}
            />
            <button
              type="button"
              className="request-hint-btn"
              disabled={hintExhausted || Boolean(hint)}
              onClick={() => dispatch({ type: "REQUEST_HINT", puzzleId: activeId })}
            >
              Reveal a hint (-{HINT_COST} pts)
            </button>
          </>
        )}

        {hint && (
          <div aria-live="polite">
            <div className="hint-panel">
              <div className="hint-label">
                Hint {hint.ordinal} of {state.maxHints}
              </div>
              <RichText text={hint.text} />
            </div>
          </div>
        )}

        {completed && (
          <div className="code-entry" id={`code-entry-${roomNum}`}>
            <div className="code-hint">{roomData.codeHint ?? ""}</div>

            {unlocked ? (
              // Revisited via the minimap after the code was accepted: show it
              // rather than making the player type it again.
              <div className="code-display solved" id={`code-display-${roomNum}`}>
                {ctx.quiz.roomCodes[String(roomNum)]}
              </div>
            ) : (
              <CodePad
                length={(ctx.quiz.roomCodes[String(roomNum)] ?? "").length}
                value={code}
                onChange={setCode}
                onSubmit={submitCode}
                displayId={`code-display-${roomNum}`}
                message={wrong ? "Wrong code" : undefined}
                tint={wrong ? "var(--red)" : undefined}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
