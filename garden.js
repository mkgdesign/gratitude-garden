(() => {
'use strict';

/* ───────────────────────── constants ───────────────────────── */
const KEY = 'gratitude-garden:v1';
const IW = 2000, IH = 1500;          // the painting, in its own pixel space
const HORIZON = 0.42;                // where the hills begin (fraction of painting height)
const CELL = 24;                     // sway mesh cell, painting px
const SEASONS = ['summer', 'winter', 'rain', 'fall'];
const SEASON_NAMES = { summer: 'summer', winter: 'winter', rain: 'rain', fall: 'fall' };
const WIND = { summer: 1, winter: .55, rain: 1.55, fall: 1.3 };
const CLOUD_DRIFT = { summer: 0, winter: 5, rain: 13, fall: 6 };
const THEME = { summer: '#84c4cc', winter: '#b9ccd8', rain: '#5d6b74', fall: '#c9b9a4' };
const SPRITES = [
  { file: 'flower-pink.png', w: 2 }, { file: 'flower-purple.png', w: 2 }, { file: 'flower-daisy.png', w: 2 },
  { file: 'flower-white-b.png', w: 1 }, { file: 'flower-white-c.png', w: 1 }, { file: 'flower-white-outline.png', w: 1 },
];
const BASE = 0.82;                   // sprite px → painting px
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ───────────────────────── helpers ───────────────────────── */
const $ = id => document.getElementById(id);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const ss = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const easeOutBack = x => { const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
function rng(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

/* ───────────────────────── storage ───────────────────────── */
const params = new URLSearchParams(location.search);
const DEMO = parseInt(params.get('demo'), 10) || 0;   // ?demo=12 previews 12 flowers without saving
let state = { season: 'summer', entries: [] };
try {
  const d = JSON.parse(localStorage.getItem(KEY));
  if (d && Array.isArray(d.entries)) {
    state.entries = d.entries.filter(e => e && typeof e.text === 'string' && e.date);
    if (SEASONS.includes(d.season)) state.season = d.season;
  }
} catch (_) { /* first visit, or storage unavailable */ }
if (SEASONS.includes(params.get('season'))) state.season = params.get('season');
function save() {
  if (DEMO) return;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) { /* private mode: garden lasts for this visit */ }
}

document.body.dataset.season = state.season;

/* ───────────────────────── layout ───────────────────────── */
const cv = $('scene'), ctx = cv.getContext('2d');
const off = mk(1, 1), octx = off.getContext('2d');
let W = 0, H = 0, dpr = 1, S = 1, offX = 0, offY = 0;

function layout() {
  W = innerWidth; H = innerHeight; dpr = Math.min(devicePixelRatio || 1, 2);
  for (const c of [cv, off]) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
  S = Math.max(W / IW, H / IH);                       // cover…
  offX = (W - IW * S) / 2;
  offY = (H - IH * S) * 0.6;                          // …keeping the sky/meadow balance of the mockup

  const narrow = W < 700;
  const pw = narrow ? W * 0.86 : clamp(0.355 * IW * S, 300, 780);
  const ph = clamp(0.04 * IH * S, 40, 58);
  const horizonY = offY + HORIZON * IH * S;
  let cy = offY + 0.35 * IH * S;
  cy = clamp(cy, H * 0.14, Math.max(H * 0.14, horizonY - ph));
  const root = document.documentElement.style;
  root.setProperty('--pill-w', pw + 'px');
  root.setProperty('--pill-h', ph + 'px');
  root.setProperty('--pill-top', (cy - ph / 2) + 'px');
  drawPill(pw, ph);
}

/* the pill is drawn like the mockup: a loose loop plus a stray line along the top */
function drawPill(w, h) {
  const r = h / 2, j = rng(11);
  const p = n => (n + (j() - .5) * 1.2).toFixed(1);
  $('pillPath').setAttribute('d',
    `M${p(r * 1.2)} ${p(1)} C${p(r * .35)} ${p(0)} ${p(0)} ${p(r * .5)} ${p(1)} ${p(r)} ` +
    `C${p(2)} ${p(h - r * .45)} ${p(r * .4)} ${p(h)} ${p(r * 1.2)} ${p(h - 1)} ` +
    `L${p(w - r * 1.1)} ${p(h)} C${p(w - r * .3)} ${p(h)} ${p(w)} ${p(h - r * .5)} ${p(w - 1)} ${p(r)} ` +
    `C${p(w)} ${p(r * .45)} ${p(w - r * .3)} ${p(1)} ${p(w - r * 1.1)} ${p(1)} L${p(r * 1.6)} ${p(0)}`);
  $('pillTop').setAttribute('d', `M${p(r * 1.05)} -4.5 L${p(w - r * .55)} -3.5`);
}

/* ───────────────────────── painted seasons ───────────────────────── */
/* colour grading with blend modes only (no pixel read-back, so it also works from file://) */
const SKY_GRADE = {
  summer: [],
  winter: [['saturation', '#808080', .45], ['screen', '#dce8f0', .3]],
  rain:   [['saturation', '#808080', .55], ['multiply', '#7f8f99', .85], ['color', '#56666f', .35]],
  fall:   [['color', '#f0b48c', .55], ['screen', '#ffe2c4', .26]],
};
const LAND_GRADE = {
  summer: [],
  winter: [['saturation', '#808080', .5], ['color', '#9db8c8', .22], ['screen', '#d6e4ec', .2]],
  rain:   [['saturation', '#808080', .3], ['color', '#4a6a62', .3], ['multiply', '#9fb0b0', .7]],
  fall:   [['color', '#d4801f', .82], ['soft-light', '#ffb84d', .5]],
};
function grade(img, layers) {
  const c = mk(IW, IH), g = c.getContext('2d');
  g.drawImage(img, 0, 0, IW, IH);
  for (const [mode, col, a] of layers) {
    g.globalCompositeOperation = mode; g.globalAlpha = a; g.fillStyle = col; g.fillRect(0, 0, IW, IH);
  }
  g.globalCompositeOperation = 'destination-in'; g.globalAlpha = 1; g.drawImage(img, 0, 0, IW, IH);
  g.globalCompositeOperation = 'source-over';
  return c;
}

/* brushy sky weather, in the same loose stroke language as the painting:
   soft billowing masses first, then fine dry-brush strokes on top */
const CLOUDS = {
  rain:   { masses: 80, mc: ['#2c353e', '#3a444e', '#48535d', '#56626b'], ma: [.12, .26], rx: [220, 560], ry: [50, 130],
            strokes: 1700, sc: ['#222b33', '#38424c', '#56626b', '#7b8a94', '#8c9aa3'], sa: [.1, .3], lw: [3, 15], len: [50, 230] },
  winter: { masses: 46, mc: ['#eef4f8', '#dbe6ed', '#c9d8e1'], ma: [.1, .22], rx: [200, 480], ry: [40, 100],
            strokes: 380, sc: ['#ffffff', '#e6eff4', '#c4d3dc'], sa: [.05, .15], lw: [3, 13], len: [50, 200] },
  fall:   { masses: 26, mc: ['#fff1e0', '#f8dcc4', '#ffffff'], ma: [.08, .18], rx: [160, 380], ry: [28, 70],
            strokes: 130, sc: ['#fff6ea', '#f5d3b4', '#ffffff'], sa: [.05, .14], lw: [3, 11], len: [50, 180] },
};
function paintClouds(season) {
  const cfg = CLOUDS[season]; if (!cfg) return null;
  const h = Math.round(IH * .5), c = mk(IW, h), g = c.getContext('2d'), r = rng(season.length * 977 + 5);
  const pick = a => a[Math.floor(r() * a.length)], range = a => lerp(a[0], a[1], r());
  for (let i = 0; i < cfg.masses; i++) {
    const x = r() * IW, y = Math.pow(r(), season === 'rain' ? 1.15 : 1.6) * h * .85, rx = range(cfg.rx), ry = range(cfg.ry);
    const col = pick(cfg.mc), al = range(cfg.ma);
    for (const dx of [-IW, 0, IW]) {                         // wrap, so the sky can drift forever
      g.save(); g.translate(x + dx, y); g.scale(rx, ry);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1);
      gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalAlpha = al; g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 1, 0, 7); g.fill(); g.restore();
    }
  }
  g.lineCap = 'round';
  for (let i = 0; i < cfg.strokes; i++) {
    const x = r() * IW, y = Math.pow(r(), season === 'rain' ? 1.1 : 1.5) * h * .92, len = range(cfg.len), tilt = (r() - .5) * .22;
    g.strokeStyle = pick(cfg.sc); g.globalAlpha = range(cfg.sa); g.lineWidth = range(cfg.lw);
    for (const dx of [-IW, 0, IW]) {
      g.beginPath(); g.moveTo(x + dx, y);
      g.quadraticCurveTo(x + dx + len / 2, y + len * tilt / 2 + (r() - .5) * len * .1, x + dx + len, y + len * tilt);
      g.stroke();
    }
  }
  g.globalAlpha = 1; g.globalCompositeOperation = 'destination-in';   // melt into the horizon
  const f = g.createLinearGradient(0, h * .7, 0, h);
  f.addColorStop(0, '#000'); f.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = f; g.fillRect(0, 0, IW, h);
  return c;
}
function snowPatches(g) {
  g.globalCompositeOperation = 'source-atop'; g.lineCap = 'round';
  const r = rng(77);
  for (let i = 0; i < 80; i++) {
    const v = HORIZON + .06 + .48 * Math.pow(r(), .9), k = v - HORIZON;
    if (v > .86 && r() < .7) continue;
    const cx = r() * IW, cy = v * IH, rx = 30 + 190 * k * (.5 + r()), ry = rx * (.15 + r() * .1);
    g.save(); g.translate(cx, cy); g.scale(rx, ry);                    // soft drift body…
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1);
    gr.addColorStop(0, 'rgba(246,250,252,.8)'); gr.addColorStop(.7, 'rgba(240,247,251,.5)'); gr.addColorStop(1, 'rgba(240,247,251,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 1, 0, 7); g.fill(); g.restore();
    for (let j = 0, n = 14 + Math.floor(34 * k); j < n; j++) {         // …dry-brush strokes on top
      const a = r() * 6.28, d = Math.sqrt(r()), len = 16 + rx * .3 * r();
      const px = cx + Math.cos(a) * rx * d * .95, py = cy + Math.sin(a) * ry * d * .95;
      g.strokeStyle = r() < .5 ? 'rgba(250,252,254,.82)' : 'rgba(224,236,244,.7)'; g.lineWidth = 2 + 7 * k * r();
      g.beginPath(); g.moveTo(px, py); g.lineTo(px + len, py + (r() - .5) * len * .25); g.stroke();
    }
  }
  g.globalCompositeOperation = 'source-over';
}
function puddles(g) {
  g.globalCompositeOperation = 'source-atop';
  const r = rng(31);
  for (let i = 0; i < 9; i++) {
    const v = .6 + .3 * r(), x = r() * IW, y = v * IH, w = 60 + 220 * (v - .5), h = w * .13;
    g.fillStyle = 'rgba(140,168,184,.42)'; g.beginPath(); g.ellipse(x, y, w, h, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(225,238,245,.5)'; g.lineWidth = 3; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x - w * .5, y - h * .25); g.lineTo(x + w * .2, y - h * .3); g.stroke();
  }
  g.globalCompositeOperation = 'source-over';
}

const sets = {};
function buildSets(bg, hills) {
  for (const s of SEASONS) {
    const land = grade(hills, LAND_GRADE[s]);
    if (s === 'winter') snowPatches(land.getContext('2d'));
    if (s === 'rain') puddles(land.getContext('2d'));
    sets[s] = { sky: grade(bg, SKY_GRADE[s]), hills: land, clouds: paintClouds(s) };
  }
}

/* ───────────────────────── wind ───────────────────────── */
let windNow = 1, wx = 0, wy = 0;
/* one field drives grass and flowers, so heads move with the blades around them */
function wind(u, v, t) {
  const k = ss((v - HORIZON) / .5);
  const amp = (1.4 + 14 * Math.pow(k, 1.15)) * windNow * (REDUCED ? .25 : 1);
  const gust = Math.sin(t * .55 - u * 4.2 + Math.sin(t * .21 + v * 2) * 1.2);
  const sway = Math.sin(t * 1.25 - u * 9 - v * 6 + gust);
  const flut = Math.sin(t * 2.3 + u * 31 + v * 23);
  wx = amp * (.35 + .55 * gust + .3 * sway + .1 * flut);
  wy = amp * .12 * (.7 * sway + .3 * flut);
}

/* ───────────────────────── scene ───────────────────────── */
function renderScene(g, set, t) {
  g.setTransform(dpr * S, 0, 0, dpr * S, dpr * offX, dpr * offY);
  g.drawImage(set.sky, 0, 0);
  if (set.clouds) {
    const sp = (t * (CLOUD_DRIFT[curOf(set)] || 0)) % IW;
    g.drawImage(set.clouds, -sp, 0); g.drawImage(set.clouds, IW - sp, 0);
  }
  g.drawImage(set.hills, 0, 0);                       // steady underlay, so the mesh never shows gaps
  const y0 = Math.floor(HORIZON * .94 * IH / CELL) * CELL;
  for (let y = y0; y < IH; y += CELL) {
    const sh = Math.min(CELL + 2, IH - y), v = (y + CELL / 2) / IH;
    for (let x = 0; x < IW; x += CELL) {
      wind((x + CELL / 2) / IW, v, t);
      const sw = Math.min(CELL + 2, IW - x);
      g.drawImage(set.hills, x, y, sw, sh, x + wx, y + wy, sw, sh);
    }
  }
}
const curOf = set => SEASONS.find(s => sets[s] === set);

function tint(g, season) {
  g.setTransform(dpr * S, 0, 0, dpr * S, dpr * offX, dpr * offY);
  if (season === 'rain') {
    const f = g.createLinearGradient(0, IH * .36, 0, IH * .64);
    f.addColorStop(0, 'rgba(176,192,198,0)'); f.addColorStop(.45, 'rgba(176,192,198,.3)'); f.addColorStop(1, 'rgba(176,192,198,0)');
    g.fillStyle = f; g.fillRect(-IW, 0, IW * 3, IH);
    g.fillStyle = 'rgba(28,44,58,.1)'; g.fillRect(-IW, -IH, IW * 3, IH * 3);
  } else if (season === 'winter') {
    g.fillStyle = 'rgba(236,244,250,.07)'; g.fillRect(-IW, -IH, IW * 3, IH * 3);
  } else if (season === 'fall') {
    g.fillStyle = 'rgba(255,170,70,.05)'; g.fillRect(-IW, -IH, IW * 3, IH * 3);
  }
}

/* ───────────────────────── seasons: state + UI ───────────────────────── */
let season = state.season, trans = null;
const signs = [...document.querySelectorAll('.sign')], signLabel = $('signLabel');
let labelTimer = 0;
function showLabel(name, hold) {
  clearTimeout(labelTimer);
  signLabel.textContent = SEASON_NAMES[name]; signLabel.classList.add('show');
  if (hold) labelTimer = setTimeout(() => signLabel.classList.remove('show'), hold);
}
function setSeason(id, animate) {
  if (animate && id !== season) trans = { from: season, t0: performance.now() };
  season = state.season = id;
  document.body.dataset.season = id;
  document.querySelector('meta[name=theme-color]').content = THEME[id];
  signs.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.season === id)));
}
signs.forEach(b => {
  b.addEventListener('click', () => { setSeason(b.dataset.season, true); save(); showLabel(b.dataset.season, 1500); });
  b.addEventListener('mouseenter', () => showLabel(b.dataset.season));
  b.addEventListener('focus', () => showLabel(b.dataset.season));
  b.addEventListener('mouseleave', () => signLabel.classList.remove('show'));
  b.addEventListener('blur', () => signLabel.classList.remove('show'));
});

