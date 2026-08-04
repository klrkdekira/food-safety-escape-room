import { expect, test } from "@playwright/test";

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
  });
});
