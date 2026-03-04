const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const minimap = document.getElementById("minimap");
const miniCtx = minimap.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const MAP_SIZE = 1000;

let socket = null;
let players = {};
let foods = [];
let myId = null;
let username = "";
let started = false;

/* ================= MENU ================= */

const menu = document.getElementById("menu");
const input = document.getElementById("nameInput");
const playBtn = document.getElementById("playBtn");
const errorMsg = document.getElementById("errorMsg");

input.value = localStorage.getItem("snake_username") || "";

function sanitizeName(value) {
  return value.replace(/[^a-zA-Z0-9]/g, "");
}

input.addEventListener("input", () => {
  input.value = sanitizeName(input.value);
});

function tryStart() {
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
}

playBtn.addEventListener("click", tryStart);

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") tryStart();
});

/* ================= GAME ================= */

function startGame() {
  started = true;

  socket = new WebSocket(
    location.protocol === "https:"
      ? "wss://" + location.host
      : "ws://" + location.host
  );

  socket.onopen = () => {
    socket.send(JSON.stringify({
      type: "join",
      username
    }));
  };

  socket.onmessage = (msg) => {
    const state = JSON.parse(msg.data);
    players = state.players;
    foods = state.foods;

    if (!myId) {
      for (let id in players) {
        if (players[id].username === username) {
          myId = id;
          break;
        }
      }
    }
  };
}

/* ================= INPUT ================= */

window.addEventListener("mousemove", (e) => {
  if (!started || !players[myId]) return;

  const dx = e.clientX - canvas.width / 2;
  const dy = e.clientY - canvas.height / 2;
  const angle = Math.atan2(dy, dx);

  socket.send(JSON.stringify({
    type: "move",
    angle
  }));
});

/* ================= DRAW ================= */

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!players[myId]) return;

  let me = players[myId];

  const zoom = 1 - Math.min(me.length / 400, 0.6);
  ctx.save();
  ctx.scale(zoom, zoom);

  const camX = me.x - canvas.width / (2 * zoom);
  const camY = me.y - canvas.height / (2 * zoom);

  ctx.fillStyle = "#222";
  ctx.fillRect(-camX, -camY, MAP_SIZE, MAP_SIZE);

  ctx.strokeStyle = "#555";
  ctx.lineWidth = 5;
  ctx.strokeRect(-camX, -camY, MAP_SIZE, MAP_SIZE);

  ctx.fillStyle = "orange";
  foods.forEach(f => {
    ctx.beginPath();
    ctx.arc(f.x - camX, f.y - camY, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  for (let id in players) {
    const p = players[id];
    const radius = 5 + p.length * 0.05;

    ctx.beginPath();
    ctx.fillStyle = id === myId ? "lime" : "red";
    ctx.arc(p.x - camX, p.y - camY, radius, 0, Math.PI * 2);
    ctx.fill();

    // head indicator
    ctx.beginPath();
    ctx.fillStyle = "white";
    ctx.arc(
      p.x - camX + Math.cos(p.angle) * radius * 0.6,
      p.y - camY + Math.sin(p.angle) * radius * 0.6,
      radius * 0.4,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  ctx.restore();
  drawMiniMap(me);
}

function drawMiniMap(me) {
  miniCtx.clearRect(0, 0, minimap.width, minimap.height);
  const scale = minimap.width / MAP_SIZE;

  miniCtx.fillStyle = "#222";
  miniCtx.fillRect(0, 0, minimap.width, minimap.height);

  for (let id in players) {
    miniCtx.fillStyle = id === myId ? "lime" : "red";
    miniCtx.beginPath();
    miniCtx.arc(
      players[id].x * scale,
      players[id].y * scale,
      3,
      0,
      Math.PI * 2
    );
    miniCtx.fill();
  }
}

function loop() {
  draw();
  requestAnimationFrame(loop);
}

loop();
