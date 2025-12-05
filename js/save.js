export function setupSaveButton() {
  const saveBtn = document.getElementById("savebtn");
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