/* ───────────────────────── weather particles (screen space) ───────────────────────── */
const parts = { rain: [], snow: [], leaf: [], mote: [] };
const inten = { rain: 0, snow: 0, leaf: 0, mote: 0 };
const PART_OF = { summer: 'mote', winter: 'snow', rain: 'rain', fall: 'leaf' };
const LEAF_COLS = ['#d9701c', '#c2491d', '#e8a42a', '#a8381a', '#e6c13a', '#b8601a'];
function seedParticles() {
  const area = clamp(W * H / 1.3e6, .5, 2.2), r = Math.random;
  parts.rain = Array.from({ length: Math.round(300 * area) }, () => ({ x: r() * W, y: r() * H, d: r(), }));
  parts.snow = Array.from({ length: Math.round(150 * area) }, () => ({ x: r() * W, y: r() * H, r: 1.1 + r() * 2.6, vy: 22 + r() * 40, ph: r() * 6.3, a: .5 + r() * .45 }));
  parts.leaf = Array.from({ length: Math.round(34 * area) }, () => ({ x: r() * W, y: r() * H, s: 6 + r() * 6, vy: 30 + r() * 40, ph: r() * 6.3, rot: r() * 6.3, vr: (r() - .5) * 3, col: LEAF_COLS[Math.floor(r() * LEAF_COLS.length)] }));
  parts.mote = Array.from({ length: Math.round(30 * area) }, () => ({ x: r() * W, y: H * (.25 + r() * .7), r: .9 + r() * 1.7, ph: r() * 6.3, vx: 8 + r() * 14 }));
}
function drawParticles(g, t, dt) {
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  for (const k in inten) inten[k] += ((PART_OF[season] === k ? 1 : 0) - inten[k]) * Math.min(1, dt * 2.2);
  const gust = Math.sin(t * .55) * .5 + .5;

  if (inten.rain > .01) {
    const slant = .14 + .12 * gust; g.lineCap = 'round';
    for (const p of parts.rain) {
      const vy = 620 + 520 * p.d, vx = vy * slant;
      p.x += vx * dt; p.y += vy * dt;
      if (p.y > H + 20 || p.x > W + 40) { p.y = -20 - Math.random() * 60; p.x = Math.random() * (W + 40) - 40; }
      g.strokeStyle = `rgba(212,226,236,${(.14 + .3 * p.d) * inten.rain})`; g.lineWidth = .7 + .9 * p.d;
      g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - vx * .02, p.y - vy * .02); g.stroke();
    }
  }
  if (inten.snow > .01) {
    for (const p of parts.snow) {
      p.x += (Math.sin(t * .8 + p.ph) * 16 + 7 + gust * 14) * dt; p.y += p.vy * dt;
      if (p.y > H + 6) { p.y = -6; p.x = Math.random() * W; }
      if (p.x > W + 6) p.x = -6;
      g.fillStyle = `rgba(255,255,255,${p.a * inten.snow})`;
      g.beginPath(); g.ellipse(p.x, p.y, p.r, p.r * .86, p.ph, 0, 7); g.fill();
    }
  }
  if (inten.leaf > .01) {
    g.globalAlpha = inten.leaf;
    for (const p of parts.leaf) {
      p.x += (26 + 40 * gust + Math.sin(t * 1.6 + p.ph) * 24) * dt; p.y += (p.vy + Math.sin(t * 2.1 + p.ph) * 14) * dt; p.rot += p.vr * dt;
      if (p.y > H + 12) { p.y = -12; p.x = Math.random() * W - 40; }
      if (p.x > W + 12) p.x = -12;
      g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.scale(1, .45 + .55 * Math.abs(Math.cos(t * 1.4 + p.ph)));
      g.fillStyle = p.col; g.beginPath(); g.moveTo(-p.s, 0); g.quadraticCurveTo(0, -p.s * .8, p.s, 0); g.quadraticCurveTo(0, p.s * .8, -p.s, 0); g.fill();
      g.strokeStyle = 'rgba(90,40,10,.35)'; g.lineWidth = .8; g.beginPath(); g.moveTo(-p.s, 0); g.lineTo(p.s * .8, 0); g.stroke();
      g.restore();
    }
    g.globalAlpha = 1;
  }
  if (inten.mote > .01) {
    for (const p of parts.mote) {
      p.x += (p.vx + Math.sin(t * .6 + p.ph) * 6) * dt; p.y += Math.sin(t * .9 + p.ph) * 8 * dt;
      if (p.x > W + 8) { p.x = -8; p.y = H * (.25 + Math.random() * .7); }
      const tw = .55 + .45 * Math.sin(t * 1.7 + p.ph);
      g.fillStyle = `rgba(255,250,200,${.16 * inten.mote * tw})`; g.beginPath(); g.arc(p.x, p.y, p.r * 3, 0, 7); g.fill();
      g.fillStyle = `rgba(255,252,225,${.75 * inten.mote * tw})`; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.fill();
    }
  }
}

