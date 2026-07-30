import React from "react";
import { createRoute, Link, redirect } from "@tanstack/react-router";
import type { SearchSchemaInput } from "@tanstack/react-router";
import { fetchQuizIndex } from "../lib/quizFetch.ts";
import { rootRoute } from "./root.tsx";

export const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  // SearchSchemaInput keeps the *input* type optional, so `<Link to="/">` does not
  // have to pass a search object just because the route validates one.
  validateSearch: (search: { quiz?: string } & SearchSchemaInput) => ({
    quiz: typeof search.quiz === "string" ? search.quiz : undefined,
  }),
  beforeLoad: ({ search }) => {
    // Links handed out before the router existed look like `/?quiz=microb`.
    if (search.quiz) {
      throw redirect({ to: "/play/$quizId", params: { quizId: search.quiz } });
    }
  },
  loader: () => fetchQuizIndex(),
  component: Home,
});

function Home() {
  const quizzes = homeRoute.useLoaderData();

  return (
    <div id="title-screen" className="screen active">
      <div className="title-sub">Escape room platform</div>
      <div className="title-logo">Pick a room</div>
      <div className="title-divider"></div>

      {quizzes.length === 0 ? (
        <div className="title-instructions">
          <strong>No rooms found</strong>
          Add a quiz JSON file to <code>public/quizzes/</code> and rebuild the manifest.
        </div>
      ) : (
        <div className="quiz-list">
          {quizzes.map((quiz) => (
            <Link
              to="/play/$quizId"
              params={{ quizId: quiz.id }}
              key={quiz.id}
              className="quiz-card"
            >
              <div className="quiz-card-title">{quiz.titleLogo || quiz.pageTitle}</div>
              <div className="quiz-card-sub">{quiz.titleSub}</div>
            </Link>
          ))}
        </div>
      )}

      <div className="title-actions">
        <Link to="/editor" className="btn-secondary">
          Authoring studio
        </Link>
      </div>
    </div>
  );
}
