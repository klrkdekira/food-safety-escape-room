import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

function expect(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function recover(pathname: string, search: string, hash = ""): string | null {
  let replaced: string | null = null;
  const location = { pathname, search, hash };
  const window = {
    location,
    history: {
      replaceState: (_state: unknown, _title: string, url: string) => {
        replaced = url;
      },
    },
  };
  const source = fs.readFileSync(path.resolve("public/route-recovery.js"), "utf-8");
  vm.runInNewContext(source, { window });
  return replaced;
}

expect(
  recover("/", "?p=play/microb&q=debug=1~and~instructor=1", "#mission") ===
    "/play/microb?debug=1&instructor=1#mission",
  "Root-hosted route recovery lost the path, query, or hash",
);
expect(
  recover("/food-safety-escape-room/", "?p=editor/config") ===
    "/food-safety-escape-room/editor/config",
  "Project-page route recovery lost the deployment subpath",
);
expect(recover("/", "?q=debug=1") === null, "Unrelated query triggered route recovery");

const html = fs.readFileSync(path.resolve("index.html"), "utf-8");
expect(
  html.includes('<script src="/route-recovery.js"></script>'),
  "index.html must load the route decoder from a same-origin external script",
);
expect(
  !html.includes("Single Page Apps for GitHub Pages URL decoder"),
  "Inline route decoder returned",
);
