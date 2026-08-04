import { expect, test } from "@playwright/test";

test.describe("Authoring Studio Flow", () => {
  test("Authoring studio opens and loads config, room, and puzzle editors", async ({ page }) => {
    await page.goto("/editor");

    // Header checks
    await expect(page.locator("h1")).toContainText(/Authoring studio/i);

    // Check tab navigation links
    const configTab = page.locator('a[href="/editor/config"]');
    const roomsTab = page.locator('a[href="/editor/rooms"]');
    const puzzlesTab = page.locator('a[href="/editor/puzzles"]');

    await expect(configTab).toBeVisible();
    await expect(roomsTab).toBeVisible();
    await expect(puzzlesTab).toBeVisible();

    // Navigate to Config editor
    await configTab.click();
    await expect(page.locator("label", { hasText: "Page Title" })).toBeVisible();

    // Navigate to Rooms editor
    await roomsTab.click();
    await expect(page.locator("button", { hasText: "+ Add Room" })).toBeVisible();

    // Navigate to Puzzles editor
    await puzzlesTab.click();
    await expect(page.locator("button", { hasText: "+ Add Puzzle" })).toBeVisible();

    // Verify preview frame iframe is rendered
    const previewIframe = page.locator('iframe[title="Live Escape Room Preview"]');
    await expect(previewIframe).toBeVisible();
  });
});
