/* Dopamine Tycoon : le Casino Dopamine (Fusée, Plinko, Mines, Pile ou face). Tout se joue en nmol du jeu. */
window.DT = window.DT || {};
(function (DT) {
'use strict';

const $ = id => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const fx2 = m => '×' + m.toFixed(2).replace('.', ',');
let api = null, game = 'crash', betIdx = 0;
const EXTRA = {};  // jeux ajoutés par casino2.js
const Q = (t, n) => DT.Extras && DT.Extras.quest(t, n);

/* ---------- Mise commune ---------- */
const BETS = [{l: '1 min', sec: 60}, {l: '10 min', sec: 600}, {l: '1 h', sec: 3600}, {l: 'TAPIS', all: true}];
const betAmt = () => { const b = BETS[betIdx]; return b.all ? Math.floor(api.S.bank) : Math.max(10, Math.round(api.unit() * b.sec)); };
function take() {
  const a = betAmt();
  if (a < 1 || api.S.bank < a) { api.A.denied(); res('Pas assez de dopamine pour cette mise.', ''); return 0; }
  api.spend(a);
  const S = api.S;
  S.casinoPlays = (S.casinoPlays || 0) + 1; S.casinoBet = (S.casinoBet || 0) + a;
  Q('casino', 1);
  return a;
}
function res(txt, cls = '') { const r = $('casRes'); r.textContent = txt; r.className = 'slot-res ' + cls; }
function payout(bet, mult, label, allIn) {
  const S = api.S, win = bet * mult;
  if (win > 0) api.gain(win);
  S.casinoWon = (S.casinoWon || 0) + win;
  if (mult > (S.casinoBest || 0)) S.casinoBest = mult;
  if (allIn && mult >= 2) S.allInWins = (S.allInWins || 0) + 1;
  if (mult >= 10) {
    S.bigWins = (S.bigWins || 0) + 1;
    api.A.jackpot(); api.banner('GROS GAIN', fx2(mult), `+${api.fmt(win)} nmol`);
    api.shake(document.body); api.flash('#FFD23F'); api.confetti(innerWidth / 2, innerHeight * 0.3, 160);
    api.addFeed(`<b>GROS GAIN</b> au casino (${esc(label)}) : ${fx2(mult)}, +${api.fmt(win)} nmol.`);
    res(`${label} : ${fx2(mult)} ! +${api.fmt(win)} nmol`, 'good');
  } else if (mult >= 1) {
    api.A.upgrade(); api.confetti(innerWidth / 2, innerHeight * 0.45, Math.round(20 + mult * 8));
    res(`${label} : ${fx2(mult)}, +${api.fmt(win)} nmol`, 'good');
  } else if (mult > 0) {
    api.A.click(); res(`${label} : ${fx2(mult)}, tu récupères ${api.fmt(win)} nmol`, '');
  } else { api.A.denied(); }
  if (mult >= 1) { const b = $('casRes').getBoundingClientRect(); api.flyTo(b.left + b.width / 2, b.top, $('bank'), Math.min(24, 4 + Math.round(mult * 2))); }
  api.onChange();
}
const busy = () => crash.state === 'fly' || mines.state === 'play' || coin.pot > 0 || coin.flipping || Object.values(EXTRA).some(g => g.busy && g.busy());

/* ======================= La Fusée ======================= */
const crash = {state: 'idle', t: 0, m: 1, at: 1, bet: 0, cashed: 0, hist: [], boom: 0, lastTick: 0, allIn: false};
function crashStart() {
  if (crash.state === 'fly') { crashCash(); return; }
  const bet = take(); if (!bet) return;
  crash.allIn = BETS[betIdx].all;
  crash.bet = bet; crash.state = 'fly'; crash.t = 0; crash.m = 1; crash.cashed = 0; crash.boom = 0;
  crash.at = Math.random() < 0.05 ? 1 : Math.min(1000, Math.max(1.01, Math.floor(1.47 / (1 - Math.random()) * 100) / 100));
  res('Décollage ! Encaisse avant l\'explosion.', '');
  api.A.fever();
}
function crashCash() {
  if (crash.state !== 'fly' || crash.cashed) return;
  crash.cashed = crash.m;
  const S = api.S;
  if (crash.m >= 10) S.crash10 = (S.crash10 || 0) + 1;
  payout(crash.bet, crash.m, 'Fusée', crash.allIn);
}
function crashTick(dt) {
  if (crash.state === 'fly') {
    crash.t += dt;
    crash.m = Math.exp(0.14 * crash.t);
    if (performance.now() - crash.lastTick > Math.max(60, 220 - crash.m * 12)) { crash.lastTick = performance.now(); if (!crash.cashed) api.A.wheelTick(); }
    if (crash.m >= crash.at) {
      crash.m = crash.at; crash.state = 'boom'; crash.boom = 0;
      crash.hist.unshift(crash.at); crash.hist.length = Math.min(crash.hist.length, 12);
      if (!crash.cashed) { api.A.bossKill(); res(`BOOM à ${fx2(crash.at)}. Perdu !`, ''); api.shake($('crashCv')); }
      else res(`Encaissé à ${fx2(crash.cashed)}. La fusée a explosé à ${fx2(crash.at)}.`, 'good');
      renderCrashHist();
    }
  } else if (crash.state === 'boom') {
    crash.boom += dt;
    if (crash.boom > 1.4) crash.state = 'idle';
  }
  const b = $('crashBtn');
  if (game !== 'crash') return;
  if (crash.state === 'fly' && !crash.cashed) DT.setText(b, `ENCAISSER ${fx2(crash.m)} · +${api.fmt(crash.bet * crash.m)}`);
  else if (crash.state === 'fly') DT.setText(b, `Encaissé à ${fx2(crash.cashed)}…`);
  else DT.setText(b, `DÉCOLLER · ${api.fmt(betAmt())} nmol`);
  DT.setDisabled(b, (crash.state === 'fly' && !!crash.cashed) || crash.state === 'boom');
  DT.setClass(b, 'btn-hero' + (crash.state === 'fly' && !crash.cashed ? ' cash' : ''));
  const mt = $('crashMult');
  DT.setText(mt, crash.state === 'idle' ? '×1,00' : fx2(crash.m));
  DT.setClass(mt, 'crash-mult' + (crash.state === 'boom' ? ' boom' : crash.m >= 5 ? ' hot' : ''));
  if (game === 'crash') drawCrash();
}
function renderCrashHist() {
  $('crashHist').innerHTML = crash.hist.map(m => `<span class="${m >= 10 ? 'hi' : m >= 2 ? 'mid' : 'lo'}">${fx2(m)}</span>`).join('');
}
const stars = Array.from({length: 60}, () => ({x: Math.random(), y: Math.random(), r: Math.random() * 1.6 + 0.3}));
function sizeCanvas(cv) {
  if (!cv._w || cv._stale) { cv._w = cv.clientWidth; cv._h = cv.clientHeight; cv._stale = false; }
  const dpr = Math.min(2, devicePixelRatio || 1), w = cv._w, h = cv._h;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
  return [c, w, h];
}
function drawCrash() {
  const [c, w, h] = sizeCanvas($('crashCv'));
  if (!w) return;
  const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0B0620'); g.addColorStop(1, '#2A1740');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  const scroll = crash.state === 'idle' ? 0 : crash.t * 0.02;
  c.fillStyle = '#fff';
  for (const s of stars) { c.globalAlpha = 0.3 + s.r / 3; c.beginPath(); c.arc(s.x * w, ((s.y + scroll) % 1) * h, s.r, 0, 7); c.fill(); }
  c.globalAlpha = 1;
  const pad = 26, T = Math.max(8, crash.t * 1.1), M = Math.max(2, crash.m * 1.25);
  const X = t => pad + (t / T) * (w - pad * 2), Y = m => h - pad - (Math.log(m) / Math.log(M)) * (h - pad * 2);
  // graduations
  c.strokeStyle = 'rgba(255,255,255,.08)'; c.lineWidth = 1; c.fillStyle = 'rgba(255,255,255,.4)'; c.font = `700 10px ${api.mono}`; c.textAlign = 'left';
  for (const m of [1.5, 2, 3, 5, 10, 20, 50, 100, 250, 500]) { if (m > M) break; const y = Y(m); c.beginPath(); c.moveTo(pad, y); c.lineTo(w - pad, y); c.stroke(); c.fillText('×' + m, 4, y - 3); }
  if (crash.state === 'idle') {
    c.fillStyle = '#fff'; c.font = `400 16px ${api.font}`; c.textAlign = 'center';
    c.fillText('Choisis ta mise et décolle !', w / 2, h / 2 + 40);
    drawRocket(c, pad + 18, h - pad - 18, -Math.PI / 4, 1);
    return;
  }
  // courbe
  c.lineWidth = 4; c.strokeStyle = crash.state === 'boom' && !crash.cashed ? '#FF4F79' : '#5FE0B7'; c.lineCap = 'round';
  c.beginPath();
  const steps = 60;
  for (let i = 0; i <= steps; i++) { const t = crash.t * i / steps, m = Math.exp(0.14 * t); i ? c.lineTo(X(t), Y(m)) : c.moveTo(X(t), Y(m)); }
  c.stroke();
  const fill = c.createLinearGradient(0, 0, 0, h); fill.addColorStop(0, 'rgba(95,224,183,.35)'); fill.addColorStop(1, 'rgba(95,224,183,0)');
  c.lineTo(X(crash.t), h - pad); c.lineTo(X(0), h - pad); c.closePath(); c.fillStyle = fill; c.fill();
  const tx = X(crash.t), ty = Y(crash.m);
  if (crash.cashed) { c.fillStyle = '#FFD23F'; c.font = `400 13px ${api.font}`; c.textAlign = 'center'; c.fillText('ENCAISSÉ ' + fx2(crash.cashed), X(Math.log(crash.cashed) / 0.14), Y(crash.cashed) - 16); }
  if (crash.state === 'boom') {
    const k = crash.boom;
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * Math.PI * 2, d = k * 160;
      c.fillStyle = pick(['#FF4F79', '#FF9F1C', '#FFD23F']); c.globalAlpha = Math.max(0, 1 - k);
      c.beginPath(); c.arc(tx + Math.cos(a) * d, ty + Math.sin(a) * d, Math.max(0.5, 6 * (1 - k) + 2), 0, 7); c.fill();
    }
    c.globalAlpha = Math.max(0, 1 - k * 0.8);
    c.fillStyle = '#FFD23F'; c.beginPath(); c.arc(tx, ty, 30 + k * 60, 0, 7); c.fill();
    c.globalAlpha = 1;
  } else {
    const ang = Math.atan2(Y(crash.m) - Y(Math.exp(0.14 * Math.max(0, crash.t - 0.3))), X(crash.t) - X(Math.max(0, crash.t - 0.3)));
    drawRocket(c, tx, ty, ang, 1);
  }
}
function drawRocket(c, x, y, ang, s) {
  c.save(); c.translate(x, y); c.rotate(ang); c.scale(s, s);
  c.lineWidth = 2.5; c.strokeStyle = '#1B1029'; c.lineJoin = 'round';
  const fl = 14 + Math.random() * 10;
  c.fillStyle = '#FF9F1C'; c.beginPath(); c.moveTo(-14, -6); c.lineTo(-14 - fl, 0); c.lineTo(-14, 6); c.closePath(); c.fill();
  c.fillStyle = '#FFD23F'; c.beginPath(); c.moveTo(-14, -3); c.lineTo(-14 - fl * 0.6, 0); c.lineTo(-14, 3); c.closePath(); c.fill();
  c.fillStyle = '#FF4F79'; c.beginPath(); c.moveTo(-10, -9); c.lineTo(-18, -16); c.lineTo(-4, -9); c.closePath(); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(-10, 9); c.lineTo(-18, 16); c.lineTo(-4, 9); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#F4F7FB'; c.beginPath(); c.ellipse(0, 0, 18, 9, 0, 0, 7); c.fill(); c.stroke();
  c.fillStyle = '#FF4F79'; c.beginPath(); c.moveTo(10, -7); c.quadraticCurveTo(24, 0, 10, 7); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#4FD8FF'; c.beginPath(); c.arc(2, 0, 4, 0, 7); c.fill(); c.stroke();
  c.restore();
}

/* ======================= Plinko ======================= */
const ROWS = 10;
const PMULT = [25, 6, 3, 1.5, 1.2, 0.5, 1.2, 1.5, 3, 6, 25];
const plinko = {balls: [], flash: {}, slotHit: {}};
function plinkoGeo() {
  const cv = $('plinkoCv');
  if (!cv._w || cv._stale) { cv._w = cv.clientWidth; cv._h = cv.clientHeight; cv._stale = false; }
  const w = cv._w, h = cv._h;
  const dx = Math.min(w / (ROWS + 2), (h - 60) / (ROWS + 1) * 1.15), dy = (h - 70) / (ROWS + 1);
  return {w, h, dx, dy, top: 26, cx: w / 2};
}
function plinkoDrop() {
  if (plinko.balls.length >= 10) return;
  const bet = take(); if (!bet) return;
  const path = []; let k = 0;
  for (let r = 0; r < ROWS; r++) { path.push(k); if (Math.random() < 0.5) k++; }
  plinko.balls.push({path, k, r: 0, u: 0, bet, allIn: BETS[betIdx].all, col: pick(['#FF4F79', '#FFD23F', '#5FE0B7', '#4FD8FF', '#C77DFF'])});
  api.A.click();
}
function plinkoTick(dt) {
  const G = plinkoGeo();
  for (let i = plinko.balls.length - 1; i >= 0; i--) {
    const b = plinko.balls[i];
    b.u += dt / 0.13;
    while (b.u >= 1 && b.r < ROWS) {
      b.u -= 1; b.r++;
      if (b.r < ROWS) { plinko.flash[`${b.r}:${b.path[b.r]}`] = 1; api.A.tap(Math.min(19, b.r)); }
    }
    if (b.r >= ROWS) {
      plinko.balls.splice(i, 1);
      const m = PMULT[b.k];
      plinko.slotHit[b.k] = 1;
      if (m >= 25) api.S.plinko25 = (api.S.plinko25 || 0) + 1;
      payout(b.bet, m, 'Plinko', b.allIn);
    }
  }
  for (const k in plinko.flash) { plinko.flash[k] -= dt * 4; if (plinko.flash[k] <= 0) delete plinko.flash[k]; }
  for (const k in plinko.slotHit) { plinko.slotHit[k] -= dt * 2.5; if (plinko.slotHit[k] <= 0) delete plinko.slotHit[k]; }
  if (game === 'plinko') drawPlinko(G);
  DT.setText($('plinkoBtn'), `LÂCHER UNE BILLE · ${api.fmt(betAmt())} nmol`);
}
function pegPos(G, r, j) { return [G.cx + (j - r / 2) * G.dx, G.top + r * G.dy + G.dy * 0.6]; }
let plinkoBoard = null, plinkoKey = '';
function slotColor(k) { const t = Math.abs(k - ROWS / 2) / (ROWS / 2); return t > 0.85 ? '#FF4F79' : t > 0.6 ? '#FF9F1C' : t > 0.35 ? '#FFD23F' : '#5FE0B7'; }
function buildPlinko(G, w, h) {
  const dpr = Math.min(2, devicePixelRatio || 1);
  const cv = document.createElement('canvas'); cv.width = Math.ceil(w * dpr); cv.height = Math.ceil(h * dpr);
  const c = cv.getContext('2d'); c.scale(dpr, dpr);
  const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1C0F2E'); g.addColorStop(1, '#2E1A48');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.fillStyle = '#E3E8EF';
  for (let r = 0; r < ROWS; r++) for (let j = -1; j <= r + 1; j++) {
    const [x, y] = pegPos(G, r, j);
    if (x < 6 || x > w - 6) continue;
    c.beginPath(); c.arc(x, y, 4, 0, 7); c.fill();
  }
  const sy = G.top + ROWS * G.dy + G.dy * 0.4, sw = G.dx * 0.92;
  PMULT.forEach((m, k) => {
    const x = G.cx + (k - ROWS / 2) * G.dx;
    c.save(); c.translate(x, sy + 16);
    c.fillStyle = slotColor(k); c.strokeStyle = '#1B1029'; c.lineWidth = 2.5;
    c.beginPath(); c.roundRect(-sw / 2, -14, sw, 28, 7); c.fill(); c.stroke();
    c.fillStyle = '#1B1029'; c.font = `700 ${Math.max(9, Math.min(12, sw * 0.3))}px ${api.mono}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('×' + String(m).replace('.', ','), 0, 1);
    c.restore();
  });
  return cv;
}
function drawPlinko(G) {
  const [c, w, h] = sizeCanvas($('plinkoCv'));
  if (!w) return;
  const key = w + 'x' + h;
  if (plinkoKey !== key) { plinkoBoard = buildPlinko(G, w, h); plinkoKey = key; DT.bitmap(plinkoBoard, b => { plinkoBoard = b; }); }
  c.drawImage(plinkoBoard, 0, 0, w, h);
  // clous qui s'allument
  for (const k in plinko.flash) {
    const [r, j] = k.split(':').map(Number), f = plinko.flash[k], [x, y] = pegPos(G, r, j);
    c.fillStyle = `rgba(255,210,63,${0.4 + f * 0.6})`; c.beginPath(); c.arc(x, y, 4 + f * 3, 0, 7); c.fill();
  }
  // case touchée : elle s'illumine
  const sy = G.top + ROWS * G.dy + G.dy * 0.4, sw = G.dx * 0.92;
  for (const k in plinko.slotHit) {
    const x = G.cx + (k - ROWS / 2) * G.dx, hit = plinko.slotHit[k];
    c.fillStyle = `rgba(255,255,255,${hit * 0.65})`; c.beginPath(); c.roundRect(x - sw / 2, sy + 2, sw, 28, 7); c.fill();
  }
  // billes
  for (const b of plinko.balls) {
    const r0 = Math.min(b.r, ROWS - 1), u = Math.min(1, b.u);
    const [x0, y0] = b.r === 0 && b.u < 0 ? [G.cx, 4] : pegPos(G, r0, b.path[r0]);
    let x1, y1;
    if (b.r + 1 < ROWS) [x1, y1] = pegPos(G, b.r + 1, b.path[b.r + 1]);
    else { x1 = G.cx + (b.k - ROWS / 2) * G.dx; y1 = sy + 10; }
    const x = x0 + (x1 - x0) * u, y = y0 - 9 + (y1 - y0) * u - Math.sin(u * Math.PI) * G.dy * 0.35;
    c.fillStyle = b.col; c.strokeStyle = '#1B1029'; c.lineWidth = 2;
    c.beginPath(); c.arc(x, y, 7, 0, 7); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.arc(x - 2, y - 2, 2.2, 0, 7); c.fill();
  }
}

/* ======================= Mines ======================= */
const mines = {state: 'idle', n: 3, bombs: new Set(), open: new Set(), bet: 0, allIn: false};
const minesMult = k => { let m = 1.1; for (let i = 0; i < k; i++) m *= (25 - i) / (25 - mines.n - i); return k ? m : 1; };
function minesRender() {
  const grid = $('minesGrid');
  if (grid.children.length !== 25) grid.innerHTML = Array.from({length: 25}, (_, i) => `<button type="button" class="tile" data-i="${i}"></button>`).join('');
  [...grid.children].forEach((b, i) => {
    const open = mines.open.has(i), bomb = mines.bombs.has(i);
    const show = open || (mines.state === 'lost' || mines.state === 'won') && bomb;
    b.className = 'tile' + (show ? (bomb ? ' bomb' : ' gem') : '') + (mines.state === 'play' && !open ? ' live' : '');
    b.disabled = mines.state !== 'play' || open;
    if (show && !b.dataset.shown) {
      b.dataset.shown = '1';
      b.innerHTML = bomb ? '<span class="bomb-ic"></span>' : DT.cardArt(b.dataset.art || 'wave');
    }
    if (!show && b.dataset.shown) { b.dataset.shown = ''; b.innerHTML = ''; }
  });
  const k = mines.open.size, btn = $('minesBtn');
  if (mines.state === 'play') {
    btn.textContent = k ? `ENCAISSER ${fx2(minesMult(k))} · +${api.fmt(mines.bet * minesMult(k))}` : 'Choisis une case…';
    btn.disabled = !k;
    $('minesNext').textContent = `Prochaine case : ${fx2(minesMult(k + 1))}`;
  } else {
    btn.textContent = `MISER · ${api.fmt(betAmt())} nmol`; btn.disabled = false;
    $('minesNext').textContent = `${mines.n} bombe${mines.n > 1 ? 's' : ''} cachée${mines.n > 1 ? 's' : ''} sur 25 cases`;
  }
  document.querySelectorAll('#minesN button').forEach(b => { b.disabled = mines.state === 'play'; b.setAttribute('aria-pressed', +b.dataset.n === mines.n); });
}
function minesStart() {
  if (mines.state === 'play') { minesCash(); return; }
  const bet = take(); if (!bet) return;
  mines.bet = bet; mines.allIn = BETS[betIdx].all; mines.state = 'play'; mines.open = new Set(); mines.bombs = new Set();
  while (mines.bombs.size < mines.n) mines.bombs.add(Math.floor(Math.random() * 25));
  const owned = Object.keys(api.S.cards || {});
  [...$('minesGrid').children].forEach(b => { b.dataset.art = owned.length ? pick(owned) : pick(['wave', 'moon', 'chad', 'giant']); b.dataset.shown = ''; b.innerHTML = ''; });
  res('Trouve les cartes, évite les bombes.', '');
  api.A.click(); minesRender();
}
function minesClick(i) {
  if (mines.state !== 'play' || mines.open.has(i)) return;
  const tile = $('minesGrid').children[i];
  if (mines.bombs.has(i)) {
    mines.open.add(i); mines.state = 'lost';
    api.A.bossKill(); api.shake($('minesGrid'));
    const r = tile.getBoundingClientRect(); api.burst(r.left + r.width / 2, r.top + r.height / 2, '#FF4F79', 40, 420);
    res(`BOUM ! Tu perds ${api.fmt(mines.bet)} nmol.`, '');
    minesRender(); api.onChange();
    return;
  }
  mines.open.add(i);
  const k = mines.open.size;
  api.A.tap(Math.min(19, k * 2));
  const r = tile.getBoundingClientRect(); api.burst(r.left + r.width / 2, r.top + r.height / 2, '#5FE0B7', 14, 220);
  if (k === 25 - mines.n) { minesRender(); minesCash(); return; }
  minesRender();
}
function minesCash() {
  if (mines.state !== 'play' || !mines.open.size) return;
  const m = minesMult(mines.open.size);
  mines.state = 'won';
  if (m >= 5) api.S.mines5 = (api.S.mines5 || 0) + 1;
  payout(mines.bet, m, 'Mines', mines.allIn);
  minesRender();
}

/* ======================= Pile ou face ======================= */
const coin = {pot: 0, base: 0, streak: 0, flipping: false, allIn: false, rot: 0};
const COIN_MULT = 1.95;
function coinFlip(choice) {
  if (coin.flipping) return;
  if (!coin.pot) { const bet = take(); if (!bet) return; coin.pot = coin.base = bet; coin.allIn = BETS[betIdx].all; coin.streak = 0; }
  coin.flipping = true; coinRender();
  const other = choice === 'pile' ? 'face' : 'pile';
  const result = Math.random() < 0.7 ? choice : other;
  coin.rot += 1800 + (((result === 'face') !== (Math.round(coin.rot / 180) % 2 === 1)) ? 180 : 0);
  const el = $('coin');
  el.style.transition = 'transform 1.1s cubic-bezier(.2,.8,.3,1)';
  el.style.transform = `rotateY(${coin.rot}deg)`;
  api.A.wheelTick();
  const tick = setInterval(() => api.A.wheelTick(), 90);
  setTimeout(() => {
    clearInterval(tick);
    coin.flipping = false;
    if (result === choice) {
      coin.pot *= COIN_MULT; coin.streak++;
      api.S.coinBest = Math.max(api.S.coinBest || 0, coin.streak);
      api.A.upgrade(); api.confetti(innerWidth / 2, innerHeight * 0.45, 20 + coin.streak * 10);
      res(`${result.toUpperCase()} ! Série de ${coin.streak}. Pot : ${api.fmt(coin.pot)} nmol. Tu doubles ou tu encaisses ?`, 'good');
    } else {
      api.A.denied(); api.shake($('coin'));
      res(`${result.toUpperCase()}… Perdu ! Le pot de ${api.fmt(coin.pot)} nmol s'envole.`, '');
      coin.pot = 0; coin.streak = 0;
    }
    coinRender(); api.onChange();
  }, 1150);
}
function coinCash() {
  if (!coin.pot || coin.flipping) return;
  const m = coin.pot / coin.base, bet = coin.base;
  coin.pot = 0; coin.streak = 0;
  payout(bet, m, 'Pile ou face', coin.allIn);
  coinRender();
}
function coinRender() {
  $('coinCash').hidden = !coin.pot || coin.flipping;
  $('coinCash').textContent = `ENCAISSER ${api.fmt(coin.pot)} nmol`;
  $('coinStreak').textContent = coin.pot ? `Pot en jeu : ${api.fmt(coin.pot)} nmol · série ${coin.streak}` : `Mise : ${api.fmt(betAmt())} nmol. Choisis ton côté.`;
  for (const id of ['coinH', 'coinT']) { $(id).disabled = coin.flipping; $(id).textContent = (id === 'coinH' ? 'PILE' : 'FACE') + (coin.pot ? ' (doubler)' : ''); }
}

