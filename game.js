const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const screens = {
  start: document.getElementById("startScreen"),
  game: document.getElementById("gameScreen"),
  shop: document.getElementById("shopScreen"),
  end: document.getElementById("endScreen"),
};

const startBtn = document.getElementById("startBtn");
const continueBtn = document.getElementById("continueBtn");
const restartBtn = document.getElementById("restartBtn");
const messageEl = document.getElementById("message");
const orderListEl = document.getElementById("orderList");
const upgradeListEl = document.getElementById("upgradeList");

const moneyEl = document.getElementById("money");
const timeLeftEl = document.getElementById("timeLeft");
const doneCountEl = document.getElementById("doneCount");
const dayNumEl = document.getElementById("dayNum");
const dayTotalEl = document.getElementById("dayTotal");

const GOODS = [
  { type: "elektronik", label: "Elektronik", icon: "📱", color: "#3b82c4", dark: "#265d8f" },
  { type: "toj", label: "Tøj", icon: "👕", color: "#d46a9f", dark: "#a34c78" },
  { type: "mad", label: "Mad", icon: "🍎", color: "#6fca6f", dark: "#468f46" },
  { type: "mobler", label: "Møbler", icon: "🪑", color: "#c98a54", dark: "#95602f" },
];

const SHELVES = GOODS.map((g, i) => ({ ...g, x: 0, y: 30 + i * 110, w: 180, h: 90 }));
const DOCK = { x: 620, y: 30, w: 180, h: 420, label: "Lastbil", icon: "🚚" };

const TOTAL_DAYS = 4;
const DAY_LENGTH = 45;
const BASE_SPEED = 210;
const BASE_MAX_ORDERS = 3;

const UPGRADES = [
  {
    key: "speed",
    icon: "👟",
    name: "Hurtigere ben",
    desc: "Du bevæger dig hurtigere rundt på lageret.",
    cost: 80,
  },
  {
    key: "capacity",
    icon: "🎒",
    name: "Stor rygsæk",
    desc: "Bær 2 varer ad gangen i stedet for 1.",
    cost: 150,
  },
  {
    key: "orderSlot",
    icon: "📋",
    name: "Ekstra ordreplads",
    desc: "Håndtér én ekstra ordre samtidig.",
    cost: 120,
  },
  {
    key: "deadline",
    icon: "🗓️",
    name: "Bedre planlægning",
    desc: "Alle ordrer får 25% længere leveringsfrist.",
    cost: 100,
  },
];

let audioCtx = null;
function beep(freq, dur, type = "sine", vol = 0.15) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = vol;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    osc.stop(audioCtx.currentTime + dur);
  } catch (e) {
    // audio not available, ignore
  }
}

let player, carrying, money, timeLeft, doneCount, missedCount;
let day, dayEarnings, dayDone, dayMissed, upgrades;
let activeOrders, orderIdCounter, running, lastTime, msgTimer, spawnCooldown;
let floatingTexts, confetti, walkPhase;
let keys = new Set();

function upgradeValue(key) {
  return upgrades[key] === true;
}

function currentSpeed() {
  return BASE_SPEED + (upgradeValue("speed") ? 70 : 0);
}
function currentCapacity() {
  return 1 + (upgradeValue("capacity") ? 1 : 0);
}
function currentMaxOrders() {
  return BASE_MAX_ORDERS + (upgradeValue("orderSlot") ? 1 : 0);
}
function deadlineMultiplier() {
  return upgradeValue("deadline") ? 1.25 : 1;
}

function resetRun() {
  money = 0;
  doneCount = 0;
  missedCount = 0;
  day = 1;
  upgrades = { speed: false, capacity: false, orderSlot: false, deadline: false };
  dayTotalEl.textContent = TOTAL_DAYS;
}

function startDay() {
  player = { x: 400, y: 240, size: 30 };
  carrying = [];
  timeLeft = DAY_LENGTH;
  dayEarnings = 0;
  dayDone = 0;
  dayMissed = 0;
  activeOrders = [];
  orderIdCounter = 1;
  keys = new Set();
  running = true;
  lastTime = null;
  msgTimer = 0;
  spawnCooldown = 0;
  floatingTexts = [];
  confetti = [];
  walkPhase = 0;

  spawnOrder();
  spawnOrder();

  dayNumEl.textContent = day;
  showScreen("game");
  requestAnimationFrame(loop);
}

