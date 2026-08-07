import React, { useEffect, useMemo, useReducer } from "react";
import { GameContextProvider } from "./GameContext.ts";
import type { GameContextValue } from "./GameContext.ts";
import { buildContext, createInitialState, gameReducer } from "./gameReducer.ts";
import { formatTime } from "./lib/quiz.ts";
import { recordBestScore } from "./lib/storage.ts";
import { BackgroundMusic } from "./components/BackgroundMusic.tsx";
import { FinalCode } from "./components/FinalCode.tsx";
import { Hud } from "./components/Hud.tsx";
import { LiveRegion } from "./components/LiveRegion.tsx";
import { Minimap } from "./components/Minimap.tsx";
import { Overlays } from "./components/Overlays.tsx";
import { Room } from "./components/Room.tsx";
import { TitleScreen } from "./components/TitleScreen.tsx";
import { Victory } from "./components/Victory.tsx";
import type { QuizData, QuizManifestItem } from "./types.ts";

export interface GameProps {
  quiz: QuizData;
  quizId: string;
  /** Feeds the title screen's quiz switcher; empty in the studio preview. */
  quizzes?: QuizManifestItem[];
  /** `?debug=1`: reveals the room-skip control. */
  debug?: boolean;
  /** `?instructor=1`: logs the answer key to the console. */
  instructor?: boolean;
  /** Rendered inside the author studio; suppresses saving and best scores. */
  preview?: boolean;
}

export const Game: React.FC<GameProps> = ({
  quiz,
  quizId,
  quizzes = [],
  debug = false,
  instructor = false,
  preview = false,
}) => {
  const ctx = useMemo(() => buildContext(quiz), [quiz]);
  const reducer = useMemo(() => gameReducer(ctx), [ctx]);
  const [state, dispatch] = useReducer(reducer, ctx, createInitialState);

  // The studio edits quiz data live. Reconcile rather than remount, so an author
  // testing room 3 is not thrown back to the title screen on every keystroke.
  useEffect(() => {
    dispatch({ type: "SYNC_QUIZ" });
  }, [ctx]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", quiz.config.theme || "cyberpunk");
  }, [quiz.config.theme]);

  useEffect(() => {
    document.title = quiz.config.pageTitle;
  }, [quiz.config.pageTitle]);

  useEffect(() => {
    if (!debug) return;
    (window as any).__gameDispatch = dispatch;
    (window as any).__gameCtx = ctx;
  }, [debug, dispatch, ctx]);

  useEffect(() => {
    if (state.phase !== "playing" && state.phase !== "final") return;
    const timer = setInterval(() => dispatch({ type: "TICK" }), 1000);
    return () => clearInterval(timer);
  }, [state.phase]);

  // A correct answer hands over to the next puzzle after a beat. Owning the timer
  // here means unmounting mid-delay cancels it instead of firing into a dead tree.
  useEffect(() => {
    const pending = state.pendingAdvance;
    if (!pending) return;
    const timer = setTimeout(() => dispatch({ type: "RESOLVE_ADVANCE" }), pending.delayMs);
    return () => clearTimeout(timer);
  }, [state.pendingAdvance]);

  useEffect(() => {
    if (state.phase !== "victory" || preview) return;
    recordBestScore(quizId, state.score, formatTime(state.timeElapsed));
  }, [state.phase, preview, quizId, state.score, state.timeElapsed]);

  useEffect(() => {
    if (!instructor) return;
    console.group("Instructor Mode - Answer Key");
    for (const [id, puzzle] of Object.entries(ctx.quiz.puzzleData)) {
      const answer =
        "correct" in puzzle
          ? puzzle.correct
          : "correctOrder" in puzzle
            ? puzzle.correctOrder
            : "N/A";
      console.log(`[${id}] (${puzzle.type}) ${puzzle.title} =>`, answer);
    }
    console.groupEnd();
  }, [instructor, ctx]);

  const value: GameContextValue = { state, dispatch, ctx, quizId, debug, preview };
  const inPlay = state.phase === "playing" || state.phase === "final";

  return (
    <GameContextProvider value={value}>
      <BackgroundMusic />
      <Overlays />
      <LiveRegion announcement={state.announcement} />

      {state.phase === "title" && <TitleScreen quizzes={quizzes} />}

      {inPlay && (
        <>
          <Minimap />
          <Hud />
          <div id="game-container">{state.phase === "playing" ? <Room /> : <FinalCode />}</div>
        </>
      )}

      {state.phase === "victory" && <Victory />}

      {quiz.config.version && (
        <div id="version-display" className="version-display">
          {quiz.config.version}
        </div>
      )}
    </GameContextProvider>
  );
};
