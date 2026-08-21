const canvas = document.getElementById("canvas");

const screens = {
  start: document.getElementById("startScreen"),
  game: document.getElementById("gameScreen"),
  shop: document.getElementById("shopScreen"),
  end: document.getElementById("endScreen"),
};

const startBtn = document.getElementById("startBtn");
const continueGameBtn = document.getElementById("continueGameBtn");
const saveInfoEl = document.getElementById("saveInfo");
const continueBtn = document.getElementById("continueBtn");
const saveBtn = document.getElementById("saveBtn");
const restartBtn = document.getElementById("restartBtn");
const endDayBtn = document.getElementById("endDayBtn");
const messageEl = document.getElementById("message");
const orderListEl = document.getElementById("orderList");
const upgradeListEl = document.getElementById("upgradeList");
const speedoFillEl = document.getElementById("speedoFill");

const moneyEl = document.getElementById("money");
const doneCountEl = document.getElementById("doneCount");
const dayNumEl = document.getElementById("dayNum");

const GOODS = [
  { type: "elektronik", label: "Elektronik", icon: "📱", color: 0x3b82c4 },
  { type: "toj", label: "Tøj", icon: "👕", color: 0xd46a9f },
  { type: "mad", label: "Mad", icon: "🍎", color: 0x6fca6f },
  { type: "mobler", label: "Møbler", icon: "🪑", color: 0xc98a54 },
];

const WORLD_MIN_X = -30;
const WORLD_MAX_X = 30;
const WORLD_MIN_Z = -20;
const WORLD_MAX_Z = 20;

const RACK_DEPTH = 3;
const RACK_WIDTH = 3.4;
const RACK_X = WORLD_MIN_X + 3;

const SHELF_Z = [-13.5, -4.5, 4.5, 13.5];
const SHELVES = GOODS.map((g, i) => ({
  ...g,
  x: RACK_X,
  z: SHELF_Z[i],
  zoneMinX: WORLD_MIN_X,
  zoneMaxX: RACK_X + RACK_DEPTH / 2 + 3.5,
  zoneMinZ: SHELF_Z[i] - RACK_WIDTH / 2,
  zoneMaxZ: SHELF_Z[i] + RACK_WIDTH / 2,
}));

const DOCK = {
  zoneMinX: WORLD_MAX_X - 10,
  zoneMaxX: WORLD_MAX_X,
  zoneMinZ: WORLD_MIN_Z,
  zoneMaxZ: WORLD_MAX_Z,
};

const BASE_MAX_SPEED = 16;
const BASE_MAX_ORDERS = 3;

const UPGRADES = [
  { key: "speed", icon: "👟", name: "Turbo-motor", desc: "Gaffeltrucken kører hurtigere.", cost: 80 },
  { key: "capacity", icon: "🎒", name: "Dobbelt gaffel", desc: "Bær 2 varer ad gangen i stedet for 1.", cost: 150 },
  { key: "orderSlot", icon: "📋", name: "Ekstra ordreplads", desc: "Håndtér én ekstra ordre samtidig.", cost: 120 },
  { key: "deadline", icon: "🗓️", name: "Bedre planlægning", desc: "Alle ordrer får 25% længere leveringsfrist.", cost: 100 },
];

const STAFF = [
  { key: "lagerLead", icon: "🧑‍🏭", name: "Lagermedarbejder", desc: "Flere hænder på gulvet — nye ordrer dukker op hurtigere.", cost: 180 },
  { key: "kontorAssist", icon: "🧑‍💻", name: "Kontorassistent", desc: "Klarer papirarbejdet — I får automatisk 25 kr ekstra i kassen ved hver ny arbejdsdag.", cost: 150 },
  { key: "indkober", icon: "🧑‍💼", name: "Indkøber", desc: "Forhandler bedre forsikrings- og leverandøraftaler hjem — bøden for forsinkede ordrer halveres.", cost: 160 },
  { key: "saelger", icon: "🤝", name: "Sælger", desc: "Får bedre priser hjem på ordrerne — alle leverancer betaler 15% mere.", cost: 200 },
];

const TASKS = {
  indkob: {
    icon: "📦",
    title: "Indkøb — Kraljic-matrisen",
    scenario:
      "En leverandør sælger en vare, der udgør en STOR del af jeres samlede indkøbsomkostninger. Der findes MANGE alternative leverandører på markedet, så I kan nemt skifte leverandør. Hvilken kategori i Kraljic-matrisen hører varen til?",
    options: [
      { text: "Strategisk vare", correct: false, explain: "Forkert — strategiske varer har høj værdi OG høj forsyningsrisiko (få leverandører). Her er der mange alternativer, så risikoen er lav." },
      { text: "Løftestangsvare (leverage)", correct: true, explain: "Rigtigt! Høj økonomisk værdi + lav forsyningsrisiko (mange leverandører) = løftestangsvare. Her kan I bruge jeres indkøbsmagt til at forhandle en bedre pris." },
      { text: "Flaskehalsvare", correct: false, explain: "Forkert — flaskehalsvarer har lav værdi men høj forsyningsrisiko (få leverandører). Her er der mange leverandører at vælge imellem." },
      { text: "Rutinevare", correct: false, explain: "Forkert — rutinevarer har lav værdi og lav risiko. Her udgør varen en stor del af jeres omkostninger." },
    ],
    reward: 60,
  },
  forhandling: {
    icon: "🤝",
    title: "Forhandling — BATNA",
    scenario:
      "Du forhandler pris med en leverandør. Din BATNA (Best Alternative To a Negotiated Agreement) er en anden leverandør, der uden problemer kan levere samme vare 5% billigere. Leverandøren du sidder overfor nægter at gå ned i pris. Hvad gør du?",
    options: [
      { text: "Accepterer prisen for at undgå konflikt", correct: false, explain: "Forkert — uden at bruge din BATNA som forhandlingskort forærer du værdi væk, selvom du har et bedre alternativ." },
      { text: "Nævner roligt dit alternativ og giver dem chancen for at matche det", correct: true, explain: "Rigtigt! En stærk BATNA skal bruges som pres i forhandlingen — roligt og sagligt, ikke skjult og ikke som en trussel." },
      { text: "Går med det samme uden at sige noget", correct: false, explain: "For hurtigt — du mister chancen for at forbedre aftalen ved overhovedet at vise, at du har alternativer." },
      { text: "Truer med at anmelde dem", correct: false, explain: "Forkert — det er hverken relevant eller en god forhandlingstaktik i denne situation." },
    ],
    reward: 60,
  },
  jura: {
    icon: "⚖️",
    title: "Jura — risikoens overgang",
    scenario:
      "I har købt varer 'ab fabrik' (Ex Works) hos en leverandør. Under transporten til jeres lager bliver varerne stjålet. Ifølge reglerne om risikoens overgang — hvem bærer tabet?",
    options: [
      { text: "Sælger (leverandøren)", correct: false, explain: "Forkert — ved Ex Works overgår risikoen til køber, så snart varen er stillet til rådighed på sælgers adresse." },
      { text: "Køber (jeres virksomhed)", correct: true, explain: "Rigtigt! Ved 'Ex Works' overgår risikoen allerede, når varen stilles til rådighed hos sælger — selve transporten er købers ansvar og risiko." },
      { text: "Transportfirmaet automatisk", correct: false, explain: "Forkert — transportøren hæfter kun efter sin egen fragtaftale, ikke automatisk efter reglerne om risikoens overgang." },
      { text: "Ingen — tabet bortfalder", correct: false, explain: "Forkert — risikoen for varen ligger altid hos én af de to parter." },
    ],
    reward: 60,
  },
  transport: {
    icon: "🚛",
    title: "Transport & distribution",
    scenario:
      "En vigtig kunde skal akut bruge en ordre i morgen tidlig, 800 km væk. Flyfragt er dyrt men hurtigt. Lastbil er billigere, men tager 2 dage. Hvad vælger du ud fra den klassiske afvejning mellem pris og leveringstid?",
    options: [
      { text: "Lastbil, fordi det altid er billigst", correct: false, explain: "Forkert — her overholder lastbilen ikke deadline. Pris er ikke det eneste, der tæller i transportvalget." },
      { text: "Fly, fordi leveringstiden er kritisk for kunden", correct: true, explain: "Rigtigt! Når leveringstiden er den kritiske faktor, vælger man bevidst den hurtigere men dyrere transportform — en klassisk trade-off." },
      { text: "Skib, fordi det er mest bæredygtigt", correct: false, explain: "Forkert — skib er langsomst og slet ikke realistisk på en 800 km strækning med en akut deadline." },
      { text: "Vent til det passer bedre", correct: false, explain: "Forkert — det ville koste jer kunden." },
    ],
    reward: 60,
  },
  mrp: {
    icon: "🏭",
    title: "MRP / lagerstyring — EOQ",
    scenario:
      "Jeres årlige forbrug (D) af en vare er 4.000 stk. Det koster 50 kr at afgive én ordre (S), og 8 kr pr. stk. om året at have varen på lager (H). EOQ = √(2×D×S ÷ H). Hvad er den optimale ordrestørrelse, afrundet?",
    options: [
      { text: "100 stk", correct: false, explain: "Forkert. √(2×4000×50÷8) = √50.000 ≈ 224 stk." },
      { text: "224 stk", correct: true, explain: "Rigtigt! √(2×4000×50÷8) = √50.000 ≈ 224 stk — den ordrestørrelse minimerer de samlede lageromkostninger." },
      { text: "4.000 stk", correct: false, explain: "Forkert — det er hele årsforbruget, ikke den optimale ordrestørrelse." },
      { text: "8 stk", correct: false, explain: "Forkert — det er lageromkostningen pr. stk., ikke ordrestørrelsen." },
    ],
    reward: 60,
  },
};

