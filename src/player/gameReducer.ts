import { getPuzzleType } from "./puzzles/index.ts";
import {
  buildRoomPuzzleMap,
  DEFAULT_MAX_HINTS,
  HINT_COST,
  readEngineConfig,
  RETRY_CREDIT,
  totalRooms as countRooms,
} from "./lib/quiz.ts";
import type { EngineConfig, GameState, PersistedState, PuzzleAnswer, QuizData } from "./types.ts";

/** Quiz-derived lookups the reducer needs but never mutates. */
export interface GameContextData {
  quiz: QuizData;
  config: EngineConfig;
  roomPuzzles: Record<number, number[]>;
  totalRooms: number;
  totalPuzzles: number;
}

export function buildContext(quiz: QuizData): GameContextData {
  return {
    quiz,
    config: readEngineConfig(quiz),
    roomPuzzles: buildRoomPuzzleMap(quiz),
    totalRooms: countRooms(quiz),
    totalPuzzles: Object.keys(quiz.puzzleData).length,
  };
}

export type GameAction =
  | { type: "START"; saved: Partial<PersistedState> | null }
  | { type: "SET_ANSWER"; puzzleId: number; answer: PuzzleAnswer }
  | { type: "SUBMIT"; puzzleId: number }
  | { type: "RESOLVE_ADVANCE" }
  | { type: "SHOW_PUZZLE"; roomNum: number; puzzleId: number }
  | { type: "GO_TO_ROOM"; roomNum: number }
  | { type: "UNLOCK_ROOM"; roomNum: number }
  | { type: "REQUEST_HINT"; puzzleId: number }
  | { type: "TOGGLE_SOUND" }
  | { type: "TICK" }
  | { type: "WIN" }
  | { type: "DEBUG_NEXT" }
  | { type: "ANNOUNCE"; text: string }
  | { type: "SYNC_QUIZ" }
  | { type: "RESET" };

export function createInitialState(ctx: GameContextData): GameState {
  const answers: Record<string, PuzzleAnswer> = {};
  const displayOrder: Record<string, string[]> = {};
  const puzzleSolved: Record<string, boolean> = {};
  const puzzleAttempts: Record<string, number> = {};
  const puzzleStartedAt: Record<string, number> = {};

  for (const [id, puzzle] of Object.entries(ctx.quiz.puzzleData)) {
    puzzleSolved[id] = false;
    puzzleAttempts[id] = 0;
    const handler = getPuzzleType(puzzle.type);
    // Shuffled once, here. Doing it during render would deal the player a new
    // option order on every keystroke.
    const init = handler?.init(puzzle) ?? { answer: null, displayOrder: [] };
    answers[id] = init.answer;
    displayOrder[id] = init.displayOrder;
  }

  const maxHints = Number((ctx.quiz.state as Record<string, unknown>)?.maxHints ?? NaN);

  return {
    phase: "title",
    currentRoom: 1,
    score: 0,
    puzzlesCompleted: 0,
    hintsUsed: 0,
    maxHints: Number.isFinite(maxHints) ? maxHints : DEFAULT_MAX_HINTS,
    soundEnabled: true,
    timeElapsed: 0,
    activePuzzles: {},
    codes: {},
    roomCompleted: {},
    puzzleSolved,
    puzzleAttempts,
    puzzleStartedAt,
    answers,
    displayOrder,
    results: {},
    hints: {},
    pendingAdvance: null,
    announcement: { text: "", seq: 0 },
  };
}

function roomPuzzleIds(ctx: GameContextData, roomNum: number): number[] {
  return ctx.roomPuzzles[roomNum] ?? [];
}

/** The puzzle a room should open on: the remembered one if still unsolved, else the first unsolved. */
function activePuzzleFor(ctx: GameContextData, state: GameState, roomNum: number): number | null {
  const ids = roomPuzzleIds(ctx, roomNum);
  const remembered = state.activePuzzles[String(roomNum)];
  if (remembered && ids.includes(remembered) && !state.puzzleSolved[String(remembered)]) {
    return remembered;
  }
  return ids.find((id) => !state.puzzleSolved[String(id)]) ?? ids[0] ?? null;
}

