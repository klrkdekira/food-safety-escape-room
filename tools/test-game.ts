import fs from "node:fs";
import path from "node:path";
import { buildContext, createInitialState, gameReducer } from "../src/player/gameReducer.ts";
import { getPuzzleType } from "../src/player/puzzles/index.ts";
import type { QuizData } from "../src/player/types.ts";

function expect(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const quiz = JSON.parse(
  fs.readFileSync(path.resolve("public/quizzes/food-kitchen.json"), "utf-8"),
) as QuizData;

for (const puzzle of Object.values(quiz.puzzleData)) {
  const handler = getPuzzleType(puzzle.type);
  expect(handler, `Missing puzzle handler for ${puzzle.type}`);
  const correct =
    puzzle.type === "order"
      ? puzzle.correctOrder
      : puzzle.type === "match" || puzzle.type === "multiselect"
        ? puzzle.correct
        : puzzle.correct;
  expect(handler.check(puzzle, correct), `Correct ${puzzle.type} answer was rejected`);
}

const context = buildContext(quiz);
const reduce = gameReducer(context);
let state = createInitialState(context);
state = reduce(state, { type: "START", saved: null });
expect(state.phase === "playing" && state.currentRoom === 1, "Game did not start in room 1");

const firstId = context.roomPuzzles[1][0];
const firstPuzzle = quiz.puzzleData[String(firstId)];
const correctAnswer =
  firstPuzzle.type === "order"
    ? firstPuzzle.correctOrder
    : firstPuzzle.type === "match" || firstPuzzle.type === "multiselect"
      ? firstPuzzle.correct
      : firstPuzzle.correct;
state = reduce(state, { type: "SET_ANSWER", puzzleId: firstId, answer: correctAnswer });
state = reduce(state, { type: "SUBMIT", puzzleId: firstId });