const SUPPLIERS = [
  {
    key: "reliable",
    icon: "🚚",
    name: "Pålidelig leverandør",
    desc: "Stabile leverancer til tiden. Højere pris, men ingen risiko for tomme hylder.",
    cost: 70,
  },
  {
    key: "cheap",
    icon: "💸",
    name: "Billig leverandør",
    desc: "Lav pris, men højere risiko for forsinkelser (klassisk TCO-afvejning: pris vs. leveringssikkerhed).",
    cost: 35,
  },
  {
    key: "sustainable",
    icon: "🌱",
    name: "Bæredygtig leverandør",
    desc: "Dyrere indkøb, men styrker jeres omdømme (ESG) — I får en ekstra bonus ved dagens slutning.",
    cost: 100,
  },
];

const CUSTOMERS = [
  {
    key: "mixed",
    icon: "⚖️",
    name: "Blandede kunder",
    desc: "Almindelig blanding af ordrer — standard størrelse, pris og frist.",
    qtyMod: 1,
    rewardMod: 1,
    deadlineMod: 1,
  },
  {
    key: "wholesale",
    icon: "🏬",
    name: "Storkunder",
    desc: "Store ordrer med god tid, men lavere pris pr. styk (mængderabat).",
    qtyMod: 1.6,
    rewardMod: 0.75,
    deadlineMod: 1.3,
  },
  {
    key: "rush",
    icon: "⚡",
    name: "Akutkunder",
    desc: "Små, hastende ordrer der betaler godt pr. styk — men med stram frist.",
    qtyMod: 0.7,
    rewardMod: 1.35,
    deadlineMod: 0.65,
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

// ---------- Textures ----------
function makeConcreteTexture() {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const tctx = c.getContext("2d");
  tctx.fillStyle = "#9a9d92";
  tctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 1400; i++) {
    tctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.08})`;
    tctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
  }
  for (let i = 0; i < 500; i++) {
    tctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.06})`;
    tctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
  }
  tctx.strokeStyle = "rgba(0,0,0,0.06)";
  tctx.lineWidth = 1;
  for (let i = 0; i < size; i += 64) {
    tctx.beginPath();
    tctx.moveTo(i, 0);
    tctx.lineTo(i, size);
    tctx.stroke();
    tctx.beginPath();
    tctx.moveTo(0, i);
    tctx.lineTo(size, i);
    tctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(11, 7);
  return tex;
}

function makeHazardTexture() {
  const size = 128;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const tctx = c.getContext("2d");
  tctx.fillStyle = "#181818";
  tctx.fillRect(0, 0, size, size);
  tctx.fillStyle = "#ffcc00";
  tctx.save();
  tctx.translate(size / 2, size / 2);
  tctx.rotate(Math.PI / 4);
  tctx.translate(-size, -size);
  const stripe = 20;
  for (let x = 0; x < size * 4; x += stripe * 2) {
    tctx.fillRect(x, 0, stripe, size * 3);
  }
  tctx.restore();
  return new THREE.CanvasTexture(c);
}

function makeWheelGroup(radius, width, tireColor, hubColor) {
  const group = new THREE.Group();
  const tireGeo = new THREE.TorusGeometry(radius, width / 2, 10, 20);
  tireGeo.rotateY(Math.PI / 2);
  const tireMat = new THREE.MeshStandardMaterial({ color: tireColor, roughness: 0.9 });
  const tire = new THREE.Mesh(tireGeo, tireMat);
  tire.castShadow = true;
  group.add(tire);

  const hubGeo = new THREE.CylinderGeometry(radius * 0.5, radius * 0.5, width * 0.95, 12);
  hubGeo.rotateZ(Math.PI / 2);
  const hubMat = new THREE.MeshStandardMaterial({ color: hubColor, roughness: 0.35, metalness: 0.55 });
  const hub = new THREE.Mesh(hubGeo, hubMat);
  group.add(hub);

  for (let i = 0; i < 5; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(width * 0.9, radius * 0.35, radius * 0.1), hubMat);
    spoke.rotation.x = (i / 5) * Math.PI * 2;
    group.add(spoke);
  }

  return group;
}

