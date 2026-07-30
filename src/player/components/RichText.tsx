import React, { useMemo } from "react";
import { sanitizeRichText } from "../lib/richText.ts";

interface RichTextProps {
  text: string | undefined | null;
  /** Element to render. Keep it a block: authored prose contains <p> and <ul>. */
  as?: "div" | "li";
  className?: string;
  style?: React.CSSProperties;
  id?: string;
}

/**
 * Renders an authored prose field as sanitized HTML. Always goes through
 * sanitizeRichText() -- never pass a quiz string to dangerouslySetInnerHTML
 * directly.
 */
export const RichText: React.FC<RichTextProps> = ({
  text,
  as: Tag = "div",
  className,
  style,
  id,
}) => {
  const html = useMemo(() => sanitizeRichText(text), [text]);
  // `rich-text` restores paragraph spacing and list markers, which the global
  // `* { margin: 0; padding: 0 }` reset in style.css strips from authored prose.
  return (
    <Tag
      id={id}
      className={["rich-text", className].filter(Boolean).join(" ")}
      style={style}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
