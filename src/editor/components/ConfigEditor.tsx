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

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    backgroundColor: "#1a2538",
    border: "1px solid #233148",
    borderRadius: "4px",
    color: "#e2e8f0",
    fontSize: "14px",
    marginBottom: "12px",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "12px",
    fontWeight: 600,
    color: "#94a3b8",
    marginBottom: "4px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  };

  return (
    <div
      style={{
        backgroundColor: "#141c2b",
        padding: "16px",
        borderRadius: "6px",
        marginBottom: "16px",
      }}
    >
      <h3 style={{ fontSize: "15px", color: "#00ff88", marginBottom: "16px" }}>
        Quiz Configuration
      </h3>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
        <div>
          <label style={labelStyle}>Page Title</label>
          <input
            style={inputStyle}
            name="pageTitle"
            value={config.pageTitle ?? ""}
            onChange={handleChange}
          />
        </div>

        <div>
          <label style={labelStyle}>Logo Title</label>
          <input
            style={inputStyle}
            name="titleLogo"
            value={config.titleLogo ?? ""}
            onChange={handleChange}
          />
        </div>

        <div>
          <label style={labelStyle}>Visual Theme</label>
          <select
            style={inputStyle}
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <div>
          <label style={labelStyle}>Subtitle</label>
          <input
            style={inputStyle}
            name="titleSub"
            value={config.titleSub ?? ""}
            onChange={handleChange}
          />
        </div>

        <div>
          <label style={labelStyle}>Master Final Code (A-Z only)</label>
          <input
            style={inputStyle}
            name="finalCode"
            value={config.finalCode ?? ""}
            onChange={(e) => onChange("finalCode", e.target.value.toUpperCase())}
          />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Mission Briefing Title</label>
        <input
          style={inputStyle}
          name="missionBriefingTitle"
          value={config.missionBriefingTitle ?? ""}
          onChange={handleChange}
        />
      </div>

      <div>
        <label style={labelStyle}>Mission Briefing Text</label>
        <textarea
          style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }}
          name="missionBriefingText"
          value={config.missionBriefingText ?? ""}
          onChange={handleChange}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <div>
          <label style={labelStyle}>Victory Title</label>
          <input
            style={inputStyle}
            name="victoryTitle"
            value={config.victoryTitle ?? ""}
            onChange={handleChange}
          />
        </div>

        <div>
          <label style={labelStyle}>Victory Subtitle</label>
          <input
            style={inputStyle}
            name="victorySubtitle"
            value={config.victorySubtitle ?? ""}
            onChange={handleChange}
          />
        </div>
      </div>
    </div>
  );
};
