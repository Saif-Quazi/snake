const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
app.use(express.static("public"));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const MAP_SIZE = 5000;
const FOOD_COUNT = 300;

let players = {};
let foods = [];

function randomPos() {
  return Math.random() * MAP_SIZE;
}

function spawnFood() {
  foods.push({
    id: Math.random().toString(36).substr(2, 9),
    x: randomPos(),
    y: randomPos()
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
    length: 40
  };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function gameLoop() {
  for (let id in players) {
    let p = players[id];

    p.x += Math.cos(p.angle) * p.speed;
    p.y += Math.sin(p.angle) * p.speed;

    p.body.push({ x: p.x, y: p.y });
    if (p.body.length > p.length) p.body.shift();

    // Food collision
    foods = foods.filter(f => {
      if (distance(p, f) < 15) {
        p.length += 5;
        spawnFood();
        return false;
      }
      return true;
    });

    // Snake collision
    for (let otherId in players) {
      if (otherId === id) continue;
      let other = players[otherId];
      for (let segment of other.body) {
        if (distance(p, segment) < 8) {
          players[id] = createPlayer(id, p.username);
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