/* ───────────────────────── flowers ───────────────────────── */
const sprites = [];
let flowers = [];                                     // runtime wrappers around state.entries
const rings = [];
const typeBag = SPRITES.flatMap((s, i) => Array(s.w).fill(i));
let selected = null, hover = null;

function place() {
  const uMin = Math.max(.04, -offX / (IW * S) + .04), uMax = Math.min(.96, (W - offX) / (IW * S) - .04);
  const vMax = Math.min(.9, (H * .94 - offY) / (IH * S)), vMin = .56;
  let best = null, bestD = -1;
  for (let i = 0; i < 36; i++) {
    const u = lerp(uMin, uMax, Math.random()), v = lerp(vMin, Math.max(vMin + .05, vMax), Math.pow(Math.random(), .9));
    let d = 1e9;
    for (const f of flowers) d = Math.min(d, Math.hypot((u - f.e.u) * IW, (v - f.e.v) * IH * 1.5));
    if (d > bestD) { bestD = d; best = { u, v }; }
  }
  return best;
}
function wrap(e, start) {
  return { e, start, hover: 0, pulse: -1e9, hx: 0, hy: 0, r: 0 };
}
function normalise(e) {
  if (typeof e.u !== 'number' || typeof e.v !== 'number') Object.assign(e, place());
  if (typeof e.type !== 'number' || !sprites[e.type]) e.type = typeBag[Math.floor(Math.random() * typeBag.length)];
  if (typeof e.size !== 'number') e.size = .92 + Math.random() * .18;
  if (typeof e.ph !== 'number') e.ph = Math.random() * 6.28;
  if (typeof e.stem !== 'number') e.stem = Math.random() * 14;
  if (typeof e.rot !== 'number') e.rot = (Math.random() - .5) * .6;
  if (!e.id) e.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  return e;
}
function resort() { flowers.sort((a, b) => a.e.v - b.e.v); }

