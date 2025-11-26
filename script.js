// =======================
// 🔌 SUPABASE CONNECTION
// =======================
const SUPABASE_URL = "https://vbbxceqbzcfieymlcksu.supabase.co";
<<<<<<< HEAD
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiYnhjZXFiemNmaWV5bWxja3N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2ODYyMDYsImV4cCI6MjA3NzI2MjIwNn0.KO4SvADxHLPW3IRPU1t_buQcY_Zim-p2G-kcK2v2Akg";
=======
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiYnhjZXFiemNmaWV5bWxja3N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2ODYyMDYsImV4cCI6MjA3NzI2MjIwNn0.KO4SvADxHLPW3IRPU1t_buQcY_Zim-p2G-kcK2v2Akg";
>>>>>>> 25d1648c0d784a3140f2cc652523b475a025641d

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
  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", id)
    .single();

   if (error || !data) {
    document.getElementById("recipe-container").innerHTML =
      "<p>Error loading recipe.</p>";
    return;
  }

  displaySingleRecipe(data);
}

function displaySingleRecipe(r) {
  const container = document.getElementById("recipe-container");
  if (!container) return;

  const minutes = r.cooktime
    ? parseInt(r.cooktime.split(":")[1]) +
      parseInt(r.cooktime.split(":")[0]) * 60
    : "Unknown";

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
      <ul>${r.ingredients
        ?.map((i) => `<li>${i}</li>`)
        .join("") || "<li>No ingredients listed.</li>"}</ul>

      <h3>Ingredients Per Yield</h3>
      <ul>${r.num_of_ingredients_per_yield
        ?.map((i) => `<li>${i}</li>`)
        .join("") || "<li>None</li>"}</ul>

      <h3>Tags</h3>
      <p>${r.tags?.join(", ") || "None"}</p>
  `;
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

function showToast(msg) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2000);
}
