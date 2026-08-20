const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const startScreen = document.getElementById("startScreen");
const gameScreen = document.getElementById("gameScreen");
const endScreen = document.getElementById("endScreen");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const messageEl = document.getElementById("message");
const orderListEl = document.getElementById("orderList");
const moneyEl = document.getElementById("money");
const timeLeftEl = document.getElementById("timeLeft");
const doneCountEl = document.getElementById("doneCount");

const GOODS = [
  { type: "elektronik", label: "Elektronik", icon: "📱", color: "#3b82c4" },
  { type: "toj", label: "Tøj", icon: "👕", color: "#d46a9f" },
  { type: "mad", label: "Mad", icon: "🍎", color: "#6fca6f" },
  { type: "mobler", label: "Møbler", icon: "🪑", color: "#a97449" },
];

const SHELVES = GOODS.map((g, i) => ({
  ...g,
  x: 0,
  y: 30 + i * 110,
  w: 180,
  h: 90,
}));

const DOCK = { x: 620, y: 30, w: 180, h: 420, label: "Lastbil", icon: "🚚" };

const GAME_LENGTH = 120;
const MAX_ORDERS = 3;

let player, carrying, money, timeLeft, doneCount, missedCount;
let activeOrders, orderIdCounter, running, lastTime, msgTimer, spawnCooldown;
let keys = new Set();

function resetGame() {
  player = { x: 400, y: 240, size: 30, speed: 220 };
  carrying = null;
  money = 0;
  timeLeft = GAME_LENGTH;
  doneCount = 0;
  missedCount = 0;
  activeOrders = [];
  orderIdCounter = 1;
  keys = new Set();
  running = true;
  lastTime = null;
  msgTimer = 0;
  spawnCooldown = 0;

  spawnOrder();
  spawnOrder();
}

function spawnOrder() {
  if (activeOrders.length >= MAX_ORDERS) return;
  const good = GOODS[Math.floor(Math.random() * GOODS.length)];
  const qty = 1 + Math.floor(Math.random() * 3);
  const deadline = 14 + qty * 6;
  activeOrders.push({
    id: orderIdCounter++,
    type: good.type,
    label: good.label,
    icon: good.icon,
    color: good.color,
    total: qty,
    remaining: qty,
    deadline,
    maxDeadline: deadline,
    rewardPerItem: 25 + qty * 5,
  });
}

function showMessage(text) {
  messageEl.textContent = text;
  msgTimer = 2.5;
}

function rectsOverlap(a, bx, by, bw, bh) {
  return (
    a.x < bx + bw &&
    a.x + a.size > bx &&
    a.y < by + bh &&
    a.y + a.size > by
  );
}

function handleAction() {
  if (!carrying) {
    const shelf = SHELVES.find((s) => rectsOverlap(player, s.x, s.y, s.w, s.h));
    if (!shelf) {
      showMessage("Gå hen til en hylde eller lastbilen.");
      return;
    }
    const order = activeOrders.find((o) => o.type === shelf.type && o.remaining > 0);
    if (!order) {
      showMessage(`Ingen ordre mangler ${shelf.label.toLowerCase()} lige nu.`);
      return;
    }
    carrying = shelf.type;
    showMessage(`Hentede ${shelf.icon} ${shelf.label}. Kør den til lastbilen!`);
  } else {
    const atDock = rectsOverlap(player, DOCK.x, DOCK.y, DOCK.w, DOCK.h);
    if (!atDock) {
      showMessage("Gå hen til lastbilen for at levere.");
      return;
    }
    const order = activeOrders.find((o) => o.type === carrying && o.remaining > 0);
    if (!order) {
      showMessage("Ingen ordre mangler den vare mere.");
      carrying = null;
      return;
    }
    order.remaining -= 1;
    money += order.rewardPerItem;
    carrying = null;
    if (order.remaining <= 0) {
      doneCount += 1;
      activeOrders = activeOrders.filter((o) => o.id !== order.id);
      showMessage(`Ordre leveret! +${order.rewardPerItem} kr, bonus for hele ordren! 🎉`);
      spawnOrder();
    } else {
      showMessage(`Leveret! +${order.rewardPerItem} kr`);
    }
  }
}

