import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildContext, createInitialState, gameReducer } from "../src/player/gameReducer.ts";
import { formatTime, maxScore, readEngineConfig, resolveRank } from "../src/player/lib/quiz.ts";
import { MatchPuzzle } from "../src/player/puzzles/Match.tsx";
import { McqPuzzle } from "../src/player/puzzles/Mcq.tsx";
import { MultiselectPuzzle } from "../src/player/puzzles/Multiselect.tsx";
import { OrderPuzzle, step } from "../src/player/puzzles/Order.tsx";
import { getPuzzleType } from "../src/player/puzzles/index.ts";
import type { Puzzle, QuizData } from "../src/player/types.ts";
import { editorReducer, DEFAULT_TEMPLATE } from "../src/editor/store.ts";
import { QuizSchema } from "../src/schema/quiz.ts";

function expect(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`❌ E2E Assertion Failed: ${message}`);
  }
}

console.log("🚀 Starting End-to-End (E2E) Test Suite...");

// ============================================================================
// 1. GAME ENGINE & FULL PLAYTHROUGH FLOW
// ============================================================================
console.log("▶ Testing Full Game Playthrough Flow...");

const foodKitchenQuiz = JSON.parse(
  fs.readFileSync(path.resolve("public/quizzes/food-kitchen.json"), "utf-8"),
) as QuizData;

// Validate default quiz schema
const validation = QuizSchema.safeParse(foodKitchenQuiz);
expect(validation.success, "public/quizzes/food-kitchen.json failed schema validation");

const context = buildContext(foodKitchenQuiz);
const reduce = gameReducer(context);

// 1.1 Initial state check
let state = createInitialState(context);
expect(state.phase === "title", "Initial phase must be 'title'");
expect(state.score === 0, "Initial score must be 0");
expect(state.timeElapsed === 0, "Initial time elapsed must be 0");
expect(state.currentRoom === 1, "Initial room must be 1");

// 1.2 Start Game
state = reduce(state, { type: "START", saved: null });
expect(state.phase === "playing", "Phase after START must be 'playing'");
expect(state.currentRoom === 1, "Game must start in room 1");

// 1.3 Puzzle verification & interaction logic across all puzzle types in Room 1
const room1PuzzleIds = context.roomPuzzles[1];
expect(room1PuzzleIds.length > 0, "Room 1 must contain puzzles");

for (const puzzleId of room1PuzzleIds) {
  const puzzle = foodKitchenQuiz.puzzleData[String(puzzleId)];
  const handler = getPuzzleType(puzzle.type);
  expect(handler !== undefined, `Handler for puzzle type '${puzzle.type}' missing`);

  // Verify puzzle initialization
  const init = handler.init(puzzle);
  expect(Array.isArray(init.displayOrder), `${puzzle.type} initialization missing display order`);

  // Verify answer checking logic
  if (puzzle.type === "mcq") {
    expect(handler.check(puzzle, puzzle.correct), "MCQ correct answer rejected");
    const wrongOpt = puzzle.options.find((o) => o.key !== puzzle.correct)?.key;
    expect(!handler.check(puzzle, wrongOpt), "MCQ wrong answer accepted");
  } else if (puzzle.type === "multiselect") {
    expect(handler.check(puzzle, puzzle.correct), "Multiselect correct answer rejected");
    expect(!handler.check(puzzle, []), "Multiselect empty answer accepted");
  } else if (puzzle.type === "order") {
    expect(handler.check(puzzle, puzzle.correctOrder), "Order correct answer rejected");
    expect(
      !handler.check(puzzle, [...puzzle.correctOrder].reverse()),
      "Order reversed answer accepted",
    );
  } else if (puzzle.type === "match") {
    expect(handler.check(puzzle, puzzle.correct), "Match correct answer rejected");
    expect(!handler.check(puzzle, {}), "Match empty answer accepted");
  }
}

