const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const mini = document.getElementById("mini");
const mctx = mini.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const ws = new WebSocket(location.origin.replace("http", "ws"));

let myId = null;
let world = 5000;
let players = {};
let food = [];

let dir = { x: 0, y: 0 };

ws.onmessage = (e) => {

	const data = JSON.parse(e.data);

	if (data.type === "init") {
		myId = data.id;
		world = data.world;
	}

	if (data.type === "state") {
		players = data.players;
		food = data.food;
	}

};

document.addEventListener("mousemove", (e) => {

	const cx = canvas.width / 2;
	const cy = canvas.height / 2;

	const dx = e.clientX - cx;
	const dy = e.clientY - cy;

	const len = Math.hypot(dx, dy);

	dir.x = dx / len;
	dir.y = dy / len;
});

setInterval(() => {
	ws.send(JSON.stringify({
		type: "move",
		x: dir.x,
		y: dir.y
	}));
}, 70);

function camera() {

	const me = players[myId];
	if (!me) return { x: 0, y: 0, scale: 1 };

	const scale = Math.max(.4, 1 - me.size * 0.01);

	return {
		x: me.x - canvas.width / 2 / scale,
		y: me.y - canvas.height / 2 / scale,
		scale
	};
}

function draw() {

	ctx.clearRect(0, 0, canvas.width, canvas.height);

	const cam = camera();

	ctx.save();
	ctx.scale(cam.scale, cam.scale);
	ctx.translate(-cam.x, -cam.y);

	ctx.fillStyle = "#222";
	ctx.fillRect(0, 0, world, world);

	ctx.fillStyle = "#0f0";
	food.forEach(f => {
		ctx.beginPath();
		ctx.arc(f.x, f.y, 5, 0, Math.PI * 2);
		ctx.fill();
	});

	for (const id in players) {

		const p = players[id];

		ctx.fillStyle = id === myId ? "#4af" : "#fff";

		p.segments.forEach(s => {
			ctx.fillRect(s.x - 5, s.y - 5, 10, 10);
		});

	}

	ctx.restore();

	drawMini();

	requestAnimationFrame(draw);
}

function drawMini() {

	mctx.clearRect(0, 0, mini.width, mini.height);

	const scale = mini.width / world;

	for (const id in players) {

		const p = players[id];

		mctx.fillStyle = id === myId ? "#4af" : "#aaa";

		mctx.fillRect(
			p.x * scale,
			p.y * scale,
			3,
			3
		);
	}

}

draw();
