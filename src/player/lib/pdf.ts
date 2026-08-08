/**
 * Minimal PDF generator for score certificates.
 * Generates a valid PDF 1.4 binary/text document using standard fonts (Helvetica, Helvetica-Bold,
 * Helvetica-Oblique) without external dependencies.
 */

interface ScorePdfOptions {
  title: string;
  /** Left blank when the student did not enter one. */
  studentName: string;
  score: number;
  maxScore: number;
  rank: string;
  time: string;
  puzzlesCompleted: number;
  totalPuzzles: number;
  date: string;
  /**
   * One line per rank, e.g. "S: 95%+", already rendered in whatever unit this
   * quiz's rankMode uses. Kept ASCII-only -- see escapePdfText.
   */
  rankCriteria: string[];
}

/**
 * PDF text strings in this file's base-14 fonts are WinAnsi/Latin-1 -- each
 * character becomes exactly one byte via charCodeAt() below. Anything outside
 * that range (curly quotes, em dash, >=) would corrupt the stream, so callers
 * must stick to plain ASCII (or the odd Latin-1 punctuation like the middle
 * dot U+00B7, which happens to sit at the same byte in WinAnsi) in
 * student-supplied and generated text alike.
 */
function escapePdfText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/** A student can type anything; codepoints outside Latin-1 would corrupt the byte stream above. */
function toLatin1Safe(text: string): string {
  return Array.from(text)
    .map((ch) => ((ch.codePointAt(0) ?? 0) <= 0xff ? ch : "?"))
    .join("");
}

/**
 * Adobe's standard core-14 glyph widths (per 1000 em) for the printable ASCII
 * range, straight from the Helvetica/Helvetica-Bold AFM metrics. Needed to
 * centre text ourselves -- nothing else in a hand-rolled PDF will do it for
 * us. Helvetica-Oblique shares Helvetica's widths (it's just a shear).
 * Anything outside ASCII (rare in Latin-1 names) falls back to the em-average.
 */
const HELVETICA_WIDTHS: Record<string, number> = {
  " ": 278,
  "!": 278,
  '"': 355,
  "#": 556,
  $: 556,
  "%": 889,
  "&": 667,
  "'": 191,
  "(": 333,
  ")": 333,
  "*": 389,
  "+": 584,
  ",": 278,
  "-": 333,
  ".": 278,
  "/": 278,
  "0": 556,
  "1": 556,
  "2": 556,
  "3": 556,
  "4": 556,
  "5": 556,
  "6": 556,
  "7": 556,
  "8": 556,
  "9": 556,
  ":": 278,
  ";": 278,
  "<": 584,
  "=": 584,
  ">": 584,
  "?": 556,
  "@": 1015,
  A: 667,
  B: 667,
  C: 722,
  D: 722,
  E: 667,
  F: 611,
  G: 778,
  H: 722,
  I: 278,
  J: 500,
  K: 667,
  L: 556,
  M: 833,
  N: 722,
  O: 778,
  P: 667,
  Q: 778,
  R: 722,
  S: 667,
  T: 611,
  U: 722,
  V: 667,
  W: 944,
  X: 667,
  Y: 667,
  Z: 611,
  "[": 278,
  "\\": 278,
  "]": 278,
  "^": 469,
  _: 556,
  "`": 333,
  a: 556,
  b: 556,
  c: 500,
  d: 556,
  e: 556,
  f: 278,
  g: 556,
  h: 556,
  i: 222,
  j: 222,
  k: 500,
  l: 222,
  m: 833,
  n: 556,
  o: 556,
  p: 556,
  q: 556,
  r: 333,
  s: 500,
  t: 278,
  u: 556,
  v: 500,
  w: 722,
  x: 500,
  y: 500,
  z: 500,
  "{": 334,
  "|": 260,
  "}": 334,
  "~": 584,
  "·": 278,
};

