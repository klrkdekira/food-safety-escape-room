import type { QuizData } from "../schema/quiz.ts";

export type EditorAction =
  | { type: "LOAD_DATA"; data: QuizData }
  | { type: "UPDATE_CONFIG"; field: string; value: any }
  | { type: "UPDATE_ROOM"; roomKey: string; field: string; value: any }
  | { type: "ADD_ROOM"; roomKey: string }
  | { type: "REMOVE_ROOM"; roomKey: string }
  | { type: "UPDATE_ROOM_CODE"; roomKey: string; code: string }
  | { type: "UPDATE_PUZZLE"; puzzleId: string; puzzle: any }
  | { type: "ADD_PUZZLE"; puzzleId: string; puzzle: any }
  | { type: "REMOVE_PUZZLE"; puzzleId: string };