function drawFlower(g, f, t, now) {
  const e = f.e, img = sprites[e.type], age = (now - f.start) / 1500;
  if (age <= 0) { f.r = 0; return; }
  const gr = easeOutBack(Math.min(1, age));
  f.hover += ((hover === f ? 1 : 0) - f.hover) * .18;
  const persp = .78 + .62 * ss((e.v - .5) / .45), sc = persp * e.size * BASE * (1 + .1 * f.hover);
  const bx = e.u * IW, by = e.v * IH;
  wind(e.u, e.v, t);
  const L = (30 + e.stem) * persp * gr, th = wx * .017 + Math.sin(t * 1.15 + e.ph) * .045;
  const hx = bx + wx * .55 + Math.sin(th) * L, hy = by + wy * .4 - Math.cos(th) * L;
  if (gr > .03) {
    const grd = g.createLinearGradient(bx, by, hx, hy + .01);
    grd.addColorStop(0, 'rgba(46,108,44,0)'); grd.addColorStop(.4, 'rgba(46,108,44,.75)'); grd.addColorStop(1, 'rgba(40,98,40,.95)');
    g.strokeStyle = grd; g.lineWidth = 3.2 * persp; g.lineCap = 'round';
    g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(bx + wx * .2, by - L * .55, hx, hy); g.stroke();
  }
  g.save(); g.translate(hx, hy); g.rotate(th * 1.4 + Math.sin(t * .9 + e.ph * 2) * .05 + e.rot); g.scale(sc * gr, sc * gr);
  g.drawImage(img, -img.width / 2, -img.height / 2); g.restore();
  f.hx = hx; f.hy = hy; f.r = Math.max(img.width, img.height) * .5 * sc * .95;
  const pa = (now - f.pulse) / 1300;
  if (pa >= 0 && pa < 1) {
    g.strokeStyle = `rgba(255,255,255,${.85 * (1 - pa)})`; g.lineWidth = 3;
    g.beginPath(); g.arc(hx, hy, f.r * (1.1 + pa * 1.6), 0, 7); g.stroke();
  }
}
function drawRings(g, now) {
  for (let i = rings.length - 1; i >= 0; i--) {
    const q = rings[i], a = (now - q.t0) / 1400;
    if (a > 1) { rings.splice(i, 1); continue; }
    g.strokeStyle = `rgba(255,255,255,${.7 * (1 - a)})`; g.lineWidth = 4 * (1 - a) + 1;
    g.beginPath(); g.ellipse(q.x, q.y, 20 + 90 * ss(a), (20 + 90 * ss(a)) * .35, 0, 0, 7); g.stroke();
  }
}

