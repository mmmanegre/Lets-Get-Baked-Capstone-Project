// ==================
// User Profile: Preferences + Interests
// ==================

import { supabase } from "./supabaseClient.js";

// ==================
// Main Functions
// ==================

export function setupProfile() {
    // Save Preferences Button
    const saveprefbtn = document.getElementById("saveprefbtn");

    // Add Preferences Button
    const addAvoidBtn = document.getElementById("addAvoidBtn");

    // Add Interests/User Tags Button
    const addInterestBtn = document.getElementById("addInterestBtn");

    // Save Interests/User Tags Button
    const saveInterestsBtn = document.getElementById("saveInterestsBtn");

    // ==================
    // Event Listeners
    // ==================

    // Purpose: Save Preferences if Save Preferences Button is clicked
    if (saveprefbtn) {
    saveprefbtn.addEventListener("click", async () => {
        const stored = localStorage.getItem("loggedInUser");
        if (!stored) return;
        const username = JSON.parse(stored).username;

        await savePreferences(username);
    });
    }

    // Purpose: Add Preferences to Temp List if Add Preference Button clicked
    if (addAvoidBtn) {
    addAvoidBtn.addEventListener("click", () => {
        const input = document.getElementById("avoidInput");

        if (!input) return;

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

    // Purpose: Add Interests to Temp List if Add Interests Button clicked
    if (addInterestBtn) {
    addInterestBtn.addEventListener("click", () => {
        const input = document.getElementById("interestInput");

        if (!input) return;
        
        const value = input.value.trim();

        if (!value) return;

        const li = document.createElement("li");
        li.textContent = value;

        // click to remove interest
        li.onclick = () => li.remove();

        document.getElementById("userTagsList").appendChild(li);
        input.value = "";
    });
    }

    // Purpose: Save Interests to User Tags if Save Interests Button clicked
    if (saveInterestsBtn) {
    saveInterestsBtn.addEventListener("click", async () => {
        const stored = localStorage.getItem("loggedInUser");
        if (!stored) return;

        const username = JSON.parse(stored).username;

        await saveUserTags(username);
    });
    }
}

// Purpose: Load user's avoided ingredients from preferences table.
export async function loadPreferences(username) {
  const { data, error } = await supabase
    .from("preferences")
    .select("preferences")
    .eq("userid", username)
    .maybeSingle();

  const avoidList = document.getElementById("avoidList");

  if (!avoidList) return;

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

// Purpose: Save user's avoided ingredients to preferences table.
async function savePreferences(username) {
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

    const statusEl = document.getElementById("prefstatus");
    if (statusEl) statusEl.textContent = error ? "Error saving." : "Preferences saved!";
}

// Purpose: Load user's saved interest tags from users table.
export async function loadUserTags(username) {
  const { data, error } = await supabase
    .from("users")
    .select("tags")
    .eq("username", username)
    .maybeSingle();

  const list = document.getElementById("userTagsList");

  if (!list) return;

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
    li.onclick = () => li.remove();
    list.appendChild(li);
  });
}

// Purpose: Save user's interest tags to users table.
async function saveUserTags(username) {
    const interests = [];
    document.querySelectorAll("#userTagsList li").forEach(li => {
        interests.push(li.textContent);
    });

    const { error } = await supabase
        .from("users")              
        .upsert(
            {
            username: username,
            tags: interests          
            },
            { onConflict: "username" }
    );

    const statusEl = document.getElementById("interestStatus");
    if (statusEl) statusEl.textContent = error ? "Error saving interests." : "Interests saved!";
}

// ==================
// Helper Functions
// ==================

// Purpose: Retrieve blocked ingredients for a user (used by search filtering).
export async function getBlockedIngredientsForUser(user) {
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
