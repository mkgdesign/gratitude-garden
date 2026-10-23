// ─── State ────────────────────────────────────────────────────────────────────
const canvas = document.getElementById('garden');
const ctx = canvas.getContext('2d');
let season = 'summer';
let entries = [];

// ─── Seeded RNG ───────────────────────────────────────────────────────────────
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function seededRand(seed) {
  const fn = mulberry32(seed); fn(); fn();
  return fn;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function r(a, b) { return a + Math.random() * (b - a); }
function ri(a, b) { return Math.floor(r(a, b + 1)); }
function lerp(a, b, t) { return a + (b - a) * t; }

// ─── Resize ───────────────────────────────────────────────────────────────────
function resize() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  paintScene();
}
window.addEventListener('resize', resize);

// ─── Scene ────────────────────────────────────────────────────────────────────
function paintScene() {
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  paintSky(W, H);
  paintSun(W, H);
  paintClouds(W, H);
  paintFarMountains(W, H);
  paintBackHill(W, H);
  paintTrees(W, H);
  paintMidHill(W, H);
  paintForeHill(W, H);
  paintGrass(W, H);
  paintButterflies(W, H);
  paintBirds(W, H);
  paintAllFlowers(W, H);
}

// ─── 1. Sky ───────────────────────────────────────────────────────────────────
function paintSky(W, H) {
  const tops    = { summer: '#4ab8f0', windy: '#6aacdc', rainy: '#5a7e98', winter: '#a0bccc' };
  const bottoms = { summer: '#90d4f8', windy: '#9ac4e4', rainy: '#7898b0', winter: '#c0d4e0' };
  const grad = ctx.createLinearGradient(0, 0, 0, H * 0.58);
  grad.addColorStop(0, tops[season]);
  grad.addColorStop(1, bottoms[season]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const streakCols = ['#c8e8f8', '#dff2ff', '#b8e0f8'];
  for (let i = 0; i < 28; i++) {
    ctx.globalAlpha = r(0.02, 0.055);
    ctx.fillStyle = streakCols[ri(0, 2)];
    ctx.fillRect(0, r(0, H * 0.52), W, r(4, 22));
  }
  ctx.globalAlpha = 1;
}

// ─── 2. Sun ───────────────────────────────────────────────────────────────────
function paintSun(W, H) {
  if (season === 'rainy') return;
  const cx = W * 0.14, cy = H * 0.11;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 130);
  glow.addColorStop(0,    'rgba(255,248,180,0.50)');
  glow.addColorStop(0.25, 'rgba(255,240,140,0.28)');
  glow.addColorStop(0.6,  'rgba(255,235,120,0.08)');
  glow.addColorStop(1,    'rgba(255,230,100,0)');
  ctx.fillStyle = glow;
  ctx.globalAlpha = 1;
  ctx.fillRect(cx - 130, cy - 130, 260, 260);
  ctx.beginPath();
  ctx.arc(cx, cy, season === 'winter' ? 36 : 26, 0, Math.PI * 2);
  ctx.fillStyle = season === 'winter' ? 'rgba(215,228,242,0.65)' : 'rgba(255,250,200,0.80)';
  ctx.globalAlpha = 1;
  ctx.fill();
}

// ─── 3. Clouds ────────────────────────────────────────────────────────────────
function drawFluffyCloud(cx, cy, scale) {
  const puffs = [
    [0,   0,  52], [-52, 22, 38], [52,  24, 36],
    [-28, 36, 42], [28,  34, 44], [-75, 40, 26],
    [75,  42, 24], [-44, 52, 32], [44,  54, 30],
    [0,   58, 40], [-18, 68, 28], [18,  70, 26],
  ];
  puffs.forEach(([dx, dy, rad]) => {
    ctx.beginPath();
    ctx.arc(cx + dx * scale, cy + dy * scale, rad * scale, 0, Math.PI * 2);
    ctx.fillStyle = '#f9f9f8';
    ctx.globalAlpha = r(0.72, 0.96);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + dx * scale, cy + (dy + 9) * scale, (rad - 5) * scale, 0, Math.PI * 2);
    ctx.fillStyle = '#d8dae0';
    ctx.globalAlpha = r(0.10, 0.22);
    ctx.fill();
  });
}