const HELVETICA_BOLD_WIDTHS: Record<string, number> = {
  " ": 278,
  "!": 333,
  '"': 474,
  "#": 556,
  $: 556,
  "%": 889,
  "&": 722,
  "'": 238,
  "(": 333,
  ")": 333,
  "*": 389,
  "+": 584,
  ",": 278,
  "-": 333,
  ".": 278,
  "/": 278,
  "0": 556,
  "1": 556,
  "2": 556,
  "3": 556,
  "4": 556,
  "5": 556,
  "6": 556,
  "7": 556,
  "8": 556,
  "9": 556,
  ":": 333,
  ";": 333,
  "<": 584,
  "=": 584,
  ">": 584,
  "?": 611,
  "@": 975,
  A: 722,
  B: 722,
  C: 722,
  D: 722,
  E: 667,
  F: 611,
  G: 778,
  H: 722,
  I: 278,
  J: 556,
  K: 722,
  L: 611,
  M: 833,
  N: 722,
  O: 778,
  P: 667,
  Q: 778,
  R: 722,
  S: 667,
  T: 611,
  U: 722,
  V: 667,
  W: 944,
  X: 667,
  Y: 667,
  Z: 611,
  "[": 333,
  "\\": 278,
  "]": 333,
  "^": 584,
  _: 556,
  "`": 333,
  a: 556,
  b: 611,
  c: 556,
  d: 611,
  e: 556,
  f: 333,
  g: 611,
  h: 611,
  i: 278,
  j: 278,
  k: 556,
  l: 278,
  m: 889,
  n: 611,
  o: 611,
  p: 611,
  q: 611,
  r: 389,
  s: 556,
  t: 333,
  u: 611,
  v: 556,
  w: 778,
  x: 556,
  y: 556,
  z: 500,
  "{": 389,
  "|": 280,
  "}": 389,
  "~": 584,
  "·": 333,
};

function textWidthPt(text: string, bold: boolean, sizePt: number): number {
  const table = bold ? HELVETICA_BOLD_WIDTHS : HELVETICA_WIDTHS;
  let units = 0;
  for (const ch of text) units += table[ch] ?? 556;
  return (units / 1000) * sizePt;
}

/**
 * A student can type an arbitrarily long name; a fixed font size would run
 * it past the frame. Shrinks from `desired` down to `min` -- the largest size
 * at or below `desired` that still fits `maxWidth`.
 */
function fitSize(
  text: string,
  bold: boolean,
  desired: number,
  maxWidth: number,
  min: number,
): number {
  const widthAtOne = textWidthPt(text, bold, 1);
  if (widthAtOne <= 0) return desired;
  return Math.max(min, Math.min(desired, maxWidth / widthAtOne));
}

const PAGE_W = 595.28;
const PAGE_H = 841.89;

const INK = "0.06 0.09 0.16"; // near-black navy, matches the app's --text-primary on dark surfaces
const GREEN = "0.06 0.72 0.51"; // --green
const GREEN_DIM = "0.02 0.59 0.41"; // --green-dim
const MUTED = "0.42 0.45 0.5";
const FAINT = "0.55 0.57 0.61";

interface TextOpts {
  size: number;
  bold?: boolean;
  oblique?: boolean;
  color?: string;
  tracking?: number;
}

/** One line of text as a self-contained BT..ET block, centred on an arbitrary x. */
function textCenteredAt(text: string, centerX: number, y: number, opts: TextOpts): string {
  const font = opts.oblique ? "/F3" : opts.bold ? "/F2" : "/F1";
  const width = textWidthPt(text, Boolean(opts.bold), opts.size);
  const trackingExtra = opts.tracking ? opts.tracking * Math.max(0, text.length - 1) : 0;
  const x = centerX - (width + trackingExtra) / 2;
  const lines = ["BT", `${font} ${opts.size} Tf`, `${opts.color ?? INK} rg`];
  if (opts.tracking) lines.push(`${opts.tracking} Tc`);
  lines.push(`${x.toFixed(2)} ${y} Td (${escapePdfText(text)}) Tj`);
  if (opts.tracking) lines.push("0 Tc");
  lines.push("ET");
  return lines.join("\n");
}

/** One line of text centred on the page. */
function centeredText(text: string, y: number, opts: TextOpts): string {
  return textCenteredAt(text, PAGE_W / 2, y, opts);
}

function centeredRule(y: number, width: number, color: string, lineWidth: number): string {
  const x = (PAGE_W - width) / 2;
  return [
    `${color} RG`,
    `${lineWidth} w`,
    `${x.toFixed(2)} ${y} m ${(x + width).toFixed(2)} ${y} l S`,
  ].join("\n");
}

