import React from "react";
import type { QuizData } from "../../schema/quiz.ts";

interface ConfigEditorProps {
  data: QuizData;
  onChange: (field: string, value: any) => void;
}

export const ConfigEditor: React.FC<ConfigEditorProps> = ({ data, onChange }) => {
  const config = data.config;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    onChange(name, value);
  };

  return (
    <div className="editor-card">
      <h3>Quiz Configuration</h3>

      <div className="editor-grid-3">
        <div>
          <label className="editor-label">Page Title</label>
          <input
            className="editor-input"
            name="pageTitle"
            value={config.pageTitle ?? ""}
            onChange={handleChange}
          />
        </div>

        <div>
          <label className="editor-label">Logo Title</label>
          <input
            className="editor-input"
            name="titleLogo"
            value={config.titleLogo ?? ""}
            onChange={handleChange}
          />
        </div>

        <div>
          <label className="editor-label">Visual Theme</label>
          <select
            className="editor-input"
            name="theme"
            value={config.theme ?? "cyberpunk"}
            onChange={(e) => onChange("theme", e.target.value)}
          >
            <option value="cyberpunk">Cyberpunk Terminal (Neon Green)</option>
            <option value="sugary">Sugary Pastel (Candy Pink & Coral)</option>
            <option value="laboratory">Laboratory Tech (Teal & Navy)</option>
            <option value="retro">Retro Monochrome (Amber CRT)</option>
          </select>
        </div>
      </div>

      <div className="editor-grid-2">
        <div>
          <label className="editor-label">Subtitle</label>
          <input
            className="editor-input"
            name="titleSub"
            value={config.titleSub ?? ""}
            onChange={handleChange}
          />
        </div>

        <div>
          <label className="editor-label">Master Final Code (A-Z only)</label>
          <input
            className="editor-input"
            name="finalCode"
            value={config.finalCode ?? ""}
            onChange={(e) => onChange("finalCode", e.target.value.toUpperCase())}
          />
        </div>
      </div>

      <div>
        <label className="editor-label">Mission Briefing Title</label>
        <input
          className="editor-input"
          name="missionBriefingTitle"
          value={config.missionBriefingTitle ?? ""}
          onChange={handleChange}
        />
      </div>

      <div>
        <label className="editor-label">Mission Briefing Text</label>
        <textarea
          className="editor-input"
          name="missionBriefingText"
          value={config.missionBriefingText ?? ""}
          onChange={handleChange}
        />
      </div>

      <div className="editor-grid-2">
        <div>
          <label className="editor-label">Victory Title</label>
          <input
            className="editor-input"
            name="victoryTitle"
            value={config.victoryTitle ?? ""}
            onChange={handleChange}
          />
        </div>

        <div>
          <label className="editor-label">Victory Subtitle</label>
          <input
            className="editor-input"
            name="victorySubtitle"
            value={config.victorySubtitle ?? ""}
            onChange={handleChange}
          />
        </div>
      </div>
    </div>
  );
};
