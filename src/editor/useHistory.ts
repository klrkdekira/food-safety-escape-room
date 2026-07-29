import { applyPatches, produceWithPatches, type Patch } from "immer";
import { useCallback, useMemo, useReducer } from "react";

/**
 * Undo/redo built on the Immer patches that `enablePatches()` turns on.
 * Every dispatch records the inverse patch set, so history costs only the
 * delta rather than a full copy of the document per keystroke.
 */
interface Step {
  patches: Patch[];
  inverse: Patch[];
}

interface History<S> {
  present: S;
  past: Step[];
  future: Step[];
}

const UNDO = Symbol("undo");
const REDO = Symbol("redo");

type Internal<A> = A | typeof UNDO | typeof REDO;

const HISTORY_LIMIT = 100;

export function useHistoryReducer<S extends object, A>(
  reducer: (draft: S, action: A) => S | void,
  initial: S,
): [
  S,
  (action: A) => void,
  { undo: () => void; redo: () => void; canUndo: boolean; canRedo: boolean },
] {
  const historyReducer = useCallback(
    (state: History<S>, action: Internal<A>): History<S> => {
      if (action === UNDO) {
        const step = state.past[state.past.length - 1];
        if (!step) return state;
        return {
          present: applyPatches(state.present, step.inverse) as S,
          past: state.past.slice(0, -1),
          future: [step, ...state.future],
        };
      }

      if (action === REDO) {
        const [step, ...rest] = state.future;
        if (!step) return state;
        return {
          present: applyPatches(state.present, step.patches) as S,
          past: [...state.past, step],
          future: rest,
        };
      }

      const [next, patches, inverse] = produceWithPatches(state.present as object, (draft) =>
        reducer(draft as S, action as A),
      ) as [S, Patch[], Patch[]];
      // Actions that changed nothing must not create an undo step, otherwise
      // the user has to press undo repeatedly to see anything move.
      if (patches.length === 0) return state;

      return {
        present: next as S,
        past: [...state.past, { patches, inverse }].slice(-HISTORY_LIMIT),
        future: [],
      };
    },
    [reducer],
  );

  const [state, rawDispatch] = useReducer(historyReducer, {
    present: initial,
    past: [],
    future: [],
  });

  const dispatch = useCallback((action: A) => rawDispatch(action), [rawDispatch]);

  const controls = useMemo(
    () => ({
      undo: () => rawDispatch(UNDO),
      redo: () => rawDispatch(REDO),
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
    }),
    [rawDispatch, state.past.length, state.future.length],
  );

  return [state.present, dispatch, controls];
}
