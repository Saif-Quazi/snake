const express = require("express");
const WebSocket = require("ws");
const http = require("http");

const app = express();
app.use(express.static("public"));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

const WORLD_SIZE = 5000;

const players = {};
const food = [];

function rand(min, max) {
    return Math.random() * (max - min) + min;
}

function spawnFood() {
    if (food.length > 300) return;

    food.push({
        id: Date.now() + Math.random(),
        x: rand(0, WORLD_SIZE),
        y: rand(0, WORLD_SIZE)
    });
}

setInterval(spawnFood, 100);

wss.on("connection", (ws) => {

    const id = Math.random().toString(36).substr(2, 9);

    players[id] = {
        id,
        x: rand(0, WORLD_SIZE),
        y: rand(0, WORLD_SIZE),
        dirX: 0,
        dirY: 0,
        size: 10,
        segments: []
    };

    ws.send(JSON.stringify({
        type: "init",
        id,
        world: WORLD_SIZE
    }));

    ws.on("message", (msg) => {

        let data;
        try { data = JSON.parse(msg); } catch { return; }

        if (data.type === "move") {
            const p = players[id];
            if (!p) return;

            p.dirX = data.x;
            p.dirY = data.y;
        }
    });

    ws.on("close", () => {
        delete players[id];
    });
});

const TICK = 50;

setInterval(() => {

    for (const id in players) {

        const p = players[id];

        p.x += p.dirX * 4;
        p.y += p.dirY * 4;

        if (p.x < 0) p.x = 0;
        if (p.y < 0) p.y = 0;
        if (p.x > WORLD_SIZE) p.x = WORLD_SIZE;
        if (p.y > WORLD_SIZE) p.y = WORLD_SIZE;

        p.segments.unshift({ x: p.x, y: p.y });

        if (p.segments.length > p.size) {
            p.segments.pop();
        }
    }

    const packet = JSON.stringify({
        type: "state",
        players,
        food
    });

    wss.clients.forEach(c => {
        if (c.readyState === WebSocket.OPEN) {
            c.send(packet);
        }
    });

}, TICK);

server.listen(PORT, () => {
    console.log("Server running on", PORT);
});
