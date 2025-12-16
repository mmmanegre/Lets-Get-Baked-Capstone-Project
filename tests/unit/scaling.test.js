/** @jest-environment jsdom */

/*
  Recipe scaling unit test (DOM-driven)
  - Verifies the recipe page scaling behavior without calling the real Supabase backend.
  - Confirms clicking "Apply" recalculates ingredient amounts in the DOM.
  - Confirms clicking "Reset" restores original amounts.
*/

import { jest } from "@jest/globals";

describe("Recipe scaling behavior (DOM-driven)", () => {
  const fakeRecipe = {
    id: "r1",
    name: "Test Recipe",
    cooktime: "00:30",
    calories: 200,
    servings: 8,
    serving_size: "1 slice",
    picture: "",
    description: "Step 1\nStep 2",
  };

  const fakeIngredients = [
    { recipeid: "r1", ingredient_name: "Flour", units: "cup", amount_per_ingredient: 2 },
    { recipeid: "r1", ingredient_name: "Sugar", units: "tbsp", amount_per_ingredient: 4 },
    { recipeid: "r1", ingredient_name: "Salt", units: "tsp", amount_per_ingredient: null },
  ];

  async function loadRecipeModuleWithMocks() {
    // Reset the module registry so recipe.js re-imports with our mocks each test
    jest.resetModules();

    // DOM needed for recipe.js to render + attach listeners
    document.body.innerHTML = `
      <div id="recipe-container"></div>
      <button id="savebtn"></button>
      <button id="cartbtn"></button>
      <div id="toast"></div>
    `;

    // Polyfill structuredClone for Jest/jsdom - Debugging jsdom
    if (!globalThis.structuredClone) {
      globalThis.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
    }

    // Mock UI toast so tests don’t depend on UI implementation
    await jest.unstable_mockModule("../../scripts/ui.js", () => ({
      showToast: jest.fn(),
    }));

    // Build a minimal Supabase-like query chain for the two tables we call
    await jest.unstable_mockModule("../../scripts/supabaseClient.js", () => {
      const makeQuery = (tableName) => {
        const q = {
          select: () => q,
          eq: () => q,
          single: async () => {
            if (tableName === "recipes") return { data: fakeRecipe, error: null };
            return { data: null, error: null };
          },
        };

        if (tableName === "recipeingredients") {
          q.then = (resolve) => resolve({ data: fakeIngredients, error: null });
        }

        return q;
      };

      return {
        supabase: {
          from: (tableName) => makeQuery(tableName),
        },
      };
    });
    return await import("../../scripts/recipe.js");
  }

  test("Apply scales ingredient amounts and updates the DOM", async () => {
    const { loadSingleRecipe } = await loadRecipeModuleWithMocks();

    await loadSingleRecipe("r1");

    const rowsBefore = document.querySelectorAll(".ingredient-row");
    expect(rowsBefore.length).toBe(3);
    expect(rowsBefore[0].querySelector(".ing-amt")?.textContent.trim()).toBe("2");
    expect(rowsBefore[1].querySelector(".ing-amt")?.textContent.trim()).toBe("4");

    // Scale 8 -> 4 (factor = 0.5)
    const input = document.getElementById("servingScaler");
    const applyBtn = document.getElementById("applyScaleBtn");

    input.value = "4";
    applyBtn.click();

    const rowsAfter = document.querySelectorAll(".ingredient-row");
    expect(rowsAfter[0].querySelector(".ing-amt")?.textContent.trim()).toBe("1");
    expect(rowsAfter[1].querySelector(".ing-amt")?.textContent.trim()).toBe("2");

    // null stays blank
    expect(rowsAfter[2].querySelector(".ing-amt")?.textContent.trim()).toBe("");
  });

  test("Reset restores original amounts", async () => {
    const { loadSingleRecipe } = await loadRecipeModuleWithMocks();

    await loadSingleRecipe("r1");

    const input = document.getElementById("servingScaler");
    const applyBtn = document.getElementById("applyScaleBtn");
    const resetBtn = document.getElementById("resetScaleBtn");

    input.value = "4";
    applyBtn.click();

    let rows = document.querySelectorAll(".ingredient-row");
    expect(rows[0].querySelector(".ing-amt")?.textContent.trim()).toBe("1");

    resetBtn.click();

    rows = document.querySelectorAll(".ingredient-row");
    expect(rows[0].querySelector(".ing-amt")?.textContent.trim()).toBe("2");
    expect(rows[1].querySelector(".ing-amt")?.textContent.trim()).toBe("4");
  });
});
