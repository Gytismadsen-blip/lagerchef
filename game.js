const canvas = document.getElementById("canvas");

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
const speedoFillEl = document.getElementById("speedoFill");

const moneyEl = document.getElementById("money");
const timeLeftEl = document.getElementById("timeLeft");
const doneCountEl = document.getElementById("doneCount");
const dayNumEl = document.getElementById("dayNum");
const dayTotalEl = document.getElementById("dayTotal");

const GOODS = [
  { type: "elektronik", label: "Elektronik", icon: "📱", color: 0x3b82c4 },
  { type: "toj", label: "Tøj", icon: "👕", color: 0xd46a9f },
  { type: "mad", label: "Mad", icon: "🍎", color: 0x6fca6f },
  { type: "mobler", label: "Møbler", icon: "🪑", color: 0xc98a54 },
];

const SHELF_Z = [-10.5, -3.5, 3.5, 10.5];
const SHELVES = GOODS.map((g, i) => ({
  ...g,
  x: -19,
  z: SHELF_Z[i],
  zoneMinX: -22,
  zoneMaxX: -15,
  zoneMinZ: SHELF_Z[i] - 2.6,
  zoneMaxZ: SHELF_Z[i] + 2.6,
}));

const DOCK = {
  zoneMinX: 14,
  zoneMaxX: 22,
  zoneMinZ: -13,
  zoneMaxZ: 13,
};

const TOTAL_DAYS = 4;
const DAY_LENGTH = 45;
const BASE_MAX_SPEED = 11;
const BASE_MAX_ORDERS = 3;
const WORLD_MIN_X = -21;
const WORLD_MAX_X = 21;
const WORLD_MIN_Z = -12;
const WORLD_MAX_Z = 12;

const UPGRADES = [
  { key: "speed", icon: "👟", name: "Turbo-motor", desc: "Gaffeltrucken kører hurtigere.", cost: 80 },
  { key: "capacity", icon: "🎒", name: "Dobbelt gaffel", desc: "Bær 2 varer ad gangen i stedet for 1.", cost: 150 },
  { key: "orderSlot", icon: "📋", name: "Ekstra ordreplads", desc: "Håndtér én ekstra ordre samtidig.", cost: 120 },
  { key: "deadline", icon: "🗓️", name: "Bedre planlægning", desc: "Alle ordrer får 25% længere leveringsfrist.", cost: 100 },
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

// ---------- Three.js scene ----------
let renderer, scene, camera;
let vehicle, forkGroup, carriedMeshes = [];
let dockGlowMat, shelfGlowMats = {};
let dustPool = [];
let confettiPool = [];
let labelsLayer, floatingLayer;

function initScene() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.width, canvas.height, false);
  renderer.shadowMap.enabled = true;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9fb8c9);
  scene.fog = new THREE.Fog(0x9fb8c9, 30, 62);

  camera = new THREE.PerspectiveCamera(60, canvas.width / canvas.height, 0.1, 200);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x445566, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2d9, 1.1);
  sun.position.set(20, 30, 10);
  sun.castShadow = true;
  sun.shadow.camera.left = -30;
  sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 25;
  sun.shadow.camera.bottom = -25;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);

  const floorGeo = new THREE.PlaneGeometry(WORLD_MAX_X - WORLD_MIN_X + 2, WORLD_MAX_Z - WORLD_MIN_Z + 2, 20, 12);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xd7ddc9, roughness: 0.95 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const grid = new THREE.GridHelper(WORLD_MAX_X - WORLD_MIN_X + 2, 22, 0x9aa38c, 0x9aa38c);
  grid.position.y = 0.01;
  grid.material.opacity = 0.35;
  grid.material.transparent = true;
  scene.add(grid);

  const backWallGeo = new THREE.BoxGeometry(WORLD_MAX_X - WORLD_MIN_X + 4, 6, 1);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x2a3341, roughness: 0.9 });
  const backWall = new THREE.Mesh(backWallGeo, wallMat);
  backWall.position.set(0, 3, WORLD_MIN_Z - 1.2);
  backWall.receiveShadow = true;
  scene.add(backWall);

  for (const s of SHELVES) buildShelf(s);
  buildDock();
  buildVehicle();

  labelsLayer = document.createElement("div");
  labelsLayer.id = "labelsLayer";
  labelsLayer.style.cssText = "position:absolute;inset:0;pointer-events:none;overflow:hidden;";
  canvas.parentElement.appendChild(labelsLayer);

  floatingLayer = document.createElement("div");
  floatingLayer.id = "floatingLayer";
  floatingLayer.style.cssText = "position:absolute;inset:0;pointer-events:none;overflow:hidden;";
  canvas.parentElement.appendChild(floatingLayer);

  for (const s of SHELVES) {
    const label = document.createElement("div");
    label.className = "worldLabel";
    label.innerHTML = `${s.icon}<br>${s.label}`;
    label.style.borderColor = `#${s.color.toString(16).padStart(6, "0")}`;
    labelsLayer.appendChild(label);
    s.labelEl = label;
  }
  const dockLabel = document.createElement("div");
  dockLabel.className = "worldLabel dockLabel";
  dockLabel.innerHTML = "🚚<br>Lastbil";
  labelsLayer.appendChild(dockLabel);
  DOCK.labelEl = dockLabel;
}