// ---------- Three.js scene ----------
let renderer, scene, camera;
let vehicle, forkGroup, carriedMeshes = [];
let character, legL, legR;
let playerMode = "foot";
let footPhase = 0;
let footHeading = 0;
let wheels = [];
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
  scene.background = new THREE.Color(0x14181f);
  scene.fog = new THREE.Fog(0x14181f, 26, 72);

  camera = new THREE.PerspectiveCamera(62, canvas.width / canvas.height, 0.1, 200);

  const hemi = new THREE.HemisphereLight(0xdfe6ee, 0x2a2f36, 0.8);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2d9, 1.15);
  sun.position.set(15, 20, 10);
  sun.castShadow = true;
  sun.shadow.camera.left = -35;
  sun.shadow.camera.right = 35;
  sun.shadow.camera.top = 30;
  sun.shadow.camera.bottom = -30;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);

  const worldW = WORLD_MAX_X - WORLD_MIN_X;
  const worldD = WORLD_MAX_Z - WORLD_MIN_Z;
  const wallH = 8.5;

  const floorGeo = new THREE.PlaneGeometry(worldW + 2, worldD + 2, 24, 16);
  const floorMat = new THREE.MeshStandardMaterial({ map: makeConcreteTexture(), roughness: 0.95 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x2a3341, roughness: 0.9 });
  const wallDefs = [
    { w: worldW + 4, h: wallH, d: 0.6, pos: [0, wallH / 2, WORLD_MIN_Z - 0.3] },
    { w: worldW + 4, h: wallH, d: 0.6, pos: [0, wallH / 2, WORLD_MAX_Z + 0.3] },
    { w: 0.6, h: wallH, d: worldD + 4, pos: [WORLD_MIN_X - 0.3, wallH / 2, 0] },
    { w: 0.6, h: wallH, d: worldD + 4, pos: [WORLD_MAX_X + 0.3, wallH / 2, 0] },
  ];
  for (const wd of wallDefs) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(wd.w, wd.h, wd.d), wallMat);
    wall.position.set(...wd.pos);
    wall.receiveShadow = true;
    wall.castShadow = true;
    scene.add(wall);
  }

  const ceilMat = new THREE.MeshStandardMaterial({ color: 0x171b22, roughness: 0.95, side: THREE.DoubleSide });
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(worldW + 2, worldD + 2), ceilMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = wallH;
  scene.add(ceiling);

  const trussMat = new THREE.MeshStandardMaterial({ color: 0x3a4452, roughness: 0.7, metalness: 0.3 });
  for (let tx = WORLD_MIN_X + 5; tx <= WORLD_MAX_X - 5; tx += 8) {
    const truss = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, worldD), trussMat);
    truss.position.set(tx, wallH - 0.4, 0);
    scene.add(truss);
  }

  buildPillarsAndLights(wallH);
  for (const s of SHELVES) buildShelf(s);
  buildDock();
  buildVehicle();
  buildCharacter();

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

function buildPillarsAndLights(wallH) {
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x3a4452, roughness: 0.8 });
  const fixtureMat = new THREE.MeshStandardMaterial({ color: 0x1b2028, roughness: 0.6 });
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfff2c0 });
  const pillarXs = [-11, 11];
  const pillarZs = [-14, 0, 14];
  const lampH = wallH - 0.6;
  for (const px of pillarXs) {
    for (const pz of pillarZs) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.6, wallH, 0.6), pillarMat);
      pillar.position.set(px, wallH / 2, pz);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      scene.add(pillar);
    }
  }

  const lampXs = [-18, -6, 6, 18];
  const lampZs = [-13, 0, 13];
  for (const px of lampXs) {
    for (const pz of lampZs) {
      const fixtureGroup = new THREE.Group();
      fixtureGroup.position.set(px, lampH, pz);
      const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.25, 10), fixtureMat);
      const bulb = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.05, 10), bulbMat);
      bulb.position.y = -0.14;
      fixtureGroup.add(housing, bulb);
      scene.add(fixtureGroup);

      const lamp = new THREE.PointLight(0xfff2c0, 0.55, 16, 2);
      lamp.position.set(px, lampH - 0.3, pz);
      scene.add(lamp);
    }
  }
}

