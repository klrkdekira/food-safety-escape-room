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

test.describe("Routing & SPA Recovery", () => {
  test("Direct navigation to play routes loads correct quizzes", async ({ page }) => {
    await page.goto("/play/food-kitchen");
    await expect(page.locator("#title-logo")).toContainText(/FOOD COLLOIDS/i);

    await page.goto("/play/microb");
    await expect(page.locator("#title-logo")).toContainText(/FOOD SAFETY/i);
  });

  test("SPA route recovery via query string parameter ?p=", async ({ page }) => {
    await page.goto("/?p=play/microb");
    await expect(page.locator("#title-logo")).toContainText(/FOOD SAFETY/i);

    await captureStep(page, "17-spa-route-recovery.png");
  });
});
