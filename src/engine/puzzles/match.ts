import { esc } from "../utils/esc.ts";
import type { PuzzleHandler } from "./types.ts";

export const MatchHandler: PuzzleHandler = {
  id: "match",
  label: "Matching & Classification",
  render(id: number, puzzle: any): string {
    return `<div class="match-select-wrapper">
      ${puzzle.leftItems
        .map(
          (left: any) => `
        <div class="match-row" style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
          <label style="flex:1;font-size:14px;color:var(--text-primary);font-weight:500;" for="match-${id}-${esc(left.id)}">${esc(left.text)}</label>
          <select id="match-${id}-${esc(left.id)}" data-left="${esc(left.id)}" class="match-select-input" style="flex:1;padding:8px 12px;background:var(--bg-card);border:1px solid var(--border-color);color:var(--text-primary);border-radius:4px;font-size:14px;">
            <option value="">-- Select Match --</option>
            ${puzzle.rightItems
              .map((right: any) => `<option value="${esc(right.id)}">${esc(right.text)}</option>`)
              .join("")}
          </select>
        </div>`,
        )
        .join("")}
    </div>`;
  },
  check(id: number, puzzle: any): boolean {
    const selects = Array.from(
      document.querySelectorAll<HTMLSelectElement>(`select[id^="match-${id}-"]`),
    );
    if (selects.length === 0) return false;

    const pairs: Record<string, string> = {};
    for (const sel of selects) {
      const leftId = sel.dataset.left;
      if (leftId && sel.value) {
        pairs[leftId] = sel.value;
      }
    }

    const correctKeys = Object.keys(puzzle.correct);
    return (
      correctKeys.length === Object.keys(pairs).length &&
      correctKeys.every((l) => pairs[l] === puzzle.correct[l])
    );
  },
};