function buildShelf(s) {
  const group = new THREE.Group();
  const steelMat = new THREE.MeshStandardMaterial({ color: 0xd45a2a, roughness: 0.55, metalness: 0.35 });
  const palletMat = new THREE.MeshStandardMaterial({ color: 0x9c7b45, roughness: 0.9 });
  const glowMat = new THREE.MeshStandardMaterial({
    color: s.color,
    emissive: new THREE.Color(s.color),
    emissiveIntensity: 0.15,
    roughness: 0.5,
  });
  shelfGlowMats[s.type] = glowMat;

  const halfD = RACK_DEPTH / 2;
  const halfW = RACK_WIDTH / 2;
  const postH = 4.6;
  const levels = [0.05, 1.75, 3.45];

  const postGeo = new THREE.BoxGeometry(0.14, postH, 0.14);
  for (const ox of [-halfD, halfD]) {
    for (const oz of [-halfW, halfW]) {
      const post = new THREE.Mesh(postGeo, steelMat);
      post.position.set(s.x + ox, postH / 2, s.z + oz);
      post.castShadow = true;
      group.add(post);
    }
  }

  for (const ly of levels.slice(1)) {
    for (const oz of [-halfW, halfW]) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(RACK_DEPTH + 0.2, 0.12, 0.12), steelMat);
      beam.position.set(s.x, ly, s.z + oz);
      group.add(beam);
    }
    const braceFront = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, RACK_WIDTH), steelMat);
    braceFront.position.set(s.x - halfD, ly, s.z);
    group.add(braceFront);
    const braceBack = braceFront.clone();
    braceBack.position.x = s.x + halfD;
    group.add(braceBack);
  }
  const topSign = new THREE.Mesh(new THREE.BoxGeometry(RACK_DEPTH + 0.2, 0.3, 0.1), glowMat);
  topSign.position.set(s.x, postH + 0.15, s.z - halfW);
  group.add(topSign);

  const palletGeo = new THREE.BoxGeometry(RACK_DEPTH - 0.4, 0.15, RACK_WIDTH - 0.5);
  const crateGeo = new THREE.BoxGeometry(0.85, 0.7, 0.85);
  levels.forEach((ly) => {
    const pallet = new THREE.Mesh(palletGeo, palletMat);
    pallet.position.set(s.x, ly + 0.1, s.z);
    pallet.receiveShadow = true;
    pallet.castShadow = true;
    group.add(pallet);

    const spots = [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]];
    for (const [ox, oz] of spots) {
      const crate = new THREE.Mesh(crateGeo, glowMat);
      crate.position.set(s.x + ox, ly + 0.1 + 0.075 + 0.35, s.z + oz * (RACK_WIDTH / 3.4));
      crate.castShadow = true;
      group.add(crate);
    }
  });

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
  const truckX = WORLD_MAX_X - 6;
  const wheelRadius = 0.65;
  const wheelTop = wheelRadius * 2 * 0.75; // visual ride height above axle center
  const chassisY = wheelTop + 0.15;

  const cabMat = new THREE.MeshStandardMaterial({ color: 0xc23b3b, roughness: 0.35, metalness: 0.25 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x1c2a35, roughness: 0.15, metalness: 0.7 });
  const trailerMat = new THREE.MeshStandardMaterial({ color: 0xffb648, roughness: 0.55 });
  const trailerSkirtMat = new THREE.MeshStandardMaterial({ color: 0x6b4a1f, roughness: 0.7 });
  const chassisMat = new THREE.MeshStandardMaterial({ color: 0x22262c, roughness: 0.7, metalness: 0.3 });
  const bumperMat = new THREE.MeshStandardMaterial({ color: 0x2a2f36, roughness: 0.5, metalness: 0.4 });
  const tankMat = new THREE.MeshStandardMaterial({ color: 0x8a8f98, roughness: 0.4, metalness: 0.6 });

  // ---- tractor unit ----
  const cabH = 2.8;
  const cabCenterZ = -9;
  const tractorFrame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, 5), chassisMat);
  tractorFrame.position.set(truckX, chassisY, cabCenterZ + 0.8);
  tractorFrame.castShadow = true;
  truck.add(tractorFrame);

  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.9, cabH, 2.6), cabMat);
  cab.position.set(truckX, chassisY + cabH / 2, cabCenterZ);
  cab.castShadow = true;
  truck.add(cab);
  const roofFairing = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.5, 1), cabMat);
  roofFairing.position.set(truckX, chassisY + cabH + 0.25, cabCenterZ + 0.5);
  truck.add(roofFairing);
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1, 0.1), glassMat);
  windshield.position.set(truckX, chassisY + cabH - 0.55, cabCenterZ - 1.28);
  windshield.rotation.x = -0.12;
  truck.add(windshield);
  const sideWin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 1.4), glassMat);
  sideWin.position.set(truckX - 1.46, chassisY + cabH - 0.6, cabCenterZ - 0.2);
  truck.add(sideWin);
  const sideWin2 = sideWin.clone();
  sideWin2.position.x = truckX + 1.46;
  truck.add(sideWin2);
  const grille = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 0.15), new THREE.MeshStandardMaterial({ color: 0x1b1e24, roughness: 0.5, metalness: 0.5 }));
  grille.position.set(truckX, chassisY + 1, cabCenterZ - 1.35);
  truck.add(grille);
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.35, 0.3), bumperMat);
  bumper.position.set(truckX, chassisY + 0.15, cabCenterZ - 1.45);
  truck.add(bumper);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xfff2c0, emissiveIntensity: 0.7 });
  for (const side of [-1.15, 1.15]) {
    const headlight = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.25, 0.06), headMat);
    headlight.position.set(truckX + side, chassisY + 1.35, cabCenterZ - 1.45);
    truck.add(headlight);
  }
  // fuel tank + exhaust stack, classic semi-truck detail
  const fuelTank = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.6, 12), tankMat);
  fuelTank.rotation.z = Math.PI / 2;
  fuelTank.position.set(truckX - 1.35, chassisY - 0.05, cabCenterZ + 0.6);
  truck.add(fuelTank);
  const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.2, 8), new THREE.MeshStandardMaterial({ color: 0xc7ccd3, roughness: 0.3, metalness: 0.7 }));
  stack.position.set(truckX - 1.35, chassisY + 1.8, cabCenterZ + 1.6);
  truck.add(stack);

  // fifth-wheel coupling plate — visually bridges tractor to trailer
  const hitchZ = cabCenterZ + 3.1;
  const hitchPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.14, 12), chassisMat);
  hitchPlate.position.set(truckX, chassisY + 0.15, hitchZ);
  truck.add(hitchPlate);

  // ---- trailer ----
  const trailerH = 3.2;
  const trailerLen = 9;
  const trailerFrontZ = hitchZ + 0.3;
  const trailerCenterZ = trailerFrontZ + trailerLen / 2;

  const trailerFrame = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.3, trailerLen + 0.4), chassisMat);
  trailerFrame.position.set(truckX, chassisY, trailerCenterZ);
  trailerFrame.castShadow = true;
  truck.add(trailerFrame);

  const trailer = new THREE.Mesh(new THREE.BoxGeometry(3.2, trailerH, trailerLen), trailerMat);
  trailer.position.set(truckX, chassisY + trailerH / 2, trailerCenterZ);
  trailer.castShadow = true;
  truck.add(trailer);
  const trailerNose = new THREE.Mesh(new THREE.BoxGeometry(3.2, trailerH, 0.5), trailerSkirtMat);
  trailerNose.position.set(truckX, chassisY + trailerH / 2, trailerFrontZ + 0.25);
  truck.add(trailerNose);
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(3.24, 0.5, trailerLen), trailerSkirtMat);
  skirt.position.set(truckX, chassisY + 0.25, trailerCenterZ);
  truck.add(skirt);
  for (let i = -1; i <= 1; i++) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.06, trailerH - 0.4, trailerLen), new THREE.MeshStandardMaterial({ color: 0xe0a03a, roughness: 0.6 }));
    rib.position.set(truckX + i * 1.05, chassisY + trailerH / 2 + 0.1, trailerCenterZ);
    truck.add(rib);
  }
  // rear doors + reflective strip
  const doorSeam = new THREE.Mesh(new THREE.BoxGeometry(0.05, trailerH, 0.05), chassisMat);
  doorSeam.position.set(truckX, chassisY + trailerH / 2, trailerFrontZ + trailerLen);
  truck.add(doorSeam);
  const reflectStrip = new THREE.Mesh(new THREE.BoxGeometry(3.22, 0.15, 0.02), new THREE.MeshStandardMaterial({ color: 0xd8342a, roughness: 0.4 }));
  reflectStrip.position.set(truckX, chassisY + 0.9, trailerFrontZ + trailerLen);
  truck.add(reflectStrip);

  // landing legs (support the trailer nose when unhitched — reads as authentic detail)
  for (const side of [-0.9, 0.9]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, chassisY - 0.1, 8), chassisMat);
    leg.position.set(truckX + side, (chassisY - 0.1) / 2, trailerFrontZ + 0.6);
    truck.add(leg);
  }

  // wheels: tractor axles clustered under the cab, trailer axles clustered at the rear
  const tractorWheelZs = [cabCenterZ - 1.1, cabCenterZ + 1.2];
  const trailerWheelZs = [trailerFrontZ + trailerLen - 2.6, trailerFrontZ + trailerLen - 1.7, trailerFrontZ + trailerLen - 0.8];
  for (const wz of [...tractorWheelZs, ...trailerWheelZs]) {
    for (const side of [-1.55, 1.55]) {
      const wheel = makeWheelGroup(wheelRadius, 0.5, 0x111318, 0xb8bcc4);
      wheel.position.set(truckX + side, wheelRadius, wz);
      truck.add(wheel);
    }
  }
  scene.add(truck);
}

