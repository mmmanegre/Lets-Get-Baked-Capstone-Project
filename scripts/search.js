// ==================
// Recipe Search + Results Rendering
// ==================

import { supabase } from "./supabaseClient.js";
import { filterState } from "./filters.js";
import { minutesToTimeString, singularize, normalizeText } from "./ui.js";
import { getBlockedIngredientsForUser } from "./profile.js";
import { recipePassesIngredientRules } from "./ui.js";


// ==================
// Main Functions
// ==================

// Purpose: Attach submit handler to search form. Executes recipe search with filters applied.
export function setupSearch(loggedInUser) {

    // Grab DOM elements safely
    const searchForm = document.getElementById("searchForm");
    const searchInput = document.getElementById("searchInput");
    const resultsBox = document.getElementById("resultsBox");
    //const mainArea = document.querySelector("main");

    if (!searchForm || !resultsBox) return;

    //If we want to display all recipes at first?
    fetchAllRecipes(resultsBox, loggedInUser).catch(console.error);

    searchForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    await runSearch(resultsBox, searchInput, loggedInUser);

  });
}

// Purpose: Fetch all recipes (no search term).
async function fetchAllRecipes(resultsBox, loggedInUser) {
  const { data } = await supabase.from("recipes").select("*");
  displayResults(resultsBox, data || []);
}

/*
// Purpose: Render search result list
function displayResults(resultsBox, list) {
  if (!resultsBox) return;

  resultsBox.innerHTML = "";

  if (list.length === 0) {
    resultsBox.innerHTML = "<p>No recipes found.</p>";
    return;
  }

  list.forEach((r) => {
    const div = document.createElement("div");
    div.className = "search-result";

    const minutes = r.cooktime
      ? parseInt(r.cooktime.split(":")[1]) + parseInt(r.cooktime.split(":")[0]) * 60
      : "Unknown";

    div.innerHTML = `
      <a href="./recipe.html?id=${r.id}">
        <h3>${r.name}</h3>
        <img src="${r.picture || "images/placeholder.png"}" height="120" />
      </a>
      <p><strong>Cook Time:</strong> ${minutes} min</p>
      <p><strong>Calories:</strong> ${r.calories ?? "N/A"}</p>
      <p><strong>Tags:</strong> ${Array.isArray(r.tags) ? r.tags.join(", ") : (r.tags || "None")}</p>
    `;

    resultsBox.appendChild(div);
  });
}
  */
function displayResults(resultsBox, list) {
  if (!resultsBox) return;

  resultsBox.innerHTML = "";
  resultsBox.classList.add("results-grid");

  if (!list || list.length === 0) {
    resultsBox.innerHTML = "<p>No recipes found.</p>";
    return;
  }

  list.forEach((r) => {
    const minutes = r.cooktime
      ? parseInt(r.cooktime.split(":")[1]) + parseInt(r.cooktime.split(":")[0]) * 60
      : null;

    // Make the entire card a link
    const a = document.createElement("a");
    a.className = "recipe-card";
    a.href = `./recipe.html?id=${encodeURIComponent(r.id)}`;

    a.innerHTML = `
      <div class="recipe-card__imgwrap">
        <img src="${r.picture || "images/placeholder.png"}" alt="${r.name}" />
      </div>

      <h3 class="recipe-card__title">${r.name}</h3>

      <div class="recipe-card__meta">
        <div class="pill">
          <span class="pill__icon">⏱</span>
          <span>${minutes ?? "?"} min</span>
        </div>
        <div class="pill">
          <span class="pill__icon">🔥</span>
          <span>${r.calories ?? "N/A"} kcal</span>
        </div>
      </div>

      <div class="recipe-card__tags">
        ${
          Array.isArray(r.tags) && r.tags.length
            ? r.tags.join(", ")
            : (r.tags || "None")
        }
      </div>
    `;

    resultsBox.appendChild(a);
  });
}


// ==================
// Helper Functions
// ==================