function buildShelf(s) {
  const group = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x54607a, roughness: 0.7 });
  const frameGeo = new THREE.BoxGeometry(3.2, 3.4, 3.6);
  const frame = new THREE.Mesh(frameGeo, frameMat);
  frame.position.set(s.x, 1.7, s.z);
  frame.castShadow = true;
  frame.receiveShadow = true;
  group.add(frame);

  const glowMat = new THREE.MeshStandardMaterial({
    color: s.color,
    emissive: new THREE.Color(s.color),
    emissiveIntensity: 0.15,
    roughness: 0.5,
  });
  shelfGlowMats[s.type] = glowMat;
  const crateGeo = new THREE.BoxGeometry(1, 0.9, 1);
  const positions = [
    [-0.9, 2.9, -1.4], [0.1, 2.9, -0.4], [0.9, 2.9, 0.6],
    [-0.6, 1.1, 1.4], [0.6, 1.1, -1.6],
  ];
  for (const p of positions) {
    const crate = new THREE.Mesh(crateGeo, glowMat);
    crate.position.set(s.x + p[0], p[1], s.z + p[2]);
    crate.castShadow = true;
    group.add(crate);
  }
  scene.add(group);
}

function buildDock() {
  const padGeo = new THREE.PlaneGeometry(DOCK.zoneMaxX - DOCK.zoneMinX, DOCK.zoneMaxZ - DOCK.zoneMinZ);
  dockGlowMat = new THREE.MeshStandardMaterial({
    color: 0x3d4652,
    emissive: new THREE.Color(0x000000),
    emissiveIntensity: 0,
    roughness: 0.85,
  });
  const pad = new THREE.Mesh(padGeo, dockGlowMat);
  pad.rotation.x = -Math.PI / 2;
  pad.position.set((DOCK.zoneMinX + DOCK.zoneMaxX) / 2, 0.02, 0);
  pad.receiveShadow = true;
  scene.add(pad);

  const truck = new THREE.Group();
  const cabMat = new THREE.MeshStandardMaterial({ color: 0xf2ede4, roughness: 0.5 });
  const trailerMat = new THREE.MeshStandardMaterial({ color: 0xffb648, roughness: 0.6 });
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1b2430, roughness: 0.9 });

  const cab = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), cabMat);
  cab.position.set(18.5, 1.6, -6.5);
  cab.castShadow = true;
  truck.add(cab);

  const trailer = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.2, 8), trailerMat);
  trailer.position.set(18.5, 1.7, 1.5);
  trailer.castShadow = true;
  truck.add(trailer);

  const wheelGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.6, 16);
  const wheelZs = [-8, -5, 0, 4];
  for (const wz of wheelZs) {
    for (const side of [-1.6, 1.6]) {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(18.5 + side, 0.6, wz);
      truck.add(wheel);
    }
  }
  scene.add(truck);
}

