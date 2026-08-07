import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const SCREENSHOT_DIR = path.resolve("e2e-report/screenshots");
const CERTIFICATE_DIR = path.resolve("e2e-report/certificates");

const foodKitchenQuiz = JSON.parse(
  fs.readFileSync(path.resolve("public/quizzes/food-kitchen.json"), "utf-8"),
) as {
  puzzleData: Record<
    string,
    {
      correct?: string | string[] | Record<string, string>;
      options?: { key: string }[];
      items?: { id: string; text: string }[];
      correctOrder?: string[];
    }
  >;
};

test.beforeAll(() => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  fs.mkdirSync(CERTIFICATE_DIR, { recursive: true });
});

async function captureStep(page: Page, filename: string) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, filename),
    fullPage: true,
  });
}

/** Clicks the real "Download score record" button and saves what the browser actually downloaded. */
async function downloadCertificate(page: Page, filename: string) {
  const downloadPromise = page.waitForEvent("download");
  await page.locator('button:has-text("Download score record")').click();
  const download = await downloadPromise;
  await download.saveAs(path.join(CERTIFICATE_DIR, filename));
}

/**
 * Clicks a wrong MCQ option and submits, then clicks the correct one and
 * submits -- a genuine mistake through the real radio inputs and submit
 * button, not a scripted shortcut. Option order is shuffled per session, so
 * options are targeted by their `value` (the puzzle's option key) rather than
 * position. Skips the reading-delay timer afterwards so the next puzzle in
 * the room becomes active immediately instead of the test waiting on it.
 */
async function answerMcqWithOneMistake(page: Page, puzzleId: number) {
  const puzzle = foodKitchenQuiz.puzzleData[String(puzzleId)];
  const wrongKey = puzzle.options?.find((o) => o.key !== puzzle.correct)?.key;

  await page
    .locator(`label.mcq-option:has(input[name="puzzle-${puzzleId}-radio"][value="${wrongKey}"])`)
    .click();
  await page.locator('button:has-text("Submit answer")').click();
  await expect(page.locator(`#result-${puzzleId}`)).toContainText(/Not quite/i);

  await page
    .locator(
      `label.mcq-option:has(input[name="puzzle-${puzzleId}-radio"][value="${puzzle.correct}"])`,
    )
    .click();
  await page.locator('button:has-text("Submit answer")').click();
  await expect(page.locator(`#result-${puzzleId}`)).toContainText(/Correct/i);

  await page.evaluate(() => (window as any).__gameDispatch({ type: "RESOLVE_ADVANCE" }));
}

/**
 * Solves an order puzzle through the real "move up" buttons -- selection-sort
 * style, bubbling each correct item up to its target position in turn. Never
 * touches a position once it's been fixed, so it terminates safely regardless
 * of the puzzle's shuffled starting order.
 */
async function solveOrderPuzzleViaUI(page: Page, puzzleId: number) {
  const puzzle = foodKitchenQuiz.puzzleData[String(puzzleId)];
  const items = puzzle.items!;
  const correctOrder = puzzle.correctOrder!;
  const textById = new Map(items.map((item) => [item.id, item.text]));

  for (let target = 0; target < correctOrder.length; target++) {
    const wantedId = correctOrder[target];
    const wantedText = textById.get(wantedId);
    while (true) {
      const ids = await page
        .locator(`#puzzle-${puzzleId}-list .order-item`)
        .evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset.id));
      if (ids[target] === wantedId) break;
      await page.getByRole("button", { name: `Move ${wantedText} up` }).click();
    }
  }

  await page.locator('button:has-text("Submit answer")').click();
  await expect(page.locator(`#result-${puzzleId}`)).toContainText(/Correct/i);
}

/** Solves a match puzzle through the real per-row <select> dropdowns. */
async function solveMatchPuzzleViaUI(page: Page, puzzleId: number) {
  const correct = foodKitchenQuiz.puzzleData[String(puzzleId)].correct as Record<string, string>;
  for (const [leftId, rightId] of Object.entries(correct)) {
    await page.selectOption(`#match-${puzzleId}-${leftId}`, rightId);
  }
  await page.locator('button:has-text("Submit answer")').click();
  await expect(page.locator(`#result-${puzzleId}`)).toContainText(/Correct/i);
}

