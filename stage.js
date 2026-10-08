/* Dopamine Tycoon : la scène principale. Une presse hydraulique écrase des objets sur un tapis roulant,
 * et un pop-it arc-en-ciel éclate à chaque tap. Tout est dessiné en direct, style cartoon. */
window.DT = window.DT || {};
(function (DT) {
'use strict';

const OUT = '#1B1029';
const RAINBOW = ['#FF4F79', '#FF9F1C', '#FFD23F', '#5FE0B7', '#4FD8FF', '#7B6CFF', '#C77DFF', '#FF7EB6'];
const GOLD = ['#FFD23F', '#FFB800', '#FFF1A8', '#E6A100', '#FFE066', '#FFC940', '#FFF6CC', '#D99A00'];
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];

let ctx = null, cv = null, W = 400, H = 320, T = 0, S = 60, lw = 3;

/* ---------- Petits outils de dessin ---------- */
function fillStroke(fill, stroke = true) { ctx.fillStyle = fill; ctx.fill(); if (stroke) ctx.stroke(); }
function ell(x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2); }
function circ(x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.1, r), 0, Math.PI * 2); }
function rrect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function shine(x, y, rx, ry, a = 0.45, rot = -0.5) { ctx.fillStyle = `rgba(255,255,255,${a})`; ell(x, y, rx, ry, rot); ctx.fill(); }
function eyes(x, y, gap, r, s) {
  for (const dx of [-gap, gap]) { ctx.fillStyle = OUT; circ(x + dx, y, r); ctx.fill(); ctx.fillStyle = '#fff'; circ(x + dx + r * 0.35, y - r * 0.35, r * 0.35); ctx.fill(); }
  ctx.beginPath(); ctx.arc(x, y + r * 1.2, r * 1.3, 0.2, Math.PI - 0.2); ctx.lineWidth = lw * 0.8; ctx.stroke(); ctx.lineWidth = lw;
}
function heart(x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.35);
  ctx.bezierCurveTo(x - s * 1.1, y - s * 0.35, x - s * 0.45, y - s * 1.05, x, y - s * 0.45);
  ctx.bezierCurveTo(x + s * 0.45, y - s * 1.05, x + s * 1.1, y - s * 0.35, x, y + s * 0.35);
}
function star(x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath();
}

