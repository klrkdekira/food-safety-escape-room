import type { QuizData } from "../../schema/quiz.ts";

/**
 * Vite splits the modulepreload polyfill into a shared chunk, so the entry
 * bundle opens with `import"./modulepreload-polyfill-*.js"`. Inlining the entry
 * text alone leaves that import pointing next to the saved HTML file, where it
 * 404s (and is CORS-blocked outright on file://). Fetch and inline relative
 * imports so the standalone file really is standalone.
 */
async function inlineRelativeImports(
  code: string,
  fromUrl: string,
  seen = new Set<string>(),
): Promise<string> {
  const sideEffectImport = /^\s*import\s*["']([^"']+)["']\s*;?/gm;
  const specs = [...code.matchAll(sideEffectImport)];
  let out = code;
  for (const [match, spec] of specs) {
    if (!spec.startsWith(".")) continue;
    const target = new URL(spec, fromUrl).href;
    if (seen.has(target)) {
      out = out.replace(match, "");
      continue;
    }
    seen.add(target);
    try {
      const resp = await fetch(target);
      if (!resp.ok) continue;
      const dep = await inlineRelativeImports(await resp.text(), target, seen);
      out = out.replace(match, dep);
    } catch {
      // Leave the import in place; better a visible failure than silent loss.
    }
  }
  return out;
}

export async function exportOfflineGame(data: QuizData): Promise<void> {
  const sanitizeFilename = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "escape-room";

  const filename = `${sanitizeFilename(data.config.pageTitle || "quiz")}-standalone.html`;

  try {
    // Determine player index.html location relative to author app
    const playerHtmlPaths = ["../index.html", "./index.html", "/index.html"];
    let htmlText = "";
    let baseUrl = "";

    for (const p of playerHtmlPaths) {
      try {
        const resp = await fetch(p);
        if (resp.ok) {
          htmlText = await resp.text();
          baseUrl = new URL(p, window.location.href).href;
          break;
        }
      } catch {
        // Try next candidate path
      }
    }

    if (!htmlText) {
      throw new Error("Could not load player HTML template.");
    }

    // Parse HTML string to DOM
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, "text/html");

    // Inline all linked CSS stylesheets
    const stylesheetLinks = Array.from(
      doc.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
    );
    for (const link of stylesheetLinks) {
      const href = link.getAttribute("href");
      if (href && !href.startsWith("http://") && !href.startsWith("https://")) {
        try {
          const cssUrl = new URL(href, baseUrl).href;
          const cssResp = await fetch(cssUrl);
          if (cssResp.ok) {
            const cssContent = await cssResp.text();
            const styleEl = doc.createElement("style");
            styleEl.textContent = cssContent;
            link.replaceWith(styleEl);
          }
        } catch {
          // Keep original link if fetch fails
        }
      }
    }

    // Inline all external script tags
    const scriptElements = Array.from(doc.querySelectorAll<HTMLScriptElement>("script[src]"));
    for (const script of scriptElements) {
      const src = script.getAttribute("src");
      if (src && !src.startsWith("http://") && !src.startsWith("https://")) {
        try {
          const jsUrl = new URL(src, baseUrl).href;
          const jsResp = await fetch(jsUrl);
          if (jsResp.ok) {
            const jsContent = await inlineRelativeImports(await jsResp.text(), jsUrl);
            const inlineScript = doc.createElement("script");
            if (script.type === "module") {
              inlineScript.type = "module";
            }
            inlineScript.textContent = jsContent;
            script.replaceWith(inlineScript);
          }
        } catch {
          // Keep original script if fetch fails
        }
      }
    }

    // Those chunks are inlined now; the preload links would 404 beside the file.
    doc.querySelectorAll('link[rel="modulepreload"]').forEach((el) => el.remove());

    // Inject INLINE_QUIZ_DATA script block in <head>
    const dataScript = doc.createElement("script");
    dataScript.textContent = `window.INLINE_QUIZ_DATA = ${JSON.stringify(data, null, 2)};`;
    doc.head.insertBefore(dataScript, doc.head.firstChild);

    // Serialize finalized document
    const finalHtml = "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;

    // Trigger browser download
    const blob = new Blob([finalHtml], { type: "text/html;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.href = blobUrl;
    downloadAnchor.download = filename;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    URL.revokeObjectURL(blobUrl);
  } catch (err) {
    console.error("Failed to generate standalone offline HTML bundle:", err);
    alert("Could not generate standalone HTML file. Exporting raw Quiz JSON instead.");
    // Fallback export JSON
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sanitizeFilename(data.config.pageTitle)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
