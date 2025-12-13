// =======================
// 🔌 SUPABASE CONNECTION
// =======================
const SUPABASE_URL = "https://vbbxceqbzcfieymlcksu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiYnhjZXFiemNmaWV5bWxja3N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2ODYyMDYsImV4cCI6MjA3NzI2MjIwNn0.KO4SvADxHLPW3IRPU1t_buQcY_Zim-p2G-kcK2v2Akg";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Helper
function minutesToTimeString(minutes) {
  const m = Number(minutes) || 0;
  const hours = Math.floor(m / 60);
  const mins = m % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:00`;
}

// Grab DOM elements safely
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const resultsBox = document.getElementById("resultsBox");
const mainArea = document.querySelector("main");

// FILTER ELEMENTS (optional)
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

// SAVE BUTTON
const saveBtn = document.getElementById("savebtn");

// ⭐ SAFE FILTER STATE ⭐
const filterState = {
  cookTimeMax: cookTimeSlider ? Number(cookTimeSlider.value) : null,
  caloriesMin: null,
  caloriesMax: null,
  ingredients: [],
  ingredientMode: ingredientModeSelect ? ingredientModeSelect.value : "include",
};

// =======================
// PAGE INITIALIZATION
// =======================
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
  if (loggedInUser && page === "profile.html") {
      loadPreferences(loggedInUser.username);
      loadUserTags(loggedInUser.username);
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

// =======================
// LOGIN SYSTEM
// =======================
function setupLogin() {
  const loginForm = document.getElementById("loginForm");
  if (!loginForm) return;

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("loginUsername").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    if (!username || !password) return alert("Enter all fields");

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .eq("password", password)
      .maybeSingle();

    if (error || !user) return alert("Invalid login");

    localStorage.setItem("loggedInUser", JSON.stringify({ username }));
    window.location.href = "index.html";
  });
}

function setupSignup() {
  const signupForm = document.getElementById("signupForm");
  if (!signupForm) return;

  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("signupUsername").value.trim();
    const password = document.getElementById("signupPassword").value.trim();

    if (!username || !password) return alert("Enter username + password");

    const { data: existing } = await supabase
      .from("users")
      .select("*")
      .eq("username", username);

    if (existing?.length > 0)
      return alert("Username already taken.");

    await supabase.from("users").insert([{ username, password }]);

    window.location.href = "login.html";
  });
}

function setupLogout(user) {
  const logoutBtn = document.getElementById("logoutBtn");
  const welcomeMsg = document.getElementById("welcomeMsg");

  if (welcomeMsg && user) {
    welcomeMsg.textContent = `Hello ${user.username}!`;
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("loggedInUser");
      window.location.href = "login.html";
    });
  }
}

// =======================
// SEARCH + FILTERING
// =======================
function setupSearch(loggedInUser) {
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

    if (filterState.caloriesMin != null)
      query = query.gte("calories", filterState.caloriesMin);

    if (filterState.caloriesMax != null)
      query = query.lte("calories", filterState.caloriesMax);

    if (filterState.ingredients.length > 0) {
      if (filterState.ingredientMode === "include")
        query = query.contains("ingredients", filterState.ingredients);
      else
        query = query.not("ingredients", "ov", filterState.ingredients);
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

// =======================
// FILTER PANEL SETUP
// =======================
function setupFilters() {
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
//=======
//prefs
//========
const saveprefbtn = document.getElementById("saveprefbtn");

if (saveprefbtn) {
  saveprefbtn.addEventListener("click", async () => {
    const stored = localStorage.getItem("loggedInUser");
    if (!stored) return;
    const username = JSON.parse(stored).username;

    const avoidItems = [];
    document.querySelectorAll("#avoidList li").forEach(li => {
      avoidItems.push(li.textContent);
    });

    const { error } = await supabase
      .from("preferences")
      .upsert(
        {
          userid: username,
          preferences: avoidItems
        },
        { onConflict: "userid" }
      );

    document.getElementById("prefstatus").textContent =
      error ? "Error saving." : "Preferences saved!";
  });
}
//add button
const addAvoidBtn = document.getElementById("addAvoidBtn");

if (addAvoidBtn) {
  addAvoidBtn.addEventListener("click", () => {
    const input = document.getElementById("avoidInput");
    const value = input.value.trim().toLowerCase();

    if (!value) return;

    const li = document.createElement("li");
    li.textContent = value;

    // click to remove
    li.onclick = () => li.remove();

    document.getElementById("avoidList").appendChild(li);
    input.value = "";
  });
}
//load user prefs
async function loadPreferences(username) {
  const { data, error } = await supabase
    .from("preferences")
    .select("preferences")
    .eq("userid", username)
    .maybeSingle();

  const avoidList = document.getElementById("avoidList");
  avoidList.innerHTML = ""; // clear previous content

  if (error || !data) return;

  (data.preferences || []).forEach(item => {
    const li = document.createElement("li");
    li.textContent = item;

    // click to remove
    li.onclick = () => li.remove();

    avoidList.appendChild(li);
  });
}




// =======================
// PREFS EXCLUSION
// =======================
async function getBlockedIngredientsForUser(user) {
  if (!user) return [];

  const { data } = await supabase
    .from("preferences")
    .select("preferences")
    .eq("userid", user.username)
    .maybeSingle();

  return (data?.preferences || [])
    .map((i) => i.toLowerCase().trim())
    .filter((i) => i);
}

// =======================
// RECIPE PAGE LOADING
// =======================
async function loadSingleRecipe(id) {
  //Fetch main recipe
  const { data: recipe, error: recipeError } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", id)
    .single();

  if (recipeError || !recipe) {
    console.error("Error loading recipe:", recipeError);
    document.getElementById("recipe-container").innerHTML =
      "<p>Error loading recipe.</p>";
    return;
  }

  //Fetch ingredients from normalized table
  const { data: ingredients, error: ingError } = await supabase
    .from("recipeingredients")
    .select("*")
    .eq("recipeid", id.toString());



  if (ingError) {
    console.error("Ingredient error:", ingError);
  }

  //Pass both to display function
  displaySingleRecipe(recipe, ingredients || []);
}


function displaySingleRecipe(r, ingredients) {
  const container = document.getElementById("recipe-container");
  if (!container) return;

  const BaseServings = Number(r.servings) || 1;

  const minutes = r.cooktime
    ? parseInt(r.cooktime.split(":")[1]) +
      parseInt(r.cooktime.split(":")[0]) * 60
    : "Unknown";

  
  const ingredientList = ingredients.length
    ? ingredients
        .map((ing) => {
          const name = ing.ingredient_name ?? "Unknown ingredient";
          const amount = ing.amount_per_ingredient;
          const unit = ing.units ?? "";

          return `
            <li 
              data-base-amount="${amount ?? ""}"
              data-unit="${unit}"
            >
              <span class="amount">${amount ?? ""}</span>
              <span class="unit">${unit}</span>
              ${name}
            </li>
          `;
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
      <input type="number" id="servingInput" min="1" value="${baseServings}" />

      <h3>Serving Size</h3>
      <p>${r.serving_size ?? "N/A"}</p>

      <h3>Ingredients</h3>
      <ul>${ingredientList}</ul>

      <h3>Tags</h3>
      <p>${r.tags?.join(", ") || "None"}</p>
  `;
  const servingInput = document.getElementById("servingInput");
  if (servingInput) {
    servingInput.addEventListener("input", () => {
      const newServings = Number(servingInput.value);
      if (!newServings || newServings <= 0) return;

      const scaleFactor = newServings / baseServings;

      container.querySelectorAll("li[data-base-amount]").forEach(li => {
        const baseAmount = Number(li.dataset.baseAmount);
        if (!baseAmount) return;

        const scaled = baseAmount * scaleFactor;
        li.querySelector(".amount").textContent =
          Number.isInteger(scaled)
            ? scaled
            : scaled.toFixed(2);
    });
  });
}

  
  const cartBtn = document.getElementById("cartbtn");
  if (cartBtn) {
    cartBtn.onclick = () => addIngredientsToCart(r, ingredients);
  }


  
}




