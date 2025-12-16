/*
  - Verifies the user can sign up
  - Verifies the user can log in
  - Verifies user is redirected to index.html (home page)
*/
import { test, expect } from "@playwright/test";
import { clearClientState, TEST_USER, gotoPage, ensureLoggedIn } from "./helpers.js";

test.describe("Auth flow (signup/login)", () => {
  test.beforeEach(async ({ page }) => {
    await clearClientState(page);
  });

  test("User can signup (if needed) and login", async ({ page }) => {
    await ensureLoggedIn(page, TEST_USER);
    await expect(page).toHaveURL(/index\.html$/);
  });

  test("Login page renders expected fields", async ({ page }) => {
    await gotoPage(page, "login.html");
    await expect(page.locator("#loginForm")).toBeVisible();
    await expect(page.locator("#loginUsername")).toBeVisible();
    await expect(page.locator("#loginPassword")).toBeVisible();
  });
});
