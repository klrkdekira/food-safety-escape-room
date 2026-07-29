import { esc } from "../utils/esc.ts";
import { shuffle } from "../utils/shuffle.ts";
import type { PuzzleHandler } from "./types.ts";

export const OrderHandler: PuzzleHandler = {
  id: "order",
  label: "Sequence Reordering",
  render(id: number, puzzle: any): string {
    const sorted = shuffle<any>(puzzle.items);
    return `<div class="order-note">Use the arrows or drag the items to reorder.</div>
      <div class="order-list" id="puzzle-${id}-list">
      ${sorted
        .map(
          (item) => `
        <div class="order-item" draggable="true" data-id="${esc(item.id)}">
          <span class="drag-handle">&#9789;</span>
          <span class="order-text">${esc(item.text)}</span>
          <span class="order-number">?</span>
          <span class="order-item-controls">
            <button type="button" class="order-step-btn" data-action="order-move" data-dir="-1" aria-label="Move ${esc(item.text)} up">^</button>
            <button type="button" class="order-step-btn" data-action="order-move" data-dir="1" aria-label="Move ${esc(item.text)} down">v</button>
          </span>
        </div>`,
        )
        .join("")}
      </div>`;
  },
  check(id: number, puzzle: any): boolean {
    const order = Array.from(
      document.querySelectorAll<HTMLElement>(`#puzzle-${id}-list .order-item`),
    ).map((i) => i.dataset.id);
    return JSON.stringify(order) === JSON.stringify(puzzle.correctOrder);
  },
};
