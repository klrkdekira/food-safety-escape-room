import React, { useState } from "react";
import { BLOOM_LEVELS } from "../../schema/quiz.ts";
import type { QuizData } from "../../schema/quiz.ts";
import { AnswerEditor } from "./AnswerEditor.tsx";

type AnyPuzzle = QuizData["puzzleData"][string];

/**
 * Rebuild a puzzle for a new type from the fields every type shares. Spreading
 * the old puzzle instead would carry stale keys across (e.g. `options` and a
 * string `correct` surviving an mcq -> order switch), which the schema rejects.
 */
export function convertPuzzleType(puzzle: AnyPuzzle, newType: string): AnyPuzzle {
  const base = {
    room: puzzle.room,
    points: puzzle.points,
    title: puzzle.title,
    question: puzzle.question,
    bloomLevel: puzzle.bloomLevel,
    ...(puzzle.hint === undefined ? {} : { hint: puzzle.hint }),
    ...(puzzle.explanation === undefined ? {} : { explanation: puzzle.explanation }),
  };

  const carriedOptions =
    "options" in puzzle && puzzle.options
      ? puzzle.options
      : [
          { key: "A", text: "Correct answer text" },
          { key: "B", text: "Incorrect answer text" },
        ];

  switch (newType) {
    case "mcq":
      return { ...base, type: "mcq", options: carriedOptions, correct: carriedOptions[0].key };
    case "multiselect":
      return {
        ...base,
        type: "multiselect",
        options: carriedOptions,
        correct: [carriedOptions[0].key],
      };
    case "order": {
      const items =
        "items" in puzzle && puzzle.items
          ? puzzle.items
          : [
              { id: "step1", text: "First step" },
              { id: "step2", text: "Second step" },
            ];
      return { ...base, type: "order", items, correctOrder: items.map((i) => i.id) };
    }
    case "match": {
      const leftItems =
        "leftItems" in puzzle && puzzle.leftItems
          ? puzzle.leftItems
          : [
              { id: "l1", text: "Term 1" },
              { id: "l2", text: "Term 2" },
            ];
      const rightItems =
        "rightItems" in puzzle && puzzle.rightItems
          ? puzzle.rightItems
          : [
              { id: "r1", text: "Definition 1" },
              { id: "r2", text: "Definition 2" },
            ];
      return {
        ...base,
        type: "match",
        leftItems,
        rightItems,
        correct: Object.fromEntries(
          leftItems.map((l, i) => [l.id, rightItems[i % rightItems.length].id]),
        ),
      };
    }
    case "text":
      return {
        ...base,
        type: "text",
        keywords:
          "keywords" in puzzle && puzzle.keywords ? puzzle.keywords : ["keyword1", "keyword2"],
      };
    default:
      return puzzle;
  }
}

interface PuzzleEditorProps {
  data: QuizData;
  onUpdatePuzzle: (puzzleId: string, puzzle: any) => void;
  onAddPuzzle: (puzzleId: string, puzzle: any) => void;
  onRemovePuzzle: (puzzleId: string) => void;
}

