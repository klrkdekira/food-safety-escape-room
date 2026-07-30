import React, { useEffect, useState } from "react";
import { createRoute } from "@tanstack/react-router";
import { Game } from "../player/Game.tsx";
import type { QuizData } from "../player/types.ts";
import { rootRoute } from "./root.tsx";

export const previewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "preview",
  component: Preview,
});

/**
 * The author studio's live preview target, loaded in an iframe so the studio's
 * layout and the game's full-viewport styling stay out of each other's way.
 */
function Preview() {
  const [quiz, setQuiz] = useState<QuizData | null>(null);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin && e.origin !== "null" && e.origin !== "") return;
      if (e.data?.type === "UPDATE_QUIZ_DATA" && e.data.data) {
        setQuiz(e.data.data as QuizData);
      }
    };

    window.addEventListener("message", onMessage);
    // The studio may have posted its draft before this frame finished loading, so
    // ask for a resend rather than sitting blank until the next keystroke.
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "PREVIEW_READY" }, "*");
    }
    return () => window.removeEventListener("message", onMessage);
  }, []);

  if (!quiz) {
    return (
      <div style={{ padding: "24px", color: "var(--text-dim)", fontSize: "13px" }}>
        Waiting for quiz data from the studio...
      </div>
    );
  }

  return <Game quiz={quiz} quizId="preview" preview />;
}