function spawnOrder() {
  if (activeOrders.length >= currentMaxOrders()) return;
  const good = GOODS[Math.floor(Math.random() * GOODS.length)];
  const qty = 1 + Math.floor(Math.random() * 3);
  const deadline = (14 + qty * 6) * deadlineMultiplier();
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
  msgTimer = 2.2;
}

function addFloatingText(x, y, text, color) {
  floatingTexts.push({ x, y, text, color, life: 1.1 });
}

function spawnConfetti(x, y) {
  const colors = ["#ffb648", "#ff8c5a", "#6fca6f", "#3b82c4", "#d46a9f"];
  for (let i = 0; i < 22; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 140;
    confetti.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 60,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 0.8 + Math.random() * 0.4,
      size: 4 + Math.random() * 4,
    });
  }
}

function rectsOverlap(a, bx, by, bw, bh) {
  return a.x < bx + bw && a.x + a.size > bx && a.y < by + bh && a.y + a.size > by;
}

function handleAction() {
  const atShelf = SHELVES.find((s) => rectsOverlap(player, s.x, s.y, s.w, s.h));
  const atDock = rectsOverlap(player, DOCK.x, DOCK.y, DOCK.w, DOCK.h);

  if (atShelf) {
    if (carrying.length >= currentCapacity()) {
      showMessage("Rygsækken er fuld! Kør varerne til lastbilen.");
      return;
    }
    const order = activeOrders.find((o) => o.type === atShelf.type && o.remaining > 0);
    if (!order) {
      showMessage(`Ingen ordre mangler ${atShelf.label.toLowerCase()} lige nu.`);
      return;
    }
    carrying.push(atShelf.type);
    addFloatingText(player.x + 15, player.y - 10, `+${atShelf.icon}`, "#fff");
    beep(520, 0.1, "triangle");
    showMessage(`Hentede ${atShelf.icon} ${atShelf.label}.`);
    return;
  }

  if (atDock) {
    if (carrying.length === 0) {
      showMessage("Du bærer ikke noget. Hent en vare fra en hylde først.");
      return;
    }
    const type = carrying[0];
    const order = activeOrders.find((o) => o.type === type && o.remaining > 0);
    if (!order) {
      carrying.shift();
      showMessage("Ordren udløb inden du nåede frem... varen gik tabt.");
      return;
    }
    carrying.shift();
    order.remaining -= 1;
    money += order.rewardPerItem;
    dayEarnings += order.rewardPerItem;
    addFloatingText(DOCK.x + 40, player.y - 10, `+${order.rewardPerItem} kr`, "#ffe08a");
    beep(760, 0.12, "sine");
    if (order.remaining <= 0) {
      doneCount += 1;
      dayDone += 1;
      activeOrders = activeOrders.filter((o) => o.id !== order.id);
      spawnConfetti(DOCK.x + 40, player.y);
      beep(1000, 0.18, "sine", 0.18);
      showMessage("Ordre fuldført! 🎉");
      spawnOrder();
    } else {
      showMessage(`Leveret! +${order.rewardPerItem} kr`);
    }
    return;
  }

  showMessage("Gå hen til en hylde eller lastbilen.");
}

