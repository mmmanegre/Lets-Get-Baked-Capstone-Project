// ==================
// Shopping List (Local Storage Why?)
// ==================

import { getCurrentScaledIngredients } from "./recipe.js";
import { showToast, normalizeText, singularize } from "./ui.js";

let listEl = null;

// ==================
// Main Functions
// ==================

// Purpose: Load and Render Shopping List
export function setupShoppingList() {
    listEl = document.getElementById("shopping-list");
    if (!listEl) return;
    renderList(getShoppingList());

    const clearBtn = document.getElementById("clearShoppingBtn");
    if (clearBtn) {
        clearBtn.addEventListener("click", clearShoppingList);
    } else {
        console.error("❌ clearShoppingBtn not found in DOM")
    }
}

// Purpose: Trigger Add To Shopping List if cart button clicked (recipe.html)
export function setupCartButton() {
    const cartBtn = document.getElementById("cartbtn");

    if (!cartBtn) {
        console.error("❌ cartbtn not found");
        return;
    }

    cartBtn.addEventListener("click", addToShoppingList);
}


// Purpose: Add current (scaled) recipe ingredients to shopping list.
function addToShoppingList() {

    const scaled = getCurrentScaledIngredients();

    if (!scaled || scaled.length === 0) {
        showToast("No ingredients found ❌");
        return;
    }

    const shoppingList = getShoppingList(); // array of key, name, unit, amount
    const index = buildIndex(shoppingList);

    for (const ing of scaled) {
        const nameRaw = ing.ingredient_name ?? "";
        const unitRaw = ing.units ?? "";
        const amtRaw = ing.amount_per_ingredient;

        const name = singularize(normalizeText(nameRaw));
        const unit = normalizeText(unitRaw);

        if (!name) continue;

        // key determines what "same item" means for aggregation
        const key = `${name}__${unit}`; // keep units separate so "cup sugar" doesn't combine with "tbsp sugar"

        const amtNum = Number(amtRaw);
        const amount = Number.isFinite(amtNum) ? amtNum : null;

        if (!index.has(key)) {
            const row = { key, name, unit, amount: amount ?? 0 };
            shoppingList.push(row);
            index.set(key, row);
        } else {
            const row = index.get(key);
            // only aggregate numeric amounts; if null/NaN, skip aggregation
            if (amount != null) row.amount = (Number(row.amount) || 0) + amount;
        }
    }

    /*const ingredientEls = document.querySelectorAll(".ingredient-item");

    if (ingredientEls.length === 0) {
        alert("No ingredients found.");
        return;
    }

    const ingredients = Array.from(ingredientEls).map(el => el.textContent.trim());

    const shoppingList = getShoppingList();

    ingredients.forEach(item => {
        if (!shoppingList.includes(item)) {
            shoppingList.push(item);
        }
    });*/

    saveShoppingList(shoppingList);
    showToast("Ingredients added to shopping list 📃");
}

//Purpose: Clear all ingredients from the user's shopping list if button is clicked
function clearShoppingList() {
  localStorage.setItem("shoppingList", JSON.stringify([])); // or removeItem
  renderList([]); // immediate UI update
  showToast("Shopping list cleared 🧹");
}




// ==================
// Helper Functions
// ==================

// Purpose: 
function buildIndex(list) {
  const m = new Map();
  (list || []).forEach((row) => {
    if (row?.key) m.set(row.key, row);
  });
  return m;
}

// Purpose: Render shopping list items to the page
function renderList(items) {
    if (!listEl) return;

    listEl.innerHTML = "";

    if (!items || items.length === 0) {
        listEl.innerHTML = "<li>No items yet.</li>";
        return;
    }

    items.forEach((row) => {
        const li = document.createElement("li");

        const amt = formatAmount(row.amount);
        const unit = row.unit ? ` ${row.unit}` : "";
        li.textContent = `${amt}${unit} ${row.name}`.trim();
        listEl.appendChild(li);
    });
}

// Purpose: Get shopping list from localStorage.
function getShoppingList() {
    const raw = JSON.parse(localStorage.getItem("shoppingList")) || [];
    return Array.isArray(raw) ? raw : [];
}

// Purpose: Save shopping list to localStorage.
function saveShoppingList(list) {
    localStorage.setItem("shoppingList", JSON.stringify(list));
}

//Purpose: Keep formatting clean for easy readability
function formatAmount(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return "";
  const rounded = Math.round(n * 100) / 100;
  return String(rounded).replace(/\.0+$|(\.\d*[1-9])0+$/, "$1");
}