function buildVehicle() {
  vehicle = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffb648, roughness: 0.5, metalness: 0.1 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x2a3341, roughness: 0.6 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1, 2.2), bodyMat);
  body.position.y = 0.9;
  body.castShadow = true;
  vehicle.add(body);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1, 1), darkMat);
  cabin.position.set(0, 1.7, -0.3);
  cabin.castShadow = true;
  vehicle.add(cabin);

  const mast = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.4, 0.15), darkMat);
  mast.position.set(0, 1.6, 1.15);
  vehicle.add(mast);

  forkGroup = new THREE.Group();
  forkGroup.position.set(0, 0.5, 1.3);
  const forkGeo = new THREE.BoxGeometry(0.15, 0.12, 1);
  const fork1 = new THREE.Mesh(forkGeo, darkMat);
  fork1.position.set(-0.35, 0, 0.5);
  const fork2 = new THREE.Mesh(forkGeo, darkMat);
  fork2.position.set(0.35, 0, 0.5);
  forkGroup.add(fork1, fork2);
  vehicle.add(forkGroup);

  const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.35, 14);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.9 });
  const wheelPositions = [[-0.85, 0.4, 0.7], [0.85, 0.4, 0.7], [-0.85, 0.4, -0.7], [0.85, 0.4, -0.7]];
  for (const p of wheelPositions) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(...p);
    wheel.castShadow = true;
    vehicle.add(wheel);
  }

  const light = new THREE.PointLight(0xfff2c0, 0.6, 8);
  light.position.set(0, 1.2, 1.4);
  vehicle.add(light);

  scene.add(vehicle);
}

function projectToScreen(x, y, z) {
  const v = new THREE.Vector3(x, y, z).project(camera);
  const rect = canvas.getBoundingClientRect();
  return {
    x: (v.x * 0.5 + 0.5) * rect.width,
    y: (-v.y * 0.5 + 0.5) * rect.height,
    behind: v.z > 1,
  };
}