function paintClouds(W, H) {
  if (season === 'rainy') {
    [[W*0.14,H*0.08,1.5],[W*0.52,H*0.06,1.7],[W*0.84,H*0.11,1.3]].forEach(([cx,cy,s]) => {
      for (let i = 0; i < 90; i++) {
        ctx.beginPath();
        ctx.arc(cx + r(-110,110)*s, cy + r(-30,50)*s, r(28,68), 0, Math.PI*2);
        ctx.fillStyle = `rgba(${ri(118,145)},${ri(130,155)},${ri(148,168)},0.65)`;
        ctx.globalAlpha = r(0.4, 0.75);
        ctx.fill();
      }
    });
  } else if (season === 'windy') {
    ctx.save(); ctx.scale(1.9, 0.48);
    drawFluffyCloud(W*0.16/1.9, H*0.12/0.48, 0.88);
    drawFluffyCloud(W*0.58/1.9, H*0.07/0.48, 1.05);
    ctx.restore();
    ctx.save(); ctx.scale(1.7, 0.45);
    drawFluffyCloud(W*0.84/1.7, H*0.15/0.45, 0.80);
    ctx.restore();
  } else {
    drawFluffyCloud(W * 0.16, H * 0.09, 0.92);
    drawFluffyCloud(W * 0.58, H * 0.06, 1.08);
    drawFluffyCloud(W * 0.84, H * 0.12, 0.82);
  }
  ctx.globalAlpha = 1;
}

