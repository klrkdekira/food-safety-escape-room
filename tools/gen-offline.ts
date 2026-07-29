import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/**
 * Vite's multi-entry build splits the modulepreload polyfill into a shared
 * chunk, so the entry bundle starts with `import"./modulepreload-polyfill-*.js"`.
 * Inlining the entry text alone leaves that import dangling -- it resolves next
 * to the HTML instead of assets/, and on file:// it is CORS-blocked outright.
 * Follow relative imports and inline them ahead of the importing module.
 */
function inlineRelativeImports(code: string, fromDir: string, seen = new Set<string>()): string {
  const sideEffectImport = /^\s*import\s*["']([^"']+)["']\s*;?/gm;
  return code.replace(sideEffectImport, (match, spec: string) => {
    if (!spec.startsWith(".")) return match;
    const target = path.resolve(fromDir, spec);
    if (seen.has(target)) return "";
    seen.add(target);
    if (!fs.existsSync(target)) {
      console.warn(`⚠️  Offline bundle: could not resolve ${spec}, leaving import in place.`);
      return match;
    }
    const dep = fs.readFileSync(target, "utf-8");
    return inlineRelativeImports(dep, path.dirname(target), seen);
  });
}

/**
 * The served page's CSP is `script-src 'self'` with no 'unsafe-inline', because
 * everything is attached via delegated listeners. That policy cannot work here:
 * this bundle IS its scripts, inlined, and `'self'` matches nothing under a
 * file:// opaque origin. Rebuild the policy around SHA-256 hashes of the exact
 * inline scripts, so the bundle stays locked down without 'unsafe-inline'.
 */
function rewriteCspForOffline(html: string): string {
  const hashes: string[] = [];
  const inlineScript = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  for (const m of html.matchAll(inlineScript)) {
    const body = m[1];
    if (!body.trim()) continue;
    hashes.push(`'sha256-${crypto.createHash("sha256").update(body, "utf8").digest("base64")}'`);
  }

  const policy = [
    "default-src 'none'",
    `script-src ${hashes.join(" ")}`,
    "style-src 'unsafe-inline'",
    "font-src data:",
    "img-src data:",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join("; ");

  const cspMeta = /<meta http-equiv="Content-Security-Policy"[\s\S]*?>/i;
  const replacement = `<meta http-equiv="Content-Security-Policy" content="${policy}">`;
  return cspMeta.test(html)
    ? html.replace(cspMeta, replacement)
    : html.replace("<head>", `<head>\n  ${replacement}`);
}

const MIME_BY_EXT: Record<string, string> = {
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};

/**
 * Rewrite `url(...)` references in a stylesheet to data: URIs. The self-hosted
 * fonts are relative to public/fonts/, so once the CSS is inlined into the HTML
 * those paths would resolve beside the saved file and 404.
 */
function inlineCssAssets(css: string, cssDir: string): string {
  return css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (match, _quote, ref: string) => {
    if (/^(data:|https?:|#)/.test(ref)) return match;
    const assetPath = path.resolve(cssDir, ref.split("?")[0].split("#")[0]);
    if (!fs.existsSync(assetPath)) {
      console.warn(`⚠️  Offline bundle: asset not found, left as-is: ${ref}`);
      return match;
    }
    const mime = MIME_BY_EXT[path.extname(assetPath).toLowerCase()];
    if (!mime) return match;
    const b64 = fs.readFileSync(assetPath).toString("base64");
    return `url(data:${mime};base64,${b64})`;
  });
}

function generateOfflineHtml(quizId: string) {
  const quizzesDir = path.resolve("public/quizzes");
  const quizPath = path.join(quizzesDir, `${quizId}.json`);
  if (!fs.existsSync(quizPath)) {
    console.error(`❌ Quiz file not found: ${quizPath}`);
    return;
  }

  const quizData = JSON.parse(fs.readFileSync(quizPath, "utf-8"));

  // Primary template candidate: built docs/index.html
  const docsHtmlPath = path.resolve("docs/index.html");
  const srcHtmlPath = path.resolve("index.html");
  const templatePath = fs.existsSync(docsHtmlPath) ? docsHtmlPath : srcHtmlPath;

  if (!fs.existsSync(templatePath)) {
    console.error(`❌ Base index.html template not found at ${templatePath}`);
    return;
  }

  let html = fs.readFileSync(templatePath, "utf-8");
  const baseDir = path.dirname(templatePath);

  // Inline CSS files
  html = html.replace(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"[^>]*>/gi, (match, href) => {
    if (href.startsWith("http://") || href.startsWith("https://")) return match;
    const cleanHref = href.replace(/^\.\//, "").replace(/^\//, "");
    const cssPath = path.resolve(baseDir, cleanHref);
    if (fs.existsSync(cssPath)) {
      const css = inlineCssAssets(fs.readFileSync(cssPath, "utf-8"), path.dirname(cssPath));
      return `<style>\n${css}\n</style>`;
    }
    return match;
  });

  // Inline JS script files
  html = html.replace(/<script[^>]+src="([^"]+)"[^>]*><\/script>/gi, (match, src) => {
    if (src.startsWith("http://") || src.startsWith("https://")) return match;
    const cleanSrc = src.replace(/^\.\//, "").replace(/^\//, "");
    const jsPath = path.resolve(baseDir, cleanSrc);
    if (fs.existsSync(jsPath)) {
      const js = inlineRelativeImports(fs.readFileSync(jsPath, "utf-8"), path.dirname(jsPath));
      return `<script type="module">\n${js}\n</script>`;
    }
    return match;
  });

  // The preloaded chunks are now inlined; the links would 404 next to the HTML.
  html = html.replace(/<link[^>]+rel="modulepreload"[^>]*>\s*/gi, "");

  // Inject INLINE_QUIZ_DATA script in head
  const dataScript = `<script>\nwindow.INLINE_QUIZ_DATA = ${JSON.stringify(quizData, null, 2)};\n</script>`;
  html = html.replace("<head>", `<head>\n  ${dataScript}`);

  html = rewriteCspForOffline(html);

  const outDir = path.resolve("docs/offline");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${quizId}-offline.html`);
  fs.writeFileSync(outFile, html);
  console.log(`✅ Generated offline single-file quiz at ${outFile}`);
}

function main() {
  generateOfflineHtml("microb");
  generateOfflineHtml("food-kitchen");
}

main();
