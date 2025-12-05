import { supabase } from "./supabase.js";

export async function addIngredientsToCart(recipe) {
  const storedUser = localStorage.getItem("loggedInUser");
  const loggedInUser = storedUser ? JSON.parse(storedUser) : null;

  if (!loggedInUser) {
    showToast("Please log in to add items 🛒");
    return;
  }

  const username = loggedInUser.username;

  const ingredients = recipe.ingredients || [];
  if (ingredients.length === 0) {
    showToast("No ingredients to add ⚠️");
    return;
  }

  const rows = ingredients.map((ing) => ({
    username: username,
    ingredient: ing,
    recipe_id: recipe.id,
  }));

  const { error } = await supabase.from("shopping_list").insert(rows);

  if (error) {
    showToast("Could not add to cart ❌");
  } else {
    showToast("Ingredients added to shopping list! 🛒");
  }
}

function showToast(msg) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2000);
}
