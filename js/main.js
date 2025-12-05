import { setupLogin, setupSignup, setupLogout } from "./auth.js";
import { setupFilters } from "./filters.js";
import { setupSearch } from "./search.js";
import { setupSaveButton } from "./save.js";
import { loadSingleRecipe } from "./recipes.js";

document.addEventListener("DOMContentLoaded", () => {
  const page = window.location.pathname.split("/").pop() || "index.html";

  // USER LOGIN DATA
  const storedUser = localStorage.getItem("loggedInUser");
  const loggedInUser = storedUser ? JSON.parse(storedUser) : null;

  // Redirect logic
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
  setupFilters();
  setupSearch(loggedInUser);

  // If on recipe.html → load recipe
  if (page === "recipe.html") {
    const id = new URLSearchParams(window.location.search).get("id");
    if (id) loadSingleRecipe(id);
  }

  setupSaveButton();
});
