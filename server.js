const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
app.use(express.static("public"));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const MAP_SIZE = 5000;
const FOOD_COUNT = 300;
const BORDER = 20;

let players = {};
let foods = [];

function randomPos() {
  return Math.random() * (MAP_SIZE - 200) + 100;
}

function spawnFood(x = null, y = null) {
  foods.push({
    id: Math.random().toString(36).substr(2, 9),
    x: x ?? randomPos(),
    y: y ?? randomPos()
  });
}

for (let i = 0; i < FOOD_COUNT; i++) spawnFood();

function createPlayer(id, username) {
  return {
    id,
    username,
    x: randomPos(),
    y: randomPos(),
    angle: 0,
    speed: 2.5,
    body: [],
    length: 40,
    dead: false
  };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function killPlayer(id) {
  const p = players[id];
  if (!p) return;

  // Mass drop
  for (let segment of p.body) {
    if (Math.random() < 0.4) {
      spawnFood(segment.x, segment.y);
    }
  }

  // Respawn
  players[id] = createPlayer(id, p.username);
}

function gameLoop() {
  for (let id in players) {
    let p = players[id];

    p.x += Math.cos(p.angle) * p.speed;
    p.y += Math.sin(p.angle) * p.speed;

    p.body.push({ x: p.x, y: p.y });
    if (p.body.length > p.length) p.body.shift();

    // Edge of map kill
    if (
      p.x < BORDER ||
      p.y < BORDER ||
      p.x > MAP_SIZE - BORDER ||
      p.y > MAP_SIZE - BORDER
    ) {
      killPlayer(id);
      continue;
    }

    // Food collision (normal growth)
    foods = foods.filter(f => {
      if (distance(p, f) < 15) {
        p.length += 5;
        return false;
      }
      return true;
    });

    // Player collision (head to body)
    for (let otherId in players) {
      let other = players[otherId];
      if (otherId === id) continue;

      for (let segment of other.body) {
        if (distance(p, segment) < 8) {
          killPlayer(id);
          break;
        }
      }
    }
  }

  broadcast();
}

function broadcast() {
  const state = JSON.stringify({
    players,
    foods
  });

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(state);
    }
  });
}

wss.on("connection", ws => {
  let playerId = Math.random().toString(36).substr(2, 9);

  ws.on("message", msg => {
    const data = JSON.parse(msg);

    if (data.type === "join") {
      players[playerId] = createPlayer(playerId, data.username);
    }

    if (data.type === "move") {
      if (players[playerId]) {
        players[playerId].angle = data.angle;
      }
    }
  });

  ws.on("close", () => {
    delete players[playerId];
  });
});

setInterval(gameLoop, 1000 / 60);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Server running"));
