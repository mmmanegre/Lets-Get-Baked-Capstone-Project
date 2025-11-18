const SUPABASE_URL = "https://vbbxceqbzcfieymlcksu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiYnhjZXFiemNmaWV5bWxja3N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2ODYyMDYsImV4cCI6MjA3NzI2MjIwNn0.KO4SvADxHLPW3IRPU1t_buQcY_Zim-p2G-kcK2v2Akg"; // <-- your real key

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// helper: convert minutes (number) -> "HH:MM:SS" for cooktime (time column)
function minutesToTimeString(minutes) {
  const m = Number(minutes) || 0;
  const hours = Math.floor(m / 60);
  const mins = m % 60;
  const hh = String(hours).padStart(2, "0");
  const mm = String(mins).padStart(2, "0");
  return `${hh}:${mm}:00`;
}

//initialize page and make sure its loaded
document.addEventListener("DOMContentLoaded", () => {
  const page = window.location.pathname.split("/").pop() || "index.html";
  const storedUser = localStorage.getItem("loggedInUser");
  const loggedInUser = storedUser ? JSON.parse(storedUser) : null;
  const isRecipePage = page == "recipe.html";
  console.log("isRecipePage:", isRecipePage);
  console.log("Page:", page, "| User:", loggedInUser);

  // redirect logic for after logging in or out
  if (!loggedInUser && (page === "index.html" || page === "")) {
    window.location.href = "login.html";
    return;
  }
  if (loggedInUser && (page === "login.html" || page === "signup.html")) {
    window.location.href = "index.html";
    return;
  }

  // login
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    console.log("Setting up login form");
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const username = document.getElementById("loginUsername").value.trim();
      const password = document.getElementById("loginPassword").value.trim();

      if (!username || !password) {
        alert("Please enter both fields");
        return;
      }

      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("username", username)
        .eq("password", password)
        .maybeSingle();

      if (error || !user) {
        alert("Invalid username or password");
        return;
      }

      localStorage.setItem("loggedInUser", JSON.stringify({ username }));
      
      window.location.href = "index.html";
    });
  }

  // signup
  const signupForm = document.getElementById("signupForm");
  if (signupForm) {
    console.log("Setting up signup form");
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const username = document.getElementById("signupUsername").value.trim();
      const password = document.getElementById("signupPassword").value.trim();

      console.log("Signup attempt:", username);

      if (!username || !password) {
        alert("Please enter both username and password.");
        return;
      }

      try {
        // check if username is already taken
        const { data: existingUser, error: selectError } = await supabase
          .from("users")
          .select("*")
          .eq("username", username);

        if (selectError) throw selectError;
        if (existingUser.length > 0) {
          alert("Username already taken. Please choose a different one.");
          return;
        }

        // put new user data into users table on supabase
        const { data, error } = await supabase
          .from("users")
          .insert([{ username, password }]);

        if (error) throw error;

        
        window.location.href = "login.html";
      } catch (err) {
        console.error("Error during signup:", err);
        alert("Signup failed. Please try again.");
      }
    });
  }

  // logout
  const logoutBtn = document.getElementById("logoutBtn");
  const welcomeMsg = document.getElementById("welcomeMsg");

  if (loggedInUser && welcomeMsg) {
    welcomeMsg.textContent = `Hello ${loggedInUser.username}!`;
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("loggedInUser");
      window.location.href = "login.html";
    });
  }

  // ---------------------------------------------------
  // FILTER PANEL UI + STATE (NEW)
  // ---------------------------------------------------

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

  // current filter state (NEW)
  const filterState = {
    cookTimeMax: cookTimeSlider ? Number(cookTimeSlider.value) : null, // minutes
    caloriesMin: null,
    caloriesMax: null,
    ingredients: [],
    ingredientMode: ingredientModeSelect ? ingredientModeSelect.value : "include",
  };

  // open/close filter panel (NEW)
  if (filterButton && filterPanel && closeFilterPanelBtn) {
    filterButton.addEventListener("click", () => {
      filterPanel.classList.remove("hidden");
      filterPanel.setAttribute("aria-hidden", "false");
    });

    closeFilterPanelBtn.addEventListener("click", () => {
      filterPanel.classList.add("hidden");
      filterPanel.setAttribute("aria-hidden", "true");
    });
  }

  // cook time slider label (NEW)
  if (cookTimeSlider && cookTimeSliderValue) {
    cookTimeSliderValue.textContent = cookTimeSlider.value;
    cookTimeSlider.addEventListener("input", () => {
      cookTimeSliderValue.textContent = cookTimeSlider.value;
      filterState.cookTimeMax = Number(cookTimeSlider.value);
    });
  }

  // render ingredient list (NEW)
  function renderIngredientList() {
    if (!ingredientFilterList) return;
    if (filterState.ingredients.length === 0) {
      ingredientFilterList.innerHTML = "";
      return;
    }

    ingredientFilterList.innerHTML = filterState.ingredients
      .map(
        (ing, index) =>
          `<li data-index="${index}">
            <span>${ing}</span>
            <button type="button" class="remove-ingredient">x</button>
          </li>`
      )
      .join("");
  }

  // add ingredient (NEW)
  if (addIngredientFilterBtn && ingredientFilterInput) {
    addIngredientFilterBtn.addEventListener("click", () => {
      const raw = ingredientFilterInput.value.trim().toLowerCase();
      if (!raw) return;

      const parts = raw
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const p of parts) {
        if (!filterState.ingredients.includes(p)) {
          filterState.ingredients.push(p);
        }
      }

      ingredientFilterInput.value = "";
      renderIngredientList();
    });
  }

  // remove ingredient (NEW)
  if (ingredientFilterList) {
    ingredientFilterList.addEventListener("click", (e) => {
      const target = e.target;
      if (!target.classList.contains("remove-ingredient")) return;

      const li = target.closest("li");
      const indexStr = li?.getAttribute("data-index");
      if (indexStr == null) return;

      const index = Number(indexStr);
      if (!Number.isNaN(index)) {
        filterState.ingredients.splice(index, 1);
        renderIngredientList();
      }
    });
  }

  // ingredient mode change (NEW)
  if (ingredientModeSelect) {
    ingredientModeSelect.addEventListener("change", () => {
      filterState.ingredientMode = ingredientModeSelect.value;
    });
  }

  // clear filters (NEW)
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener("click", () => {
      if (cookTimeSlider && cookTimeSliderValue) {
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

      if (ingredientModeSelect) {
        ingredientModeSelect.value = "include";
      }
      filterState.ingredientMode = "include";
    });
  }

  // ---------------------------------------------------
  // helper: get blocked ingredients from preferences (NEW)
  // preferences table: userid (varchar), preferences (_text)
  // We treat all entries in preferences.preferences as ingredients to ALWAYS EXCLUDE.
  // ---------------------------------------------------
  async function getBlockedIngredientsForUser() {
    if (!loggedInUser || !loggedInUser.username) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from("preferences")
        .select("preferences")
        .eq("userid", loggedInUser.username)
        .maybeSingle();

      if (error || !data || !data.preferences) {
        if (error) {
          console.warn("Preferences error:", error);
        }
        return [];
      }

      const arr = Array.isArray(data.preferences) ? data.preferences : [];
      const blocked = arr
        .map((p) => (p || "").toLowerCase().trim())
        .filter((ing) => ing.length > 0);

      return blocked;
    } catch (err) {
      console.error("Error fetching preferences:", err);
      return [];
    }
  }

  // ---------------------------------------------------
  // Search Recipes  (UPDATED)
  // ---------------------------------------------------
  const searchForm = document.getElementById("searchForm"); 
  const searchInput = document.getElementById("searchInput");
  const mainArea = document.querySelector("main"); 

  if (searchForm) {
    searchForm.addEventListener("submit", async (e) => {
      e.preventDefault();  // stops the browser from doing the default GET + navigation b/c we are sending request to our database instead of searching another page
  
      //Fill space if no recipes returned yet.
      const term = searchInput.value.trim().toLowerCase();
      if (!term) {
        mainArea.innerHTML = "<p>Please enter something to search.</p>";
        return;
      }

      // sync filterState from any direct input edits
      if (caloriesMinInput && caloriesMinInput.value !== "") {
        filterState.caloriesMin = Number(caloriesMinInput.value);
      } else {
        filterState.caloriesMin = null;
      }

      if (caloriesMaxInput && caloriesMaxInput.value !== "") {
        filterState.caloriesMax = Number(caloriesMaxInput.value);
      } else {
        filterState.caloriesMax = null;
      }

      if (ingredientModeSelect) {
        filterState.ingredientMode = ingredientModeSelect.value;
      }
  
      // Log to Console for debugging
      console.log("Searching for:", term);
      console.log("Filter state:", filterState);

      const blockedIngredients = await getBlockedIngredientsForUser();
      console.log("Blocked ingredients:", blockedIngredients);

      // base query
      let query = supabase
        .from("recipes")
        .select("id, name, cooktime, calories, tags, ingredients")
        .contains("tags", [term]);   // search by tags array

      // cooktime filter (time) using minutes slider
      if (filterState.cookTimeMax != null) {
        const maxTimeStr = minutesToTimeString(filterState.cookTimeMax);
        query = query.lte("cooktime", maxTimeStr);
      }

      // calories range
      if (filterState.caloriesMin != null) {
        query = query.gte("calories", filterState.caloriesMin);
      }
      if (filterState.caloriesMax != null) {
        query = query.lte("calories", filterState.caloriesMax);
      }

      // ingredient include/exclude from UI (recipes.ingredients is _text)
      if (filterState.ingredients.length > 0) {
        if (filterState.ingredientMode === "include") {
          query = query.contains("ingredients", filterState.ingredients);
        } else if (filterState.ingredientMode === "exclude") {
          query = query.not("ingredients", "ov", filterState.ingredients);
        }
      }

      // always exclude blocked ingredients from preferences
      if (blockedIngredients.length > 0) {
        query = query.not("ingredients", "ov", blockedIngredients);
      }

      const { data, error } = await query;
      
      //Handle errors
      if (error) {
        console.error("Search error:", error);
        mainArea.innerHTML = "<p>Oops! Search failed.</p>";
        return;
      }

      //Return if no recipes found
      if (!data || data.length === 0) {
        mainArea.innerHTML = "<p>No recipes found for “" + term + "”.</p>";
        return;
      }

      // Build a simple list of recipe names if recipes found with matching term
      //results are a clickable link to recipe page
      const listItems = data.map(r => `
        <li>
          <a href="./recipe.html?id=${r.id}">${r.name}</a>
          <small> — ${r.cooktime || ""} ${r.calories != null ? `, ${r.calories} kcal` : ""}</small>
        </li>
      `).join("");
      mainArea.innerHTML = `<ul>${listItems}</ul>`;
    });
  }

  // Apply Filters button: close filter + re-run current search (NEW)
  if (applyFiltersBtn && filterPanel && searchForm) {
    applyFiltersBtn.addEventListener("click", () => {
      filterPanel.classList.add("hidden");
      filterPanel.setAttribute("aria-hidden", "true");
      searchForm.dispatchEvent(new Event("submit"));
    });
  }

  //recipe page
