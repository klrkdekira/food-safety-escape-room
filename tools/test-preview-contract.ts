import fs from "node:fs";
import path from "node:path";

function expect(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const preview = fs.readFileSync(path.resolve("src/routes/preview.tsx"), "utf-8");
const frame = fs.readFileSync(path.resolve("src/editor/components/PreviewFrame.tsx"), "utf-8");

expect(
  preview.includes("e.origin !== window.location.origin || e.source !== window.parent"),
  "Preview must require its parent window and exact origin",
);
expect(
  preview.includes('window.parent.postMessage({ type: "PREVIEW_READY" }, window.location.origin)'),
  "Preview readiness must target its exact origin",
);
expect(
  frame.includes("e.source === iframeRef.current?.contentWindow"),
  "Studio must require iframe source",
);
expect(frame.includes("e.origin === window.location.origin"), "Studio must require exact origin");
expect(frame.includes("window.location.origin,"), "Studio updates must target exact origin");
expect(
  !preview.includes('"null"') && !frame.includes('"null"'),
  "Opaque origins must not be accepted",
);
expect(!preview.includes('}, "*")') && !frame.includes('}, "*")'), "Wildcard postMessage returned");

console.log("Preview message contract checks passed.");
