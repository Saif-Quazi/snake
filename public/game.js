const menu = document.getElementById("menu");
const input = document.getElementById("nameInput");
const playBtn = document.getElementById("playBtn");
const errorMsg = document.getElementById("errorMsg");

input.value = localStorage.getItem("snake_username") || "";

function sanitizeName(value) {
  // Remove weird chars, allow letters + numbers only
  value = value.replace(/[^a-zA-Z0-9]/g, "");
  return value;
}

input.addEventListener("input", () => {
  input.value = sanitizeName(input.value);
});

playBtn.addEventListener("click", () => {
  let name = sanitizeName(input.value.trim());

  if (name.length < 4) {
    errorMsg.textContent = "Minimum 4 characters.";
    return;
  }

  if (name.length > 16) {
    errorMsg.textContent = "Maximum 16 characters.";
    return;
  }

  username = name;
  localStorage.setItem("snake_username", username);

  menu.style.display = "none";
  startGame();
});
