import fs from "node:fs";
import path from "node:path";
import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { generateQuizManifest } from "./tools/gen-manifest.ts";

function quizManifestPlugin(): Plugin {
  return {
    name: "quiz-manifest-plugin",
    buildStart() {
      generateQuizManifest();
    },
    handleHotUpdate({ file }) {
      if (file.includes("public/quizzes") && !file.endsWith("index.json")) {
        generateQuizManifest();
      }
    },
  };
}

/**
 * GitHub Pages serves static files only: nothing sits behind /play/microb, so the
 * request 404s before the router ever loads. Pages returns 404.html for any
 * unmatched path, so that generated redirect document recovers the route
 * that makes deep links and reloads work.
 */
function spaFallbackPlugin(outDir: string): Plugin {
  return {
    name: "spa-fallback",
    apply: "build",
    closeBundle() {
      const fallbackHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Redirecting...</title>
  <script>
    var l = window.location;
    var isSubpath = l.hostname.endsWith('github.io') && l.pathname.split('/')[1] !== '';
    var keep = isSubpath ? 1 : 0;
    l.replace(
      l.protocol + '//' + l.hostname + (l.port ? ':' + l.port : '') +
      l.pathname.split('/').slice(0, 1 + keep).join('/') + '/?p=' +
      l.pathname.slice(1).split('/').slice(keep).join('/') +
      (l.search ? '&q=' + l.search.slice(1).replace(/&/g, '~and~') : '') +
      l.hash
    );
  </script>
</head>
<body>
</body>
</html>`;
      fs.writeFileSync(path.resolve(outDir, "404.html"), fallbackHtml, "utf-8");
      console.log(`✅ Wrote GitHub Pages SPA fallback at ${outDir}/404.html`);
    },
  };
}

const OUT_DIR = "docs";

export default defineConfig({
  // Absolute, not './': with relative asset URLs a nested route like /play/microb
  // resolves assets against /play/ and the app fails to boot.
  base: "/",
  plugins: [react(), quizManifestPlugin(), spaFallbackPlugin(OUT_DIR)],
  build: {
    outDir: OUT_DIR,
    // Everything in docs/ is generated; clear stale hashed assets on each build.
    emptyOutDir: true,
  },
});
