const GAME_TIME = 35;
const BLACKOUT_PENALTY = 5;
const TOTAL_MONSTERS = 32;
const SPAWN_DELAY = 650;

const scene = document.getElementById("scene");
const blackout = document.getElementById("blackout");
const blackoutText = document.getElementById("blackoutText");
const timer = document.getElementById("timer");
const questionsBox = document.getElementById("questions");
const submitBtn = document.getElementById("submitBtn");
const retryBtn = document.getElementById("retryBtn");
const startBtn = document.getElementById("startBtn");
const result = document.getElementById("result");

const guideBtn = document.getElementById("guideBtn");
const closeGuideBtn = document.getElementById("closeGuideBtn");
const monsterGuideModal = document.getElementById("monsterGuideModal");
const monsterGuideGrid = document.getElementById("monsterGuideGrid");

let monsters = [];
let counters = {};
let animationId = null;
let gameRunning = false;
let gameEnded = false;
let gameTimerId = null;
let spawnTimerId = null;
let spawnedCount = 0;

let currentSeed = localStorage.getItem("monster-gate-seed");

if (!currentSeed) {
  currentSeed = Date.now().toString();
  localStorage.setItem("monster-gate-seed", currentSeed);
}

let rng = createSeededRandom(Number(currentSeed));

const gates = [
  { id: "red", x: 24, y: 50 },
  { id: "yellow", x: 50, y: 38 },
  { id: "blue", x: 76, y: 50 }
];

const monsterTypes = [
  { id: "monster1", name: "ผีตาหวาน", movement: "ground", idleFrames: 7, moveFrames: 8, frameSpeed: 90 },
  { id: "monster2", name: "ผีไร้หน้า", movement: "ground", idleFrames: 3, moveFrames: 3, frameSpeed: 95 },
  { id: "monster3", name: "สาวสองหน้า", movement: "ground", idleFrames: 12, moveFrames: 12, frameSpeed: 100 },
  { id: "monster4", name: "แมงมุมตาเดียว", movement: "platform", idleFrames: 9, moveFrames: 9, frameSpeed: 95 },
  { id: "monster5", name: "โคมไฟวิญญาณ", movement: "platform", idleFrames: 10, moveFrames: 10, frameSpeed: 105 },
  { id: "monster6", name: "ภูติหิมะ", movement: "flying", idleFrames: 4, moveFrames: 4, frameSpeed: 80 },
  { id: "monster7", name: "ธิดาพิณสวรรค์", movement: "flying", idleFrames: 13, moveFrames: 13, frameSpeed: 90 },
  { id: "monster8", name: "ซาดาโกะ", movement: "flying", idleFrames: 9, moveFrames: 9, frameSpeed: 85 }
];

const questions = [
  { text: "1. มอนสเตอร์เข้าประตูสีแดงกี่ตัว?", key: "redTotal" },
  { text: "2. มอนสเตอร์เข้าประตูสีเหลืองกี่ตัว?", key: "yellowTotal" },
  { text: "3. มอนสเตอร์เข้าประตูสีฟ้ากี่ตัว?", key: "blueTotal" },
  { text: "4. ผีไร้หน้าเข้าประตูสีฟ้ากี่ตัว?", key: "monster2Blue" },
  { text: "5. แมงมุมตาเดียวเข้าประตูสีเหลืองกี่ตัว?", key: "monster4Yellow" },
  { text: "6. ซาดาโกะเข้าประตูสีแดงกี่ตัว?", key: "monster8Red" },
  { text: "7. ผีตาหวานเดินเข้าประตูสีแดงกี่ตัว?", key: "monster1Red" },
  { text: "8. ภูติหิมะเข้าประตูสีฟ้ากี่ตัว?", key: "monster6Blue" },
  { text: "9. สาวสองหน้าเข้าประตูสีแดงกี่ตัว?", key: "monster3Red" },
  { text: "10. ธิดาพิณสวรรค์เข้าประตูสีเหลืองกี่ตัว?", key: "monster7Yellow" }
];

function resetCounters() {
  counters = {
    redTotal: 0,
    yellowTotal: 0,
    blueTotal: 0,
    flyingRed: 0,
    flyingBlue: 0,
    groundYellow: 0,
    monster1Red: 0,
    monster2Blue: 0,
    monster6Blue: 0,
    monster3Red: 0,
    monster8Red: 0,
    monster4Yellow: 0,
    monster7Yellow: 0
  };
}

