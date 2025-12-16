// ==================
// Saved Recipes Page (localStorage Why?)
// ==================

import { supabase } from "./supabaseClient.js";

let savedList = null;
let savedRecipes = [];
let lastRemoved = null;

// ==================
// Main Functions
// ==================

// Purpose: Loads saved recipes and initializes all event handlers. 
export async function setupSavedRecipes() {
    savedList = document.getElementById("saved-list");
    if (!savedList) return;

    savedRecipes = JSON.parse(localStorage.getItem("savedRecipes")) || [];
    const rawSaved = JSON.parse(localStorage.getItem("savedRecipes")) || [];
    lastRemoved = null;

    // If nothing saved, render empty state
    if (rawSaved.length === 0) {
        savedRecipes = [];
        renderSavedRecipes();
        return;
    }

    // Pull IDs and fetch real recipe rows
    const ids = rawSaved.map(r => r.id).filter(Boolean);

    const { data, error } = await supabase
        .from("recipes")
        .select("id, name, picture, cooktime, calories")
        .in("id", ids);

    if (error) {
        console.error("Error fetching saved recipe details:", error);
        // fallback: just show names/ids
        savedRecipes = rawSaved;
        renderSavedRecipes();
        return;
    }

    // Map by id so we can preserve local ordering + anything localStorage has
    const byId = new Map((data || []).map(r => [r.id, r]));

    // Merge: keep local order, fill in missing rows if any
    savedRecipes = rawSaved.map(r => ({
        ...r,
        ...(byId.get(r.id) || {})   // adds picture/cooktime/calories when found
    }));

    renderSavedRecipes();
}

// Purpose: Render the list of saved recipes to the page. 
function renderSavedRecipes() {
    savedList.innerHTML = ""; 

    savedList.classList.add("results-grid");

    if (savedRecipes.length === 0) {
        savedList.innerHTML = "<p>No saved recipes yet.</p>";
        return;
    }

      savedRecipes.forEach((recipe, index) => {
    // Card is a link so clicking it navigates
    const card = document.createElement("a");
    card.className = "recipe-card";
    card.href = `recipe.html?id=${encodeURIComponent(recipe.id)}`;

    // If you stored a picture in localStorage, show it. Otherwise use placeholder.
    const imgSrc = recipe.picture || "images/placeholder.png";

    // If you stored cooktime/calories, show them. Otherwise show "N/A"
    const minutes =
      recipe.cooktime
        ? parseInt(recipe.cooktime.split(":")[1]) + parseInt(recipe.cooktime.split(":")[0]) * 60
        : "N/A";

    const calories = recipe.calories ?? "N/A";

    card.innerHTML = `
      <div class="recipe-card__imgwrap">
        <img src="${imgSrc}" alt="${recipe.name || "Recipe"}" />
      </div>

      <div class="recipe-card__body">
        <div class="recipe-card__title">${recipe.name || "Untitled"}</div>

        <div class="recipe-card__meta">
          <span class="pill"><span class="pill__icon">⏱</span>${minutes} min</span>
          <span class="pill"><span class="pill__icon">🔥</span>${calories} kcal</span>
        </div>

        <button type="button" class="remove-btn">REMOVE</button>
      </div>
    `;

    // REMOVE button should NOT trigger navigation
    const removeBtn = card.querySelector(".remove-btn");
    removeBtn.addEventListener("click", (e) => {
      e.preventDefault();   // stop link navigation
      e.stopPropagation();  // stop bubbling to the <a>

      showConfirm(`Remove "${recipe.name}"?`, () => {
        lastRemoved = savedRecipes.splice(index, 1)[0];
        localStorage.setItem("savedRecipes", JSON.stringify(savedRecipes));
        renderSavedRecipes();
        showUndoToast(`Removed "${recipe.name}"`, true);
      });
    });

    savedList.appendChild(card);

    /*
    savedRecipes.forEach((recipe, index) => {
        const wrapper = document.createElement("div");
        wrapper.style.marginBottom = "10px";

        const link = document.createElement("a");
        link.href = `recipe.html?id=${recipe.id}`;
        link.textContent = recipe.name;
        link.style.marginRight = "10px";

        const removeBtn = document.createElement("button");
        removeBtn.textContent = "Remove ❌";
        removeBtn.style.cursor = "pointer";
        removeBtn.style.padding = "4px 8px";

        removeBtn.onclick = () => {
            showConfirm(`Remove "${recipe.name}"?`, () => {
                lastRemoved = savedRecipes.splice(index, 1)[0];
                localStorage.setItem("savedRecipes", JSON.stringify(savedRecipes));
                renderSavedRecipes();
                showUndoToast(`Removed "${recipe.name}"`, true);
            });
        };

        wrapper.appendChild(link);
        wrapper.appendChild(removeBtn);
        savedList.appendChild(wrapper);
    */
    });
}

// ==================
// Helper Functions
// ==================

// Purpose: Show a confirmation popup before removing a recipe.
function showConfirm(message, confirmCallback) {
    const popup = document.getElementById("confirm-popup");
    const confirmMessage = document.getElementById("confirm-message");
    const yesBtn = document.getElementById("confirm-yes");
    const noBtn = document.getElementById("confirm-no");

    confirmMessage.textContent = message;
    popup.classList.remove("hidden");

    yesBtn.onclick = () => {
        popup.classList.add("hidden");
        confirmCallback();
    };

    noBtn.onclick = () => popup.classList.add("hidden");
}

// Purpose: Remove a saved recipe and store it temporarily for undo
//removeSavedRecipe(recipeIndex)

// Purpose: Restore the last removed recipe (undo functionality)
function undoRemove() {
    if (lastRemoved) {
        savedRecipes.push(lastRemoved);
        localStorage.setItem("savedRecipes", JSON.stringify(savedRecipes));
        lastRemoved = null;
        renderSavedRecipes();
        showUndoToast("Undo complete ✔️");
    }
}

// Purpose: Display a toast message with optional Undo button
function showUndoToast(message, undo = false) {
    const toast = document.getElementById("toast");
    toast.innerHTML = message + (undo ? ' <button id="undo-btn">Undo</button>' : '');
    toast.classList.add("show");

    if (undo) {
        document.getElementById("undo-btn").onclick = undoRemove;
    }

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}
