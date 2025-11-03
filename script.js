const SUPABASE_URL = "https://vbbxceqbzcfieymlcksu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiYnhjZXFiemNmaWV5bWxja3N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2ODYyMDYsImV4cCI6MjA3NzI2MjIwNn0.KO4SvADxHLPW3IRPU1t_buQcY_Zim-p2G-kcK2v2Akg";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

//initialize page and make sure its loaded
document.addEventListener("DOMContentLoaded", () => {
  const page = window.location.pathname.split("/").pop() || "index.html";
  const storedUser = localStorage.getItem("loggedInUser");
  const loggedInUser = storedUser ? JSON.parse(storedUser) : null;

  console.log("Page:", page, "| User:", loggedInUser);

  // redirect logic for after loggging in or out
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
});