// 1.4 Interactive re-ordering keyboard control helper test (Order Puzzle)
const orderList = ["alpha", "beta", "gamma"];
expect(step(orderList, 1, -1).join() === "beta,alpha,gamma", "Order move-up failed");
expect(step(orderList, 1, 1).join() === "alpha,gamma,beta", "Order move-down failed");
expect(step(orderList, 0, -1) === orderList, "Order move-up at top boundary should no-op");
expect(step(orderList, 2, 1) === orderList, "Order move-down at bottom boundary should no-op");

// 1.5 Incorrect answer penalty & retry credit flow
const firstPuzzleId = room1PuzzleIds[0];
const firstPuzzle = foodKitchenQuiz.puzzleData[String(firstPuzzleId)];
let wrongAns: unknown;
if (firstPuzzle.type === "mcq")
  wrongAns = firstPuzzle.options.find((o) => o.key !== firstPuzzle.correct)?.key;
else if (firstPuzzle.type === "multiselect") wrongAns = [];
else if (firstPuzzle.type === "order") wrongAns = [...firstPuzzle.correctOrder].reverse();
else if (firstPuzzle.type === "match") wrongAns = {};

state = { ...state, score: 50 };
state = reduce(state, { type: "SET_ANSWER", puzzleId: firstPuzzleId, answer: wrongAns as any });
state = reduce(state, { type: "SUBMIT", puzzleId: firstPuzzleId });
expect(state.puzzleAttempts[String(firstPuzzleId)] === 1, "Attempt count was not incremented");
expect(
  state.results[String(firstPuzzleId)]?.correct === false,
  "Incorrect result was not recorded",
);
expect(
  state.score === Math.max(0, 50 - context.config.wrongPenalty),
  "Penalty calculation incorrect",
);

// Retry with correct answer
let correctAns: unknown;
if (firstPuzzle.type === "mcq") correctAns = firstPuzzle.correct;
else if (firstPuzzle.type === "multiselect") correctAns = firstPuzzle.correct;
else if (firstPuzzle.type === "order") correctAns = firstPuzzle.correctOrder;
else if (firstPuzzle.type === "match") correctAns = firstPuzzle.correct;

const scoreBeforeRetry = state.score;
state = reduce(state, { type: "SET_ANSWER", puzzleId: firstPuzzleId, answer: correctAns as any });
state = reduce(state, { type: "SUBMIT", puzzleId: firstPuzzleId });
expect(
  state.score === scoreBeforeRetry + Math.floor(firstPuzzle.points * 0.5),
  "Retry credit calculation incorrect",
);
expect(state.puzzlesCompleted === 1, "Puzzles completed count not incremented");
expect(state.pendingAdvance !== null, "Pending advance not set after correct answer");

state = reduce(state, { type: "RESOLVE_ADVANCE" });

// 1.6 Hint System & Non-negative Score Safeguard
let hintState = createInitialState(context);
hintState = reduce(hintState, { type: "START", saved: null });
hintState = { ...hintState, score: 5, maxHints: 2 };
hintState = reduce(hintState, { type: "REQUEST_HINT", puzzleId: firstPuzzleId });
expect(hintState.hintsUsed === 1, "Hints used count not updated");
expect(hintState.score === 0, "Hint cost must not make score negative");

hintState = reduce(hintState, { type: "REQUEST_HINT", puzzleId: firstPuzzleId });
expect(hintState.hintsUsed === 2, "Second hint count not updated");
const atMaxHintsState = hintState;
hintState = reduce(hintState, { type: "REQUEST_HINT", puzzleId: firstPuzzleId });
expect(hintState === atMaxHintsState, "Hint request beyond maxHints cap must no-op");

// 1.7 Room locked access guard & full walkthrough completion
let runState = createInitialState(context);
runState = reduce(runState, { type: "START", saved: null });

// Locked room access check
const lockedStateBefore = runState;
runState = reduce(runState, { type: "GO_TO_ROOM", roomNum: 2 });
expect(runState === lockedStateBefore, "Locked room 2 was entered prematurely");

