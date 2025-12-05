import { supabase, minutesToTimeString } from "./supabase.js";
import {
  searchForm,
  searchInput,
  resultsBox,
  mainArea,
  filterState,
} from "./globals.js";
import { getBlockedIngredientsForUser } from "./preferences.js";

export function setupSearch(loggedInUser) {
  if (!searchForm) return;

  searchForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const term = searchInput?.value.trim().toLowerCase() || "";

    if (!term) {
      fetchAllRecipes();
      return;
    }

    const blockedIngredients = await getBlockedIngredientsForUser(loggedInUser);
    let query = supabase.from("recipes").select("*");

    query = query.ilike("name", `%${term}%`);

    if (filterState.cookTimeMax != null)
      query = query.lte("cooktime", minutesToTimeString(filterState.cookTimeMax));

    if (filterState.ingredients.length > 0) {
      if (filterState.ingredientMode === "include")
        query = query.contains("ingredients", filterState.ingredients);
      else query = query.not("ingredients", "ov", filterState.ingredients);
    }

    if (blockedIngredients.length > 0)
      query = query.not("ingredients", "ov", blockedIngredients);

    const { data, error } = await query;

    if (error || !data) {
      mainArea.innerHTML = "<p>Error during search.</p>";
      return;
    }

    if (data.length === 0) {
      mainArea.innerHTML = `<p>No recipes found for "${term}".</p>`;
      return;
    }

    mainArea.innerHTML = data
      .map(
        (r) => `
        <li>
            <a href="./recipe.html?id=${r.id}">${r.name}</a>
            <small>${r.cooktime || ""} ${
          r.calories ? `, ${r.calories} kcal` : ""
        }</small>
        </li>`
      )
      .join("");
  });
}

async function fetchAllRecipes() {
  const { data } = await supabase.from("recipes").select("*");
  displayResults(data || []);
}

function displayResults(list) {
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
      ? parseInt(r.cooktime.split(":")[1]) +
        parseInt(r.cooktime.split(":")[0]) * 60
      : "Unknown";

    div.innerHTML = `
      <a href="./recipe.html?id=${r.id}">
        <h3>${r.name}</h3>
        <img src="${r.picture || "images/placeholder.png"}" height="120" />
      </a>
      <p><strong>Cook Time:</strong> ${minutes} min</p>
      <p><strong>Calories:</strong> ${r.calories ?? "N/A"}</p>
      <p><strong>Tags:</strong> ${r.tags?.join(", ") || "None"}</p>
    `;

    resultsBox.appendChild(div);
  });
}
