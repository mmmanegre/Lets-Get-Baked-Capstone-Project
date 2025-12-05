import {
  filterButton,
  filterPanel,
  closeFilterPanelBtn,
  cookTimeSlider,
  cookTimeSliderValue,
  caloriesMinInput,
  caloriesMaxInput,
  ingredientFilterInput,
  addIngredientFilterBtn,
  ingredientFilterList,
  ingredientModeSelect,
  clearFiltersBtn,
  applyFiltersBtn,
  searchForm,
  filterState
} from "./globals.js";

export function setupFilters() {
  if (filterButton && filterPanel && closeFilterPanelBtn) {
    filterButton.addEventListener("click", () =>
      filterPanel.classList.remove("hidden")
    );
    closeFilterPanelBtn.addEventListener("click", () =>
      filterPanel.classList.add("hidden")
    );
  }

  if (cookTimeSlider && cookTimeSliderValue) {
    cookTimeSliderValue.textContent = cookTimeSlider.value;
    cookTimeSlider.addEventListener("input", () => {
      cookTimeSliderValue.textContent = cookTimeSlider.value;
      filterState.cookTimeMax = Number(cookTimeSlider.value);
    });
  }

  if (addIngredientFilterBtn && ingredientFilterInput) {
    addIngredientFilterBtn.addEventListener("click", () => {
      const raw = ingredientFilterInput.value.trim().toLowerCase();
      if (!raw) return;

      raw.split(",").forEach((i) => {
        const ing = i.trim();
        if (ing && !filterState.ingredients.includes(ing))
          filterState.ingredients.push(ing);
      });

      ingredientFilterInput.value = "";
      renderIngredientList();
    });
  }

  if (ingredientFilterList) {
    ingredientFilterList.addEventListener("click", (e) => {
      if (!e.target.classList.contains("remove-ingredient")) return;

      const li = e.target.closest("li");
      const index = Number(li.dataset.index);
      filterState.ingredients.splice(index, 1);
      renderIngredientList();
    });
  }

  if (ingredientModeSelect) {
    ingredientModeSelect.addEventListener("change", () => {
      filterState.ingredientMode = ingredientModeSelect.value;
    });
  }

  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener("click", () => {
      if (cookTimeSlider) {
        cookTimeSlider.value = "30";
        cookTimeSliderValue.textContent = "30";
        filterState.cookTimeMax = 30;
      }

      if (caloriesMinInput) caloriesMinInput.value = "";
      if (caloriesMaxInput) caloriesMaxInput.value = "";

      filterState.caloriesMin = null;
      filterState.caloriesMax = null;
      filterState.ingredients = [];
      renderIngredientList();

      if (ingredientModeSelect)
        ingredientModeSelect.value = "include";
      filterState.ingredientMode = "include";
    });
  }

  if (applyFiltersBtn && filterPanel && searchForm) {
    applyFiltersBtn.addEventListener("click", () => {
      filterPanel.classList.add("hidden");
      searchForm.dispatchEvent(new Event("submit"));
    });
  }
}

function renderIngredientList() {
  if (!ingredientFilterList) return;

  ingredientFilterList.innerHTML = filterState.ingredients
    .map(
      (ing, index) =>
        `<li data-index="${index}">
            <span>${ing}</span>
            <button class="remove-ingredient">x</button>
        </li>`
    )
    .join("");
}
