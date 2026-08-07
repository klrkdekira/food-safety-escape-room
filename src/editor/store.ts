import { enablePatches } from "immer";
import {
  DEFAULT_MUSIC_ATTRIBUTION,
  DEFAULT_MUSIC_URL,
  DEFAULT_MUSIC_VOLUME,
} from "../lib/musicDefaults.ts";
import type { QuizData } from "../schema/quiz.ts";
import type { EditorAction } from "./types.ts";

enablePatches();

export const DEFAULT_TEMPLATE: QuizData = {
  schemaVersion: 2,
  config: {
    pageTitle: "NEW ESCAPE ROOM - Author Studio",
    titleLogo: "NEW ESCAPE ROOM",
    titleSub: "Escape Room Challenge",
    minimapTitle: "FACILITY MAP",
    minimapRooms: ["ZONE 1: START", "ZONE 2: MAIN"],
    missionBriefingTitle: "MISSION OBJECTIVE",
    missionBriefingText: "Solve all puzzles to extract the escape codes.",
    finalEscapeTerminalTitle: "FINAL OVERRIDE",
    finalEscapeTerminalText: "Enter the master code to unlock the exit.",
    finalCode: "ESCAPE",
    victoryTitle: "ESCAPE SUCCESSFUL",
    victorySubtitle: "ALL ZONES CLEARED",
    victoryText: "Congratulations! You have completed the facility escape.",
    version: "v1.0.0",
    musicUrl: DEFAULT_MUSIC_URL,
    musicVolume: DEFAULT_MUSIC_VOLUME,
    musicAttribution: DEFAULT_MUSIC_ATTRIBUTION,
  },
  state: {
    currentRoom: 1,
    score: 0,
    puzzlesCompleted: 0,
    hintsUsed: 0,
    maxHints: 3,
    soundEnabled: true,
    timeElapsed: 0,
    codes: { "1": false, "2": false },
    roomCompleted: { "1": false, "2": false },
    puzzleSolved: {},
    puzzleAttempts: {},
  },
  puzzleData: {
    "1": {
      type: "mcq",
      room: 1,
      points: 100,
      title: "INITIAL PROTOCOL",
      question: "Select the primary safety protocol:",
      bloomLevel: "remember",
      options: [
        { key: "A", text: "Sanitise all contact surfaces" },
        { key: "B", text: "Ignore temperature logs" },
      ],
      correct: "A",
      hint: "Sanitation prevents cross-contamination.",
      explanation: "Surface sanitation removes biofilm risks.",
    },
    // Room 2 needs at least one puzzle: a room with none is unreachable, and the
    // schema rejects the whole quiz for it.
    "2": {
      type: "mcq",
      room: 2,
      points: 100,
      title: "SECOND PROTOCOL",
      question: "Select the correct storage practice:",
      bloomLevel: "understand",
      options: [
        { key: "A", text: "Store raw meat above ready-to-eat food" },
        { key: "B", text: "Store raw meat below ready-to-eat food" },
      ],
      correct: "B",
      hint: "Think about which way drips travel.",
      explanation: "Storing raw meat below prevents drip contamination onto ready-to-eat food.",
    },
  },
  roomCodes: {
    "1": "ALPHA",
    "2": "BRAVO",
  },
  roomData: {
    "1": {
      number: "01",
      title: "ZONE 1: ENTRY",
      subtitle: "Decontamination Chamber",
      narrative: "Inspect the chamber parameters before advancing.",
      codeHint: "Code: ALPHA",
    },
    "2": {
      number: "02",
      title: "ZONE 2: CONTROL",
      subtitle: "Main Laboratory",
      narrative: "Main laboratory control systems.",
      codeHint: "Code: BRAVO",
    },
  },
};

// Returns QuizData for LOAD_DATA (Immer accepts a wholesale replacement) and
// mutates the draft in place for every other action.
export function editorReducer(draft: QuizData, action: EditorAction): QuizData | void {
  switch (action.type) {
    case "LOAD_DATA":
      return action.data;

    case "UPDATE_CONFIG":
      (draft.config as any)[action.field] = action.value;
      break;

    case "UPDATE_ROOM":
      if (draft.roomData[action.roomKey]) {
        (draft.roomData[action.roomKey] as any)[action.field] = action.value;
      }
      break;

    case "ADD_ROOM":
      draft.roomData[action.roomKey] = {
        number: action.roomKey.padStart(2, "0"),
        title: `ZONE ${action.roomKey}: NEW ROOM`,
        subtitle: "Subsystem Area",
        svg: "",
        narrative: "New room description.",
        codeHint: `Code: CODE${action.roomKey}`,
      };
      draft.roomCodes[action.roomKey] = `CODE${action.roomKey}`;
      draft.config.minimapRooms.push(`ZONE ${action.roomKey}`);
      break;

    case "REMOVE_ROOM":
      delete draft.roomData[action.roomKey];
      delete draft.roomCodes[action.roomKey];
      break;

    case "UPDATE_ROOM_CODE":
      draft.roomCodes[action.roomKey] = action.code.toUpperCase();
      break;

    case "UPDATE_PUZZLE":
      draft.puzzleData[action.puzzleId] = action.puzzle;
      break;

    case "ADD_PUZZLE":
      draft.puzzleData[action.puzzleId] = action.puzzle;
      break;

    case "REMOVE_PUZZLE":
      delete draft.puzzleData[action.puzzleId];
      break;
  }
}
