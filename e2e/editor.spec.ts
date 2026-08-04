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

test.describe("Authoring Studio Flow", () => {
  test("Authoring studio opens and loads config, room, and puzzle editors", async ({ page }) => {
    await page.goto("/editor/config");
    await expect(page.locator("h1")).toContainText(/Authoring studio/i);
    await expect(page.locator("label", { hasText: "Page Title" })).toBeVisible();

    await captureStep(page, "14-authoring-studio-config.png");

    // Navigate to Rooms editor
    const roomsTab = page.locator('a[href="/editor/rooms"]');
    await roomsTab.click();
    await expect(page.locator("button", { hasText: "+ Add Room" })).toBeVisible();

    await captureStep(page, "15-authoring-studio-rooms.png");

    // Navigate to Puzzles editor
    const puzzlesTab = page.locator('a[href="/editor/puzzles"]');
    await puzzlesTab.click();
    await expect(page.locator("button", { hasText: "+ Add Puzzle" })).toBeVisible();

    // Verify preview frame iframe is rendered
    const previewIframe = page.locator('iframe[title="Live Escape Room Preview"]');
    await expect(previewIframe).toBeVisible();

    await captureStep(page, "16-authoring-studio-puzzles.png");
  });
});
