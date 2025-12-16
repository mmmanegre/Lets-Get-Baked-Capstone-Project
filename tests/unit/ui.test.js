/*
  Basic Logic Testing
  Purpose of this file:
  - Verifies simple helper functions work correctly. 
  - Verifies text returns reasonably from normalizeText
  - Verifies singularize takes into consideration all forms of words
  - Verifies recipePassesIngredientRules searches for parts and whole words
*/

import { normalizeText, singularize, recipePassesIngredientRules } from "../../scripts/ui.js";

describe("ui helpers", () => {
  test("normalizeText lowercases + trims + collapses whitespace", () => {
    expect(normalizeText("  Brown   Sugar ")).toBe("brown sugar");
    expect(normalizeText("\nMILK\t")).toBe("milk");
  });

  test("normalizeText handles null/undefined safely", () => {
    expect(normalizeText(null)).toBe("");
    expect(normalizeText(undefined)).toBe("");
  });

  test("singularize basic plurals", () => {
    expect(singularize("eggs")).toBe("egg");
    expect(singularize("berries")).toBe("berry");
    expect(singularize("glass")).toBe("glass"); // shouldn't break weird words
  });

  test("recipePassesIngredientRules INCLUDE requires all include ingredients", () => {
    const recipeNames = ["brown sugar", "all purpose flour", "butter"];
    expect(recipePassesIngredientRules(recipeNames, ["sugar", "flour"], [])).toBe(true);
    expect(recipePassesIngredientRules(recipeNames, ["sugar", "cocoa"], [])).toBe(false);
  });

  test("recipePassesIngredientRules EXCLUDE rejects any excluded ingredient", () => {
    const recipeNames = ["milk", "butter", "vanilla"];
    expect(recipePassesIngredientRules(recipeNames, [], ["milk"])).toBe(false);
    expect(recipePassesIngredientRules(recipeNames, [], ["eggs"])).toBe(true);
  });

  test("recipePassesIngredientRules supports substring matching", () => {
    const recipeNames = ["brown sugar", "powdered sugar"];
    expect(recipePassesIngredientRules(recipeNames, ["sugar"], [])).toBe(true);
  });
});
