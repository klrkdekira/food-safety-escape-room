import React, { useEffect, useRef } from "react";
import type { GameState } from "../types.ts";

/**
 * The one always-mounted live region. Result banners are not focused, so without
 * this a screen reader user gets no feedback that an answer was accepted.
 *
 * The text is written imperatively: a screen reader does not re-announce a region
 * whose content it already read, so identical consecutive messages (two wrong
 * answers in a row) need a clear-then-set cycle to speak twice.
 */
export const LiveRegion: React.FC<{ announcement: GameState["announcement"] }> = ({
  announcement,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !announcement.text) return;
    el.textContent = "";
    const timer = setTimeout(() => {
      el.textContent = announcement.text;
    }, 50);
    return () => clearTimeout(timer);
  }, [announcement]);

  return (
    <div
      id="live-region"
      ref={ref}
      role="status"
      aria-live="polite"
      style={{
        position: "absolute",
        width: "1px",
        height: "1px",
        overflow: "hidden",
        clip: "rect(0,0,0,0)",
        margin: "-1px",
      }}
    />
  );
};