/* ───────────────────────── frame loop ───────────────────────── */
let last = performance.now();
function frame() {
  const now = performance.now();       // same clock as planting/transition start times
  const t = now / 1000, dt = Math.min(.05, (now - last) / 1000); last = now;
  windNow += (WIND[season] - windNow) * Math.min(1, dt * .8);
  if (trans && now - trans.t0 > 1500) trans = null;

  if (!trans) renderScene(ctx, sets[season], t);
  else {
    renderScene(ctx, sets[trans.from], t); renderScene(octx, sets[season], t);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = ss((now - trans.t0) / 1500);
    ctx.drawImage(off, 0, 0); ctx.globalAlpha = 1;
  }
  ctx.setTransform(dpr * S, 0, 0, dpr * S, dpr * offX, dpr * offY);
  for (const f of flowers) drawFlower(ctx, f, t, now);
  drawRings(ctx, now);
  tint(ctx, season);
  drawParticles(ctx, t, dt);
  if (selected) placeNote();
  requestAnimationFrame(frame);
}

/* ───────────────────────── note on a flower ───────────────────────── */
const note = $('note');
const fmtDate = iso => {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) + ' · ' +
         d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};
let noteTimer = 0, noteW = 0, noteH = 0;
function openNote(f) {
  selected = f; clearTimeout(noteTimer);
  $('noteText').textContent = f.e.text; $('noteDate').textContent = fmtDate(f.e.date);
  note.hidden = false; noteW = note.offsetWidth; noteH = note.offsetHeight;
  placeNote(); void note.offsetWidth; note.classList.add('show');
  f.pulse = performance.now();
}
function closeNote() {
  if (!selected) return;
  selected = null; note.classList.remove('show');
  noteTimer = setTimeout(() => { if (!selected) note.hidden = true; }, 320);
}
function placeNote() {
  const f = selected, x = offX + f.hx * S;
  let y = offY + (f.hy - f.r) * S - 12 - noteH;
  if (y < 10) y = offY + (f.hy + f.r) * S + 14;
  const left = clamp(x - noteW / 2, 10, W - noteW - 10);
  note.style.transform = `translate3d(${left.toFixed(1)}px,${y.toFixed(1)}px,0)`;
}