/* ---------- Les objets à écraser (dessinés base au sol, centrés en x) ---------- */
const OBJ = [
  {id: 'duck', name: 'Canard en plastique', hp: 3, h: 0.96, words: ['POUIC !', 'COUIC !'], pal: ['#FFD23F', '#FF9F1C', '#F2B90F'], draw(s, p) {
    ctx.beginPath(); ctx.moveTo(-0.4 * s, -0.4 * s); ctx.lineTo(-0.62 * s, -0.62 * s); ctx.lineTo(-0.3 * s, -0.25 * s); ctx.closePath(); fillStroke(p[0]);
    ell(0, -0.3 * s, 0.48 * s, 0.3 * s); fillStroke(p[0]);
    circ(0.2 * s, -0.72 * s, 0.24 * s); fillStroke(p[0]);
    ell(0.47 * s, -0.67 * s, 0.15 * s, 0.07 * s, 0.1); fillStroke(p[1]);
    ell(-0.06 * s, -0.33 * s, 0.22 * s, 0.12 * s, -0.25); fillStroke(p[2]);
    ctx.fillStyle = OUT; circ(0.28 * s, -0.78 * s, 0.045 * s); ctx.fill(); ctx.fillStyle = '#fff'; circ(0.295 * s, -0.795 * s, 0.017 * s); ctx.fill();
    shine(-0.2 * s, -0.45 * s, 0.13 * s, 0.06 * s); shine(0.12 * s, -0.84 * s, 0.07 * s, 0.035 * s);
  }},
  {id: 'gummy', name: 'Nounours en gélatine', hp: 3, h: 1.07, words: ['SPLOTCH !', 'GLOUP !'], pal: ['#FF3B5C', '#FF93A6', '#D81E45'], draw(s, p) {
    ctx.globalAlpha = 0.95;
    for (const dx of [-0.19, 0.19]) { ell(dx * s, -0.09 * s, 0.14 * s, 0.1 * s); fillStroke(p[0]); }
    ell(-0.3 * s, -0.43 * s, 0.1 * s, 0.17 * s, 0.5); fillStroke(p[0]);
    ell(0.3 * s, -0.43 * s, 0.1 * s, 0.17 * s, -0.5); fillStroke(p[0]);
    ell(0, -0.34 * s, 0.3 * s, 0.3 * s); fillStroke(p[0]);
    for (const dx of [-0.18, 0.18]) { circ(dx * s, -0.98 * s, 0.09 * s); fillStroke(p[0]); }
    circ(0, -0.8 * s, 0.24 * s); fillStroke(p[0]);
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,255,255,.28)'; ell(0, -0.32 * s, 0.17 * s, 0.19 * s); ctx.fill();
    eyes(0, -0.83 * s, 0.09 * s, 0.035 * s, s);
    shine(-0.12 * s, -0.9 * s, 0.07 * s, 0.035 * s); shine(-0.16 * s, -0.45 * s, 0.06 * s, 0.1 * s, 0.35, 0.2);
  }},
  {id: 'donut', name: 'Donut', hp: 4, h: 0.58, words: ['SCRONCH !', 'MIAM !'], pal: ['#E8A35C', '#FF7EB6', '#FFFFFF', '#5FE0B7', '#4FD8FF', '#FFD23F'], draw(s, p) {
    ell(0, -0.27 * s, 0.54 * s, 0.27 * s); fillStroke(p[0]);
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const a = i / 40 * Math.PI * 2, wob = 1 + 0.06 * Math.sin(a * 7);
      const x = Math.cos(a) * 0.47 * s * wob, y = -0.34 * s + Math.sin(a) * 0.2 * s * wob + (Math.sin(a) > 0 ? Math.sin(a * 5) * 0.03 * s : 0);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath(); fillStroke(p[1]);
    ell(0, -0.36 * s, 0.13 * s, 0.055 * s); fillStroke('#6B3A2A');
    const spr = [[-0.3, -0.38, 0.4], [-0.2, -0.46, -0.6], [0.05, -0.49, 0.9], [0.25, -0.44, -0.3], [0.33, -0.33, 1.2], [-0.12, -0.25, 0.2], [0.14, -0.24, -0.9], [-0.35, -0.29, 1.4], [0.22, -0.3, 0.5]];
    spr.forEach(([x, y, r], i) => { ctx.save(); ctx.translate(x * s, y * s); ctx.rotate(r); ctx.fillStyle = p[2 + i % 4]; ctx.fillRect(-0.035 * s, -0.012 * s, 0.07 * s, 0.024 * s); ctx.restore(); });
    shine(-0.25 * s, -0.42 * s, 0.1 * s, 0.035 * s, 0.5, -0.2);
  }},
  {id: 'melon', name: 'Pastèque', hp: 5, h: 0.74, words: ['SPLATCH !', 'SPLOTCH !'], pal: ['#2FBF71', '#1A7F46', '#FF4F5E'], draw(s, p) {
    ell(0, -0.37 * s, 0.55 * s, 0.37 * s); fillStroke(p[0]);
    ctx.save(); ell(0, -0.37 * s, 0.55 * s, 0.37 * s); ctx.clip();
    ctx.strokeStyle = p[1]; ctx.lineWidth = 0.07 * s;
    for (const k of [-0.36, -0.12, 0.12, 0.36]) { ctx.beginPath(); ctx.moveTo(k * s * 0.6, -0.75 * s); ctx.quadraticCurveTo(k * s * 1.7, -0.37 * s, k * s * 0.6, 0); ctx.stroke(); }
    ctx.restore(); ctx.lineWidth = lw; ctx.strokeStyle = OUT;
    ell(0, -0.37 * s, 0.55 * s, 0.37 * s); ctx.stroke();
    shine(-0.24 * s, -0.55 * s, 0.14 * s, 0.06 * s);
  }},
  {id: 'phone', name: 'Smartphone', hp: 4, h: 1.0, words: ['KRRRK !', 'CRAC !'], pal: ['#2B2D42', '#8D99AE', '#4FD8FF', '#FF4F79'], draw(s, p) {
    rrect(-0.3 * s, -1.0 * s, 0.6 * s, 1.0 * s, 0.09 * s); fillStroke(p[0]);
    const g = ctx.createLinearGradient(0, -0.93 * s, 0, -0.08 * s); g.addColorStop(0, p[2]); g.addColorStop(1, '#7B6CFF');
    rrect(-0.25 * s, -0.93 * s, 0.5 * s, 0.84 * s, 0.05 * s); ctx.fillStyle = g; ctx.fill();
    ctx.fillStyle = OUT; rrect(-0.07 * s, -0.92 * s, 0.14 * s, 0.035 * s, 0.02 * s); ctx.fill();
    const ic = ['#FFD23F', '#FF7EB6', '#5FE0B7', '#FF9F1C', '#fff', '#C77DFF'];
    ic.forEach((c, i) => { ctx.fillStyle = c; rrect((-0.19 + (i % 3) * 0.14) * s, (-0.8 + Math.floor(i / 3) * 0.15) * s, 0.1 * s, 0.1 * s, 0.025 * s); ctx.fill(); });
    ctx.fillStyle = '#fff'; heart(0, -0.34 * s, 0.14 * s); ctx.fill();
    ctx.fillStyle = p[3]; circ(0.22 * s, -0.93 * s, 0.07 * s); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = `700 ${0.07 * s}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('99', 0.22 * s, -0.928 * s);
    shine(-0.16 * s, -0.7 * s, 0.03 * s, 0.2 * s, 0.25, 0);
  }},
  {id: 'slime', name: 'Slime', hp: 3, h: 0.72, words: ['SPLOUCH !', 'SHLURP !'], pal: ['#7CFF6B', '#3DDC84', '#C9FFBF'], draw(s, p) {
    ctx.beginPath();
    for (let i = 0; i <= 36; i++) {
      const a = Math.PI + i / 36 * Math.PI, wob = 1 + 0.05 * Math.sin(a * 5 + T * 4);
      const x = Math.cos(a) * 0.52 * s * wob, y = Math.min(0, -0.02 * s + Math.sin(a) * 0.7 * s * wob);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.quadraticCurveTo(0.3 * s, 0.03 * s, 0, 0); ctx.quadraticCurveTo(-0.3 * s, 0.03 * s, -0.52 * s, 0);
    ctx.globalAlpha = 0.95; fillStroke(p[0]); ctx.globalAlpha = 1;
    ctx.fillStyle = p[1]; circ(0.28 * s, -0.12 * s, 0.05 * s); ctx.fill(); circ(-0.33 * s, -0.2 * s, 0.035 * s); ctx.fill();
    eyes(0, -0.42 * s, 0.13 * s, 0.05 * s, s);
    shine(-0.22 * s, -0.55 * s, 0.1 * s, 0.05 * s, 0.6);
  }},
  {id: 'cake', name: 'Cupcake', hp: 4, h: 1.0, words: ['FLOMP !', 'SPLOCH !'], pal: ['#4FD8FF', '#FF7EB6', '#E63946', '#FFFFFF'], draw(s, p) {
    ctx.beginPath(); ctx.moveTo(-0.3 * s, 0); ctx.lineTo(0.3 * s, 0); ctx.lineTo(0.4 * s, -0.42 * s); ctx.lineTo(-0.4 * s, -0.42 * s); ctx.closePath(); fillStroke(p[0]);
    ctx.save(); ctx.clip(); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 0.035 * s;
    for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(k * 0.1 * s, 0); ctx.lineTo(k * 0.125 * s, -0.42 * s); ctx.stroke(); }
    ctx.restore(); ctx.strokeStyle = OUT; ctx.lineWidth = lw;
    ell(0, -0.5 * s, 0.46 * s, 0.14 * s); fillStroke(p[1]);
    ell(0, -0.64 * s, 0.35 * s, 0.12 * s); fillStroke(p[1]);
    ell(0, -0.77 * s, 0.21 * s, 0.1 * s); fillStroke(p[1]);
    ctx.beginPath(); ctx.moveTo(0, -0.9 * s); ctx.quadraticCurveTo(0.05 * s, -1.02 * s, 0.13 * s, -1.03 * s); ctx.stroke();
    circ(0, -0.9 * s, 0.08 * s); fillStroke(p[2]);
    shine(-0.2 * s, -0.55 * s, 0.1 * s, 0.035 * s, 0.55, -0.1); shine(-0.025 * s, -0.93 * s, 0.025 * s, 0.015 * s, 0.8);
  }},
  {id: 'can', name: 'Canette de soda', hp: 3, h: 0.95, words: ['PSCHHH !', 'SCRUNCH !'], pal: ['#E63946', '#FFFFFF', '#C7D0DC'], draw(s, p) {
    rrect(-0.26 * s, -0.9 * s, 0.52 * s, 0.9 * s, 0.07 * s); fillStroke(p[0]);
    ctx.save(); rrect(-0.26 * s, -0.9 * s, 0.52 * s, 0.9 * s, 0.07 * s); ctx.clip();
    ctx.fillStyle = p[1]; ctx.beginPath(); ctx.moveTo(-0.3 * s, -0.42 * s);
    for (let x = -0.3; x <= 0.31; x += 0.05) ctx.lineTo(x * s, (-0.45 + Math.sin(x * 14) * 0.05) * s);
    ctx.lineTo(0.3 * s, -0.32 * s); for (let x = 0.3; x >= -0.31; x -= 0.05) ctx.lineTo(x * s, (-0.35 + Math.sin(x * 14) * 0.05) * s);
    ctx.fill(); ctx.restore();
    ell(0, -0.9 * s, 0.26 * s, 0.06 * s); fillStroke(p[2]);
    ctx.fillStyle = '#fff'; ctx.font = `400 ${0.15 * s}px ${DT.stageFont || 'Impact'}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('DOPA', 0, -0.65 * s);
    shine(-0.16 * s, -0.55 * s, 0.03 * s, 0.25 * s, 0.4, 0);
  }},
  {id: 'crayons', name: 'Crayons de couleur', hp: 4, h: 0.92, words: ['CRAC !', 'CROC !'], pal: ['#FF4F79', '#FFD23F', '#5FE0B7', '#4FD8FF', '#C77DFF'], draw(s, p) {
    const hs = [0.72, 0.84, 0.92, 0.8, 0.68];
    hs.forEach((h, i) => {
      const x = (-0.4 + i * 0.2) * s, w = 0.17 * s;
      rrect(x - w / 2, -h * s + 0.14 * s, w, h * s - 0.14 * s, 0.02 * s); fillStroke(p[i % p.length]);
      ctx.beginPath(); ctx.moveTo(x - w / 2, -h * s + 0.14 * s); ctx.lineTo(x, -h * s); ctx.lineTo(x + w / 2, -h * s + 0.14 * s); ctx.closePath(); fillStroke('#F5D6A8');
      ctx.fillStyle = p[i % p.length]; ctx.beginPath(); ctx.moveTo(x - w * 0.17, -h * s + 0.045 * s); ctx.lineTo(x, -h * s); ctx.lineTo(x + w * 0.17, -h * s + 0.045 * s); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x - w / 2 + 2, -0.3 * s, w - 4, 0.06 * s);
    });
    ctx.fillStyle = '#FFF6E0'; rrect(-0.52 * s, -0.36 * s, 1.04 * s, 0.16 * s, 0.03 * s); fillStroke('#FFF6E0');
  }},
  {id: 'car', name: 'Petite voiture', hp: 5, h: 0.68, words: ['CRUNCH !', 'SKRRR !'], pal: ['#4FD8FF', '#2B2D42', '#FFD23F', '#BFF3FF'], draw(s, p) {
    ctx.beginPath(); ctx.moveTo(-0.28 * s, -0.4 * s); ctx.lineTo(-0.17 * s, -0.66 * s); ctx.lineTo(0.18 * s, -0.66 * s); ctx.lineTo(0.32 * s, -0.4 * s); ctx.closePath(); fillStroke(p[0]);
    ctx.beginPath(); ctx.moveTo(-0.2 * s, -0.42 * s); ctx.lineTo(-0.13 * s, -0.6 * s); ctx.lineTo(0.14 * s, -0.6 * s); ctx.lineTo(0.24 * s, -0.42 * s); ctx.closePath(); fillStroke(p[3]);
    rrect(-0.52 * s, -0.44 * s, 1.04 * s, 0.28 * s, 0.09 * s); fillStroke(p[0]);
    for (const dx of [-0.3, 0.3]) { circ(dx * s, -0.14 * s, 0.14 * s); fillStroke(p[1]); circ(dx * s, -0.14 * s, 0.055 * s); fillStroke(p[2]); }
    ell(0.47 * s, -0.34 * s, 0.04 * s, 0.035 * s); fillStroke(p[2]);
    shine(-0.25 * s, -0.38 * s, 0.14 * s, 0.03 * s, 0.5, 0);
  }},
];