if (isRecipePage) {
 

  const params = new URLSearchParams(window.location.search);
  const recipeId = params.get("id");

  if (!recipeId) {
    document.getElementById("recipe-container").innerHTML =
      "<p>No recipe selected.</p>";
    return;
  }

  loadSingleRecipe(recipeId);
}

// fetch just ONE recipe
async function loadSingleRecipe(id) {
  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error loading recipe:", error);
    document.getElementById("recipe-container").innerHTML =
      "<p>Error loading recipe.</p>";
    return;
  }

  displaySingleRecipe(data);
}

function displaySingleRecipe(r) {
  const container = document.getElementById("recipe-container");

  container.innerHTML = `
    <h1>${r.name}</h1>

     ${r.image_url ? `<img src="${r.image_url}" class="recipe-img">` : ""}

    <h2>Ingredients</h2>
    <p>${r.ingredients}</p>

    <h2>Intructions</h2>
    <p>${r.description}</p>

    <h3>Serving Size</h3>
    <p>${r.calories} Calories</p>
    <p>Serving Size: ${r.serving_size}</p>
    <p>Servings: ${r.servings}</p>

    <br><br>
    <a href="index.html">← Back to home</a>
  `;
}
});

// save recipe notification
const saveBtn = document.getElementById("savebtn");

function showToast(message = "Recipe saved! ❤️") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2000);
}

if (saveBtn) {
  saveBtn.addEventListener("click", () => {
    const recipeURL = window.location.href;

    let savedRecipes = JSON.parse(localStorage.getItem("savedRecipes")) || [];

    if (!savedRecipes.includes(recipeURL)) {
      savedRecipes.push(recipeURL);
      localStorage.setItem("savedRecipes", JSON.stringify(savedRecipes));
      showToast("Recipe saved! ❤️");
    } else {
      showToast("Already saved ✔️");
    }
  });
}