function pick(mx, my) {
  const ix = (mx - offX) / S, iy = (my - offY) / S;
  for (let i = flowers.length - 1; i >= 0; i--) {
    const f = flowers[i];
    if (f.r && Math.hypot(ix - f.hx, iy - f.hy) <= Math.max(f.r * 1.15, 24 / S)) return f;
  }
  return null;
}
cv.addEventListener('pointermove', ev => {
  hover = pick(ev.clientX, ev.clientY); cv.style.cursor = hover ? 'pointer' : 'default';
});
cv.addEventListener('pointerleave', () => { hover = null; });
cv.addEventListener('click', ev => {
  const f = pick(ev.clientX, ev.clientY);
  if (!f) return closeNote();
  if (f === selected) closeNote(); else openNote(f);
});

/* ───────────────────────── planting ───────────────────────── */
const input = $('gratitude'), hint = $('hint'), countEl = $('count'), live = $('live');
const placeholder = input.placeholder;
let phTimer = 0;
function updateCount() { countEl.textContent = state.entries.length; }
function plant(text) {
  const e = normalise({ text, date: new Date().toISOString() });
  state.entries.push(e);
  const f = wrap(e, performance.now() + 250);
  flowers.push(f); resort(); save(); updateCount();
  rings.push({ x: e.u * IW, y: e.v * IH, t0: performance.now() + 250 });
  closeNote();
  live.textContent = 'Planted a flower for: ' + text;
  input.placeholder = 'planted — a new flower grew'; clearTimeout(phTimer);
  phTimer = setTimeout(() => { input.placeholder = placeholder; }, 2600);
}
$('pill').addEventListener('submit', ev => {
  ev.preventDefault();
  const text = input.value.replace(/\s+/g, ' ').trim();
  if (!text) return;
  plant(text); input.value = ''; hint.classList.remove('show');
});
input.addEventListener('input', () => hint.classList.toggle('show', input.value.trim().length > 0));

