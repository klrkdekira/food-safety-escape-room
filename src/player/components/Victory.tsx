import React, { useEffect, useMemo, useRef } from "react";
import { useGame } from "../GameContext.ts";
import { fadeIn } from "../lib/animate.ts";
import { generateScorePdf } from "../lib/pdf.ts";
import {
  computeBloomBreakdown,
  formatRankCriteria,
  formatTime,
  maxScore,
  rankThresholds,
  rankValue,
  resolveRank,
} from "../lib/quiz.ts";
import { loadStudentName } from "../lib/storage.ts";
import { RichText } from "./RichText.tsx";

export const Victory: React.FC = () => {
  const { state, dispatch, ctx, quizId, preview } = useGame();
  const { config } = ctx.quiz;
  const screenRef = useRef<HTMLDivElement>(null);
  const rankRef = useRef<HTMLDivElement>(null);

  const totalMax = maxScore(ctx.quiz);
  const rank = resolveRank(ctx.config, state.score, totalMax);
  const timeStr = formatTime(state.timeElapsed);
  const studentName = preview ? "" : loadStudentName();
  const bloomBreakdown = useMemo(
    () => computeBloomBreakdown(ctx.quiz, state.results, state.puzzleAttempts),
    [ctx.quiz, state.results, state.puzzleAttempts],
  );
  const thresholds = rankThresholds(ctx.config);
  const yourValue = rankValue(ctx.config, state.score, totalMax);
  const rankCriteria = useMemo(() => formatRankCriteria(ctx.config), [ctx.config]);

  useEffect(() => {
    window.scrollTo(0, 0);
    fadeIn(screenRef.current, { scale: 0.9, durationMs: 800 });
    fadeIn(rankRef.current, { y: 20, durationMs: 500, delayMs: 300 });
  }, []);

  const downloadPdf = () => {
    const pdfBlob = generateScorePdf({
      title: config.pageTitle,
      studentName,
      score: state.score,
      maxScore: totalMax,
      rank,
      time: timeStr,
      puzzlesCompleted: state.puzzlesCompleted,
      totalPuzzles: ctx.totalPuzzles,
      date: new Date().toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      rankCriteria,
    });

    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `score-certificate-${quizId}-${Date.now()}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="victory-screen" className="screen active" ref={screenRef}>
      <div className="victory-stamp">Training record complete</div>
      <div className="victory-title" id="victory-title">
        {config.victoryTitle ?? ""}
      </div>
      <div className="victory-subtitle" id="victory-subtitle">
        {config.victorySubtitle ?? ""}
      </div>
      <div className={`victory-rank ${rank.toLowerCase()}`} id="victory-rank" ref={rankRef}>
        {rank}
      </div>

      {studentName && (
        <div className="victory-recipient" id="victory-recipient">
          Certified to <strong>{studentName}</strong>
        </div>
      )}

      <div className="victory-stats">
        <div className="victory-stat">
          <div className="victory-stat-label">Final score</div>
          <div className="victory-stat-value" id="victory-score">
            {state.score}
          </div>
        </div>
        <div className="victory-stat">
          <div className="victory-stat-label">Time elapsed</div>
          <div className="victory-stat-value" id="victory-time">
            {timeStr}
          </div>
        </div>
        <div className="victory-stat">
          <div className="victory-stat-label">Puzzles solved</div>
          <div className="victory-stat-value" id="victory-puzzles">
            {state.puzzlesCompleted}/{ctx.totalPuzzles}
          </div>
        </div>
      </div>

      {bloomBreakdown.length > 0 && (
        <div className="victory-bloom" id="victory-bloom">
          <div className="victory-bloom-title">Cognitive skill record</div>
          {bloomBreakdown.map((stat) => {
            // Every puzzle must be solved to finish the quiz, so a correct-count
            // fraction is always N/N -- uninformative. The aggregate score (full
            // credit vs. the half credit a retry earns) is what actually varies.
            const pct =
              stat.maxPoints > 0 ? Math.round((stat.earnedPoints / stat.maxPoints) * 100) : 0;
            return (
              <div className="bloom-row" key={stat.level}>
                <div className="bloom-row-label">{stat.label}</div>
                <div className="bloom-row-track">
                  <div className="bloom-row-fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="bloom-row-value">{pct}%</div>
                <div className="bloom-row-meta">
                  {stat.mistakes} mistake{stat.mistakes === 1 ? "" : "s"} ·{" "}
                  {formatTime(stat.timeSpentSeconds)} spent
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="victory-criteria" id="victory-criteria">
        <div className="victory-criteria-title">Grade criteria</div>
        <div className="criteria-your-result">
          Your result:{" "}
          {ctx.config.rankMode === "percent" ? `${Math.round(yourValue)}%` : state.score}
        </div>
        {thresholds.map((t) => (
          <div
            className={`criteria-row${t.rank === rank ? " achieved" : ""}`}
            key={t.rank}
            id={`criteria-row-${t.rank}`}
          >
            <span className="criteria-rank">{t.rank}</span>
            <span className="criteria-req">
              {t.min}
              {ctx.config.rankMode === "percent" ? "%" : " pts"} or higher
            </span>
            {t.rank === rank && <span className="criteria-you-badge">Your grade</span>}
          </div>
        ))}
      </div>

      <RichText id="victory-text" className="victory-text" text={config.victoryText} />

      <div className="victory-actions">
        <button type="button" className="btn-primary" onClick={() => dispatch({ type: "RESET" })}>
          Play again
        </button>
        <button type="button" className="btn-secondary" onClick={downloadPdf}>
          Download score record
        </button>
      </div>
    </div>
  );
};
