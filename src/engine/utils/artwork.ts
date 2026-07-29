/**
 * Room artwork (`roomData[n].svg`) is authored markup, so it cannot simply be
 * escaped -- it has to render. Quiz JSON is untrusted the moment lecturers
 * exchange files by email, so parse it inertly and keep only an SVG subset:
 * no scripts, no event handlers, no external or javascript: references.
 */

const ALLOWED_TAGS = new Set([
  "svg",
  "g",
  "defs",
  "title",
  "desc",
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "text",
  "tspan",
  "use",
  "symbol",
  "marker",
  "linearGradient",
  "radialGradient",
  "stop",
  "clipPath",
  "mask",
  "pattern",
]);

const URL_ATTRS = new Set(["href", "xlink:href", "src"]);

function isSafeUrl(value: string): boolean {
  // Only same-document fragment references (e.g. url(#grad)) are useful here.
  return value.trim().startsWith("#");
}

function scrub(el: Element): void {
  for (const child of Array.from(el.children)) {
    if (!ALLOWED_TAGS.has(child.tagName.toLowerCase())) {
      child.remove();
      continue;
    }
    for (const attr of Array.from(child.attributes)) {
      const name = attr.name.toLowerCase();
      if (name.startsWith("on")) {
        child.removeAttribute(attr.name);
      } else if (URL_ATTRS.has(name) && !isSafeUrl(attr.value)) {
        child.removeAttribute(attr.name);
      }
    }
    scrub(child);
  }
}

export function sanitizeArtwork(markup: string | undefined | null): string {
  if (!markup) return "";
  // `text/html` parsing is inert: no script executes, no image loads.
  const doc = new DOMParser().parseFromString(`<div>${markup}</div>`, "text/html");
  const holder = doc.body.firstElementChild;
  if (!holder) return "";
  scrub(holder);
  return holder.innerHTML;
}