function buildCharacter() {
  character = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xe8b48a, roughness: 0.7 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: 0x2f6fb0, roughness: 0.6 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x2a2f36, roughness: 0.7 });
  const vestMat = new THREE.MeshStandardMaterial({ color: 0xffb648, roughness: 0.6 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x1b1e24, roughness: 0.8 });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.28), shirtMat);
  torso.position.y = 1.05;
  torso.castShadow = true;
  character.add(torso);

  const vest = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.4, 0.3), vestMat);
  vest.position.y = 1.1;
  character.add(vest);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.06, 0.31), new THREE.MeshStandardMaterial({ color: 0xfff2c0, roughness: 0.5 }));
  stripe.position.y = 1.25;
  character.add(stripe);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), skinMat);
  head.position.y = 1.55;
  head.castShadow = true;
  character.add(head);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x1c2128, roughness: 0.6 }));
  cap.position.y = 1.6;
  character.add(cap);

  legL = new THREE.Group();
  legL.position.set(-0.13, 0.75, 0);
  const legLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.7, 0.2), pantsMat);
  legLMesh.position.y = -0.35;
  legLMesh.castShadow = true;
  legL.add(legLMesh);
  const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.12, 0.28), shoeMat);
  shoeL.position.set(0, -0.7, 0.04);
  legL.add(shoeL);
  character.add(legL);

  legR = new THREE.Group();
  legR.position.set(0.13, 0.75, 0);
  const legRMesh = legLMesh.clone();
  legR.add(legRMesh);
  const shoeR = shoeL.clone();
  legR.add(shoeR);
  character.add(legR);

  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.5, 0.16), shirtMat);
  armL.position.set(-0.32, 1.05, 0);
  character.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.32;
  character.add(armR);

  scene.add(character);
}

function buildVehicle() {
  vehicle = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf5c518, roughness: 0.35, metalness: 0.4 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1c2128, roughness: 0.5, metalness: 0.3 });
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.7 });
  const hazardMat = new THREE.MeshStandardMaterial({ map: makeHazardTexture(), roughness: 0.6 });

  // chassis
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 2.3), bodyMat);
  chassis.position.y = 0.65;
  chassis.castShadow = true;
  vehicle.add(chassis);

  // counterweight (rear, hazard-striped for realism/visibility)
  const counterweight = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.7, 0.5), hazardMat);
  counterweight.position.set(0, 0.75, -1.15);
  counterweight.castShadow = true;
  vehicle.add(counterweight);

  // seat
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.6), seatMat);
  seat.position.set(0, 1.1, -0.3);
  seat.castShadow = true;
  vehicle.add(seat);
  const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.12), seatMat);
  seatBack.position.set(0, 1.45, -0.58);
  vehicle.add(seatBack);

  // overhead guard (open roll cage, not a solid cabin — reads much more like a real forklift)
  const postGeo = new THREE.BoxGeometry(0.1, 1.5, 0.1);
  const postPositions = [[-0.6, 1.65, -0.7], [0.6, 1.65, -0.7], [-0.6, 1.65, 0.5], [0.6, 1.65, 0.5]];
  for (const p of postPositions) {
    const post = new THREE.Mesh(postGeo, darkMat);
    post.position.set(...p);
    post.castShadow = true;
    vehicle.add(post);
  }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 1.4), darkMat);
  roof.position.set(0, 2.42, -0.1);
  roof.castShadow = true;
  vehicle.add(roof);

  // beacon light on the roof
  const beaconMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xffaa00, emissiveIntensity: 0.9 });
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), beaconMat);
  beacon.position.set(0, 2.58, -0.1);
  vehicle.add(beacon);
  vehicle.userData.beacon = beaconMat;

  // mast: two vertical rails + crossbar + hydraulic cylinder
  const railGeo = new THREE.BoxGeometry(0.14, 2.5, 0.14);
  const railL = new THREE.Mesh(railGeo, darkMat);
  railL.position.set(-0.55, 1.55, 1.15);
  const railR = new THREE.Mesh(railGeo, darkMat);
  railR.position.set(0.55, 1.55, 1.15);
  vehicle.add(railL, railR);
  const crossTop = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 0.14), darkMat);
  crossTop.position.set(0, 2.7, 1.15);
  vehicle.add(crossTop);
  const hydraulic = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.1, 8), new THREE.MeshStandardMaterial({ color: 0x8a8f98, roughness: 0.4, metalness: 0.6 }));
  hydraulic.position.set(0, 1.5, 0.95);
  vehicle.add(hydraulic);

  // fork carriage + forks
  forkGroup = new THREE.Group();
  forkGroup.position.set(0, 0.45, 1.2);
  const carriage = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 0.1), darkMat);
  carriage.position.set(0, 0.25, 0);
  forkGroup.add(carriage);
  const forkGeo = new THREE.BoxGeometry(0.14, 0.1, 1.1);
  const fork1 = new THREE.Mesh(forkGeo, darkMat);
  fork1.position.set(-0.35, 0, 0.55);
  const fork2 = new THREE.Mesh(forkGeo, darkMat);
  fork2.position.set(0.35, 0, 0.55);
  forkGroup.add(fork1, fork2);
  vehicle.add(forkGroup);

  // wheels: chunky torus tires + hub/spokes, built so they can steer (front) and spin (all)
  wheels = [];
  const wheelPositions = [
    [-0.82, 0.42, 0.7, true], [0.82, 0.42, 0.7, true],
    [-0.82, 0.42, -0.85, false], [0.82, 0.42, -0.85, false],
  ];
  for (const [px, py, pz, isFront] of wheelPositions) {
    const steerPivot = new THREE.Group();
    steerPivot.position.set(px, py, pz);
    vehicle.add(steerPivot);

    const rollGroup = new THREE.Group();
    steerPivot.add(rollGroup);

    const wheelMesh = makeWheelGroup(0.42, 0.32, 0x111318, 0xc9ccd1);
    rollGroup.add(wheelMesh);

    wheels.push({ steerPivot, rollGroup, isFront });
  }

  // headlights / taillights
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xfff2c0, emissiveIntensity: 0.8 });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, emissive: 0xcc2222, emissiveIntensity: 0.7 });
  for (const side of [-0.55, 0.55]) {
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), headMat);
    head.position.set(side, 0.75, 1.25);
    vehicle.add(head);
    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), tailMat);
    tail.position.set(side * 0.9, 0.7, -1.35);
    vehicle.add(tail);
  }

  const headlight = new THREE.PointLight(0xfff2c0, 0.7, 9);
  headlight.position.set(0, 1, 1.4);
  vehicle.add(headlight);

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
let carrying, money, doneCount, missedCount, daysWithZeroMoney;
let day, dayEarnings, dayDone, dayMissed, upgrades, staff, tasksDone, dayPlan;
let activeOrders, orderIdCounter, running, lastTime, msgTimer, spawnCooldown;
let floatingTexts;
let beaconPhase = 0;
let keys = new Set();