// Solve all rooms step by step
for (let r = 1; r <= context.totalRooms; r++) {
  expect(runState.currentRoom === r, `Expected to be in room ${r}`);
  for (const pId of context.roomPuzzles[r]) {
    const p = foodKitchenQuiz.puzzleData[String(pId)];
    let ans: unknown;
    if (p.type === "mcq") ans = p.correct;
    else if (p.type === "multiselect") ans = p.correct;
    else if (p.type === "order") ans = p.correctOrder;
    else if (p.type === "match") ans = p.correct;

    runState = reduce(runState, { type: "SET_ANSWER", puzzleId: pId, answer: ans as any });
    runState = reduce(runState, { type: "SUBMIT", puzzleId: pId });
    runState = reduce(runState, { type: "RESOLVE_ADVANCE" });
  }
  expect(runState.roomCompleted[String(r)] === true, `Room ${r} should be marked completed`);
  runState = reduce(runState, { type: "UNLOCK_ROOM", roomNum: r });
}

// 1.8 Final Escape Code & Victory Phase
expect(runState.phase === "final", "Completing all rooms must transition to 'final' phase");
runState = reduce(runState, { type: "WIN" });
expect(runState.phase === "victory", "WIN action must transition to 'victory' phase");

// Verify rank & time formatting helpers
const maxPossible = maxScore(foodKitchenQuiz);
const engineCfg = readEngineConfig(foodKitchenQuiz);
expect(engineCfg.rankMode !== undefined, "readEngineConfig returned invalid config");
const computedRank = resolveRank(context.config, runState.score, maxPossible);
expect(
  typeof computedRank === "string" && computedRank.length >= 1,
  "Rank calculation returned invalid value",
);
expect(formatTime(125) === "02:05", "Time formatting helper failed");

// Reset game back to title
runState = reduce(runState, { type: "RESET" });
expect(
  runState.phase === "title" && runState.score === 0,
  "RESET action failed to return to fresh title state",
);

console.log("  ✔ Full Game Playthrough Flow passed!");

// ============================================================================
// 2. SAVED STATE RESILIENCY & STALE ID SANITIZATION
// ============================================================================
console.log("▶ Testing Saved State Resiliency & Stale ID Sanitization...");

const freshState = createInitialState(context);
const resumedState = reduce(freshState, {
  type: "START",
  saved: {
    currentRoom: 1,
    score: 150,
    timeElapsed: 88,
    puzzleSolved: { [String(firstPuzzleId)]: true, "99999": true },
    puzzleAttempts: { [String(firstPuzzleId)]: 2, "99999": 10 },
  },
});

expect(
  resumedState.score === 150 && resumedState.timeElapsed === 88,
  "Saved score and time failed to resume",
);
expect(
  resumedState.puzzleSolved[String(firstPuzzleId)] === true,
  "Valid saved puzzle progress lost",
);
expect(!("99999" in resumedState.puzzleSolved), "Stale puzzle ID '99999' was retained");
expect(!("99999" in resumedState.puzzleAttempts), "Stale puzzle attempts '99999' was retained");

console.log("  ✔ Saved State Resiliency passed!");

// ============================================================================
// 3. AUTHORING STUDIO & EDITOR STORE REDUCER
// ============================================================================
console.log("▶ Testing Authoring Studio & Editor Store Reducer...");

let editorState = structuredClone(DEFAULT_TEMPLATE);

// 3.1 UPDATE_CONFIG
editorState =
  editorReducer(editorState, {
    type: "UPDATE_CONFIG",
    field: "pageTitle",
    value: "Updated Title",
  }) || editorState;
expect(editorState.config.pageTitle === "Updated Title", "UPDATE_CONFIG failed");