function update(dt) {
  let dx = 0;
  let dy = 0;
  if (keys.has("ArrowUp") || keys.has("KeyW")) dy -= 1;
  if (keys.has("ArrowDown") || keys.has("KeyS")) dy += 1;
  if (keys.has("ArrowLeft") || keys.has("KeyA")) dx -= 1;
  if (keys.has("ArrowRight") || keys.has("KeyD")) dx += 1;

  if (dx !== 0 || dy !== 0) {
    const len = Math.hypot(dx, dy);
    player.x += (dx / len) * player.speed * dt;
    player.y += (dy / len) * player.speed * dt;
    player.x = Math.max(0, Math.min(canvas.width - player.size, player.x));
    player.y = Math.max(0, Math.min(canvas.height - player.size, player.y));
  }

  spawnCooldown -= dt;
  if (spawnCooldown <= 0 && activeOrders.length < MAX_ORDERS) {
    spawnOrder();
    spawnCooldown = 4;
  }

  for (const order of activeOrders) {
    order.deadline -= dt;
  }
  const missed = activeOrders.filter((o) => o.deadline <= 0);
  if (missed.length > 0) {
    missedCount += missed.length;
    money = Math.max(0, money - missed.length * 10);
    activeOrders = activeOrders.filter((o) => o.deadline > 0);
    showMessage("En ordre blev leveret for sent... 😬");
  }

  timeLeft -= dt;
  if (msgTimer > 0) {
    msgTimer -= dt;
    if (msgTimer <= 0) messageEl.textContent = "";
  }

  if (timeLeft <= 0) {
    endGame();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#cfd8c9";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const s of SHELVES) {
    ctx.fillStyle = s.color;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#1b2430";
    ctx.font = "16px Verdana";
    ctx.fillText(`${s.icon} ${s.label}`, s.x + 10, s.y + 24);
  }

  ctx.fillStyle = "#4a4a4a";
  ctx.fillRect(DOCK.x, DOCK.y, DOCK.w, DOCK.h);
  ctx.fillStyle = "#f2ede4";
  ctx.font = "18px Verdana";
  ctx.fillText(`${DOCK.icon} ${DOCK.label}`, DOCK.x + 20, DOCK.y + 30);

  ctx.fillStyle = carrying ? (GOODS.find((g) => g.type === carrying)?.color ?? "#f2a541") : "#f2a541";
  ctx.fillRect(player.x, player.y, player.size, player.size);
  ctx.fillStyle = "#1b2430";
  ctx.font = "20px Verdana";
  ctx.fillText("🧑", player.x - 2, player.y + 22);

  if (carrying) {
    const g = GOODS.find((x) => x.type === carrying);
    ctx.font = "18px Verdana";
    ctx.fillText(g.icon, player.x + 6, player.y - 8);
  }
}

function renderOrders() {
  orderListEl.innerHTML = "";
  if (activeOrders.length === 0) {
    orderListEl.innerHTML = "<p>Ingen ordrer lige nu...</p>";
    return;
  }
  for (const o of activeOrders) {
    const pct = Math.max(0, (o.deadline / o.maxDeadline) * 100);
    const card = document.createElement("div");
    card.className = "orderCard";
    card.innerHTML = `
      <div class="orderTitle">${o.icon} ${o.label} — ${o.remaining}/${o.total} stk</div>
      <div>Betaling: ${o.rewardPerItem} kr/stk</div>
      <div class="deadlineBar"><div class="deadlineFill" style="width:${pct}%; background:${pct < 30 ? "#e2694f" : "#6fca6f"}"></div></div>
    `;
    orderListEl.appendChild(card);
  }
}

function loop(timestamp) {
  if (!running) return;
  if (lastTime === null) lastTime = timestamp;
  const dt = Math.min(0.05, (timestamp - lastTime) / 1000);
  lastTime = timestamp;

  update(dt);
  draw();
  renderOrders();

  moneyEl.textContent = money;
  timeLeftEl.textContent = Math.max(0, Math.ceil(timeLeft));
  doneCountEl.textContent = doneCount;

  if (running) requestAnimationFrame(loop);
}

function endGame() {
  running = false;
  const totalOrders = doneCount + missedCount;
  const rate = totalOrders === 0 ? 100 : Math.round((doneCount / totalOrders) * 100);

  document.getElementById("finalMoney").textContent = money;
  document.getElementById("finalDone").textContent = doneCount;
  document.getElementById("finalMissed").textContent = missedCount;
  document.getElementById("finalRate").textContent = rate;

  const ratingEl = document.getElementById("rating");
  if (rate >= 80) {
    ratingEl.textContent = "🌟 Fantastisk logistikchef!";
  } else if (rate >= 50) {
    ratingEl.textContent = "👍 Godt arbejde!";
  } else {
    ratingEl.textContent = "💪 Der er plads til forbedring næste gang.";
  }

  gameScreen.classList.add("hidden");
  endScreen.classList.remove("hidden");
}

function startGame() {
  resetGame();
  startScreen.classList.add("hidden");
  endScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    if (running) handleAction();
    return;
  }
  keys.add(e.code);
});

window.addEventListener("keyup", (e) => {
  keys.delete(e.code);
});

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);
