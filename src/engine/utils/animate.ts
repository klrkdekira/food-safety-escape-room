/**
 * Entry animations via the native Web Animations API.
 *
 * These used to come from GSAP loaded off a CDN, which cost a `script-src`
 * allowance in the CSP and left the offline single-file bundles reaching for the
 * network. The effects are simple fades and transforms, so the platform API
 * covers them with no dependency.
 *
 * Honours `prefers-reduced-motion`: the element is left at its final state.
 */

const EASE = "cubic-bezier(0.25, 0.46, 0.45, 0.94)"; // ~ power2.out

function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

interface FadeOptions {
  /** Pixels to travel upward into place. */
  y?: number;
  /** Starting scale, for the victory panel. */
  scale?: number;
  durationMs?: number;
  delayMs?: number;
}

export function fadeIn(el: Element | null, options: FadeOptions = {}): void {
  if (!el) return;
  const { y = 0, scale, durationMs = 400, delayMs = 0 } = options;
  if (prefersReducedMotion() || typeof el.animate !== "function") return;

  const from: Keyframe = { opacity: "0" };
  const to: Keyframe = { opacity: "1" };
  const transforms: string[] = [];
  if (y) transforms.push(`translateY(${y}px)`);
  if (scale != null) transforms.push(`scale(${scale})`);
  if (transforms.length > 0) {
    from.transform = transforms.join(" ");
    to.transform = "none";
  }

  el.animate([from, to], {
    duration: durationMs,
    delay: delayMs,
    easing: EASE,
    fill: "backwards",
  });
}
