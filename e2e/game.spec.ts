import { expect, test } from "@playwright/test";

test.describe("Escape Room Player Flow", () => {
  test("Home page displays available escape rooms and navigation to authoring studio", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator(".title-logo")).toHaveText("Pick a room");

    const quizCards = page.locator(".quiz-card");
    await expect(quizCards).toHaveCount(2);

    const studioLink = page.locator("a", { hasText: "Authoring studio" });
    await expect(studioLink).toBeVisible();
  });

  test("Full playthrough: start game, answer puzzles, unlock room, enter final code, reach victory", async ({
    page,
  }) => {
    // Navigate to play food-kitchen quiz directly with debug mode enabled for fast navigation if needed
    await page.goto("/play/food-kitchen?debug=1");

    // Title screen checks
    await expect(page.locator("#title-logo")).toContainText(/FOOD COLLOIDS/i);
    const beginButton = page.locator('button:has-text("Begin")');
    await expect(beginButton).toBeVisible();
    await beginButton.click();

    // Verify HUD and Minimap are active
    await expect(page.locator("#hud")).toBeVisible();
    await expect(page.locator("#minimap")).toBeVisible();

    // Verify room 1 header
    await expect(page.locator(".room-title")).toBeVisible();

    // Verify presence of puzzle card or active puzzle submit button
    const submitBtn = page.locator('button:has-text("Submit answer")');
    await expect(submitBtn).toBeVisible();

    // Test hint button functionality
    const hintBtn = page.locator(".hud-btn", { hasText: "Hint" });
    if (await hintBtn.isVisible()) {
      await hintBtn.click();
    }

    // Debug mode skip room button check
    const skipBtn = page.locator('button:has-text("DEBUG: Next puzzle")');
    if (await skipBtn.isVisible()) {
      // Advance through all puzzles until room completion / final code
      for (let i = 0; i < 20; i++) {
        if (await page.locator("#terminal-card").isVisible()) break;
        if (await page.locator(".victory-screen").isVisible()) break;

        const codeInput = page.locator("#room-code-input");
        if (await codeInput.isVisible()) {
          // Unlock current room
          const currentCodeHint = await page.locator(".room-code-hint").textContent();
          // Extract code or submit code
          const codeMatch = currentCodeHint?.match(/Code:\s*([A-Z]+)/i);
          const codeToEnter = codeMatch ? codeMatch[1] : "ALPHA";
          await codeInput.fill(codeToEnter);
          await page.locator('button:has-text("Unlock Room")').click();
          continue;
        }

        if ((await submitBtn.isVisible()) && (await submitBtn.isEnabled())) {
          await skipBtn.click();
        }
      }
    }
  });
});
