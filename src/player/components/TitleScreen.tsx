import { Link } from "@tanstack/react-router";
import React, { useState } from "react";
import { useGame } from "../GameContext.ts";
import {
  clearSavedState,
  hasSavedState,
  loadBestScore,
  loadSavedState,
  loadStudentName,
  saveStudentName,
} from "../lib/storage.ts";
import type { QuizManifestItem } from "../types.ts";
import { RichText } from "./RichText.tsx";

export const TitleScreen: React.FC<{ quizzes: QuizManifestItem[] }> = ({ quizzes }) => {
  const { dispatch, ctx, quizId, preview } = useGame();
  const { config } = ctx.quiz;

  const [best, setBest] = useState(() => (preview ? {} : loadBestScore(quizId)));
  const [hasSave, setHasSave] = useState(() => !preview && (hasSavedState(quizId) || !!best.score));
  const [cleared, setCleared] = useState(false);
  const [studentName, setStudentName] = useState(() => (preview ? "" : loadStudentName()));

  const onNameChange = (value: string) => {
    setStudentName(value);
    if (!preview) saveStudentName(value);
  };

  const onStart = () => {
    dispatch({ type: "START", saved: preview ? null : loadSavedState(quizId) });
  };

  const onClearSave = () => {
    clearSavedState(quizId);
    setBest({});
    setHasSave(false);
    setCleared(true);
    dispatch({ type: "RESET" });
  };

  return (
    <div id="title-screen" className="screen active">
      <div className="title-logo" id="title-logo">
        {config.titleLogo}
      </div>
      <div className="title-sub" id="title-sub">
        {config.titleSub}
      </div>
      <div className="title-divider"></div>

      {best.score != null && (
        <div id="best-score-display" className="best-score">
          Best: <strong id="best-score-val">{best.score}</strong> pts in{" "}
          <strong id="best-time-val">{best.time || "--:--"}</strong>
        </div>
      )}

      <div className="title-instructions" id="title-instructions">
        <strong>{config.missionBriefingTitle}</strong>
        <RichText text={config.missionBriefingText} />
      </div>

      <div className="title-name-field">
        <label htmlFor="student-name-input">Your name</label>
        <input
          type="text"
          id="student-name-input"
          className="title-name-input"
          placeholder="Enter your name"
          value={studentName}
          maxLength={80}
          autoComplete="name"
          onChange={(e) => onNameChange(e.target.value)}
        />
      </div>

      <div className="title-actions">
        <button type="button" className="btn-primary" onClick={onStart}>
          {hasSave ? "Resume mission" : "Begin mission"}
        </button>
        {hasSave && (
          <button
            type="button"
            className="btn-secondary btn-danger"
            id="btn-clear-save"
            onClick={onClearSave}
            disabled={cleared}
          >
            {cleared ? "Progress cleared" : "Clear progress"}
          </button>
        )}
      </div>

      {config.musicUrl && config.musicAttribution && (
        <div className="music-credit">Music: {config.musicAttribution}</div>
      )}

      {/* Switching quiz is a navigation, not a page reload rewriting ?quiz=. */}
      {!preview && quizzes.length > 1 && (
        <div id="quiz-selector-container" className="title-switcher">
          <div className="eyebrow">Other rooms</div>
          <div id="quiz-selector-list" className="quiz-list">
            {quizzes.map((item) => (
              <Link
                to="/play/$quizId"
                params={{ quizId: item.id }}
                key={item.id}
                className="quiz-card"
                aria-current={item.id === quizId}
              >
                <div className="quiz-card-header">
                  <div className="quiz-card-title">{item.titleLogo || item.pageTitle}</div>
                  <span className="quiz-card-arrow" aria-hidden="true">
                    ↗
                  </span>
                </div>
                <div className="quiz-card-sub">{item.titleSub}</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
