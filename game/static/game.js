/* ═══════════════════════════════════════════════════════════════
   آروبازی — نسخه جاده سربالایی، بدون لوگو، با موانع فرسوده
   Vanilla JS + Canvas 2D — no libraries
═══════════════════════════════════════════════════════════════ */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gameWrapper = document.getElementById('gameWrapper');
const W = 440, H = 290;
let DPR = 1;

function isPortraitPhone() {
  return window.matchMedia('(orientation: portrait) and (max-width: 900px)').matches;
}

function shouldRotateGame() {
  const el = document.documentElement;
  return isPortraitPhone() && (
    el.classList.contains('phase-playing') ||
    el.classList.contains('phase-countdown')
  );
}

function updatePortraitMode() {
  document.documentElement.classList.toggle('portrait-rotate', shouldRotateGame());
}

function fitGameWrapper() {
  updatePortraitMode();
  const viewport = window.visualViewport;
  let viewportWidth = viewport ? viewport.width : window.innerWidth;
  let viewportHeight = viewport ? viewport.height : window.innerHeight;
  const bodyStyle = getComputedStyle(document.body);
  let horizontalPadding = parseFloat(bodyStyle.paddingLeft) + parseFloat(bodyStyle.paddingRight);
  let verticalPadding = parseFloat(bodyStyle.paddingTop) + parseFloat(bodyStyle.paddingBottom);
  if (shouldRotateGame()) {
    [viewportWidth, viewportHeight] = [viewportHeight, viewportWidth];
    horizontalPadding = 0;
    verticalPadding = 0;
  }
  const availableWidth = Math.max(1, viewportWidth - horizontalPadding);
  const availableHeight = Math.max(1, viewportHeight - verticalPadding);
  gameWrapper.style.width = `${Math.min(availableWidth, availableHeight * W / H)}px`;
}

function setupCanvasDPR() {
  fitGameWrapper();
  const rect = gameWrapper.getBoundingClientRect();
  DPR = Math.min(window.devicePixelRatio || 1, 2.5);
  const renderScale = Math.min((rect.width / W) * DPR, 4);
  canvas.width = Math.max(W, Math.round(W * renderScale));
  canvas.height = Math.max(H, Math.round(H * renderScale));
  ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
}
setupCanvasDPR();

const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const scoreHUD = document.getElementById('scoreHUD');
const scoreValEl = document.getElementById('scoreVal');
const levelValEl = document.getElementById('levelVal');
const finalScoreEl = document.getElementById('finalScore');
const bestScoreEl = document.getElementById('bestScore');

const bgMusic = document.getElementById('bgMusic');
bgMusic.volume = 0.45;

// iPhone Safari helpers: prevent page bounce, double-tap zoom, and accidental selection.
document.addEventListener('gesturestart', e => e.preventDefault(), { passive: false });
document.addEventListener('gesturechange', e => e.preventDefault(), { passive: false });
document.addEventListener('gestureend', e => e.preventDefault(), { passive: false });
let lastTouchEnd = 0;
document.addEventListener('touchend', e => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) e.preventDefault();
  lastTouchEnd = now;
}, { passive: false });
window.addEventListener('orientationchange', () => {
  setTimeout(() => {
    setupCanvasDPR();
    BUS.y = getRoadY(BUS.x);
    draw();
  }, 350);
});
window.matchMedia('(orientation: portrait)').addEventListener('change', () => {
  setupCanvasDPR();
  if (!gameRunning) {
    BUS.y = getRoadY(BUS.x);
    draw();
  }
});
window.addEventListener('resize', () => {
  setupCanvasDPR();
  if (!gameRunning) {
    BUS.y = getRoadY(BUS.x);
    draw();
  }
});
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => {
    setupCanvasDPR();
    if (!gameRunning) {
      BUS.y = getRoadY(BUS.x);
      draw();
    }
  });
}

function playBackgroundMusic() {
  if (!bgMusic) return;
  if (typeof window.isMusicEnabled === 'function' && !window.isMusicEnabled()) return;
  bgMusic.currentTime = 0;
  const playPromise = bgMusic.play();
  if (playPromise !== undefined) {
    playPromise.catch(() => {
      // بعضی مرورگرها فقط بعد از تعامل کاربر اجازه پخش صدا می‌دهند.
    });
  }
}

function pauseBackgroundMusic() {
  if (!bgMusic) return;
  bgMusic.pause();
}

document.getElementById('startBtn').addEventListener('click', () => startGame());
document.getElementById('restartBtn').addEventListener('click', () => startGame());

const wizardSteps = document.querySelectorAll('.wizard-step');
const stepDots = document.querySelectorAll('.step-dot');
const prevStepBtn = document.getElementById('prevStepBtn');
const nextStepBtn = document.getElementById('nextStepBtn');
const startBtn = document.getElementById('startBtn');

const colorChoiceButtons = document.querySelectorAll('[data-bus-color]');
const busModelChoiceButtons = document.querySelectorAll('[data-bus-model]');
const rimChoiceButtons = document.querySelectorAll('[data-rim]');
const weatherChoiceButtons = document.querySelectorAll('[data-weather]');
const biomeChoiceButtons = document.querySelectorAll('[data-biome]');
let currentStep = 0;
let selectedBusColor = 'yellow';
let selectedBusModel = 'man';
let selectedRimType = 'sport';
let selectedWeather = 'clear';
let selectedBiome = 'sea';

const BUS_THEMES = {
  yellow:     { body: '#FFD200', roof: '#E8B800', skirt: '#D4A000', front: '#F0C200', windowFrame: '#D4A000', door: '#CC9900', doorLine: '#aa7700', accent: '#12327f' },
  burgundy:   { body: '#7A1F31', roof: '#631728', skirt: '#4E101F', front: '#8B273A', windowFrame: '#541320', door: '#6C1A2B', doorLine: '#2C0812', accent: '#F6D5A7' },
  pink:       { body: '#FF77B7', roof: '#E34B93', skirt: '#C82E78', front: '#F05FA5', windowFrame: '#B7256E', door: '#D93D88', doorLine: '#941958', accent: '#12327f' },
  pistachio:  { body: '#9CCB84', roof: '#80AF6A', skirt: '#6A9155', front: '#8DBB75', windowFrame: '#678C53', door: '#779F61', doorLine: '#4C6B3C', accent: '#20405A' },
  navy:       { body: '#17274F', roof: '#0E1A36', skirt: '#0A1227', front: '#223668', windowFrame: '#0A1431', door: '#1B2D58', doorLine: '#475A8B', accent: '#FFD200' },
  black:      { body: '#171A24', roof: '#0B0D14', skirt: '#070910', front: '#242838', windowFrame: '#0B0D14', door: '#262B3C', doorLine: '#596070', accent: '#FFD200' },
};

const BUS_MODEL_STYLES = {
  man:          { label: 'MAN', accent: '#111826' },
  'benz-modern':{ label: 'BENZ', accent: '#d6dce7' },
  scania:       { label: 'SCANIA', accent: '#cf1f25' },
  volvo:        { label: 'VOLVO', accent: '#7fd1ff' },
  yutang:       { label: 'YUTANG', accent: '#ffe7f2' },
  'benz-classic': { label: 'BENZ', accent: '#e1e5ec' },
};

function repaintIdleBus() {
  if (!gameRunning) {
    BUS.y = getRoadY(BUS.x);
    draw();
  }
}

function updateWizardStep() {
  wizardSteps.forEach((step, idx) => step.classList.toggle('active', idx === currentStep));
  stepDots.forEach((dot, idx) => dot.classList.toggle('active', idx === currentStep));
  prevStepBtn.classList.toggle('hidden', currentStep === 0);
  nextStepBtn.classList.toggle('hidden', currentStep === wizardSteps.length - 1);
  startBtn.classList.toggle('hidden', currentStep !== wizardSteps.length - 1);
}

prevStepBtn.addEventListener('click', () => {
  currentStep = Math.max(0, currentStep - 1);
  updateWizardStep();
});
nextStepBtn.addEventListener('click', () => {
  currentStep = Math.min(wizardSteps.length - 1, currentStep + 1);
  updateWizardStep();
});

colorChoiceButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    selectedBusColor = btn.dataset.busColor;
    colorChoiceButtons.forEach(b => b.classList.toggle('active', b === btn));
    repaintIdleBus();
  });
});
busModelChoiceButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    selectedBusModel = btn.dataset.busModel;
    busModelChoiceButtons.forEach(b => b.classList.toggle('active', b === btn));
    repaintIdleBus();
  });
});
rimChoiceButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    selectedRimType = btn.dataset.rim;
    rimChoiceButtons.forEach(b => b.classList.toggle('active', b === btn));
    repaintIdleBus();
  });
});
weatherChoiceButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    selectedWeather = btn.dataset.weather;
    weatherChoiceButtons.forEach(b => b.classList.toggle('active', b === btn));
    repaintIdleBus();
  });
});
biomeChoiceButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    selectedBiome = btn.dataset.biome;
    biomeChoiceButtons.forEach(b => b.classList.toggle('active', b === btn));
    repaintIdleBus();
  });
});
updateWizardStep();

let bestScore = 0;
let gameRunning = false;
let score = 0;
const BASE_SPEED = 4.1;
const SIMULATION_STEP_MS = 1000 / 60;
const MAX_FRAME_GAP_MS = 100;
let speed = BASE_SPEED;
let frameCount = 0;
let animId = null;
let lastFrameTime = 0;
let simulationAccumulator = 0;
let wheelAngle = 0;
let roadOffset = 0;
let shakeFrames = 0, shakeMag = 0;
let jumpCount = 0;
let level = 1;
const JUMPS_PER_LEVEL = 30;
let levelBannerFrames = 0;
let levelBannerText = '';

const BASE_GROUND_Y = H - 62;
const BUS = { x: 58, y: BASE_GROUND_Y, w: 88, h: 46, vy: 0, jumping: false, jumpForce: -12.3, gravity: 0.58 };
let obstacles = [];
let nextObstacleIn = 90;
let particles = [];

const clouds = [
  { x: 60, y: 28, sc: 1.0, op: 0.18, sp: 0.08 },
  { x: 180, y: 18, sc: 0.7, op: 0.12, sp: 0.12 },
  { x: 310, y: 34, sc: 1.2, op: 0.20, sp: 0.07 },
  { x: 420, y: 22, sc: 0.8, op: 0.14, sp: 0.10 },
];