function upgradeValue(key) {
  return upgrades[key] === true;
}
function staffValue(key) {
  return staff[key] === true;
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
function currentSpawnInterval() {
  return staffValue("lagerLead") ? 2.5 : 4;
}
function currentSupplier() {
  return SUPPLIERS.find((s) => s.key === dayPlan.supplier) || SUPPLIERS[0];
}
function currentCustomer() {
  return CUSTOMERS.find((c) => c.key === dayPlan.customer) || CUSTOMERS[0];
}
function missedOrderPenalty() {
  const base = staffValue("indkober") ? 5 : 10;
  return dayPlan.supplier === "cheap" ? Math.round(base * 1.5) : base;
}
function salesMultiplier() {
  return (staffValue("saelger") ? 1.15 : 1) * currentCustomer().rewardMod;
}

function resetRun() {
  money = 0;
  doneCount = 0;
  missedCount = 0;
  day = 0;
  dayEarnings = 0;
  dayDone = 0;
  dayMissed = 0;
  daysWithZeroMoney = 0;
  upgrades = { speed: false, capacity: false, orderSlot: false, deadline: false };
  staff = { lagerLead: false, kontorAssist: false, indkober: false, saelger: false };
  tasksDone = { indkob: false, forhandling: false, jura: false, transport: false, mrp: false };
  dayPlan = { supplier: "reliable", customer: "mixed" };
}

function activeObj() {
  return playerMode === "truck" ? vehicle : character;
}

function startDay() {
  vehicleState = { heading: 0, speed: 0 };
  vehicle.position.set(0, 0, 0);
  vehicle.rotation.y = 0;
  playerMode = "foot";
  character.position.set(3.2, 0, 1.5);
  character.rotation.y = 0;
  footHeading = 0;
  character.visible = true;
  legL.rotation.x = 0;
  legR.rotation.x = 0;
  carrying = [];
  updateCarriedVisual();
  dayEarnings = 0;
  dayDone = 0;
  dayMissed = 0;
  if (staffValue("kontorAssist")) {
    money += 25;
  }
  money = Math.max(0, money - currentSupplier().cost);
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
  const customer = currentCustomer();
  const qty = Math.max(1, Math.round((1 + Math.floor(Math.random() * 3)) * customer.qtyMod));
  const deadline = (14 + qty * 6) * deadlineMultiplier() * customer.deadlineMod;
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
    rewardPerItem: Math.round((25 + qty * 5) * salesMultiplier()),
  });
}

function showMessage(text) {
  messageEl.textContent = text;
  msgTimer = 2.2;
}

function updateCarriedVisual() {
  for (const m of carriedMeshes) {
    if (m.parent) m.parent.remove(m);
  }
  carriedMeshes = [];
  const holder = activeObj();
  const onFoot = playerMode === "foot";
  carrying.forEach((type, i) => {
    const good = GOODS.find((g) => g.type === type);
    const mat = new THREE.MeshStandardMaterial({ color: good.color, roughness: 0.6 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(onFoot ? 0.32 : 0.6, onFoot ? 0.32 : 0.6, onFoot ? 0.32 : 0.6), mat);
    if (onFoot) {
      mesh.position.set(i === 0 ? -0.22 : 0.22, 1.35, 0.24);
    } else {
      mesh.position.set(i === 0 ? -0.25 : 0.25, 0.85, 1.7);
    }
    mesh.castShadow = true;
    holder.add(mesh);
    carriedMeshes.push(mesh);
  });
}

function inZone(zone) {
  const p = activeObj().position;
  return p.x >= zone.zoneMinX && p.x <= zone.zoneMaxX && p.z >= zone.zoneMinZ && p.z <= zone.zoneMaxZ;
}

function activeCapacity() {
  return playerMode === "truck" ? currentCapacity() : 1;
}

function toggleVehicle() {
  if (playerMode === "foot") {
    const dx = character.position.x - vehicle.position.x;
    const dz = character.position.z - vehicle.position.z;
    if (Math.hypot(dx, dz) > 3.2) {
      showMessage("Gå hen til gaffeltrucken for at sætte dig ind i den (E).");
      return;
    }
    playerMode = "truck";
    vehicleState.speed = 0;
    character.visible = false;
    updateCarriedVisual();
    showMessage("Du sidder i gaffeltrucken. Tryk E for at stige ud igen.");
  } else {
    playerMode = "foot";
    const side = vehicleState.heading + Math.PI / 2;
    character.position.set(
      vehicle.position.x + Math.sin(side) * 2.2,
      0,
      vehicle.position.z + Math.cos(side) * 2.2
    );
    character.position.x = Math.max(WORLD_MIN_X, Math.min(WORLD_MAX_X, character.position.x));
    character.position.z = Math.max(WORLD_MIN_Z, Math.min(WORLD_MAX_Z, character.position.z));
    character.rotation.y = vehicleState.heading;
    footHeading = vehicleState.heading;
    character.visible = true;
    updateCarriedVisual();
    showMessage("Du er gået ud af trucken. Tryk E for at sætte dig ind igen.");
  }
  beep(500, 0.1, "triangle");
}

function handleAction() {
  const atShelf = SHELVES.find((s) => inZone(s));
  const atDock = inZone(DOCK);
  const pos = activeObj().position;

  if (atShelf) {
    if (carrying.length >= activeCapacity()) {
      showMessage(playerMode === "foot" ? "Du kan ikke bære mere — sæt dig ind i trucken (E) for at tage flere ad gangen." : "Gaflen er fuld! Kør varerne til lastbilen.");
      return;
    }
    const order = activeOrders.find((o) => o.type === atShelf.type && o.remaining > 0);
    if (!order) {
      showMessage(`Ingen ordre mangler ${atShelf.label.toLowerCase()} lige nu.`);
      return;
    }
    carrying.push(atShelf.type);
    updateCarriedVisual();
    addFloatingText(pos.x, 2.4, pos.z, `+${atShelf.icon}`, "#fff");
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
    addFloatingText(pos.x, 2.4, pos.z, `+${order.rewardPerItem} kr`, "#ffe08a");
    beep(760, 0.12, "sine");
    if (order.remaining <= 0) {
      doneCount += 1;
      dayDone += 1;
      activeOrders = activeOrders.filter((o) => o.id !== order.id);
      spawnConfetti3D(pos.x, pos.z);
      beep(1000, 0.18, "sine", 0.18);
      showMessage("Ordre fuldført! 🎉");
      spawnOrder();
    } else {
      showMessage(`Leveret! +${order.rewardPerItem} kr`);
    }
    return;
  }

  showMessage("Gå/kør hen til en hylde eller lastbilen.");
}

function updateTruck(dt) {
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
  if (keys.has("ArrowLeft") || keys.has("KeyA")) turnInput = 1;
  else if (keys.has("ArrowRight") || keys.has("KeyD")) turnInput = -1;

  if (turnInput !== 0 && Math.abs(vehicleState.speed) > 0.05) {
    const speedFactor = Math.min(1, Math.abs(vehicleState.speed) / maxSpeed) * 0.7 + 0.3;
    const dir = vehicleState.speed >= 0 ? 1 : -1;
    vehicleState.heading += turnInput * 2.6 * speedFactor * dir * dt;
  }

  const targetSteer = turnInput * 0.5;
  const wheelRadius = 0.4;
  const rollDelta = (vehicleState.speed / wheelRadius) * dt;
  for (const w of wheels) {
    w.rollGroup.rotation.x += rollDelta;
    if (w.isFront) {
      w.steerPivot.rotation.y += (targetSteer - w.steerPivot.rotation.y) * Math.min(1, dt * 10);
    }
  }

  vehicle.position.x += Math.sin(vehicleState.heading) * vehicleState.speed * dt;
  vehicle.position.z += Math.cos(vehicleState.heading) * vehicleState.speed * dt;
  vehicle.position.x = Math.max(WORLD_MIN_X, Math.min(WORLD_MAX_X, vehicle.position.x));
  vehicle.position.z = Math.max(WORLD_MIN_Z, Math.min(WORLD_MAX_Z, vehicle.position.z));
  vehicle.rotation.y = vehicleState.heading;

  const speedFrac = Math.min(1, Math.abs(vehicleState.speed) / maxSpeed);
  speedoFillEl.style.width = `${speedFrac * 100}%`;

  if (speedFrac > 0.6 && Math.random() < 0.5) spawnDust();

  beaconPhase += dt * 9;
  if (vehicle.userData.beacon) {
    vehicle.userData.beacon.emissiveIntensity = 0.5 + Math.sin(beaconPhase) * 0.4;
  }

  camera.fov = 60 + speedFrac * 10;
  camera.updateProjectionMatrix();
}

function updateFoot(dt) {
  const footSpeed = 6.5;
  let dx = 0;
  let dz = 0;
  if (keys.has("ArrowUp") || keys.has("KeyW")) dz -= 1;
  if (keys.has("ArrowDown") || keys.has("KeyS")) dz += 1;
  if (keys.has("ArrowLeft") || keys.has("KeyA")) dx -= 1;
  if (keys.has("ArrowRight") || keys.has("KeyD")) dx += 1;

  const moving = dx !== 0 || dz !== 0;
  if (moving) {
    const len = Math.hypot(dx, dz);
    dx /= len;
    dz /= len;
    character.position.x += dx * footSpeed * dt;
    character.position.z += dz * footSpeed * dt;
    footHeading = Math.atan2(dx, dz);
    character.rotation.y = footHeading;
    footPhase += dt * 9;
    const swing = Math.sin(footPhase) * 0.5;
    legL.rotation.x = swing;
    legR.rotation.x = -swing;
  } else {
    legL.rotation.x *= 0.8;
    legR.rotation.x *= 0.8;
  }

  character.position.x = Math.max(WORLD_MIN_X, Math.min(WORLD_MAX_X, character.position.x));
  character.position.z = Math.max(WORLD_MIN_Z, Math.min(WORLD_MAX_Z, character.position.z));

  speedoFillEl.style.width = "0%";
  camera.fov = 62;
  camera.updateProjectionMatrix();
}

function activeHeading() {
  return playerMode === "truck" ? vehicleState.heading : footHeading;
}

function updateCamera(dt) {
  const heading = activeHeading();
  const forward = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));
  const back = playerMode === "truck" ? -11 : -6.5;
  const up = playerMode === "truck" ? 6.5 : 3.6;
  const pos = activeObj().position;
  const desired = pos.clone().addScaledVector(forward, back).add(new THREE.Vector3(0, up, 0));
  camera.position.lerp(desired, Math.min(1, dt * 5));
  const lookTarget = pos.clone().add(new THREE.Vector3(0, 1.2, 0));
  camera.lookAt(lookTarget);
}