/* ======================= Ouverture, onglets, boucle ======================= */
function setGame(g) {
  if (busy() && g !== game) { res('Termine ta partie en cours avant de changer de jeu.', ''); api.A.denied(); return; }
  game = g;
  document.querySelectorAll('#casinoModal canvas').forEach(c => { c._stale = true; });
  document.querySelectorAll('#casTabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.g === g));
  for (const k of ['crash', 'plinko', 'mines', 'coin', ...Object.keys(EXTRA)]) $('g-' + k).hidden = k !== g;
  if (EXTRA[g] && EXTRA[g].show) EXTRA[g].show();
  res('', '');
  if (g === 'mines') minesRender();
  if (g === 'coin') coinRender();
  api.A.click();
}
function renderBets() {
  $('casBets').innerHTML = BETS.map((b, i) => `<button type="button" data-i="${i}" aria-pressed="${i === betIdx}" class="${b.all ? 'allin' : ''}">${b.l}</button>`).join('');
}
addEventListener('resize', () => document.querySelectorAll('#casinoModal canvas').forEach(c => { c._stale = true; }));
function open() {
  $('casinoModal').hidden = false;
  document.querySelectorAll('#casinoModal canvas').forEach(c => { c._stale = true; });
  renderBets(); renderCrashHist();
  $('coin').querySelector('.heads').innerHTML = DT.cardArt('chad') + '<b>PILE</b>';
  $('coin').querySelector('.tails').innerHTML = DT.cardArt('yuno') + '<b>FACE</b>';
  setGame(game);
}
function tick(dt) {
  if ($('casinoModal').hidden) return;
  dt = Math.min(dt, 0.05);
  crashTick(dt);
  for (const g of Object.values(EXTRA)) if (g.tick) g.tick(dt, game);
  if (plinko.balls.length || game === 'plinko') plinkoTick(dt);
  if (!$('casinoModal').hidden) {
    DT.setText($('casBank'), api.fmt(api.S.bank));
    if (game === 'mines' && mines.state !== 'play') DT.setText($('minesBtn'), `MISER · ${api.fmt(betAmt())} nmol`);
    if (game === 'coin' && !coin.pot) DT.setText($('coinStreak'), `Mise : ${api.fmt(betAmt())} nmol. Choisis ton côté.`);
  }
}
function init(a) {
  api = a;
  for (const g of Object.values(EXTRA)) if (g.init) g.init();
  $('casinoBtn').addEventListener('click', open);
  $('casClose').addEventListener('click', () => {
    if (crash.state === 'fly' && !crash.cashed) { res('La fusée vole encore : encaisse ou attends l\'explosion !', ''); return; }
    if (busy() || plinko.balls.length) { res('Termine ta partie en cours avant de partir.', ''); return; }
    $('casinoModal').hidden = true;
  });
  $('casTabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setGame(b.dataset.g); });
  $('casBets').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (busy()) { res('Mise verrouillée pendant la partie.', ''); return; }
    betIdx = +b.dataset.i; renderBets(); api.A.click();
    if (BETS[betIdx].all) res(`TAPIS : tu mises toute ta banque (${api.fmt(api.S.bank)} nmol). Courage.`, '');
  });
  $('crashBtn').addEventListener('click', crashStart);
  $('plinkoBtn').addEventListener('click', plinkoDrop);
  $('minesBtn').addEventListener('click', minesStart);
  $('minesGrid').addEventListener('click', e => { const t = e.target.closest('.tile'); if (t) minesClick(+t.dataset.i); });
  $('minesN').addEventListener('click', e => { const b = e.target.closest('button'); if (!b || mines.state === 'play') return; mines.n = +b.dataset.n; minesRender(); api.A.click(); });
  $('coinH').addEventListener('click', () => coinFlip('pile'));
  $('coinT').addEventListener('click', () => coinFlip('face'));
  $('coinCash').addEventListener('click', coinCash);
  document.addEventListener('keydown', e => {
    if ($('casinoModal').hidden) return;
    if (e.key === ' ' && game === 'crash') { e.preventDefault(); crashStart(); }
  });
}

DT.Casino = {init, tick, open, get busy() { return busy(); },
  register(id, g) { EXTRA[id] = g; },
  H: {take, payout, res, betAmt, fx2, get api() { return api; }, isAllIn: () => !!BETS[betIdx].all, get game() { return game; }}};

})(window.DT);
