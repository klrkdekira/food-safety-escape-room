import React, { useEffect, useRef } from "react";
import type { QuizData } from "../../schema/quiz.ts";

interface PreviewFrameProps {
  data: QuizData;
}

export const PreviewFrame: React.FC<PreviewFrameProps> = ({ data }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: "UPDATE_QUIZ_DATA", data }, "*");
    }
  }, [data]);

  const previewSrc = import.meta.env.DEV ? "/index.html" : "../index.html";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderLeft: "1px solid #233148",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "10px 16px",
          backgroundColor: "#141c2b",
          borderBottom: "1px solid #233148",
          fontSize: "12px",
          fontWeight: 600,
          color: "#00ff88",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>LIVE PREVIEW</span>
        <span style={{ color: "#94a3b8", fontWeight: 400 }}>Syncs on edit</span>
      </div>
      <iframe
        ref={iframeRef}
        src={previewSrc}
        title="Live Escape Room Preview"
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          backgroundColor: "#0a0e17",
        }}
      />
    </div>
  );
};