// 3.2 ADD_ROOM & UPDATE_ROOM
editorState = editorReducer(editorState, { type: "ADD_ROOM", roomKey: "3" }) || editorState;
expect(editorState.roomData["3"] !== undefined, "ADD_ROOM failed to add room 3");
expect(editorState.roomCodes["3"] === "CODE3", "ADD_ROOM failed to generate default code");
expect(editorState.config.minimapRooms.length === 3, "ADD_ROOM failed to update minimapRooms");

editorState =
  editorReducer(editorState, {
    type: "UPDATE_ROOM",
    roomKey: "3",
    field: "title",
    value: "ZONE 3: RECTIFIER",
  }) || editorState;
expect(editorState.roomData["3"].title === "ZONE 3: RECTIFIER", "UPDATE_ROOM failed");

// 3.3 UPDATE_ROOM_CODE
editorState =
  editorReducer(editorState, {
    type: "UPDATE_ROOM_CODE",
    roomKey: "3",
    code: "gamma3",
  }) || editorState;
expect(editorState.roomCodes["3"] === "GAMMA3", "UPDATE_ROOM_CODE failed to uppercase code");

// 3.4 ADD_PUZZLE, UPDATE_PUZZLE, REMOVE_PUZZLE
const newPuzzle: Puzzle = {
  type: "mcq",
  room: 3,
  points: 120,
  title: "ZONE 3 TEST",
  question: "What is the critical limit?",
  bloomLevel: "remember",
  options: [
    { key: "A", text: "4°C or below" },
    { key: "B", text: "20°C" },
  ],
  correct: "A",
};

editorState =
  editorReducer(editorState, {
    type: "ADD_PUZZLE",
    puzzleId: "3",
    puzzle: newPuzzle,
  }) || editorState;
expect(editorState.puzzleData["3"] !== undefined, "ADD_PUZZLE failed");

editorState =
  editorReducer(editorState, {
    type: "UPDATE_PUZZLE",
    puzzleId: "3",
    puzzle: { ...newPuzzle, points: 150 },
  }) || editorState;
expect(editorState.puzzleData["3"].points === 150, "UPDATE_PUZZLE failed");

editorState =
  editorReducer(editorState, {
    type: "REMOVE_PUZZLE",
    puzzleId: "3",
  }) || editorState;
expect(editorState.puzzleData["3"] === undefined, "REMOVE_PUZZLE failed");

// 3.5 REMOVE_ROOM
editorState = editorReducer(editorState, { type: "REMOVE_ROOM", roomKey: "3" }) || editorState;
expect(editorState.roomData["3"] === undefined, "REMOVE_ROOM failed to delete room");
expect(editorState.roomCodes["3"] === undefined, "REMOVE_ROOM failed to delete room code");

console.log("  ✔ Authoring Studio Editor Reducer passed!");

// ============================================================================
// 4. SCHEMA VALIDATION ENGINE & REFERENTIAL INTEGRITY CHECKS
// ============================================================================
console.log("▶ Testing Schema Validation Engine & Referential Integrity...");

// 4.1 Valid template schema check
const defaultVal = QuizSchema.safeParse(DEFAULT_TEMPLATE);
expect(defaultVal.success, "DEFAULT_TEMPLATE failed schema validation");

// 4.2 Invalid finalCode (non-uppercase letters / characters)
const invalidFinalCode = structuredClone(DEFAULT_TEMPLATE);
invalidFinalCode.config.finalCode = "escape-123!";
const valFinalCode = QuizSchema.safeParse(invalidFinalCode);
expect(!valFinalCode.success, "Invalid finalCode was accepted by schema");

// 4.3 Invalid room code (lowercase or numbers)
const invalidRoomCode = structuredClone(DEFAULT_TEMPLATE);
invalidRoomCode.roomCodes["1"] = "alpha123";
const valRoomCode = QuizSchema.safeParse(invalidRoomCode);
expect(!valRoomCode.success, "Invalid roomCode was accepted by schema");

