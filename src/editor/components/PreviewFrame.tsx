import React, { useCallback, useEffect, useRef, useState } from "react";
import type { QuizData } from "../../schema/quiz.ts";

interface PreviewFrameProps {
  data: QuizData;
}

/**
 * Logical viewport the preview is laid out at, before being scaled to fit the
 * pane. An iframe is its own viewport, so a ~700px-wide pane would otherwise put
 * the player below its 768px breakpoint and show the author the phone layout on a
 * desktop. Rendering wide and scaling down shows the layout a player will get.
 */
const PREVIEW_WIDTH = 1280;

/**
 * The player, framed. An iframe rather than an inline mount: the game styles
 * itself against the full viewport with fixed-position overlays, which would
 * escape a split-pane container.
 */
export const PreviewFrame: React.FC<PreviewFrameProps> = ({ data }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [frameHeight, setFrameHeight] = useState(900);
  const dataRef = useRef(data);
  dataRef.current = data;

  // Track the pane so the scale factor survives window resizes and the frame's
  // logical height always fills it exactly.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width <= 0 || height <= 0) return;
      const next = width / PREVIEW_WIDTH;
      setScale(next);
      setFrameHeight(height / next);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const postDraft = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "UPDATE_QUIZ_DATA", data: dataRef.current },
      window.location.origin,
    );
  }, []);

  useEffect(() => {
    postDraft();
  }, [data, postDraft]);

  // The frame usually finishes loading after the first draft has been posted, so
  // it asks for a resend on mount. Without this the preview sat blank until the
  // author's next keystroke.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (
        e.origin === window.location.origin &&
        e.source === iframeRef.current?.contentWindow &&
        typeof e.data === "object" &&
        e.data !== null &&
        e.data.type === "PREVIEW_READY"
      ) {
        postDraft();
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [postDraft]);

  const previewSrc = `${import.meta.env.BASE_URL || "/"}preview`.replace(/\/{2,}/g, "/");

  return (
    <div className="preview-pane">
      <div className="preview-header">
        <span className="preview-title">Live preview</span>
        <span className="preview-hint">
          {PREVIEW_WIDTH}px wide &middot; {Math.round(scale * 100)}%
        </span>
      </div>
      <div className="preview-viewport" ref={viewportRef}>
        <iframe
          ref={iframeRef}
          src={previewSrc}
          title="Live Escape Room Preview"
          style={{
            width: `${PREVIEW_WIDTH}px`,
            height: `${frameHeight}px`,
            transform: `scale(${scale})`,
          }}
        />
      </div>
    </div>
  );
};
