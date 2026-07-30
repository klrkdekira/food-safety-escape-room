import { createContext, useContext } from "react";
import type React from "react";
import type { GameAction, GameContextData } from "./gameReducer.ts";
import type { GameState } from "./types.ts";

export interface GameContextValue {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  ctx: GameContextData;
  quizId: string;
  /** `?debug=1`: reveals the room-skip control. */
  debug: boolean;
  /** Rendered inside the author studio: no saving, no best-score writes. */
  preview: boolean;
}

const GameContext = createContext<GameContextValue | null>(null);

export const GameContextProvider = GameContext.Provider;

export function useGame(): GameContextValue {
  const value = useContext(GameContext);
  if (!value) throw new Error("useGame() must be called inside <Game>");
  return value;
}