// 4.4 Discontiguous roomData keys
const discontiguousRooms = structuredClone(DEFAULT_TEMPLATE);
delete discontiguousRooms.roomData["2"];
discontiguousRooms.roomData["3"] = {
  number: "03",
  title: "ZONE 3",
  subtitle: "Sub",
  narrative: "Narrative",
};
const valDiscontiguous = QuizSchema.safeParse(discontiguousRooms);
expect(!valDiscontiguous.success, "Discontiguous roomData keys were accepted");

// 4.5 HTTPS image without attribution
const unassignedAttribution = structuredClone(DEFAULT_TEMPLATE);
unassignedAttribution.roomData["1"].imageUrl = "https://example.com/image.jpg";
unassignedAttribution.roomData["1"].imageAttribution = "";
const valAttribution = QuizSchema.safeParse(unassignedAttribution);
expect(!valAttribution.success, "HTTPS artwork without attribution was accepted");

// 4.6 Puzzle referencing non-existent room
const invalidPuzzleRoom = structuredClone(DEFAULT_TEMPLATE);
invalidPuzzleRoom.puzzleData["1"].room = 99;
const valPuzzleRoom = QuizSchema.safeParse(invalidPuzzleRoom);
expect(!valPuzzleRoom.success, "Puzzle referencing non-existent room 99 was accepted");

console.log("  ✔ Schema Validation Engine passed!");

// ============================================================================
// 5. LIVE PREVIEW MESSAGING CONTRACT & REAL-TIME SYNC
// ============================================================================
console.log("▶ Testing Live Preview Messaging Contract & Real-Time Sync...");

// 5.1 SYNC_QUIZ Action preserves existing player progress while adding new puzzle definitions
const editedQuiz = structuredClone(foodKitchenQuiz);
const nextId = Math.max(...Object.keys(editedQuiz.puzzleData).map(Number)) + 1;
editedQuiz.puzzleData[String(nextId)] = {
  type: "mcq",
  room: 1,
  points: 50,
  title: "NEW EDITED PUZZLE",
  question: "New question text?",
  bloomLevel: "remember",
  options: [
    { key: "1", text: "Option 1" },
    { key: "2", text: "Option 2" },
  ],
  correct: "1",
};

const syncContext = buildContext(editedQuiz);
const syncedState = gameReducer(syncContext)(resumedState, { type: "SYNC_QUIZ" });

expect(String(nextId) in syncedState.answers, "SYNC_QUIZ failed to initialize new puzzle answer");
expect(String(nextId) in syncedState.displayOrder, "SYNC_QUIZ failed to initialize display order");
expect(
  syncedState.puzzleSolved[String(firstPuzzleId)] === true,
  "SYNC_QUIZ lost existing solved progress",
);

// 5.2 Contract check: Security origin checks in Preview and Studio components
const previewCode = fs.readFileSync(path.resolve("src/routes/preview.tsx"), "utf-8");
const frameCode = fs.readFileSync(path.resolve("src/editor/components/PreviewFrame.tsx"), "utf-8");

expect(
  previewCode.includes("e.origin !== window.location.origin || e.source !== window.parent"),
  "Preview missing strict origin or parent check",
);
expect(
  frameCode.includes("e.source === iframeRef.current?.contentWindow"),
  "PreviewFrame missing iframe source check",
);
expect(
  !previewCode.includes('"*"]') && !frameCode.includes('}, "*")'),
  "Wildcard targetOrigin forbidden in postMessage",
);

console.log("  ✔ Live Preview Messaging & Real-Time Sync passed!");

// ============================================================================
// 6. ROUTE RECOVERY, CSP & ACCESSIBILITY MARKUP SCENARIOS
// ============================================================================
console.log("▶ Testing Route Recovery, CSP & Accessibility Markup...");

// 6.1 SPA Route Recovery execution in VM sandbox
function testRouteRecovery(pathname: string, search: string, hash = ""): string | null {
  let replacedUrl: string | null = null;
  const location = { pathname, search, hash };
  const mockWindow = {
    location,
    history: {
      replaceState: (_state: unknown, _title: string, url: string) => {
        replacedUrl = url;
      },
    },
  };
  const scriptSource = fs.readFileSync(path.resolve("public/route-recovery.js"), "utf-8");
  vm.runInNewContext(scriptSource, { window: mockWindow });
  return replacedUrl;
}

