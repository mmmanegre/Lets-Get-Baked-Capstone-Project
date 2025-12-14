// ==================
// Recommendations
// ==================

import { supabase } from "./supabaseClient.js";
import { normalizeText, singularize, minutesToTimeString } from "./ui.js";
import { getBlockedIngredientsForUser } from "./profile.js";
import { filterState } from "./filters.js";
import { recipePassesIngredientRules } from "./ui.js";

// ==================
// Main Functions
// ==================

// Purpose: Load & Render Recommendations
export async function setupRecommendations(loggedInUser) {
    const section = document.getElementById("recommendedSection");
    const box = document.getElementById("recommendedBox");
    if (!section || !box || !loggedInUser) return;

    // Fetch user's saved tags
    const userTags = await fetchUserTags(loggedInUser);
    if (userTags.length === 0) {
        section.style.display = "none";
        return;
    }

    // Fetch blocked ingredients/preferences
    const blocked = await getBlockedIngredientsForUser(loggedInUser);
    const blockedNorm = (blocked || [])
        .map((x) => singularize(normalizeText(x)))
        .filter(Boolean);

    // Pull recipes that match ANY of the user tags
    let query = supabase.from("recipes").select("*");

    // Apply global filters
    if (filterState.cookTimeMax != null) {
    query = query.lte("cooktime", minutesToTimeString(filterState.cookTimeMax));
    }
    if (filterState.caloriesMin != null) {
    query = query.gte("calories", filterState.caloriesMin);
    }
    if (filterState.caloriesMax != null) {
    query = query.lte("calories", filterState.caloriesMax);
    }

    const tagOr = userTags
        .map((t) => t.replace(/["{}]/g, "").trim())
        .filter(Boolean)
        .map((t) => `tags.cs.{"${t}"}`)
        .join(",");

    query = query.or(tagOr).limit(30); // grab extra so we can filter by ingredients afterwards

    const { data: candidates, error } = await query;

    if (error) {
        console.error("Recommendation query error:", error);
        section.style.display = "none";
        return;
    }

    if (!candidates || candidates.length === 0) {
        section.style.display = "none";
        return;
    }

    // Ingredient filtering (remove recipes containing blocked ingredients/preferences)
   /* const recipeIds = candidates.map((r) => r.id);
    const ingredientsByRecipeId = await fetchIngredientsForRecipeIds(recipeIds);

    const filtered = candidates.filter((r) => {
        if (blockedNorm.length === 0) return true; // no allergies/preferences set
        const ingNames = ingredientsByRecipeId[r.id] || [];
        return recipeDoesNotContainBlocked(ingNames, blockedNorm);
    });*/

    // Build ingredient include/exclude lists from filterState
    const includeIngredients =
    (filterState.ingredientMode === "include" ? filterState.ingredients : [])
        .map((x) => singularize(normalizeText(x)))
        .filter(Boolean);

    const excludeFromFilters =
    (filterState.ingredientMode === "exclude" ? filterState.ingredients : [])
        .map((x) => singularize(normalizeText(x)))
        .filter(Boolean);

    // Blocked from preferences (always excluded)
    const allExcluded = [...excludeFromFilters, ...blockedNorm]
    .map((x) => singularize(normalizeText(x)))
    .filter(Boolean);

    // Fetch ingredients for candidates so we can filter accurately
    const recipeIds = candidates.map((r) => r.id);
    const ingredientsByRecipeId = await fetchIngredientsForRecipeIds(recipeIds);

    // Apply ingredient rules (include all / exclude any)
    const needsIngredientFiltering = includeIngredients.length > 0 || allExcluded.length > 0;

    const filtered = needsIngredientFiltering
    ? candidates.filter((r) => {
        const ingNames = ingredientsByRecipeId[r.id] || [];
        return recipePassesIngredientRules(ingNames, includeIngredients, allExcluded);
        })
    : candidates;


    // Pick up to 4 (randomized) recommendations
    const chosen = shuffle(filtered).slice(0, 4);

    if (chosen.length === 0) {
        section.style.display = "none";
        return;
    }

    renderRecipeCards(box, chosen);
}

// ==================
// Helper Functions
// ==================

// Purpose: Get user tags to generate recommendations
async function fetchUserTags(loggedInUser) {
    const username = loggedInUser.username;

    const { data, error } = await supabase
        .from("users")
        .select("tags")
        .eq("username", username)
        .single();

    if (error) {
        console.error("fetchUserTags error:", error);
        return [];
    }

    return (data?.tags || [])
        .map((t) => normalizeText(t))
        .filter(Boolean);
}

// Purpose: Get ingredients for the selected recipe to compare
async function fetchIngredientsForRecipeIds(recipeIds) {
    if (!recipeIds || recipeIds.length === 0) return {};

    const { data, error } = await supabase
        .from("recipeingredients")
        .select("recipeid, ingredient_name")
        .in("recipeid", recipeIds);

    if (error) {
        console.error("recipeingredients fetch error:", error);
        return {};
    }

    const map = {};
    (data || []).forEach((row) => {
        const rid = row.recipeid;
        const name = normalizeText(row.ingredient_name || "");
        if (!rid) return;
        if (!map[rid]) map[rid] = [];
        if (name) map[rid].push(name);
    });

    return map;
}

// Purpose: Evaluate if the recipe contains ingredients on the user's preference list or not (Only those that don't should be returned)
function recipeDoesNotContainBlocked(recipeIngredientNames, blockedList) {
    const ingredientsNorm = (recipeIngredientNames || []).map((x) => normalizeText(x));
    const ingredientsSing = ingredientsNorm.map((x) => singularize(x));

    const hasBlocked = blockedList.some((b) => {
        const needle = normalizeText(b);
        const needleSing = singularize(needle);

        return (
        ingredientsNorm.some((name) => name.includes(needle) || name.includes(needleSing)) ||
        ingredientsSing.some((name) => name.includes(needle) || name.includes(needleSing))
        );
    });

    return !hasBlocked;
}

// Purpose: Display the recipes in the recommendations section
function renderRecipeCards(container, recipes) {

    if (!container) return;

    container.classList.add("results-grid");
    container.innerHTML = "";

    if (!recipes || recipes.length === 0) {
        container.innerHTML = "<p>No recipes found. </p>"
        return;
    }

    recipes.forEach((r) => {
        const minutes = r.cooktime
        ? parseInt(r.cooktime.split(":")[1]) + parseInt(r.cooktime.split(":")[0]) * 60
        : "Unknown";

        const tagsText = Array.isArray(r.tags) ? r.tags.join(", ") : (r.tags || "");

        const card = document.createElement("a");
        card.className = "recipe-card";
        card.href = `./recipe.html?id=${encodeURIComponent(r.id)}`;

        card.innerHTML = `
        <div class="recipe-card__imgwrap">
            <img src="${r.picture || "images/placeholder.png"}" alt="${r.name || "Recipe"}" />
        </div>

        <div class="recipe-card__body">
            <div class="recipe-card__title">${r.name || "Untitled"}</div>

            <div class="recipe-card__meta">
            <span class="pill">
                <span class="pill__icon">⏱</span>
                ${minutes} min
            </span>
            <span class="pill">
                <span class="pill__icon">🔥</span>
                ${r.calories ?? "N/A"} kcal
            </span>
            </div>

            <div class="recipe-card__tags">${tagsText}</div>
        </div>
        `;

        container.appendChild(card);
    });
}

// Shuffle through recipes to generate new suggestions
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