// =======================
// SAVE BUTTON
// =======================
function setupSaveButton() {
  if (!saveBtn) return;

  saveBtn.addEventListener("click", () => {
    const container = document.getElementById("recipe-container");
    const recipeName = container?.querySelector("h1")?.textContent;
    const recipeId = new URLSearchParams(window.location.search).get("id");

    if (!recipeName || !recipeId)
      return showToast("Error: Cannot save recipe ❌");

    let saved = JSON.parse(localStorage.getItem("savedRecipes")) || [];
    if (saved.some((r) => r.id === recipeId))
      return showToast("Already saved ✔️");

    saved.push({ name: recipeName, id: recipeId });
    localStorage.setItem("savedRecipes", JSON.stringify(saved));

    showToast("Recipe saved! ❤️");
  });
}

// ==============================
// ADD TO SHOPPING LIST (LOCAL)
// ==============================

// Get shopping list from localStorage
function getShoppingList() {
    return JSON.parse(localStorage.getItem("shoppingList")) || [];
}

// Save shopping list to localStorage
function saveShoppingList(list) {
    localStorage.setItem("shoppingList", JSON.stringify(list));
}

// Add ingredients to shopping list
function addToShoppingList() {
    const ingredientEls = document.querySelectorAll(".ingredient-item");

    if (ingredientEls.length === 0) {
        alert("No ingredients found.");
        return;
    }

    const ingredients = Array.from(ingredientEls).map(el =>
        el.textContent.trim()
    );

    const shoppingList = getShoppingList();

    ingredients.forEach(item => {
        if (!shoppingList.includes(item)) {
            shoppingList.push(item);
        }
    });

    saveShoppingList(shoppingList);
    alert("Ingredients added to shopping list 🛒");
}

// Attach button listener
document.addEventListener("DOMContentLoaded", () => {
    const cartBtn = document.getElementById("cartbtn");

    if (!cartBtn) {
        console.error("❌ cartbtn not found");
        return;
    }

    cartBtn.addEventListener("click", addToShoppingList);
});


// ----------------------
// BUTTON WIRING
// ----------------------
document.addEventListener("DOMContentLoaded", () => {
  const cartBtn = document.getElementById("cartbtn");

  if (!cartBtn) {
    console.error("cartbtn not found");
    return;
  }

  cartBtn.addEventListener("click", addToShoppingList);
});

function showToast(msg) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2000);
}
//user tags pulling
async function loadUserTags(username) {
  const { data, error } = await supabase
    .from("users")
    .select("tags")
    .eq("username", username)
    .maybeSingle();

  const list = document.getElementById("userTagsList");

  //clean list
  list.innerHTML = "";

  if (error) {
    console.error("Error loading user tags:", error);
    list.innerHTML = "<li>Error loading tags.</li>";
    return;
  }

  if (!data || !data.tags || data.tags.length === 0) {
    list.innerHTML = "<li>No tags saved.</li>";
    return;
  }

  //print tags
  data.tags.forEach(tag => {
    const li = document.createElement("li");
    li.textContent = tag;
    list.appendChild(li);
  });
}
