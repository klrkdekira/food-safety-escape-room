/**
 * Minimal PDF generator for score certificates.
 * Generates a valid PDF 1.4 binary/text document using standard fonts (Helvetica, Helvetica-Bold)
 * without external dependencies.
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
 * must stick to plain ASCII in student-supplied and generated text alike.
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

  // Building PDF stream content
  // Page geometry: 595.28 x 841.89 pt (A4 portrait)
  const streamLines = [
    "BT",
    // Outer border box
    "0.2 0.4 0.3 RG",
    "2 w",
    "40 40 515.28 761.89 re S",
    "45 45 505.28 751.89 re S",
    // Title header
    "/F2 26 Tf",
    "0.1 0.1 0.2 rg",
    `100 730 Td (${escapePdfText("CERTIFICATE OF COMPLETION")}) Tj`,
    "ET",
    "BT",
    "/F1 12 Tf",
    "0.4 0.4 0.4 rg",
    `100 705 Td (${escapePdfText("Food Safety Escape Room Experience")}) Tj`,
    "ET",
    // Recipient -- the name is why this document exists, so it leads the
    // quiz title rather than trailing after it.
    "BT",
    "/F2 20 Tf",
    "0.1 0.2 0.4 rg",
    `100 668 Td (${escapePdfText(`Awarded to: ${safeName}`)}) Tj`,
    "ET",
    "BT",
    "/F1 13 Tf",
    "0.3 0.3 0.3 rg",
    `100 642 Td (${escapePdfText(`for completing: ${title}`)}) Tj`,
    "ET",
    // Divider line
    "BT",
    "/F1 12 Tf",
    "0.3 0.3 0.3 rg",
    `100 615 Td (${escapePdfText(`Date Completed: ${date}`)}) Tj`,
    "ET",
    // Grade / Rank Box
    "BT",
    "/F2 48 Tf",
    "0.1 0.5 0.3 rg",
    `100 525 Td (${escapePdfText(`GRADE: ${rank}`)}) Tj`,
    "ET",
    // Statistics breakdown
    "BT",
    "/F2 14 Tf",
    "0.2 0.2 0.2 rg",
    `100 455 Td (${escapePdfText("PERFORMANCE SUMMARY")}) Tj`,
    "ET",
    "BT",
    "/F1 12 Tf",
    "0.3 0.3 0.3 rg",
    `100 425 Td (${escapePdfText(`Final Score: ${score} / ${maxScore} (${percentage}%)`)}) Tj`,
    `0 -25 Td (${escapePdfText(`Time Elapsed: ${time}`)}) Tj`,
    `0 -25 Td (${escapePdfText(`Puzzles Solved: ${puzzlesCompleted} / ${totalPuzzles}`)}) Tj`,
    "ET",
    // Grade criteria -- what score bands map to which letter grade, so the
    // certificate itself explains what earned this rank.
    "BT",
    "/F2 12 Tf",
    "0.2 0.2 0.2 rg",
    "100 335 Td (GRADE CRITERIA) Tj",
    "ET",
    "BT",
    "/F1 11 Tf",
    "0.3 0.3 0.3 rg",
    `100 315 Td (${escapePdfText(rankCriteria[0] ?? "")}) Tj`,
    ...rankCriteria.slice(1).map((line) => `0 -18 Td (${escapePdfText(line)}) Tj`),
    "ET",
    // Footer / Verification statement
    "BT",
    "/F1 10 Tf",
    "0.5 0.5 0.5 rg",
    `100 120 Td (${escapePdfText("This certificate verifies completion of the learning modules and puzzles")}) Tj`,
    `0 -15 Td (${escapePdfText("in the Food Safety Escape Room simulation platform.")}) Tj`,
    "ET",
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
    `3 0 obj\n<</Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Contents 4 0 R /Resources <</Font <</F1 5 0 R /F2 6 0 R>>>>>>\nendobj`,
    // Obj 4: Content Stream
    `4 0 obj\n<</Length ${streamLength}>>\nstream\n${streamContent}\nendstream\nendobj`,
    // Obj 5: Helvetica Font
    `5 0 obj\n<</Type /Font /Subtype /Type1 /BaseFont /Helvetica>>\nendobj`,
    // Obj 6: Helvetica-Bold Font
    `6 0 obj\n<</Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold>>\nendobj`,
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