/* ---------- État de la scène ---------- */
const st = {
  obj: null, next: null, slide: 0, belt: 0,
  press: 1,          // 0 = en haut, 1 = au contact ; t = temps depuis le dernier coup
  pt: 1,
  bumps: 0,
  crumbs: [], words: [], floats: [], hearts: [], flat: [],
  pops: [], popFlip: 0, rays: 0, colFx: [], escapes: [],
};
const BOSS_HP = 40, BOSS_TIME = 15;
let sinceBoss = 0, forceBoss = false;
function newObj(boss = false) {
  const def = pick(OBJ);
  const golden = !boss && Math.random() < 0.04;
  const time = BOSS_TIME + (DT.Stage.bossExtra ? DT.Stage.bossExtra() : 0);
  return {def, golden, boss, hp: boss ? BOSS_HP : def.hp, time, scale: boss ? 1.4 : 1, announced: false,
          pal: golden ? GOLD.slice(0, def.pal.length) : def.pal, hits: 0, sq: 0, sqv: 0, x: 0};
}
function nextIsBoss() {
  sinceBoss++;
  const b = forceBoss || sinceBoss >= 30 || (sinceBoss >= 15 && Math.random() < 0.07);
  if (b) { sinceBoss = 0; forceBoss = false; }
  return b;
}
function layout() {
  S = Math.min(W * 0.2, H * 0.27);
  lw = Math.max(2, S * 0.045);
  return {
    cx: W / 2, ground: H * 0.6, beamY: H * 0.04, beamH: S * 0.3,
    trayX: W * 0.06, trayY: H * 0.68, trayW: W * 0.88, trayH: H * 0.28,
  };
}
const POP_COLS = 8, POP_ROWS = 3;
function resetPops() { st.pops = Array.from({length: POP_COLS * POP_ROWS}, () => ({popped: false, t: 1})); }