// Purpose: Run search using recipes table filters first, then ingredient filtering
async function runSearch(resultsBox, searchInput, loggedInUser) {

    console.log("FILTER STATE:", JSON.stringify(filterState));

    const term = (searchInput?.value || "").trim();

    // only fetchAllRecipes when there are NO filters AND no term
    const hasAnyFilter =
        (filterState.cookTimeMax != null && filterState.cookTimeMax !== 120) ||
        filterState.caloriesMin != null ||
        filterState.caloriesMax != null ||
        (filterState.ingredients && filterState.ingredients.length > 0);

    if (!term && !hasAnyFilter) {
      await fetchAllRecipes(resultsBox, loggedInUser);
      return;
    }

    // ==============
    // Get ingredients to filter by
    // ==============

    // Get the ingredients from the filter the user wants included
    const includeIngredients =
        (filterState.ingredientMode === "include" ? filterState.ingredients : [])
            .map((x) => singularize(normalizeText(x)))
            .filter(Boolean);

    // Get the ingredients from the filter the user wants excluded
    const excludeIngredients =
        (filterState.ingredientMode === "exclude" ? filterState.ingredients : [])
            .map((x) => singularize(normalizeText(x)))
            .filter(Boolean);

    // Get the ingredients from the user's preference list and exclude them
    const blockedIngredients = await getBlockedIngredientsForUser(loggedInUser);

    const allExcluded = [...excludeIngredients, ...blockedIngredients]
        .map((x) => singularize(normalizeText(x)))
        .filter(Boolean);
    
    // ==============
    // Query Recipes based on basic filters and search term
    // ==============

    let query = supabase.from("recipes").select("*");

    //if (term) query = query.ilike("name", `%${term}%`); //Old basic search

    const rawTerm = normalizeText(term);
    const singularTerm = singularize(rawTerm);

    if (rawTerm) {
        const terms = Array.from(new Set([rawTerm, singularTerm])).filter(Boolean);

        const namePatterns = terms.map((t) => `name.ilike.%${t}%`).join(",");

        const tagPatterns = terms
            .map((t) => t.replace(/["{}]/g, "").trim())
            .filter(Boolean)
            .map((t) => `tags.cs.{"${t}"}`)
            .join(",");


        query = query.or([namePatterns, tagPatterns].filter(Boolean).join(","));

        /*
        const patterns = Array.from(new Set([rawTerm, singularTerm]))
            .filter(Boolean)
            .map((t) => `name.ilike.%${t}%`)
            .join(",");
        query = query.or(patterns);
        */
    }

    if (filterState.cookTimeMax != null)
      query = query.lte("cooktime", minutesToTimeString(filterState.cookTimeMax));

    if (filterState.caloriesMin != null)
      query = query.gte("calories", filterState.caloriesMin);

    if (filterState.caloriesMax != null)
      query = query.lte("calories", filterState.caloriesMax);

    const { data: recipes, error: recipeErr } = await query;

    if (recipeErr) {
        console.error("Supabase recipes query error: ", recipeErr);
        resultsBox.innerHTML = `<p>Error during search.</p>`;
        return;
    }

    if (!recipes || recipes.length === 0) {
        resultsBox.innerHTML = term
            ? `<p>No recipes found for "${term}".</p>`
            : `<p>No recipes found.</p>`;
        return;
    }

    // ==============
    // Filter returned Recipes by ingredients
    // ==============

    const needsIngredientFiltering = 
        includeIngredients.length > 0 || allExcluded.length > 0;

    let finalRecipes = recipes;

    if (needsIngredientFiltering) {
        const recipeIds = recipes.map((r) => r.id);
        const ingredientsByRecipeId = await fetchIngredientsForRecipeIds(recipeIds);

        finalRecipes = recipes.filter((r) => {
            const ingNames = ingredientsByRecipeId[r.id] || [];
            return recipePassesIngredientRules(ingNames, includeIngredients, allExcluded);
        });
    }

    if (finalRecipes.length === 0) {
        resultsBox.innerHTML = '<p>No recipes found with your filters</p>';
        return;
    }

    displayResults(resultsBox, finalRecipes);
}

// Purpose: Fetch ingredients for multiple recipes using recipe IDs.
async function fetchIngredientsForRecipeIds(recipeIds) {
    if (!recipeIds || recipeIds.length == 0) return {};

    const {data, error} = await supabase
        .from("recipeingredients")
        .select("recipeid, ingredient_name")
        .in("recipeid", recipeIds);
    
    if (error) {
        console.error("Supabase recipeingredients error: ", error);
        return {};
    }

    const map = {};
    (data || []).forEach((row) => {
        const rid = row.recipeid;
        const name = (row.ingredient_name || "").toLowerCase().trim();
        if (!rid) return;
        if (!map[rid]) map[rid] = [];
        if (name) map[rid].push(name);
    });

    return map;
}

