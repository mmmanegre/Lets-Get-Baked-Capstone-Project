// ==================
// Recipe Detail Page + Save Recipe
// ==================

import { supabase } from "./supabaseClient.js";
import { showToast } from "./ui.js";


// SAVE BUTTON
const saveBtn = document.getElementById("savebtn");

// Scaling State
let baseRecipe = null;
let baseIngredients = [];
let scaleFactor = 1; // 1 = default recipe amounts
let scaledIngredients = []; //Keep the latest scaled list

// ==================
// Main Functions
// ==================

// Purpose: Load recipe and ingredients for recipe detail page.
export async function loadSingleRecipe(id) {
    //Fetch main recipe
    const cleanId = (id ?? "").trim();
    const { data: recipe, error: recipeError } = await supabase
        .from("recipes")
        .select("*")
        .eq("id", cleanId)
        .single();

        //Debugging
        console.log("URL id =", JSON.stringify(cleanId));
        console.log("URL id =", JSON.stringify(cleanId), "len=", cleanId.length);

    if (recipeError || !recipe) {
        console.error("Error loading recipe:", recipeError);
        document.getElementById("recipe-container").innerHTML =
        "<p>Error loading recipe.</p>";
        return;
    }

    //Fetch ingredients from normalized table
    const { data: ingredients, error: ingError } = await supabase
        .from("recipeingredients")
        .select("*")
        .eq("recipeid", id.toString());


    if (ingError) {
        console.error("Ingredient error:", ingError);
    }

    baseRecipe = recipe;
    baseIngredients = ingredients || [];
    scaleFactor = 1;
    scaledIngredients = structuredClone(baseIngredients);

    //Pass both to display function
    //displaySingleRecipe(recipe, ingredients || []);
    displaySingleRecipe(baseRecipe, scaledIngredients || []);
    setupScaling();
}


// Purpose: Render recipe details and ingredients list.
export function displaySingleRecipe(r, ingredients) {
    const container = document.getElementById("recipe-container");
    if (!container) return;

    const minutes = r.cooktime
        ? parseInt(r.cooktime.split(":")[1]) +
        parseInt(r.cooktime.split(":")[0]) * 60
        : "Unknown";

    const servings = r.servings ?? "N/A"; 
    const servingSize = r.serving_size ?? "N/A";

    const description = (r.description || "").trim();
    const directionsHtml = description
        ? `
        <div class="directions-box">
            <h3>Directions:</h3>
            <div class="recipe-description">${formatDirections(description)}</div>
        </div>
        `
        : "";
    
    const ingredientList = ingredients.length
        ? ingredients
            .map((ing, index) => {
            const name = ing.ingredient_name ?? "Unknown ingredient";
            const amount = ing.amount_per_ingredient ?? null;
            const unit = ing.units ?? "";

            // data-index lets us update the list item later
            return `
                <li class="ingredient-row" data-index="${index}">
                <span class="ing-amt">${formatAmount(amount)}</span>
                <span class="ing-unit">${unit}</span>
                <span class="ing-name">${name}</span>
                </li>
            `;
            })
            .join("")
        : "<li>No ingredients listed.</li>";

        container.innerHTML = `
        <article class="recipe-page">
        <h1 class="recipe-title">${r.name}</h1>

        <div class="recipe-imgwrap">
            <img src="${r.picture || "images/placeholder.png"}" class="recipe-image" alt="${r.name || "Recipe"}" />
        </div>

        <div class="recipe-pills">
            <div class="pill">
            <span class="pill__icon">⏱</span>
            <span>${minutes} min</span>
            </div>

            <div class="pill">
            <span class="pill__icon">🔥</span>
            <span>${r.calories ?? "N/A"} kcal</span>
            </div>

            <div class="pill">
            <span class="pill__icon">👥</span>
            <span>${servings} servings</span>
            </div>

            <div class="pill">
            <span class="pill__icon">🍽</span>
            <span>${servingSize}</span>
            </div>
        </div>

        <div class="ingredients-box">
            <h3>Ingredients:</h3>
            <ul id="ingredientsList">${ingredientList}</ul>
        </div>

        ${directionsHtml}

        <div class="scale-area">
            <p class="scale-label">How many servings do you want to make?</p>
            <div class="scale-row">
            <input type="number" id="servingScaler" min="1" placeholder="Enter number of servings..." />
            <button id="applyScaleBtn">Apply</button>
            <button id="resetScaleBtn" type="button">Reset</button>
            </div>
        </div>
        </article>
    `;
}

