// ==================
// App Initialization + Page Routing
// ==================

import { setupLogin, setupSignup, setupLogout } from "./auth.js";
import { setupFilters } from "./filters.js";
import { setupSearch } from "./search.js";
import { setupProfile, loadPreferences, loadUserTags } from "./profile.js";
import { loadSingleRecipe, setupSaveButton } from "./recipe.js";
import { setupSavedRecipes } from "./savedrecipes.js";
import { setupShoppingList, setupCartButton } from "./shoppingList.js";
import { setupRecommendations } from "./recommendations.js";


// =======================
// Page Initialization
// =======================
document.addEventListener("DOMContentLoaded", () => {
  const page = window.location.pathname.split("/").pop() || "index.html";

  // User Login Data
  const storedUser = localStorage.getItem("loggedInUser");
  const loggedInUser = storedUser ? JSON.parse(storedUser) : null;

  // Redirect logic for first 2 initial pages
  if (!loggedInUser && (page === "index.html" || page === "")) {
    window.location.href = "login.html";
    return;
  }
  if (loggedInUser && (page === "login.html" || page === "signup.html")) {
    window.location.href = "index.html";
    return;
  }

  setupLogin();
  setupSignup();
  setupLogout(loggedInUser);

// =======================
// Page Specific Behavior
// =======================

  // Home Page: search + filters
  if (page == "index.html" || page === "") {
      setupFilters();
      setupSearch(loggedInUser);
      setupRecommendations(loggedInUser);

      document.addEventListener("filters:applied", () => {
        setupRecommendations(loggedInUser);
      });
  }

  // Profile Page: Load prefs & tags/interests
  if (loggedInUser && page === "profile.html") {
      setupProfile();
      loadPreferences(loggedInUser.username);
      loadUserTags(loggedInUser.username);
  }

  // Recipe Page: Load recipe & Save Button
  if (page === "recipe.html") {
    const id = new URLSearchParams(window.location.search).get("id");
    if (id) loadSingleRecipe(id);
    setupSaveButton();
    setupCartButton();
  }

  // Saved Recipes Page: Load Saved Recipes
  if (page === "savedrecipes.html") {
    setupSavedRecipes();
  }

  // Shopping List Page: Load List of Ingredients & Qty
  if (page === "shop.html") {
    setupShoppingList();
  }


});
