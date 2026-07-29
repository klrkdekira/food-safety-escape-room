import React, { useState } from "react";
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
    ...(puzzle.hint === undefined ? {} : { hint: puzzle.hint }),
    ...(puzzle.explanation === undefined ? {} : { explanation: puzzle.explanation }),
  };

  const carriedOptions =
    "options" in puzzle && puzzle.options
      ? puzzle.options
      : [
          { key: "A", text: "Opt 1" },
          { key: "B", text: "Opt 2" },
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
              { id: "step1", text: "Step 1" },
              { id: "step2", text: "Step 2" },
            ];
      return { ...base, type: "order", items, correctOrder: items.map((i) => i.id) };
    }
    case "match": {
      const leftItems =
        "leftItems" in puzzle && puzzle.leftItems
          ? puzzle.leftItems
          : [{ id: "l1", text: "Left 1" }];
      const rightItems =
        "rightItems" in puzzle && puzzle.rightItems
          ? puzzle.rightItems
          : [{ id: "r1", text: "Right 1" }];
      return {
        ...base,
        type: "match",
        leftItems,
        rightItems,
        correct: Object.fromEntries(leftItems.map((l) => [l.id, rightItems[0].id])),
      };
    }
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

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    backgroundColor: "#1a2538",
    border: "1px solid #233148",
    borderRadius: "4px",
    color: "#e2e8f0",
    fontSize: "14px",
    marginBottom: "12px",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "12px",
    fontWeight: 600,
    color: "#94a3b8",
    marginBottom: "4px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  };

  const handleAdd = () => {
    const nextId = (Math.max(...puzzleIds.map(Number), 0) + 1).toString();
    const newPuzzle = {
      type: "mcq",
      room: 1,
      points: 100,
      title: "NEW PUZZLE",
      question: "Enter question text here:",
      options: [
        { key: "A", text: "Option A" },
        { key: "B", text: "Option B" },
      ],
      correct: "A",
      hint: "Hint text.",
      explanation: "Explanation text.",
    };
    onAddPuzzle(nextId, newPuzzle);
    setSelectedId(nextId);
  };

  const updateCurrent = (field: string, val: any) => {
    if (!currentPuzzle) return;
    onUpdatePuzzle(selectedId, { ...currentPuzzle, [field]: val });
  };

  return (
    <div
      style={{
        backgroundColor: "#141c2b",
        padding: "16px",
        borderRadius: "6px",
        marginBottom: "16px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <h3 style={{ fontSize: "15px", color: "#00ff88" }}>Puzzles ({puzzleIds.length})</h3>
        <button
          onClick={handleAdd}
          style={{
            padding: "6px 12px",
            backgroundColor: "#00ff88",
            border: "none",
            borderRadius: "4px",
            color: "#0a0e17",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: "12px",
          }}
        >
          + Add Puzzle
        </button>
      </div>

      <div style={{ display: "flex", gap: "6px", marginBottom: "16px", flexWrap: "wrap" }}>
        {puzzleIds.map((id) => (
          <button
            key={id}
            onClick={() => setSelectedId(id)}
            style={{
              padding: "6px 10px",
              backgroundColor: selectedId === id ? "#00ff88" : "#1a2538",
              color: selectedId === id ? "#0a0e17" : "#e2e8f0",
              border: "1px solid #233148",
              borderRadius: "4px",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            P{id} ({data.puzzleData[id]?.type})
          </button>
        ))}
      </div>

      {currentPuzzle && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
            <div>
              <label style={labelStyle}>Puzzle Type</label>
              <select
                style={inputStyle}
                value={currentPuzzle.type}
                onChange={(e) => {
                  onUpdatePuzzle(selectedId, convertPuzzleType(currentPuzzle, e.target.value));
                }}
              >
                <option value="mcq">MCQ (Single Answer)</option>
                <option value="multiselect">Multiselect (Multiple Answers)</option>
                <option value="order">Order (Sequence)</option>
                <option value="match">Match (Pairing)</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Assigned Room</label>
              <input
                type="number"
                style={inputStyle}
                value={currentPuzzle.room}
                onChange={(e) => updateCurrent("room", Number(e.target.value))}
              />
            </div>

            <div>
              <label style={labelStyle}>Points</label>
              <input
                type="number"
                style={inputStyle}
                value={currentPuzzle.points}
                onChange={(e) => updateCurrent("points", Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Puzzle Title</label>
            <input
              style={inputStyle}
              value={currentPuzzle.title}
              onChange={(e) => updateCurrent("title", e.target.value)}
            />
          </div>

          <div>
            <label style={labelStyle}>Question Text</label>
            <textarea
              style={{ ...inputStyle, minHeight: "60px", resize: "vertical" }}
              value={currentPuzzle.question}
              onChange={(e) => updateCurrent("question", e.target.value)}
            />
          </div>

          <AnswerEditor
            puzzle={currentPuzzle}
            onChange={(next) => onUpdatePuzzle(selectedId, next)}
            inputStyle={inputStyle}
            labelStyle={labelStyle}
          />

          <div>
            <label style={labelStyle}>Hint Text</label>
            <input
              style={inputStyle}
              value={currentPuzzle.hint ?? ""}
              onChange={(e) => updateCurrent("hint", e.target.value)}
            />
          </div>

          <div>
            <label style={labelStyle}>Explanation Text</label>
            <input
              style={inputStyle}
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
              style={{
                padding: "6px 12px",
                backgroundColor: "transparent",
                border: "1px solid #ff4d67",
                color: "#ff4d67",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
                marginTop: "8px",
              }}
            >
              Delete Puzzle {selectedId}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