function update(dt) {
  if (playerMode === "truck") updateTruck(dt);
  else updateFoot(dt);
  updateCamera(dt);

  spawnCooldown -= dt;
  if (spawnCooldown <= 0 && activeOrders.length < currentMaxOrders()) {
    spawnOrder();
    spawnCooldown = currentSpawnInterval();
  }

  for (const order of activeOrders) order.deadline -= dt;
  const missed = activeOrders.filter((o) => o.deadline <= 0);
  if (missed.length > 0) {
    missedCount += missed.length;
    dayMissed += missed.length;
    money = Math.max(0, money - missed.length * missedOrderPenalty());
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

  if (msgTimer > 0) {
    msgTimer -= dt;
    if (msgTimer <= 0) messageEl.textContent = "";
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
  doneCountEl.textContent = doneCount;

  requestAnimationFrame(loop);
}

function showScreen(name) {
  Object.values(screens).forEach((el) => el.classList.add("hidden"));
  screens[name].classList.remove("hidden");
}

function renderShop() {
  document.getElementById("officeTitle").textContent =
    day === 0 ? "🏢 Kontor — klar til at starte" : `🏢 Kontor — Dag ${day} er slut`;
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
      renderStaff();
    });
  });

  renderStaff();
  renderPlanning();
  for (const key of Object.keys(TASKS)) renderTask(key);
}

const staffListEl = document.getElementById("staffList");
const supplierListEl = document.getElementById("supplierList");
const customerListEl = document.getElementById("customerList");

function renderPlanning() {
  document.getElementById("planDayNum").textContent = day + 1;

  supplierListEl.innerHTML = "";
  for (const s of SUPPLIERS) {
    const card = document.createElement("button");
    card.className = "planCard" + (dayPlan.supplier === s.key ? " selected" : "");
    card.innerHTML = `<div class="planName">${s.icon} ${s.name} — ${s.cost} kr</div><div class="planDesc">${s.desc}</div>`;
    card.addEventListener("click", () => {
      dayPlan.supplier = s.key;
      beep(600, 0.08, "triangle");
      renderPlanning();
    });
    supplierListEl.appendChild(card);
  }

  customerListEl.innerHTML = "";
  for (const c of CUSTOMERS) {
    const card = document.createElement("button");
    card.className = "planCard" + (dayPlan.customer === c.key ? " selected" : "");
    card.innerHTML = `<div class="planName">${c.icon} ${c.name}</div><div class="planDesc">${c.desc}</div>`;
    card.addEventListener("click", () => {
      dayPlan.customer = c.key;
      beep(600, 0.08, "triangle");
      renderPlanning();
    });
    customerListEl.appendChild(card);
  }
}

