import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const SCREENSHOT_DIR = path.resolve("e2e-report/screenshots");

test.beforeAll(() => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
});

async function captureStep(page: Page, filename: string) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, filename),
    fullPage: true,
  });
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

    // Step 4: Solve Room 1 Perfectly & Capture CodePad Unlock
    await solveRoomPuzzlesPerfectly(1);
    await expect(page.locator(".code-entry")).toBeVisible();
    await captureStep(page, "05-room1-codepad-unlocked.png");

    await unlockRoom(1);

    // Step 5: Room 2 (Gel Laboratory)
    await expect(page.locator(".room-title")).toContainText(/GEL LABORATORY/i);
    await captureStep(page, "06-room2-gel-lab.png");

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
  });
});
