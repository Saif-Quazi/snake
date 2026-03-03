const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const minimap = document.getElementById("minimap");
const miniCtx = minimap.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const MAP_SIZE = 5000;

let player = {
    id: Math.random().toString(36).substr(2, 9),
    x: MAP_SIZE / 2,
    y: MAP_SIZE / 2,
    angle: 0,
    speed: 3,
    body: []
};

let peers = {};
let dataChannels = {};

const ws = new WebSocket(
    location.protocol === "https:"
        ? "wss://" + location.host
        : "ws://" + location.host
);

let pc = new RTCPeerConnection();

pc.ondatachannel = (event) => {
    const channel = event.channel;
    channel.onmessage = (e) => {
        const data = JSON.parse(e.data);
        peers[data.id] = data;
    };
};

function createDataChannel() {
    const channel = pc.createDataChannel("game");
    channel.onmessage = (e) => {
        const data = JSON.parse(e.data);
        peers[data.id] = data;
    };
    return channel;
}

let dataChannel = createDataChannel();

ws.onmessage = async (msg) => {
    const data = JSON.parse(msg.data);

    if (data.offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        ws.send(JSON.stringify({ answer }));
    }

    if (data.answer) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
    }

    if (data.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
};

pc.onicecandidate = (event) => {
    if (event.candidate) {
        ws.send(JSON.stringify({ candidate: event.candidate }));
    }
};

async function initWebRTC() {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    ws.send(JSON.stringify({ offer }));
}

initWebRTC();

window.addEventListener("mousemove", (e) => {
    const dx = e.clientX - canvas.width / 2;
    const dy = e.clientY - canvas.height / 2;
    player.angle = Math.atan2(dy, dx);
});

function update() {
    player.x += Math.cos(player.angle) * player.speed;
    player.y += Math.sin(player.angle) * player.speed;

    player.body.push({ x: player.x, y: player.y });
    if (player.body.length > 100) player.body.shift();

    if (dataChannel.readyState === "open") {
        dataChannel.send(JSON.stringify(player));
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const camX = player.x - canvas.width / 2;
    const camY = player.y - canvas.height / 2;

    ctx.fillStyle = "#222";
    ctx.fillRect(-camX, -camY, MAP_SIZE, MAP_SIZE);

    drawSnake(player, camX, camY, "lime");

    Object.values(peers).forEach(p => {
        drawSnake(p, camX, camY, "red");
    });

    drawMiniMap();
}

function drawSnake(snake, camX, camY, color) {
    ctx.fillStyle = color;
    snake.body.forEach(segment => {
        ctx.beginPath();
        ctx.arc(segment.x - camX, segment.y - camY, 5, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawMiniMap() {
    miniCtx.clearRect(0, 0, minimap.width, minimap.height);

    miniCtx.fillStyle = "#444";
    miniCtx.fillRect(0, 0, minimap.width, minimap.height);

    const scale = minimap.width / MAP_SIZE;

    miniCtx.fillStyle = "lime";
    miniCtx.fillRect(player.x * scale, player.y * scale, 5, 5);

    miniCtx.fillStyle = "red";
    Object.values(peers).forEach(p => {
        miniCtx.fillRect(p.x * scale, p.y * scale, 5, 5);
    });
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

loop();