function init(canvas) {
  cv = canvas; ctx = cv.getContext('2d');
  st.obj = newObj(); st.next = null; resetPops();
}
function resize() {
  const r = cv.getBoundingClientRect(), dpr = Math.min(1.5, devicePixelRatio || 1);
  cvDpr = dpr;
  W = Math.max(1, r.width); H = Math.max(1, r.height);
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function cellAt(L, x, y) {
  const cw = L.trayW / POP_COLS, ch = L.trayH / POP_ROWS;
  const c = Math.floor((x - L.trayX) / cw), r = Math.floor((y - L.trayY) / ch);
  if (c < 0 || r < 0 || c >= POP_COLS || r >= POP_ROWS) return -1;
  return r * POP_COLS + c;
}
function cellCenter(L, i) {
  const cw = L.trayW / POP_COLS, ch = L.trayH / POP_ROWS;
  return [L.trayX + (i % POP_COLS + 0.5) * cw, L.trayY + (Math.floor(i / POP_COLS) + 0.5) * ch];
}

function crumbs(x, y, pal, n, spd = 300) {
  if (DT.stageLite) n = Math.ceil(n / 3);
  for (let i = 0; i < n; i++) {
    const a = rand(Math.PI * 1.05, Math.PI * 1.95), v = rand(spd * 0.3, spd);
    st.crumbs.push({x: x + rand(-S * 0.3, S * 0.3), y, vx: Math.cos(a) * v * rand(0.4, 1.6), vy: Math.sin(a) * v, r: rand(S * 0.03, S * 0.08),
                    rot: rand(0, 6), vr: rand(-12, 12), c: pick(pal), life: rand(0.7, 1.2), tri: Math.random() < 0.4});
  }
}
function word(txt, x, y, big = false, color = '#FFD23F') {
  st.words.push({txt, x, y, rot: rand(-0.25, 0.25), t: 0, big, color});
  if (st.words.length > 8) st.words.shift();
}

/* L'objet sous la presse est écrasé : miettes, onomatopée, puis le suivant arrive sur le tapis. */
function crushObj(L, o, res) {
  res.crushed = true; res.obj = o.def; res.golden = o.golden; res.hp = o.hp; res.boss = o.boss;
  crumbs(L.cx, L.ground - S * 0.2, o.pal, (o.boss ? 90 : 26) + o.def.hp * 4, o.boss ? 700 : 420);
  word(o.boss ? 'BOSS K.O. !' : pick(o.def.words), L.cx + rand(-S * 0.4, S * 0.4), L.ground - S * 0.9, true, o.golden || o.boss ? '#FFD23F' : '#FFFFFF');
  st.flat.push({pal: o.pal, def: o.def, x: 0, t: 0});
  st.next = newObj(nextIsBoss()); st.next.x = W * 0.7; st.obj = null; st.slide = 0;
}
// Colonne du pop-it terminée : flash, vague et étoiles de sa couleur.
function colEffect(L, col, quiet) {
  st.colFx.push({c: col, t: 0});
  const cx = L.trayX + (col + 0.5) * L.trayW / POP_COLS;
  for (let k = 0; k < (DT.stageLite ? 4 : 12); k++) {
    st.crumbs.push({x: cx + rand(-8, 8), y: L.trayY + rand(0, L.trayH), vx: rand(-60, 60), vy: rand(-520, -260), r: rand(S * 0.04, S * 0.07),
                    rot: rand(0, 6), vr: rand(-8, 8), c: RAINBOW[col], life: rand(0.7, 1.1), star: true});
  }
  if (!quiet) word(pick(['COLONNE !', 'CLEAN !', 'SATISFAISANT !', 'PARFAIT !']), cx, L.trayY - 8, false, RAINBOW[col]);
}

/* Un tap : la presse descend, l'objet s'écrase un peu plus, une bulle du pop-it éclate. */
function hit(x, y, crit) {
  const L = layout(), res = {crushed: false, popComplete: false, obj: null, golden: false, hp: 0};
  st.pt = 0;
  const o = st.obj;
  if (o && !st.next) {
    o.hits += crit ? 2 : 1;
    o.sqv -= (crit ? 9 : 5) / (o.boss ? 2 : 1);
    if (o.hits >= o.hp) crushObj(L, o, res);
    else if (Math.random() < (o.boss ? 0.5 : 0.35)) {
      word(pick(['CRSH', 'SQUIIK', 'BONK', 'TCHAK', 'PAF', 'POK']), L.cx + rand(-S, S), L.ground - S * rand(0.9, 1.3));
    }
  }
  // pop-it
  let i = cellAt(L, x, y);
  if (i < 0 || st.pops[i].popped) {
    const left = st.pops.map((p, k) => p.popped ? -1 : k).filter(k => k >= 0);
    i = left.length ? pick(left) : -1;
  }
  if (i >= 0 && st.popFlip <= 0) {
    st.pops[i].popped = true; st.pops[i].t = 0;
    const [px, py] = cellCenter(L, i);
    crumbs(px, py, [RAINBOW[i % POP_COLS]], 4, 120);
    const col = i % POP_COLS;
    if (st.pops.every(p => p.popped)) { res.popComplete = true; st.popFlip = 1; }
    else if (st.pops.every((p, k) => k % POP_COLS !== col || p.popped)) { res.colDone = col; colEffect(L, col); }
  }
  if (crit) word('CRITIQUE !', x, y - 30, true, '#FFD23F');
  return res;
}

/* Méga-Presse : écrase l'objet en cours (boss compris) et éclate toutes les bulles restantes d'un coup.
 * Renvoie le même résultat que hit(), avec la liste des colonnes terminées dans cols. */
function mega() {
  const L = layout(), res = {crushed: false, popComplete: false, obj: null, golden: false, hp: 0, cols: []};
  st.pt = 0;
  if (!st.obj && st.next) { st.obj = st.next; st.obj.x = 0; st.next = null; st.slide = 1; }
  if (st.obj) crushObj(L, st.obj, res);
  if (st.popFlip <= 0) {
    const cols = new Set();
    st.pops.forEach((p, i) => { if (!p.popped) { p.popped = true; p.t = 0; cols.add(i % POP_COLS); } });
    for (const c of cols) colEffect(L, c, true);
    res.cols = [...cols];
    if (cols.size) { res.popComplete = true; st.popFlip = 1; }
  }
  crumbs(L.cx, L.ground - S * 0.3, RAINBOW, 40, 800);
  word('MÉGA-PRESSE !!!', L.cx, H * 0.34, true, '#FF4F79');
  return res;
}
function float(x, y, txt, crit) { st.floats.push({x, y, txt, crit, t: 0}); if (st.floats.length > 24) st.floats.shift(); }
function hearts(n) {
  const L = layout();
  for (let i = 0; i < n; i++) {
    if (st.hearts.length > (DT.stageLite ? 20 : 60)) return;
    const side = Math.random() < 0.5;
    st.hearts.push({x: side ? rand(W * 0.03, W * 0.16) : rand(W * 0.84, W * 0.97), y: L.ground + rand(-10, 10), vy: rand(50, 95), sw: rand(0, 6),
                    s: rand(S * 0.07, S * 0.13), c: pick(RAINBOW), star: Math.random() < 0.3, t: 0});
  }
}

/* ---------- Rendu ---------- */
function draw(dt, env) {
  if (!ctx) return;
  T += dt;
  const L = layout();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = OUT; ctx.lineWidth = lw;

  ensureCache(L, env.rgb);
  // fond et halo pré-dessinés ; les rayons sont une image pré-dessinée qu'on fait simplement pivoter
  ctx.drawImage(cache.back, 0, 0, W, H);
  if (!DT.stageLite) st.rays += dt * 0.12;
  const rc = [L.cx, L.ground - S * 0.5];
  ctx.save(); ctx.translate(rc[0], rc[1]); ctx.rotate(st.rays);
  ctx.drawImage(cache.rays, -cache.R, -cache.R, cache.R * 2, cache.R * 2); ctx.restore();
  ctx.drawImage(cache.glow, 0, 0, W, H);

  // réactions qui montent (cœurs, étoiles), en petites images pré-dessinées
  if (!env.paused) {
    st.bumps += Math.min(DT.stageLite ? 3 : 10, 1.1 * Math.log10(1 + env.dps)) * dt;
    while (st.bumps >= 1) { st.bumps--; hearts(1); }
  }
  for (let i = st.hearts.length - 1; i >= 0; i--) {
    const h = st.hearts[i]; h.t += dt; h.y -= h.vy * dt;
    if (h.y < -20 || h.t > 4) { st.hearts.splice(i, 1); continue; }
    const x = h.x + Math.sin(h.t * 3 + h.sw) * 10;
    ctx.globalAlpha = Math.max(0, Math.min(1, h.t * 4) * Math.min(1, h.y / (H * 0.2)));
    const spr = cache.hearts[(h.star ? '*' : '') + h.c], k = h.s / cache.hb, hh = cache.hh * k;
    if (spr) ctx.drawImage(spr, x - hh, h.y - hh, hh * 2, hh * 2);
  }
  ctx.globalAlpha = 1; ctx.lineWidth = lw;

  // piliers et tapis (pré-dessinés), puis bandes du tapis et rouleaux
  ctx.drawImage(cache.frame, 0, 0, W, H);
  const bx = L.cx - S * 1.55, bw = S * 3.1, bh = S * 0.18;
  if (st.next) st.belt += dt * S * 3;
  ctx.save(); rrect(bx, L.ground, bw, bh, bh / 2); ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 2; ctx.beginPath();
  for (let x = bx - (st.belt % (S * 0.25)); x < bx + bw; x += S * 0.25) { ctx.moveTo(x, L.ground); ctx.lineTo(x - S * 0.08, L.ground + bh); }
  ctx.stroke(); ctx.restore(); ctx.strokeStyle = OUT; ctx.lineWidth = lw;
  for (const x of [bx + bh / 2, bx + bw - bh / 2]) { circ(x, L.ground + bh / 2, bh * 0.32); fillStroke('#8D99AE'); }

  // objets aplatis qui partent à gauche
  for (let i = st.flat.length - 1; i >= 0; i--) {
    const f = st.flat[i]; f.t += dt; f.x -= dt * S * 4 * Math.min(1, f.t * 3);
    if (f.t > 1.2) { st.flat.splice(i, 1); continue; }
    ctx.globalAlpha = Math.max(0, 1 - f.t);
    ell(L.cx + f.x, L.ground - S * 0.04, S * 0.62, S * 0.06); fillStroke(f.pal[0]);
    ctx.globalAlpha = 1;
  }
  // objet courant (+ celui qui arrive)
  if (st.next) {
    st.slide = Math.min(1, st.slide + dt * (st.next.boss ? 1.6 : 3.2));
    const e = 1 - Math.pow(1 - st.slide, 3);
    st.next.x = W * 0.7 * (1 - e);
    if (st.slide >= 1) {
      st.obj = st.next; st.obj.x = 0; st.next = null;
      if (st.obj.boss && !st.obj.announced) { st.obj.announced = true; word('BOSS !', L.cx, L.ground - S * 1.3, true, '#FF4F79'); DT.Stage.onEvent?.('bossSpawn', st.obj); }
    }
  }
  // boss qui s'enfuit
  for (let i = st.escapes.length - 1; i >= 0; i--) {
    const e = st.escapes[i]; e.t += dt;
    if (e.t > 0.8) { st.escapes.splice(i, 1); continue; }
    ctx.save(); ctx.globalAlpha = 1 - e.t / 0.8;
    ctx.translate(L.cx + e.t * e.t * W * 1.5, L.ground - Math.sin(e.t * 18) * 6); ctx.scale(e.o.scale, e.o.scale);
    ctx.lineWidth = lw / e.o.scale; e.o.def.draw(S, e.o.pal); ctx.restore();
  }
  const o = st.obj || st.next;
  let objTop = L.ground;
  if (o) {
    if (o.boss && o === st.obj) {
      o.time -= dt;
      if (o.time <= 0) {
        st.escapes.push({o, t: 0}); st.obj = null;
        st.next = newObj(); st.next.x = W * 0.7; st.slide = 0;
        word("IL S'ÉCHAPPE !", L.cx, L.ground - S * 1.1, true, '#FF4F79');
        DT.Stage.onEvent?.('bossEscape', o);
      }
    }
    const target = Math.min(0.85, o.hits / o.hp * 0.85);
    o.sqv += (target - o.sq) * 180 * dt; o.sqv *= Math.pow(0.001, dt); o.sq += o.sqv * dt;
    o.sq = Math.max(-0.2, Math.min(0.92, o.sq));
    const sy = 1 - o.sq, sx = 1 + o.sq * 0.75, k = o.scale;
    objTop = L.ground - o.def.h * S * sy * k;
    if (o.boss) {
      const pulseA = 0.35 + Math.sin(T * 8) * 0.15;
      const aura = ctx.createRadialGradient(L.cx + o.x, L.ground - S * 0.5 * k, S * 0.2, L.cx + o.x, L.ground - S * 0.5 * k, S * 1.3 * k);
      aura.addColorStop(0, `rgba(255,40,80,${pulseA})`); aura.addColorStop(1, 'rgba(255,40,80,0)');
      ctx.fillStyle = aura; ctx.fillRect(0, 0, W, H);
    }
    ctx.save(); ctx.translate(L.cx + o.x + (o.boss ? Math.sin(T * 30) * 1.5 : 0), L.ground); ctx.scale(sx * k, sy * k);
    ctx.lineWidth = lw / Math.max(0.4, (sx + sy) / 2 * k);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ell(0, 0, S * 0.5, S * 0.06); ctx.fill();
    o.def.draw(S, o.pal);
    ctx.restore(); ctx.lineWidth = lw;
    if (o.golden) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 3; k++) {
        const a = T * 2 + k * 2.1;
        ctx.fillStyle = 'rgba(255,230,120,.8)';
        star(L.cx + o.x + Math.cos(a) * S * 0.6, objTop + S * 0.3 + Math.sin(a) * S * 0.3, S * 0.07); ctx.fill();
      }
      ctx.restore();
    }
  }

  // piston et tête de presse
  st.pt += dt;
  const p = st.pt < 0.05 ? st.pt / 0.05 : st.pt < 0.1 ? 1 : Math.max(0, 1 - (st.pt - 0.1) / 0.28);
  const eased = p * p * (3 - 2 * p);
  const headH = S * 0.2, restY = L.beamY + L.beamH + S * 0.08;
  const contactY = objTop - headH;
  const headY = restY + (Math.max(restY, contactY) - restY) * eased;
  const rodW = S * 0.24;
  const rg = ctx.createLinearGradient(L.cx - rodW / 2, 0, L.cx + rodW / 2, 0);
  rg.addColorStop(0, '#9AA5B5'); rg.addColorStop(0.45, '#F4F7FB'); rg.addColorStop(1, '#8792A2');
  ctx.fillStyle = rg; ctx.fillRect(L.cx - rodW / 2, L.beamY + L.beamH - 2, rodW, headY - L.beamY - L.beamH + 4);
  ctx.strokeRect(L.cx - rodW / 2, L.beamY + L.beamH - 2, rodW, headY - L.beamY - L.beamH + 4);
  rrect(L.cx - S * 0.72, headY, S * 1.44, headH, S * 0.05); fillStroke('#4A5163');
  ctx.fillStyle = '#FFD23F'; ctx.fillRect(L.cx - S * 0.7, headY + headH * 0.62, S * 1.4, headH * 0.22);
  for (const dx of [-0.55, 0.55]) { circ(L.cx + dx * S, headY + headH * 0.32, S * 0.035); fillStroke('#C9D2DE'); }

  // poutre du haut avec bandes de danger (pré-dessinée)
  ctx.drawImage(cache.beam, 0, 0, W, H);

  // barre de vie du boss
  const bo = st.obj && st.obj.boss ? st.obj : null;
  if (bo) {
    const pw2 = Math.min(W * 0.8, S * 2.6), ph = Math.max(34, S * 0.34), px2 = L.cx - pw2 / 2, py2 = Math.max(4, L.beamY - 6);
    rrect(px2, py2, pw2, ph, 10); fillStroke('rgba(27,16,41,.92)');
    ctx.font = `400 ${Math.max(11, ph * 0.3)}px ${DT.stageFont || 'Impact'}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FF4F79'; ctx.fillText(`BOSS · ${bo.def.name.toUpperCase()} GÉANT`, px2 + 10, py2 + ph * 0.3);
    ctx.textAlign = 'right'; ctx.fillStyle = bo.time < 5 && Math.floor(T * 4) % 2 ? '#FF4F79' : '#FFFFFF';
    ctx.fillText(`${Math.max(0, bo.time).toFixed(1)} s`, px2 + pw2 - 10, py2 + ph * 0.3);
    const bw2 = pw2 - 20, hpk = Math.max(0, 1 - bo.hits / bo.hp);
    rrect(px2 + 10, py2 + ph * 0.58, bw2, ph * 0.26, 5); ctx.fillStyle = '#3A2450'; ctx.fill();
    if (hpk > 0) { rrect(px2 + 10, py2 + ph * 0.58, bw2 * hpk, ph * 0.26, 5); ctx.fillStyle = hpk > 0.3 ? '#FF4F79' : '#FFD23F'; ctx.fill(); }
    ctx.lineWidth = 2; rrect(px2 + 10, py2 + ph * 0.58, bw2, ph * 0.26, 5); ctx.stroke(); ctx.lineWidth = lw;
  }

  // miettes (petites images pré-dessinées, juste tournées et agrandies)
  for (let i = st.crumbs.length - 1; i >= 0; i--) {
    const c = st.crumbs[i]; c.life -= dt;
    if (c.life <= 0) { st.crumbs.splice(i, 1); continue; }
    c.vy += 900 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.rot += c.vr * dt;
    ctx.globalAlpha = Math.min(1, c.life * 2.5);
    const sp = crumbSprite(c.star ? 'star' : c.tri ? 'tri' : 'rect', c.c), k = c.r / sp.r0, hh = sp.half * k;
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.rot); ctx.drawImage(sp.cv, -hh, -hh, hh * 2, hh * 2); ctx.restore();
  }
  ctx.globalAlpha = 1; ctx.lineWidth = lw;

  // pop-it
  drawPopit(L, dt);

  // onomatopées
  for (let i = st.words.length - 1; i >= 0; i--) {
    const w = st.words[i]; w.t += dt;
    const life = w.big ? 1.1 : 0.6;
    if (w.t > life) { st.words.splice(i, 1); continue; }
    const k = w.t / life, sc = w.t < 0.08 ? w.t / 0.08 * 1.25 : 1.25 - Math.min(0.25, (w.t - 0.08) * 2);
    const sp = sprite(w.txt, `400 ${Math.round(w.big ? Math.max(22, S * 0.42) : Math.max(13, S * 0.2))}px ${DT.stageFont || 'Impact'}`, w.color, w.big ? 8 : 5);
    // Les grands mots restent entiers dans la scène, même quand elle est étroite.
    const fit = Math.min(1, W * 0.86 / (sp.w * 1.25)), wx = Math.max(sp.w * sc * fit / 2 + 6, Math.min(W - sp.w * sc * fit / 2 - 6, w.x));
    ctx.save(); ctx.translate(wx, w.y - k * 20); ctx.rotate(w.rot * fit); ctx.scale(sc * fit, sc * fit);
    ctx.globalAlpha = k > 0.75 ? (1 - k) / 0.25 : 1;
    ctx.drawImage(sp.cv, -sp.w / 2, -sp.h / 2, sp.w, sp.h);
    ctx.restore();
  }
  // gains flottants
  for (let i = st.floats.length - 1; i >= 0; i--) {
    const f = st.floats[i]; f.t += dt * (f.crit ? 0.8 : 1.1);
    if (f.t > 1) { st.floats.splice(i, 1); continue; }
    const base = f.crit ? 24 : 17, sc = (base + (1 - f.t) * 3) / base;
    const sp = f.sp || (f.sp = sprite(f.txt, `700 ${base}px ${DT.stageMono || 'monospace'}`, f.crit ? '#FFD23F' : '#FFFFFF', 4));
    ctx.globalAlpha = Math.min(1, (1 - f.t) * 1.8);
    ctx.drawImage(sp.cv, f.x - sp.w * sc / 2, f.y - f.t * 60 - sp.h * sc / 2, sp.w * sc, sp.h * sc);
  }
  ctx.globalAlpha = 1; ctx.lineWidth = lw;
}

/* Texte avec contour, dessiné une seule fois dans une petite image puis réutilisé à chaque image. */
const spriteCache = new Map();
function sprite(txt, font, fill, strokeW) {
  const key = txt + '|' + font + '|' + fill + '|' + strokeW;
  let s = spriteCache.get(key);
  if (s) return s;
  const m = document.createElement('canvas').getContext('2d'); m.font = font;
  const size = parseFloat(font.match(/(\d+(?:\.\d+)?)px/)[1]);
  const w = Math.ceil(m.measureText(txt).width + strokeW * 2 + 6), h = Math.ceil(size * 1.35 + strokeW * 2);
  const dpr = Math.min(1.5, devicePixelRatio || 1);
  const cv = document.createElement('canvas'); cv.width = Math.ceil(w * dpr); cv.height = Math.ceil(h * dpr);
  const c = cv.getContext('2d'); c.scale(dpr, dpr);
  c.font = font; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  c.lineWidth = strokeW; c.strokeStyle = OUT; c.strokeText(txt, w / 2, h / 2);
  c.fillStyle = fill; c.fillText(txt, w / 2, h / 2);
  s = {cv, w, h};
  DT.bitmap(cv, b => { s.cv = b; });
  spriteCache.set(key, s);
  if (spriteCache.size > 250) spriteCache.delete(spriteCache.keys().next().value);
  return s;
}

function drawPopit(L, dt) {
  const cw = L.trayW / POP_COLS, ch = L.trayH / POP_ROWS, r = Math.min(cw, ch) * 0.36;
  let flipScale = 1;
  if (st.popFlip > 0) {
    st.popFlip = Math.max(0, st.popFlip - dt * 1.6);
    const k = 1 - st.popFlip;
    flipScale = Math.abs(Math.cos(k * Math.PI));
    if (k >= 0.5 && st.pops.some(p => p.popped)) st.pops.forEach(p => { p.popped = false; p.t = 1; });
  }
  ctx.save();
  ctx.translate(0, L.trayY + L.trayH / 2); ctx.scale(1, Math.max(0.02, flipScale)); ctx.translate(0, -(L.trayY + L.trayH / 2));
  ctx.drawImage(cache.tray, L.trayX - cache.pad, L.trayY - cache.pad, L.trayW + cache.pad * 2, L.trayH + cache.pad * 2);
  // flash des colonnes terminées
  for (let k = st.colFx.length - 1; k >= 0; k--) {
    const f = st.colFx[k]; f.t += dt;
    if (f.t > 0.9) { st.colFx.splice(k, 1); continue; }
    ctx.save(); rrect(L.trayX, L.trayY, L.trayW, L.trayH, ch * 0.45); ctx.clip();
    ctx.fillStyle = `rgba(255,255,255,${0.7 * Math.max(0, 1 - f.t / 0.5)})`;
    ctx.fillRect(L.trayX + f.c * cw, L.trayY, cw, L.trayH);
    const sweep = L.trayY + L.trayH * (1 - f.t / 0.6);
    const sg = ctx.createLinearGradient(0, sweep - ch * 0.5, 0, sweep + ch * 0.5);
    sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,.8)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg; ctx.fillRect(L.trayX + f.c * cw, sweep - ch * 0.5, cw, ch);
    ctx.restore();
  }
  const hf = cache.half;
  st.pops.forEach((p, i) => {
    p.t = Math.min(1, p.t + dt * 5);
    let [x, y] = cellCenter(L, i);
    const fx = st.colFx.find(f => f.c === i % POP_COLS);
    if (fx) {
      const row = Math.floor(i / POP_COLS), k = (fx.t - (POP_ROWS - 1 - row) * 0.07) / 0.3;
      if (k > 0 && k < 1) y -= Math.sin(k * Math.PI) * r * 0.7;
    }
    const ci = i % POP_COLS;
    if (!p.popped) ctx.drawImage(cache.up[ci], x - hf, y - hf, hf * 2, hf * 2);
    else {
      const bn = p.t < 1 ? 1 + Math.sin(p.t * Math.PI) * 0.18 : 1;
      ctx.drawImage(cache.down[ci], x - hf * bn, y - hf * bn, hf * 2 * bn, hf * 2 * bn);
    }
  });
  ctx.restore(); ctx.lineWidth = lw;
}

/* ---------- Calques pré-dessinés : tout ce qui ne bouge pas est dessiné une seule fois ---------- */
let cache = {key: ''}, cvDpr = 1;
const crumbCache = new Map();
function layer(w, h, scale, fn) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w * scale)); c.height = Math.max(1, Math.ceil(h * scale));
  const x = c.getContext('2d'); x.scale(scale, scale);
  const keep = ctx; ctx = x;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = OUT; ctx.lineWidth = lw;
  try { fn(); } finally { ctx = keep; }
  return c;
}
function crumbSprite(shape, color) {
  const key = shape + '|' + color;
  let sp = crumbCache.get(key);
  if (sp) return sp;
  const r0 = Math.max(4, S * 0.08), half = r0 * 1.7 + lw;
  const cv = layer(half * 2, half * 2, cvDpr, () => {
    ctx.translate(half, half); ctx.lineWidth = lw * 0.5; ctx.beginPath();
    if (shape === 'star') star(0, 0, r0 * 1.6);
    else if (shape === 'tri') { ctx.moveTo(0, -r0); ctx.lineTo(r0, r0); ctx.lineTo(-r0, r0); ctx.closePath(); }
    else ctx.roundRect(-r0, -r0 * 0.7, r0 * 2, r0 * 1.4, r0 * 0.4);
    fillStroke(color);
  });
  sp = {cv, r0, half};
  DT.bitmap(cv, b => { sp.cv = b; });
  crumbCache.set(key, sp);
  return sp;
}
function ensureCache(L, rgb) {
  const key = `${W}x${H}:${rgb}:${cvDpr}`;
  if (cache.key === key) return;
  const d = cvDpr;
  const back = layer(W, H, d, () => {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, `rgba(${rgb},1)`); bg.addColorStop(0.62, `rgba(${rgb},0.55)`); bg.addColorStop(1, '#2A1740');
    ctx.fillStyle = '#2A1740'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  });
  const rc = [L.cx, L.ground - S * 0.5];
  const glow = layer(W, H, d, () => {
    const g = ctx.createRadialGradient(rc[0], rc[1], 0, rc[0], rc[1], S * 2.2);
    g.addColorStop(0, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  });
  const R = Math.hypot(W, H);
  const rays = layer(R * 2, R * 2, 0.5, () => {
    ctx.fillStyle = 'rgba(255,255,255,0.09)';
    for (let k = 0; k < 14; k++) { const a = k * Math.PI / 7; ctx.beginPath(); ctx.moveTo(R, R); ctx.arc(R, R, R, a, a + Math.PI / 14); ctx.closePath(); ctx.fill(); }
  });
  const pw = S * 0.17, px = S * 1.05;
  const frame = layer(W, H, d, () => {
    for (const sgn of [-1, 1]) {
      const x = L.cx + sgn * px - pw / 2;
      const g = ctx.createLinearGradient(x, 0, x + pw, 0); g.addColorStop(0, '#7D8898'); g.addColorStop(0.5, '#C9D2DE'); g.addColorStop(1, '#6C7787');
      rrect(x, L.beamY + L.beamH * 0.5, pw, L.ground - L.beamY - L.beamH * 0.5, pw * 0.3); ctx.fillStyle = g; ctx.fill(); ctx.stroke();
    }
    const bx = L.cx - S * 1.55, bw = S * 3.1, bh = S * 0.18;
    rrect(bx, L.ground, bw, bh, bh / 2); fillStroke('#3A3450');
  });
  const beam = layer(W, H, d, () => {
    const bxl = L.cx - px - pw, bwl = (px + pw) * 2;
    rrect(bxl, L.beamY, bwl, L.beamH, S * 0.06); fillStroke('#4A5163');
    ctx.save(); rrect(bxl, L.beamY + L.beamH * 0.62, bwl, L.beamH * 0.38, 0); ctx.clip();
    ctx.fillStyle = '#FFD23F'; ctx.fillRect(bxl, L.beamY, bwl, L.beamH);
    ctx.fillStyle = OUT;
    for (let x = bxl - L.beamH; x < bxl + bwl; x += L.beamH * 0.5) { ctx.beginPath(); ctx.moveTo(x, L.beamY + L.beamH); ctx.lineTo(x + L.beamH * 0.25, L.beamY + L.beamH); ctx.lineTo(x + L.beamH * 0.65, L.beamY); ctx.lineTo(x + L.beamH * 0.4, L.beamY); ctx.fill(); }
    ctx.restore();
    rrect(bxl, L.beamY, bwl, L.beamH, S * 0.06); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `400 ${Math.max(9, L.beamH * 0.36)}px ${DT.stageFont || 'Impact'}`;
    ctx.fillText('PRESSE 3000 T', L.cx, L.beamY + L.beamH * 0.32);
  });
  // pop-it : plateau arc-en-ciel et bulles (bombées / enfoncées) de chaque couleur
  const cw = L.trayW / POP_COLS, ch = L.trayH / POP_ROWS, r = Math.min(cw, ch) * 0.36, pad = lw + 2;
  const tray = layer(L.trayW + pad * 2, L.trayH + pad * 2, d, () => {
    ctx.translate(pad - L.trayX, pad - L.trayY);
    ctx.save(); rrect(L.trayX, L.trayY, L.trayW, L.trayH, ch * 0.45); ctx.clip();
    for (let c = 0; c < POP_COLS; c++) { ctx.fillStyle = RAINBOW[c]; ctx.fillRect(L.trayX + c * cw, L.trayY, cw + 1, L.trayH); }
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(L.trayX, L.trayY, L.trayW, L.trayH * 0.12);
    ctx.restore();
    rrect(L.trayX, L.trayY, L.trayW, L.trayH, ch * 0.45); ctx.lineWidth = lw; ctx.stroke();
  });
  const half = r * 1.3 + lw;
  const up = RAINBOW.map(col => layer(half * 2, half * 2, d, () => {
    const x = half, y = half;
    ctx.lineWidth = lw * 0.55;
    ctx.fillStyle = 'rgba(0,0,0,.28)'; circ(x + r * 0.08, y + r * 0.16, r); ctx.fill();
    circ(x, y, r); fillStroke(col);
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,.85)'); g.addColorStop(0.35, 'rgba(255,255,255,.2)'); g.addColorStop(1, 'rgba(0,0,0,.1)');
    circ(x, y, r); ctx.fillStyle = g; ctx.fill();
  }));
  const down = RAINBOW.map(col => layer(half * 2, half * 2, d, () => {
    const x = half, y = half, rr = r * 0.86;
    circ(x, y, rr); ctx.fillStyle = col; ctx.fill();
    circ(x, y, rr); ctx.fillStyle = 'rgba(20,8,30,.42)'; ctx.fill();
    ctx.save(); circ(x, y, rr); ctx.clip();
    ctx.fillStyle = 'rgba(0,0,0,.35)'; circ(x, y - rr * 0.55, rr); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.22)'; ell(x, y + rr * 0.62, rr * 0.55, rr * 0.2); ctx.fill();
    ctx.restore();
    circ(x, y, rr); ctx.lineWidth = lw * 0.4; ctx.strokeStyle = 'rgba(27,16,41,.55)'; ctx.stroke(); ctx.strokeStyle = OUT;
  }));
  // cœurs et étoiles
  const hb = Math.max(6, S * 0.13), hh = hb * 1.35 + lw, heartsImg = {};
  for (const c of RAINBOW) {
    heartsImg[c] = layer(hh * 2, hh * 2, d, () => { ctx.lineWidth = lw * 0.6; heart(hh, hh, hb); fillStroke(c); });
    heartsImg['*' + c] = layer(hh * 2, hh * 2, d, () => { ctx.lineWidth = lw * 0.6; star(hh, hh, hb * 1.2); fillStroke(c); });
  }
  cache = {key, back, glow, rays, R, frame, beam, tray, pad, up, down, half, hearts: heartsImg, hb, hh};
  const cc = cache;
  for (const k of ['back', 'glow', 'rays', 'frame', 'beam', 'tray']) DT.bitmap(cc[k], b => { if (cache === cc) cc[k] = b; });
  cc.up.forEach((c, i) => DT.bitmap(c, b => { cc.up[i] = b; }));
  cc.down.forEach((c, i) => DT.bitmap(c, b => { cc.down[i] = b; }));
  for (const k of Object.keys(cc.hearts)) DT.bitmap(cc.hearts[k], b => { cc.hearts[k] = b; });
  crumbCache.clear();
}

DT.Stage = {
  init, resize, hit, mega, float, hearts, draw, word,
  crushTarget() { const L = layout(); return [L.cx, L.ground - S * 0.4]; },
  popsLeft: () => st.pops.filter(p => !p.popped).length,
  forceBoss() { forceBoss = true; sinceBoss = 99; },
  get bossActive() { return !!(st.obj && st.obj.boss); },
  onEvent: null,
  bossExtra: null,  // secondes ajoutées au compte à rebours des boss (sagesse Presse renforcée)
  OBJECTS: OBJ,
};

})(window.DT);