function updateLabels() {
  for (const s of SHELVES) {
    const p = projectToScreen(s.x, 4.4, s.z);
    s.labelEl.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`;
    s.labelEl.style.display = p.behind ? "none" : "block";
  }
  const dp = projectToScreen((DOCK.zoneMinX + DOCK.zoneMaxX) / 2, 5.5, -8);
  DOCK.labelEl.style.transform = `translate(${dp.x}px, ${dp.y}px) translate(-50%, -100%)`;
  DOCK.labelEl.style.display = dp.behind ? "none" : "block";
}

function spawnDust() {
  const mat = new THREE.MeshBasicMaterial({ color: 0xcfd0c4, transparent: true, opacity: 0.5 });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), mat);
  const angle = vehicleState.heading + Math.PI + (Math.random() - 0.5) * 0.6;
  mesh.position.set(
    vehicle.position.x + Math.sin(angle) * 1.3,
    0.3,
    vehicle.position.z + Math.cos(angle) * 1.3
  );
  scene.add(mesh);
  dustPool.push({ mesh, life: 0.6, vy: 0.6 + Math.random() * 0.4 });
}

function spawnConfetti3D(x, z) {
  const colors = [0xffb648, 0xff8c5a, 0x6fca6f, 0x3b82c4, 0xd46a9f];
  for (let i = 0; i < 18; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: colors[Math.floor(Math.random() * colors.length)] });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), mat);
    mesh.position.set(x, 2, z);
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 3;
    scene.add(mesh);
    confettiPool.push({
      mesh,
      vx: Math.cos(angle) * speed,
      vz: Math.sin(angle) * speed,
      vy: 4 + Math.random() * 3,
      life: 1 + Math.random() * 0.5,
    });
  }
}

function addFloatingText(x, y, z, text, color) {
  const el = document.createElement("div");
  el.className = "floatText";
  el.textContent = text;
  el.style.color = color;
  floatingLayer.appendChild(el);
  floatingTexts.push({ el, x, y, z, life: 1.2 });
}

// ---------- Game state ----------
let vehicleState;
let carrying, money, timeLeft, doneCount, missedCount;
let day, dayEarnings, dayDone, dayMissed, upgrades;
let activeOrders, orderIdCounter, running, lastTime, msgTimer, spawnCooldown;
let floatingTexts;
let keys = new Set();

function upgradeValue(key) {
  return upgrades[key] === true;
}
function currentMaxSpeed() {
  return BASE_MAX_SPEED + (upgradeValue("speed") ? 5 : 0);
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
  vehicleState = { heading: 0, speed: 0 };
  vehicle.position.set(0, 0, 0);
  vehicle.rotation.y = 0;
  carrying = [];
  updateCarriedVisual();
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
  floatingLayer.innerHTML = "";
  for (const d of dustPool) scene.remove(d.mesh);
  dustPool = [];
  for (const c of confettiPool) scene.remove(c.mesh);
  confettiPool = [];

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

function updateCarriedVisual() {
  for (const m of carriedMeshes) vehicle.remove(m);
  carriedMeshes = [];
  carrying.forEach((type, i) => {
    const good = GOODS.find((g) => g.type === type);
    const mat = new THREE.MeshStandardMaterial({ color: good.color, roughness: 0.6 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), mat);
    mesh.position.set(i === 0 ? -0.25 : 0.25, 0.85, 1.7);
    mesh.castShadow = true;
    vehicle.add(mesh);
    carriedMeshes.push(mesh);
  });
}

function inZone(zone) {
  const x = vehicle.position.x;
  const z = vehicle.position.z;
  return x >= zone.zoneMinX && x <= zone.zoneMaxX && z >= zone.zoneMinZ && z <= zone.zoneMaxZ;
}

function handleAction() {
  const atShelf = SHELVES.find((s) => inZone(s));
  const atDock = inZone(DOCK);

  if (atShelf) {
    if (carrying.length >= currentCapacity()) {
      showMessage("Gaflen er fuld! Kør varerne til lastbilen.");
      return;
    }
    const order = activeOrders.find((o) => o.type === atShelf.type && o.remaining > 0);
    if (!order) {
      showMessage(`Ingen ordre mangler ${atShelf.label.toLowerCase()} lige nu.`);
      return;
    }
    carrying.push(atShelf.type);
    updateCarriedVisual();
    addFloatingText(vehicle.position.x, 2.4, vehicle.position.z, `+${atShelf.icon}`, "#fff");
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
      updateCarriedVisual();
      showMessage("Ordren udløb inden du nåede frem... varen gik tabt.");
      return;
    }
    carrying.shift();
    updateCarriedVisual();
    order.remaining -= 1;
    money += order.rewardPerItem;
    dayEarnings += order.rewardPerItem;
    addFloatingText(vehicle.position.x, 2.4, vehicle.position.z, `+${order.rewardPerItem} kr`, "#ffe08a");
    beep(760, 0.12, "sine");
    if (order.remaining <= 0) {
      doneCount += 1;
      dayDone += 1;
      activeOrders = activeOrders.filter((o) => o.id !== order.id);
      spawnConfetti3D(vehicle.position.x, vehicle.position.z);
      beep(1000, 0.18, "sine", 0.18);
      showMessage("Ordre fuldført! 🎉");
      spawnOrder();
    } else {
      showMessage(`Leveret! +${order.rewardPerItem} kr`);
    }
    return;
  }

  showMessage("Kør hen til en hylde eller lastbilen.");
}

function updateVehicle(dt) {
  const accel = 9;
  const drag = 6;
  const maxSpeed = currentMaxSpeed();
  let throttle = 0;
  if (keys.has("ArrowUp") || keys.has("KeyW")) throttle = 1;
  else if (keys.has("ArrowDown") || keys.has("KeyS")) throttle = -1;

  if (throttle !== 0) {
    vehicleState.speed += throttle * accel * dt;
  } else {
    const sign = Math.sign(vehicleState.speed);
    vehicleState.speed -= sign * drag * dt;
    if (Math.sign(vehicleState.speed) !== sign) vehicleState.speed = 0;
  }
  vehicleState.speed = Math.max(-maxSpeed * 0.55, Math.min(maxSpeed, vehicleState.speed));

  let turnInput = 0;
  if (keys.has("ArrowLeft") || keys.has("KeyA")) turnInput = -1;
  else if (keys.has("ArrowRight") || keys.has("KeyD")) turnInput = 1;

  if (turnInput !== 0 && Math.abs(vehicleState.speed) > 0.05) {
    const speedFactor = Math.min(1, Math.abs(vehicleState.speed) / maxSpeed) * 0.7 + 0.3;
    const dir = vehicleState.speed >= 0 ? 1 : -1;
    vehicleState.heading += turnInput * 2.6 * speedFactor * dir * dt;
  }

  vehicle.position.x += Math.sin(vehicleState.heading) * vehicleState.speed * dt;
  vehicle.position.z += Math.cos(vehicleState.heading) * vehicleState.speed * dt;
  vehicle.position.x = Math.max(WORLD_MIN_X, Math.min(WORLD_MAX_X, vehicle.position.x));
  vehicle.position.z = Math.max(WORLD_MIN_Z, Math.min(WORLD_MAX_Z, vehicle.position.z));
  vehicle.rotation.y = vehicleState.heading;

  const speedFrac = Math.min(1, Math.abs(vehicleState.speed) / maxSpeed);
  speedoFillEl.style.width = `${speedFrac * 100}%`;

  if (speedFrac > 0.6 && Math.random() < 0.5) spawnDust();

  camera.fov = 60 + speedFrac * 10;
  camera.updateProjectionMatrix();
}

function updateCamera(dt) {
  const forward = new THREE.Vector3(Math.sin(vehicleState.heading), 0, Math.cos(vehicleState.heading));
  const desired = vehicle.position.clone().addScaledVector(forward, -9).add(new THREE.Vector3(0, 5.5, 0));
  camera.position.lerp(desired, Math.min(1, dt * 4));
  const lookTarget = vehicle.position.clone().add(new THREE.Vector3(0, 1.2, 0));
  camera.lookAt(lookTarget);
}

function update(dt) {
  updateVehicle(dt);
  updateCamera(dt);

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

  for (const d of dustPool) {
    d.mesh.position.y += d.vy * dt;
    d.mesh.material.opacity -= dt * 0.8;
    d.life -= dt;
  }
  for (const d of dustPool.filter((d) => d.life <= 0)) scene.remove(d.mesh);
  dustPool = dustPool.filter((d) => d.life > 0);

  for (const c of confettiPool) {
    c.vy -= 9 * dt;
    c.mesh.position.x += c.vx * dt;
    c.mesh.position.y += c.vy * dt;
    c.mesh.position.z += c.vz * dt;
    c.mesh.rotation.x += dt * 5;
    c.mesh.rotation.y += dt * 4;
    c.life -= dt;
  }
  for (const c of confettiPool.filter((c) => c.life <= 0)) scene.remove(c.mesh);
  confettiPool = confettiPool.filter((c) => c.life > 0);

  for (const ft of floatingTexts) {
    ft.y += 0.8 * dt;
    ft.life -= dt;
    const p = projectToScreen(ft.x, ft.y, ft.z);
    ft.el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -50%)`;
    ft.el.style.opacity = Math.max(0, ft.life / 1.2);
    ft.el.style.display = p.behind ? "none" : "block";
  }
  for (const ft of floatingTexts.filter((f) => f.life <= 0)) ft.el.remove();
  floatingTexts = floatingTexts.filter((f) => f.life > 0);

  const dockInRange = inZone(DOCK);
  dockGlowMat.emissive.set(dockInRange ? 0x6fca6f : 0x000000);
  dockGlowMat.emissiveIntensity = dockInRange ? 0.5 : 0;

  timeLeft -= dt;
  if (msgTimer > 0) {
    msgTimer -= dt;
    if (msgTimer <= 0) messageEl.textContent = "";
  }

  if (timeLeft <= 0) {
    endDay();
  }
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
    const hex = `#${o.color.toString(16).padStart(6, "0")}`;
    const card = document.createElement("div");
    card.className = "orderCard";
    card.style.borderLeftColor = hex;
    card.innerHTML = `
      <div class="orderIcon" style="background:${hex}33">${o.icon}</div>
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
  updateLabels();
  renderer.render(scene, camera);
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

initScene();

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
