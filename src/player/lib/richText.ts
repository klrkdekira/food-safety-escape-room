/**
 * Prose fields in a quiz (`question`, `narrative`, `missionBriefingText`, ...) are
 * authored as small HTML fragments: paragraphs, lists, and emphasis. They used to
 * be escaped, which rendered the tags as literal text.
 *
 * They cannot simply be trusted either -- quiz JSON is exchanged between lecturers
 * by email, so it is untrusted input. Parse it inertly and keep only a formatting
 * subset: no scripts, no event handlers, no insecure or `javascript:` references.
 *
 * Anything outside the allowlist is *unwrapped* rather than deleted, so an
 * unexpected tag costs the author its formatting but never its words. Genuinely
 * dangerous elements are removed with their contents.
 */

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "ul",
  "ol",
  "li",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "span",
  "code",
  "sub",
  "sup",
  "small",
  "img",
]);

/** Removed outright, contents included -- their text is not worth keeping. */
const DROP_WITH_CONTENT = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "template",
  "noscript",
  "link",
  "meta",
  "base",
  "form",
  "input",
  "button",
  "select",
  "textarea",
  "svg",
  "math",
]);

/**
 * `style` is the only attribute kept, and only for typography, spacing, and colour.
 * Existing quizzes use `color`, `font-size`, `opacity`, and `margin-top`.
 * `background-color` is intentionally allowed for small prose callouts only; component
 * backgrounds remain controlled by design tokens.
 */
const ALLOWED_STYLE_PROPS = new Set([
  "color",
  "background-color",
  "font-size",
  "font-style",
  "font-weight",
  "font-variant",
  "letter-spacing",
  "line-height",
  "opacity",
  "text-align",
  "text-decoration",
  "text-transform",
  "white-space",
  "margin",
  "margin-top",
  "margin-bottom",
  "margin-left",
  "margin-right",
  "padding",
  "padding-top",
  "padding-bottom",
  "padding-left",
  "padding-right",
]);

/**
 * `url()` would reach the network, `expression()` and `javascript:` execute in old
 * engines, `@import` pulls a stylesheet, and a backslash can hide any of them
 * behind a CSS escape.
 */
const UNSAFE_STYLE_VALUE = /url\(|expression|javascript:|@import|\\|<|&#/i;

function sanitizeStyle(value: string): string {
  const kept: string[] = [];
  for (const declaration of value.split(";")) {
    const colon = declaration.indexOf(":");
    if (colon === -1) continue;
    const prop = declaration.slice(0, colon).trim().toLowerCase();
    const val = declaration.slice(colon + 1).trim();
    if (!prop || !val) continue;
    if (!ALLOWED_STYLE_PROPS.has(prop)) continue;
    if (UNSAFE_STYLE_VALUE.test(val)) continue;
    kept.push(`${prop}:${val}`);
  }
  return kept.join(";");
}

function scrub(parent: Element): void {
  for (const child of Array.from(parent.children)) {
    const tag = child.tagName.toLowerCase();

    if (DROP_WITH_CONTENT.has(tag)) {
      child.remove();
      continue;
    }

    // Clean the subtree first, so unwrapping cannot promote unscrubbed nodes.
    scrub(child);

    if (!ALLOWED_TAGS.has(tag)) {
      child.replaceWith(...Array.from(child.childNodes));
      continue;
    }

    for (const attr of Array.from(child.attributes)) {
      const name = attr.name.toLowerCase();
      if (
        tag === "img" &&
        (name === "src" ||
          name === "alt" ||
          name === "title" ||
          name === "width" ||
          name === "height")
      ) {
        if (name === "src") {
          const val = attr.value.trim();
          if (val.startsWith("https://") || val.startsWith("data:image/") || val.startsWith("/")) {
            continue;
          }
          child.removeAttribute(attr.name);
          continue;
        }
        continue;
      }
      if (name !== "style") {
        // Covers every on* handler, href/src on non-img tags, and anything else exotic.
        child.removeAttribute(attr.name);
        continue;
      }
      const safe = sanitizeStyle(attr.value);
      if (safe) child.setAttribute("style", safe);
      else child.removeAttribute("style");
    }
  }
}

export function sanitizeRichText(markup: string | undefined | null): string {
  if (!markup) return "";
  // `text/html` parsing is inert: no script executes and no resource loads.
  const doc = new DOMParser().parseFromString(`<div>${markup}</div>`, "text/html");
  const holder = doc.body.firstElementChild;
  if (!holder) return "";
  scrub(holder);
  return holder.innerHTML;
}
