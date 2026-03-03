const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const minimap = document.getElementById("minimap");
const miniCtx = minimap.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const MAP_SIZE = 5000;

let socket = new WebSocket(
  location.protocol === "https:"
    ? "wss://" + location.host
    : "ws://" + location.host
);

let username = prompt("Enter username") || "Player";

let players = {};
let foods = {};
let myId = null;

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

  if (!myId && socket.readyState === 1) {
    myId = Object.keys(players).find(id =>
      players[id].username === username
    );
  }
};

window.addEventListener("mousemove", (e) => {
  if (!players[myId]) return;

  const dx = e.clientX - canvas.width / 2;
  const dy = e.clientY - canvas.height / 2;
  const angle = Math.atan2(dy, dx);

  socket.send(JSON.stringify({
    type: "move",
    angle
  }));
});

function drawSnake(p, camX, camY, color) {
  ctx.fillStyle = color;
  for (let segment of p.body) {
    ctx.beginPath();
    ctx.arc(segment.x - camX, segment.y - camY, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#fff";
  ctx.fillText(p.username, p.x - camX - 20, p.y - camY - 20);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!players[myId]) return;

  let me = players[myId];

  const camX = me.x - canvas.width / 2;
  const camY = me.y - canvas.height / 2;

  ctx.fillStyle = "#222";
  ctx.fillRect(-camX, -camY, MAP_SIZE, MAP_SIZE);

  // Draw food
  ctx.fillStyle = "orange";
  for (let f of foods) {
    ctx.beginPath();
    ctx.arc(f.x - camX, f.y - camY, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let id in players) {
    drawSnake(
      players[id],
      camX,
      camY,
      id === myId ? "lime" : "red"
    );
  }

  drawMiniMap(me);
}

function drawMiniMap(me) {
  miniCtx.clearRect(0, 0, minimap.width, minimap.height);

  const scale = minimap.width / MAP_SIZE;

  miniCtx.fillStyle = "#444";
  miniCtx.fillRect(0, 0, minimap.width, minimap.height);

  miniCtx.fillStyle = "orange";
  for (let f of foods) {
    miniCtx.fillRect(f.x * scale, f.y * scale, 2, 2);
  }

  for (let id in players) {
    miniCtx.fillStyle = id === myId ? "lime" : "red";
    miniCtx.fillRect(
      players[id].x * scale,
      players[id].y * scale,
      4,
      4
    );
  }
}

function loop() {
  draw();
  requestAnimationFrame(loop);
}

loop();