/** A circle approximated by 4 cubic Beziers -- there is no arc primitive in PDF path syntax. */
function circlePath(cx: number, cy: number, r: number): string {
  const k = r * 0.5523; // standard magic constant for a 4-curve circle approximation
  return [
    `${(cx + r).toFixed(2)} ${cy.toFixed(2)} m`,
    `${(cx + r).toFixed(2)} ${(cy + k).toFixed(2)} ${(cx + k).toFixed(2)} ${(cy + r).toFixed(2)} ${cx.toFixed(2)} ${(cy + r).toFixed(2)} c`,
    `${(cx - k).toFixed(2)} ${(cy + r).toFixed(2)} ${(cx - r).toFixed(2)} ${(cy + k).toFixed(2)} ${(cx - r).toFixed(2)} ${cy.toFixed(2)} c`,
    `${(cx - r).toFixed(2)} ${(cy - k).toFixed(2)} ${(cx - k).toFixed(2)} ${(cy - r).toFixed(2)} ${cx.toFixed(2)} ${(cy - r).toFixed(2)} c`,
    `${(cx + k).toFixed(2)} ${(cy - r).toFixed(2)} ${(cx + r).toFixed(2)} ${(cy - k).toFixed(2)} ${(cx + r).toFixed(2)} ${cy.toFixed(2)} c`,
    "h",
  ].join("\n");
}

/** A short L-shaped tick pointing into the frame from one of its four corners. */
function cornerBracket(x: number, y: number, dx: number, dy: number, len: number): string {
  return [
    `${x} ${(y + dy * len).toFixed(2)} m ${x} ${y} l ${(x + dx * len).toFixed(2)} ${y} l S`,
  ].join("\n");
}