function renderStaff() {
  document.getElementById("shopMoney").textContent = money;
  staffListEl.innerHTML = "";
  for (const s of STAFF) {
    const hired = staffValue(s.key);
    const card = document.createElement("div");
    card.className = "upgradeCard" + (hired ? " owned" : "");
    card.innerHTML = `
      <div class="upgradeIcon">${s.icon}</div>
      <div class="upgradeName">${s.name}</div>
      <div class="upgradeDesc">${s.desc}</div>
      <button ${hired || money < s.cost ? "disabled" : ""} data-staff="${s.key}">
        ${hired ? "Ansat ✅" : `Ansæt – ${s.cost} kr`}
      </button>
    `;
    staffListEl.appendChild(card);
  }

  staffListEl.querySelectorAll("button[data-staff]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-staff");
      const role = STAFF.find((s) => s.key === key);
      if (staffValue(key) || money < role.cost) return;
      money -= role.cost;
      staff[key] = true;
      beep(880, 0.15, "sine", 0.2);
      renderShop();
      renderStaff();
    });
  });
}

function renderTask(key) {
  const task = TASKS[key];
  const panel = document.getElementById(`panel-${key}`);
  const done = tasksDone[key];

  panel.innerHTML = `
    <h2>${task.icon} ${task.title}</h2>
    <p class="taskScenario">${task.scenario}</p>
    <div class="taskOptions"></div>
  `;

  const optionsEl = panel.querySelector(".taskOptions");
  task.options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.className = "taskOption";
    btn.textContent = opt.text;
    btn.disabled = done;
    if (done && opt.correct) btn.classList.add("correct");
    btn.addEventListener("click", () => {
      if (tasksDone[key]) return;
      optionsEl.querySelectorAll("button").forEach((b) => (b.disabled = true));
      btn.classList.add(opt.correct ? "correct" : "wrong");

      const explain = document.createElement("div");
      explain.className = "taskExplain " + (opt.correct ? "good" : "bad");
      explain.textContent = opt.explain;
      panel.appendChild(explain);

      if (opt.correct) {
        tasksDone[key] = true;
        money += task.reward;
        beep(1000, 0.18, "sine", 0.18);
        renderShop();
        renderStaff();
      } else {
        beep(180, 0.2, "sawtooth", 0.1);
      }
    });
    optionsEl.appendChild(btn);
  });

  if (done) {
    const correctOpt = task.options.find((o) => o.correct);
    const explain = document.createElement("div");
    explain.className = "taskExplain good";
    explain.textContent = correctOpt.explain;
    panel.appendChild(explain);
    const bonus = document.createElement("p");
    bonus.className = "taskDone";
    bonus.textContent = `✅ Løst — I fik ${task.reward} kr i kassen.`;
    panel.appendChild(bonus);
  }
}

document.getElementById("officeMenu").addEventListener("click", (e) => {
  const btn = e.target.closest(".officeNavBtn[data-panel]");
  if (!btn) return;
  document.querySelectorAll(".officeNavBtn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  document.querySelectorAll(".officePanel").forEach((p) => p.classList.add("hidden"));
  document.getElementById(`panel-${btn.dataset.panel}`).classList.remove("hidden");
});

function endDay() {
  running = false;
  if (dayPlan.supplier === "sustainable") {
    money += 30;
    dayEarnings += 30;
  }
  daysWithZeroMoney = money <= 0 ? daysWithZeroMoney + 1 : 0;

  if (daysWithZeroMoney >= 2) {
    endRun(true);
    return;
  }
  saveGame();
  renderShop();
  renderPlanning();
  showScreen("shop");
}

function endRun(bankrupt) {
  const totalOrders = doneCount + missedCount;
  const rate = totalOrders === 0 ? 100 : Math.round((doneCount / totalOrders) * 100);

  document.getElementById("finalDay").textContent = day;
  document.getElementById("finalMoney").textContent = money;
  document.getElementById("finalDone").textContent = doneCount;
  document.getElementById("finalMissed").textContent = missedCount;
  document.getElementById("finalRate").textContent = rate;

  const titleEl = document.getElementById("endTitle");
  const ratingEl = document.getElementById("rating");
  if (bankrupt) {
    titleEl.textContent = "💥 Konkurs!";
    ratingEl.textContent = `I løb tør for penge to dage i træk og måtte lukke virksomheden. I nåede dag ${day}.`;
  } else if (rate >= 80) {
    titleEl.textContent = "🏆 Spillet slut";
    ratingEl.textContent = "🌟 Fantastisk logistikchef!";
  } else if (rate >= 50) {
    titleEl.textContent = "🏆 Spillet slut";
    ratingEl.textContent = "👍 Godt arbejde!";
  } else {
    titleEl.textContent = "🏆 Spillet slut";
    ratingEl.textContent = "💪 Der er plads til forbedring næste gang.";
  }

  clearSave();
  showScreen("end");
}

const SAVE_KEY = "lagerchef_save_v1";

function saveGame() {
  const data = { day, money, doneCount, missedCount, daysWithZeroMoney, upgrades, staff, tasksDone, dayPlan };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) {
    // storage unavailable, ignore
  }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    day = data.day;
    money = data.money;
    doneCount = data.doneCount;
    missedCount = data.missedCount;
    daysWithZeroMoney = data.daysWithZeroMoney || 0;
    upgrades = data.upgrades;
    staff = data.staff;
    tasksDone = data.tasksDone;
    dayPlan = data.dayPlan;
    dayEarnings = 0;
    dayDone = 0;
    dayMissed = 0;
    return true;
  } catch (e) {
    return false;
  }
}

function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (e) {
    // ignore
  }
}

function hasSave() {
  try {
    return !!localStorage.getItem(SAVE_KEY);
  } catch (e) {
    return false;
  }
}

function refreshStartScreen() {
  if (hasSave()) {
    continueGameBtn.classList.remove("hidden");
    saveInfoEl.classList.remove("hidden");
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY));
    saveInfoEl.textContent = `Gemt spil fundet: Dag ${raw.day}, ${raw.money} kr i kassen.`;
  } else {
    continueGameBtn.classList.add("hidden");
    saveInfoEl.classList.add("hidden");
  }
}

initScene();
refreshStartScreen();

startBtn.addEventListener("click", () => {
  resetRun();
  showScreen("shop");
  renderShop();
  renderPlanning();
});

continueGameBtn.addEventListener("click", () => {
  if (!loadGame()) return;
  showScreen("shop");
  renderShop();
  renderPlanning();
});

saveBtn.addEventListener("click", () => {
  saveGame();
  beep(700, 0.1, "sine", 0.15);
  saveBtn.textContent = "✅ Gemt!";
  setTimeout(() => {
    saveBtn.textContent = "💾 Gem spil";
  }, 1200);
});

continueBtn.addEventListener("click", () => {
  day += 1;
  startDay();
});

endDayBtn.addEventListener("click", () => {
  if (running) endDay();
});

restartBtn.addEventListener("click", () => {
  clearSave();
  resetRun();
  showScreen("shop");
  renderShop();
  renderPlanning();
});

window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    if (running) handleAction();
    return;
  }
  if (e.code === "KeyE") {
    if (running) toggleVehicle();
    return;
  }
  keys.add(e.code);
});

window.addEventListener("keyup", (e) => {
  keys.delete(e.code);
});
