import { supabase } from "./supabase.js";

// Load saved preferences
export async function loadPreferences(username) {
  const { data } = await supabase
    .from("preferences")
    .select("preferences")
    .eq("userid", username)
    .maybeSingle();

  const avoidList = document.getElementById("avoidList");
  if (!avoidList) return;

  avoidList.innerHTML = "";

  (data?.preferences || []).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    li.onclick = () => li.remove();
    avoidList.appendChild(li);
  });
}

// Set up UI buttons
export function setupPreferenceUI() {
  const addBtn = document.getElementById("addAvoidBtn");
  const saveBtn = document.getElementById("saveprefbtn");

  if (addBtn) {
    addBtn.addEventListener("click", () => {
      const input = document.getElementById("avoidInput");
      const value = input.value.trim().toLowerCase();
      if (!value) return;

      const li = document.createElement("li");
      li.textContent = value;
      li.onclick = () => li.remove();

      document.getElementById("avoidList").appendChild(li);
      input.value = "";
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      const stored = localStorage.getItem("loggedInUser");
      const username = JSON.parse(stored).username;

      const avoidItems = [];
      document.querySelectorAll("#avoidList li").forEach((li) =>
        avoidItems.push(li.textContent)
      );

      const { error } = await supabase
        .from("preferences")
        .upsert(
          { userid: username, preferences: avoidItems },
          { onConflict: "userid" }
        );

      document.getElementById("prefstatus").textContent =
        error ? "Error saving." : "Preferences saved!";
    });
  }
}

// Used by search to filter blocked ingredients
export async function getBlockedIngredientsForUser(user) {
  if (!user) return [];

  const { data } = await supabase
    .from("preferences")
    .select("preferences")
    .eq("userid", user.username)
    .maybeSingle();

  return (data?.preferences || []).map((i) => i.toLowerCase().trim());
}