function announce(state: GameState, text: string): GameState["announcement"] {
  return { text, seq: state.announcement.seq + 1 };
}

/** Stamps the moment a puzzle first becomes active, so its solve time can be measured. */
function stampStart(state: GameState, puzzleId: number | null): GameState["puzzleStartedAt"] {
  const key = String(puzzleId);
  if (puzzleId === null || key in state.puzzleStartedAt) return state.puzzleStartedAt;
  return { ...state.puzzleStartedAt, [key]: state.timeElapsed };
}

/** Move into a room, choosing its active puzzle and clearing the previous hint. */
function enterRoom(ctx: GameContextData, state: GameState, roomNum: number): GameState {
  const puzzleId = activePuzzleFor(ctx, state, roomNum);
  const activePuzzles = { ...state.activePuzzles };
  if (puzzleId !== null) activePuzzles[String(roomNum)] = puzzleId;
  const hints = { ...state.hints };
  delete hints[String(roomNum)];

  return {
    ...state,
    phase: "playing",
    currentRoom: roomNum,
    activePuzzles,
    puzzleStartedAt: stampStart(state, puzzleId),
    hints,
    pendingAdvance: null,
  };
}

export function gameReducer(ctx: GameContextData) {
  return function reduce(state: GameState, action: GameAction): GameState {
    switch (action.type) {
      case "START": {
        let next = state;

        if (action.saved) {
          // A save from an older quiz revision can name puzzles that no longer
          // exist; carrying those over corrupts the completed count.
          const validIds = new Set(Object.keys(ctx.quiz.puzzleData));
          const puzzleSolved = { ...state.puzzleSolved };
          const puzzleAttempts = { ...state.puzzleAttempts };
          const puzzleStartedAt = { ...state.puzzleStartedAt };

          for (const [id, solved] of Object.entries(action.saved.puzzleSolved ?? {})) {
            if (validIds.has(id)) puzzleSolved[id] = Boolean(solved);
          }
          for (const [id, attempts] of Object.entries(action.saved.puzzleAttempts ?? {})) {
            if (validIds.has(id)) puzzleAttempts[id] = Number(attempts) || 0;
          }
          for (const [id, startedAt] of Object.entries(action.saved.puzzleStartedAt ?? {})) {
            if (validIds.has(id)) puzzleStartedAt[id] = Number(startedAt) || 0;
          }

          next = {
            ...state,
            ...action.saved,
            puzzleSolved,
            puzzleAttempts,
            puzzleStartedAt,
            maxHints: action.saved.maxHints ?? state.maxHints,
            // Session-only fields must survive the spread of a persisted save.
            answers: state.answers,
            displayOrder: state.displayOrder,
            results: state.results,
            hints: state.hints,
            pendingAdvance: null,
            announcement: state.announcement,
          };
        } else {
          next = { ...state, timeElapsed: 0 };
        }

        const room = next.currentRoom || 1;
        // Resuming into a room whose puzzles are all done should land on its code
        // entry, which is what roomCompleted drives.
        return enterRoom(ctx, next, room);
      }

      case "SET_ANSWER": {
        const key = String(action.puzzleId);
        if (state.puzzleSolved[key]) return state;
        return { ...state, answers: { ...state.answers, [key]: action.answer } };
      }

      case "SUBMIT": {
        const key = String(action.puzzleId);
        const puzzle = ctx.quiz.puzzleData[key];
        if (!puzzle || state.puzzleSolved[key]) return state;

        const attempts = (state.puzzleAttempts[key] ?? 0) + 1;
        const handler = getPuzzleType(puzzle.type);
        const correct = handler ? handler.check(puzzle, state.answers[key]) : false;
        const seq = (state.results[key]?.seq ?? 0) + 1;

        if (!correct) {
          const penalty = ctx.config.wrongPenalty;
          return {
            ...state,
            score: Math.max(0, state.score - penalty),
            puzzleAttempts: { ...state.puzzleAttempts, [key]: attempts },
            results: {
              ...state.results,
              [key]: { correct: false, points: 0, penalty, seq },
            },
            announcement: announce(
              state,
              penalty > 0 ? `Wrong. Try again. Minus ${penalty} points.` : "Wrong. Try again.",
            ),
          };
        }

        const points = attempts === 1 ? puzzle.points : Math.floor(puzzle.points * RETRY_CREDIT);
        const puzzleSolved = { ...state.puzzleSolved, [key]: true };
        const roomNum = puzzle.room;
        const ids = roomPuzzleIds(ctx, roomNum);
        const roomDone = ids.every((pid) => puzzleSolved[String(pid)]);
        const nextInRoom =
          ids[ids.indexOf(action.puzzleId) + 1] ?? ids.find((pid) => !puzzleSolved[String(pid)]);
        const timeSpent = Math.max(
          0,
          state.timeElapsed - (state.puzzleStartedAt[key] ?? state.timeElapsed),
        );

        return {
          ...state,
          score: state.score + points,
          puzzlesCompleted: state.puzzlesCompleted + 1,
          puzzleSolved,
          puzzleAttempts: { ...state.puzzleAttempts, [key]: attempts },
          results: {
            ...state.results,
            [key]: {
              correct: true,
              points,
              penalty: 0,
              explanation: puzzle.explanation,
              timeSpent,
              seq,
            },
          },
          announcement: announce(
            state,
            `Correct. Plus ${points} points.${puzzle.explanation ? ` ${puzzle.explanation}` : ""}`,
          ),
          // Leave the explanation on screen long enough to read before moving on.
          pendingAdvance: {
            roomNum,
            nextPuzzleId: roomDone ? null : (nextInRoom ?? null),
            delayMs: puzzle.explanation ? 4000 : 800,
            seq: (state.pendingAdvance?.seq ?? 0) + 1,
          },
        };
      }

      case "RESOLVE_ADVANCE": {
        const pending = state.pendingAdvance;
        if (!pending) return state;

        if (pending.nextPuzzleId !== null) {
          return reduce(
            { ...state, pendingAdvance: null },
            { type: "SHOW_PUZZLE", roomNum: pending.roomNum, puzzleId: pending.nextPuzzleId },
          );
        }

        return {
          ...state,
          pendingAdvance: null,
          roomCompleted: { ...state.roomCompleted, [String(pending.roomNum)]: true },
        };
      }

      case "SHOW_PUZZLE": {
        const hints = { ...state.hints };
        delete hints[String(action.roomNum)];
        return {
          ...state,
          activePuzzles: { ...state.activePuzzles, [String(action.roomNum)]: action.puzzleId },
          puzzleStartedAt: stampStart(state, action.puzzleId),
          hints,
        };
      }

      case "GO_TO_ROOM": {
        const rn = action.roomNum;
        // Only rooms already reached, or the one after a cleared room, are open.
        const allowed = rn === 1 || rn <= state.currentRoom || state.roomCompleted[String(rn - 1)];
        if (!allowed) return state;
        return enterRoom(ctx, state, rn);
      }

      case "UNLOCK_ROOM": {
        const rn = action.roomNum;
        const withCode: GameState = {
          ...state,
          codes: { ...state.codes, [String(rn)]: true },
          roomCompleted: { ...state.roomCompleted, [String(rn)]: true },
        };
        if (rn < ctx.totalRooms) return enterRoom(ctx, withCode, rn + 1);
        return { ...withCode, phase: "final" };
      }

      case "REQUEST_HINT": {
        if (state.hintsUsed >= state.maxHints) return state;
        const puzzle = ctx.quiz.puzzleData[String(action.puzzleId)];
        const roomNum = puzzle?.room ?? state.currentRoom;
        const text = puzzle?.hint ?? "No hint available.";
        const used = state.hintsUsed + 1;

        return {
          ...state,
          hintsUsed: used,
          score: Math.max(0, state.score - HINT_COST),
          hints: { ...state.hints, [String(roomNum)]: { text, ordinal: used } },
          announcement: announce(state, `Hint ${used} of ${state.maxHints}. ${text}`),
        };
      }

      case "TOGGLE_SOUND":
        return { ...state, soundEnabled: !state.soundEnabled };

      case "TICK":
        return { ...state, timeElapsed: state.timeElapsed + 1 };

      case "WIN":
        return { ...state, phase: "victory", pendingAdvance: null };

      case "ANNOUNCE":
        return { ...state, announcement: announce(state, action.text) };

      case "DEBUG_NEXT": {
        if (state.phase === "final") return { ...state, phase: "victory" };
        if (state.phase !== "playing") return state;

        const rn = state.currentRoom;
        // Already at the code pad: take the code and move on.
        if (state.roomCompleted[String(rn)]) {
          return reduce(state, { type: "UNLOCK_ROOM", roomNum: rn });
        }

        const ids = roomPuzzleIds(ctx, rn);
        const current = state.activePuzzles[String(rn)] ?? ids[0];
        const idx = ids.indexOf(current);
        if (idx < ids.length - 1) {
          return reduce(state, { type: "SHOW_PUZZLE", roomNum: rn, puzzleId: ids[idx + 1] });
        }
        return { ...state, roomCompleted: { ...state.roomCompleted, [String(rn)]: true } };
      }

      case "SYNC_QUIZ": {
        // The author studio's live preview swaps quiz data under a running game.
        // Reconcile puzzle options, active puzzles, and room bounds so live edits
        // update immediately in the preview without breaking progress.
        const answers: Record<string, PuzzleAnswer> = {};
        const displayOrder: Record<string, string[]> = {};
        const puzzleSolved: Record<string, boolean> = {};
        const puzzleAttempts: Record<string, number> = {};
        const puzzleStartedAt: Record<string, number> = {};

        for (const [id, puzzle] of Object.entries(ctx.quiz.puzzleData)) {
          const handler = getPuzzleType(puzzle.type);
          const init = handler?.init(puzzle) ?? { answer: null, displayOrder: [] };

          if (id in state.displayOrder && id in state.answers) {
            // Validate existing displayOrder against updated puzzle options/items
            const validKeys = new Set(
              puzzle.type === "order"
                ? puzzle.items.map((i: any) => String(i.id))
                : puzzle.type === "match"
                  ? puzzle.leftItems.map((i: any) => String(i.id))
                  : puzzle.type === "text"
                    ? []
                    : (puzzle.options?.map((o: any) => String(o.key)) ?? []),
            );

            const existingOrder = (state.displayOrder[id] || []).filter((k) => validKeys.has(k));
            const missingKeys = Array.from(validKeys).filter((k) => !existingOrder.includes(k));
            displayOrder[id] = [...existingOrder, ...missingKeys];

            if (puzzle.type === "mcq") {
              const currentAns = state.answers[id] as string | null;
              answers[id] = currentAns && validKeys.has(currentAns) ? currentAns : null;
            } else if (puzzle.type === "multiselect") {
              const currentAns = (state.answers[id] as string[]) || [];
              answers[id] = currentAns.filter((k) => validKeys.has(k));
            } else if (puzzle.type === "order") {
              const currentAns = (state.answers[id] as string[]) || [];
              const validAns = currentAns.filter((k) => validKeys.has(k));
              answers[id] = [...validAns, ...missingKeys];
            } else if (puzzle.type === "match") {
              const currentAns = (state.answers[id] as Record<string, string>) || {};
              const rightKeys = new Set(puzzle.rightItems.map((r: any) => String(r.id)));
              const nextAns: Record<string, string> = {};
              for (const [k, v] of Object.entries(currentAns)) {
                if (validKeys.has(k) && rightKeys.has(v)) {
                  nextAns[k] = v;
                }
              }
              answers[id] = nextAns;
            } else {
              answers[id] = state.answers[id];
            }
          } else {
            answers[id] = init.answer;
            displayOrder[id] = init.displayOrder;
          }

          puzzleSolved[id] = state.puzzleSolved[id] ?? false;
          puzzleAttempts[id] = state.puzzleAttempts[id] ?? 0;
          if (id in state.puzzleStartedAt) puzzleStartedAt[id] = state.puzzleStartedAt[id];
        }

        const clampedRoom = Math.max(1, Math.min(state.currentRoom, ctx.totalRooms));

        return {
          ...state,
          currentRoom: clampedRoom,
          answers,
          displayOrder,
          puzzleSolved,
          puzzleAttempts,
          puzzleStartedAt,
        };
      }

      case "RESET":
        // Fresh state means a fresh shuffle, so a replay is not the same deal.
        return createInitialState(ctx);

      default:
        return state;
    }
  };
}
