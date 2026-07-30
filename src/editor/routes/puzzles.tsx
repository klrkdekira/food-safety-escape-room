import React from "react";
import { createLazyRoute } from "@tanstack/react-router";
import { useEditor } from "../EditorContext.ts";
import { PuzzleEditor } from "../components/PuzzleEditor.tsx";

function PuzzlesTab() {
  const { data, dispatch } = useEditor();
  return (
    <PuzzleEditor
      data={data}
      onUpdatePuzzle={(puzzleId, puzzle) => dispatch({ type: "UPDATE_PUZZLE", puzzleId, puzzle })}
      onAddPuzzle={(puzzleId, puzzle) => dispatch({ type: "ADD_PUZZLE", puzzleId, puzzle })}
      onRemovePuzzle={(puzzleId) => dispatch({ type: "REMOVE_PUZZLE", puzzleId })}
    />
  );
}

export const Route = createLazyRoute("/editor/puzzles")({ component: PuzzlesTab });
