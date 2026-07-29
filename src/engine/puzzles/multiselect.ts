import { esc } from "../utils/esc.ts";
import { shuffle } from "../utils/shuffle.ts";
import type { PuzzleHandler } from "./types.ts";

export const MultiselectHandler: PuzzleHandler = {
  id: "multiselect",
  label: "Multiple Choice (Multiple Answers)",
  render(id: number, puzzle: any): string {
    const sorted = shuffle<any>(puzzle.options);
    return `<fieldset class="multi-select-options-fieldset" id="puzzle-${id}-options">
      <legend class="sr-only">${esc(puzzle.title)}</legend>
      ${sorted
        .map(
          (opt) => `
        <label class="multi-option">
          <input class="sr-only-input" type="checkbox" name="puzzle-${id}-check" value="${esc(opt.key)}" />
          <span class="checkbox"></span>
          <span>${esc(opt.text)}</span>
        </label>`,
        )
        .join("")}
    </fieldset>`;
  },
  check(id: number, puzzle: any): boolean {
    const checkedEls = Array.from(
      document.querySelectorAll<HTMLInputElement>(`input[name="puzzle-${id}-check"]:checked`),
    ).map((el) => el.value);

    const sel = [...checkedEls].sort();
    const correct = [...puzzle.correct].sort();
    return JSON.stringify(sel) === JSON.stringify(correct);
  },
};
