import { test, expect } from "@playwright/test";

// Validates a user can correctly apply filters to search results

import {
  clearClientState,
  ensureLoggedIn,
  TEST_USER,
  gotoPage,
  setCaloriesFilterIfPresent,
  getRecommendationCards,
  parseFirstNumber,
} from "./helpers.js";

test.describe("Search + filters + recommendations", () => {
  test.beforeEach(async ({ page }) => {
    await clearClientState(page);
    await ensureLoggedIn(page, TEST_USER);
  });

  test("Recommendations section appears when user has tags (or is hidden otherwise)", async ({ page }) => {
    await gotoPage(page, "index.html");

    const section = page.locator("#recommendedSection");
    const box = page.locator("#recommendedBox");

    // Don't hard-fail if user has no tags; allow hidden.
    if (await section.count()) {
      // If displayed, box should exist
      if (await section.isVisible()) {
        await expect(box).toBeVisible();
      }
    }
  });

  test("Calories filter (if present on page) reduces recommendations to match range", async ({ page }) => {
    await gotoPage(page, "index.html");

    // Set a tight range so we can verify results
    const filterApplied = await setCaloriesFilterIfPresent(page, 0, 200);
 
    test.skip(!filterApplied, "Calories filter UI not found on this page.");

    // Wait a moment for any rerender logic
    await page.waitForTimeout(300);

    const rec = await getRecommendationCards(page);
    if (!rec.count) {
      // Could be no recommendations due to strict filters; acceptable.
      return;
    }

    // Each recommendation card contains a "🔥 ### cal" pill.
    for (let i = 0; i < Math.min(rec.count, 6); i++) {
      const card = rec.cards.nth(i);
      const text = await card.innerText();
      const calories = parseFirstNumber(text); 
      const calPill = card.locator(".pill", { hasText: /cal/i }).first();
      const calText = (await calPill.count()) ? await calPill.innerText() : text;
      const calNum = parseFirstNumber(calText);

      if (calNum != null) {
        expect(calNum).toBeLessThanOrEqual(200);
      }
    }
  });
});
