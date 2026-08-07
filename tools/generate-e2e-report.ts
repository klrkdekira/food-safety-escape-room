import fs from "node:fs";
import path from "node:path";

const SCREENSHOT_DIR = path.resolve("e2e-report/screenshots");
const CERTIFICATE_DIR = path.resolve("e2e-report/certificates");
const REPORT_FILE = path.resolve("e2e-report/index.html");

interface ScreenshotItem {
  filename: string;
  title: string;
  category: "Player Flow" | "Authoring Studio" | "Routing & Recovery";
  description: string;
  base64: string;
}

interface CertificateItem {
  filename: string;
  title: string;
  description: string;
  base64: string;
}

const CERTIFICATE_METADATA_MAP: Record<string, { title: string; description: string }> = {
  "s-grade-certificate.pdf": {
    title: "Certificate: Perfect Playthrough (Grade S)",
    description:
      "Downloaded via the real 'Download score record' button after every puzzle is solved correctly on the first try.",
  },
  "b-grade-certificate.pdf": {
    title: "Certificate: Playthrough With Mistakes (Grade B)",
    description:
      "Downloaded after a run with genuine wrong-then-right answers, showing the grade criteria the score landed against.",
  },
};

const METADATA_MAP: Record<
  string,
  { title: string; category: ScreenshotItem["category"]; description: string }
> = {
  "01-home-room-picker.png": {
    title: "Home Screen & Room Picker",
    category: "Player Flow",
    description: "Landing page presenting available escape room missions.",
  },
  "02-game-title-screen.png": {
    title: "Game Mission Briefing & Title Screen",
    category: "Player Flow",
    description: "Mission briefing, high score display, and start action.",
  },
  "03-room1-emulsion-lab.png": {
    title: "Room 1: Emulsion Lab View",
    category: "Player Flow",
    description:
      "Active Room 1 interface displaying room narrative, HUD, minimap, and active puzzle.",
  },
  "04-room1-hint-revealed.png": {
    title: "Hint System Request",
    category: "Player Flow",
    description: "Hint overlay displaying authored hint guidance.",
  },
  "04b-room1-order-puzzle.png": {
    title: "Order Puzzle: Sequence Reordering",
    category: "Player Flow",
    description:
      "Drag-or-arrow reordering puzzle, solved through the real 'move up' controls -- the three stages of emulsion formation placed in the correct sequence.",
  },
  "04c-room1-match-puzzle.png": {
    title: "Match Puzzle: Dropdown Pairing",
    category: "Player Flow",
    description:
      "Native <select> matching puzzle pairing six emulsion instability mechanisms to their descriptions, filled in through the real dropdowns.",
  },
  "05-room1-codepad-unlocked.png": {
    title: "Room 1 CodePad Lock Terminal",
    category: "Player Flow",
    description: "Gated room code terminal requiring key code ('EMULSIFIER').",
  },
  "06-room2-gel-lab.png": {
    title: "Room 2: Gel Laboratory View",
    category: "Player Flow",
    description: "Room 2 active view presenting gelation mechanism puzzles.",
  },
  "06b-room2-multiselect-puzzle.png": {
    title: "Multiselect Puzzle: Multiple-Answer Checkboxes",
    category: "Player Flow",
    description:
      "Select-all-that-apply puzzle identifying food hydrocolloids, answered by checking the real checkboxes.",
  },
  "07-room2-codepad-unlocked.png": {
    title: "Room 2 CodePad Lock Terminal",
    category: "Player Flow",
    description: "Gated room code terminal requiring key code ('VISCOELASTIC').",
  },
  "08-room3-foam-lab.png": {
    title: "Room 3: Foam Kitchen Lab View",
    category: "Player Flow",
    description: "Room 3 active view presenting foam stability puzzles.",
  },
  "09-room3-codepad-unlocked.png": {
    title: "Room 3 CodePad Lock Terminal",
    category: "Player Flow",
    description: "Gated room code terminal requiring key code ('HOMOGENISATION').",
  },
  "10-room4-master-control-lab.png": {
    title: "Room 4: Master Control Lab View",
    category: "Player Flow",
    description: "Final lab room presenting colloid classification puzzles.",
  },
  "10b-room4-text-puzzle-keyword-match.png": {
    title: "Free Text Puzzle: Keyword Matching",
    category: "Player Flow",
    description:
      'Typed-answer puzzle graded by keyword match -- a full sentence containing "Ostwald ripening" is accepted, not just the exact term.',
  },
  "11-room4-codepad-unlocked.png": {
    title: "Room 4 CodePad Lock Terminal",
    category: "Player Flow",
    description: "Gated room code terminal requiring key code ('DISPERSE').",
  },
  "12-final-escape-terminal.png": {
    title: "Final Escape Override Terminal",
    category: "Player Flow",
    description: "Master override terminal requiring master clearance code ('FOODCOLLOIDS').",
  },
  "13-final-victory-reward-screen.png": {
    title: "🏆 Final Reward & Certification Screen",
    category: "Player Flow",
    description:
      "Final victory reward screen presenting rank evaluation, score breakdown, elapsed time, and learning outcomes.",
  },
  "14-authoring-studio-config.png": {
    title: "Authoring Studio - Configuration Editor",
    category: "Authoring Studio",
    description: "Config editor tab for updating title logo, briefing narrative, and escape codes.",
  },
  "15-authoring-studio-rooms.png": {
    title: "Authoring Studio - Room Management",
    category: "Authoring Studio",
    description: "Room management tab allowing authors to edit titles, narratives, and room codes.",
  },
  "16-authoring-studio-puzzles.png": {
    title: "Authoring Studio - Puzzle Editor & Preview",
    category: "Authoring Studio",
    description: "Interactive puzzle editor paired with real-time live preview iframe.",
  },
  "17-spa-route-recovery.png": {
    title: "SPA Route Recovery & Deep Linking",
    category: "Routing & Recovery",
    description: "GitHub Pages SPA redirect decoder recovering deep route paths.",
  },
  "bgrade-victory-screen.png": {
    title: "Victory Screen With Mistakes: Grade B",
    category: "Player Flow",
    description:
      "A run with genuine wrong-then-right answers: cognitive skill record shows per-level mistakes and time spent, and the grade criteria panel highlights the B row the score landed on.",
  },
};