export function generateScorePdf(options: ScorePdfOptions): Blob {
  const {
    title,
    studentName,
    score,
    maxScore,
    rank,
    time,
    puzzlesCompleted,
    totalPuzzles,
    date,
    rankCriteria,
  } = options;

  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const safeName = toLatin1Safe(studentName.trim() || "Student");
  const safeTitle = toLatin1Safe(title);

  const frameOuter = { x: 32, y: 32, w: PAGE_W - 64, h: PAGE_H - 64 };
  const frameInner = { x: 40, y: 40, w: PAGE_W - 80, h: PAGE_H - 80 };
  const contentLeft = 76;
  const contentRight = PAGE_W - 76;
  const contentWidth = contentRight - contentLeft;
  // A more generous width than the stat columns use, for the big centred
  // headline/name/title lines -- still well inside the decorative frame.
  const textSafeWidth = PAGE_W - 120;

  const sealCx = PAGE_W / 2;
  const sealCy = 553;
  const sealR = 46;

  const streamLines = [
    // Decorative double frame.
    `${INK} RG`,
    "2 w",
    `${frameOuter.x} ${frameOuter.y} ${frameOuter.w} ${frameOuter.h} re S`,
    `${GREEN} RG`,
    "0.75 w",
    `${frameInner.x} ${frameInner.y} ${frameInner.w} ${frameInner.h} re S`,

    // Corner flourishes, just inside the frame.
    `${INK} RG`,
    "1.2 w",
    cornerBracket(frameInner.x + 8, frameInner.y + frameInner.h - 8, 1, -1, 16),
    cornerBracket(frameInner.x + frameInner.w - 8, frameInner.y + frameInner.h - 8, -1, -1, 16),
    cornerBracket(frameInner.x + 8, frameInner.y + 8, 1, 1, 16),
    cornerBracket(frameInner.x + frameInner.w - 8, frameInner.y + 8, -1, 1, 16),

    // Eyebrow.
    centeredText("FOOD SAFETY ESCAPE ROOM  |  INTERACTIVE TRAINING SERIES", 774, {
      size: 9,
      color: FAINT,
      tracking: 1.2,
    }),

    // Headline.
    centeredText("CERTIFICATE OF ACHIEVEMENT", 741, {
      size: fitSize("CERTIFICATE OF ACHIEVEMENT", true, 27, textSafeWidth, 18),
      bold: true,
    }),
    centeredRule(722, 150, GREEN, 1.2),

    // Recipient -- the name is why this document exists, so it leads. A
    // student can type an arbitrarily long name, so this shrinks to fit
    // rather than running past the frame.
    centeredText(`Awarded to: ${safeName}`, 690, {
      size: fitSize(`Awarded to: ${safeName}`, true, 22, textSafeWidth, 13),
      bold: true,
      color: GREEN_DIM,
    }),
    centeredText(`for completing "${safeTitle}"`, 666, {
      size: fitSize(`for completing "${safeTitle}"`, false, 12.5, textSafeWidth, 9),
      oblique: true,
      color: MUTED,
    }),
    centeredText(`Date Completed: ${date}`, 645, { size: 11, color: MUTED }),

    // Grade seal: a double-ring badge like the in-app rank circle, with the
    // letter grade inside and the exact "GRADE: X" text as its caption.
    `${GREEN} RG`,
    "1.6 w",
    `${circlePath(sealCx, sealCy, sealR)} S`,
    `${circlePath(sealCx, sealCy, sealR - 6)} S`,
    centeredText(rank, sealCy - 16, { size: 40, bold: true, color: INK }),
    centeredText(`GRADE: ${rank}`, sealCy - sealR - 20, { size: 13, bold: true, color: GREEN_DIM }),

    // Divider between the ceremonial half and the detail half.
    `${FAINT} RG`,
    "0.6 w",
    `${contentLeft} 468 m ${contentRight} 468 l S`,

    // Performance summary, three columns.
    centeredText("PERFORMANCE SUMMARY", 442, { size: 10.5, bold: true, tracking: 1.2 }),
    ...(() => {
      const cols = [
        { label: "FINAL SCORE", value: `${score} / ${maxScore}` },
        { label: "TIME ELAPSED", value: time },
        { label: "RESULT", value: `${percentage}%` },
      ];
      const colW = contentWidth / cols.length;
      return cols.flatMap((col, i) => {
        const cx = contentLeft + colW * i + colW / 2;
        return [
          textCenteredAt(col.label, cx, 414, { size: 8, color: FAINT, tracking: 1 }),
          textCenteredAt(col.value, cx, 393, { size: 15, bold: true }),
        ];
      });
    })(),
    centeredText(`${puzzlesCompleted} of ${totalPuzzles} puzzles completed`, 368, {
      size: 8.5,
      color: FAINT,
    }),

    // Grade criteria -- what score bands map to which letter grade, so the
    // certificate itself explains what earned this rank. The achieved row is
    // bolded and coloured to match the "achieved" highlight on the web page.
    centeredText("GRADE CRITERIA", 322, { size: 10.5, bold: true, tracking: 1.2 }),
    ...rankCriteria.map((line, i) => {
      const achieved = line.startsWith(`${rank}:`);
      const y = 300 - i * 16;
      return centeredText(line, y, {
        size: 10.5,
        bold: achieved,
        color: achieved ? GREEN_DIM : MUTED,
      });
    }),

    // Signature-style footer.
    centeredRule(112, 170, FAINT, 0.6),
    centeredText("FOOD SAFETY ESCAPE ROOM PLATFORM", 98, { size: 9, bold: true, tracking: 1.2 }),
    centeredText("This certificate verifies completion of the learning modules and puzzles", 82, {
      size: 8.5,
      color: FAINT,
    }),
    centeredText("in the Food Safety Escape Room simulation platform.", 70, {
      size: 8.5,
      color: FAINT,
    }),
  ];

  const streamContent = streamLines.join("\n");
  const streamLength = String(
    Uint8Array.from(Array.from(streamContent).map((c) => c.charCodeAt(0))).length,
  );

  const objects = [
    // Obj 1: Catalog
    `1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj`,
    // Obj 2: Pages
    `2 0 obj\n<</Type /Pages /Kids [3 0 R] /Count 1>>\nendobj`,
    // Obj 3: Page
    `3 0 obj\n<</Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Contents 4 0 R /Resources <</Font <</F1 5 0 R /F2 6 0 R /F3 7 0 R>>>>>>\nendobj`,
    // Obj 4: Content Stream
    `4 0 obj\n<</Length ${streamLength}>>\nstream\n${streamContent}\nendstream\nendobj`,
    // Obj 5: Helvetica Font
    `5 0 obj\n<</Type /Font /Subtype /Type1 /BaseFont /Helvetica>>\nendobj`,
    // Obj 6: Helvetica-Bold Font
    `6 0 obj\n<</Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold>>\nendobj`,
    // Obj 7: Helvetica-Oblique Font
    `7 0 obj\n<</Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique>>\nendobj`,
  ];

  let header = "%PDF-1.4\n";
  let body = "";
  const offsets: number[] = [];

  let currentOffset = header.length;
  for (const obj of objects) {
    offsets.push(currentOffset);
    body += obj + "\n";
    currentOffset += obj.length + 1;
  }

  const xrefOffset = currentOffset;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    xref += String(off).padStart(10, "0") + " 00000 n \n";
  }

  const trailer = `trailer\n<</Size ${objects.length + 1} /Root 1 0 R>>\nstartxref\n${xrefOffset}\n%%EOF`;

  const pdfString = header + body + xref + trailer;

  return new Blob([pdfString], { type: "application/pdf" });
}