function update(dt) {
  let dx = 0;
  let dy = 0;
  if (keys.has("ArrowUp") || keys.has("KeyW")) dy -= 1;
  if (keys.has("ArrowDown") || keys.has("KeyS")) dy += 1;
  if (keys.has("ArrowLeft") || keys.has("KeyA")) dx -= 1;
  if (keys.has("ArrowRight") || keys.has("KeyD")) dx += 1;

  const moving = dx !== 0 || dy !== 0;
  if (moving) {
    const len = Math.hypot(dx, dy);
    player.x += (dx / len) * currentSpeed() * dt;
    player.y += (dy / len) * currentSpeed() * dt;
    player.x = Math.max(0, Math.min(canvas.width - player.size, player.x));
    player.y = Math.max(16, Math.min(canvas.height - player.size - 6, player.y));
    walkPhase += dt * 10;
  }

  spawnCooldown -= dt;
  if (spawnCooldown <= 0 && activeOrders.length < currentMaxOrders()) {
    spawnOrder();
    spawnCooldown = 4;
  }

  for (const order of activeOrders) order.deadline -= dt;
  const missed = activeOrders.filter((o) => o.deadline <= 0);
  if (missed.length > 0) {
    missedCount += missed.length;
    dayMissed += missed.length;
    money = Math.max(0, money - missed.length * 10);
    activeOrders = activeOrders.filter((o) => o.deadline > 0);
    showMessage("En ordre nåede ikke frem til tiden... 😬");
    beep(180, 0.2, "sawtooth", 0.1);
  }

  for (const ft of floatingTexts) {
    ft.y -= 35 * dt;
    ft.life -= dt;
  }
  floatingTexts = floatingTexts.filter((f) => f.life > 0);

  for (const c of confetti) {
    c.vy += 260 * dt;
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    c.life -= dt;
  }
  confetti = confetti.filter((c) => c.life > 0);

  timeLeft -= dt;
  if (msgTimer > 0) {
    msgTimer -= dt;
    if (msgTimer <= 0) messageEl.textContent = "";
  }

  if (timeLeft <= 0) {
    endDay();
  }
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawFloor() {
  ctx.fillStyle = "#d7ddc9";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const tile = 40;
  ctx.fillStyle = "rgba(0,0,0,0.035)";
  for (let y = 0; y < canvas.height; y += tile) {
    for (let x = (y / tile) % 2 === 0 ? 0 : tile; x < canvas.width; x += tile * 2) {
      ctx.fillRect(x, y, tile, tile);
    }
  }
}

function drawShelf(s) {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.25)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  const grad = ctx.createLinearGradient(s.x, s.y, s.x, s.y + s.h);
  grad.addColorStop(0, s.color);
  grad.addColorStop(1, s.dark);
  ctx.fillStyle = grad;
  roundRect(s.x + 8, s.y, s.w - 16, s.h, 14);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "30px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(s.icon, s.x + s.w / 2, s.y + 42);

  ctx.fillStyle = "#1b2430";
  ctx.font = "bold 15px Nunito, Verdana, sans-serif";
  ctx.fillText(s.label, s.x + s.w / 2, s.y + s.h - 12);
  ctx.textAlign = "left";
}

