import { expect } from "@playwright/test";

// Validates a user can see their saved recipes

export const TEST_USER = {
  username: "playwright_test_user",
  password: "Playwright!12345",
};

export async function gotoPage(page, path) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
}

// clears storage one time since on LocalStorage
export async function clearClientState(page) {
  await gotoPage(page, "login.html");

  await page.evaluate(() => {
    try { localStorage.clear(); } catch (e) {}
    try { sessionStorage.clear(); } catch (e) {}
  });
}

export async function trySignup(page, { username, password }) {
  await gotoPage(page, "signup.html");

  const form = page.locator("#signupForm");
  await expect(form).toBeVisible();

  await page.fill("#signupUsername", username);
  await page.fill("#signupPassword", password);

  await Promise.race([
    form.evaluate((f) => f.requestSubmit()).catch(() => {}),
    form.locator('button[type="submit"]').click().catch(() => {}),
  ]);

  await page.waitForTimeout(300);
}

export async function login(page, { username, password }) {
  await gotoPage(page, "login.html");

  const form = page.locator("#loginForm");
  await expect(form).toBeVisible();

  await page.fill("#loginUsername", username);
  await page.fill("#loginPassword", password);

  await Promise.race([
    form.evaluate((f) => f.requestSubmit()).catch(() => {}),
    form.locator('button[type="submit"]').click().catch(() => {}),
  ]);

  await page.waitForTimeout(300);
}

export async function ensureLoggedIn(page, user = TEST_USER) {
  // If already logged in, no work needed
  const existing = await safeGetLocalStorageItem(page, "loggedInUser");
  if (existing) return;

  // Try login first
  await login(page, user);

  // If still not logged in, user likely doesn't exist — signup then login
  const afterLogin = await safeGetLocalStorageItem(page, "loggedInUser");
  if (afterLogin) return;

  await trySignup(page, user);
  await login(page, user);
}

export async function openFirstRecipeFromHome(page) {
  await gotoPage(page, "index.html");
  await page.waitForTimeout(500);

  // 1) recommendations
  const recCard = page
    .locator("#recommendedBox a.recipe-card, #recommendedBox a[href*='recipe.html?id=']")
    .first();
  if (await recCard.count()) {
    await recCard.click();
    await expect(page).toHaveURL(/recipe\.html\?id=/, { timeout: 15_000 });
    return;
  }

  // 2) force search
  const searchInput = page.locator("#searchInput").first();
  await expect(searchInput).toBeVisible({ timeout: 15_000 });
  await searchInput.fill("a");
  await searchInput.press("Enter");

  const firstResult = page.locator("a.recipe-card, a[href*='recipe.html?id=']").first();
  await expect(firstResult).toBeVisible({ timeout: 20_000 });
  await firstResult.click();

  await expect(page).toHaveURL(/recipe\.html\?id=/, { timeout: 15_000 });
}

export async function setCaloriesFilterIfPresent(page, min, max) {
  const minInput = page.locator("#caloriesMin");
  const maxInput = page.locator("#caloriesMax");
  if (!(await minInput.count()) || !(await maxInput.count())) return false;

  await minInput.fill(String(min));
  await maxInput.fill(String(max));

  const applyBtn = page.getByRole("button", { name: /apply/i });
  if (await applyBtn.count()) await applyBtn.click();
  return true;
}

export function parseFirstNumber(text) {
  const m = String(text || "").match(/(\d+(\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

export async function getRecommendationCards(page) {
  const box = page.locator("#recommendedBox");
  if (!(await box.count())) return { box: null, cards: null, count: 0 };
  const cards = box.locator("a.recipe-card");
  return { box, cards, count: await cards.count() };
}

export async function getShoppingListItems(page) {
  const ul = page.locator("#shopping-list");
  await expect(ul).toBeVisible();
  const items = ul.locator("li");
  return { ul, items, count: await items.count() };
}

export async function safeGetLocalStorageItem(page, key) {
  try {
    return await page.evaluate((k) => {
      try { return localStorage.getItem(k); } catch (e) { return null; }
    }, key);
  } catch (e) {
    return null;
  }
}