function createSeededRandom(seed) {
  return function () {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

function random(min, max) {
  return min + rng() * (max - min);
}

function randomInt(min, max) {
  return Math.floor(random(min, max + 1));
}

function pick(arr) {
  return arr[randomInt(0, arr.length - 1)];
}

function framePath(monsterId, state, index) {
  return `images/${monsterId}/${state}/${index}.png`;
}

function buildFrames(type, state) {
  const count = state === "idle" ? type.idleFrames : type.moveFrames;
  const frames = [];

  for (let i = 0; i < count; i++) {
    frames.push(framePath(type.id, state, i));
  }

  return frames;
}

function initGame() {
  rng = createSeededRandom(Number(currentSeed));

  monsters = [];
  spawnedCount = 0;
  resetCounters();

  gameRunning = false;
  gameEnded = false;

  if (gameTimerId) clearInterval(gameTimerId);
  if (spawnTimerId) clearInterval(spawnTimerId);

  result.textContent = "";
  scene.querySelectorAll(".monster").forEach(el => el.remove());
  questionsBox.innerHTML = "";

  createQuestions();

  blackout.classList.remove("hidden");
  blackoutText.textContent = "กดเริ่มเกม";
  questionsBox.classList.add("hidden");
  submitBtn.classList.add("hidden");
  retryBtn.classList.add("hidden");
  startBtn.classList.remove("hidden");

  submitBtn.disabled = false;
  retryBtn.disabled = false;

  if (animationId) cancelAnimationFrame(animationId);
  animationId = requestAnimationFrame(animateMonsters);

  timer.textContent = "พร้อมเริ่ม";
}

function getStartPosition(targetGate) {
  const side = randomInt(0, 3);

  if (side === 0) {
    return { x: -12, y: random(25, 75) };
  }

  if (side === 1) {
    return { x: 112, y: random(25, 75) };
  }

  if (side === 2) {
    return { x: random(5, 95), y: -22 };
  }

  return { x: random(5, 95), y: 112 };
}

function spawnMonster() {
  if (!gameRunning || gameEnded) return;
  if (spawnedCount >= TOTAL_MONSTERS) return;

  spawnedCount++;

  const type = pick(monsterTypes);
  const targetGate = pick(gates);
  const start = getStartPosition(targetGate);

  const sizeRoll = rng();
  let size = "normal";
  if (sizeRoll < 0.22) size = "small";
  if (sizeRoll > 0.82) size = "large";

  const idleFrames = buildFrames(type, "idle");
  const moveFrames = buildFrames(type, "move");

  const monster = {
    id: monsters.length,
    monsterType: type.id,
    movement: type.movement,
    size,

    x: start.x,
    y: start.y,
    targetX: targetGate.x,
    targetY: targetGate.y,
    targetGate: targetGate.id,

    speed: type.movement === "flying"
      ? random(0.13, 0.23)
      : random(0.09, 0.17),

    active: true,
    enteringGate: false,
    opacity: 1,
    scale: 1,

    state: "move",
    frameIndex: 0,
    lastFrameTime: 0,
    frameSpeed: type.frameSpeed + randomInt(-25, 30),

    idleFrames,
    moveFrames
  };

  monsters.push(monster);

  const el = document.createElement("div");
  el.className = `monster ${size}`;

  const img = document.createElement("img");
  img.className = "monster-img";
  img.src = moveFrames[0];

  el.appendChild(img);
  scene.appendChild(el);

  monster.el = el;
  monster.img = img;
}

function updateMonsterFrame(m, time) {
  const frames = m.state === "idle" ? m.idleFrames : m.moveFrames;

  if (time - m.lastFrameTime > m.frameSpeed) {
    m.frameIndex = (m.frameIndex + 1) % frames.length;
    m.img.src = frames[m.frameIndex];
    m.lastFrameTime = time;
  }
}


function countGate(m) {
  if (m.targetGate === "red") {
    counters.redTotal++;
    if (m.movement === "flying") counters.flyingRed++;
    if (m.monsterType === "monster1") counters.monster1Red++;
    if (m.monsterType === "monster3") counters.monster3Red++;
    if (m.monsterType === "monster8") counters.monster8Red++;
  }

  if (m.targetGate === "yellow") {
    counters.yellowTotal++;
    if (m.movement === "monster4") counters.monster4Yellow++;
    if (m.monsterType === "monster7") counters.monster7Yellow++;
  }

  if (m.targetGate === "blue") {
    counters.blueTotal++;
    if (m.movement === "monster2") counters.monster2Blue++;
    if (m.monsterType === "monster6") counters.monster6Blue++;
  }
}

function moveTowardGate(m, time, dt) {
  const dx = m.targetX - m.x;
  const dy = m.targetY - m.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 2.2 && !m.enteringGate) {
    m.enteringGate = true;
    countGate(m);
  }

  if (!m.enteringGate) {
    const wave = m.movement === "flying"
      ? Math.sin(time * 0.005 + m.id) * 0.03
      : 0;

    m.x += (dx / dist) * m.speed * dt;
    m.y += ((dy / dist) * m.speed + wave) * dt;
  } else {
    m.opacity -= 0.035;
    m.scale -= 0.018;

    if (m.opacity <= 0 || m.scale <= 0.1) {
      m.active = false;
      m.el.style.display = "none";
    }
  }
}

function animateMonsters(time) {
  if (!animateMonsters.lastTime) {
    animateMonsters.lastTime = time;
  }

  let delta = time - animateMonsters.lastTime;
  animateMonsters.lastTime = time;

  // กันตอนกลับมาจากสลับจอแล้ว delta ใหญ่มากเกินไป
  delta = Math.min(delta, 6000);
  const dt = delta / 16.67;
  monsters.forEach(m => {
    if (!m.active) return;

    updateMonsterFrame(m, time);

    if (gameRunning && !gameEnded) {
      moveTowardGate(m, time, dt);
    }

    const flip = m.x > m.targetX ? -1 : 1;

    m.el.style.left = m.x + "%";
    m.el.style.top = m.y + "%";
    m.el.style.opacity = m.opacity;
    m.el.style.transform = `translate(-50%, -50%) scaleX(${flip}) scale(${m.scale})`;
  });

  animationId = requestAnimationFrame(animateMonsters);
}

function createQuestions() {
  questions.forEach(q => {
    const div = document.createElement("div");
    div.className = "question";

    div.innerHTML = `
      <label>${q.text}</label>
      <input type="number" min="0" data-key="${q.key}" placeholder="ใส่จำนวน" />
    `;

    questionsBox.appendChild(div);
  });
}

function startGame() {
  resetCounters();
  spawnedCount = 0;
  monsters = [];
  scene.querySelectorAll(".monster").forEach(el => el.remove());

  gameRunning = true;
  gameEnded = false;

  blackout.classList.add("hidden");
  questionsBox.classList.add("hidden");
  submitBtn.classList.add("hidden");
  retryBtn.classList.add("hidden");
  startBtn.classList.add("hidden");
  result.textContent = "";

  spawnMonster();

  spawnTimerId = setInterval(() => {
    spawnMonster();

    if (spawnedCount >= TOTAL_MONSTERS) {
      clearInterval(spawnTimerId);
      spawnTimerId = null;
    }
  }, SPAWN_DELAY);

  let timeLeft = GAME_TIME;
  timer.textContent = `กำลังนับ: ${timeLeft}`;

  gameTimerId = setInterval(() => {
    timeLeft--;
    timer.textContent = `กำลังนับ: ${timeLeft}`;

    if (timeLeft <= 0) {
      clearInterval(gameTimerId);
      gameTimerId = null;
      endGame();
    }
  }, 1000);
}

function endGame() {
  gameRunning = false;
  gameEnded = true;

  if (spawnTimerId) {
    clearInterval(spawnTimerId);
    spawnTimerId = null;
  }

  blackout.classList.remove("hidden");
  blackoutText.textContent = "หมดเวลา! ตอบคำถาม";
  questionsBox.classList.remove("hidden");
  submitBtn.classList.remove("hidden");
  retryBtn.classList.remove("hidden");
  timer.textContent = "กำลังตอบคำถาม";

  console.log("เฉลยสำหรับคนทำเกม:", counters);
}

function checkAnswers() {
  const inputs = questionsBox.querySelectorAll("input");
  let score = 0;
  let answeredAll = true;

  inputs.forEach(input => {
    if (input.value.trim() === "") {
      answeredAll = false;
      return;
    }

    const key = input.dataset.key;
    const userAnswer = Number(input.value);

    if (userAnswer === counters[key]) {
      score++;
    }
  });

  if (!answeredAll) {
    result.textContent = "ต้องตอบให้ครบทั้ง 10 ข้อก่อนครับ";
    result.style.color = "#facc15";
    return;
  }

  if (score === questions.length) {
    result.textContent = "ผ่าน! ถูกครบ 10/10";
    result.style.color = "#22c55e";
    blackoutText.textContent = "YOU WIN!";
  } else {
    result.textContent = `ยังไม่ผ่าน ถูก ${score}/10`;
    result.style.color = "#f87171";
    penaltyBlackout();
  }
}

function createMonsterGuide() {
  monsterGuideGrid.innerHTML = "";

  monsterTypes.forEach(type => {
    const card = document.createElement("div");
    card.className = "monster-guide-card";

    card.innerHTML = `
      <img src="images/${type.id}/idle/0.png" alt="${type.name}">
      <div>${type.name}</div>
    `;

    monsterGuideGrid.appendChild(card);
  });
}

function penaltyBlackout() {
  submitBtn.disabled = true;
  retryBtn.disabled = true;

  let timeLeft = BLACKOUT_PENALTY;
  blackout.classList.remove("hidden");
  blackoutText.textContent = `ตอบผิด! จอมืด ${timeLeft} วินาที`;

  const interval = setInterval(() => {
    timeLeft--;
    blackoutText.textContent = `ตอบผิด! จอมืด ${timeLeft} วินาที`;

    if (timeLeft <= 0) {
      clearInterval(interval);
      blackoutText.textContent = "ตอบต่อได้ หรือ เล่นฉากใหม่อีกรอบได้";
      submitBtn.disabled = false;
      retryBtn.disabled = false;
    }
  }, 1000);
}

startBtn.addEventListener("click", startGame);
submitBtn.addEventListener("click", checkAnswers);

retryBtn.addEventListener("click", () => {
  initGame();
  startGame();
});

initGame();
guideBtn.addEventListener("click", () => {
  createMonsterGuide();
  monsterGuideModal.classList.remove("hidden");
});

closeGuideBtn.addEventListener("click", () => {
  monsterGuideModal.classList.add("hidden");
});

monsterGuideModal.addEventListener("click", (e) => {
  if (e.target === monsterGuideModal) {
    monsterGuideModal.classList.add("hidden");
  }
});