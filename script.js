const SUPABASE_URL = "https://vbbxceqbzcfieymlcksu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiYnhjZXFiemNmaWV5bWxja3N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2ODYyMDYsImV4cCI6MjA3NzI2MjIwNn0.KO4SvADxHLPW3IRPU1t_buQcY_Zim-p2G-kcK2v2Akg";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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

  // Search Recipes
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
  
      // Log to Console for debugging
      console.log("Searching for:", term);

      //Search recipes that have tags that contain the search term
      const { data, error } = await supabase
        .from("recipes")
        .select("name")
        .contains("tags", [term]);
      
      //Handle errors
      if (error) {
        console.error("Search error:", error);
        mainArea.innerHTML = "<p>Oops! Search failed.</p>";
        return;
      }

      //Return if no recipes found
      if (data.length === 0) {
        mainArea.innerHTML = "<p>No recipes found for “" + term + "”.</p>";
        return;
      }

      // Build a simple list of recipe names if recipes found with matching term
      //results are a clickable link to recipe page
      const listItems = data.map(r => `<li><a href="./recipe.html?id=${r.id}">${r.name}</a></li>`).join("");
      mainArea.innerHTML = `<ul>${listItems}</ul>`;
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
