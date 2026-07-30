import React from "react";
import { createRoute } from "@tanstack/react-router";
import type { SearchSchemaInput } from "@tanstack/react-router";
import { fetchQuiz, fetchQuizIndex } from "../lib/quizFetch.ts";
import { Game } from "../player/Game.tsx";
import { rootRoute } from "./root.tsx";

/**
 * Accepts `?debug=1` and `?debug=true`, as the pre-router build did.
 *
 * The numeric case is not redundant: the router JSON-parses search values, so
 * `?debug=1` arrives as the number 1 rather than the string "1". Comparing only
 * against strings silently disabled the flag.
 */
function asFlag(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

export const playRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "play/$quizId",
  // Both flags are optional on the way in, so a plain <Link to="/play/$quizId">
  // needs no search object; they are always defined on the way out.
  validateSearch: (
    search: {
      debug?: string | boolean | number;
      instructor?: string | boolean | number;
    } & SearchSchemaInput,
  ) => ({
    debug: asFlag(search.debug),
    instructor: asFlag(search.instructor),
  }),
  loader: async ({ params }) => {
    const [quiz, quizzes] = await Promise.all([fetchQuiz(params.quizId), fetchQuizIndex()]);
    return { quiz, quizzes };
  },
  component: Play,
});

function Play() {
  const { quiz, quizzes } = playRoute.useLoaderData();
  const { quizId } = playRoute.useParams();
  const { debug, instructor } = playRoute.useSearch();

  // Keyed on the quiz so switching missions starts a genuinely new game rather
  // than carrying one quiz's score and solved set into another.
  return (
    <Game
      key={quizId}
      quiz={quiz}
      quizId={quizId}
      quizzes={quizzes}
      debug={debug}
      instructor={instructor}
    />
  );
}
