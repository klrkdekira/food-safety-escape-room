import fs from "node:fs";
import path from "node:path";
import { buildContext, createInitialState, gameReducer } from "../src/player/gameReducer.ts";
import { getPuzzleType } from "../src/player/puzzles/index.ts";
import { step } from "../src/player/puzzles/Order.tsx";
import type { Puzzle, QuizData } from "../src/player/types.ts";

function expect(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const quiz = JSON.parse(
  fs.readFileSync(path.resolve("public/quizzes/food-kitchen.json"), "utf-8"),
) as QuizData;

function correctAnswer(puzzle: Puzzle) {
  return puzzle.type === "order" ? puzzle.correctOrder : puzzle.correct;
}

function incorrectAnswer(puzzle: Puzzle) {
  switch (puzzle.type) {
    case "mcq":
      return puzzle.options.find((option) => option.key !== puzzle.correct)?.key ?? null;
    case "multiselect":
      return [];
    case "order":
      return [...puzzle.correctOrder].reverse();
    case "match":
      return {};
  }
}

// Every puzzle type accepts its exact answer and rejects an incomplete or wrong one.
for (const puzzle of Object.values(quiz.puzzleData)) {
  const handler = getPuzzleType(puzzle.type);
  expect(handler, `Missing puzzle handler for ${puzzle.type}`);
  expect(
    handler.check(puzzle, correctAnswer(puzzle)),
    `Correct ${puzzle.type} answer was rejected`,
  );
  expect(
    !handler.check(puzzle, incorrectAnswer(puzzle)),
    `Incorrect ${puzzle.type} answer was accepted`,
  );

  const initial = handler.init(puzzle);
  expect(Array.isArray(initial.displayOrder), `${puzzle.type} did not initialize display order`);
}

// The order puzzle's keyboard controls move one step and safely no-op at either edge.
const order = ["a", "b", "c"];
expect(step(order, 1, -1).join() === "b,a,c", "Move-up did not swap adjacent order items");
expect(step(order, 1, 1).join() === "a,c,b", "Move-down did not swap adjacent order items");
expect(step(order, 0, -1) === order, "Move-up at the top should be a no-op");
expect(step(order, 2, 1) === order, "Move-down at the bottom should be a no-op");

const context = buildContext(quiz);
const reduce = gameReducer(context);
let state = createInitialState(context);
state = reduce(state, { type: "START", saved: null });
expect(state.phase === "playing" && state.currentRoom === 1, "Game did not start in room 1");
expect(state.timeElapsed === 0, "A new game retained elapsed time");

// Locked rooms cannot be entered early.
const beforeLockedRoom = state;
state = reduce(state, { type: "GO_TO_ROOM", roomNum: 2 });
expect(state === beforeLockedRoom, "A locked room was entered early");

// Wrong answers apply the configured penalty; a later correct retry gets retry credit.
const firstId = context.roomPuzzles[1][0];
const firstPuzzle = quiz.puzzleData[String(firstId)];
state = { ...state, score: 20 };
state = reduce(state, {
  type: "SET_ANSWER",
  puzzleId: firstId,
  answer: incorrectAnswer(firstPuzzle),
});
state = reduce(state, { type: "SUBMIT", puzzleId: firstId });
expect(state.score === Math.max(0, 20 - context.config.wrongPenalty), "Wrong penalty is incorrect");
expect(state.puzzleAttempts[String(firstId)] === 1, "Wrong attempt was not counted");
expect(state.results[String(firstId)]?.correct === false, "Wrong result was not recorded");

state = reduce(state, {
  type: "SET_ANSWER",
  puzzleId: firstId,
  answer: correctAnswer(firstPuzzle),
});
const scoreBeforeRetry = state.score;
state = reduce(state, { type: "SUBMIT", puzzleId: firstId });
expect(
  state.score === scoreBeforeRetry + Math.floor(firstPuzzle.points * 0.5),
  "Retry credit is incorrect",
);
expect(state.puzzlesCompleted === 1, "Correct retry did not increment completion count");
expect(state.pendingAdvance !== null, "Correct answer did not schedule advancement");
state = reduce(state, { type: "RESOLVE_ADVANCE" });
expect(
  state.activePuzzles["1"] === context.roomPuzzles[1][1],
  "Advancement did not select the next puzzle",
);

// Hints deduct points, stop at the authored cap, and never make score negative.
let hinted = { ...createInitialState(context), score: 5, maxHints: 2 };
hinted = reduce(hinted, { type: "START", saved: null });
hinted = reduce(hinted, { type: "REQUEST_HINT", puzzleId: firstId });
hinted = reduce(hinted, { type: "REQUEST_HINT", puzzleId: firstId });
const atHintCap = hinted;
hinted = reduce(hinted, { type: "REQUEST_HINT", puzzleId: firstId });
expect(hinted === atHintCap, "Hint cap allowed an extra hint");
expect(hinted.hintsUsed === 2 && hinted.score === 0, "Hint accounting is incorrect");

// A persisted game resumes progress but cannot restore stale puzzle IDs or session-only answers.
const fresh = createInitialState(context);
const resumed = reduce(fresh, {
  type: "START",
  saved: {
    currentRoom: 1,
    score: 77,
    timeElapsed: 42,
    puzzleSolved: { [String(firstId)]: true, "99999": true },
    puzzleAttempts: { [String(firstId)]: 3, "99999": 9 },
  },
});
expect(resumed.score === 77 && resumed.timeElapsed === 42, "Saved score/time did not resume");
expect(resumed.puzzleSolved[String(firstId)] === true, "Saved puzzle progress did not resume");
expect(!("99999" in resumed.puzzleSolved), "Stale saved puzzle ID was retained");
expect(
  resumed.answers[String(firstId)] === fresh.answers[String(firstId)],
  "Answers were persisted",
);

// Complete every room and prove room-code gating reaches final and victory states.
let run = reduce(createInitialState(context), { type: "START", saved: null });
for (let roomNum = 1; roomNum <= context.totalRooms; roomNum += 1) {
  expect(run.currentRoom === roomNum, `Expected to enter room ${roomNum}`);
  for (const puzzleId of context.roomPuzzles[roomNum]) {
    const puzzle = quiz.puzzleData[String(puzzleId)];
    run = reduce(run, { type: "SET_ANSWER", puzzleId, answer: correctAnswer(puzzle) });
    run = reduce(run, { type: "SUBMIT", puzzleId });
    run = reduce(run, { type: "RESOLVE_ADVANCE" });
  }
  expect(run.roomCompleted[String(roomNum)] === true, `Room ${roomNum} did not complete`);
  run = reduce(run, { type: "UNLOCK_ROOM", roomNum });
}
expect(run.phase === "final", "Last room did not lead to the final code");
run = reduce(run, { type: "WIN" });
expect(run.phase === "victory", "Final code did not lead to victory");
run = reduce(run, { type: "RESET" });
expect(run.phase === "title" && run.score === 0, "Reset did not create a fresh title state");

// SYNC_QUIZ initializes newly authored puzzles while retaining existing progress.
const editedQuiz = structuredClone(quiz);
const sourceId = context.roomPuzzles[1][0];
const newId = Math.max(...Object.keys(editedQuiz.puzzleData).map(Number)) + 1;
editedQuiz.puzzleData[String(newId)] = {
  ...structuredClone(editedQuiz.puzzleData[String(sourceId)]),
  room: 1,
};
const editedContext = buildContext(editedQuiz);
const synced = gameReducer(editedContext)(resumed, { type: "SYNC_QUIZ" });
expect(String(newId) in synced.answers, "SYNC_QUIZ did not initialize a new puzzle answer");
expect(String(newId) in synced.displayOrder, "SYNC_QUIZ did not initialize new display order");
expect(synced.puzzleSolved[String(firstId)] === true, "SYNC_QUIZ lost existing progress");

console.log("Game behavior checks passed.");