// Purpose: Attach handler to save recipe button.
export function setupSaveButton() {
    if (!saveBtn) return;

    saveBtn.addEventListener("click", () => {
        const container = document.getElementById("recipe-container");
        const recipeName = container?.querySelector("h1")?.textContent;
        const recipeId = new URLSearchParams(window.location.search).get("id");

        if (!recipeName || !recipeId)
        return showToast("Error: Cannot save recipe ❌");

        let saved = JSON.parse(localStorage.getItem("savedRecipes")) || [];
        if (saved.some((r) => r.id === recipeId))
        return showToast("Already saved ✔️");

        saved.push({ name: recipeName, id: recipeId });
        localStorage.setItem("savedRecipes", JSON.stringify(saved));

        showToast("Recipe saved! ❤️");
    });
}

// Purpose: Adjust num of ingredients based on user's inputted serving size.
function setupScaling() {
    const applyBtn = document.getElementById("applyScaleBtn");
    const resetBtn = document.getElementById("resetScaleBtn");
    const input = document.getElementById("servingScaler");

    if (applyBtn && input) {
        applyBtn.addEventListener("click", () => {
        if (!baseRecipe) return;

        const desired = Number(input.value);
        const baseServings = Number(baseRecipe.servings);

        if (!Number.isFinite(desired) || desired <= 0) {
            showToast("Enter a valid serving number ✅");
            return;
        }
        if (!Number.isFinite(baseServings) || baseServings <= 0) {
            showToast("This recipe has an invalid base servings value ❌");
            return;
        }

        scaleFactor = desired / baseServings;
        scaledIngredients = baseIngredients.map((ing) => ({
            ...ing,
            amount_per_ingredient:
            ing.amount_per_ingredient == null
                ? ing.amount_per_ingredient
                : Number(ing.amount_per_ingredient) * scaleFactor,
        }));

        updateIngredientsUI();
        updateScaleHint(desired, baseServings);

        showToast("Recipe scaled ✔️");
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
        scaleFactor = 1;
        scaledIngredients = structuredClone(baseIngredients);
        updateIngredientsUI();
        updateScaleHint(null, null);
        if (input) input.value = "";
        showToast("Back to original amounts ✔️");
        });
    }
}

// ==================
// Helper Functions
// ==================

// Purpose: Update ingredients for the user to see updated amounts after scaling
function updateIngredientsUI() {
    const list = document.getElementById("ingredientsList");
    if (!list) return;

    // update only amounts in-place
    const rows = list.querySelectorAll(".ingredient-row");
    rows.forEach((row) => {
        const idx = Number(row.dataset.index);
        const ing = scaledIngredients[idx];
        if (!ing) return;

        const amtEl = row.querySelector(".ing-amt");
        if (amtEl) amtEl.textContent = formatAmount(ing.amount_per_ingredient);
    });
}

// Purpose: Update a message to let the user know what they scaled to. 
function updateScaleHint(desired, baseServings) {
    const hint = document.getElementById("scaleHint");
    if (!hint) return;

    if (!desired || !baseServings) {
        hint.textContent = "";
        return;
    }

    const pct = Math.round(scaleFactor * 100);
    hint.textContent = `Scaled to ${desired} servings (${pct}% of original).`;
}

// Purpose: formatting helper so we don’t show 1.333333333
function formatAmount(x) {
    if (x == null || x === "") return "";
    const n = Number(x);
    if (!Number.isFinite(n)) return String(x);

    // show up to 2 decimals, but trim trailing zeros
    const rounded = Math.round(n * 100) / 100;
    return String(rounded).replace(/\.0+$|(\.\d*[1-9])0+$/, "$1");
}

// Purpose: Retrieve the updated, scaled ingredients list (used by shopping list)
export function getCurrentScaledIngredients() {
    return scaledIngredients.length ? scaledIngredients : baseIngredients;
}

// Purpose: Make the instructions formatted nicely
function formatDirections(text) {
  // normalize newlines
  const t = String(text).replace(/\r\n/g, "\n").trim();
  if (!t) return "";

  // split on blank lines OR single line breaks (we’ll treat each as a step-ish line)
  const lines = t.split(/\n+/).map(s => s.trim()).filter(Boolean);

  // if it's basically one blob, return as paragraph
  if (lines.length <= 1) {
    return `<p>${escapeHtml(t)}</p>`;
  }

  // if many lines, show as an ordered list
  const items = lines.map(line => `<li>${escapeHtml(line)}</li>`).join("");
  return `<ol class="directions-list">${items}</ol>`;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
