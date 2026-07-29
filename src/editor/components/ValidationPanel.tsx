import React from "react";
import { QuizSchema } from "../../schema/quiz.ts";
import type { QuizData } from "../../schema/quiz.ts";

interface ValidationPanelProps {
  data: QuizData;
}

export const ValidationPanel: React.FC<ValidationPanelProps> = ({ data }) => {
  const result = QuizSchema.safeParse(data);

  if (result.success) {
    return (
      <div
        style={{
          padding: "12px 16px",
          backgroundColor: "rgba(0, 255, 136, 0.1)",
          border: "1px solid #00ff88",
          borderRadius: "6px",
          color: "#00ff88",
          fontSize: "13px",
          marginBottom: "16px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <span>✅</span>
        <span>
          Quiz schema and referential integrity check: <strong>Valid</strong>
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "12px 16px",
        backgroundColor: "rgba(255, 77, 103, 0.1)",
        border: "1px solid #ff4d67",
        borderRadius: "6px",
        color: "#ff4d67",
        fontSize: "13px",
        marginBottom: "16px",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: "8px" }}>
        ⚠️ Validation Issues ({result.error.issues.length}):
      </div>
      <ul style={{ paddingLeft: "20px", margin: 0 }}>
        {result.error.issues.map((issue, idx) => (
          <li key={idx} style={{ marginBottom: "4px" }}>
            <span style={{ fontFamily: "monospace", opacity: 0.8 }}>
              {issue.path.join(".") || "(root)"}
            </span>
            : {issue.message}
          </li>
        ))}
      </ul>
    </div>
  );
};
