import { supabase } from "./supabase.js";

export async function loadSingleRecipe(id) {
  const { data: recipe, error: recipeError } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", id)
    .single();

  if (recipeError || !recipe) {
    document.getElementById("recipe-container").innerHTML =
      "<p>Error loading recipe.</p>";
    return;
  }

  const { data: ingredients, error: ingError } = await supabase
    .from("recipeingredients")
    .select("*")
    .eq("recipeid", id.toString());

  displaySingleRecipe(recipe, ingredients || []);
}

export function displaySingleRecipe(r, ingredients) {
  const container = document.getElementById("recipe-container");
  if (!container) return;

  const minutes = r.cooktime
    ? parseInt(r.cooktime.split(":")[1]) +
      parseInt(r.cooktime.split(":")[0]) * 60
    : "Unknown";

  const ingredientList = ingredients.length
    ? ingredients
        .map((ing) => {
          const name = ing.ingredient_name ?? "Unknown ingredient";
          const amount = ing.amount_per_ingredient ?? "";
          const unit = ing.units ?? "";
          return `<li>${amount} ${unit} ${name}</li>`;
        })
        .join("")
    : "<li>No ingredients listed.</li>";

  container.innerHTML = `
      <h1>${r.name}</h1>
      <img src="${r.picture || "images/placeholder.png"}" class="recipe-image" />

      <h3>Description</h3>
      <p>${r.description || "No description available."}</p>

      <h3>Cook Time</h3>
      <p>${minutes} minutes</p>

      <h3>Calories</h3>
      <p>${r.calories ?? "N/A"}</p>

      <h3>Servings</h3>
      <p>${r.servings ?? "N/A"}</p>

      <h3>Serving Size</h3>
      <p>${r.serving_size ?? "N/A"}</p>

      <h3>Ingredients</h3>
      <ul>${ingredientList}</ul>

      <h3>Tags</h3>
      <p>${r.tags?.join(", ") || "None"}</p>
  `;
}
