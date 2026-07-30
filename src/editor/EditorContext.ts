import { createContext, useContext } from "react";
import type { QuizData } from "../schema/quiz.ts";
import type { EditorAction } from "./types.ts";

export interface HistoryControls {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export interface EditorContextValue {
  data: QuizData;
  dispatch: (action: EditorAction) => void;
  history: HistoryControls;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export const EditorContextProvider = EditorContext.Provider;

/**
 * The draft lives in the `/editor` layout route so the config, rooms, and puzzles
 * routes all edit one document -- navigating between them must not reset it.
 */
export function useEditor(): EditorContextValue {
  const value = useContext(EditorContext);
  if (!value) throw new Error("useEditor() must be called inside the /editor layout route");
  return value;
}
