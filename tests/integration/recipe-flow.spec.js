import { test, expect } from "@playwright/test";

// Verifies recipe scale + add to list + view list flow

import {
  clearClientState,
  ensureLoggedIn,
  TEST_USER,
  openFirstRecipeFromHome,
  gotoPage,
  getShoppingListItems,
} from "./helpers.js";

test.describe("Recipe flow (scale + add to cart + shopping list)", () => {
  test.beforeEach(async ({ page }) => {
    await clearClientState(page);
    await ensureLoggedIn(page, TEST_USER);
  });

  test("Open recipe → scale ingredients → add to shopping list → view shop → clear list", async ({ page }) => {
    // 1) Open a recipe
    await openFirstRecipeFromHome(page);

    // 2) Ensure ingredients rendered
    const ingredientsList = page.locator("#ingredientsList");
    await expect(ingredientsList).toBeVisible();

    const rows = ingredientsList.locator(".ingredient-row");
    await expect(rows.first()).toBeVisible();

    // 3) Try scaling 
    const scaler = page.locator("#servingScaler");
    const applyBtn = page.locator("#applyScaleBtn");
    if (await scaler.count() && await applyBtn.count()) {
      await scaler.fill("4");
      await applyBtn.click();
      // Not asserting exact numbers because recipes vary; just confirm it didn't break the DOM.
      await expect(rows.first().locator(".ing-amt")).toBeVisible();
    }

    // 4) Add to cart
    const cartBtn = page.locator("#cartbtn");
    await expect(cartBtn).toBeVisible();
    await cartBtn.click();

    // 5) Go to Shopping List page and confirm items appear
    await gotoPage(page, "shop.html");
    const { items, count } = await getShoppingListItems(page);

    // If the first recipe had ingredients, we should have > 0 list items.
    expect(count).toBeGreaterThan(0);

    // 6) Clear list
    const clearBtn = page.locator("#clearShoppingBtn");
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();

    // Verify empty state text
    await expect(page.locator("#shopping-list")).toContainText(/No items yet/i);
  });
});