// ─── 4. Mountains ─────────────────────────────────────────────────────────────
function paintFarMountains(W, H) {
  const hz = H * 0.475;

  // back range — lighter, hazier
  ctx.beginPath();
  ctx.moveTo(-10, hz + 10);
  ctx.bezierCurveTo(W*0.06, hz+10, W*0.11, hz-H*0.09, W*0.17, hz-H*0.09);
  ctx.bezierCurveTo(W*0.23, hz-H*0.09, W*0.27, hz+5,   W*0.33, hz+5);
  ctx.bezierCurveTo(W*0.39, hz+5,   W*0.44, hz-H*0.13, W*0.50, hz-H*0.13);
  ctx.bezierCurveTo(W*0.56, hz-H*0.13, W*0.60, hz+5,   W*0.66, hz+5);
  ctx.bezierCurveTo(W*0.72, hz+5,   W*0.76, hz-H*0.07, W*0.82, hz-H*0.08);
  ctx.bezierCurveTo(W*0.88, hz-H*0.09, W*0.94, hz+8,   W+10,  hz+8);
  ctx.lineTo(W+10, H); ctx.lineTo(-10, H);
  ctx.closePath();
  ctx.fillStyle = '#a0c0b0';
  ctx.globalAlpha = 0.42;
  ctx.fill();

  // front range
  ctx.beginPath();
  ctx.moveTo(-10, hz + 14);
  ctx.bezierCurveTo(W*0.04, hz+14, W*0.09, hz-H*0.05, W*0.16, hz-H*0.055);
  ctx.bezierCurveTo(W*0.23, hz-H*0.06, W*0.28, hz+10, W*0.36, hz+10);
  ctx.bezierCurveTo(W*0.44, hz+10, W*0.49, hz-H*0.09, W*0.55, hz-H*0.09);
  ctx.bezierCurveTo(W*0.61, hz-H*0.09, W*0.65, hz+8,  W*0.73, hz+8);
  ctx.bezierCurveTo(W*0.81, hz+8,  W*0.85, hz-H*0.05, W*0.92, hz-H*0.06);
  ctx.bezierCurveTo(W*0.97, hz-H*0.07, W+10, hz+12, W+10, hz+12);
  ctx.lineTo(W+10, H); ctx.lineTo(-10, H);
  ctx.closePath();
  ctx.fillStyle = '#8aaa98';
  ctx.globalAlpha = 0.52;
  ctx.fill();

  // horizon haze
  const haze = ctx.createLinearGradient(0, hz - H*0.12, 0, hz + H*0.04);
  haze.addColorStop(0,    'rgba(168,218,240,0)');
  haze.addColorStop(0.65, 'rgba(158,210,234,0.22)');
  haze.addColorStop(1,    'rgba(148,204,228,0.48)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, hz - H*0.12, W, H*0.16);
  ctx.globalAlpha = 1;
}

// ─── 5. Back hill ─────────────────────────────────────────────────────────────
function paintBackHill(W, H) {
  ctx.beginPath();
  ctx.moveTo(-10, H);
  ctx.bezierCurveTo(W*0.04, H*0.45, W*0.40, H*0.37, W*0.72, H*0.40);
  ctx.bezierCurveTo(W*0.88, H*0.42, W*0.96, H*0.46, W+10,   H*0.48);
  ctx.lineTo(W+10, H); ctx.closePath();
  const g = ctx.createLinearGradient(0, H*0.37, 0, H*0.70);
  g.addColorStop(0, '#7abf55');
  g.addColorStop(1, '#8dd060');
  ctx.fillStyle = g;
  ctx.globalAlpha = 1;
  ctx.fill();
}

// ─── 6. Trees ─────────────────────────────────────────────────────────────────
function paintRoundTree(x, y, trunkH, canopyR) {
  const tw = Math.max(7, canopyR * 0.13);
  ctx.fillStyle = '#7a5028';
  ctx.globalAlpha = 0.88;
  ctx.fillRect(x - tw / 2, y - trunkH, tw, trunkH + 6);

  ctx.beginPath();
  ctx.arc(x, y - trunkH, canopyR * 0.96, 0, Math.PI * 2);
  ctx.fillStyle = '#326018';
  ctx.globalAlpha = 0.88;
  ctx.fill();

  const cols = ['#3a7020','#488028','#569030','#64a038','#489026','#3c7822'];
  for (let i = 0; i < 110; i++) {
    const angle = r(0, Math.PI * 2);
    const dist  = r(0, canopyR * 0.88);
    ctx.beginPath();
    ctx.arc(
      x + Math.cos(angle) * dist,
      y - trunkH + Math.sin(angle) * dist * 0.86,
      r(canopyR * 0.17, canopyR * 0.44),
      0, Math.PI * 2
    );
    ctx.fillStyle = cols[ri(0, cols.length - 1)];
    ctx.globalAlpha = r(0.48, 0.82);
    ctx.fill();
  }
  for (let i = 0; i < 24; i++) {
    const angle = r(-Math.PI * 0.85, -Math.PI * 0.15);
    const dist  = r(canopyR * 0.25, canopyR * 0.72);
    ctx.beginPath();
    ctx.arc(
      x + Math.cos(angle) * dist,
      y - trunkH + Math.sin(angle) * dist * 0.86,
      r(canopyR * 0.10, canopyR * 0.26),
      0, Math.PI * 2
    );
    ctx.fillStyle = '#80c844';
    ctx.globalAlpha = r(0.18, 0.42);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function paintPineTree(x, y, h) {
  ctx.fillStyle = '#6a4020';
  ctx.globalAlpha = 0.82;
  ctx.fillRect(x - 3, y - h * 0.14, 7, h * 0.16);

  const tiers = 4;
  for (let t = 0; t < tiers; t++) {
    const progress = t / (tiers - 1);
    const baseY = y - h * (0.08 + t * 0.23);
    const halfW = h * (0.28 - progress * 0.12);
    const tierH = h * 0.27;
    const shade = [38, 44, 38, 32][t];
    ctx.beginPath();
    ctx.moveTo(x, baseY - tierH);
    ctx.lineTo(x + halfW, baseY + 4);
    ctx.lineTo(x - halfW, baseY + 4);
    ctx.closePath();
    ctx.fillStyle = `rgb(${40+shade},${72+shade},${30+shade})`;
    ctx.globalAlpha = r(0.78, 0.92);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, baseY - tierH);
    ctx.lineTo(x + halfW * 0.30, baseY - tierH * 0.45);
    ctx.lineTo(x, baseY - tierH * 0.12);
    ctx.closePath();
    ctx.fillStyle = '#5aaa38';
    ctx.globalAlpha = 0.22;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function paintTrees(W, H) {
  paintRoundTree(W * 0.76, H * 0.455, 88, 64);
  paintRoundTree(W * 0.11, H * 0.525, 55, 40);
  paintPineTree(W * 0.033, H * 0.545, 82);
  paintPineTree(W * 0.070, H * 0.528, 96);
  paintPineTree(W * 0.885, H * 0.505, 62);
}

// ─── 7. Mid hill ──────────────────────────────────────────────────────────────
function paintMidHill(W, H) {
  ctx.beginPath();
  ctx.moveTo(-10, H);
  ctx.bezierCurveTo(W*0.18, H*0.57, W*0.55, H*0.52, W+10, H*0.58);
  ctx.lineTo(W+10, H); ctx.closePath();
  const g = ctx.createLinearGradient(0, H*0.52, 0, H*0.78);
  g.addColorStop(0, '#8cd060');
  g.addColorStop(1, '#98dc6e');
  ctx.fillStyle = g;
  ctx.globalAlpha = 1;
  ctx.fill();
}

// ─── 8. Fore hill ─────────────────────────────────────────────────────────────
function paintForeHill(W, H) {
  ctx.beginPath();
  ctx.moveTo(-10, H);
  ctx.bezierCurveTo(W*0.22, H*0.65, W*0.62, H*0.61, W+10, H*0.67);
  ctx.lineTo(W+10, H); ctx.closePath();
  const g = ctx.createLinearGradient(0, H*0.61, 0, H);
  g.addColorStop(0, '#98dc6e');
  g.addColorStop(1, '#8acc62');
  ctx.fillStyle = g;
  ctx.globalAlpha = 1;
  ctx.fill();
}

// ─── 9. Grass ─────────────────────────────────────────────────────────────────
function paintGrass(W, H) {
  const windLean = season === 'windy' ? 0.42 : 0;
  const isWinter = season === 'winter';
  const count = isWinter ? 700 : 2800;
  const cols = ['#348018','#409025','#2c7010','#4e9c20','#44901a','#58a82c'];

  for (let i = 0; i < count; i++) {
    const gx   = r(0, W);
    const gy   = r(H * 0.59, H);
    const gh   = r(20, 46);
    const gw   = r(0.7, 2.0);
    const lean = windLean + r(-0.18, 0.18);

    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.bezierCurveTo(
      gx + lean * gh * 0.38, gy - gh * 0.32,
      gx + lean * gh * 0.88, gy - gh * 0.72,
      gx + lean * gh * 1.10, gy - gh
    );
    ctx.strokeStyle  = isWinter ? 'rgba(188,212,192,0.5)' : cols[ri(0, cols.length - 1)];
    ctx.lineWidth    = gw;
    ctx.globalAlpha  = r(0.42, 0.72);
    ctx.stroke();

    if (isWinter && Math.random() < 0.35) {
      ctx.beginPath();
      ctx.arc(gx + lean * gh * 1.10, gy - gh, 2.5, 0, Math.PI * 2);
      ctx.fillStyle   = 'rgba(255,255,255,0.88)';
      ctx.globalAlpha = 0.88;
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

// ─── 10. Butterflies ──────────────────────────────────────────────────────────
function paintButterflies(W, H) {
  if (season === 'rainy' || season === 'winter') return;
  const baseY = season === 'windy' ? 0.27 : 0.47;
  const bflies = [
    {x: W*0.22, y: H*(baseY-0.04)},
    {x: W*0.44, y: H*(baseY+0.06)},
    {x: W*0.64, y: H*(baseY-0.01)},
    {x: W*0.79, y: H*(baseY+0.08)},
  ];
  const wingPals = [
    ['#f5c8d8','#eeb0c0','#f0d8e0','#e8a8b8'],
    ['#f8e8a0','#f0d870','#f5eda0','#e8d060'],
    ['#a8c8f0','#88b0e8','#b0cef5','#90b8ec'],
    ['#d0c8f0','#b8a8e8','#c8bef5','#c0aff0'],
  ];
  bflies.forEach(({x, y}, bi) => {
    const wc = wingPals[bi % wingPals.length];
    const sz = [r(10,15), r(8,12), r(9,13), r(7,11)];
    [[-14,-4,0.7,1.1],[10,-4,0.7,1.1],[-8,2,0.8,0.7],[4,2,0.8,0.7]].forEach(([dx,dy,rx,ry],wi) => {
      ctx.save();
      ctx.translate(x+dx, y+dy);
      ctx.scale(rx, ry);
      ctx.beginPath();
      ctx.ellipse(0, 0, sz[wi], sz[wi]*0.6, wi < 2 ? -0.4 : 0.4, 0, Math.PI*2);
      ctx.fillStyle   = wc[wi];
      ctx.globalAlpha = r(0.6, 0.85);
      ctx.fill();
      ctx.restore();
    });
  });
  ctx.globalAlpha = 1;
}

// ─── 11. Birds ────────────────────────────────────────────────────────────────
function paintBirds(W, H) {
  const defs = [
    {x:W*0.30,y:H*0.12},{x:W*0.36,y:H*0.09},{x:W*0.42,y:H*0.14},
    {x:W*0.65,y:H*0.11},{x:W*0.72,y:H*0.07},
  ];
  ctx.strokeStyle = '#283848';
  defs.forEach(({x, y}) => {
    ctx.lineWidth = r(1, 1.5);
    const span = r(10, 20);
    ctx.beginPath();
    ctx.moveTo(x-span, y);
    ctx.quadraticCurveTo(x-span*0.4, y-r(4,9), x, y+r(1,4));
    ctx.quadraticCurveTo(x+span*0.4, y-r(4,9), x+span, y);
    ctx.globalAlpha = r(0.48, 0.78);
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
}

// ─── Rain / Snow ──────────────────────────────────────────────────────────────
function paintRain(W, H) {
  ctx.strokeStyle = '#88a8bc';
  ctx.lineWidth   = 0.8;
  for (let i = 0; i < 200; i++) {
    const rx = r(0, W), ry = r(0, H);
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.lineTo(rx + 2, ry + r(18, 32));
    ctx.globalAlpha = 0.18;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function paintSnow(W, H) {
  for (let i = 0; i < 150; i++) {
    ctx.beginPath();
    ctx.arc(r(0,W), r(0, H*0.75), r(2, 5), 0, Math.PI*2);
    ctx.fillStyle   = '#ffffff';
    ctx.globalAlpha = r(0.28, 0.68);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ─── User flower painting ─────────────────────────────────────────────────────
function flowerSeedFrom(entry) {
  let h = 0;
  for (const c of entry.id) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

function paintCosmos(c, cx, cy, alpha, rng) {
  const cols = ['#f09ab0','#e888a0','#d87898','#f4b0c8'];
  for (let i = 0; i < 8; i++) {
    const angle = (i/8)*Math.PI*2;
    c.save(); c.translate(cx, cy); c.rotate(angle);
    c.beginPath();
    c.ellipse(0, -16, 5.5, 15, 0, 0, Math.PI*2);
    c.fillStyle   = cols[Math.floor(rng()*cols.length)];
    c.globalAlpha = lerp(0.75, 0.92, rng()) * alpha;
    c.fill(); c.restore();
  }
  c.beginPath(); c.arc(cx, cy, 5.5, 0, Math.PI*2);
  c.fillStyle = '#fff0e8'; c.globalAlpha = alpha; c.fill();
  c.globalAlpha = 1;
}

function paintDaisy(c, cx, cy, alpha, rng) {
  const cols = ['#f0eeea','#e8e4e0','#ffffff','#f8f6f0'];
  for (let i = 0; i < 12; i++) {
    const angle = (i/12)*Math.PI*2;
    c.save(); c.translate(cx, cy); c.rotate(angle);
    c.beginPath();
    c.ellipse(0, -15, 4, 14, 0, 0, Math.PI*2);
    c.fillStyle   = cols[Math.floor(rng()*cols.length)];
    c.globalAlpha = lerp(0.75, 0.95, rng()) * alpha;
    c.fill(); c.restore();
  }
  c.beginPath(); c.arc(cx, cy, 6, 0, Math.PI*2);
  c.fillStyle = '#f0d040'; c.globalAlpha = alpha; c.fill();
  c.globalAlpha = 1;
}

function paintCornflower(c, cx, cy, alpha, rng) {
  const cols = ['#88aae0','#a0b8e8','#7898d0','#90b4ec'];
  for (let i = 0; i < 8; i++) {
    const angle = (i/8)*Math.PI*2;
    c.save(); c.translate(cx, cy); c.rotate(angle);
    c.beginPath();
    c.ellipse(0, -14, 7, 13, 0, 0, Math.PI*2);
    c.fillStyle   = cols[Math.floor(rng()*cols.length)];
    c.globalAlpha = lerp(0.70, 0.90, rng()) * alpha;
    c.fill(); c.restore();
  }
  c.beginPath(); c.arc(cx, cy, 4.5, 0, Math.PI*2);
  c.fillStyle = '#ffffff'; c.globalAlpha = alpha; c.fill();
  c.globalAlpha = 1;
}

function paintFlower(entry, alpha = 1) {
  const W = canvas.width, H = canvas.height;
  const cx = entry.x * W, cy = entry.y * H;
  const rng = seededRand(flowerSeedFrom(entry));

  if (entry.type === 'cosmos')     paintCosmos(ctx, cx, cy, alpha, rng);
  else if (entry.type === 'daisy') paintDaisy(ctx, cx, cy, alpha, rng);
  else                              paintCornflower(ctx, cx, cy, alpha, rng);

  if (season === 'winter') {
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI*2);
    ctx.fillStyle   = 'rgba(255,255,255,0.28)';
    ctx.globalAlpha = 0.28;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function paintAllFlowers(W, H) {
  entries.forEach(e => paintFlower(e, 1));
  if (season === 'rainy') paintRain(W, H);
  if (season === 'winter') paintSnow(W, H);
}

// ─── Animated flower entrance ─────────────────────────────────────────────────
function animateFlower(entry) {
  const duration = 600;
  const start    = performance.now();
  function frame(now) {
    const t = Math.min((now - start) / duration, 1);
    paintScene();
    paintFlower(entry, t);
    if (t < 1) requestAnimationFrame(frame);
    else paintScene();
  }
  requestAnimationFrame(frame);
}

// ─── Hit detection ────────────────────────────────────────────────────────────
canvas.addEventListener('click', (e) => {
  const W    = canvas.width, H = canvas.height;
  const rect = canvas.getBoundingClientRect();
  const mx   = e.clientX - rect.left;
  const my   = e.clientY - rect.top;

  for (const entry of entries) {
    const fx = entry.x * W;
    const fy = entry.y * H;
    if (Math.hypot(mx - fx, my - fy) < 24) {
      showModal(entry, e.clientX, e.clientY);
      return;
    }
  }
});

// ─── Modal — floats above the clicked flower ──────────────────────────────────
const modal     = document.getElementById('modal');
const modalBox  = document.getElementById('modal-box');
const modalText = document.getElementById('modal-text');
const modalDate = document.getElementById('modal-date');

function showModal(entry, screenX, screenY) {
  modalText.textContent = entry.text;
  const d = new Date(entry.date);
  modalDate.textContent = d.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  const boxW = 210;
  let left = screenX - boxW / 2;
  left = Math.max(8, Math.min(window.innerWidth - boxW - 8, left));
  const top = Math.max(70, screenY - 8);

  modalBox.style.left = left + 'px';
  modalBox.style.top  = top + 'px';
  modal.classList.remove('hidden');
}

modal.addEventListener('click', (e) => {
  if (e.target === modal) modal.classList.add('hidden');
});

// ─── Flower placement ─────────────────────────────────────────────────────────
function safeFlowerPosition() {
  const uiXmin = 0.32, uiXmax = 0.68, uiYmin = 0.36, uiYmax = 0.64;
  for (let i = 0; i < 40; i++) {
    const x = r(0.05, 0.95);
    const y = r(0.63, 0.93);
    if (!(x > uiXmin && x < uiXmax && y > uiYmin && y < uiYmax)) return {x, y};
  }
  return {x: r(0.05, 0.32), y: r(0.70, 0.90)};
}

// ─── Input ────────────────────────────────────────────────────────────────────
const input     = document.getElementById('gratitude-input');
const submitBtn = document.getElementById('submit-btn');

function submitEntry() {
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  const types = ['cosmos', 'daisy', 'cornflower'];
  const {x, y} = safeFlowerPosition();
  const entry = {
    id:   Date.now().toString(36) + Math.random().toString(36).slice(2),
    text,
    type: types[Math.floor(Math.random() * 3)],
    x, y,
    date: new Date().toISOString(),
  };
  entries.push(entry);
  saveEntries();
  animateFlower(entry);
}

input.addEventListener('keydown', e => { if (e.key === 'Enter') submitEntry(); });
submitBtn.addEventListener('click', submitEntry);

// ─── Storage ──────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'gratitude_garden_entries';
function saveEntries() { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); }
function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) entries = JSON.parse(raw);
  } catch (_) { entries = []; }
}

// ─── Weather toggle ───────────────────────────────────────────────────────────
document.querySelectorAll('.weather-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelector('.weather-btn.active')?.classList.remove('active');
    btn.classList.add('active');
    season = btn.dataset.season;
    paintScene();
  });
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
loadEntries();
resize();
