// ==================
// Search Filter Panel + Filter State
// ==================

import { normalizeText, singularize } from "./ui.js";

// Purpose: Central shared state for all search filters.
export const filterState = {
  cookTimeMax: 120,
  caloriesMin: null,
  caloriesMax: null,
  ingredients: [],
  ingredientMode: "include",
};


// ==================
// Main Functions
// ==================

// Purpose: Initialize filter panel UI and attach all filter event listeners.
export function setupFilters() {

    // FILTER ELEMENTS
    const filterButton = document.getElementById("filterButton");
    const filterPanel = document.getElementById("filterPanel");
    const closeFilterPanelBtn = document.getElementById("closeFilterPanel");

    const cookTimeSlider = document.getElementById("cookTimeSlider");
    const cookTimeSliderValue = document.getElementById("cookTimeSliderValue");

    const caloriesMinInput = document.getElementById("caloriesMin");
    const caloriesMaxInput = document.getElementById("caloriesMax");

    const ingredientFilterInput = document.getElementById("ingredientFilterInput");
    const addIngredientFilterBtn = document.getElementById("addIngredientFilterBtn");
    const ingredientFilterList = document.getElementById("ingredientFilterList");
    const ingredientModeSelect = document.getElementById("ingredientMode");

    const clearFiltersBtn = document.getElementById("clearFiltersBtn");
    const applyFiltersBtn = document.getElementById("applyFiltersBtn");

    const searchForm = document.getElementById("searchForm");

    if (!filterPanel || !filterButton) return;

    // Sync state with initial DOM values
    if (cookTimeSlider) filterState.cookTimeMax = Number(cookTimeSlider.value || 120);
    if (ingredientModeSelect) filterState.ingredientMode = ingredientModeSelect.value || "include";


    //Panel Open/Close
    if (filterButton && filterPanel && closeFilterPanelBtn) {
        filterButton.addEventListener("click", () =>
        filterPanel.classList.remove("hidden")
        );
        closeFilterPanelBtn.addEventListener("click", () =>
        filterPanel.classList.add("hidden")
        );
    }
    // Cook Time Slider
    if (cookTimeSlider && cookTimeSliderValue) {
        cookTimeSliderValue.textContent = cookTimeSlider.value;
        cookTimeSlider.addEventListener("input", () => {
        cookTimeSliderValue.textContent = cookTimeSlider.value;
        filterState.cookTimeMax = Number(cookTimeSlider.value);
        });
    }
    //Calories Inputs
    if (caloriesMinInput) {
        caloriesMinInput.addEventListener("input", () => {
        const v = caloriesMinInput.value.trim();
        filterState.caloriesMin = v === "" ? null : Number(v);
        });
    }

    if (caloriesMaxInput) {
        caloriesMaxInput.addEventListener("input", () => {
        const v = caloriesMaxInput.value.trim();
        filterState.caloriesMax = v === "" ? null : Number(v);
        });
    }

    //Ingredients add/remove
      if (addIngredientFilterBtn && ingredientFilterInput && ingredientFilterList) {
        addIngredientFilterBtn.addEventListener("click", () => {
        const raw = ingredientFilterInput.value.trim();
        if (!raw) return;

        raw.split(",").forEach((chunk) => {
            const cleaned = singularize(normalizeText(chunk));
            if (cleaned && !filterState.ingredients.includes(cleaned)) {
            filterState.ingredients.push(cleaned);
            }
        });

        ingredientFilterInput.value = "";
        renderIngredientList(ingredientFilterList);
        });
    }

    if (ingredientFilterList) {
        ingredientFilterList.addEventListener("click", (e) => {
        const btn = e.target.closest(".remove-ingredient");
        if (!btn) return;

        const li = btn.closest("li");
        const index = Number(li?.dataset?.index);
        if (Number.isNaN(index)) return;

        filterState.ingredients.splice(index, 1);
        renderIngredientList(ingredientFilterList);
        });
    }
    //Ingredient mode -> include or exclude selection
    if (ingredientModeSelect) {
        ingredientModeSelect.addEventListener("change", () => {
        filterState.ingredientMode = ingredientModeSelect.value;
        });
    }
    //Clear Filters
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener("click", () => {
        // cook time
        if (cookTimeSlider) {
            cookTimeSlider.value = "120";
            cookTimeSliderValue.textContent = "120";
            filterState.cookTimeMax = 120;
        }
        // calories
        if (caloriesMinInput) caloriesMinInput.value = "";
        if (caloriesMaxInput) caloriesMaxInput.value = "";

        filterState.caloriesMin = null;
        filterState.caloriesMax = null;
        // ingredients
        filterState.ingredients = [];
        renderIngredientList(ingredientFilterList);
        //mode
        if (ingredientModeSelect)
            ingredientModeSelect.value = "include";
        filterState.ingredientMode = "include";
        });
    }
    // Apply Filters: close + trigger search submit
    if (applyFiltersBtn && filterPanel && searchForm) {
        applyFiltersBtn.addEventListener("click", () => {
        filterPanel.classList.add("hidden");
        searchForm.dispatchEvent(new Event("submit"));

        // Also trigger recommendations refresh
        document.dispatchEvent(new Event("filters:applied"));
        });
    }
}

// ==================
// Helper Functions
// ==================

// Purpose: Render selected ingredient filters in the UI.
function renderIngredientList(listEl) {
  if (!listEl) return;

  listEl.innerHTML = filterState.ingredients
    .map(
      (ing, index) =>
        `<li data-index="${index}">
            <span>${ing}</span>
            <button class="remove-ingredient">x</button>
        </li>`
    )
    .join("");
}