function drawDock(inRange) {
  ctx.save();
  if (inRange) {
    ctx.shadowColor = "rgba(111, 202, 111, 0.9)";
    ctx.shadowBlur = 22;
  } else {
    ctx.shadowColor = "rgba(0,0,0,0.25)";
    ctx.shadowBlur = 8;
  }
  ctx.fillStyle = "#3d4652";
  roundRect(DOCK.x + 10, DOCK.y, DOCK.w - 10, DOCK.h, 16);
  ctx.fill();
  ctx.restore();

  // truck illustration
  const cx = DOCK.x + DOCK.w / 2;
  const cy = DOCK.y + DOCK.h / 2;
  ctx.fillStyle = "#f2ede4";
  roundRect(cx - 55, cy - 60, 110, 70, 10);
  ctx.fill();
  ctx.fillStyle = "#ffb648";
  roundRect(cx - 45, cy - 48, 90, 46, 6);
  ctx.fill();
  ctx.fillStyle = "#2a3341";
  ctx.beginPath();
  ctx.arc(cx - 30, cy + 14, 12, 0, Math.PI * 2);
  ctx.arc(cx + 30, cy + 14, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#1b2430";
  ctx.font = "bold 16px Nunito, Verdana, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${DOCK.icon} ${DOCK.label}`, cx, DOCK.y + DOCK.h - 20);
  ctx.textAlign = "left";
}

function drawPlayer() {
  const bob = Math.sin(walkPhase) * 3;
  const px = player.x + player.size / 2;
  const py = player.y + player.size / 2 + bob;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.3)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 4;

  // body
  ctx.fillStyle = "#3b6fb0";
  roundRect(px - 13, py - 6, 26, 24, 8);
  ctx.fill();

  // head
  ctx.fillStyle = "#f2c79e";
  ctx.beginPath();
  ctx.arc(px, py - 16, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // hair / cap
  ctx.fillStyle = "#ffb648";
  ctx.beginPath();
  ctx.arc(px, py - 20, 12, Math.PI, 0);
  ctx.fill();

  // carried items
  carrying.forEach((type, i) => {
    const good = GOODS.find((g) => g.type === type);
    ctx.font = "18px sans-serif";
    ctx.fillText(good.icon, px - 10 + i * 16, py - 36);
  });
}

function drawFloatingTexts() {
  for (const ft of floatingTexts) {
    ctx.globalAlpha = Math.max(0, ft.life / 1.1);
    ctx.fillStyle = ft.color;
    ctx.font = "bold 16px Nunito, Verdana, sans-serif";
    ctx.fillText(ft.text, ft.x, ft.y);
  }
  ctx.globalAlpha = 1;
}

function drawConfetti() {
  for (const c of confetti) {
    ctx.globalAlpha = Math.max(0, c.life);
    ctx.fillStyle = c.color;
    ctx.fillRect(c.x - c.size / 2, c.y - c.size / 2, c.size, c.size);
  }
  ctx.globalAlpha = 1;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawFloor();
  for (const s of SHELVES) drawShelf(s);
  const inRange = rectsOverlap(player, DOCK.x, DOCK.y, DOCK.w, DOCK.h);
  drawDock(inRange);
  drawPlayer();
  drawConfetti();
  drawFloatingTexts();
}

function renderOrders() {
  orderListEl.innerHTML = "";
  if (activeOrders.length === 0) {
    orderListEl.innerHTML = "<p>Ingen ordrer lige nu…</p>";
    return;
  }
  for (const o of activeOrders) {
    const pct = Math.max(0, (o.deadline / o.maxDeadline) * 100);
    const barColor = pct < 25 ? "#e2694f" : pct < 55 ? "#f2c94c" : "#6fca6f";
    const card = document.createElement("div");
    card.className = "orderCard";
    card.style.borderLeftColor = o.color;
    card.innerHTML = `
      <div class="orderIcon" style="background:${o.color}33">${o.icon}</div>
      <div class="orderBody">
        <div class="orderTitle">${o.label} — ${o.remaining}/${o.total} stk</div>
        <div class="orderReward">${o.rewardPerItem} kr/stk</div>
        <div class="deadlineBar"><div class="deadlineFill" style="width:${pct}%; background:${barColor}"></div></div>
      </div>
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
  if (!running) return;
  draw();
  renderOrders();

  moneyEl.textContent = money;
  timeLeftEl.textContent = Math.max(0, Math.ceil(timeLeft));
  doneCountEl.textContent = doneCount;

  requestAnimationFrame(loop);
}

function showScreen(name) {
  Object.values(screens).forEach((el) => el.classList.add("hidden"));
  screens[name].classList.remove("hidden");
}

function renderShop() {
  document.getElementById("shopDayJustDone").textContent = day;
  document.getElementById("dayEarnings").textContent = dayEarnings;
  document.getElementById("dayDone").textContent = dayDone;
  document.getElementById("dayMissed").textContent = dayMissed;
  document.getElementById("shopMoney").textContent = money;
  document.getElementById("nextDayNum").textContent = day + 1;

  upgradeListEl.innerHTML = "";
  for (const u of UPGRADES) {
    const owned = upgradeValue(u.key);
    const card = document.createElement("div");
    card.className = "upgradeCard" + (owned ? " owned" : "");
    card.innerHTML = `
      <div class="upgradeIcon">${u.icon}</div>
      <div class="upgradeName">${u.name}</div>
      <div class="upgradeDesc">${u.desc}</div>
      <button ${owned || money < u.cost ? "disabled" : ""} data-key="${u.key}">
        ${owned ? "Købt ✅" : `Køb – ${u.cost} kr`}
      </button>
    `;
    upgradeListEl.appendChild(card);
  }

  upgradeListEl.querySelectorAll("button[data-key]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-key");
      const upgrade = UPGRADES.find((u) => u.key === key);
      if (upgradeValue(key) || money < upgrade.cost) return;
      money -= upgrade.cost;
      upgrades[key] = true;
      beep(880, 0.15, "sine", 0.2);
      renderShop();
    });
  });
}

function endDay() {
  running = false;
  if (day >= TOTAL_DAYS) {
    endRun();
    return;
  }
  renderShop();
  showScreen("shop");
}

function endRun() {
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

  showScreen("end");
}

startBtn.addEventListener("click", () => {
  resetRun();
  startDay();
});

continueBtn.addEventListener("click", () => {
  day += 1;
  startDay();
});

restartBtn.addEventListener("click", () => {
  resetRun();
  startDay();
});

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