export const PuzzleEditor: React.FC<PuzzleEditorProps> = ({
  data,
  onUpdatePuzzle,
  onAddPuzzle,
  onRemovePuzzle,
}) => {
  const puzzleIds = Object.keys(data.puzzleData);
  const [selectedId, setSelectedId] = useState<string>(puzzleIds[0] ?? "1");

  const currentPuzzle = data.puzzleData[selectedId];

  const handleAdd = () => {
    const nextId = (Math.max(...puzzleIds.map(Number), 0) + 1).toString();
    // Default to the room of the puzzle the author is currently looking at,
    // rather than always room 1, so adding a puzzle while reviewing room 3
    // doesn't silently drop it into room 1.
    const defaultRoom = currentPuzzle?.room ?? Math.min(...Object.keys(data.roomData).map(Number));
    const newPuzzle = {
      type: "mcq",
      room: defaultRoom,
      points: 100,
      title: "NEW PUZZLE",
      question: "Enter question text here:",
      bloomLevel: "remember",
      options: [
        { key: "A", text: "Correct answer text" },
        { key: "B", text: "Incorrect answer text" },
      ],
      correct: "A",
      hint: "Hint text to help the player.",
      explanation: "Explanation shown after the puzzle is solved.",
    };
    onAddPuzzle(nextId, newPuzzle);
    setSelectedId(nextId);
  };

  const updateCurrent = (field: string, val: any) => {
    if (!currentPuzzle) return;
    onUpdatePuzzle(selectedId, { ...currentPuzzle, [field]: val });
  };

  return (
    <div className="editor-card">
      <h3>Puzzles ({puzzleIds.length})</h3>

      <div className="editor-selector-bar">
        {puzzleIds.map((id) => (
          <button
            key={id}
            onClick={() => setSelectedId(id)}
            className={selectedId === id ? "editor-btn editor-btn-primary" : "editor-btn"}
          >
            P{id} ({data.puzzleData[id]?.type})
          </button>
        ))}
        <button onClick={handleAdd} className="editor-btn editor-btn-add">
          + Add Puzzle
        </button>
      </div>

      {currentPuzzle && (
        <div className="editor-subcard">
          <div className="editor-grid-3">
            <div>
              <label className="editor-label">Puzzle Type</label>
              <select
                className="editor-input"
                value={currentPuzzle.type}
                onChange={(e) => {
                  onUpdatePuzzle(selectedId, convertPuzzleType(currentPuzzle, e.target.value));
                }}
              >
                <option value="mcq">MCQ (Single Answer)</option>
                <option value="multiselect">Multiselect (Multiple Answers)</option>
                <option value="order">Order (Sequence)</option>
                <option value="match">Match (Pairing)</option>
                <option value="text">Free Text (Keyword Match)</option>
              </select>
            </div>

            <div>
              <label className="editor-label">Assigned Room</label>
              <input
                type="number"
                className="editor-input"
                value={currentPuzzle.room}
                onChange={(e) => updateCurrent("room", Number(e.target.value))}
              />
            </div>

            <div>
              <label className="editor-label">Points</label>
              <input
                type="number"
                className="editor-input"
                value={currentPuzzle.points}
                onChange={(e) => updateCurrent("points", Number(e.target.value))}
              />
            </div>

            <div>
              <label className="editor-label">Bloom's Level</label>
              <select
                className="editor-input"
                value={currentPuzzle.bloomLevel}
                onChange={(e) => updateCurrent("bloomLevel", e.target.value)}
              >
                {BLOOM_LEVELS.map(({ level, label }) => (
                  <option key={level} value={level}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="editor-label">Puzzle Title</label>
            <input
              className="editor-input"
              value={currentPuzzle.title}
              onChange={(e) => updateCurrent("title", e.target.value)}
            />
          </div>

          <div>
            <label className="editor-label">Question Text</label>
            <textarea
              className="editor-input"
              value={currentPuzzle.question}
              onChange={(e) => updateCurrent("question", e.target.value)}
            />
          </div>

          <AnswerEditor
            puzzle={currentPuzzle}
            onChange={(next) => onUpdatePuzzle(selectedId, next)}
          />

          <div>
            <label className="editor-label">Hint Text</label>
            <input
              className="editor-input"
              value={currentPuzzle.hint ?? ""}
              onChange={(e) => updateCurrent("hint", e.target.value)}
            />
          </div>

          <div>
            <label className="editor-label">Explanation Text</label>
            <input
              className="editor-input"
              value={currentPuzzle.explanation ?? ""}
              onChange={(e) => updateCurrent("explanation", e.target.value)}
            />
          </div>

          {puzzleIds.length > 1 && (
            <button
              onClick={() => {
                onRemovePuzzle(selectedId);
                setSelectedId(puzzleIds.find((id) => id !== selectedId) ?? "1");
              }}
              className="editor-btn btn-danger"
            >
              Delete Puzzle {selectedId}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
