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
      <div className="editor-alert editor-alert-ok" role="status">
        Schema and referential integrity: <strong>valid</strong>
      </div>
    );
  }

  return (
    <div className="editor-alert editor-alert-error" role="alert">
      <strong>
        {result.error.issues.length} validation{" "}
        {result.error.issues.length === 1 ? "issue" : "issues"}
      </strong>
      <ul>
        {result.error.issues.map((issue, idx) => (
          <li key={idx}>
            <code>{issue.path.join(".") || "(root)"}</code>: {issue.message}
          </li>
        ))}
      </ul>
    </div>
  );
};
