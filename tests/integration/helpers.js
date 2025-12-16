import { expect } from "@playwright/test";

// Integration test helpers (Playwright)

export const TEST_USER = {
  username: "playwright_test_user",
  password: "Playwright!12345",
};

export async function gotoPage(page, path) {
  // Use relative paths with baseURL (set in playwright.config.js)
  await page.goto(path, { waitUntil: "domcontentloaded" });
}

export async function clearClientState(page) {
  // Clear storage defensively (won't crash if storage is blocked)
  await page.addInitScript(() => {
    try {
      localStorage.clear();
    } catch (e) {}
    try {
      sessionStorage.clear();
    } catch (e) {}
  });
}

export async function navClick(page, linkText) {
  const link = page.getByRole("link", { name: linkText });
  await expect(link).toBeVisible();
  await link.click();
}

export async function trySignup(page, { username, password }) {
  await gotoPage(page, "signup.html");

  const form = page.locator("#signupForm");
  if (!(await form.count())) return false;

  await page.fill("#signupUsername", username);
  await page.fill("#signupPassword", password);

  // submit
  await Promise.race([
    form.evaluate((f) => f.requestSubmit()).catch(() => {}),
    form.locator('button[type="submit"]').click().catch(() => {}),
  ]);

  // Success path: redirect to login.html
  await page.waitForURL("**/login.html", { timeout: 8000 }).catch(() => {});
  return true;
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

  // Wait for redirect to index.html (success) or stay on login.html (failure)
  await page.waitForURL(/index\.html$/, { timeout: 10_000 }).catch(() => {});
}
export async function ensureLoggedIn(page, user = TEST_USER) {
  await page.addInitScript((u) => {
    localStorage.setItem("loggedInUser", JSON.stringify({ username: u.username }));
  }, user);

  // Navigate to index after setting auth state
  await page.goto("index.html", { waitUntil: "domcontentloaded" });
}

export async function openFirstRecipeFromHome(page) {
  await gotoPage(page, "index.html");

  // Wait a moment for app JS to boot
  await page.waitForTimeout(500);

  // 1) If recommendations already rendered, use them
  const recCard = page.locator("#recommendedBox a.recipe-card, #recommendedBox a[href*='recipe.html?id=']").first();
  if (await recCard.count()) {
    await expect(recCard).toBeVisible({ timeout: 15_000 });
    await recCard.click();
    await expect(page).toHaveURL(/recipe\.html\?id=/, { timeout: 15_000 });
    return;
  }

  // 2) Otherwise force a search so results render
  const searchInput = page.locator("#searchInput").first();
  const searchBtn =
    page.locator("#searchBtn").first().or(page.getByRole("button", { name: /search/i }).first());

  await expect(searchInput).toBeVisible({ timeout: 15_000 });
  await searchInput.fill("a"); // broad query so something returns

  if (await searchBtn.count()) {
    await searchBtn.click();
  } else {
    // fallback: Enter key
    await searchInput.press("Enter");
  }

  // Wait for results to appear
  const firstResult = page.locator("a.recipe-card, a[href*='recipe.html?id=']").first();
  await expect(firstResult).toBeVisible({ timeout: 20_000 });

  await firstResult.click();
  await expect(page).toHaveURL(/recipe\.html\?id=/, { timeout: 15_000 });
}


export async function setCaloriesFilterIfPresent(page, min, max) {
  const minInput = page.locator("#caloriesMin");
  const maxInput = page.locator("#caloriesMax");

  if (!(await minInput.count()) || !(await maxInput.count())) return false;

  // If inputs exist but aren't visible, open filter UI
  if (!(await minInput.isVisible().catch(() => false))) {
    // 1) Try clicking a "Filters" button
    const filterBtn = page.getByRole("button", { name: /filter/i }).first();
    if (await filterBtn.count()) {
      await filterBtn.click().catch(() => {});
    }

    // 2) Try expanding Calories section (if accordion header clickable)
    const caloriesHeader = page.getByRole("heading", { name: /calories/i }).first();
    if (await caloriesHeader.count()) {
      await caloriesHeader.click().catch(() => {});
    }
  }

  // Now wait for inputs to actually be interactable
  await expect(minInput).toBeVisible({ timeout: 10_000 });
  await expect(maxInput).toBeVisible({ timeout: 10_000 });

  await minInput.fill(String(min));
  await maxInput.fill(String(max));

  // Click Apply Filters
  const applyBtn = page.getByRole("button", { name: /apply/i }).first();
  if (await applyBtn.count()) {
    await applyBtn.click();
  }

  return true;
}


// ------------------------------
// Small utilities used by specs
// ------------------------------

export function parseFirstNumber(text) {
  const m = String(text || "").match(/(\d+(\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

export async function getRecommendationCards(page) {
  const box = page.locator("#recommendedBox");
  if (!(await box.count())) return { box: null, cards: null, count: 0 };

  const cards = box.locator("a.recipe-card");
  const count = await cards.count();
  return { box, cards, count };
}

export async function getShoppingListItems(page) {
  const ul = page.locator("#shopping-list");
  await expect(ul).toBeVisible();

  const items = ul.locator("li");
  const count = await items.count();
  return { ul, items, count };
}

// ------------------------------
// Storage helpers
// ------------------------------

export async function safeGetLocalStorageItem(page, key) {
  try {
    return await page.evaluate((k) => {
      try {
        return localStorage.getItem(k);
      } catch (e) {
        return null;
      }
    }, key);
  } catch (e) {
    return null;
  }
}

export async function safeSetLocalStorageItem(page, key, value) {
  try {
    await page.evaluate(
      ({ k, v }) => {
        try {
          localStorage.setItem(k, v);
        } catch (e) {}
      },
      { k: key, v: value }
    );
    return true;
  } catch (e) {
    return false;
  }
}
// Accept any JS alert/confirm/prompt so tests don't hang
export function autoAcceptDialogs(page) {
  page.on("dialog", async (dialog) => {
    await dialog.accept();
  });
}