/* ───────────────────────── journal modal ───────────────────────── */
const journal = $('journal'), list = $('entries');
let returnFocus = null;
function openJournal() {
  returnFocus = document.activeElement; closeNote();
  list.textContent = '';
  const items = [...flowers].sort((a, b) => new Date(b.e.date) - new Date(a.e.date));
  $('journalSub').textContent = items.length ? `${items.length} ${items.length === 1 ? 'flower' : 'flowers'} so far` : '';
  if (!items.length) {
    const p = document.createElement('li'); p.className = 'empty'; p.textContent = 'nothing planted yet. what are you grateful for today?';
    list.append(p);
  }
  for (const f of items) {
    const li = document.createElement('li'), b = document.createElement('button');
    b.type = 'button'; b.className = 'entry';
    const t = document.createElement('span'), d = document.createElement('span');
    t.className = 't'; t.textContent = f.e.text; d.className = 'd'; d.textContent = fmtDate(f.e.date);
    b.append(t, d);
    b.addEventListener('click', () => { closeJournal(); setTimeout(() => openNote(f), 250); });
    li.append(b); list.append(li);
  }
  journal.hidden = false; list.scrollTop = 0;
  journal.querySelector('.close').focus();
}
function closeJournal() {
  journal.hidden = true;
  if (returnFocus && returnFocus.focus) returnFocus.focus();
}
$('journalBtn').addEventListener('click', openJournal);
journal.addEventListener('click', ev => { if (ev.target.closest('[data-close]')) closeJournal(); });
addEventListener('keydown', ev => {
  if (ev.key !== 'Escape') return;
  if (!journal.hidden) closeJournal(); else closeNote();
});

