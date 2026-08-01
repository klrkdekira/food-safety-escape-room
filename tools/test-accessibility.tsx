import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { MatchPuzzle } from "../src/player/puzzles/Match.tsx";
import { McqPuzzle } from "../src/player/puzzles/Mcq.tsx";
import { MultiselectPuzzle } from "../src/player/puzzles/Multiselect.tsx";
import { OrderPuzzle } from "../src/player/puzzles/Order.tsx";

function expect(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const noop = () => undefined;
const common = { id: 1, disabled: false, onChange: noop };

const mcq = renderToStaticMarkup(
  <McqPuzzle.View
    {...common}
    puzzle={{ title: "Question", options: [{ key: "a", text: "Answer" }] }}
    answer={null}
    displayOrder={["a"]}
  />,
);
expect(mcq.includes('<fieldset class="mcq-options-fieldset"'), "MCQ lost its fieldset");
expect(mcq.includes('type="radio"'), "MCQ lost native radio inputs");
expect(mcq.includes('<legend class="sr-only">Question</legend>'), "MCQ lost its legend");

const multiselect = renderToStaticMarkup(
  <MultiselectPuzzle.View
    {...common}
    puzzle={{ title: "Question", options: [{ key: "a", text: "Answer" }] }}
    answer={[]}
    displayOrder={["a"]}
  />,
);
expect(multiselect.includes('type="checkbox"'), "Multiselect lost native checkbox inputs");
expect(
  multiselect.includes('<legend class="sr-only">Question</legend>'),
  "Multiselect lost its legend",
);

const match = renderToStaticMarkup(
  <MatchPuzzle.View
    {...common}
    puzzle={{
      leftItems: [{ id: "left", text: "Prompt" }],
      rightItems: [{ id: "right", text: "Answer" }],
    }}
    answer={{}}
    displayOrder={["left"]}
  />,
);
expect(match.includes('<label for="match-1-left">Prompt</label>'), "Match label lost its target");
expect(match.includes('<select id="match-1-left"'), "Match lost its native select");
expect(match.includes("Select a match…</option>"), "Match lost its empty choice");

const order = renderToStaticMarkup(
  <OrderPuzzle.View
    {...common}
    puzzle={{
      items: [
        { id: "a", text: "First" },
        { id: "b", text: "Second" },
      ],
    }}
    answer={["a", "b"]}
    displayOrder={["a", "b"]}
  />,
);
expect(order.includes('aria-label="Move First up"'), "Order move-up control lost its label");
expect(order.includes('aria-disabled="true"'), "Order edge control lost aria-disabled");
expect(
  !order.includes(' disabled=""'),
  "Order controls became unfocusable native-disabled buttons",
);
expect(order.match(/<button/g)?.length === 4, "Order did not render both controls for every item");

const artPickerSource = fs.readFileSync(
  path.resolve("src/editor/components/CcArtPicker.tsx"),
  "utf-8",
);
expect(
  artPickerSource.includes(
    '<button\n                    type="button"\n                    key={item.id}\n                    className="cc-art-card"',
  ),
  "Commons results must be native buttons",
);

console.log("Accessibility markup checks passed.");