const DASH_W = 44, DASH_H = 5, DASH_GAP = 32, DASH_TOTAL = DASH_W + DASH_GAP;
const NUM_DASHES = Math.ceil(W / DASH_TOTAL) + 4;
const dashes = [];
for (let i = 0; i < NUM_DASHES; i++) dashes.push({ x: i * DASH_TOTAL });

function toFaNumber(value) {
  return String(value).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
}
function showLevelBanner(newLevel) {
  levelBannerText = 'مرحله ' + toFaNumber(newLevel);
  levelBannerFrames = 105;
}
function syncHud() {
  scoreValEl.textContent = toFaNumber(score);
  levelValEl.textContent = toFaNumber(level);
}

function getRoadY(x) {
  // roadOffset makes the uphill/downhill road scroll while the bus stays visually fixed.
  const worldX = x + roadOffset;
  return BASE_GROUND_Y + Math.sin(worldX / 88) * 14 + Math.sin(worldX / 41) * 5;
}
function getRoadSlope(x) {
  return Math.atan2(getRoadY(x + 12) - getRoadY(x - 12), 24);
}

function tryJump() {
  if (!gameRunning) return;
  if (!BUS.jumping) {
    BUS.vy = BUS.jumpForce;
    BUS.jumping = true;
    jumpCount++;

    const newLevel = Math.floor(jumpCount / JUMPS_PER_LEVEL) + 1;
    if (newLevel !== level) {
      level = newLevel;
      showLevelBanner(level);
      // A tiny satisfying shake on level-up, much softer than crash shake.
      shakeFrames = 6;
      shakeMag = 2.2;
    }

    syncHud();
    spawnDust(BUS.x + BUS.w * 0.35, BUS.y, 6 + Math.min(level, 6));
  }
}
document.addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); tryJump(); } });
canvas.addEventListener('click', () => tryJump());
canvas.addEventListener('touchstart', e => { e.preventDefault(); tryJump(); }, { passive: false });
document.getElementById('gameWrapper').addEventListener('touchstart', () => tryJump(), { passive: true });