/** Solves a multiselect puzzle by checking each real checkbox for a correct option. */
async function solveMultiselectPuzzleViaUI(page: Page, puzzleId: number) {
  const correctKeys = foodKitchenQuiz.puzzleData[String(puzzleId)].correct as string[];
  for (const key of correctKeys) {
    await page
      .locator(`label.multi-option:has(input[name="puzzle-${puzzleId}-check"][value="${key}"])`)
      .click();
  }
  await page.locator('button:has-text("Submit answer")').click();
  await expect(page.locator(`#result-${puzzleId}`)).toContainText(/Correct/i);
}

test.describe("Escape Room Step-by-Step E2E Flow", () => {
  test("Home page room picker", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".title-logo")).toHaveText("Pick a room");
    await captureStep(page, "01-home-room-picker.png");
  });

  test("Step-by-step complete playthrough: Room 1 to 4, CodePads, Final Terminal, and Victory Reward Screen", async ({
    page,
  }) => {
    await page.goto("/play/food-kitchen?debug=1");

    // Helper to solve all puzzles in a room with 100% correct answers
    const solveRoomPuzzlesPerfectly = async (roomNum: number) => {
      await page.evaluate((rNum) => {
        const win = window as any;
        const ctx = win.__gameCtx;
        const dispatch = win.__gameDispatch;
        if (!ctx || !dispatch) return;

        const puzzleIds = ctx.roomPuzzles[rNum] || [];
        for (const pId of puzzleIds) {
          const puzzle = ctx.quiz.puzzleData[String(pId)];
          if (!puzzle) continue;

          let answer: unknown;
          if (puzzle.type === "mcq") answer = puzzle.correct;
          else if (puzzle.type === "multiselect") answer = puzzle.correct;
          else if (puzzle.type === "order") answer = puzzle.correctOrder;
          else if (puzzle.type === "match") answer = puzzle.correct;
          else if (puzzle.type === "text") answer = puzzle.keywords[0];

          dispatch({ type: "SET_ANSWER", puzzleId: Number(pId), answer });
          dispatch({ type: "SUBMIT", puzzleId: Number(pId) });
        }
      }, roomNum);
      await page.waitForTimeout(300);
    };

    const unlockRoom = async (roomNum: number) => {
      await page.evaluate((rNum) => {
        const win = window as any;
        if (win.__gameDispatch) {
          win.__gameDispatch({ type: "UNLOCK_ROOM", roomNum: rNum });
        }
      }, roomNum);
      await page.waitForTimeout(400);
    };

    // Step 1: Title Screen & Mission Briefing
    await expect(page.locator("#title-logo")).toContainText(/FOOD COLLOIDS/i);
    await page.fill("#student-name-input", "Jordan Lee");
    await captureStep(page, "02-game-title-screen.png");

    const beginButton = page.locator('button:has-text("Begin")');
    await expect(beginButton).toBeVisible();
    await beginButton.click();

    // Step 2: Room 1 (Emulsion Lab)
    await expect(page.locator("#hud")).toBeVisible();
    await expect(page.locator(".room-title")).toContainText(/EMULSION LAB/i);
    await captureStep(page, "03-room1-emulsion-lab.png");

    // Step 3: Hint System
    const hintBtn = page.locator(".hud-btn", { hasText: "Hint" });
    if (await hintBtn.isVisible()) {
      await hintBtn.click();
      await captureStep(page, "04-room1-hint-revealed.png");
    }

    // Step 4b: Order puzzle (sequence reordering) via real UI
    await page.evaluate(() => {
      const win = window as any;
      win.__gameDispatch({ type: "SHOW_PUZZLE", roomNum: 1, puzzleId: 4 });
    });
    await expect(page.locator("#puzzle-4-list")).toBeVisible();
    await solveOrderPuzzleViaUI(page, 4);
    await captureStep(page, "04b-room1-order-puzzle.png");

    // Step 4c: Match puzzle (dropdown pairing) via real UI
    await page.evaluate(() => {
      const win = window as any;
      win.__gameDispatch({ type: "SHOW_PUZZLE", roomNum: 1, puzzleId: 7 });
    });
    await expect(page.locator("#match-7-creaming")).toBeVisible();
    await solveMatchPuzzleViaUI(page, 7);
    await captureStep(page, "04c-room1-match-puzzle.png");

    // Step 4: Solve Room 1 Perfectly & Capture CodePad Unlock
    await solveRoomPuzzlesPerfectly(1);
    await expect(page.locator(".code-entry")).toBeVisible();
    await captureStep(page, "05-room1-codepad-unlocked.png");

    await unlockRoom(1);

    // Step 5: Room 2 (Gel Laboratory)
    await expect(page.locator(".room-title")).toContainText(/GEL LABORATORY/i);
    await captureStep(page, "06-room2-gel-lab.png");

    // Step 5b: Multiselect puzzle (multiple-answer checkboxes) via real UI
    await page.evaluate(() => {
      const win = window as any;
      win.__gameDispatch({ type: "SHOW_PUZZLE", roomNum: 2, puzzleId: 23 });
    });
    await expect(page.locator("#puzzle-23-options")).toBeVisible();
    await solveMultiselectPuzzleViaUI(page, 23);
    await captureStep(page, "06b-room2-multiselect-puzzle.png");

    // Step 6: Solve Room 2 Perfectly & Capture CodePad Unlock
    await solveRoomPuzzlesPerfectly(2);
    await expect(page.locator(".code-entry")).toBeVisible();
    await captureStep(page, "07-room2-codepad-unlocked.png");

    await unlockRoom(2);

    // Step 7: Room 3 (Foam Kitchen Lab)
    await expect(page.locator(".room-title")).toContainText(/FOAM KITCHEN/i);
    await captureStep(page, "08-room3-foam-lab.png");

    // Step 8: Solve Room 3 Perfectly & Capture CodePad Unlock
    await solveRoomPuzzlesPerfectly(3);
    await expect(page.locator(".code-entry")).toBeVisible();
    await captureStep(page, "09-room3-codepad-unlocked.png");

    await unlockRoom(3);

    // Step 9: Room 4 (Master Control Lab)
    await expect(page.locator(".room-title")).toContainText(/MASTER CONTROL/i);
    await captureStep(page, "10-room4-master-control-lab.png");

    // Step 9b: Free-text puzzle (keyword match). Puzzle 18 is the third puzzle
    // solved in this room, not the one shown on entry, so jump the active
    // puzzle to it directly rather than waiting through two real advance
    // timers first -- the same debug dispatch already used by unlockRoom.
    await page.evaluate(() => {
      const win = window as any;
      win.__gameDispatch({ type: "SHOW_PUZZLE", roomNum: 4, puzzleId: 18 });
    });
    const textInput = page.locator("#puzzle-18-text");
    await expect(textInput).toBeVisible();
    await textInput.fill("Ostwald ripening causes small droplets to shrink over time.");
    await page.locator('button:has-text("Submit answer")').click();
    await expect(page.locator("#result-18")).toContainText(/Correct/i);
    await captureStep(page, "10b-room4-text-puzzle-keyword-match.png");

    // Step 10: Solve Room 4 Perfectly & Capture CodePad Unlock
    await solveRoomPuzzlesPerfectly(4);
    await expect(page.locator(".code-entry")).toBeVisible();
    await captureStep(page, "11-room4-codepad-unlocked.png");
    await unlockRoom(4);

    // Step 11: Final Escape Terminal
    await expect(page.locator("#final-code-panel")).toBeVisible();
    await captureStep(page, "12-final-escape-terminal.png");

    // Trigger WIN action for victory screen
    await page.evaluate(() => {
      const win = window as any;
      if (win.__gameDispatch) {
        win.__gameDispatch({ type: "WIN" });
      }
    });

    // Step 12: Final Reward & Certification Screen (S Rank, Max Score, Best Result!)
    await expect(page.locator("#victory-screen")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("#victory-title")).toContainText(/restored/i);
    await expect(page.locator("#victory-rank")).toHaveText("S");
    await expect(page.locator("#victory-score")).not.toHaveText("0");

    await captureStep(page, "13-final-victory-reward-screen.png");
    await downloadCertificate(page, "s-grade-certificate.pdf");
  });

  test("Playthrough with mistakes lands on a B grade, and the cognitive skill record shows them", async ({
    page,
  }) => {
    await page.goto("/play/food-kitchen?debug=1");

    const solveRoomPuzzlesPerfectly = async (roomNum: number) => {
      await page.evaluate((rNum) => {
        const win = window as any;
        const ctx = win.__gameCtx;
        const dispatch = win.__gameDispatch;
        if (!ctx || !dispatch) return;

        const puzzleIds = ctx.roomPuzzles[rNum] || [];
        for (const pId of puzzleIds) {
          const puzzle = ctx.quiz.puzzleData[String(pId)];
          if (!puzzle) continue;

          let answer: unknown;
          if (puzzle.type === "mcq") answer = puzzle.correct;
          else if (puzzle.type === "multiselect") answer = puzzle.correct;
          else if (puzzle.type === "order") answer = puzzle.correctOrder;
          else if (puzzle.type === "match") answer = puzzle.correct;
          else if (puzzle.type === "text") answer = puzzle.keywords[0];

          dispatch({ type: "SET_ANSWER", puzzleId: Number(pId), answer });
          dispatch({ type: "SUBMIT", puzzleId: Number(pId) });
        }
      }, roomNum);
      await page.waitForTimeout(300);
    };

    const unlockRoom = async (roomNum: number) => {
      await page.evaluate((rNum) => {
        const win = window as any;
        if (win.__gameDispatch) {
          win.__gameDispatch({ type: "UNLOCK_ROOM", roomNum: rNum });
        }
      }, roomNum);
      await page.waitForTimeout(400);
    };

    await expect(page.locator('button:has-text("Begin")')).toBeVisible();
    await page.fill("#student-name-input", "Priya Nair");
    await page.locator('button:has-text("Begin")').click();

    // Puzzle 1 is the very first scored action of the game, when score is
    // still 0 -- a wrong answer there would have its -10 penalty floored to 0
    // (score can't go negative) instead of actually costing 10, throwing off
    // the arithmetic below. Solve it cleanly first so every mistake after it
    // lands on a positive score and costs exactly what it should.
    await page.evaluate(() => {
      const win = window as any;
      const puzzle = win.__gameCtx.quiz.puzzleData["1"];
      win.__gameDispatch({ type: "SET_ANSWER", puzzleId: 1, answer: puzzle.correct });
      win.__gameDispatch({ type: "SUBMIT", puzzleId: 1 });
      win.__gameDispatch({ type: "RESOLVE_ADVANCE" });
    });

    // Two genuine wrong-then-right mistakes per room, spread across Bloom
    // levels, before fast-forwarding the rest of that room. Each mistake costs
    // a wrong-answer penalty plus half credit on the retry -- 8 mistakes on
    // these 80-point puzzles works out to exactly 400 points off a 1960 max,
    // landing at 1560 (80%): comfortably inside the B band (70-85%), nowhere
    // near the C or A boundaries.
    await answerMcqWithOneMistake(page, 2);
    await answerMcqWithOneMistake(page, 3);
    await solveRoomPuzzlesPerfectly(1);
    await expect(page.locator(".code-entry")).toBeVisible();
    await unlockRoom(1);

    await answerMcqWithOneMistake(page, 8);
    await answerMcqWithOneMistake(page, 9);
    await solveRoomPuzzlesPerfectly(2);
    await expect(page.locator(".code-entry")).toBeVisible();
    await unlockRoom(2);

    await answerMcqWithOneMistake(page, 12);
    await answerMcqWithOneMistake(page, 13);
    await solveRoomPuzzlesPerfectly(3);
    await expect(page.locator(".code-entry")).toBeVisible();
    await unlockRoom(3);

    await answerMcqWithOneMistake(page, 16);
    await answerMcqWithOneMistake(page, 17);
    await solveRoomPuzzlesPerfectly(4);
    await expect(page.locator(".code-entry")).toBeVisible();
    await unlockRoom(4);

    await expect(page.locator("#final-code-panel")).toBeVisible();
    await page.evaluate(() => (window as any).__gameDispatch({ type: "WIN" }));

    await expect(page.locator("#victory-screen")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("#victory-rank")).toHaveText("B");
    await expect(page.locator("#victory-score")).toHaveText("1560");

    // Grade criteria: B is the achieved row, at the result the mistakes produced.
    await expect(page.locator("#criteria-row-B")).toHaveClass(/achieved/);
    await expect(page.locator("#criteria-row-B")).toContainText("Your grade");
    await expect(page.locator(".criteria-your-result")).toContainText("80%");

    // Cognitive skill record: mistakes landed on Remember (8, 9, 17), Understand
    // (2), Apply (3, 12, 13), and Analyse (16) -- Evaluate stays mistake-free.
    const bloomRow = (label: string) =>
      page.locator(".bloom-row", { has: page.locator(".bloom-row-label", { hasText: label }) });
    await expect(bloomRow("Remember").locator(".bloom-row-meta")).toContainText("3 mistakes");
    await expect(bloomRow("Understand").locator(".bloom-row-meta")).toContainText("1 mistake");
    await expect(bloomRow("Apply").locator(".bloom-row-meta")).toContainText("3 mistakes");
    await expect(bloomRow("Analyse").locator(".bloom-row-meta")).toContainText("1 mistake");
    await expect(bloomRow("Evaluate").locator(".bloom-row-meta")).toContainText("0 mistakes");

    await captureStep(page, "bgrade-victory-screen.png");
    await downloadCertificate(page, "b-grade-certificate.pdf");
  });
});