/* ───────────────────────── boot ───────────────────────── */
const load = src => new Promise((res, rej) => {
  const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('could not load ' + src));
  i.src = 'assets/' + src;
});
const DEMO_TEXT = ['my morning coffee', 'a long walk with my sister', 'the rain finally stopping', 'finishing a hard week',
  'a stranger holding the door', 'fresh sheets', 'my mum’s voice on the phone', 'the smell of cut grass',
  'a song I forgot I loved', 'warm socks', 'friends who check in', 'sunlight on the kitchen floor', 'being able to rest',
  'a good book', 'my dog waiting at the door', 'laughing until it hurt'];

Promise.all([load('meadow-bg.jpg'), load('meadow-hills.png'), ...SPRITES.map(s => load(s.file))]).then(([bg, hills, ...imgs]) => {
  sprites.push(...imgs);
  layout(); buildSets(bg, hills); seedParticles();
  if (DEMO) {
    const now = Date.now();
    state.entries = Array.from({ length: DEMO }, (_, i) => ({ text: DEMO_TEXT[i % DEMO_TEXT.length], date: new Date(now - i * 86400000 * 1.7).toISOString() }));
  }
  const t0 = performance.now();
  state.entries.forEach((e, i) => { normalise(e); flowers.push(wrap(e, t0 + 500 + Math.min(i * 90, 2400))); });
  resort(); updateCount();
  setSeason(season, false); windNow = WIND[season]; for (const k in inten) inten[k] = PART_OF[season] === k ? 1 : 0;
  save();
  requestAnimationFrame(frame);
}).catch(err => {
  document.body.insertAdjacentHTML('beforeend', `<p style="position:fixed;inset:auto 0 40% 0;text-align:center;font:28px var(--hand)">The garden couldn't open (${err.message}). Open garden.html from the gratitude-garden folder.</p>`);
});
let rs = 0;
addEventListener('resize', () => { clearTimeout(rs); rs = setTimeout(() => { layout(); seedParticles(); }, 120); });
})();