function spawnDust(x, y, count) {
  for (let i = 0; i < count; i++) particles.push({
    x, y, vx: (Math.random() - 0.75) * 2.7, vy: -(Math.random() * 2 + 0.4),
    life: 1, r: Math.random() * 5 + 2
  });
}
function updateParticles() {
  particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.life -= 0.045; });
  particles = particles.filter(p => p.life > 0);
}
function drawParticles() {
  particles.forEach(p => {
    ctx.globalAlpha = p.life * 0.6;
    ctx.fillStyle = '#c8aa60';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function startGame() {
  score = 0;
  speed = BASE_SPEED;
  frameCount = 0;
  lastFrameTime = performance.now();
  simulationAccumulator = 0;
  roadOffset = 0;
  obstacles = [];
  particles = [];
  shakeFrames = 0;
  jumpCount = 0;
  level = 1;
  levelBannerFrames = 85;
  levelBannerText = 'مرحله ۱';
  nextObstacleIn = 90;
  wheelAngle = 0;
  BUS.y = getRoadY(BUS.x);
  BUS.vy = 0;
  BUS.jumping = false;
  clouds.forEach((c, i) => { c.x = [60, 200, 340, 440][i] ?? i * 110; });
  dashes.forEach((d, i) => { d.x = i * DASH_TOTAL; });
  startScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  scoreHUD.classList.remove('hidden');
  syncHud();
  gameRunning = true;
  playBackgroundMusic();
  if (animId) cancelAnimationFrame(animId);
  draw();
  animId = requestAnimationFrame(loop);
}

function endGame() {
  gameRunning = false;
  pauseBackgroundMusic();
  shakeFrames = 12;
  shakeMag = 6;
  if (score > bestScore) bestScore = score;
  finalScoreEl.textContent = toFaNumber(score);
  bestScoreEl.textContent = toFaNumber(bestScore);
  scoreHUD.classList.add('hidden');
  setTimeout(() => { gameOverScreen.classList.remove('hidden'); draw(); }, 300);
}

function spawnObstacle() {
  // Higher stages prefer bigger and more annoying obstacles.
  let pool = ['wreckCar', 'brokenVan', 'tireStack', 'roadBlock', 'fallenSign', 'oilSpill', 'pothole'];
  if (level >= 2) pool.push('wreckCar', 'wreckBus', 'brokenVan', 'roadBlock');
  if (level >= 3) pool.push('wreckBus', 'wreckBus', 'oilSpill', 'pothole', 'fallenSign');
  if (level >= 4) pool.push('wreckBus', 'wreckCar', 'roadBlock', 'brokenVan', 'tireStack');
  if (level >= 5) pool.push('wreckBus', 'wreckBus', 'wreckCar', 'oilSpill', 'pothole');

  const type = pool[Math.floor(Math.random() * pool.length)];
  const sizeBoost = Math.min(1 + (level - 1) * 0.025, 1.16);
  const sizes = {
    wreckCar:  { w: 50, h: 28 },
    wreckBus:  { w: 68, h: 38 },
    brokenVan: { w: 56, h: 32 },
    tireStack: { w: 28, h: 34 },
    roadBlock: { w: 44, h: 30 },
    fallenSign:{ w: 38, h: 32 },
    oilSpill:  { w: 50, h: 12 },
    pothole:   { w: 48, h: 10 },
  };
  const s = sizes[type];
  obstacles.push({
    x: W + 20,
    w: Math.round(s.w * sizeBoost),
    h: Math.round(s.h * sizeBoost),
    type,
    wobble: Math.random() * Math.PI * 2
  });

  // As stages go up: gaps get shorter and randomness gets tighter.
  const levelPenalty = (level - 1) * 9;
  const scorePenalty = score * 0.08;
  const minGap = Math.max(48, 114 - levelPenalty - scorePenalty);
  const randomGap = Math.max(24, 56 - (level - 1) * 3);
  nextObstacleIn = Math.floor(Math.random() * randomGap + minGap);
}

function checkCollision(obs) {
  const ground = getRoadY(obs.x + obs.w / 2);
  let obsTop = ground - obs.h;
  let obsBottom = ground;
  let obsLeft = obs.x;
  let obsRight = obs.x + obs.w;

  // Flat hazards have lower hit boxes, but still count if the bus lands on them.
  if (obs.type === 'pothole' || obs.type === 'oilSpill') {
    obsTop = ground - Math.max(14, obs.h);
    obsBottom = ground + 2;
    obsLeft += 4;
    obsRight -= 4;
  }

  const bx1 = BUS.x + 14;
  const by1 = BUS.y - BUS.h + 9;
  const bx2 = BUS.x + BUS.w - 11;
  const by2 = BUS.y - 7;
  const ox1 = obsLeft + 5;
  const oy1 = obsTop + Math.min(8, obs.h * 0.25);
  const ox2 = obsRight - 5;
  const oy2 = obsBottom - 3;
  return bx1 < ox2 && bx2 > ox1 && by1 < oy2 && by2 > oy1;
}

function update() {
  frameCount++;
  if (frameCount % 6 === 0) { score++; syncHud(); }
  speed = BASE_SPEED + score * 0.001 + (level - 1) * 0.1;
  wheelAngle += speed * 0.06;
  roadOffset += speed;

  const groundAtBus = getRoadY(BUS.x);
  BUS.vy += BUS.gravity;
  BUS.y += BUS.vy;
  if (BUS.y >= groundAtBus) {
    if (BUS.jumping) spawnDust(BUS.x + BUS.w * 0.35, groundAtBus, 5);
    BUS.y = groundAtBus;
    BUS.vy = 0;
    BUS.jumping = false;
  }

  nextObstacleIn--;
  if (nextObstacleIn <= 0) spawnObstacle();
  obstacles.forEach(obs => obs.x -= speed);
  obstacles = obstacles.filter(obs => obs.x + obs.w > -25);
  for (const obs of obstacles) { if (checkCollision(obs)) { endGame(); return; } }

  clouds.forEach(c => { c.x -= speed * c.sp; if (c.x + c.sc * 80 < 0) c.x = W + 60; });
  dashes.forEach(d => { d.x -= speed; if (d.x + DASH_W < -10) d.x += NUM_DASHES * DASH_TOTAL; });
  updateParticles();
  if (shakeFrames > 0) shakeFrames--;
  if (levelBannerFrames > 0) levelBannerFrames--;
}

function rr(x, y, w, h, r, color) {
  if (typeof r === 'number') r = [r, r, r, r];
  ctx.beginPath();
  ctx.moveTo(x + r[0], y);
  ctx.lineTo(x + w - r[1], y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r[1]);
  ctx.lineTo(x + w, y + h - r[2]);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r[2], y + h);
  ctx.lineTo(x + r[3], y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r[3]);
  ctx.lineTo(x, y + r[0]);
  ctx.quadraticCurveTo(x, y, x + r[0], y);
  ctx.closePath();
  if (color !== undefined) { ctx.fillStyle = color; ctx.fill(); }
}


function mix(a, b, t) { return a + (b - a) * t; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}
function lerpColor(a, b, t) {
  const ca = hexToRgb(a), cb = hexToRgb(b);
  return `rgb(${Math.round(mix(ca.r, cb.r, t))}, ${Math.round(mix(ca.g, cb.g, t))}, ${Math.round(mix(ca.b, cb.b, t))})`;
}
function getDayCycle() {
  // From the start of stage 1 to the start of stage 2, the world gradually shifts
  // from bright day to full night. From stage 2 onward it stays night.
  const stageProgress = level >= 2 ? 1 : clamp(jumpCount / JUMPS_PER_LEVEL, 0, 1);
  const t = easeInOut(stageProgress);

  const top = lerpColor('#67bbff', '#101938', t);
  const bottom = lerpColor('#e1f4ff', '#1b2f58', t);
  const horizon = lerpColor('#ffe1ad', '#27416b', t);
  const dayAmount = mix(1, 0.06, t);
  const nightAmount = t;
  const cloudTint = lerpColor('#ffffff', '#8ea6ca', t);

  // Sun fades toward sunset as night arrives, moon rises in.
  const sunX = mix(92, 310, t);
  const sunY = mix(58, 102, t);
  const sunAlpha = mix(0.98, 0.0, t);
  const moonX = mix(300, 348, t);
  const moonY = mix(96, 56, t);
  const moonAlpha = mix(0.0, 0.92, t);

  return {
    p: stageProgress,
    top,
    bottom,
    horizon,
    dayAmount: clamp(dayAmount, 0, 1),
    nightAmount: clamp(nightAmount, 0, 1),
    cloudTint,
    sunX,
    sunY,
    sunAlpha,
    moonX,
    moonY,
    moonAlpha
  };
}

function drawSky() {
  const cycle = getDayCycle();
  const g = ctx.createLinearGradient(0, 0, 0, BASE_GROUND_Y + 30);
  g.addColorStop(0, cycle.top);
  g.addColorStop(0.55, cycle.bottom);
  g.addColorStop(1, cycle.horizon);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Soft horizon glow, warmer at morning/evening, cooler at day.
  ctx.globalAlpha = 0.32 + (1 - cycle.nightAmount) * 0.08;
  const hg = ctx.createLinearGradient(0, 130, 0, 230);
  hg.addColorStop(0, 'rgba(255,255,255,0)');
  hg.addColorStop(1, cycle.nightAmount > 0.65 ? 'rgba(100,130,200,0.22)' : 'rgba(255,215,145,0.34)');
  ctx.fillStyle = hg;
  ctx.fillRect(0, 120, W, 120);
  ctx.globalAlpha = 1;
}

const stars = Array.from({ length: 32 }, () => ({ x: Math.random() * W, y: Math.random() * BASE_GROUND_Y * 0.60, r: Math.random() * 1.4 + 0.3, b: Math.random() }));
function drawSunAndMoon() {
  const cycle = getDayCycle();
  if (cycle.sunAlpha > 0.01) {
    ctx.save();
    ctx.globalAlpha = cycle.sunAlpha;
    const sg = ctx.createRadialGradient(cycle.sunX, cycle.sunY, 6, cycle.sunX, cycle.sunY, 30);
    sg.addColorStop(0, 'rgba(255,249,215,0.98)');
    sg.addColorStop(0.42, 'rgba(255,224,128,0.95)');
    sg.addColorStop(1, 'rgba(255,224,128,0)');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(cycle.sunX, cycle.sunY, 29, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  if (cycle.moonAlpha > 0.01) {
    ctx.save();
    ctx.globalAlpha = cycle.moonAlpha;
    ctx.fillStyle = 'rgba(246,248,255,0.95)';
    ctx.beginPath(); ctx.arc(cycle.moonX, cycle.moonY, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = cycle.top;
    ctx.beginPath(); ctx.arc(cycle.moonX + 5, cycle.moonY - 2, 11, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}
function drawStars(t) {
  const cycle = getDayCycle();
  const scene = getSceneConfig();
  const visibility = clamp(cycle.nightAmount * 1.1, 0, 1);
  if (visibility < 0.02 || scene.weather !== 'stars') return;
  stars.forEach(s => {
    const pulse = 0.35 + 0.65 * Math.abs(Math.sin(t * 0.015 + s.b * 6));
    ctx.globalAlpha = pulse * (0.18 + visibility * 0.82);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}
function drawCloud(c) {
  const cycle = getDayCycle();
  const { x, y, sc, op } = c;
  const tint = cycle.cloudTint;
  ctx.globalAlpha = mix(op * 0.25, op, cycle.dayAmount);
  ctx.fillStyle = tint;
  const puffs = [[x, y, sc * 22], [x + sc * 20, y + sc * 6, sc * 16], [x - sc * 16, y + sc * 8, sc * 14], [x + sc * 8, y - sc * 8, sc * 16], [x + sc * 36, y + sc * 4, sc * 12]];
  ctx.beginPath();
  puffs.forEach(([px, py, pr]) => { ctx.moveTo(px + pr, py); ctx.arc(px, py, pr, 0, Math.PI * 2); });
  ctx.fill();
  ctx.globalAlpha = 1;
}
function drawMountains() {
  const cycle = getDayCycle();
  ctx.globalAlpha = 0.24 + cycle.nightAmount * 0.16;
  ctx.fillStyle = cycle.nightAmount > 0.55 ? '#15223f' : '#6d7fa5';
  ctx.beginPath();
  ctx.moveTo(0, 175);
  for (let x = 0; x <= W + 30; x += 32) {
    const y = 158 + Math.sin((x + roadOffset * 0.22) / 62) * 12 + Math.cos((x + roadOffset * 0.12) / 38) * 5;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

const SKYLINE_BUILDINGS = Array.from({ length: 16 }, (_, i) => ({
  x: i * 34,
  w: 16 + (i % 4) * 5,
  h: 22 + ((i * 9) % 4) * 10 + (i % 3) * 4
}));
const LANDMARKS = [
  { x: 90, type: 'azadi', scale: 1.06 },
  { x: 280, type: 'milad', scale: 1.05 },
  { x: 500, type: 'zayandehrud', scale: 1.04 },
  { x: 720, type: 'hafezieh', scale: 1.02 },
  { x: 940, type: 'takhtejamshid', scale: 1.00 },
  { x: 1175, type: 'cyrus', scale: 1.02 }
];
const LANDMARK_LOOP = 1360;

const BIOME_SEQUENCE = ['sea', 'forest', 'mountain', 'city', 'desert', 'plain'];
const WEATHER_SEQUENCE = ['clear', 'cloudy', 'rainy', 'snowy', 'stars'];
const BIOME_SEGMENT = 760;
const WEATHER_SEGMENT = 560;

function getSceneConfig() {
  return {
    biome: selectedBiome,
    weather: selectedWeather,
    biomeIndex: BIOME_SEQUENCE.indexOf(selectedBiome),
    weatherIndex: WEATHER_SEQUENCE.indexOf(selectedWeather),
    biomeT: 0,
    weatherT: 0,
  };
}

function drawEnvironmentBackdrop() {
  const scene = getSceneConfig();
  switch (scene.biome) {
    case 'sea':
      drawSeaBackdrop();
      break;
    case 'desert':
      drawDesertBackdrop();
      break;
    case 'forest':
      drawForestBackdrop();
      break;
    case 'mountain':
      drawMountainBackdrop();
      break;
    case 'plain':
      drawPlainBackdrop();
      break;
    case 'city':
      drawCityBiomeBackdrop();
      break;
  }
}

function drawSeaBackdrop() {
  const cycle = getDayCycle();
  const waterY = 183;
  const g = ctx.createLinearGradient(0, waterY - 8, 0, 228);
  g.addColorStop(0, cycle.nightAmount > 0.55 ? '#2d5b85' : '#66c6ef');
  g.addColorStop(1, cycle.nightAmount > 0.55 ? '#193b63' : '#2f8fca');
  ctx.fillStyle = g;
  ctx.fillRect(0, waterY, W, 48);

  ctx.globalAlpha = 0.32;
  for (let i = 0; i < 7; i++) {
    const y = waterY + 8 + i * 6;
    ctx.strokeStyle = cycle.nightAmount > 0.55 ? '#9fc8f6' : '#e6ffff';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let x = -20; x <= W + 20; x += 10) {
      const wx = x;
      const wy = y + Math.sin((x + roadOffset * 0.45 + i * 16) / 18) * 1.7;
      if (x === -20) ctx.moveTo(wx, wy); else ctx.lineTo(wx, wy);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = cycle.nightAmount > 0.55 ? '#4c617c' : '#e6d1a0';
  ctx.beginPath();
  ctx.moveTo(0, 205);
  for (let x = 0; x <= W; x += 16) {
    ctx.lineTo(x, 202 + Math.sin((x + roadOffset * 0.18) / 26) * 3);
  }
  ctx.lineTo(W, 230);
  ctx.lineTo(0, 230);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = cycle.nightAmount > 0.55 ? '#1f2844' : '#6c7f95';
  ctx.beginPath();
  ctx.moveTo(310, 198); ctx.lineTo(326, 170); ctx.lineTo(340, 198); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(330, 196); ctx.lineTo(332, 166); ctx.lineTo(334, 196); ctx.closePath(); ctx.fill();
}

function drawDesertBackdrop() {
  const cycle = getDayCycle();
  const far = cycle.nightAmount > 0.55 ? '#59473c' : '#dbbc72';
  const near = cycle.nightAmount > 0.55 ? '#775841' : '#efce83';
  ctx.fillStyle = far;
  ctx.beginPath();
  ctx.moveTo(0, 202);
  for (let x = 0; x <= W + 20; x += 14) {
    ctx.lineTo(x, 188 + Math.sin((x + roadOffset * 0.16) / 45) * 7 + Math.cos((x + roadOffset * 0.08) / 24) * 3);
  }
  ctx.lineTo(W, 230); ctx.lineTo(0, 230); ctx.closePath(); ctx.fill();
  ctx.fillStyle = near;
  ctx.beginPath();
  ctx.moveTo(0, 215);
  for (let x = 0; x <= W + 20; x += 12) {
    ctx.lineTo(x, 202 + Math.sin((x + roadOffset * 0.22) / 30) * 6);
  }
  ctx.lineTo(W, 235); ctx.lineTo(0, 235); ctx.closePath(); ctx.fill();
}

function drawForestBackdrop() {
  const cycle = getDayCycle();
  ctx.fillStyle = cycle.nightAmount > 0.55 ? '#294742' : '#7db978';
  ctx.beginPath();
  ctx.moveTo(0, 202);
  for (let x = 0; x <= W + 20; x += 14) {
    ctx.lineTo(x, 192 + Math.sin((x + roadOffset * 0.18) / 36) * 7);
  }
  ctx.lineTo(W, 230); ctx.lineTo(0, 230); ctx.closePath(); ctx.fill();
  for (let i = -1; i < 10; i++) {
    const x = ((i * 52 - roadOffset * 0.30) % 560 + 560) % 560 - 40;
    const y = 195 + Math.sin((x + roadOffset * 0.15) / 25) * 4;
    drawPineTree(x, y, cycle.nightAmount > 0.55 ? '#17322e' : '#2f6b3c', 0.9 + (i % 3) * 0.16);
  }
}

function drawMountainBackdrop() {
  const cycle = getDayCycle();
  drawMountains();
  ctx.globalAlpha = 0.72;
  ctx.fillStyle = cycle.nightAmount > 0.55 ? '#243149' : '#8fb0c8';
  ctx.beginPath();
  ctx.moveTo(0, 190);
  for (let x = 0; x <= W + 20; x += 18) {
    ctx.lineTo(x, 180 + Math.sin((x + roadOffset * 0.13) / 28) * 9 + Math.cos((x + roadOffset * 0.06) / 14) * 3);
  }
  ctx.lineTo(W, 230); ctx.lineTo(0, 230); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1;
  for (let i = 0; i < 4; i++) {
    const x = 40 + i * 110 - (roadOffset * 0.10 % 110);
    drawPineTree(x, 200, cycle.nightAmount > 0.55 ? '#162933' : '#355d4f', 1.0 + (i % 2) * 0.2);
  }
}

function drawPlainBackdrop() {
  const cycle = getDayCycle();
  ctx.fillStyle = cycle.nightAmount > 0.55 ? '#3b5844' : '#93c775';
  ctx.beginPath();
  ctx.moveTo(0, 210);
  for (let x = 0; x <= W + 20; x += 14) {
    ctx.lineTo(x, 198 + Math.sin((x + roadOffset * 0.20) / 33) * 5);
  }
  ctx.lineTo(W, 235); ctx.lineTo(0, 235); ctx.closePath(); ctx.fill();

  ctx.fillStyle = cycle.nightAmount > 0.55 ? '#57795a' : '#b7de95';
  ctx.beginPath();
  ctx.moveTo(0, 216);
  for (let x = 0; x <= W + 20; x += 10) {
    ctx.lineTo(x, 207 + Math.sin((x + roadOffset * 0.12) / 18) * 3);
  }
  ctx.lineTo(W, 236); ctx.lineTo(0, 236); ctx.closePath(); ctx.fill();
}

function drawCityBiomeBackdrop() {
  const cycle = getDayCycle();
  ctx.fillStyle = cycle.nightAmount > 0.55 ? '#2c3b56' : '#aac6df';
  ctx.beginPath();
  ctx.moveTo(0, 208);
  for (let x = 0; x <= W + 20; x += 20) ctx.lineTo(x, 204 + Math.sin((x + roadOffset * 0.08) / 50) * 2.5);
  ctx.lineTo(W, 232); ctx.lineTo(0, 232); ctx.closePath(); ctx.fill();
  drawCityBackdrop();
}

function drawPineTree(x, y, color, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#6a4d34';
  ctx.fillRect(-2, -6, 4, 8);
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(0, -28); ctx.lineTo(-12, -10); ctx.lineTo(12, -10); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(-10, -4); ctx.lineTo(10, -4); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawWeatherAtmosphere() {
  const scene = getSceneConfig();
  if (scene.weather === 'stars') {
    drawStars(frameCount);
  }
  drawSceneClouds(scene.weather);
  if (scene.weather === 'rainy') drawRain();
  if (scene.weather === 'snowy') drawSnow();
  if (scene.weather === 'cloudy') drawCloudShade(0.08);
  if (scene.weather === 'rainy') drawCloudShade(0.16);
  if (scene.weather === 'snowy') drawCloudShade(0.06);
}

function drawSceneClouds(weather) {
  const count = weather === 'cloudy' ? 7 : weather === 'rainy' ? 6 : weather === 'snowy' ? 5 : weather === 'clear' ? 2 : 1;
  const opacityBoost = weather === 'cloudy' ? 0.18 : weather === 'rainy' ? 0.16 : weather === 'snowy' ? 0.13 : 0.05;
  for (let i = 0; i < count; i++) {
    const base = clouds[i % clouds.length];
    const extraX = ((i * 86 + frameCount * base.sp * 2.8) % (W + 140)) - 40;
    const x = i < clouds.length ? ((base.x + frameCount * base.sp) % (W + 120)) - 20 : extraX;
    const y = base.y + (i >= clouds.length ? (i % 3) * 14 : 0) + (weather === 'snowy' ? 8 : 0);
    const sc = base.sc * (i >= clouds.length ? 0.92 : 1.0);
    drawCloud({ x, y, sc, op: base.op + opacityBoost, sp: base.sp });
  }
}

function drawCloudShade(alpha) {
  ctx.fillStyle = `rgba(40,50,72,${alpha})`;
  ctx.fillRect(0, 0, W, 150);
}

function drawRain() {
  const cycle = getDayCycle();
  ctx.save();
  ctx.strokeStyle = cycle.nightAmount > 0.55 ? 'rgba(190,220,255,0.62)' : 'rgba(160,190,220,0.58)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 70; i++) {
    const x = (i * 31 + frameCount * 7) % (W + 40) - 20;
    const y = (i * 19 + frameCount * 10) % (H + 50) - 30;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 5, y + 12);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSnow() {
  const cycle = getDayCycle();
  ctx.save();
  ctx.fillStyle = cycle.nightAmount > 0.55 ? 'rgba(255,255,255,0.92)' : 'rgba(250,250,255,0.96)';
  for (let i = 0; i < 46; i++) {
    const x = (i * 47 + frameCount * 1.8 + Math.sin(i + frameCount * 0.02) * 10) % (W + 30) - 15;
    const y = (i * 29 + frameCount * 2.5) % (H + 40) - 20;
    const r = 1 + (i % 3) * 0.7;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawCityBackdrop() {
  const cycle = getDayCycle();
  const baseY = 208;
  const parallax = roadOffset * 0.24;
  const cityColor = cycle.nightAmount > 0.55 ? '#23385f' : '#7587a9';
  const frontColor = cycle.nightAmount > 0.55 ? '#1b2d4a' : '#5f7294';
  const windowAlpha = cycle.nightAmount > 0.35 ? 0.82 : 0.14;

  // Generic city band behind landmarks.
  for (let repeat = -1; repeat <= 2; repeat++) {
    SKYLINE_BUILDINGS.forEach((b, idx) => {
      const x = b.x + repeat * 544 - (parallax % 544);
      if (x + b.w < -18 || x > W + 18) return;
      ctx.fillStyle = idx % 3 === 0 ? frontColor : cityColor;
      rr(x, baseY - b.h, b.w, b.h, [3, 3, 0, 0], ctx.fillStyle);
      if (windowAlpha > 0.12) {
        ctx.save();
        ctx.globalAlpha = windowAlpha;
        ctx.fillStyle = '#ffe9a8';
        for (let row = 0; row < 4; row++) {
          for (let col = 0; col < Math.max(1, Math.floor((b.w - 4) / 6)); col++) {
            const wx = x + 3 + col * 6;
            const wy = baseY - b.h + 5 + row * 7;
            if (wy < baseY - 4) ctx.fillRect(wx, wy, 2, 3);
          }
        }
        ctx.restore();
      }
    });
  }

  for (let copy = -1; copy <= 1; copy++) {
    LANDMARKS.forEach(lm => {
      const x = lm.x + copy * LANDMARK_LOOP - (parallax % LANDMARK_LOOP);
      if (x < -120 || x > W + 130) return;
      drawLandmark(lm.type, x, baseY + 2, lm.scale, frontColor, cycle.nightAmount > 0.35 ? '#ffe6a0' : 'rgba(255,255,255,0.16)', cycle.nightAmount);
      drawLandmarkName(lm.type, x, baseY + 10, lm.scale, cycle.nightAmount);
    });
  }
}

function drawLandmarkName(type, x, baseY, scale, nightAmount) {
  const names = {
    azadi: 'آزادی',
    milad: 'میلاد',
    zayandehrud: 'زاینده‌رود',
    hafezieh: 'حافظیه',
    takhtejamshid: 'تخت جمشید',
    cyrus: 'کوروش'
  };
  const label = names[type];
  if (!label) return;
  const distanceFromCenter = Math.abs(x - W / 2);
  if (distanceFromCenter > 170) return;

  ctx.save();
  ctx.globalAlpha = 0.36 + (1 - Math.min(distanceFromCenter / 170, 1)) * 0.32;
  ctx.font = '700 7px Vazirmatn, Tahoma, Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const tw = ctx.measureText(label).width + 12;
  const y = baseY - 58 * scale;
  rr(x - tw / 2, y - 8, tw, 14, 7, nightAmount > 0.55 ? 'rgba(10,16,35,0.62)' : 'rgba(255,255,255,0.50)');
  ctx.fillStyle = nightAmount > 0.55 ? '#ffe8a6' : '#26314a';
  ctx.fillText(label, x, y);
  ctx.restore();
}

function drawLandmark(type, x, baseY, scale, color, lightColor, nightAmount) {
  ctx.save();
  ctx.translate(x, baseY);
  ctx.scale(scale, scale);
  ctx.fillStyle = color;
  ctx.strokeStyle = lightColor;
  ctx.lineWidth = 1;

  switch (type) {
    case 'azadi':
      rr(-26, -6, 52, 6, [2,2,0,0], color);
      ctx.beginPath();
      ctx.moveTo(-22, 0);
      ctx.lineTo(-16, -44);
      ctx.quadraticCurveTo(0, -58, 16, -44);
      ctx.lineTo(22, 0);
      ctx.lineTo(14, 0);
      ctx.quadraticCurveTo(0, -20, -14, 0);
      ctx.closePath();
      ctx.fill();
      ctx.save();
      ctx.globalAlpha = 0.28 + nightAmount * 0.18;
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.quadraticCurveTo(0, -17, 12, 0);
      ctx.lineTo(6, 0);
      ctx.quadraticCurveTo(0, -10, -6, 0);
      ctx.closePath();
      ctx.fillStyle = lightColor;
      ctx.fill();
      ctx.restore();
      break;

    case 'milad':
      ctx.fillRect(-3, -62, 6, 62);
      ctx.beginPath(); ctx.arc(0, -70, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(-1.4, -90, 2.8, 18);
      ctx.beginPath(); ctx.moveTo(-5, -92); ctx.lineTo(0, -108); ctx.lineTo(5, -92); ctx.closePath(); ctx.fill();
      break;

    case 'zayandehrud':
      // Water band
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = nightAmount > 0.5 ? '#375985' : '#70b8e8';
      rr(-46, -3, 92, 6, 3, ctx.fillStyle);
      ctx.restore();
      // Bridge over river (inspired by the bridges of Zayandeh Rud)
      rr(-38, -7, 76, 4, [1,1,0,0], color);
      for (let i = 0; i < 6; i++) {
        const ax = -33 + i * 11;
        ctx.beginPath();
        ctx.moveTo(ax, -3);
        ctx.quadraticCurveTo(ax + 5.5, -13, ax + 11, -3);
        ctx.lineTo(ax + 9.5, -3);
        ctx.quadraticCurveTo(ax + 5.5, -9, ax + 1.5, -3);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillRect(-1.5, -15, 3, 8);
      break;

    case 'hafezieh':
      rr(-22, -4, 44, 4, [1,1,0,0], color);
      for (let i = -16; i <= 16; i += 8) ctx.fillRect(i, -24, 3, 20);
      ctx.beginPath();
      ctx.moveTo(-24, -24); ctx.lineTo(0, -38); ctx.lineTo(24, -24); ctx.closePath();
      ctx.fill();
      ctx.beginPath(); ctx.arc(0, -42, 10, Math.PI, 0); ctx.fill();
      break;

    case 'takhtejamshid':
      // Base platform
      rr(-34, -6, 68, 6, [1,1,0,0], color);
      rr(-24, -12, 48, 6, [1,1,0,0], color);
      // Columns
      for (let i = -18; i <= 18; i += 12) {
        ctx.fillRect(i - 2, -34, 4, 22);
        rr(i - 4, -38, 8, 4, 1, color);
      }
      // Top lintel
      rr(-24, -38, 48, 5, [1,1,0,0], color);
      // Side ruins silhouette
      ctx.beginPath();
      ctx.moveTo(-32, -6); ctx.lineTo(-28, -18); ctx.lineTo(-22, -14); ctx.lineTo(-20, -6); ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(32, -6); ctx.lineTo(28, -18); ctx.lineTo(22, -14); ctx.lineTo(20, -6); ctx.closePath();
      ctx.fill();
      break;

    case 'cyrus':
      // Tomb of Cyrus: stepped base with small chamber on top
      rr(-30, -6, 60, 6, [1,1,0,0], color);
      rr(-24, -12, 48, 6, [1,1,0,0], color);
      rr(-18, -18, 36, 6, [1,1,0,0], color);
      rr(-12, -24, 24, 6, [1,1,0,0], color);
      rr(-10, -40, 20, 16, [2,2,0,0], color);
      ctx.beginPath();
      ctx.moveTo(-12, -40); ctx.lineTo(0, -50); ctx.lineTo(12, -40); ctx.closePath();
      ctx.fill();
      break;
  }

  if (nightAmount > 0.35) {
    ctx.save();
    ctx.globalAlpha = 0.42 + nightAmount * 0.18;
    ctx.fillStyle = lightColor;
    if (type === 'milad') ctx.fillRect(-4, -73, 8, 3);
    if (type === 'azadi') ctx.fillRect(-8, -24, 16, 2);
    if (type === 'hafezieh') ctx.fillRect(-10, -18, 20, 2);
    if (type === 'takhtejamshid') ctx.fillRect(-18, -31, 36, 2);
    if (type === 'cyrus') ctx.fillRect(-8, -34, 16, 2);
    if (type === 'zayandehrud') ctx.fillRect(-18, -10, 36, 1.8);
    ctx.restore();
  }
  ctx.restore();
}

function isNightLightsOn() {
  const cycle = getDayCycle();
  return cycle.nightAmount >= 0.88;
}

function drawStageTwoHeadlightBeam() {
  if (!isNightLightsOn()) return;

  const frontX = BUS.x + BUS.w - 1;
  const lampY = BUS.y - BUS.h + 27;
  const beamLen = Math.min(260, W - frontX + 25);
  const farX = frontX + beamLen;
  const midX = frontX + beamLen * 0.62;
  const farRoadY = getRoadY(Math.min(W, farX - 10)) + 26;
  const nearRoadY = getRoadY(frontX + 28) + 18;
  const pulse = 0.78 + 0.22 * Math.sin(frameCount * 0.18);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // Narrow cone of light from the front headlight to the road surface.
  const beamGrad = ctx.createLinearGradient(frontX, lampY, farX, farRoadY);
  beamGrad.addColorStop(0, `rgba(255,246,180,${0.50 * pulse})`);
  beamGrad.addColorStop(0.35, `rgba(255,226,100,${0.23 * pulse})`);
  beamGrad.addColorStop(1, 'rgba(255,226,100,0)');
  ctx.fillStyle = beamGrad;
  ctx.beginPath();
  ctx.moveTo(frontX, lampY - 2);
  ctx.bezierCurveTo(frontX + 42, lampY + 2, midX, nearRoadY - 26, farX, farRoadY - 18);
  ctx.lineTo(farX + 8, farRoadY + 8);
  ctx.bezierCurveTo(midX, farRoadY + 14, frontX + 38, lampY + 24, frontX, lampY + 4);
  ctx.closePath();
  ctx.fill();

  // Bright strip reflected on the asphalt.
  const spotX = frontX + beamLen * 0.62;
  const spotY = getRoadY(spotX) + 30;
  const roadAngle = getRoadSlope(spotX) * 0.75;
  const spotGrad = ctx.createRadialGradient(spotX, spotY, 4, spotX, spotY, 96);
  spotGrad.addColorStop(0, `rgba(255,240,145,${0.33 * pulse})`);
  spotGrad.addColorStop(0.55, `rgba(255,214,78,${0.13 * pulse})`);
  spotGrad.addColorStop(1, 'rgba(255,214,78,0)');
  ctx.translate(spotX, spotY);
  ctx.rotate(roadAngle);
  ctx.fillStyle = spotGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, 92, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawWindowDiscoLight(wx, wy, ww, wh, i) {
  if (!isNightLightsOn()) return;

  const discoColors = [
    'rgba(255,58,58,0.62)',
    'rgba(68,255,110,0.58)'
  ];
  const colorA = discoColors[(Math.floor(frameCount / 7) + i) % discoColors.length];
  const colorB = discoColors[(Math.floor(frameCount / 11) + i + 1) % discoColors.length];
  const sweep = (Math.sin(frameCount * 0.10 + i * 1.7) * 0.5 + 0.5);
  const glowX = wx + 2 + sweep * (ww - 4);
  const glowY = wy + 3 + (Math.cos(frameCount * 0.13 + i) * 0.5 + 0.5) * (wh - 6);

  ctx.save();
  rr(wx, wy, ww, wh, 3);
  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';

  ctx.fillStyle = colorA;
  ctx.beginPath();
  ctx.arc(glowX, glowY, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = colorB;
  ctx.save();
  ctx.translate(wx + ww / 2, wy + wh / 2);
  ctx.rotate(Math.sin(frameCount * 0.07 + i) * 0.75);
  ctx.fillRect(-ww, -2, ww * 2, 4);
  ctx.restore();

  // Tiny moving sparkle dots in red and green.
  for (let k = 0; k < 3; k++) {
    const px = wx + ((frameCount * (0.55 + k * 0.18) + i * 17 + k * 9) % ww);
    const py = wy + 3 + ((i * 5 + k * 7 + frameCount * 0.20) % (wh - 5));
    ctx.fillStyle = discoColors[(i + k + Math.floor(frameCount / 5)) % discoColors.length];
    ctx.beginPath();
    ctx.arc(px, py, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawRoad() {
  const cycle = getDayCycle();
  const pts = [];
  for (let x = -12; x <= W + 12; x += 5) pts.push([x, getRoadY(x)]);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-12, H);
  pts.forEach(([x, y]) => ctx.lineTo(x, y - 10));
  ctx.lineTo(W + 12, H);
  ctx.closePath();
  const shoulder = ctx.createLinearGradient(0, BASE_GROUND_Y - 40, 0, H);
  shoulder.addColorStop(0, cycle.nightAmount > 0.6 ? '#26334a' : '#8aa278');
  shoulder.addColorStop(1, cycle.nightAmount > 0.6 ? '#1a2033' : '#57614e');
  ctx.fillStyle = shoulder;
  ctx.globalAlpha = 0.82;
  ctx.fill();
  ctx.restore();

  const roadGrad = ctx.createLinearGradient(0, BASE_GROUND_Y - 20, 0, H);
  roadGrad.addColorStop(0, cycle.nightAmount > 0.65 ? '#303554' : '#4e5363');
  roadGrad.addColorStop(0.58, cycle.nightAmount > 0.65 ? '#262840' : '#343847');
  roadGrad.addColorStop(1, cycle.nightAmount > 0.65 ? '#1c1d31' : '#272a36');

  ctx.fillStyle = roadGrad;
  ctx.beginPath();
  ctx.moveTo(-12, H);
  pts.forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.lineTo(W + 12, H);
  ctx.closePath();
  ctx.fill();

  ctx.save();
  ctx.globalAlpha = cycle.nightAmount > 0.55 ? 0.10 : 0.14;
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 46; i++) {
    const x = (i * 37 - (roadOffset * 0.65 % 37) + W) % (W + 30) - 15;
    const y = getRoadY(x) + 18 + ((i * 17) % 58);
    if (y < H - 8) ctx.fillRect(x, y, 1.2, 1.2);
  }
  ctx.restore();

  ctx.strokeStyle = cycle.nightAmount > 0.6 ? '#6972b7' : '#d5d0b6';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  pts.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,210,70,0.60)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  pts.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y + 9) : ctx.lineTo(x, y + 9));
  ctx.stroke();

  dashes.forEach(d => {
    const x = d.x;
    const y = getRoadY(x + DASH_W / 2) + 32;
    const angle = getRoadSlope(x + DASH_W / 2) * 0.8;
    ctx.save();
    ctx.translate(x + DASH_W / 2, y);
    ctx.rotate(angle);
    const dashGrad = ctx.createLinearGradient(-DASH_W / 2, 0, DASH_W / 2, 0);
    dashGrad.addColorStop(0, 'rgba(255,245,160,0.20)');
    dashGrad.addColorStop(0.5, 'rgba(255,245,160,0.72)');
    dashGrad.addColorStop(1, 'rgba(255,245,160,0.20)');
    rr(-DASH_W / 2, -DASH_H / 2, DASH_W, DASH_H, 2, dashGrad);
    ctx.restore();
  });

  ctx.fillStyle = 'rgba(0,0,0,0.34)';
  ctx.fillRect(0, H - 8, W, 8);
}

function drawRoadsideDetails() {
  const cycle = getDayCycle();
  const scene = getSceneConfig();
  for (let i = -1; i < 9; i++) {
    const x = ((i * 70 - roadOffset * 0.9) % 560 + 560) % 560 - 70;
    if (x < -24 || x > W + 24) continue;
    const y = getRoadY(x) - 5;
    const angle = getRoadSlope(x);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = cycle.nightAmount > 0.55 ? '#cfd7e7' : '#f0f1e8';
    rr(-2, -13, 4, 14, 2, ctx.fillStyle);
    ctx.fillStyle = i % 2 === 0 ? '#ff3d2e' : '#ffd338';
    rr(-4, -14, 8, 4, 2, ctx.fillStyle);
    if (cycle.nightAmount > 0.55) {
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#fff1a0';
      ctx.beginPath();
      ctx.arc(0, -12, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    const sideX = x + ((i % 2 === 0) ? -20 : 18);
    const sideY = getRoadY(sideX) - 7;
    drawBiomeProp(scene.biome, sideX, sideY, i, cycle.nightAmount);
  }
}

function drawBiomeProp(biome, x, y, i, nightAmount) {
  ctx.save();
  ctx.translate(x, y);
  const dir = i % 2 === 0 ? -1 : 1;
  if (biome === 'sea') {
    ctx.fillStyle = nightAmount > 0.55 ? '#4da3d4' : '#7be0ff';
    ctx.beginPath(); ctx.ellipse(0, 2, 14, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-8, 1); ctx.quadraticCurveTo(-2, -1, 5, 1); ctx.stroke();
    ctx.fillStyle = '#7ea864'; ctx.fillRect(-1, -6, 2, 7);
    ctx.beginPath(); ctx.arc(-2, -7, 4, 0, Math.PI * 2); ctx.fill();
  } else if (biome === 'desert') {
    ctx.fillStyle = nightAmount > 0.55 ? '#8f704a' : '#b98e55';
    ctx.beginPath(); ctx.ellipse(0, 3, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = nightAmount > 0.55 ? '#607d54' : '#5c8b42';
    ctx.fillRect(-1, -10, 2, 10);
    ctx.beginPath(); ctx.moveTo(-1, -6); ctx.quadraticCurveTo(-6, -10, -1, -13); ctx.quadraticCurveTo(0, -10, -1, -6); ctx.fill();
    ctx.beginPath(); ctx.moveTo(1, -7); ctx.quadraticCurveTo(6, -11, 1, -14); ctx.quadraticCurveTo(0, -11, 1, -7); ctx.fill();
  } else if (biome === 'forest') {
    drawPineTree(0, 2, nightAmount > 0.55 ? '#17322e' : '#2f6b3c', 0.55 + (i % 3) * 0.1);
  } else if (biome === 'mountain') {
    ctx.fillStyle = nightAmount > 0.55 ? '#5a667e' : '#9a9fab';
    ctx.beginPath(); ctx.moveTo(-8, 2); ctx.lineTo(-3, -8); ctx.lineTo(4, -2); ctx.lineTo(9, 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(-3, -8); ctx.lineTo(-1, -5); ctx.lineTo(2, -6); ctx.lineTo(0, -3); ctx.closePath(); ctx.fill();
  } else if (biome === 'plain') {
    ctx.fillStyle = nightAmount > 0.55 ? '#557a58' : '#73b05f';
    ctx.beginPath(); ctx.ellipse(0, 3, 10, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f7e16f'; ctx.beginPath(); ctx.arc(-3, -2, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff8fb0'; ctx.beginPath(); ctx.arc(2, -3, 1.7, 0, Math.PI * 2); ctx.fill();
  } else if (biome === 'city') {
    ctx.fillStyle = nightAmount > 0.55 ? '#8592a8' : '#c5ccd8';
    rr(-4, -12, 8, 12, [2,2,0,0], ctx.fillStyle);
    ctx.fillStyle = nightAmount > 0.55 ? '#ffe8a0' : '#8eb7ea';
    ctx.fillRect(-2, -9, 1.5, 2); ctx.fillRect(0.5, -9, 1.5, 2); ctx.fillRect(-2, -5, 1.5, 2); ctx.fillRect(0.5, -5, 1.5, 2);
  }
  ctx.restore();
}

function drawBus() {
  const theme = BUS_THEMES[selectedBusColor] || BUS_THEMES.yellow;
  const model = BUS_MODEL_STYLES[selectedBusModel] || BUS_MODEL_STYLES.man;
  const bx = BUS.x;
  const by = BUS.y - BUS.h;
  const bw = BUS.w, bh = BUS.h;
  const w1x = bx + 14, w1y = BUS.y;
  const w2x = bx + bw - 18, w2y = BUS.y;
  const WR = 9;
  const ground = getRoadY(BUS.x + bw * 0.5);
  const shadowW = bw * 0.82;
  const shadowX = bx + (bw - shadowW) / 2;
  const shadowY = ground + 4;
  const sg = ctx.createRadialGradient(shadowX + shadowW / 2, shadowY, 2, shadowX + shadowW / 2, shadowY, shadowW * 0.55);
  sg.addColorStop(0, 'rgba(0,0,0,0.25)');
  sg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(shadowX, shadowY - 4, shadowW, 14);

  // Main selected-color body
  rr(bx, by, bw, bh, [10, 10, 4, 4], theme.body);
  strokeRRPath(bx, by, bw, bh, [10, 10, 4, 4], 'rgba(10,12,18,0.68)', 1.3);
  const bodyGrad = ctx.createLinearGradient(0, by, 0, by + bh);
  bodyGrad.addColorStop(0, 'rgba(255,255,255,0.22)');
  bodyGrad.addColorStop(0.42, 'rgba(255,255,255,0.02)');
  bodyGrad.addColorStop(1, selectedBusColor === 'black' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.20)');
  rr(bx, by, bw, bh, [10, 10, 4, 4]);
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  // Roof + upper highlight
  rr(bx + 1, by + 1, bw - 2, 11, [9, 9, 0, 0], theme.roof);
  ctx.fillStyle = selectedBusColor === 'black' ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.22)';
  rr(bx + 6, by + 2, bw - 26, 5, 3);
  ctx.fill();

  // Lower skirt and front cap
  ctx.fillStyle = theme.skirt;
  ctx.fillRect(bx + 2, by + bh - 12, bw - 4, 10);
  rr(bx + bw - 15, by + 3, 14, bh - 3, [0, 8, 2, 0], theme.front);

  // Model-specific body accents
  drawBusModelBodyDetails(selectedBusModel, bx, by, bw, bh, theme, model);

  // Front windshield
  const wsX = bx + bw - 13, wsY = by + 5;
  rr(wsX, wsY, 10, 14, 3, '#6ec6ff');
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath(); ctx.moveTo(wsX + 2, wsY + 2); ctx.lineTo(wsX + 6, wsY + 2); ctx.lineTo(wsX + 3, wsY + 7); ctx.closePath(); ctx.fill();

  const lightsOn = isNightLightsOn();
  rr(bx + bw - 4, by + bh - 22, 5, 7, 2, lightsOn ? '#fff6a8' : '#d8d8c8');
  if (lightsOn) {
    const headGlowRadius = 24;
    const hlg = ctx.createRadialGradient(bx + bw, by + bh - 18, 1, bx + bw, by + bh - 18, headGlowRadius);
    hlg.addColorStop(0, 'rgba(255,250,185,0.85)');
    hlg.addColorStop(1, 'rgba(255,255,200,0)');
    ctx.fillStyle = hlg;
    ctx.fillRect(bx + bw - headGlowRadius, by + bh - 18 - headGlowRadius, headGlowRadius * 2, headGlowRadius * 2);
  }
  rr(bx + bw - 5, by + bh - 10, 7, 7, [0, 3, 3, 0], '#bbbbcc');
  ctx.fillStyle = '#FF8800';
  ctx.beginPath();
  ctx.arc(bx + bw - 3, by + bh - 26, 2, 0, Math.PI * 2);
  ctx.fill();

  // Side windows
  const winW = 15, winH = 13, winTop = by + 8;
  [bx + 6, bx + 24, bx + 42].forEach((wx, i) => {
    rr(wx - 1, winTop - 1, winW + 2, winH + 2, 4, theme.windowFrame);
    rr(wx, winTop, winW, winH, 3, '#5ab8e8');
    drawWindowDiscoLight(wx, winTop, winW, winH, i);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(wx + 2, winTop + 2, 4, 3);
    ctx.fillStyle = 'rgba(80,50,20,0.12)';
    ctx.fillRect(wx, winTop + winH - 4, winW, 4);
  });

  // Door
  const doorX = bx + 57, doorY = by + bh - 16;
  rr(doorX, doorY, 9, 15, [2, 2, 0, 0], theme.door);
  ctx.strokeStyle = theme.doorLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(doorX + 4.5, doorY);
  ctx.lineTo(doorX + 4.5, doorY + 15);
  ctx.stroke();
  ctx.fillStyle = selectedBusColor === 'black' ? '#c8c8d8' : '#666';
  ctx.fillRect(doorX + 2, doorY + 6, 2, 4);

  // Bus side branding
  ctx.fillStyle = model.accent;
  rr(bx + 8, by + bh - 13, 48, 6, 3);
  ctx.fill();

  ctx.font = '900 10px Arial, Helvetica, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = selectedBusColor === 'white' ? 'rgba(20,30,55,0.70)' : 'rgba(255,255,255,0.28)';
  ctx.strokeText('AROBUS', bx + 10, by + bh - 22);
  ctx.fillStyle = selectedBusColor === 'black' ? '#FFD200' : (selectedBusColor === 'white' ? '#17307a' : '#ffffff');
  ctx.fillText('AROBUS', bx + 10, by + bh - 22);

  // Model label
  ctx.font = '700 6.5px Arial, Helvetica, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = selectedBusColor === 'white' ? '#30405a' : '#eef4ff';
  ctx.fillText(model.label, bx + 12, by + bh - 8.5);

  drawWheel(w1x, w1y, WR, selectedRimType, theme.skirt);
  drawWheel(w2x, w2y, WR, selectedRimType, theme.skirt);
}

function drawBusModelBodyDetails(modelName, bx, by, bw, bh, theme, model) {
  switch (modelName) {
    case 'scania':
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      rr(bx + 4, by + 24, bw - 22, 3, 2, ctx.fillStyle);
      ctx.fillStyle = '#2b2f39';
      rr(bx + bw - 14, by + 22, 10, 6, 2, ctx.fillStyle);
      ctx.fillStyle = '#d8dee8';
      ctx.fillRect(bx + bw - 11, by + 24, 4, 1.5);
      break;
    case 'benz-modern':
      ctx.fillStyle = 'rgba(255,255,255,0.20)';
      rr(bx + 5, by + 21, bw - 20, 2.5, 2, ctx.fillStyle);
      drawMercedesStar(bx + bw - 9, by + 25, 4.2);
      break;
    case 'man':
      ctx.fillStyle = '#1a1f29';
      rr(bx + bw - 14, by + 20, 11, 9, 2, ctx.fillStyle);
      ctx.strokeStyle = '#6b7788';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(bx + bw - 13, by + 23);
      ctx.lineTo(bx + bw - 4, by + 23);
      ctx.moveTo(bx + bw - 13, by + 26);
      ctx.lineTo(bx + bw - 4, by + 26);
      ctx.stroke();
      ctx.font = '700 5px Arial, sans-serif';
      ctx.fillStyle = '#e8eef7';
      ctx.textAlign = 'center';
      ctx.fillText('MAN', bx + bw - 8.5, by + 18);
      break;
    case 'volvo':
      ctx.strokeStyle = '#d9f4ff';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(bx + bw - 8, by + 24.5, 3.6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx + bw - 10.5, by + 27);
      ctx.lineTo(bx + bw - 5.5, by + 22);
      ctx.lineTo(bx + bw - 3.8, by + 22);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      rr(bx + 7, by + 21, bw - 24, 3, 2, ctx.fillStyle);
      break;
    case 'yutang':
      ctx.strokeStyle = '#fff3fb';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(bx + 10, by + 29);
      ctx.quadraticCurveTo(bx + 28, by + 17, bx + 52, by + 28);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      rr(bx + 7, by + 21, bw - 22, 3, 2, ctx.fillStyle);
      break;
    case 'benz-classic':
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      rr(bx + 6, by + 22, bw - 24, 2.6, 2, ctx.fillStyle);
      ctx.strokeStyle = '#eef4fa';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(bx + bw - 12, by + 25);
      ctx.quadraticCurveTo(bx + bw - 9, by + 20, bx + bw - 5, by + 25);
      ctx.stroke();
      break;
  }
}

function drawMercedesStar(cx, cy, r) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = '#d8dee8';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + i * (Math.PI * 2 / 3);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * (r - 0.5), Math.sin(a) * (r - 0.5));
    ctx.stroke();
  }
  ctx.restore();
}

function drawWheel(cx, cy, r, rimType = 'sport', archColor = '#C89800') {
  // Tyre outer
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#151520';
  ctx.fill();
  ctx.strokeStyle = '#4b4f66';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Tyre tread ring
  ctx.beginPath();
  ctx.arc(cx, cy, r - 1.4, 0, Math.PI * 2);
  ctx.strokeStyle = '#2c2c40';
  ctx.lineWidth = 1;
  ctx.stroke();

  // small sidewall highlights so the full tyre reads clearly
  ctx.beginPath();
  ctx.arc(cx - r * 0.15, cy - r * 0.12, r * 0.18, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fill();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(wheelAngle);

  if (rimType === 'star') {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const rrStar = i % 2 === 0 ? r * 0.68 : r * 0.30;
      const px = Math.cos(a) * rrStar;
      const py = Math.sin(a) * rrStar;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = '#d7d7e8';
    ctx.fill();
    ctx.strokeStyle = '#8a8aa4';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  } else if (rimType === 'classic') {
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.58, 0, Math.PI * 2);
    ctx.fillStyle = '#9a9ab4';
    ctx.fill();
    ctx.strokeStyle = '#d4d4e8';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.20, Math.sin(a) * r * 0.20);
      ctx.lineTo(Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78);
      ctx.stroke();
    }
  } else if (rimType === 'blade') {
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.61, 0, Math.PI * 2);
    ctx.fillStyle = '#ced2df';
    ctx.fill();
    for (let i = 0; i < 5; i++) {
      ctx.save();
      ctx.rotate((i / 5) * Math.PI * 2);
      rr(-1.5, -r * 0.68, 3, r * 0.52, 1.5, '#f2f4fb');
      ctx.restore();
    }
  } else if (rimType === 'diamond') {
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.60, 0, Math.PI * 2);
    ctx.fillStyle = '#cfd5e2';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * r * 0.68, Math.sin(a) * r * 0.68);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.rect(-r * 0.15, -r * 0.15, r * 0.3, r * 0.3);
    ctx.stroke();
  } else if (rimType === 'turbine') {
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
    ctx.fillStyle = '#bec7d8';
    ctx.fill();
    ctx.fillStyle = '#edf2ff';
    for (let i = 0; i < 6; i++) {
      ctx.save();
      ctx.rotate((i / 6) * Math.PI * 2 + 0.2);
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.12);
      ctx.quadraticCurveTo(r * 0.34, -r * 0.22, r * 0.48, -r * 0.62);
      ctx.lineTo(r * 0.12, -r * 0.32);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  } else {
    // Sport rim: 8 shiny thin spokes.
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.64, 0, Math.PI * 2);
    ctx.fillStyle = '#c7c7d8';
    ctx.fill();
    ctx.strokeStyle = '#f4f4ff';
    ctx.lineWidth = 1.25;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.18, Math.sin(a) * r * 0.18);
      ctx.lineTo(Math.cos(a) * r * 0.76, Math.sin(a) * r * 0.76);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2);
    ctx.strokeStyle = '#7d7d98';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();

  // Hub centre dot
  ctx.beginPath();
  ctx.arc(cx, cy, 2.2, 0, Math.PI * 2);
  ctx.fillStyle = '#f0f0ff';
  ctx.fill();

  // Minimal wheel arch/fender above the tyre so the full wheel stays visible.
  ctx.save();
  ctx.strokeStyle = archColor;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy - 0.2, r + 2.2, Math.PI * 1.08, Math.PI * 1.92);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cx, cy - 1.5, r + 1.4, Math.PI * 1.16, Math.PI * 1.84);
  ctx.stroke();
  ctx.restore();
}

function drawObstacle(obs) {
  const ground = getRoadY(obs.x + obs.w / 2);
  const ox = obs.x, oy = ground - obs.h;
  switch (obs.type) {
    case 'wreckCar': drawWreckCar(ox, oy, obs.w, obs.h, obs.wobble); break;
    case 'wreckBus': drawWreckBus(ox, oy, obs.w, obs.h, obs.wobble); break;
    case 'brokenVan': drawBrokenVan(ox, oy, obs.w, obs.h, obs.wobble); break;
    case 'tireStack': drawTireStack(ox, oy, obs.w, obs.h); break;
    case 'roadBlock': drawRoadBlock(ox, oy, obs.w, obs.h); break;
    case 'fallenSign': drawFallenSign(ox, oy, obs.w, obs.h); break;
    case 'oilSpill': drawOilSpill(ox, ground, obs.w, obs.h); break;
    case 'pothole': drawPothole(ox, ground, obs.w, obs.h); break;
    default: drawWreckCar(ox, oy, obs.w, obs.h, obs.wobble);
  }
}
function drawGroundShadow(x, ground, w) {
  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, ground + 4, w * 0.50, 5, 0, 0, Math.PI * 2);
  ctx.fill();
}
function drawObstacleHalo(cx, cy, rx, ry, strength = 0.28) {
  const cycle = getDayCycle();
  const alpha = strength + cycle.nightAmount * 0.12;
  const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, Math.max(rx, ry) * 1.4);
  g.addColorStop(0, `rgba(255,210,60,${alpha})`);
  g.addColorStop(0.45, `rgba(255,160,40,${alpha * 0.55})`);
  g.addColorStop(1, 'rgba(255,160,40,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}
function strokeRRPath(x, y, w, h, r, color = '#101018', lw = 1.6) {
  if (typeof r === 'number') r = [r, r, r, r];
  ctx.beginPath();
  ctx.moveTo(x + r[0], y);
  ctx.lineTo(x + w - r[1], y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r[1]);
  ctx.lineTo(x + w, y + h - r[2]);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r[2], y + h);
  ctx.lineTo(x + r[3], y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r[3]);
  ctx.lineTo(x, y + r[0]);
  ctx.quadraticCurveTo(x, y, x + r[0], y);
  ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.stroke();
}
function drawWarningStripeBar(x, y, w, h, angle = -0.65) {
  ctx.save();
  rr(x, y, w, h, 2, '#fff3d6');
  ctx.beginPath();
  rr(x, y, w, h, 2);
  ctx.clip();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(angle);
  for (let i = -w; i < w; i += 8) {
    ctx.fillStyle = (Math.floor((i + w) / 8) % 2 === 0) ? '#ff8d26' : '#252530';
    ctx.fillRect(i, -h * 1.6, 5, h * 3.2);
  }
  ctx.restore();
  strokeRRPath(x, y, w, h, 2, '#151520', 1.2);
}
function drawCrack(x, y, s) {
  ctx.strokeStyle = 'rgba(255,255,255,0.34)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + s * 0.4, y + s * 0.4);
  ctx.lineTo(x + s * 0.1, y + s * 0.7);
  ctx.lineTo(x + s * 0.6, y + s);
  ctx.stroke();
}
function drawWreckCar(x, y, w, h, wobble) {
  const ground = y + h;
  drawGroundShadow(x, ground, w);
  drawObstacleHalo(x + w / 2, y + h * 0.58, w * 0.62, h * 0.65, 0.24);
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(Math.sin(wobble) * 0.05);
  x = -w / 2; y = -h / 2;

  rr(x + 4, y + 10, w - 8, h - 11, [8, 8, 4, 4], '#d84a37');
  const g = ctx.createLinearGradient(x, y + 4, x, y + h);
  g.addColorStop(0, 'rgba(255,255,255,0.26)');
  g.addColorStop(1, 'rgba(0,0,0,0.28)');
  rr(x + 4, y + 10, w - 8, h - 11, [8, 8, 4, 4]); ctx.fillStyle = g; ctx.fill();
  strokeRRPath(x + 4, y + 10, w - 8, h - 11, [8, 8, 4, 4], '#121218', 1.6);

  ctx.beginPath();
  ctx.moveTo(x + 14, y + 11); ctx.lineTo(x + 24, y + 3); ctx.lineTo(x + 38, y + 3); ctx.lineTo(x + 46, y + 11);
  ctx.closePath(); ctx.fillStyle = '#6ea6c6'; ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(x + 28, y + 4, 2, 8);
  drawCrack(x + 18, y + 7, 7);

  drawWarningStripeBar(x + 10, y + 17, Math.max(18, w - 24), 6);
  ctx.fillStyle = '#fff4a8'; ctx.fillRect(x + w - 3, y + 17, 4, 4);
  ctx.strokeStyle = 'rgba(20,20,20,0.75)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 5, y + 18); ctx.lineTo(x - 2, y + 15); ctx.stroke();

  ctx.fillStyle = '#181821';
  ctx.beginPath(); ctx.arc(x + 15, y + h - 2, 6.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + w - 15, y + h - 3, 5.4, 0, Math.PI * 2); ctx.fill();

  ctx.globalAlpha = 0.38; ctx.fillStyle = '#9aa0ae';
  ctx.beginPath(); ctx.arc(x + 4, y + 4, 5, 0, Math.PI * 2); ctx.arc(x + 9, y + 0, 4, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}
function drawWreckBus(x, y, w, h, wobble) {
  const ground = y + h;
  drawGroundShadow(x, ground, w);
  drawObstacleHalo(x + w / 2, y + h * 0.55, w * 0.72, h * 0.70, 0.26);
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(Math.sin(wobble + 1.2) * -0.04);
  x = -w / 2; y = -h / 2;

  rr(x + 2, y + 3, w - 4, h - 7, [8, 8, 3, 3], '#d8dde7');
  const g = ctx.createLinearGradient(x, y + 2, x, y + h);
  g.addColorStop(0, 'rgba(255,255,255,0.34)');
  g.addColorStop(1, 'rgba(0,0,0,0.18)');
  rr(x + 2, y + 3, w - 4, h - 7, [8, 8, 3, 3]); ctx.fillStyle = g; ctx.fill();
  strokeRRPath(x + 2, y + 3, w - 4, h - 7, [8, 8, 3, 3], '#11141b', 1.5);

  drawWarningStripeBar(x + 9, y + h - 18, w - 20, 8);

  for (let i = 0; i < 4; i++) {
    const wx = x + 8 + i * 13;
    rr(wx, y + 9, 11, 10, 2, i === 2 ? '#243241' : '#73a9c9');
    strokeRRPath(wx, y + 9, 11, 10, 2, '#11141a', 1);
    if (i === 1 || i === 2) drawCrack(wx + 3, y + 11, 6);
  }
  rr(x + w - 13, y + 8, 9, 12, 2, '#355064');
  strokeRRPath(x + w - 13, y + 8, 9, 12, 2, '#11141a', 1);
  ctx.strokeStyle = '#4c5460'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x + 4, y + 22); ctx.lineTo(x + w - 5, y + 18); ctx.stroke();
  ctx.fillStyle = '#ffe58a'; ctx.fillRect(x + w - 3, y + h - 17, 5, 4);
  ctx.fillStyle = '#1f1f2f'; ctx.beginPath(); ctx.arc(x + 15, y + h - 5, 6, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(x + w - 18, y + h - 7, 5, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.40; ctx.fillStyle = '#9097a6'; ctx.beginPath(); ctx.arc(x + 7, y + 0, 5, 0, Math.PI * 2); ctx.arc(x + 14, y - 3, 4, 0, Math.PI * 2); ctx.arc(x + 11, y - 8, 3, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  ctx.restore();
}
function drawBrokenVan(x, y, w, h, wobble) {
  const ground = y + h;
  drawGroundShadow(x, ground, w);
  drawObstacleHalo(x + w / 2, y + h * 0.56, w * 0.68, h * 0.68, 0.24);
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(Math.sin(wobble + 2) * 0.045);
  x = -w / 2; y = -h / 2;
  rr(x + 4, y + 7, w - 8, h - 9, [7, 10, 4, 4], '#3aa9b8');
  const g = ctx.createLinearGradient(x, y + 5, x, y + h);
  g.addColorStop(0, 'rgba(255,255,255,0.24)'); g.addColorStop(1, 'rgba(0,0,0,0.25)');
  rr(x + 4, y + 7, w - 8, h - 9, [7, 10, 4, 4]); ctx.fillStyle = g; ctx.fill();
  strokeRRPath(x + 4, y + 7, w - 8, h - 9, [7, 10, 4, 4], '#11151b', 1.5);
  ctx.fillStyle = '#7fc0d6'; rr(x + 10, y + 10, 14, 10, 2); ctx.fill(); rr(x + 28, y + 10, 12, 10, 2); ctx.fill();
  drawCrack(x + 13, y + 12, 6);
  drawWarningStripeBar(x + 8, y + h - 16, w - 16, 7);
  ctx.fillStyle = '#181a24'; ctx.beginPath(); ctx.arc(x + 15, y + h - 4, 6, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(x + w - 15, y + h - 5, 5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#222'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + w - 4, y + 15); ctx.lineTo(x + w + 3, y + 19); ctx.stroke();
  ctx.restore();
}
function drawTireStack(x, y, w, h) {
  const ground = y + h;
  drawGroundShadow(x, ground, w);
  drawObstacleHalo(x + w / 2, ground - h * 0.45, w * 0.60, h * 0.70, 0.18);
  // warning base plate to improve visibility
  drawWarningStripeBar(x + w * 0.08, ground - 8, w * 0.84, 7, 0);
  for (let i = 0; i < 3; i++) {
    const cy = ground - 12 - i * 9;
    ctx.beginPath(); ctx.ellipse(x + w / 2 + (i % 2 ? 2 : -1), cy, w * 0.44, 7.2, 0, 0, Math.PI * 2); ctx.fillStyle = '#171722'; ctx.fill();
    ctx.strokeStyle = '#c9ced9'; ctx.lineWidth = 1.1; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x + w / 2 + (i % 2 ? 2 : -1), cy, w * 0.23, 3.2, 0, 0, Math.PI * 2); ctx.fillStyle = '#495062'; ctx.fill();
  }
}
function drawRoadBlock(x, y, w, h) {
  const ground = y + h;
  drawGroundShadow(x, ground, w);
  drawObstacleHalo(x + w / 2, y + h * 0.58, w * 0.62, h * 0.54, 0.26);
  ctx.fillStyle = '#e2e2e7'; ctx.fillRect(x + 6, ground - 5, 4, 5); ctx.fillRect(x + w - 10, ground - 5, 4, 5);
  drawWarningStripeBar(x + 2, y + 8, w - 4, 12);
}
function drawFallenSign(x, y, w, h) {
  const ground = y + h;
  drawGroundShadow(x, ground, w);
  drawObstacleHalo(x + w * 0.56, y + h * 0.44, w * 0.52, h * 0.58, 0.22);
  ctx.strokeStyle = '#c8ccd6'; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(x + 10, ground); ctx.lineTo(x + w - 8, y + 11); ctx.stroke();
  ctx.save(); ctx.translate(x + w - 9, y + 10); ctx.rotate(-0.45);
  ctx.fillStyle = '#ffd23d'; ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(13, 0); ctx.lineTo(0, 11); ctx.lineTo(-13, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#11141a'; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.fillStyle = '#d63f1f'; ctx.beginPath(); ctx.arc(0, 0, 4.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 9px Tahoma'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', 0, 1);
  ctx.restore();
}
function drawOilSpill(x, ground, w, h) {
  drawGroundShadow(x, ground, w);
  drawObstacleHalo(x + w / 2, ground - 2, w * 0.58, h * 1.25, 0.16);
  // reflective warning ring so it is visible in both day and night
  ctx.strokeStyle = '#ffcc33'; ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.ellipse(x + w / 2, ground - 2, w * 0.50, h * 0.95 + 2, 0.08, 0, Math.PI * 2); ctx.stroke();
  const g = ctx.createRadialGradient(x + w / 2, ground - 3, 2, x + w / 2, ground - 3, w * 0.5);
  g.addColorStop(0, '#20202b'); g.addColorStop(0.55, '#0b0b12'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x + w / 2, ground - 2, w * 0.46, h * 0.62, 0.08, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.36; ctx.fillStyle = '#65d2ff'; ctx.beginPath(); ctx.ellipse(x + w * 0.43, ground - 4, w * 0.13, 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
}
function drawPothole(x, ground, w, h) {
  drawGroundShadow(x, ground, w);
  drawObstacleHalo(x + w / 2, ground - 1, w * 0.60, h * 1.30, 0.15);
  // bright painted rim for visibility
  ctx.strokeStyle = '#ff9b2f'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(x + w / 2, ground - 1, w * 0.52, h * 0.92 + 2, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#fff5c5'; ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.ellipse(x + w / 2, ground - 1, w * 0.42, h * 0.68 + 1, 0, 0, Math.PI * 2); ctx.stroke();
  const g = ctx.createRadialGradient(x + w / 2, ground - 3, 2, x + w / 2, ground - 3, w * 0.55);
  g.addColorStop(0, '#08080f'); g.addColorStop(1, '#2d2d42');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x + w / 2, ground - 1, w * 0.46, h * 0.78, 0, 0, Math.PI * 2); ctx.fill();
}

function drawSpeedLines() {
  if (!gameRunning) return;
  const cycle = getDayCycle();
  const alpha = Math.min(0.18, 0.035 + speed * 0.012);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = cycle.nightAmount > 0.55 ? '#c8d7ff' : '#ffffff';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 7; i++) {
    const x = (W - ((frameCount * (2 + i * 0.25) + i * 67) % (W + 90)));
    const y = 55 + ((i * 31 + frameCount * 0.35) % 120);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 20 - i * 3, y + 1);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPremiumVignette() {
  const cycle = getDayCycle();
  const g = ctx.createRadialGradient(W / 2, H / 2, 80, W / 2, H / 2, 250);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.72, 'rgba(0,0,0,0)');
  g.addColorStop(1, cycle.nightAmount > 0.55 ? 'rgba(0,0,0,0.34)' : 'rgba(0,0,0,0.16)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function drawLevelBanner() {
  if (levelBannerFrames <= 0) return;
  const fade = Math.min(1, levelBannerFrames / 18);
  const pop = 1 + Math.sin((105 - levelBannerFrames) * 0.18) * 0.035;
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.translate(W / 2, 76);
  ctx.scale(pop, pop);

  const boxW = 178, boxH = 54;
  const grad = ctx.createLinearGradient(-boxW / 2, -boxH / 2, boxW / 2, boxH / 2);
  grad.addColorStop(0, 'rgba(255,224,48,0.94)');
  grad.addColorStop(1, 'rgba(255,184,0,0.94)');
  rr(-boxW / 2, -boxH / 2, boxW, boxH, 18, grad);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#15120a';
  ctx.font = '900 25px Vazirmatn, Tahoma, Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(levelBannerText, 0, -3);
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  let sx = 0, sy = 0;
  if (shakeFrames > 0) { sx = (Math.random() - 0.5) * shakeMag; sy = (Math.random() - 0.5) * shakeMag; }
  ctx.save(); ctx.translate(sx, sy);
  drawSky();
  drawSunAndMoon();
  drawEnvironmentBackdrop();
  drawWeatherAtmosphere();
  drawRoad();
  drawRoadsideDetails();
  drawStageTwoHeadlightBeam();
  drawParticles();
  obstacles.forEach(drawObstacle);
  drawBus();
  drawSpeedLines();
  drawPremiumVignette();
  ctx.restore();
  drawLevelBanner();
}
function loop(timestamp) {
  if (!gameRunning) return;

  const elapsed = Math.min(timestamp - lastFrameTime, MAX_FRAME_GAP_MS);
  lastFrameTime = timestamp;
  simulationAccumulator += Math.max(0, elapsed);

  while (simulationAccumulator >= SIMULATION_STEP_MS && gameRunning) {
    update();
    simulationAccumulator -= SIMULATION_STEP_MS;
  }

  draw();
  if (gameRunning) animId = requestAnimationFrame(loop);
}
(function idleDraw() { BUS.y = getRoadY(BUS.x); dashes.forEach((d, i) => { d.x = i * DASH_TOTAL; }); draw(); })();