expect(
  testRouteRecovery("/", "?p=play/food-kitchen&q=debug=1", "#room1") ===
    "/play/food-kitchen?debug=1#room1",
  "Root route recovery URL decoding failed",
);
expect(
  testRouteRecovery("/food-safety-escape-room/", "?p=editor/config") ===
    "/food-safety-escape-room/editor/config",
  "Subpath route recovery decoding failed",
);
expect(
  testRouteRecovery("/", "?q=unrelated=1") === null,
  "Unrelated query string triggered route recovery",
);

// 6.2 HTML Content Security Policy (CSP) enforcement
const rootHtml = fs.readFileSync(path.resolve("index.html"), "utf-8");
expect(
  rootHtml.includes('http-equiv="Content-Security-Policy"'),
  "index.html missing CSP meta tag",
);
expect(rootHtml.includes("default-src 'self'"), "CSP missing default-src 'self'");
expect(rootHtml.includes("script-src 'self'"), "CSP missing script-src 'self'");
expect(
  !rootHtml.includes("script-src 'self' 'unsafe-inline'"),
  "CSP script-src must not contain unsafe-inline",
);

// 6.3 Accessibility HTML static rendering
const mcqMarkup = renderToStaticMarkup(
  <McqPuzzle.View
    id={1}
    disabled={false}
    onChange={() => {}}
    puzzle={{ title: "Sample MCQ", question: "Q?", options: [{ key: "a", text: "Option A" }] }}
    answer={null}
    displayOrder={["a"]}
  />,
);
expect(mcqMarkup.includes('<fieldset class="mcq-options-fieldset"'), "MCQ view missing fieldset");
expect(mcqMarkup.includes('type="radio"'), "MCQ view missing native radio inputs");

const multiMarkup = renderToStaticMarkup(
  <MultiselectPuzzle.View
    id={2}
    disabled={false}
    onChange={() => {}}
    puzzle={{ title: "Sample Multi", question: "Q?", options: [{ key: "a", text: "Option A" }] }}
    answer={[]}
    displayOrder={["a"]}
  />,
);
expect(multiMarkup.includes('type="checkbox"'), "Multiselect view missing native checkboxes");

const matchMarkup = renderToStaticMarkup(
  <MatchPuzzle.View
    id={3}
    disabled={false}
    onChange={() => {}}
    puzzle={{
      title: "Sample Match",
      question: "Q?",
      leftItems: [{ id: "l1", text: "Left Item 1" }],
      rightItems: [{ id: "r1", text: "Right Item 1" }],
    }}
    answer={{}}
    displayOrder={["l1"]}
  />,
);
expect(
  matchMarkup.includes('<select id="match-3-l1"'),
  "Match view missing select element with ID",
);
expect(
  matchMarkup.includes('<label for="match-3-l1">Left Item 1</label>'),
  "Match view missing linked label",
);

const orderMarkup = renderToStaticMarkup(
  <OrderPuzzle.View
    id={4}
    disabled={false}
    onChange={() => {}}
    puzzle={{
      title: "Sample Order",
      question: "Q?",
      items: [
        { id: "i1", text: "Item 1" },
        { id: "i2", text: "Item 2" },
      ],
    }}
    answer={["i1", "i2"]}
    displayOrder={["i1", "i2"]}
  />,
);
expect(
  orderMarkup.includes('aria-label="Move Item 1 up"'),
  "Order view missing accessibility aria-label",
);
expect(orderMarkup.includes('aria-disabled="true"'), "Order view missing aria-disabled at edge");

console.log("  ✔ Route Recovery, CSP & Accessibility Markup passed!");

console.log("\n🎉 ALL E2E TEST SCENARIOS PASSED SUCCESSFULLY!");
