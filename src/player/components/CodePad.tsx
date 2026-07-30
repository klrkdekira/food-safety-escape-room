import React from "react";

const LETTERS = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

interface CodePadProps {
  /** Number of slots to draw; the code length. */
  length: number;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  displayId: string;
  /** Replaces the slots outright, for the per-room "WRONG CODE" notice. */
  message?: string;
  /** Colours the display without replacing it, for accept/reject feedback. */
  tint?: string;
}

/**
 * The A-Z keypad shared by the per-room locks and the final override. Letters
 * only, capped at the code length, with Backspace and Enter wired up for anyone
 * using a physical keyboard.
 */
export const CodePad: React.FC<CodePadProps> = ({
  length,
  value,
  onChange,
  onSubmit,
  displayId,
  message,
  tint,
}) => {
  const press = (letter: string) => {
    if (value.length < length) onChange(value + letter);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      onChange(value.slice(0, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      onSubmit();
    } else if (/^[a-zA-Z]$/.test(e.key)) {
      e.preventDefault();
      press(e.key.toUpperCase());
    }
  };

  return (
    <div className="code-pad" onKeyDown={onKeyDown}>
      {/* One bordered cell per character. `.code-display` is a flex row, so the
          whitespace between cells is dropped and the gap comes from CSS. */}
      <div
        className={`code-display${message ? " plain" : ""}`}
        id={displayId}
        style={tint ? { color: tint } : undefined}
      >
        {message ??
          Array.from({ length }, (_, i) => (
            <span
              key={i}
              className={
                i < value.length ? "char entered" : i === value.length ? "char current" : "char"
              }
            >
              {i < value.length ? value[i] : ""}
            </span>
          ))}
      </div>

      <div className="code-buttons">
        {LETTERS.map((letter) => (
          <button type="button" className="code-btn" key={letter} onClick={() => press(letter)}>
            {letter}
          </button>
        ))}
      </div>

      <div className="code-actions">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => onChange(value.slice(0, -1))}
        >
          Back
        </button>
        <button type="button" className="btn-secondary" onClick={() => onChange("")}>
          Clear
        </button>
        <button type="button" className="btn-primary" onClick={onSubmit}>
          Enter
        </button>
      </div>
    </div>
  );
};
