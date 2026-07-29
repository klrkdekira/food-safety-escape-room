import { esc } from "../utils/esc.ts";
import { shuffle } from "../utils/shuffle.ts";
import type { PuzzleHandler } from "./types.ts";

export const McqHandler: PuzzleHandler = {
  id: "mcq",
  label: "Multiple Choice (Single Answer)",
  render(id: number, puzzle: any): string {
    const sorted = shuffle<any>(puzzle.options);
    return `<fieldset class="mcq-options-fieldset" id="puzzle-${id}-options">
      <legend class="sr-only">${esc(puzzle.title)}</legend>
      ${sorted
        .map(
          (opt, i) => `
        <label class="mcq-option">
          <input class="sr-only-input" type="radio" name="puzzle-${id}-radio" value="${esc(opt.key)}" />
          <span class="marker">${String.fromCharCode(65 + i)}</span>
          <span>${esc(opt.text)}</span>
        </label>`,
        )
        .join("")}
    </fieldset>`;
  },
  check(id: number, puzzle: any): boolean {
    const checked = document.querySelector<HTMLInputElement>(
      `input[name="puzzle-${id}-radio"]:checked`,
    );
    return checked?.value === puzzle.correct;
  },
};
