import React from "react";
import { shuffle } from "../lib/shuffle.ts";
import type { PuzzleType, PuzzleViewProps } from "./types.ts";

type OrderAnswer = string[];

/** Swap an item with its neighbour. Out-of-range moves are a no-op. */
function step(ids: OrderAnswer, index: number, direction: number): OrderAnswer {
  const target = index + direction;
  if (target < 0 || target >= ids.length) return ids;
  const next = [...ids];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/**
 * Drop `from` onto `to`, matching the vanilla engine's insert semantics: an item
 * dragged downward lands just after the drop target, one dragged upward lands
 * just before it.
 */
function reorder(ids: OrderAnswer, from: number, to: number): OrderAnswer {
  if (from === to) return ids;
  const next = [...ids];
  const [moved] = next.splice(from, 1);
  next.splice(from < to ? to - 1 : to + 1, 0, moved);
  return next;
}

/** Reorder affordance. `^` and `v` as literal text characters sat off-centre and
 *  at the mercy of the body font's metrics. */
const Chevron: React.FC<{ up?: boolean }> = ({ up }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={up ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />
  </svg>
);

const OrderView: React.FC<PuzzleViewProps<any, OrderAnswer>> = ({
  id,
  puzzle,
  answer,
  disabled,
  onChange,
}) => {
  const byId = new Map<string, any>(puzzle.items.map((item: any) => [item.id, item]));

  const onDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (disabled) return;
    const draggedId = e.dataTransfer.getData("text/plain");
    const fromIndex = answer.indexOf(draggedId);
    if (fromIndex === -1) return;
    onChange(reorder(answer, fromIndex, toIndex));
  };

  return (
    <>
      <div className="order-note">Use the arrows or drag the items to reorder.</div>
      <div className="order-list" id={`puzzle-${id}-list`}>
        {answer.map((itemId, index) => {
          const item = byId.get(itemId);
          if (!item) return null;
          const atTop = index === 0;
          const atBottom = index === answer.length - 1;

          return (
            <div
              className="order-item"
              key={itemId}
              data-id={itemId}
              draggable={!disabled}
              onDragStart={(e) => e.dataTransfer.setData("text/plain", itemId)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDrop(e, index)}
            >
              <span className="drag-handle" aria-hidden="true">
                &#10303;
              </span>
              <span className="order-text">{item.text}</span>
              <span className="order-number">{index + 1}</span>
              <span className="order-item-controls">
                {/* aria-disabled, never the `disabled` attribute: a disabled
                    button drops out of the tab order, which strands keyboard
                    users on the first or last item. */}
                <button
                  type="button"
                  className="order-step-btn"
                  aria-disabled={atTop || disabled}
                  aria-label={`Move ${item.text} up`}
                  onClick={() => {
                    if (atTop || disabled) return;
                    onChange(step(answer, index, -1));
                  }}
                >
                  <Chevron up />
                </button>
                <button
                  type="button"
                  className="order-step-btn"
                  aria-disabled={atBottom || disabled}
                  aria-label={`Move ${item.text} down`}
                  onClick={() => {
                    if (atBottom || disabled) return;
                    onChange(step(answer, index, 1));
                  }}
                >
                  <Chevron />
                </button>
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
};

export const OrderPuzzle: PuzzleType<any, OrderAnswer> = {
  id: "order",
  label: "Sequence Reordering",
  View: OrderView,
  init: (puzzle) => {
    // The shuffled sequence is both what is shown and the answer in progress.
    const order = shuffle<string>(puzzle.items.map((item: any) => String(item.id)));
    return { answer: order, displayOrder: order };
  },
  check: (puzzle, answer) => JSON.stringify(answer) === JSON.stringify(puzzle.correctOrder),
};
