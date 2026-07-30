import React from "react";
import type { QuizData } from "../../schema/quiz.ts";

type AnyPuzzle = QuizData["puzzleData"][string];

interface AnswerEditorProps {
  puzzle: AnyPuzzle;
  onChange: (puzzle: AnyPuzzle) => void;
}

const rowStyle: React.CSSProperties = {
  display: "flex",
  gap: "0.5rem",
  alignItems: "center",
  marginBottom: "0.5rem",
};

/** The text input inside a row: fills the gap, and drops the class's own margin. */
const rowInputStyle: React.CSSProperties = { flex: 1, minWidth: 0, marginBottom: 0 };

/** Row prefix (option key, step ordinal) — fixed width so the inputs line up. */
const rowMarkerStyle: React.CSSProperties = { width: "1.125rem", flexShrink: 0, marginBottom: 0 };

const shrinkStyle: React.CSSProperties = { flexShrink: 0 };

/** Next unused single-letter option key, so keys stay stable and A-Z ordered. */
function nextOptionKey(existing: { key: string }[]): string {
  const used = new Set(existing.map((o) => o.key));
  for (let i = 0; i < 26; i++) {
    const k = String.fromCharCode(65 + i);
    if (!used.has(k)) return k;
  }
  return `K${existing.length + 1}`;
}

function nextItemId(existing: { id: string }[], prefix: string): string {
  let n = existing.length + 1;
  const used = new Set(existing.map((i) => i.id));
  while (used.has(`${prefix}${n}`)) n++;
  return `${prefix}${n}`;
}

