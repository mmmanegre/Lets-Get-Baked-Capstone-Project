import { supabase } from "./supabase.js";

export function setupLogin() {
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

export function setupSignup() {
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

    if (existing?.length > 0) return alert("Username already taken.");

    await supabase.from("users").insert([{ username, password }]);

    window.location.href = "login.html";
  });
}

export function setupLogout(user) {
  const logoutBtn = document.getElementById("logoutBtn");
  const welcomeMsg = document.getElementById("welcomeMsg");

  if (welcomeMsg && user) welcomeMsg.textContent = `Hello ${user.username}!`;

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("loggedInUser");
      window.location.href = "login.html";
    });
  }
}
