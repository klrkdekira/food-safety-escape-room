import React from "react";
import {
  DEFAULT_MUSIC_ATTRIBUTION,
  DEFAULT_MUSIC_URL,
  DEFAULT_MUSIC_VOLUME,
} from "../../lib/musicDefaults.ts";
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

      <div className="editor-subcard">
        <div className="editor-row">
          <label className="editor-label" style={{ marginBottom: 0 }}>
            Background Music
          </label>
          <button
            type="button"
            className="editor-btn editor-shrink"
            onClick={() => {
              onChange("musicUrl", DEFAULT_MUSIC_URL);
              onChange("musicVolume", DEFAULT_MUSIC_VOLUME);
              onChange("musicAttribution", DEFAULT_MUSIC_ATTRIBUTION);
            }}
          >
            Use default track (CC BY 3.0)
          </button>
          {config.musicUrl && (
            <button
              type="button"
              className="editor-btn btn-danger editor-shrink"
              onClick={() => {
                onChange("musicUrl", undefined);
                onChange("musicVolume", undefined);
                onChange("musicAttribution", undefined);
              }}
            >
              Remove
            </button>
          )}
        </div>

        <div className="editor-grid-2">
          <div>
            <label className="editor-label">Track URL (site-local path or HTTPS)</label>
            <input
              className="editor-input"
              name="musicUrl"
              placeholder="/audio/track.mp3"
              value={config.musicUrl ?? ""}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="editor-label">
              Volume ({Math.round((config.musicVolume ?? DEFAULT_MUSIC_VOLUME) * 100)}%)
            </label>
            <input
              type="range"
              className="editor-input"
              min={0}
              max={1}
              step={0.05}
              value={config.musicVolume ?? DEFAULT_MUSIC_VOLUME}
              onChange={(e) => onChange("musicVolume", Number(e.target.value))}
            />
          </div>
        </div>

        <div>
          <label className="editor-label">
            Attribution (required if the track URL is HTTPS, not a site-local path)
          </label>
          <input
            className="editor-input"
            name="musicAttribution"
            placeholder='"Track title" by Artist, licensed under CC BY ...'
            value={config.musicAttribution ?? ""}
            onChange={handleChange}
          />
        </div>

        {config.musicUrl && (
          <div>
            <label className="editor-label">Preview</label>
            <audio className="editor-audio-preview" controls src={config.musicUrl} />
          </div>
        )}
      </div>
    </div>
  );
};
