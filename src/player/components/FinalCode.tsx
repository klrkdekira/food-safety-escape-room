import React, { useEffect, useRef, useState } from "react";
import { useGame } from "../GameContext.ts";
import { fadeIn } from "../lib/animate.ts";
import { CodePad } from "./CodePad.tsx";
import { RichText } from "./RichText.tsx";

export const FinalCode: React.FC = () => {
  const { state, dispatch, ctx } = useGame();
  const finalCode = ctx.quiz.config.finalCode ?? "";
  const screenRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "accepted" | "wrong">("idle");

  useEffect(() => {
    fadeIn(screenRef.current, { y: 20, durationMs: 500 });
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (status === "idle") return;
    const timer = setTimeout(() => {
      if (status === "accepted") dispatch({ type: "WIN" });
      else {
        setStatus("idle");
        setInput("");
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [status, dispatch]);

  const submit = () => {
    if (input === finalCode) {
      setStatus("accepted");
      dispatch({ type: "ANNOUNCE", text: "Master code accepted." });
    } else {
      setStatus("wrong");
      dispatch({ type: "ANNOUNCE", text: "Wrong code. Try again." });
    }
  };

  return (
    <div id="final-code-panel" className="screen active" ref={screenRef}>
      <div className="final-code-panel">
        <h3 id="final-escape-title">
          {ctx.quiz.config.finalEscapeTerminalTitle ?? "Final override"}
        </h3>
        {/* A div, not a <p>: authored prose may itself contain <p>, and a nested
            paragraph is invalid and gets reparented by the browser. */}
        <RichText
          id="final-escape-text"
          className="final-code-intro"
          text={ctx.quiz.config.finalEscapeTerminalText}
        />

        <div id="final-code-content">
          <div className="code-slots" id="code-slots">
            {Object.entries(ctx.quiz.roomCodes).map(([roomKey, roomCode]) => {
              const solved = Boolean(state.codes[roomKey]);
              return (
                <div className="code-slot" key={roomKey}>
                  <span className="code-slot-label">
                    {ctx.config.roomLabel} {roomKey}
                  </span>
                  <span className={`code-slot-value ${solved ? "solved" : "locked"}`}>
                    {solved ? roomCode : "???"}
                  </span>
                </div>
              );
            })}
          </div>

          <CodePad
            length={finalCode.length}
            value={input}
            onChange={setInput}
            onSubmit={submit}
            displayId="final-code-display"
            tint={
              status === "accepted" ? "var(--green)" : status === "wrong" ? "var(--red)" : undefined
            }
          />
        </div>
      </div>
    </div>
  );
};