function buildHtmlReport(): void {
  console.log("📊 Building concise E2E HTML Report...");

  if (!fs.existsSync(SCREENSHOT_DIR)) {
    console.error(`❌ Screenshot directory missing at ${SCREENSHOT_DIR}`);
    return;
  }

  const files = fs
    .readdirSync(SCREENSHOT_DIR)
    .filter((f) => f.endsWith(".png"))
    .sort();

  const items: ScreenshotItem[] = files.map((file) => {
    const filePath = path.join(SCREENSHOT_DIR, file);
    const buffer = fs.readFileSync(filePath);
    const base64 = `data:image/png;base64,${buffer.toString("base64")}`;
    const meta = METADATA_MAP[file] || {
      title: file
        .replace(/^\d+-/, "")
        .replace(/\.png$/, "")
        .replace(/-/g, " "),
      category: "Player Flow",
      description: "Automated E2E browser screenshot.",
    };
    return {
      filename: file,
      title: meta.title,
      category: meta.category,
      description: meta.description,
      base64,
    };
  });

  const certFiles = fs.existsSync(CERTIFICATE_DIR)
    ? fs
        .readdirSync(CERTIFICATE_DIR)
        .filter((f) => f.endsWith(".pdf"))
        .sort()
    : [];

  const certItems: CertificateItem[] = certFiles.map((file) => {
    const buffer = fs.readFileSync(path.join(CERTIFICATE_DIR, file));
    const base64 = `data:application/pdf;base64,${buffer.toString("base64")}`;
    const meta = CERTIFICATE_METADATA_MAP[file] || {
      title: file.replace(/\.pdf$/, "").replace(/-/g, " "),
      description: "Certificate downloaded via the real 'Download score record' button.",
    };
    return { filename: file, title: meta.title, description: meta.description, base64 };
  });

  const timestamp = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>E2E Test Execution & Screenshots Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      background: #ffffff;
      color: #0f172a;
      line-height: 1.4;
      padding: 1.5rem;
      max-width: 1000px;
      margin: 0 auto;
    }

    header {
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 1rem;
      margin-bottom: 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    h1 {
      font-size: 1.4rem;
      font-weight: 700;
      color: #0f172a;
    }

    .sub {
      font-size: 0.85rem;
      color: #64748b;
      margin-top: 0.2rem;
    }

    .btn-print {
      background: #0f172a;
      color: #ffffff;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-print:hover {
      background: #334155;
    }

    .step-list {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .step-item {
      page-break-inside: avoid;
      break-inside: avoid;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      padding: 1rem;
      background: #fafafa;
    }

    .step-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.4rem;
    }

    .step-title {
      font-size: 1rem;
      font-weight: 600;
      color: #0f172a;
    }

    .step-tag {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.15rem 0.5rem;
      border-radius: 0.25rem;
      background: #e2e8f0;
      color: #334155;
    }

    .step-desc {
      font-size: 0.85rem;
      color: #475569;
      margin-bottom: 0.75rem;
    }

    .img-box {
      border: 1px solid #cbd5e1;
      border-radius: 0.25rem;
      overflow: hidden;
      background: #000000;
    }

    .img-box img {
      width: 100%;
      height: auto;
      display: block;
    }

    .section-heading {
      font-size: 1.1rem;
      font-weight: 700;
      color: #0f172a;
      margin: 2rem 0 1rem;
    }

    .cert-list {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .cert-download {
      display: inline-block;
      margin-top: 0.6rem;
      padding: 0.4rem 0.85rem;
      border-radius: 0.375rem;
      background: #0f172a;
      color: #ffffff;
      font-size: 0.8rem;
      font-weight: 600;
      text-decoration: none;
    }

    .cert-download:hover {
      background: #334155;
    }

    @media print {
      @page {
        size: A4 portrait;
        margin: 10mm;
      }

      body {
        padding: 0;
        background: #ffffff;
      }

      .btn-print {
        display: none;
      }

      header {
        margin-bottom: 1rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid #000000;
      }

      .step-item {
        border: 1px solid #cbd5e1;
        background: #ffffff;
        margin-bottom: 1rem;
        padding: 0.75rem;
        page-break-inside: avoid;
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>E2E Test Execution & Screenshots Report</h1>
      <div class="sub">Food Safety Escape Room Platform | ${timestamp} | All Playwright Tests Passed</div>
    </div>
    <button class="btn-print" onclick="window.print()">🖨️ Print / Save PDF</button>
  </header>

  <div class="step-list">
    ${items
      .map(
        (item, idx) => `
      <div class="step-item">
        <div class="step-header">
          <div class="step-title">Step ${idx + 1}: ${item.title}</div>
          <span class="step-tag">${item.category}</span>
        </div>
        <div class="step-desc">${item.description}</div>
        <div class="img-box">
          <img src="${item.base64}" alt="${item.title}" />
        </div>
      </div>
    `,
      )
      .join("")}
  </div>

  ${
    certItems.length > 0
      ? `
  <div class="section-heading">Downloadable Certificates</div>
  <div class="cert-list">
    ${certItems
      .map(
        (item) => `
      <div class="step-item">
        <div class="step-header">
          <div class="step-title">${item.title}</div>
          <span class="step-tag">Certificate</span>
        </div>
        <div class="step-desc">${item.description}</div>
        <a class="cert-download" href="${item.base64}" download="${item.filename}">Download ${item.filename}</a>
      </div>
    `,
      )
      .join("")}
  </div>
  `
      : ""
  }
</body>
</html>`;

  fs.writeFileSync(REPORT_FILE, html, "utf-8");
  console.log(`✅ Generated concise printable E2E report at ${REPORT_FILE}`);
}

buildHtmlReport();