export const AnswerEditor: React.FC<AnswerEditorProps> = ({ puzzle, onChange }) => {
  const sectionLabel = (text: string) => <label className="editor-label">{text}</label>;

  if (puzzle.type === "mcq" || puzzle.type === "multiselect") {
    const isMulti = puzzle.type === "multiselect";
    const options = puzzle.options;
    const correctKeys = isMulti
      ? new Set(puzzle.correct as string[])
      : new Set([puzzle.correct as string]);

    const setCorrect = (key: string, checked: boolean) => {
      if (!isMulti) {
        onChange({ ...puzzle, correct: key });
        return;
      }
      const next = new Set(correctKeys);
      if (checked) next.add(key);
      else next.delete(key);
      // Keep answer order aligned with option order for stable diffs.
      onChange({
        ...puzzle,
        correct: options.filter((o) => next.has(o.key)).map((o) => o.key),
      });
    };

    const updateOption = (idx: number, text: string) => {
      const next = options.map((o, i) => (i === idx ? { ...o, text } : o));
      onChange({ ...puzzle, options: next });
    };

    const removeOption = (idx: number) => {
      const removed = options[idx];
      const next = options.filter((_, i) => i !== idx);
      if (isMulti) {
        const remaining = (puzzle.correct as string[]).filter((k) => k !== removed.key);
        onChange({
          ...puzzle,
          options: next,
          correct: remaining.length > 0 ? remaining : [next[0].key],
        });
      } else {
        const stillValid = puzzle.correct !== removed.key;
        onChange({
          ...puzzle,
          options: next,
          correct: stillValid ? puzzle.correct : next[0].key,
        });
      }
    };

    const addOption = () => {
      onChange({
        ...puzzle,
        options: [...options, { key: nextOptionKey(options), text: "New option" }],
      });
    };

    return (
      <div style={{ marginBottom: "0.75rem" }}>
        {sectionLabel(
          isMulti ? "Options (tick every correct answer)" : "Options (select the correct answer)",
        )}
        {options.map((opt, idx) => (
          <div key={opt.key} style={rowStyle}>
            <input
              type={isMulti ? "checkbox" : "radio"}
              name={`correct-${puzzle.title}`}
              checked={correctKeys.has(opt.key)}
              onChange={(e) => setCorrect(opt.key, e.target.checked)}
              aria-label={`Mark option ${opt.key} correct`}
              style={shrinkStyle}
            />
            <span className="editor-note" style={rowMarkerStyle}>
              {opt.key}
            </span>
            <input
              className="editor-input"
              style={rowInputStyle}
              value={opt.text}
              onChange={(e) => updateOption(idx, e.target.value)}
            />
            {options.length > 2 && (
              <button
                className="editor-btn btn-danger"
                style={shrinkStyle}
                onClick={() => removeOption(idx)}
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button className="editor-btn" onClick={addOption}>
          + Add option
        </button>
      </div>
    );
  }

  if (puzzle.type === "order") {
    const items = puzzle.items;

    // The list order shown here IS the correct order; players see it shuffled.
    const commit = (next: typeof items) =>
      onChange({ ...puzzle, items: next, correctOrder: next.map((i) => i.id) });

    const move = (idx: number, dir: number) => {
      const target = idx + dir;
      if (target < 0 || target >= items.length) return;
      const next = [...items];
      [next[idx], next[target]] = [next[target], next[idx]];
      commit(next);
    };

    return (
      <div style={{ marginBottom: "0.75rem" }}>
        {sectionLabel("Steps in the correct order (players see them shuffled)")}
        {items.map((item, idx) => (
          <div key={item.id} style={rowStyle}>
            <span className="editor-note" style={rowMarkerStyle}>
              {idx + 1}
            </span>
            <input
              className="editor-input"
              style={rowInputStyle}
              value={item.text}
              onChange={(e) =>
                commit(items.map((it, i) => (i === idx ? { ...it, text: e.target.value } : it)))
              }
            />
            <button
              className="editor-btn"
              style={shrinkStyle}
              onClick={() => move(idx, -1)}
              disabled={idx === 0}
              aria-label={`Move step ${idx + 1} up`}
            >
              ↑
            </button>
            <button
              className="editor-btn"
              style={shrinkStyle}
              onClick={() => move(idx, 1)}
              disabled={idx === items.length - 1}
              aria-label={`Move step ${idx + 1} down`}
            >
              ↓
            </button>
            {items.length > 2 && (
              <button
                className="editor-btn btn-danger"
                style={shrinkStyle}
                onClick={() => commit(items.filter((_, i) => i !== idx))}
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button
          className="editor-btn"
          onClick={() => commit([...items, { id: nextItemId(items, "step"), text: "New step" }])}
        >
          + Add step
        </button>
      </div>
    );
  }

  if (puzzle.type === "match") {
    const { leftItems, rightItems } = puzzle;
    const correct = puzzle.correct as Record<string, string>;

    const commit = (
      nextLeft: typeof leftItems,
      nextRight: typeof rightItems,
      nextCorrect: Record<string, string>,
    ) => onChange({ ...puzzle, leftItems: nextLeft, rightItems: nextRight, correct: nextCorrect });

    const removeRight = (id: string) => {
      const nextRight = rightItems.filter((r) => r.id !== id);
      // Re-point any left item that mapped to the deleted target.
      const nextCorrect = Object.fromEntries(
        Object.entries(correct).map(([l, r]) => [l, r === id ? nextRight[0].id : r]),
      );
      commit(leftItems, nextRight, nextCorrect);
    };

    return (
      <div style={{ marginBottom: "0.75rem" }}>
        {sectionLabel("Categories (right column)")}
        {rightItems.map((r, idx) => (
          <div key={r.id} style={rowStyle}>
            <input
              className="editor-input"
              style={rowInputStyle}
              value={r.text}
              onChange={(e) =>
                commit(
                  leftItems,
                  rightItems.map((it, i) => (i === idx ? { ...it, text: e.target.value } : it)),
                  correct,
                )
              }
            />
            {rightItems.length > 1 && (
              <button
                className="editor-btn btn-danger"
                style={shrinkStyle}
                onClick={() => removeRight(r.id)}
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button
          className="editor-btn"
          onClick={() =>
            commit(
              leftItems,
              [...rightItems, { id: nextItemId(rightItems, "r"), text: "New category" }],
              correct,
            )
          }
        >
          + Add category
        </button>

        <div style={{ marginTop: "1rem" }} />
        {sectionLabel("Items and the category each belongs to")}
        {leftItems.map((l, idx) => (
          <div key={l.id} style={rowStyle}>
            <input
              className="editor-input"
              style={rowInputStyle}
              value={l.text}
              onChange={(e) =>
                commit(
                  leftItems.map((it, i) => (i === idx ? { ...it, text: e.target.value } : it)),
                  rightItems,
                  correct,
                )
              }
            />
            <select
              className="editor-input"
              style={{ ...rowInputStyle, maxWidth: "45%" }}
              value={correct[l.id] ?? rightItems[0].id}
              onChange={(e) =>
                commit(leftItems, rightItems, { ...correct, [l.id]: e.target.value })
              }
              aria-label={`Category for ${l.text}`}
            >
              {rightItems.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.text}
                </option>
              ))}
            </select>
            {leftItems.length > 1 && (
              <button
                className="editor-btn btn-danger"
                style={shrinkStyle}
                onClick={() => {
                  const nextLeft = leftItems.filter((_, i) => i !== idx);
                  const { [l.id]: _drop, ...nextCorrect } = correct;
                  commit(nextLeft, rightItems, nextCorrect);
                }}
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button
          className="editor-btn"
          onClick={() => {
            const id = nextItemId(leftItems, "l");
            commit([...leftItems, { id, text: "New item" }], rightItems, {
              ...correct,
              [id]: rightItems[0].id,
            });
          }}
        >
          + Add item
        </button>
      </div>
    );
  }

  return null;
};
