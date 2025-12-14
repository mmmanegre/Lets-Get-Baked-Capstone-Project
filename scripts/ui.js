// ==================
// UI Utilities + Formatting Helpers
// ==================

// ==================
// Main Functions
// ==================

// Purpose: Display a temporary toast notification.
export function showToast(msg, ms = 3000) {
  const toast = document.getElementById("toast");
  if (!toast) {
    console.warn("Toast element not found. Message:", mesg);
    return;
  }
  toast.textContent = msg;
  toast.classList.add("show");
  //setTimeout(() => toast.classList.remove("show"), 2000);

  window.clearTimeout(toast._timer);
  toast._timer = window.setTimeout(() => {
    toast.classList.remove("show");
  }, ms);
}

// ==================
// Helper Functions
// ==================

// Purpose: Convert minutes to HH:MM:SS format for cooktime filtering.
export function minutesToTimeString(minutes) {
  const m = Number(minutes) || 0;
  const hours = Math.floor(m / 60);
  const mins = m % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:00`;
}

// Purpose: Lowercase + trim + collapse spaces + remove basic punctuation.
export function normalizeText(s) {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Purpose: Very small plural stripping to help "eggs" match "egg", "brownies" match "brownie".
export function singularize(wordOrPhrase) {
  const s = normalizeText(wordOrPhrase);

  // Apply singularization word-by-word so "large eggs" -> "large egg"
  return s
    .split(" ")
    .map((w) => singularizeWord(w))
    .join(" ")
    .trim();
}

function singularizeWord(w) {
  if (!w) return w;

  // Don't break short tokens or words that already look singular
  if (w.length <= 3) return w;

  // common -ies -> -y  (brownies -> brownie)
  if (w.endsWith("ies") && w.length > 4) return w.slice(0, -3) + "y";

  // common -ches/-shes/-xes/-zes/-ses -> drop "es" (matches dishes->dish, boxes->box)
  if (
    w.endsWith("ches") ||
    w.endsWith("shes") ||
    w.endsWith("xes") ||
    w.endsWith("zes") ||
    w.endsWith("ses")
  ) {
    return w.slice(0, -2);
  }

  // tomatoes/potatoes -> tomato/potato (endsWith "oes" -> drop "es")
  if (w.endsWith("oes") && w.length > 4) return w.slice(0, -2);

  // general trailing s (eggs -> egg), but don't break "glass" -> "glas"
  if (w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);

  return w;
}

// Purpose: Check whether a recipe satisfies include/exclude ingredient rules.
export function recipePassesIngredientRules(recipeIngredientNames, includeIngredients, excludeIngredients) {
  // Normalize ingredient phrases from DB
  const ingredientsNorm = (recipeIngredientNames || []).map((x) => normalizeText(x));
  const ingredientsSing = ingredientsNorm.map((x) => singularize(x));

  function matchesNeedle(needleRaw) {
    const needle = normalizeText(needleRaw);
    const needleSing = singularize(needle);

    // substring match against either original-normalized or singular-normalized ingredient text
    return ingredientsNorm.some((name) => name.includes(needle) || name.includes(needleSing)) ||
           ingredientsSing.some((name) => name.includes(needle) || name.includes(needleSing));
  }

  // INCLUDE: must contain ALL include ingredients (substring match -> term - "sugar" then "brown sugar" "powered sugar" "sugar" etc returned)
  for (const inc of includeIngredients || []) {
    const needle = normalizeText(inc);
    if (!needle) continue;
    if (!matchesNeedle(needle)) return false;
  }

  // EXCLUDE: must contain NONE of exclude ingredients (substring match too)
  for (const exc of excludeIngredients || []) {
    const needle = normalizeText(exc);
    if (!needle) continue;
    if (matchesNeedle(needle)) return false;
  }

  return true;
}