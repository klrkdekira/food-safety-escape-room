import React, { useEffect, useMemo, useRef } from "react";
import { useGame } from "../GameContext.ts";
import { fadeIn } from "../lib/animate.ts";
import { generateScorePdf } from "../lib/pdf.ts";
import { computeBloomBreakdown, formatTime, maxScore, resolveRank } from "../lib/quiz.ts";
import { RichText } from "./RichText.tsx";

export const Victory: React.FC = () => {
  const { state, dispatch, ctx, quizId } = useGame();
  const { config } = ctx.quiz;
  const screenRef = useRef<HTMLDivElement>(null);
  const rankRef = useRef<HTMLDivElement>(null);

  const rank = resolveRank(ctx.config, state.score, maxScore(ctx.quiz));
  const timeStr = formatTime(state.timeElapsed);
  const bloomBreakdown = useMemo(
    () => computeBloomBreakdown(ctx.quiz, state.results),
    [ctx.quiz, state.results],
  );

  useEffect(() => {
    window.scrollTo(0, 0);
    fadeIn(screenRef.current, { scale: 0.9, durationMs: 800 });
    fadeIn(rankRef.current, { y: 20, durationMs: 500, delayMs: 300 });
  }, []);

  const downloadPdf = () => {
    const totalMax = maxScore(ctx.quiz);
    const pdfBlob = generateScorePdf({
      title: config.pageTitle,
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
            const pct =
              stat.totalPuzzles > 0 ? Math.round((stat.correctCount / stat.totalPuzzles) * 100) : 0;
            return (
              <div className="bloom-row" key={stat.level}>
                <div className="bloom-row-label">{stat.label}</div>
                <div className="bloom-row-track">
                  <div className="bloom-row-fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="bloom-row-value">
                  {stat.correctCount}/{stat.totalPuzzles}
                </div>
              </div>
            );
          })}
        </div>
      )}

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
