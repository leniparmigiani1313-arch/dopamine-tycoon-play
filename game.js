/* Dopamine Tycoon : moteur du jeu, interface, effets et classement. */
(function (DT) {
'use strict';

const {GENS, TIERS, UPS, ERAS, ACH, EVENTS, HEADLINES, SAGES} = DT;
const A = DT.audio, NET = DT.net, LS = DT.LS;
const $ = id => document.getElementById(id);
const now = () => DT.now();
const rand = (a, b) => a + Math.random() * (b - a);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

/* ================= Réglages ================= */
const SET = Object.assign({sfx: true, music: true, vol: 70, lite: false, stim: true, video: true}, LS.get('dt-settings') || {});
function applySettings() {
  A.set({sfx: SET.sfx, music: SET.music, vol: SET.vol / 100});
  document.body.classList.toggle('lite', SET.lite);
  DT.stageLite = SET.lite || matchMedia('(prefers-reduced-motion: reduce)').matches;
  LS.set('dt-settings', SET);
  const on = SET.sfx || SET.music;
  $('btnSound').innerHTML = DT.svg(on ? 'sound' : 'mute');
  $('btnSound').setAttribute('aria-label', on ? 'Couper le son' : 'Remettre le son');
}
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const lite = () => SET.lite || reduceMotion;

/* ================= État ================= */
function fresh(keep) {
  return Object.assign({
    v: 2, bank: 0, run: 0, life: 0, clicks: 0, totClicks: 0, gens: GENS.map(() => 0), ups: {}, ach: {},
    ser: 0, serSpent: 0, sag: {}, resets: 0, d2: 100, paused: false, buffs: [], goldClicks: 0, saved: now(), runStart: now(),
    runTime: 0, playTime: 0, runMult: 1, crushed: 0, popits: 0, goldObj: 0, phones: 0, eggs: {}, emotes: 0, cards: {}, chests: [], chestsOpened: 0, xp: 0, lvl: 1, fever: 0, feverUntil: 0, fevers: 0, spins: 0, nextFree: null, spinsDone: 0, jackpots: 0, quests: [], questsDone: 0, daily: null, dailyBest: 0, bosses: 0, tickets: 0, slotSpins: 0, slotBest: 0, slotJackpots: 0, scratched: 0, scratchWins: 0, drops: 0, bestRain: 0, duels: {out: {}, in: {}}, duelSeen: [], duelsWon: 0, duelsSent: 0, casinoPlays: 0, casinoBet: 0, casinoWon: 0, casinoBest: 0, bigWins: 0, allInWins: 0, crash10: 0, plinko25: 0, mines5: 0, coinBest: 0, rouNum: 0, bjNat: 0, pokerRoyal: 0, towerTop: 0, events: 0, cynic: 0, kind: 0, planeTime: 0, bestCombo: 0, crits: 0, era: 0,
    bPos: [], bTrades: 0, bWon: 0, bBest: 0, bMoon: 0, bLiq: 0, swaps: {in: {}, out: {}}, swapOut: [], swapSeen: [], swapsDone: 0,
    mega: 0, megas: 0, pass: {pts: 0, claimed: [], bonus: 0}, fusions: 0, setsDone: {},
    stim: {}, dvdCorners: 0, grassDone: 0,
    dif: 1, hardResets: 0, friends: {}, frInit: 0, frSeen: [],
    season: {id: 0, pts: 0}, seasonDone: 0, medals: {g: 0, s: 0, b: 0}, dc: {id: 0, base: {}, combo: 0, done: false}, dcDone: 0, dcRew: 0,
    wb: {id: 0, dmg: 0, tiers: [], last: 0, ann: 0}, wbKills: 0, clan: {name: '', at: 0}, hiloBest: 0,
  }, keep || {});
}
function hydrate(o) {
  const s = fresh(o);
  s.gens = GENS.map((_, i) => (o.gens && +o.gens[i]) || 0);
  s.ups = o.ups || {}; s.ach = o.ach || {}; s.sag = o.sag || {}; s.eggs = o.eggs || {}; s.cards = o.cards || {}; s.quests = Array.isArray(o.quests) ? o.quests : [];
  s.duels = o.duels && o.duels.in && o.duels.out ? o.duels : {out: {}, in: {}}; s.duelSeen = Array.isArray(o.duelSeen) ? o.duelSeen : [];
  s.bPos = Array.isArray(o.bPos) ? o.bPos.filter(p => p && DT.Bourse.STOCKS.some(x => x.sym === p.sym) && p.amt > 0 && p.p0 > 0) : [];
  s.chests = Array.isArray(o.chests) ? o.chests.filter(t => DT.CHESTS[t]).slice(0, 8) : [];
  s.buffs = (s.buffs || []).filter(b => b.until > now());
  const ps = o.pass && typeof o.pass === 'object' ? o.pass : {};
  s.pass = {pts: Math.max(0, +ps.pts || 0), claimed: Array.isArray(ps.claimed) ? ps.claimed.filter(Number.isInteger) : [], bonus: Math.max(0, +ps.bonus || 0)};
  s.setsDone = o.setsDone && typeof o.setsDone === 'object' ? o.setsDone : {};
  s.mega = Math.max(0, Math.min(100, +o.mega || 0));
  s.stim = o.stim && typeof o.stim === 'object' && !Array.isArray(o.stim) ? o.stim : {};
  s.dif = [0, 1, 2, 3].includes(o.dif) ? o.dif : 1;
  s.friends = o.friends && typeof o.friends === 'object' && !Array.isArray(o.friends) ? o.friends : {};
  for (const k of Object.keys(s.friends)) if (!/^[a-z0-9]{3,16}$/.test(k) || typeof s.friends[k] !== 'string') delete s.friends[k];
  s.frSeen = Array.isArray(o.frSeen) ? o.frSeen.filter(k => typeof k === 'string').slice(-200) : [];
  for (const k of ['bank', 'run', 'life', 'ser', 'serSpent', 'runMult', 'd2']) if (!Number.isFinite(+s[k])) s[k] = k === 'runMult' ? 1 : k === 'd2' ? 100 : 0;
  return s;
}

let S = fresh();
let me = null, inGame = false, qty = 1;
const flags = {still: false, konami: false, stillShown: false};
let combo = 0, comboTier = -1, lastTap = 0, lastInput = now();
// Paliers du combo : la flamme grandit et change de couleur.
const COMBO_TIERS = [{at: 5, t: ''}, {at: 25, t: 'EN FEU !', c: '#FF9F1C'}, {at: 50, t: 'BRÛLANT !', c: '#FF4F79'}, {at: 100, t: 'INARRÊTABLE !', c: '#4FD8FF'}, {at: 200, t: 'LÉGENDAIRE !!', c: '#FF7EB6'}];

const has = id => !!S.ups[id];
const sag = id => !!(S.sag && S.sag[id]);
const serPct = () => sag('s_awake') ? 0.15 : 0.1;
const serAvail = () => Math.max(0, S.ser - (S.serSpent || 0));
const achCount = () => Object.keys(S.ach).length;
const buffMult = k => S.buffs.reduce((m, b) => b.k === k && b.until > now() ? m * b.m : m, 1);
function genMult(i) { let m = 1; for (let k = 0; k < TIERS.length; k++) if (has(`g${i}t${k}`)) m *= 2; return m; }
// Niveau de difficulté (DT.DIFS dans data.js) : multiplie la production et les taps, la Sérénité et l'XP.
const dif = () => DT.DIFS[S.dif] || DT.DIFS[1];
const permMult = () => (1 + serPct() * S.ser) * (1 + 0.01 * achCount()) * S.runMult * (1 + DT.Cards.bonus(S)) * (1 + DT.Stim.bonus(S)) * dif().prod;
const globalMult = () => permMult() * (has('u_blue') ? 1.5 : 1) * (has('u_dark') ? 2 : 1) * (has('u_fomo') ? 3 : 1) * (has('u_sync') ? 2 : 1) * (has('u_cosmos') ? 2 : 1) * buffMult('prod') * DT.Social.mult();
const genDps = i => GENS[i].prod * S.gens[i] * genMult(i) * globalMult();
function rawDps() { let s = 0; for (let i = 0; i < GENS.length; i++) s += genDps(i); return s; }
const floorD2 = () => has('u_neuro') ? 35 : 15;
function targetD2(raw) {
  const slope = 11 * dif().slope * (has('u_micro') ? 0.8 : 1) * (has('u_blue') ? 1.1 : 1) * (sag('s_homeo') ? 0.75 : 1);
  return Math.max(floorD2(), Math.min(100, 100 - slope * Math.log10(1 + raw)));
}
const d2Mult = () => 0.25 + 0.75 * S.d2 / 100;
// En mode avion la production s'arrête, sauf avec la sagesse Pilote automatique (25 %).
const pilotRate = () => S.paused ? (sag('s_pilot') ? 0.25 : 0) : 1;
const effDps = () => rawDps() * d2Mult() * pilotRate();
function clickBase() {
  let m = 1; if (has('c1')) m *= 2; if (has('c2')) m *= 2; if (sag('s_tap')) m *= 3;
  const frac = (has('c3') ? .01 : 0) + (has('c4') ? .02 : 0) + (has('c5') ? .04 : 0);
  return (m * (1 + serPct() * S.ser) * (1 + 0.01 * achCount()) * dif().prod + frac * rawDps()) * d2Mult() * buffMult('tap');
}
const comboWin = () => (has('u_night') ? 2.4 : 1.2) * 1000;
const comboMult = () => 1 + Math.min(4, Math.max(0, combo - 1) / 25);
const critChance = () => (has('u_crit') ? 0.08 : 0.04) + (DT.Extras.feverOn() ? 0.1 : 0);
function genCost(i, n) {
  const b = GENS[i].cost * (sag('s_cheap') ? 0.9 : 1) * Math.pow(1.15, S.gens[i]);
  return Math.ceil(b * (Math.pow(1.15, n) - 1) / 0.15);
}
const unit = () => Math.max(rawDps() * d2Mult(), clickBase() * 2, 1);
const serGain = () => Math.floor(Math.cbrt(S.run / 1e7) * dif().ser);
function gain(x) { if (!(x > 0)) return; S.bank += x; S.run += x; S.life += x; }
function spend(x) { S.bank = Math.max(0, S.bank - Math.max(0, x)); }
function buff(k, m, secs, label) {
  if (k === 'prod' && m > 1 && has('u_story')) secs *= 1.5;
  S.buffs.push({k, m, until: now() + secs * 1000, label});
}
const eraIdx = life => { let e = 0; ERAS.forEach((x, i) => { if (life >= x.at) e = i; }); return e; };

/* ================= Format ================= */
const SUF = ['', ' k', ' M', ' Md', ' Bn', ' Bd', ' Tn', ' Td', ' Qn', ' Qd', ' Sx', ' Sp'];
function fmt(n) {
  if (!isFinite(n)) return '∞';
  if (n < 10) return (Math.round(n * 10) / 10).toString().replace('.', ',');
  if (n < 1000) return Math.floor(n).toString();
  const e = Math.min(SUF.length - 1, Math.floor(Math.log10(n) / 3));
  const v = n / Math.pow(1000, e);
  return v.toFixed(v < 10 ? 2 : v < 100 ? 1 : 0).replace('.', ',') + SUF[e];
}
const fmtX = m => '×' + (m < 10 ? m.toFixed(2) : m < 100 ? m.toFixed(1) : fmt(m)).replace('.', ',');
function fmtTime(s) {
  s = Math.floor(s);
  const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
  return d ? `${d} j ${h} h` : h ? `${h} h ${String(m).padStart(2, '0')}` : m ? `${m} min ${String(x).padStart(2, '0')}` : `${x} s`;
}
function ago(ms) {
  const s = Math.max(0, (now() - ms) / 1000);
  if (s < 60) return 'à l\'instant';
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return `il y a ${Math.floor(s / 86400)} j`;
}
const hhmm = t => new Date(t).toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'});

/* ================= Toasts & trophées ================= */
function toast(html, cls = '') {
  const t = document.createElement('div');
  t.className = 'toast ' + cls; t.innerHTML = html;
  $('toasts').appendChild(t);
  while ($('toasts').children.length > 4) $('toasts').firstChild.remove();
  setTimeout(() => t.remove(), 5200);
}
/* ================= Erreurs ================= */
// Une erreur ne doit jamais geler le jeu : on la note (Réglages > rapport d'erreurs), on prévient une fois par minute,
// et la partie continue.
let lastErrToast = 0, lastErrMsg = '', lastErrAt = 0;
function report(e, where) {
  try {
    const msg = String((e && (e.stack || e.message)) || e).slice(0, 800);
    console.error('[Dopamine Tycoon]', where || '', msg);
    if (msg === lastErrMsg && now() - lastErrAt < 5000) return;  // la même erreur à chaque image : on ne la note qu'une fois
    lastErrMsg = msg; lastErrAt = now();
    const log = LS.get('dt-errors') || [];
    log.push({t: new Date().toISOString(), v: DT.VERSION, w: where || '', m: msg});
    LS.set('dt-errors', log.slice(-15));
    if (inGame && now() - lastErrToast > 60000) {
      lastErrToast = now();
      toast("Petit bug : le jeu continue et ta partie est sauvegardée. Si ça se répète, envoie le rapport d'erreurs (Réglages) à Leni.", 'coral');
    }
  } catch (err) {}
}
addEventListener('error', e => report(e.error || e.message, 'page'));
addEventListener('unhandledrejection', e => report(e.reason, 'promesse'));

function trophy(a) {
  const t = document.createElement('div');
  t.className = 'trophy';
  t.innerHTML = `<span class="ti">${DT.svg('trophy')}</span><span><small>SUCCÈS DÉBLOQUÉ · +1 %</small><b>${esc(a.name)}</b><span>${esc(a.desc)}</span></span>`;
  $('trophies').appendChild(t);
  setTimeout(() => t.remove(), 4800);
  A.achievement();
  const r = t.getBoundingClientRect();
  confetti(innerWidth / 2, (r.top || 20) + 40, 40);
}

/* ================= Canvas d'arrière-plan : réseau neuronal ================= */
const bgc = $('bg'), bgx = bgc.getContext('2d');
let BW = 0, BH = 0, bgAcc = 0;
const nodes = [], pulses = [];
const BG_SCALE = 0.6, FX_SCALE = 0.5;  // fond et effets calculés en basse résolution : ils couvrent tout l'écran  // le réseau de fond est décoratif : on le calcule en basse résolution, le navigateur l'agrandit
function bgResize() {
  BW = innerWidth; BH = innerHeight;
  bgc.width = Math.round(BW * BG_SCALE); bgc.height = Math.round(BH * BG_SCALE); bgx.setTransform(BG_SCALE, 0, 0, BG_SCALE, 0, 0);
  fxc.width = Math.round(BW * FX_SCALE); fxc.height = Math.round(BH * FX_SCALE); fxx.setTransform(FX_SCALE, 0, 0, FX_SCALE, 0, 0);
}
function eraRGB() { return ERAS[inGame ? S.era : 0].rgb; }
const BUCKETS = [0.05, 0.1, 0.15];
function drawBg(dt) {
  bgAcc += dt;
  if (bgAcc < 1 / 15) return;
  const step = Math.min(bgAcc, 0.2); bgAcc = 0;
  if (inGame && modalOpen()) return;  // caché derrière une fenêtre : inutile de le redessiner
  const owned = inGame ? S.gens.reduce((a, b) => a + b, 0) : 60;
  const target = lite() ? 30 : Math.round(40 + Math.min(35, owned / 8));
  while (nodes.length < target) nodes.push({x: rand(0, BW), y: rand(0, BH), vx: rand(-9, 9), vy: rand(-9, 9), r: rand(0.8, 2.4)});
  if (nodes.length > target) nodes.length = target;
  const rgb = eraRGB();
  bgx.clearRect(0, 0, BW, BH);
  const g = bgx.createRadialGradient(BW * 0.3, BH * 0.1, 0, BW * 0.3, BH * 0.1, Math.max(BW, BH) * 0.8);
  g.addColorStop(0, `rgba(${rgb},0.10)`); g.addColorStop(1, 'rgba(20,11,31,0)');
  bgx.fillStyle = g; bgx.fillRect(0, 0, BW, BH);
  for (const n of nodes) {
    n.x += n.vx * step; n.y += n.vy * step;
    if (n.x < -20) n.x = BW + 20; if (n.x > BW + 20) n.x = -20;
    if (n.y < -20) n.y = BH + 20; if (n.y > BH + 20) n.y = -20;
  }
  const D = 150, D2 = D * D;
  bgx.lineWidth = 1.4;
  // trois tracés au total (un par intensité) au lieu d'un tracé par trait
  const paths = BUCKETS.map(() => new Path2D());
  for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
    const a = nodes[i], b = nodes[j], dx = a.x - b.x, dy = a.y - b.y, d = dx * dx + dy * dy;
    if (d < D2) { const k = d < D2 * 0.2 ? 2 : d < D2 * 0.55 ? 1 : 0; paths[k].moveTo(a.x, a.y); paths[k].lineTo(b.x, b.y); }
  }
  paths.forEach((p, k) => { bgx.strokeStyle = `rgba(${rgb},${BUCKETS[k]})`; bgx.stroke(p); });
  if (!lite()) {
    const rate = inGame ? Math.min(10, 1 + 1.2 * Math.log10(1 + effDps())) : 3;
    if (Math.random() < rate * step && pulses.length < 30) {
      const a = nodes[Math.floor(Math.random() * nodes.length)];
      let best = null, bd = D2;
      for (const b of nodes) { if (b === a) continue; const d = (a.x - b.x) ** 2 + (a.y - b.y) ** 2; if (d < bd) { bd = d; best = b; } }
      if (best) pulses.push({a, b: best, t: 0});
    }
    bgx.fillStyle = `rgba(${rgb},0.9)`;
    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i]; p.t += step * 1.4;
      if (p.t >= 1) { pulses.splice(i, 1); continue; }
      bgx.beginPath(); bgx.arc(p.a.x + (p.b.x - p.a.x) * p.t, p.a.y + (p.b.y - p.a.y) * p.t, 2.6, 0, 7); bgx.fill();
    }
  }
  bgx.fillStyle = `rgba(${rgb},0.45)`;
  const dots = new Path2D();
  for (const n of nodes) { dots.moveTo(n.x + n.r, n.y); dots.arc(n.x, n.y, n.r, 0, 7); }
  bgx.fill(dots);
}

/* ================= Couche d'effets plein écran ================= */
const fxc = $('fx'), fxx = fxc.getContext('2d');
const fxp = [];
let fxDirty = false;
function burst(x, y, color, n = 16, spd = 260) {
  if (lite()) n = Math.ceil(n / 3);
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2), v = rand(spd * 0.3, spd);
    fxp.push({kind: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.4, 0.8), max: 0.8, color, r: rand(1.5, 3.2)});
  }
}
const CONF = ['#FF4F79', '#FFC247', '#5FE0B7', '#C77DFF', '#4FD8FF'];
function confetti(x, y, n = 30) {
  if (lite()) n = Math.ceil(n / 4);
  for (let i = 0; i < n; i++) {
    fxp.push({kind: 'conf', x, y, vx: rand(-320, 320), vy: rand(-420, -120), life: rand(1.2, 2), max: 2, color: CONF[i % 5],
              w: rand(5, 9), h: rand(3, 5), rot: rand(0, 6), vr: rand(-10, 10)});
  }
}
function flyTo(x0, y0, el, n = 12, color = '#FFC247') {
  const r = el.getBoundingClientRect();
  const x1 = r.left + r.width / 2, y1 = r.top + r.height / 2;
  if (lite()) n = Math.min(n, 4);
  for (let i = 0; i < n; i++) {
    fxp.push({kind: 'fly', x0: x0 + rand(-20, 20), y0: y0 + rand(-20, 20), x1, y1, cx: (x0 + x1) / 2 + rand(-160, 160), cy: Math.min(y0, y1) - rand(40, 200),
              t: -i * 0.04, dur: rand(0.55, 0.85), color, el});
  }
}
// Petites images lumineuses pré-dessinées (une par couleur) : bien moins coûteuses que des cercles recalculés.
const dotCache = new Map();
function dotSprite(color) {
  let c = dotCache.get(color);
  if (c) return c;
  c = document.createElement('canvas'); c.width = c.height = 32;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, color); g.addColorStop(0.28, color); g.addColorStop(0.38, color + '66'); g.addColorStop(1, color + '00');
  x.fillStyle = g; x.fillRect(0, 0, 32, 32);
  dotCache.set(color, c);
  DT.bitmap(c, b => dotCache.set(color, b));
  return c;
}
function drawFx(dt) {
  if (!fxp.length) { if (fxDirty) { fxx.setTransform(FX_SCALE, 0, 0, FX_SCALE, 0, 0); fxx.clearRect(0, 0, BW, BH); fxDirty = false; } return; }
  fxDirty = true;
  if (fxp.length > 420) fxp.splice(0, fxp.length - 420);
  const K = FX_SCALE;
  fxx.setTransform(K, 0, 0, K, 0, 0);
  fxx.clearRect(0, 0, BW, BH);
  // confettis d'abord (mélange normal), puis tout ce qui brille (mélange additif) en une seule fois
  for (let i = fxp.length - 1; i >= 0; i--) {
    const p = fxp[i];
    if (p.kind !== 'conf') continue;
    p.life -= dt;
    if (p.life <= 0) { fxp.splice(i, 1); continue; }
    p.vx *= 0.98; p.vy += 520 * dt; p.rot += p.vr * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    const cs = Math.cos(p.rot), sn = Math.sin(p.rot), sy = Math.cos(p.rot * 1.7);
    fxx.globalAlpha = Math.min(1, p.life / p.max * 1.6); fxx.fillStyle = p.color;
    fxx.setTransform(cs * K, sn * K, -sn * sy * K, cs * sy * K, p.x * K, p.y * K);
    fxx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
  }
  fxx.setTransform(K, 0, 0, K, 0, 0);
  fxx.globalCompositeOperation = 'lighter';
  for (let i = fxp.length - 1; i >= 0; i--) {
    const p = fxp[i];
    if (p.kind === 'fly') {
      p.t += dt / p.dur;
      if (p.t < 0) continue;
      if (p.t >= 1) {
        fxp.splice(i, 1);
        p.el.animate?.([{transform: 'scale(1.12)'}, {transform: 'scale(1)'}], {duration: 180});
        continue;
      }
      const t = p.t, u = 1 - t;
      const x = u * u * p.x0 + 2 * u * t * p.cx + t * t * p.x1, y = u * u * p.y0 + 2 * u * t * p.cy + t * t * p.y1;
      fxx.globalAlpha = 1; fxx.drawImage(dotSprite(p.color), x - 11, y - 11, 22, 22);
    } else if (p.kind === 'spark') {
      p.life -= dt;
      if (p.life <= 0) { fxp.splice(i, 1); continue; }
      p.vx *= 0.94; p.vy = p.vy * 0.94 + 300 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      const s = p.r * 3.2;
      fxx.globalAlpha = Math.min(1, p.life / p.max * 1.6);
      fxx.drawImage(dotSprite(p.color), p.x - s, p.y - s, s * 2, s * 2);
    }
  }
  fxx.globalCompositeOperation = 'source-over';
  fxx.globalAlpha = 1;
}
const SHAKE = [{transform: 'translate(0,0)'}, {transform: 'translate(-5px,3px)'}, {transform: 'translate(6px,-4px)'}, {transform: 'translate(-4px,-3px)'},
  {transform: 'translate(4px,4px)'}, {transform: 'translate(-3px,1px)'}, {transform: 'translate(2px,-2px)'}, {transform: 'translate(0,0)'}];
function shake(el = $('stage')) {
  if (lite()) return;
  if (el._shakeAnim) el._shakeAnim.cancel();
  el._shakeAnim = el.animate(SHAKE, {duration: 320, easing: 'linear'});
}
function pop(el, from = 1.35, ms = 180) { el.animate([{transform: `scale(${from})`}, {transform: 'scale(1)'}], {duration: ms, easing: 'ease-out'}); }
function centerOf(el) { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }

/* ================= Scène : la presse et le pop-it (voir stage.js) ================= */
const stage = $('stage'), cv = $('cv');
const Stage = DT.Stage;
Stage.init(cv);
DT.stageFont = getComputedStyle(document.documentElement).getPropertyValue('--display');
DT.stageMono = getComputedStyle(document.documentElement).getPropertyValue('--mono');
// Position de la scène mémorisée : la remesurer à chaque tap forçait un recalcul complet de la page.
let stageRect = null;
const getStageRect = () => stageRect || (stageRect = stage.getBoundingClientRect());
function stageResize() { stageRect = null; Stage.resize(); }
new ResizeObserver(stageResize).observe(stage);
addEventListener('resize', () => { stageRect = null; });
addEventListener('scroll', () => { stageRect = null; }, true);

/* ================= Actions ================= */
/* Anti-autoclic : au plus 20 taps par seconde (un humain très rapide en fait 10 à 15). Au-delà, le tap ne compte pas. */
const TAP_RATE = 20, TAP_BURST = 12;
let tapTokens = TAP_BURST, tapAt = 0, spamWarned = -1e9;
function tapAllowed() {
  const t = performance.now();
  tapTokens = Math.min(TAP_BURST, tapTokens + (t - tapAt) / 1000 * TAP_RATE); tapAt = t;
  if (tapTokens < 1) {
    if (t - spamWarned > 30000) { spamWarned = t; toast('Doucement ! Au-delà de 20 taps par seconde, les taps ne comptent plus (anti-autoclic).', 'coral'); }
    return false;
  }
  tapTokens--;
  return true;
}
DT.tapAllowed = tapAllowed;
function tap(x, y) {
  if (!inGame || S.paused || modalOpen()) return;
  if (!tapAllowed()) return;
  A.init();
  const t = now();
  combo = (t - lastTap < comboWin()) ? combo + 1 : 1;
  lastTap = t;
  if (combo > S.bestCombo) S.bestCombo = combo;
  const crit = Math.random() < critChance();
  const v = clickBase() * comboMult() * (crit ? 10 : 1);
  gain(v); S.clicks++; S.totClicks++;
  S.d2 = Math.max(floorD2(), S.d2 - 0.05);
  const res = Stage.hit(x, y, crit);
  Stage.float(x, y, '+' + fmt(v), crit);
  const r = getStageRect();
  A.slam(combo);
  addXp(1);
  DT.Extras.feverAdd(1.1 + Math.min(1.5, combo * 0.03)); DT.Extras.quest('tap', 1); DT.Extras.quest('combo', combo);
  DT.Social.tap(combo); DT.Stim.poke();
  if (crit) { S.crits++; DT.Extras.quest('crit', 1); A.crit(); shake(); burst(r.left + x, r.top + y, '#FFD23F', 22, 420); }
  megaAdd(100 / 150);
  if (res.crushed) onCrush(res, v, r); else A.pop();
  if (res.colDone !== undefined) onColDone(res.colDone, v);
  if (res.popComplete) onPopComplete(v, r);
  if (combo >= 5) {
    let tier = 0;
    while (tier + 1 < COMBO_TIERS.length && combo >= COMBO_TIERS[tier + 1].at) tier++;
    DT.setHidden($('combo'), false);
    DT.setText($('comboX'), fmtX(comboMult())); DT.setText($('comboN'), `COMBO ${combo}`);
    if (tier !== comboTier) {
      const up = tier > comboTier;
      comboTier = tier;
      DT.setClass($('combo'), 'combo t' + tier); DT.setText($('comboT'), COMBO_TIERS[tier].t);
      if (up && tier > 0) {
        Stage.word(COMBO_TIERS[tier].t, r.width / 2, r.height * 0.3, true, COMBO_TIERS[tier].c);
        A.colDone(tier * 2); pop($('combo'), 1.6, 300);
        if (tier >= 3) flash(COMBO_TIERS[tier].c);
      }
    }
    pop($('comboX'));
  }
  if (S.clicks >= 5) DT.setHidden($('hint'), true);
}
// Traitements communs au tap et à la Méga-Presse. v : valeur d'un tap, r : position de la scène.
function onCrush(res, v, r) {
  const bonus = v * res.hp * 0.6 * (res.golden ? 15 : 1);
  gain(bonus);
  S.crushed = (S.crushed || 0) + 1; DT.Social.hit(10);
  if (res.obj.id === 'phone') S.phones = (S.phones || 0) + 1;
  addXp(6); DT.Extras.feverAdd(3); DT.Extras.quest('crush', 1); megaAdd(2);
  if (res.boss) {
    S.bosses = (S.bosses || 0) + 1; DT.Extras.quest('boss', 1); megaAdd(25); DT.Social.hit(200);
    const loot = (Math.max(rawDps(), 1) * d2Mult() * 300 + clickBase() * 200) * (sag('s_boss') ? 2 : 1);
    gain(loot); A.bossKill(); banner('BOSS', 'K.O.', `+${fmt(loot)} nmol et un coffre magique`);
    shake(document.body); flash('#FFD23F'); confetti(innerWidth / 2, innerHeight * 0.4, 130);
    DT.Cards.give('magic', 'boss vaincu'); S.tickets = (S.tickets || 0) + 1; addFeed('Tu terrasses un <b>boss</b> !');
  }
  if (S.crushed % 20 === 0) DT.Cards.give('wood', `${S.crushed} objets écrasés`);
  if (res.obj.id === 'duck') A.squeak(); else A.crunch();
  const [cx, cy] = Stage.crushTarget();
  Stage.float(cx, cy - 40, '+' + fmt(bonus), res.golden);
  if (res.golden) {
    S.goldObj = (S.goldObj || 0) + 1;
    toast(`<b>${res.obj.name} doré</b> écrasé : +${fmt(bonus)} nmol !`);
    confetti(r.left + cx, r.top + cy, 50); shake();
    flyTo(r.left + cx, r.top + cy, $('bank'), 16);
    DT.Cards.give('gold', 'objet doré écrasé');
  }
}
function onColDone(col, v, quiet) {
  gain(v * 3); if (!quiet) A.colDone(col);
  addXp(3); DT.Extras.quest('col', 1); DT.Extras.feverAdd(2); megaAdd(3);
}
function onPopComplete(v, r) {
  const bonus = v * 25;
  gain(bonus); S.popits = (S.popits || 0) + 1; addXp(15); DT.Extras.quest('popit', 1);
  if (Math.random() < 0.35) DT.Cards.give('wood', 'pop-it complet');
  A.popComplete();
  Stage.word('POP-IT COMPLET !', r.width / 2, r.height * 0.8, true, '#5FE0B7');
  confetti(r.left + r.width / 2, r.top + r.height * 0.8, 40);
  toast(`<b>Pop-it complet !</b> Bonus : +${fmt(bonus)} nmol.`, 'mint');
}

/* ================= Méga-Presse ================= */
function megaAdd(x) {
  if ((S.mega || 0) >= 100) return;
  S.mega = Math.min(100, (S.mega || 0) + x);
  if (S.mega >= 100) { A.megaReady(); toast('<b>MÉGA-PRESSE prête !</b> Clique le bouton en bas à droite de la presse.'); }
}
function megaFire() {
  if (!inGame || modalOpen()) return;
  if ((S.mega || 0) < 100) { A.denied(); toast(`La Méga-Presse se recharge : <b>${Math.floor(S.mega || 0)} %</b>. Tape, écrase et bats des boss.`); return; }
  if (S.paused) { A.denied(); toast('Coupe le mode avion pour lancer la Méga-Presse.'); return; }
  A.init();
  const r = getStageRect(), vTap = clickBase() * comboMult();
  const res = Stage.mega();
  const v = vTap * 100 + unit() * 20;
  gain(v); DT.Social.hit(100);
  if (res.crushed) onCrush(res, vTap, r);
  for (const c of res.cols) onColDone(c, vTap, true);
  if (res.popComplete) onPopComplete(vTap, r);
  S.mega = 0; S.megas = (S.megas || 0) + 1;
  addXp(10);
  Stage.float(r.width / 2, r.height * 0.45, '+' + fmt(v), true);
  A.bossKill(); A.jackpot();
  shake(document.body); flash('#FF4F79');
  confetti(r.left + r.width / 2, r.top + r.height * 0.45, 120);
  flyTo(r.left + r.width / 2, r.top + r.height * 0.45, $('bank'), 20);
  if (S.megas === 1) addFeed('Tu déclenches ta première <b>Méga-Presse</b> !');
  updateUI(true);
}
$('megaBtn').addEventListener('click', e => { e.stopPropagation(); megaFire(); });

const W = () => stage.clientWidth;
stage.addEventListener('pointerdown', e => {
  if (e.target.closest('.golden, .veil, .emote-btn, .emote-pal, .mg-btn')) return;
  const r = getStageRect();
  tap(e.clientX - r.left, e.clientY - r.top);
});
stage.addEventListener('keydown', e => {
  if (e.target !== stage) return;  // Entrée sur un bouton de la scène ne doit pas aussi taper
  if (e.repeat) { e.preventDefault(); return; }  // touche maintenue enfoncée : ce n'est pas un tap
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const r = getStageRect(); tap(r.width / 2, r.height * 0.45); }
});

function buyGen(i) {
  if (!revealed(i)) return;
  const c = genCost(i, qty);
  if (S.bank < c) { A.denied(); return; }
  const first = S.gens[i] === 0;
  S.bank -= c; S.gens[i] += qty;
  A.buy(); addXp(2); DT.Extras.quest('buy', qty);
  const row = genRows[i].b, [x, y] = centerOf(row);
  burst(x - row.offsetWidth / 2 + 30, y, ERAS[S.era].color, 14, 220);
  row.animate([{transform: 'scale(1.02)'}, {transform: 'scale(1)'}], {duration: 250, easing: 'ease-out'});
  Stage.hearts(Math.min(12, 2 + qty));
  if (S.gens[i] >= 100 && S.gens[i] - qty < 100) egg('knight', `Hé hé hé ! 100 ${GENS[i].name} !`);
  if (first) { toast(`Nouvelle mécanique : <b>${GENS[i].name}</b>.`); addFeed(`Tu lances <b>${GENS[i].name}</b>.`); }
  updateUI(true);
}
function buyUp(u) {
  if (has(u.id)) return;
  if (S.bank < u.cost) { A.denied(); return; }
  S.bank -= u.cost; S.ups[u.id] = now();
  A.upgrade();
  toast(`<b>${esc(u.name)}</b> installé.`);
  updateUI(true);
}

/* ================= Notification dorée ================= */
let golden = null, goldenIn = rand(25, 55);
function spawnGolden() {
  if (golden || !inGame) return;
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'golden'; b.innerHTML = DT.svg('bell');
  b.dataset.n = String(1 + Math.floor(Math.random() * 98));
  b.setAttribute('aria-label', 'Notification dorée : cliquer pour un bonus');
  b.style.left = rand(8, 80) + '%'; b.style.top = rand(10, 72) + '%';
  b.addEventListener('pointerdown', e => e.stopPropagation());
  b.addEventListener('click', e => { e.stopPropagation(); claimGolden(); });
  stage.appendChild(b);
  golden = {b, life: sag('s_gold') ? 26 : 13};
  A.goldenSpawn();
}
function removeGolden() { if (golden) { golden.b.remove(); golden = null; } }
function claimGolden() {
  const [x, y] = centerOf(golden.b);
  removeGolden(); S.goldClicks++; addXp(10); DT.Extras.quest('golden', 1);
  if (Math.random() < 0.12) DT.Cards.give('magic', 'notification dorée');
  A.golden(); burst(x, y, '#FFC247', 30, 380);
  const r = Math.random();
  if (r < 0.42) {
    buff('prod', 7, 30, 'Frénésie ×7');
    toast('<b>Tendance virale !</b> Production ×7 pendant 30 s.');
  } else if (r < 0.78) {
    const g = (Math.min(S.bank * 0.15, Math.max(rawDps(), 1) * d2Mult() * 900) + 13) * (sag('s_gold') ? 2 : 1);
    gain(g); flyTo(x, y, $('bank'), 16);
    toast(`<b>Jackpot</b> : +${fmt(g)} nmol d'un coup.`);
  } else if (r < 0.92) {
    buff('tap', 77, 12, 'Tap ×77');
    toast('<b>Doigt en feu</b> : chaque tap vaut 77× plus pendant 12 s.');
  } else {
    S.d2 = 100;
    toast('<b>Sieste imprévue</b> : récepteurs D2 remis à 100 %.', 'mint');
  }
  updateUI(true);
}

/* ================= Événements à choix ================= */
let evIn = rand(110, 170), curEv = null, lastEv = null;
function showEvent() {
  const pool = EVENTS.filter(e => e.id !== lastEv);
  curEv = pool[Math.floor(Math.random() * pool.length)]; lastEv = curEv.id;
  $('evIc').innerHTML = DT.svg(curEv.icon);
  $('evTitle').textContent = curEv.title;
  $('evText').textContent = curEv.text;
  for (const k of ['a', 'b']) {
    const btn = $('ev' + k.toUpperCase());
    btn.querySelector('b').textContent = curEv[k].label;
    btn.querySelector('small').textContent = curEv[k].hint;
  }
  $('eventModal').hidden = false;
  A.event();
}
function chooseEvent(k) {
  if (!curEv) return;
  const opt = curEv[k];
  $('eventModal').hidden = true;
  opt.fx(G);
  S.events++; addXp(8);
  if (opt.side === 'cynic') S.cynic++; else S.kind++;
  A.click();
  addFeed(`${esc(curEv.title)} : tu choisis « ${esc(opt.label)} ».`);
  curEv = null;
  evIn = rand(150, 270);
  updateUI(true);
}
$('evA').addEventListener('click', () => chooseEvent('a'));
$('evB').addEventListener('click', () => chooseEvent('b'));

/* ================= Chapitres ================= */
function applyEra(i, cinematic) {
  const E = ERAS[i], root = document.documentElement.style;
  root.setProperty('--era', E.color); root.setProperty('--era-rgb', E.rgb);
  $('eraNum').textContent = 'CHAPITRE ' + E.num; $('eraName').textContent = E.name;
  A.setEra(i);
  rebuildTicker();
  if (!cinematic) return;
  const tc = $('titlecard');
  $('tcNum').textContent = 'CHAPITRE ' + E.num;
  $('tcName').textContent = E.name; $('tcName').dataset.text = E.name;
  $('tcLine').textContent = E.line;
  tc.hidden = false; tc.style.animation = 'none'; void tc.offsetWidth; tc.style.animation = '';
  setTimeout(() => { tc.hidden = true; }, 4700);
  A.era();
  setTimeout(() => confetti(innerWidth / 2, innerHeight * 0.45, 70), 900);
  addFeed(`Tu entres dans le <b>chapitre ${E.num} : ${E.name}</b>.`);
  push();
}

/* ================= Succès ================= */
const G = {
  get S() { return S; }, flags, effDps, floorD2, gain, spend, buff, toast, spawnGolden,
  give: (t, why) => DT.Cards.give(t, why),
  hasRarity: r => hasRarity(r),
  friendCount: () => friendCount(),
  myRank: () => ranking('life', 'fr').findIndex(p => p.self) + 1,
};
function checkAch() {
  let n = 0;
  for (const a of ACH) {
    if (S.ach[a.id]) continue;
    let ok = false; try { ok = a.t(G); } catch (e) {}
    if (ok) { S.ach[a.id] = now(); if (n++ < 2) trophy(a); }
  }
  if (n) renderAch();
}
function renderAch() {
  $('achCount').textContent = `${achCount()}/${ACH.length}`;
  $('achs').innerHTML = ACH.map(a => {
    const got = !!S.ach[a.id];
    const hidden = a.secret && !got;
    return `<div class="ach${got ? ' got' : ''}"><span class="ai">${DT.svg(got ? 'trophy' : 'lock')}</span>
      <span><span class="n" style="display:block">${hidden ? '???' : esc(a.name)}</span><span class="d">${hidden ? 'Succès secret.' : esc(a.desc)}</span></span></div>`;
  }).join('');
}

/* ================= Interface ================= */
const genRows = GENS.map((g, i) => {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'gen';
  b.innerHTML = `<span class="gi"></span><span><span class="n"></span><span class="d"></span>
    <span class="meta"><span class="c"></span><span class="p"></span></span></span><span class="own">0</span><span class="ms"></span>`;
  b.addEventListener('click', () => buyGen(i));
  $('gens').appendChild(b);
  return {b, gi: b.querySelector('.gi'), n: b.querySelector('.n'), d: b.querySelector('.d'), c: b.querySelector('.c'),
          p: b.querySelector('.p'), own: b.querySelector('.own'), ms: b.querySelector('.ms'), icon: null};
});
const revealed = i => i === 0 || S.gens[i] > 0 || S.gens[i - 1] > 0 || S.run >= GENS[i].cost * 0.4;

function segGroup(id, onPick) {
  const btns = document.querySelectorAll(`#${id} button`);
  btns.forEach(b => b.addEventListener('click', () => {
    btns.forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
    A.click(); onPick(b);
  }));
}
segGroup('qty', b => { qty = +b.dataset.q; updateUI(true); });

/* ================= Téléphone : navigation, installation ================= */
// Sur petit écran, une seule colonne est affichée à la fois (voir le bloc « Téléphone » de style.css).
document.body.dataset.view = 'play';
$('mnav').addEventListener('click', e => {
  const b = e.target.closest('[data-view]'); if (!b) return;
  document.body.dataset.view = b.dataset.view;
  $('mnav').querySelectorAll('[data-view]').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
  document.querySelector('.grid').scrollTop = 0;
  DT.Stim.layout();
  A.click();
});
// Version web : hors ligne grâce au service worker, et installable comme une appli (pas en file://, donc pas dans Electron).
const isWeb = /^https?:$/.test(location.protocol);
if (isWeb && 'serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
let installEvt = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; $('installBtn').hidden = false; });
addEventListener('appinstalled', () => { installEvt = null; $('installBox').hidden = true; toast('Dopamine Tycoon est installé sur ton écran d\'accueil !', 'mint'); });
$('installBtn').addEventListener('click', async () => {
  if (!installEvt) return;
  installEvt.prompt();
  try { await installEvt.userChoice; } catch (e) {}
  installEvt = null; $('installBtn').hidden = true;
});
function installInfo() {
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  $('installBox').hidden = !isWeb || standalone;
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  $('installTxt').textContent = ios
    ? 'Dans Safari : touche le bouton Partager (le carré avec une flèche), puis « Sur l\'écran d\'accueil ».'
    : installEvt ? 'Un clic et le jeu s\'ouvre en plein écran, comme une vraie appli.'
      : 'Dans Chrome : menu ⋮ puis « Installer l\'application » (ou « Ajouter à l\'écran d\'accueil »).';
}

document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.tabs button').forEach(x => x.setAttribute('aria-selected', x === b ? 'true' : 'false'));
  for (const t of ['shop', 'stim', 'cards', 'sag', 'ach', 'stats']) $('tab-' + t).hidden = t !== b.dataset.tab;
  if (b.dataset.tab === 'stim') DT.Stim.render();
  A.click();
  if (b.dataset.tab === 'stats') renderStats();
  if (b.dataset.tab === 'sag') renderSag();
  if (b.dataset.tab === 'cards') DT.Cards.renderCollection();
}));

let upKey = '';
const visibleUps = () => UPS.filter(u => !has(u.id) && u.req(G));
function renderUps(list) {
  const box = $('ups');
  box.innerHTML = '';
  if (!list.length) { box.innerHTML = `<div class="empty">Rien à débloquer pour l'instant. Continue à taper et à acheter des mécaniques.</div>`; return; }
  list.slice(0, 12).forEach(u => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'up'; b.dataset.id = u.id;
    b.innerHTML = `${DT.svg(u.icon || 'heart')}<span class="n">${esc(u.name)}</span><span class="d">${esc(u.desc)}</span><span class="c">${fmt(u.cost)} nmol</span>`;
    b.addEventListener('click', () => buyUp(u));
    box.appendChild(b);
  });
}

let dispBank = 0;
function updateUI(force) {
  const T = DT.setText, C = DT.setClass, St = DT.setStyle;
  const raw = rawDps(), tg = targetD2(raw), eff = effDps();
  T($('dps'), fmt(eff));
  T($('dpc'), fmt(clickBase()));
  T($('mult'), fmtX(permMult()));
  T($('multd'), `${achCount()} succès · ${Object.keys(S.cards || {}).length} cartes · ${fmt(S.ser)} sérénité`);
  T($('lvl'), S.lvl || 1);
  St($('xpBar'), 'width', `${Math.round(Math.min(100, (S.xp || 0) / xpNeed(S.lvl || 1) * 100))}%`);
  const xpTitle = `${Math.floor(S.xp || 0)} / ${xpNeed(S.lvl || 1)} XP`;
  if ($('xpBar').parentElement.title !== xpTitle) $('xpBar').parentElement.title = xpTitle;
  T($('prank'), (dif().ico ? dif().ico + ' ' : '') + DT.rankOf(S.life));
  T($('d2v'), `${Math.round(S.d2)} %`);
  St($('d2bar'), 'width', Math.round(S.d2 * 2) / 2 + '%');
  St($('d2tg'), 'left', `calc(${Math.round(tg * 2) / 2}% - 1px)`);
  const effTxt = d2Mult().toFixed(2).replace('.', ',');
  DT.setHTML($('d2note'), S.paused
    ? `Récupération : <b>+${has('u_medit') ? '5' : '2,5'} % par seconde</b>. Efficacité à la reprise : <b>×${effTxt}</b>.`
    : S.d2 > tg + 0.5
      ? `Efficacité <b>×${effTxt}</b>. Les récepteurs se désensibilisent vers <b>${Math.round(tg)} %</b> (trait blanc).`
      : `Efficacité <b>×${effTxt}</b>. Équilibre à <b>${Math.round(tg)} %</b>. Plus tu produis, plus ce seuil descend. Le mode avion le fait remonter.`);
  const pl = $('plane');
  DT.setHTML(pl, DT.svg('plane') + (S.paused ? 'Couper le mode avion' : 'Activer le mode avion'));
  C(pl, 'btn plane' + (S.paused ? ' on' : ''));
  if (pl.getAttribute('aria-pressed') !== String(S.paused)) pl.setAttribute('aria-pressed', String(S.paused));
  DT.setHidden($('veil'), !S.paused);
  const mg = Math.min(100, S.mega || 0), mgReady = mg >= 100;
  St($('megaLiq'), 'height', Math.round(mg) + '%');
  C($('megaBtn'), 'mg-btn' + (mgReady ? ' ready' : ''));
  T($('megaPct'), mgReady ? 'GO' : Math.floor(mg) + '%');
  DT.Pass.tick();
  T($('veilText'), sag('s_pilot')
    ? 'Tes récepteurs D2 remontent à la surface. Le pilote automatique maintient 25 % de la production.'
    : "Tes récepteurs D2 remontent à la surface. Rien n'est produit tant que le mode avion est actif.");
  T($('detoxText'), `Remets tout à zéro contre des points de Sérénité. Chaque point ajoute ${Math.round(serPct() * 100)} % à ta production pour toujours, et se dépense en sagesses. Tes succès, tes sagesses et ton chapitre restent.`);
  const sagOk = SAGES.filter(x => !sag(x.id) && serAvail() >= x.cost).length;
  T($('sagCount'), sagOk ? `${sagOk} dispo` : `${Object.keys(S.sag || {}).length}/${SAGES.length}`);
  if ($('sagCount').classList.contains('hot') !== sagOk > 0) $('sagCount').classList.toggle('hot', sagOk > 0);

  const g = serGain();
  T($('dxg'), '+' + fmt(g));
  T($('dxn'), fmt(Math.pow(g + 1, 3) * 1e7) + ' nmol');
  if (!detoxArmed) DT.setDisabled($('detox'), g < 1);

  DT.setHTML($('buffs'), S.buffs.filter(b => b.until > now()).map(b =>
    `<span class="buff${b.m < 1 ? ' bad' : ''}">${esc(b.label)} · ${Math.ceil((b.until - now()) / 1000)} s</span>`).join(''));

  let shownLocked = false;
  GENS.forEach((gd, i) => {
    const r = genRows[i], rev = revealed(i);
    DT.setHidden(r.b, !rev && shownLocked);
    if (!rev) {
      shownLocked = true;
      C(r.b, 'gen locked');
      if (r.icon !== 'lock') { r.gi.innerHTML = DT.svg('lock'); r.icon = 'lock'; }
      T(r.n, '???'); T(r.d, `Se dévoile après ${fmt(gd.cost * 0.4)} nmol produits dans cette partie.`);
      T(r.c, ''); T(r.p, ''); T(r.own, ''); St(r.ms, 'width', '0');
      return;
    }
    const c = genCost(i, qty), per = gd.prod * genMult(i) * globalMult() * d2Mult() * pilotRate();
    C(r.b, 'gen' + (S.bank >= c ? ' ok' : '') + (r.b.classList.contains('bump') ? ' bump' : ''));
    if (r.icon !== gd.icon) { r.gi.innerHTML = DT.svg(gd.icon); r.icon = gd.icon; }
    T(r.n, gd.name); T(r.d, gd.desc);
    T(r.c, `${qty > 1 ? '×' + qty + ' · ' : ''}${fmt(c)} nmol`);
    const share = S.gens[i] && eff > 0 ? ` · ${Math.round(genDps(i) * d2Mult() * pilotRate() / eff * 100)} %` : '';
    T(r.p, `${fmt(per)}/s chacun${share}`);
    T(r.own, S.gens[i]);
    const next = TIERS.find(t => t.at > S.gens[i]);
    St(r.ms, 'width', next ? `${Math.round(Math.min(100, S.gens[i] / next.at * 100))}%` : '100%');
  });

  const vis = visibleUps();
  const key = vis.slice(0, 12).map(u => u.id).join(',');
  if (force || key !== upKey) { upKey = key; renderUps(vis); }
  T($('upcount'), vis.length ? `${vis.length} dispo` : '');
  $('ups').querySelectorAll('.up').forEach(b => {
    const u = UPS.find(x => x.id === b.dataset.id);
    if (u && b.classList.contains('ok') !== S.bank >= u.cost) b.classList.toggle('ok', S.bank >= u.cost);
  });
  A.setIntensity(Math.min(1, Math.log10(1 + eff) / 9));
}

function renderStats() {
  const rows = [
    ['h', 'Cette partie'],
    ['Produit', fmt(S.run) + ' nmol'], ['Durée', fmtTime(S.runTime)], ['Taps', fmt(S.clicks)],
    ['Bonus des choix', fmtX(S.runMult)],
    ['h', 'Depuis toujours'],
    ['Produit', fmt(S.life) + ' nmol'], ['Temps de jeu', fmtTime(S.playTime)], ['Taps', fmt(S.totClicks)],
    ['Objets écrasés', fmt(S.crushed || 0)], ['Objets dorés écrasés', fmt(S.goldObj || 0)], ['Pop-it terminés', fmt(S.popits || 0)], ['Coffres ouverts', fmt(S.chestsOpened || 0)], ['Modes Hype', fmt(S.fevers || 0)], ['Boss terrassés', fmt(S.bosses || 0)], ['Tours de roue', fmt(S.spinsDone || 0)], ['Jackpots', fmt(S.jackpots || 0)], ['Quêtes terminées', fmt(S.questsDone || 0)], ['Meilleure série quotidienne', `${S.dailyBest || 0} j`], ['Parties de bandit manchot', fmt(S.slotSpins || 0)], ['Meilleur multiplicateur', `×${S.slotBest || 0}`], ['Tickets grattés / gagnants', `${S.scratched || 0} / ${S.scratchWins || 0}`], ['Gouttes attrapées', fmt(S.drops || 0)], ['Duels gagnés', fmt(S.duelsWon || 0)], ['Parties de casino', fmt(S.casinoPlays || 0)], ['Misé au casino', fmt(S.casinoBet || 0) + ' nmol'], ['Gagné au casino', fmt(S.casinoWon || 0) + ' nmol'], ['Meilleur multiplicateur casino', `×${(S.casinoBest || 0).toFixed(2).replace('.', ',')}`], ['Cartes', `${Object.keys(S.cards || {}).length}/${DT.CARDS.length}`], ['Stimulations', `${DT.Stim.count(S)}/${DT.Stim.STIMS.length}`], ['Coins parfaits du logo DVD', fmt(S.dvdCorners || 0)], ['Niveau', fmt(S.lvl || 1)],
    ['Meilleur combo', fmt(S.bestCombo)], ['Taps critiques', fmt(S.crits)], ['Notifications dorées', fmt(S.goldClicks)],
    ['Événements tranchés', fmt(S.events)], ['Choix cyniques / humains', `${S.cynic} / ${S.kind}`],
    ['Mode avion cumulé', fmtTime(S.planeTime)], ['Cures de désintox', fmt(S.resets)],
    ['Méga-Presses', fmt(S.megas || 0)], ['Fusions de cartes', fmt(S.fusions || 0)], ['Collections complètes', `${DT.SETS.filter(x => (S.setsDone || {})[x.id]).length}/${DT.SETS.length}`], ['Pass Dopamine', `palier ${DT.Pass.tierOf((S.pass || {}).pts || 0)} / ${DT.Pass.TIERS}`],
    ['Sérénité gagnée / dépensée', `${fmt(S.ser)} / ${fmt(S.serSpent || 0)}`], ['Sagesses', `${Object.keys(S.sag || {}).length}/${SAGES.length}`],
    ['h', 'Multiplicateurs'],
    ['Sérénité', fmtX(1 + serPct() * S.ser)], ['Succès', fmtX(1 + 0.01 * achCount())], ['Récepteurs D2', fmtX(d2Mult())],
    ['Rang', DT.rankOf(S.life)], ['Difficulté', `${dif().name} (production ${fmtX(dif().prod)}, Sérénité ${fmtX(dif().ser)})`],
  ];
  $('stats').innerHTML = rows.map(r => r[0] === 'h' ? `<tr class="h"><td colspan="2">${r[1]}</td></tr>` : `<tr><td>${r[0]}</td><td>${esc(r[1])}</td></tr>`).join('');
}

/* ================= Mode avion, désintox, remise à zéro ================= */
$('plane').addEventListener('click', () => {
  S.paused = !S.paused; A.click();
  toast(S.paused ? '<b>Mode avion</b> activé. Les récepteurs récupèrent.' : '<b>Mode avion</b> coupé. La machine repart.', 'mint');
  updateUI(true);
});

let detoxArmed = false;
$('detox').addEventListener('click', () => {
  const g = serGain();
  if (g < 1) return;
  const btn = $('detox');
  if (!detoxArmed) {
    detoxArmed = true;
    btn.textContent = `Confirmer : tout remettre à zéro pour +${fmt(g)} Sérénité`;
    btn.classList.replace('mint', 'warn');
    setTimeout(() => { if (detoxArmed) resetDetoxBtn(); }, 4500);
    return;
  }
  resetDetoxBtn();
  const keep = {};
  for (const k of ['life', 'ach', 'serSpent', 'sag', 'totClicks', 'goldClicks', 'playTime', 'events', 'cynic', 'kind', 'planeTime', 'bestCombo', 'crits', 'era', 'crushed', 'popits', 'goldObj', 'phones', 'eggs', 'emotes', 'cards', 'chests', 'chestsOpened', 'xp', 'lvl', 'fevers', 'spins', 'nextFree', 'spinsDone', 'jackpots', 'quests', 'questsDone', 'daily', 'dailyBest', 'bosses', 'tickets', 'slotSpins', 'slotBest', 'slotJackpots', 'scratched', 'scratchWins', 'drops', 'bestRain', 'duels', 'duelSeen', 'duelsWon', 'duelsSent', 'casinoPlays', 'casinoBet', 'casinoWon', 'casinoBest', 'bigWins', 'allInWins', 'crash10', 'plinko25', 'mines5', 'coinBest', 'rouNum', 'bjNat', 'pokerRoyal', 'towerTop', 'bTrades', 'bWon', 'bBest', 'bMoon', 'bLiq', 'swaps', 'swapOut', 'swapSeen', 'swapsDone', 'mega', 'megas', 'pass', 'fusions', 'setsDone', 'stim', 'dvdCorners', 'grassDone', 'hardResets', 'friends', 'frInit', 'frSeen', 'season', 'seasonDone', 'medals', 'dc', 'dcDone', 'dcRew', 'wb', 'wbKills', 'clan', 'hiloBest']) keep[k] = S[k];
  if (S.dif >= 2) keep.hardResets = (S.hardResets || 0) + 1;
  keep.dif = DT.DIFS[+$('difSel').value] ? +$('difSel').value : S.dif;
  S = fresh(Object.assign(keep, {ser: S.ser + g, resets: S.resets + 1}));
  if (sag('s_start')) { S.gens[0] = 10; S.gens[1] = 5; }
  removeGolden(); upKey = '';
  A.detox();
  confetti(innerWidth / 2, innerHeight / 2, 80);
  toast(`Retraite terminée. <b>+${fmt(g)} Sérénité</b> : production ${fmtX(1 + serPct() * S.ser)} pour toujours. Dépense-la dans l'onglet Sagesses.`, 'mint');
  if (sag('s_chest')) setTimeout(() => DT.Cards.give('magic', 'souvenir de retraite'), 900);
  renderSag();
  addFeed(`Tu pars en cure de désintox : <b>+${fmt(g)} Sérénité</b>. Nouvelle partie en <b>${esc(dif().name)}</b>.`);
  saveLocal(); push(true); updateUI(true);
});
function resetDetoxBtn() { detoxArmed = false; const b = $('detox'); b.textContent = 'Partir en retraite'; b.classList.replace('warn', 'mint'); }

let wipeArm = 0;
$('wipe').addEventListener('click', () => {
  const b = $('wipe');
  if (now() > wipeArm) {
    wipeArm = now() + 4000; b.textContent = 'Sûr ? Cliquer à nouveau efface tout'; b.classList.add('arm');
    setTimeout(() => { if (now() > wipeArm) { b.textContent = 'Effacer ma progression sur ce compte'; b.classList.remove('arm'); } }, 4100);
    return;
  }
  wipeArm = 0; b.textContent = 'Effacer ma progression sur ce compte'; b.classList.remove('arm');
  S = fresh(); removeGolden(); upKey = '';
  applyEra(0, false); renderAch(); renderSag(); saveLocal(); push();
  toast('Progression effacée. Nouveau départ.'); updateUI(true); renderStats();
});

/* ================= Classement mondial, amis & fil des potes =================
 * Tous les joueurs du serveur forment le classement Monde. Les amis (S.friends, gardés dans la sauvegarde, donc sur
 * tous tes appareils) ont leur propre classement, et seuls leurs exploits remplissent le fil et les notifications.
 * Les signatures empêchent de modifier le score des autres, mais chacun peut trafiquer son propre jeu : chaque client
 * vérifie donc que les scores publiés restent possibles (audit) et range les scores douteux à part. */
let players = {}, feed = [], sortKey = 'life', scope = 'fr', netOk, lastPush = 0, pulledOnce = false, prevOrder = null;
let suspects = {}, susDirty = false, active = 0, lastPlayersSave = 0, lastSvPush = 0;
const warnedImpostors = new Set(), warnedVer = new Set();
const isFriend = k => !!(S.friends && Object.hasOwn(S.friends, k));
const friendCount = () => Object.keys(S.friends || {}).length;
const BOARD_MAX = 100, FRIENDS_MAX = 100;
// Rythme réseau selon le nombre de joueurs actifs : le serveur gratuit limite les messages et les requêtes.
const pushEvery = () => (active < 40 ? 4 : active < 300 ? 6 : 10) * 60000;
const pullEvery = () => (active < 40 ? 30 : active < 300 ? 45 : 75) * 1000;
const onlineFor = () => pushEvery() * 2 + 60000;

function myStats() {
  let top = '';
  for (let i = GENS.length - 1; i >= 0; i--) if (S.gens[i] > 0) { top = GENS[i].name; break; }
  return {life: S.life, run: S.run, dps: effDps(), ser: S.ser, resets: S.resets, era: S.era, ach: achCount(), top, paused: S.paused, combo: S.bestCombo, lvl: S.lvl || 1, cards: Object.keys(S.cards || {}).length, bosses: S.bosses || 0, fevers: S.fevers || 0, jackpots: S.jackpots || 0, slotJackpots: S.slotJackpots || 0, duelsWon: S.duelsWon || 0, bigWins: S.bigWins || 0, dup: DT.Echange.dups(), ver: DT.VERSION,
    fr: Object.keys(S.friends || {}).slice(0, 60), dif: S.dif, ...DT.Social.stats()};
}
// ok : true (en ligne), false (hors ligne), null (en pause : limite du serveur atteinte, reprise automatique).
function setNet(ok) {
  const st = ok === null ? 'wait' : ok ? 'ok' : 'err';
  if (netOk === st) return;
  netOk = st;
  $('netst').textContent = st === 'ok' ? 'en ligne' : st === 'wait' ? 'en pause' : 'hors ligne';
  $('netst').title = st === 'wait' ? 'Le serveur gratuit du classement limite le nombre de messages : le jeu se remet en ligne tout seul dans quelques minutes.' : '';
  $('netst').className = 'netst ' + st;
}
// La sauvegarde chiffrée voyage au plus toutes les 10 minutes (ou tout de suite si force) : le reste du temps, le score seul.
async function push(force) {
  if (!me || !inGame) return;
  lastPush = now();
  if (!offlinePending) S.saved = now();  // pas avant le calcul des gains hors ligne
  const withSave = force === true || now() - lastSvPush > (active < 300 ? 10 : 30) * 60000;
  try {
    const r = await NET.publish(myStats(), withSave ? S : null, null, null, force === true);
    if (r && withSave) lastSvPush = now();
    setNet(r);
  } catch (e) { setNet(false); }
}
function addFeed(html, t = now()) {
  feed.unshift({t, html});
  feed.length = Math.min(feed.length, 30);
  if (me) LS.set('dt-feed-' + me.key, feed);
  renderFeed();
}
function renderFeed() {
  $('feed').innerHTML = feed.length
    ? feed.slice(0, 14).map(f => `<li><time>${hhmm(f.t)}</time><span>${f.html}</span></li>`).join('')
    : `<li class="empty">Rien pour l'instant. Les exploits de tes amis s'afficheront ici.</li>`;
}

/* Anti-triche : un score publié doit rester possible. Les marges sont très larges (casino, Bourse, gains hors ligne…)
 * pour ne jamais accuser un joueur honnête : seuls les scores trafiqués grossièrement sont écartés. */
function audit(m, old) {
  const s = m.st;
  // Le contenu du jeu s'arrête vers 1e21 (dernière amélioration) : même des mois de jeu et de casino restent très loin
  // de 1e60. À relever si un jour de vrais joueurs s'en approchent.
  if (s.life > 1e60) return 'score hors du jeu';
  if (s.run > s.life * 1.001 + 100) return 'partie plus grande que le total';
  if (s.cards > DT.CARDS.length || s.ach > ACH.length) return 'cartes ou succès impossibles';
  if (s.era > eraIdx(s.life)) return 'chapitre impossible';
  if (s.dps > s.life * 50 + 1e5) return 'production impossible';
  const so = DT.Social.audit(m);
  if (so) return so;
  if (old && old.st) {
    const dt = Math.max(0, (m.t - old.t) / 1000), o = old.st;
    const lim = o.life * 2000 + Math.max(o.dps, Math.min(s.dps, o.dps * 1e3 + 1e6)) * (dt + 900) * 50 + 1e8;
    if (s.life - o.life > lim) return 'progression trop rapide';
  }
  return '';
}

async function pull() {
  if (!me) return;
  let res;
  try { res = await NET.poll(); setNet(true); } catch (e) { setNet(NET.paused ? null : false); return; }
  let news = false;
  const small = Object.keys(players).length < 30;
  for (const m of res.fresh) {
    if (m.key === me.key) continue;
    try { DT.Games.onDuelMsg(m, me); } catch (e) { report(e, 'duel'); }
    try { DT.Echange.onMsg(m, me); } catch (e) { report(e, 'échange'); }
    const old = players[m.key];
    if (old && old.t >= m.t) continue;
    try { onFriendEmote(m); } catch (e) { report(e, 'emote'); }
    const sus = suspects[m.key];
    if (sus && m.st.life < sus.life * 0.01) { delete suspects[m.key]; susDirty = true; }  // il a tout effacé : on oublie
    const why = audit(m, old);
    if (why && !suspects[m.key]) { suspects[m.key] = {r: why, life: m.st.life, t: m.t}; susDirty = true; }
    const fr = isFriend(m.key), n = `<b>${esc(m.name)}</b>`;
    if (fr && S.friends[m.key] !== m.name) S.friends[m.key] = m.name;
    if (m.st.fr.includes(me.key) && !fr && !S.frSeen.includes(m.key)) {
      S.frSeen.push(m.key); if (S.frSeen.length > 200) S.frSeen.shift();
      toast(`${n} t'a ajouté en ami ! Touche ☆ à côté de son nom (classement Monde) pour l'ajouter aussi.`, 'mint');
      addFeed(`${n} t'a ajouté en ami.`, m.t); A.upgrade();
    }
    if (m.st.ver && DT.newer(m.st.ver, DT.VERSION) && !warnedVer.has(m.st.ver)) {
      warnedVer.add(m.st.ver);
      toast(`${n} joue à une version plus récente du jeu (<b>${esc(m.st.ver)}</b>, toi ${esc(DT.VERSION)}). Demande-lui le nouveau .exe !`, 'mint');
      addFeed(`Une nouvelle version du jeu existe : <b>${esc(m.st.ver)}</b> (${n} l'a déjà).`, m.t);
    }
    if (!old && pulledOnce && (fr || small)) { addFeed(`${n} rejoint la partie.`, m.t); news = true; }
    if (old && fr) {
      if (m.st.resets > old.st.resets) { addFeed(`${n} part en cure de désintox. Sérénité : ${fmt(m.st.ser)}.`, m.t); toast(`${n} part en cure de désintox.`, 'mint'); news = true; }
      if (m.st.era > old.st.era) { const E = ERAS[m.st.era]; addFeed(`${n} entre dans le chapitre ${E.num} : ${E.name}.`, m.t); toast(`${n} atteint le chapitre ${E.num} : <b>${E.name}</b>.`); news = true; }
      if (m.st.slotJackpots > old.st.slotJackpots) { addFeed(`${n} touche le <b>777</b> au bandit manchot !`, m.t); toast(`${n} touche le 777 au bandit manchot !`); news = true; }
      if (m.st.bigWins > old.st.bigWins) { addFeed(`${n} fait un <b>GROS GAIN</b> au casino !`, m.t); news = true; }
      if (m.st.bosses > old.st.bosses) addFeed(`${n} terrasse un boss.`, m.t);
      if (m.st.jackpots > old.st.jackpots) { addFeed(`${n} décroche le <b>JACKPOT</b> à la roue !`, m.t); toast(`${n} décroche le JACKPOT à la roue !`); news = true; }
      if (m.st.lvl > old.st.lvl && m.st.lvl % 5 === 0) addFeed(`${n} passe niveau ${m.st.lvl}.`, m.t);
      if (m.st.ach > old.st.ach) addFeed(`${n} débloque ${m.st.ach - old.st.ach > 1 ? m.st.ach - old.st.ach + ' succès' : 'un succès'} (${m.st.ach}/${ACH.length}).`, m.t);
      if (m.st.top && m.st.top !== old.st.top) addFeed(`${n} lance sa première mécanique « ${esc(m.st.top)} ».`, m.t);
    }
    players[m.key] = {name: m.name, st: m.st, t: m.t};
  }
  for (const name of res.impostors) {
    if (warnedImpostors.has(name) || warnedImpostors.size > 20) continue;
    warnedImpostors.add(name);
    toast(`Quelqu'un a tenté de publier un score sous le nom <b>${esc(name)}</b>. Signature refusée.`, 'coral');
  }
  let a = 0;
  for (const k in players) if (now() - players[k].t < 15 * 60000) a++;
  active = a;
  // Avec des milliers de joueurs, réécrire toute la liste à chaque relevé coûterait cher : une fois par minute.
  if (!pulledOnce || now() - lastPlayersSave > 60000) { lastPlayersSave = now(); savePlayers(); }
  if (susDirty) { susDirty = false; LS.set('dt-sus-' + me.key, suspects); }
  pulledOnce = true;
  if (news) rebuildTicker();
  try { DT.Social.observe(); } catch (e) { report(e, 'social'); }
  renderBoard();
}

// Liste des joueurs gardée sur l'appareil, allégée : les listes d'amis et de doublons ne servent que pour les amis.
function savePlayers() {
  const out = {};
  for (const k in players) {
    const p = players[k];
    out[k] = isFriend(k) ? p : {name: p.name, t: p.t, st: {...p.st, fr: [], dup: [], top: ''}};
  }
  LS.set('dt-players-' + me.key, out);
}
// sc : 'fr' (toi et tes amis) ou 'world' (tout le monde). Les scores douteux passent en dernier.
function ranking(key, sc = scope) {
  const list = [];
  for (const k in players) {
    if (sc === 'fr' && !isFriend(k)) continue;
    const p = players[k];
    list.push({key: k, name: p.name, t: p.t, sus: suspects[k] ? 1 : 0, ...p.st});
  }
  if (me) list.push({key: me.key, name: me.name, t: now(), self: true, sus: 0, ...myStats()});
  const v = p => DT.Social.val(p, key);
  return list.sort((a, b) => (a.sus - b.sus) || v(b) - v(a));
}
function checkOvertakes() {
  if (!me) return;
  const order = ranking('life', 'fr').map(p => p.key);
  if (prevOrder && pulledOnce) {
    const myB = prevOrder.indexOf(me.key), myA = order.indexOf(me.key);
    for (const k of order) {
      if (k === me.key || prevOrder.indexOf(k) === -1 || !players[k]) continue;
      const wasAbove = prevOrder.indexOf(k) < myB, isAbove = order.indexOf(k) < myA;
      const n = `<b>${esc(players[k].name)}</b>`;
      if (!wasAbove && isAbove) { toast(`${n} vient de te dépasser !`, 'coral'); addFeed(`${n} te dépasse au classement.`); A.denied(); }
      if (wasAbove && !isAbove) { toast(`Tu passes devant ${n} !`, 'mint'); addFeed(`Tu passes devant ${n}.`); A.upgrade(); }
    }
  }
  if (prevOrder && pulledOnce && order.length > 1 && order[0] === me.key && prevOrder[0] !== me.key) egg('chad', 'Numéro 1. Trop facile.');
  prevOrder = order;
}
function renderBoard() {
  if (!me) return;
  checkOvertakes();
  if (scope === 'clan') {
    DT.setHTML($('board'), DT.Social.clansHTML());
    DT.setText($('boardInfo'), `Classement des clans · ${DT.Social.seasonLabel()} · points de saison des membres`);
    return;
  }
  const list = ranking(sortKey);
  const myIdx = list.findIndex(p => p.self);
  const rows = list.slice(0, BOARD_MAX).map((p, i) => [p, i]);
  if (myIdx >= BOARD_MAX) rows.push([list[myIdx], myIdx]);
  const val = p => DT.Social.val(p, sortKey);
  const max = Math.max(1, ...rows.filter(([p]) => !p.sus).map(([p]) => val(p)));
  const unit = sortKey === 'life' ? 'nmol' : sortKey === 'dps' ? '/s' : sortKey === 'sp' ? 'pts' : sortKey === 'dv' ? DT.Social.dailyUnit() : 'sér.';
  const html = rows.map(([p, i]) => {
    const on = p.self || (now() - p.t < onlineFor());
    const E = ERAS[p.era || 0], D = DT.DIFS[p.dif === undefined ? 1 : p.dif] || DT.DIFS[1], fr = !p.self && isFriend(p.key);
    const status = p.self ? 'toi' : on ? (p.paused ? 'mode avion' : 'en jeu') : 'vu ' + ago(p.t);
    const w = p.sus ? 2 : Math.max(2, Math.round(val(p) / max * 100));
    const md = Array.isArray(p.md) ? p.md : [0, 0, 0];
    const medals = (md[0] ? `<em class="md">🥇${md[0] > 1 ? md[0] : ''}</em>` : '') + (md[1] ? `<em class="md">🥈${md[1] > 1 ? md[1] : ''}</em>` : '') + (md[2] ? `<em class="md">🥉${md[2] > 1 ? md[2] : ''}</em>` : '');
    const gap = myIdx >= BOARD_MAX && p.self ? ' gap' : '';
    return `<li class="pl${p.self ? ' me' : ''}${p.sus ? ' sus' : ` r${i + 1}`}${gap}" data-pk="${p.key}"><span class="rk">${p.sus ? '⚠' : i + 1}</span>
      <span class="who"><span class="nm"><i class="${on ? 'on' : ''}"></i><span>${esc(p.name)}</span>${D.ico ? `<em class="dif" title="${esc(D.name)}">${D.ico}</em>` : ''}${medals}${p.ser ? `<em>✦${fmt(p.ser)}</em>` : ''}${p.self ? '' : `<button type="button" class="fr-btn${fr ? ' on' : ''}" data-fk="${p.key}" data-n="${esc(p.name)}" title="${fr ? 'Retirer de tes amis' : 'Ajouter en ami'}" aria-label="${fr ? 'Retirer' : 'Ajouter'} ${esc(p.name)} ${fr ? 'de tes amis' : 'en ami'}">${fr ? '★' : '☆'}</button><button type="button" class="duel-btn" data-k="${p.key}" data-n="${esc(p.name)}" title="Défier ${esc(p.name)} en duel de taps">DÉFI</button>`}</span>
      <span class="sub">${p.sus ? `<b class="sus-why">score douteux : ${esc(suspects[p.key] ? suspects[p.key].r : '')}</b>` : `<span class="era" style="color:${E.color}">${E.num}</span> · Niv. ${p.lvl || 1}${p.cn ? ` · 🛡️ ${esc(p.cn)}` : ''} · ${esc(DT.rankOf(p.life || 0))} · ${status}`}</span></span>
      <span class="val">${fmt(val(p))} <span class="unit">${unit}</span></span>
      <span class="pbar"><span style="width:${w}%"></span></span></li>`;
  }).join('');
  const clean = list.filter(p => !p.sus).length;
  const empty = list.length > 1 ? '' : scope === 'fr'
    ? `<li class="empty">Pas encore d'amis. Ajoute-les avec leur pseudo ci-dessous, ou avec ☆ dans le classement Monde.</li>`
    : `<li class="empty">Personne d'autre pour l'instant. Envoie le jeu à tes potes : dès qu'ils créent leur compte, ils apparaissent ici.</li>`;
  DT.setHTML($('board'), html + empty);
  const pre = sortKey === 'sp' ? DT.Social.seasonLabel() + ' · ' : sortKey === 'dv' ? 'Défi du jour · ' : '';
  DT.setText($('boardInfo'), pre + (scope === 'fr'
    ? `${friendCount()} ami${friendCount() > 1 ? 's' : ''} · tu es ${myIdx + 1}${myIdx ? 'e' : 'er'}`
    : `Tu es ${myIdx + 1}${myIdx ? 'e' : 'er'} sur ${clean} joueur${clean > 1 ? 's' : ''}${list.length > BOARD_MAX ? ` (les ${BOARD_MAX} premiers affichés)` : ''}`));
}
// Toucher une ligne du classement ouvre le profil du joueur (sauf sur les boutons).
$('board').addEventListener('click', e => {
  if (e.target.closest('button')) return;
  const li = e.target.closest('li[data-pk]');
  if (li) DT.Social.profile(li.dataset.pk);
});
segGroup('sortby', b => { sortKey = b.dataset.k; renderBoard(); });
segGroup('boardScope', b => { scope = b.dataset.s; renderBoard(); });
function setScope(s) {
  scope = s;
  document.querySelectorAll('#boardScope button').forEach(b => b.setAttribute('aria-pressed', b.dataset.s === s ? 'true' : 'false'));
}
function addFriend(key, name) {
  if (!me || key === me.key) return;
  if (friendCount() >= FRIENDS_MAX) { toast(`${FRIENDS_MAX} amis maximum.`, 'coral'); A.denied(); return; }
  S.friends[key] = (players[key] && players[key].name) || name;
  toast(`<b>${esc(S.friends[key])}</b> est dans tes amis ! Une notification lui est envoyée.`, 'mint');
  A.upgrade(); saveLocal();
  lastPush = Math.min(lastPush, now() - pushEvery() + 8000);  // publication dans quelques secondes pour le prévenir
  renderBoard();
}
function removeFriend(key) {
  const name = S.friends[key];
  delete S.friends[key];
  toast(`<b>${esc(name || key)}</b> n'est plus dans tes amis.`);
  A.click(); saveLocal(); renderBoard();
}
$('board').addEventListener('click', e => {
  const b = e.target.closest('.fr-btn'); if (!b) return;
  e.stopPropagation();
  if (isFriend(b.dataset.fk)) removeFriend(b.dataset.fk); else addFriend(b.dataset.fk, b.dataset.n);
});
$('frForm').addEventListener('submit', e => {
  e.preventDefault();
  const raw = $('frName').value, name = NET.cleanName(raw), key = NET.nameKey(name), msg = $('frMsg');
  const say = (t, ok) => { msg.textContent = t; msg.className = 'auth-msg' + (ok ? ' ok' : ''); };
  if (!me) return;
  if (NET.checkName(name)) { say('Pseudo invalide.'); A.denied(); return; }
  if (key === me.key) { say("C'est toi !"); A.denied(); return; }
  if (isFriend(key)) { say('Déjà dans tes amis.'); return; }
  addFriend(key, name);
  say(players[key] ? `${players[key].name} ajouté !` : `${name} ajouté : apparaîtra dès sa prochaine partie.`, true);
  $('frName').value = '';
  if (scope !== 'fr') setScope('fr');
  renderBoard();
});

/* ================= Bandeau d'actu ================= */
function rebuildTicker() {
  const items = [];
  for (let e = 0; e <= S.era; e++) items.push(...HEADLINES[e].map(([k, t]) => `<span><b>${k}</b>${esc(t)}</span>`));
  const fr = Object.entries(players).filter(([k]) => isFriend(k)).map(([, p]) => p).sort((a, b) => b.t - a.t).slice(0, 4);
  for (const p of fr) items.push(`<span><b class="friend">EN DIRECT</b>${esc(p.name)} pèse ${fmt(p.st.life)} nmol et se dit « ${esc(DT.rankOf(p.st.life))} ».</span>`);
  items.sort(() => Math.random() - 0.5);
  $('ticker').innerHTML = items.join('') + items.join('');
}


/* ================= Sagesses ================= */
function renderSag() {
  const av = serAvail();
  $('sagAvail').textContent = fmt(av);
  $('sagTot').textContent = `sur ${fmt(S.ser)} gagnés`;
  $('sagNote').innerHTML = S.ser > 0
    ? `Les sagesses restent après chaque cure de désintox. Dépenser de la Sérénité ne réduit pas ton bonus de <b>${fmtX(1 + serPct() * S.ser)}</b>.`
    : `Tu n'as pas encore de Sérénité. Pars une première fois en cure de désintox pour gagner tes premiers points.`;
  $('sags').innerHTML = SAGES.map(x => {
    const own = sag(x.id), ok = !own && av >= x.cost;
    return `<button type="button" class="up sg${own ? ' owned' : ok ? ' ok' : ''}" data-id="${x.id}"${own ? ' aria-disabled="true"' : ''}>${DT.svg(x.icon)}` +
      `<span class="n">${esc(x.name)}</span><span class="d">${esc(x.desc)}</span><span class="c">${own ? 'Acquise' : `${x.cost} Sérénité`}</span></button>`;
  }).join('');
}
$('sags').addEventListener('click', e => {
  const b = e.target.closest('.up'); if (!b) return;
  const x = SAGES.find(y => y.id === b.dataset.id);
  if (!x || sag(x.id)) return;
  if (serAvail() < x.cost) { A.denied(); return; }
  S.serSpent = (S.serSpent || 0) + x.cost; S.sag[x.id] = 1;
  A.upgrade();
  const [cx, cy] = centerOf(b); confetti(cx, cy, 30);
  toast(`Sagesse acquise : <b>${esc(x.name)}</b>.${x.id === 's_start' ? ' Elle prendra effet à ta prochaine partie.' : ''}`, 'mint');
  addFeed(`Tu acquiers la sagesse « ${esc(x.name)} ».`);
  saveLocal(); renderSag(); updateUI(true);
});

/* ================= Niveaux & bannières ================= */
const xpNeed = l => Math.floor(30 * Math.pow(l, 1.5));
function addXp(n) {
  n *= dif().xp;
  DT.Social.xp(n);
  DT.Pass.add(n);
  S.xp = (S.xp || 0) + n; S.lvl = S.lvl || 1;
  let ups = 0;
  while (S.xp >= xpNeed(S.lvl)) { S.xp -= xpNeed(S.lvl); S.lvl++; ups++; }
  if (ups) levelUp();
}
function levelUp() {
  const l = S.lvl;
  const type = l % 10 === 0 ? 'legend' : l % 5 === 0 ? 'magic' : l % 2 === 0 ? 'gold' : 'wood';
  S.tickets = (S.tickets || 0) + 1;
  banner('NIVEAU', String(l), `Récompense : ${DT.CHESTS[type].name} + 1 ticket à gratter`);
  A.levelUp(); flash(ERAS[S.era].color);
  confetti(innerWidth / 2, innerHeight * 0.35, 80);
  DT.Cards.give(type, `niveau ${l}`);
  addFeed(`Tu passes <b>niveau ${l}</b>.`);
}
let bannerTimer = 0;
function banner(top, big, sub) {
  if (DT.Stim) DT.Stim.react(top);
  const b = $('banner');
  $('bannerTop').textContent = top; $('bannerBig').textContent = big; $('bannerSub').textContent = sub || '';
  b.hidden = false; b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
  clearTimeout(bannerTimer); bannerTimer = setTimeout(() => { b.hidden = true; }, 2400);
}
function flash(color) {
  if (lite()) return;
  const f = $('flash');
  f.style.background = color; f.hidden = false;
  f.animate([{opacity: 0.55}, {opacity: 0}], {duration: 500, easing: 'ease-out'});
  setTimeout(() => { f.hidden = true; }, 500);
}
const hasRarity = r => Object.keys(S.cards || {}).some(id => (DT.CARDS.find(c => c.id === id) || {}).rarity === r);

/* ================= Emotes & easter eggs ================= */
const EMO = Object.fromEntries(DT.EMOTES.map(e => [e.id, e]));
const esvg = e => DT.cardArt(e.id);
let lastEmote = 0, typed = '', enteredAt = now(), lastYuno = 0;
const lastEmSeen = {};
function renderEmotes() {
  $('emoteBtn').innerHTML = esvg(EMO.wave);
  $('emotePal').innerHTML = DT.EMOTES.map(e => `<button type="button" data-id="${e.id}" title="${esc(e.name)}" aria-label="${esc(e.name)}">${esvg(e)}</button>`).join('');
}
renderEmotes();
$('emoteBtn').addEventListener('click', e => {
  e.stopPropagation();
  const p = $('emotePal'); p.hidden = !p.hidden;
  $('emoteBtn').setAttribute('aria-expanded', String(!p.hidden)); A.click();
});
$('emotePal').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  e.stopPropagation(); $('emotePal').hidden = true; $('emoteBtn').setAttribute('aria-expanded', 'false');
  sendEmote(b.dataset.id);
});
document.addEventListener('pointerdown', e => {
  if (!e.target.closest('.emote-pal, .emote-btn')) { $('emotePal').hidden = true; $('emoteBtn').setAttribute('aria-expanded', 'false'); }
});
function showBubble(name, id, self) {
  const e = EMO[id]; if (!e) return;
  const d = document.createElement('div');
  d.className = 'bubble';
  d.style.left = (self ? rand(4, 28) : rand(42, 66)) + '%'; d.style.top = rand(6, 36) + '%';
  d.innerHTML = `<div class="face">${esvg(e)}</div><b>${esc(name)}</b>`;
  $('emoteShow').appendChild(d);
  while ($('emoteShow').children.length > 4) $('emoteShow').firstChild.remove();
  setTimeout(() => d.remove(), 2900);
  A.emote();
}
async function sendEmote(id) {
  if (!me || !Object.hasOwn(EMO, id)) return;
  // Chaque emote est un message sur le serveur, qui en limite le nombre par jour : une toutes les 20 s.
  if (now() - lastEmote < 20000) { toast('Doucement : une emote toutes les 20 secondes.'); A.denied(); return; }
  lastEmote = now(); S.emotes = (S.emotes || 0) + 1;
  showBubble('Toi', id, true);
  lastPush = now();
  try { setNet(await NET.publish(myStats(), null, {id, t: now()})); } catch (e) { setNet(false); }
}
function onFriendEmote(m) {
  if (!m.em || !Object.hasOwn(EMO, m.em.id) || m.em.t <= (lastEmSeen[m.key] || 0)) return;
  lastEmSeen[m.key] = m.em.t;
  if (!pulledOnce || now() - m.t > 3 * 60000) return;
  showBubble(m.name, m.em.id, false);
  addFeed(`<b>${esc(m.name)}</b> envoie « ${esc(EMO[m.em.id].name)} ».`, m.t);
}

const memeQ = [];
let memeBusy = false;
function nextMeme() {
  const m = memeQ.shift();
  if (!m) { memeBusy = false; return; }
  memeBusy = true;
  const el = $('meme');
  el.className = 'meme ' + m.style;
  $('memeFace').innerHTML = esvg(EMO[m.id]); $('memeCap').textContent = m.cap;
  el.hidden = false; el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  setTimeout(() => { el.hidden = true; nextMeme(); }, m.style === 'cross' ? 2600 : m.style === 'peek' ? 3400 : 3200);
}
function egg(id, cap, style = '', sound) {
  if (!inGame) return;
  S.eggs = S.eggs || {};
  const first = !S.eggs[id];
  S.eggs[id] = now();
  memeQ.push({id, cap, style}); if (!memeBusy) nextMeme();
  (sound || A.emote)();
  if (first) {
    toast(`Easter egg trouvé : <b>${esc(EMO[id].name)}</b> (${Object.keys(S.eggs).length}/8).`);
    addFeed(`Tu découvres un easter egg : « ${esc(EMO[id].name)} ».`);
  }
}
function makeItRain() {
  const r = $('rain'); r.hidden = false;
  setTimeout(() => { r.hidden = true; }, 6000);
  egg('rain', 'Même les princes pleurent…', '', A.rain);
}

/* ================= Boucle ================= */
let lastFrame = performance.now(), lastUI = 0, lastSec = 0, lastSave = 0, lastPull = 0;
// Chaque étape est isolée : un bug dans un module ne doit arrêter ni la production, ni l'affichage, ni la sauvegarde.
// (appel direct de la fonction avec son argument : aucune fonction créée à chaque image)
function run(fn, arg, where) { try { fn(arg); } catch (e) { report(e, where); } }
function tick(dt) {
  run(DT.Extras.tick, dt, 'hype, roue, quêtes');
  run(DT.Games.tick, dt, 'salle de jeux');
  run(DT.Casino.tick, dt, 'casino');
  run(DT.Bourse.tick, dt, 'bourse');
  run(DT.Echange.tick, dt, 'échanges');
  run(DT.Stim.tick, dt, 'stimulations');
  run(DT.Social.tick, dt, 'social');
  const t = now();
  S.buffs = S.buffs.filter(b => b.until > t);
  S.playTime += dt; S.runTime += dt;
  const raw = rawDps(), tg = targetD2(raw);
  if (S.paused) {
    S.d2 = Math.min(100, S.d2 + (has('u_medit') ? 5 : 2.5) * dt);
    S.planeTime += dt;
    if (sag('s_pilot')) gain(raw * d2Mult() * 0.25 * dt);
  } else {
    if (S.d2 > tg) S.d2 = Math.max(tg, S.d2 - 0.5 * dt); else S.d2 = Math.min(tg, S.d2 + 0.3 * dt);
    gain(raw * d2Mult() * dt);
    if (sag('s_robot')) gain(clickBase() * 3 * dt);
  }
  if (combo > 1 && t - lastTap > comboWin()) {
    if (combo >= 25) { A.comboBreak(); toast(`Combo terminé : <b>${combo} taps</b> (${fmtX(comboMult())}).`); }
    if (combo >= 50) makeItRain();
    combo = 0; comboTier = -1; $('combo').hidden = true;
  }
  if (golden) { golden.life -= dt; if (golden.life <= 0) removeGolden(); }
  else if (!modalOpen()) { goldenIn -= dt; if (goldenIn <= 0) { spawnGolden(); goldenIn = rand(40, 110) / (has('u_gold') ? 2 : 1); } }
  if (!modalOpen() && !S.paused && dt < 5 && !document.hidden) { evIn -= dt; if (evIn <= 0) showEvent(); }
}
function everySecond() {
  const e = eraIdx(S.life);
  if (e > S.era) { S.era = e; applyEra(e, true); }
  repairNumbers();
  checkAch();
  renderBoard();
  if (!S.paused && !modalOpen() && now() - Math.max(lastTap, enteredAt) > 45000 && now() - lastYuno > 120000) {
    lastYuno = now(); egg('yuno', 'POURQUOI TU TAPES PLUS ?!', 'peek');
  }
  const hr = new Date().getHours();
  if ((hr >= 22 || hr < 6) && !flags.moon) { flags.moon = true; egg('moon', 'Il est tard… encore un petit tap ?'); }
  if (!$('tab-stats').hidden) renderStats();
  if (!flags.stillShown && !modalOpen() && now() - lastInput > 5 * 60000) {
    flags.stillShown = true; $('stillModal').hidden = false;
  }
}
function frame(t) {
  requestAnimationFrame(frame);  // programmé d'abord : une erreur dans cette image n'arrête jamais les suivantes
  try { frameBody(t); } catch (e) { report(e, 'boucle'); }
}
const stageEnv = {rgb: '', dps: 0, paused: false};
function drawStage(fdt) {
  stageEnv.rgb = ERAS[S.era].rgb; stageEnv.dps = effDps(); stageEnv.paused = S.paused;
  Stage.draw(fdt, stageEnv);
}
function drawBank(fdt) {
  dispBank += (S.bank - dispBank) * Math.min(1, fdt * 12);
  if (Math.abs(S.bank - dispBank) < 0.05 || !Number.isFinite(dispBank)) dispBank = S.bank;
  DT.setText($('bank'), fmt(dispBank));
}
function saveTick() { saveLocal(); NET.build(myStats(), S).catch(() => {}); }
function frameBody(t) {
  const dt = Math.min((t - lastFrame) / 1000, 8 * 3600);
  lastFrame = t;
  const fdt = Math.min(dt, 0.05);
  run(drawBg, fdt, 'fond');
  if (inGame) {
    run(tick, dt, 'production');
    run(drawStage, fdt, 'scène');
    run(drawBank, fdt, 'banque');
    if (t - lastUI > 120) { lastUI = t; run(updateUI, false, 'interface'); }
    if (t - lastSec > 1000) { lastSec = t; run(everySecond, null, 'chaque seconde'); }
    if (t - lastSave > 10000) { lastSave = t; run(saveTick, null, 'sauvegarde'); }
    if (t - lastPull > pullEvery()) { lastPull = t; pull().catch(e => report(e, 'classement')); }
    if (now() - lastPush > pushEvery()) push();
    if (offlinePending && DT.clock.trusted) run(offlineReward, null, 'hors ligne');
  }
  run(drawFx, fdt, 'effets');
}
const modalOpen = () => ['eventModal', 'stillModal', 'welcome', 'settings', 'chestModal', 'wheelModal', 'dailyModal', 'slotModal', 'scratchModal', 'raceModal', 'casinoModal', 'bourseModal', 'swapModal', 'passModal', 'saveModal', 'guideModal', 'profModal'].some(id => !$(id).hidden);

/* ================= Sauvegarde ================= */
// Un NaN ou un Infinity dans l'état casserait la partie pour toujours (toute opération donne NaN) :
// on remet la dernière valeur saine, vérifiée chaque seconde et avant chaque sauvegarde.
const good = {};
function repairNumbers() {
  for (const k in S) {
    const v = S[k];
    if (typeof v !== 'number') continue;
    if (Number.isFinite(v)) { good[k] = v; continue; }
    S[k] = Number.isFinite(good[k]) ? good[k] : k === 'runMult' ? 1 : k === 'd2' ? 100 : 0;
    report(new Error(`valeur invalide corrigée : ${k} = ${v}`), 'état');
  }
  if (S.gens.some(n => !(Number.isFinite(n) && n >= 0))) S.gens = S.gens.map(n => Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0);
}
// Sauvegarde locale, avec une copie de secours toutes les 10 minutes (la version précédente, déjà saine).
let lastBak = 0, saveWarned = 0;
function saveLocal() {
  if (!me) return;
  repairNumbers();
  if (!offlinePending) S.saved = now();
  const key = 'dt-save-' + me.key;
  if (now() - lastBak > 600000) { const prev = LS.raw(key); if (prev) LS.setRaw(key + '-bak', prev); lastBak = now(); }
  if (!LS.set(key, S) && now() - saveWarned > 60000) {
    saveWarned = now();
    toast("Impossible d'enregistrer la partie sur ce PC (disque plein ?). Exporte-la depuis les Réglages par sécurité.", 'coral');
  }
}
// Lit la sauvegarde locale ; si elle est abîmée, reprend la copie de secours.
function loadLocal(key) {
  const raw = LS.raw('dt-save-' + key);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) {}
  report(new Error('sauvegarde illisible'), 'chargement');
  const bak = LS.get('dt-save-' + key + '-bak');
  toast(bak ? 'Ta sauvegarde était abîmée : la copie de secours a été chargée.' : 'Ta sauvegarde était abîmée et aucune copie de secours n\'existe.', 'coral');
  return bak;
}
// Sur téléphone, on change d'appli sans arrêt : on publie au plus une fois par minute en partant.
document.addEventListener('visibilitychange', () => { if (document.hidden && inGame) { saveLocal(); if (now() - lastPush > 60000) push(); } });
window.addEventListener('beforeunload', () => { if (inGame) { saveLocal(); NET.beacon(); } });

/* ================= Entrées diverses ================= */
const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let kIdx = 0;
document.addEventListener('keydown', e => {
  lastInput = now();
  if (!inGame) return;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (k.length === 1 && e.target.tagName !== 'INPUT') {
    typed = (typed + k).slice(-12);
    if (typed.endsWith('aaaah')) { typed = ''; egg('giant', 'AAAAAAAAAAAAH !', 'cross', A.scream); }
    else if (typed.endsWith('coucou')) { typed = ''; egg('wave', 'Coucou toi !'); }
    else if (typed.endsWith('mine')) { typed = ''; egg('miner', 'Retour à la mine…'); }
  }
  kIdx = k === KONAMI[kIdx] ? kIdx + 1 : (k === KONAMI[0] ? 1 : 0);
  if (kIdx === KONAMI.length) {
    kIdx = 0;
    if (!flags.konami) {
      flags.konami = true;
      buff('prod', 7, 60, 'Konami ×7');
      toast('<b>30 vies supplémentaires.</b> Enfin, production ×7 pendant 60 s.');
      confetti(innerWidth / 2, innerHeight / 3, 90);
      A.era();
    }
  }
});
document.addEventListener('pointerdown', () => { lastInput = now(); A.init(); }, true);

$('stillYes').addEventListener('click', () => { flags.still = true; $('stillModal').hidden = true; lastInput = now(); A.click(); });
$('stillNo').addEventListener('click', () => { $('stillModal').hidden = true; leaveGame(false); });

$('btnSound').addEventListener('click', () => {
  const on = SET.sfx || SET.music;
  SET.sfx = !on; SET.music = !on;
  $('optSfx').checked = SET.sfx; $('optMusic').checked = SET.music;
  applySettings();
});
$('btnSettings').addEventListener('click', () => {
  $('optSfx').checked = SET.sfx; $('optMusic').checked = SET.music; $('optVol').value = SET.vol; $('optLite').checked = SET.lite; $('optStim').checked = SET.stim !== false; $('optVideo').checked = SET.video !== false; installInfo();
  const errs = LS.get('dt-errors') || [];
  $('verInfo').textContent = `Dopamine Tycoon version ${DT.VERSION}` + (errs.length ? ` · ${errs.length} erreur${errs.length > 1 ? 's' : ''} notée${errs.length > 1 ? 's' : ''}` : '');
  $('copyErr').hidden = !errs.length;
  $('accInfo').innerHTML = me ? `Connecté en tant que <b>${esc(me.name)}</b>. Ton mot de passe chiffre ta sauvegarde et signe tes scores : personne d'autre ne peut jouer sur ton compte.` : '';
  $('settings').hidden = false;
});
$('optSfx').addEventListener('change', e => { SET.sfx = e.target.checked; applySettings(); });
$('optMusic').addEventListener('change', e => { SET.music = e.target.checked; applySettings(); });
$('optVol').addEventListener('input', e => { SET.vol = +e.target.value; applySettings(); });
$('optLite').addEventListener('change', e => { SET.lite = e.target.checked; applySettings(); });
$('optStim').addEventListener('change', e => { SET.stim = e.target.checked; applySettings(); DT.Stim.layout(); });
$('optVideo').addEventListener('change', e => { SET.video = e.target.checked; applySettings(); DT.Stim.layout(); });
$('sClose').addEventListener('click', () => { $('settings').hidden = true; });
$('logout').addEventListener('click', () => { $('settings').hidden = true; leaveGame(true); });
for (const id of ['settings']) $(id).addEventListener('click', e => { if (e.target.id === id) $(id).hidden = true; });

/* ================= Copier du texte ================= */
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('Copié dans le presse-papiers.', 'mint'); return; } catch (e) {}
  const ta = document.createElement('textarea');
  ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  let ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
  ta.remove();
  toast(ok ? 'Copié dans le presse-papiers.' : 'Copie impossible : sélectionne le texte et fais Ctrl + C.', ok ? 'mint' : 'coral');
}
$('copyErr').addEventListener('click', () => copyText(JSON.stringify({version: DT.VERSION, erreurs: LS.get('dt-errors') || []}, null, 1)));

/* ================= Sauvegarde : exporter / importer ================= */
let svArm = 0;
function openSave() {
  $('settings').hidden = true;
  $('svExport').hidden = !inGame;
  $('svCode').value = ''; DT.setDisabled($('svCopy'), true);
  $('svMsg').textContent = ''; $('svMsg').className = 'auth-msg'; svArm = 0;
  $('saveModal').hidden = false;
  A.click();
}
$('openSave').addEventListener('click', openSave);
$('authImport').addEventListener('click', openSave);
$('svClose').addEventListener('click', () => { $('saveModal').hidden = true; });
$('svMake').addEventListener('click', async () => {
  if (!me || !inGame) return;
  saveLocal();
  try {
    $('svCode').value = await NET.exportCode(S);
    DT.setDisabled($('svCopy'), false); A.upgrade();
  } catch (e) { report(e, 'export'); toast('Impossible de créer le code de sauvegarde.', 'coral'); }
});
$('svCopy').addEventListener('click', () => { if ($('svCode').value) copyText($('svCode').value); });
$('svImport').addEventListener('click', async () => {
  const code = $('svIn').value, pw = $('svPass').value, msg = $('svMsg'), btn = $('svImport');
  msg.className = 'auth-msg';
  if (!code.trim() || !pw) { msg.textContent = 'Colle le code de sauvegarde et entre le mot de passe du compte.'; A.denied(); return; }
  if (inGame && now() > svArm) {
    svArm = now() + 5000;
    msg.textContent = 'Clique encore sur IMPORTER pour confirmer : la partie du code remplacera celle de ce compte sur ce PC.';
    return;
  }
  svArm = 0; btn.disabled = true;
  msg.className = 'auth-msg ok'; msg.textContent = 'Vérification du code et du mot de passe…';
  try {
    if (inGame) { saveLocal(); push(); }
    const res = await NET.importCode(code, pw, $('fRemember').checked);
    $('svIn').value = ''; $('svPass').value = ''; msg.textContent = '';
    $('saveModal').hidden = true;
    enterGame(res.account, res.save, false, true);
  } catch (err) {
    msg.className = 'auth-msg';
    msg.textContent = err && err.message ? err.message : 'Erreur inattendue.';
    A.denied();
  } finally { btn.disabled = false; }
});

/* ================= Comment jouer ================= */
function openGuide() { $('settings').hidden = true; $('guideModal').hidden = false; A.click(); }
$('btnHelp').addEventListener('click', openGuide);
$('openGuide').addEventListener('click', openGuide);
for (const id of ['gdClose', 'gdGo']) $(id).addEventListener('click', () => { $('guideModal').hidden = true; });

/* ================= Connexion ================= */
let mode = 'login', pendingDif = 1;
function setMode(m) {
  mode = m;
  $('tabLogin').setAttribute('aria-pressed', m === 'login' ? 'true' : 'false');
  $('tabSignup').setAttribute('aria-pressed', m === 'signup' ? 'true' : 'false');
  $('confirmWrap').hidden = m === 'login';
  $('fPass').setAttribute('autocomplete', m === 'login' ? 'current-password' : 'new-password');
  $('authSubmit').textContent = m === 'login' ? 'Se connecter' : 'Créer mon compte';
  $('authNote').textContent = m === 'login'
    ? 'Nouveau ? Passe sur « Créer un compte ». Tu peux te connecter depuis un autre PC si tu as joué dans les 12 dernières heures.'
    : 'Ton mot de passe ne quitte jamais ton PC : il chiffre ta sauvegarde et signe tes scores. Aucune récupération possible, note-le bien.';
  $('authMsg').textContent = ''; $('authMsg').className = 'auth-msg';
}
$('tabLogin').addEventListener('click', () => setMode('login'));
$('tabSignup').addEventListener('click', () => setMode('signup'));

function showForms() {
  $('resume').hidden = true; $('authForms').hidden = false;
  setMode(mode);
  setTimeout(() => $('fName').focus(), 50);
}
function showAuth() {
  inGame = false;
  $('game').hidden = true; $('auth').hidden = false;
  for (const id of ['eventModal', 'stillModal', 'welcome', 'settings', 'chestModal', 'wheelModal', 'dailyModal', 'slotModal', 'scratchModal', 'raceModal', 'casinoModal', 'bourseModal', 'swapModal', 'passModal', 'guideModal', 'profModal']) $(id).hidden = true;
  document.documentElement.style.setProperty('--era', ERAS[0].color);
  document.documentElement.style.setProperty('--era-rgb', ERAS[0].rgb);
}

$('authForm').addEventListener('submit', async e => {
  e.preventDefault();
  A.init();
  const name = $('fName').value, pw = $('fPass').value, keep = $('fRemember').checked;
  const msg = $('authMsg'), btn = $('authSubmit');
  msg.className = 'auth-msg';
  if (mode === 'signup' && pw !== $('fPass2').value) { msg.textContent = 'Les deux mots de passe ne correspondent pas.'; A.denied(); return; }
  btn.disabled = true; msg.className = 'auth-msg ok';
  msg.textContent = mode === 'login' ? 'Vérification du mot de passe…' : 'Création du compte et des clés…';
  try {
    const res = mode === 'login' ? await NET.login(name, pw, keep) : await NET.register(name, pw, keep);
    $('fPass').value = ''; $('fPass2').value = '';
    msg.textContent = '';
    pendingDif = +$('fDif').value;
    enterGame(res.account, res.save, mode === 'signup');
  } catch (err) {
    msg.className = 'auth-msg';
    msg.textContent = err && err.message ? err.message : 'Erreur inattendue.';
    A.denied();
  } finally { btn.disabled = false; }
});
$('resumeBtn').addEventListener('click', () => { A.init(); if (NET.me) enterGame(NET.me, null, false); });
$('switchAcc').addEventListener('click', () => { NET.logout(); showForms(); });

function enterGame(acc, remoteSave, isNew, imported) {
  me = acc;
  const local = loadLocal(acc.key);
  let src = local;
  if (imported) src = remoteSave;  // partie importée : elle remplace celle de ce PC
  else if (remoteSave && (!local || (remoteSave.saved || 0) > (local.saved || 0))) src = remoteSave;
  try { S = src ? hydrate(src) : fresh(); }
  catch (e) {
    report(e, 'chargement');
    const bak = LS.get('dt-save-' + acc.key + '-bak');
    try { S = bak ? hydrate(bak) : fresh(); } catch (e2) { S = fresh(); }
    toast(bak ? 'Ta sauvegarde était illisible : la copie de secours a été chargée.' : 'Ta sauvegarde était illisible : nouvelle partie.', 'coral');
  }
  for (const k in good) delete good[k];
  lastBak = 0;
  players = LS.get('dt-players-' + acc.key) || {};
  suspects = LS.get('dt-sus-' + acc.key) || {};
  feed = LS.get('dt-feed-' + acc.key) || [];
  if (isNew && DT.DIFS[pendingDif]) S.dif = pendingDif;
  // Première fois avec les amis : tous les joueurs déjà connus (la bande de potes d'avant) deviennent des amis.
  if (!S.frInit) {
    S.frInit = 1;
    for (const k of Object.keys(players).sort((a, b) => players[b].t - players[a].t)) if (k !== acc.key && friendCount() < FRIENDS_MAX) S.friends[k] = players[k].name;
  }
  // On oublie les inconnus pas vus depuis 7 jours (les amis restent), et on garde au plus 4 000 joueurs.
  const ks = Object.keys(players).filter(k => isFriend(k) || now() - players[k].t < 7 * 86400e3).sort((a, b) => players[b].t - players[a].t).slice(0, 4000);
  players = Object.fromEntries(ks.map(k => [k, players[k]]));
  active = ks.filter(k => now() - players[k].t < 15 * 60000).length;
  setScope(friendCount() ? 'fr' : 'world');
  $('difSel').value = String(S.dif);
  DT.clock.floor(S.saved || 0);
  tabClaim(acc.key);
  pulledOnce = false; prevOrder = null; combo = 0; comboTier = -1; upKey = ''; flags.stillShown = false;
  removeGolden();
  goldenIn = rand(25, 55); evIn = rand(110, 170);
  dispBank = S.bank; lastInput = now(); enteredAt = now(); flags.moon = false;

  $('pname').textContent = acc.name;
  $('av').textContent = acc.name.trim().charAt(0).toUpperCase();
  $('hint').hidden = S.clicks >= 5;
  $('auth').hidden = true; $('game').hidden = false;
  inGame = true;
  applyEra(S.era, false);
  stageResize(); renderAch(); renderFeed(); updateUI(true); renderBoard();
  DT.Cards.enter(); DT.Cards.renderSlots(); DT.Cards.renderCollection(); renderSag(); renderEmotes(); DT.Extras.enter(); DT.Games.enter();
  try { DT.Social.enter(); } catch (e) { report(e, 'social'); }
  lastPull = performance.now(); pull();
  lastPush = 0; lastSvPush = 0;  // publication tout de suite : elle donne aussi l'heure officielle du serveur
  offlinePending = !!src;
  if (offlinePending && DT.clock.trusted) offlineReward();
  if (imported) {
    saveLocal(); push(true);
    toast(`Partie importée : bon retour, <b>${esc(acc.name)}</b> !`, 'mint');
  }
  if (isNew) {
    openGuide();  // avant le cadeau du jour, qui attend que les fenêtres soient fermées
    setTimeout(() => DT.Cards.give('gold', 'cadeau de bienvenue'), 1500);
    toast(`Bienvenue <b>${esc(acc.name)}</b>. Tape la synapse pour produire ta première dopamine.`);
    addFeed(`<b>${esc(acc.name)}</b> fonde sa start-up dans un garage.`);
  }
}
/* Gains hors ligne : calculés seulement avec une heure fiable (celle du serveur, ou 12 s sans réseau),
 * pour qu'avancer l'heure du PC ne rapporte rien. */
let offlinePending = false;
function offlineReward() {
  offlinePending = false;
  if (!inGame) return;
  const sleep = sag('s_sleep');
  const away = Math.max(0, Math.min((now() - (S.saved || now())) / 1000, (sleep ? 24 : 8) * 3600));
  if (away > 60) {
    if (S.paused) S.d2 = Math.min(100, S.d2 + 2.5 * away);
    const g = rawDps() * d2Mult() * pilotRate() * away * (sleep ? 1 : 0.5);
    if (g > 0) {
      $('wText').innerHTML = `Tu es parti <b>${fmtTime(away)}</b>. Tes mécaniques ont produit <b>${fmt(g)} nmol</b> ${sleep ? 'à plein régime' : 'à mi-régime'}.`;
      $('welcome').hidden = false;
      $('wOk').onclick = () => {
        $('welcome').hidden = true; gain(g); A.golden();
        const [x, y] = centerOf($('wOk'));
        flyTo(x, y, $('bank'), 24);
      };
    }
  }
  S.saved = now();
}
/* Version web : une seule partie ouverte à la fois par compte (deux onglets s'écraseraient la sauvegarde).
 * Le dernier onglet ouvert gagne : l'ancien enregistre et revient à l'accueil. */
const tabId = Math.random().toString(36).slice(2);
const tabs = 'BroadcastChannel' in window ? new BroadcastChannel('dt-tabs') : null;
function tabClaim(key) { if (tabs) tabs.postMessage({k: 'enter', key, id: tabId}); }
if (tabs) tabs.onmessage = e => {
  const d = e.data || {};
  if (d.k !== 'enter' || d.id === tabId || !inGame || !me || d.key !== me.key) return;
  leaveGame(false);
  toast('Ta partie a été ouverte ailleurs (autre onglet ou fenêtre). Elle continue là-bas.', 'coral');
};
function leaveGame(logout) {
  if (inGame) { saveLocal(); push(true); if (me) savePlayers(); }
  showAuth();
  if (logout) { NET.logout(); me = null; mode = 'login'; showForms(); }
  else if (NET.me) { $('resume').hidden = false; $('authForms').hidden = true; $('resumeName').textContent = NET.me.name; }
}

/* ================= Démarrage ================= */
const wait = ms => new Promise(r => setTimeout(r, ms));
// Écran de chargement : polices, images des cartes, puis un premier rendu, avant d'afficher le jeu.
async function loadAll() {
  const bar = $('ldBar'), txt = $('ldTxt'), t0 = performance.now();
  const set = (p, t) => { bar.style.width = Math.round(p * 100) + '%'; if (t) txt.textContent = t; };
  set(0.05, 'Chargement des polices…');
  const fonts = ["400 20px Bungee", "400 20px 'Bungee Shade'", "400 16px 'Bricolage Grotesque'", "800 16px 'Bricolage Grotesque'", "400 14px 'JetBrains Mono'", "700 14px 'JetBrains Mono'"];
  await Promise.race([Promise.all(fonts.map(f => document.fonts.load(f, 'DOPAÉéà€123').catch(() => {}))), wait(4000)]);
  set(0.35, 'Chargement des cartes…');
  const files = Object.values(DT.MEME_FILES || {});
  let done = 0;
  await Promise.race([Promise.all(files.map(f => {
    const im = new Image(); im.src = 'memes/' + f;
    return im.decode().catch(() => {}).then(() => set(0.35 + 0.45 * (++done / Math.max(1, files.length))));
  })), wait(6000)]);
  set(0.82, 'Préparation des sons…');
  await Promise.race([A.prepare(), wait(3000)]);
  set(0.9, 'Préparation de la presse…');
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  set(1, "C'est parti !");
  const rest = 900 - (performance.now() - t0);
  if (rest > 0) await wait(rest);
  $('loader').classList.add('done');
  setTimeout(() => { $('loader').hidden = true; }, 500);
}
async function boot() {
  const loading = loadAll();
  DT.Extras.init({get S() { return S; }, sag, A, toast, confetti, shake, flash, banner, addFeed, buff, addXp, flyTo, fmt,
    give: (t, why) => DT.Cards.give(t, why), save: () => saveLocal(), modalOpen: () => modalOpen(),
    gainTime: sec => { const g = Math.max(rawDps() * d2Mult() * sec, clickBase() * sec * 2); gain(g); return g; },
    onChange: () => { if (inGame) updateUI(true); }, font: DT.stageFont, mono: DT.stageMono, hasFriends: () => friendCount() > 0});
  DT.Games.init({get S() { return S; }, A, toast, confetti, shake, flash, banner, addFeed, gain, spend, fmt, flyTo, burst, unit,
    give: (t, why) => DT.Cards.give(t, why), save: () => saveLocal(), modalOpen: () => modalOpen(), font: DT.stageFont,
    gainTime: sec => { const g = unit() * sec; gain(g); return g; },
    onChange: () => { if (inGame) updateUI(true); },
    publishDuel: dl => { if (!me) return; lastPush = now(); NET.publish(myStats(), null, null, dl, true).then(setNet).catch(() => setNet(false)); }});
  DT.Casino.init({get S() { return S; }, A, toast, confetti, shake, flash, banner, addFeed, gain, spend, fmt, flyTo, burst, unit,
    font: DT.stageFont, mono: DT.stageMono, onChange: () => { if (inGame) updateUI(false); }});
  DT.Bourse.init({get S() { return S; }, A, toast, confetti, shake, flash, banner, addFeed, gain, spend, fmt, flyTo, unit, mono: DT.stageMono,
    save: () => saveLocal(), onChange: () => { if (inGame) updateUI(false); }});
  DT.Echange.init({get S() { return S; }, A, toast, confetti, flash, banner, addFeed, save: () => saveLocal(),
    players: () => { if (!friendCount()) return players; const f = {}; for (const k in players) if (isFriend(k)) f[k] = players[k]; return f; },
    pulledOnce: () => pulledOnce, onChange: () => { if (inGame) updateUI(true); },
    publish: () => { if (!me) return; lastPush = now(); NET.publish(myStats(), null, null, null, true).then(setNet).catch(() => setNet(false)); }});
  DT.Pass.init({get S() { return S; }, A, toast, confetti, flash, banner, addFeed, buff, flyTo,
    give: (t, why) => DT.Cards.give(t, why), save: () => saveLocal(),
    gainTime: sec => { const g = Math.max(rawDps() * d2Mult() * sec, clickBase() * sec * 2); gain(g); return g; },
    onChange: () => { if (inGame) updateUI(true); }});
  Stage.bossExtra = () => sag('s_boss') ? 5 : 0;
  Stage.onEvent = (type, obj) => {
    if (type === 'bossSpawn') { A.boss(); shake(); toast(`<b>BOSS !</b> Écrase-le en ${Math.round(obj.time)} secondes pour un coffre magique.`, 'coral'); }
    if (type === 'bossEscape') { A.denied(); toast("Le boss s'est échappé… Tape plus vite la prochaine fois !", 'coral'); }
  };
  DT.Social.init({get S() { return S; }, A, give: (t, why) => DT.Cards.give(t, why), toast, banner, confetti, flash, shake, addFeed, fmt, ago,
    save: () => saveLocal(), onChange: () => { if (inGame) updateUI(true); }, modalOpen: () => modalOpen(), inGame: () => inGame,
    me: () => me, players: () => players, suspects: () => suspects, myStats: () => myStats(), isFriend, addFriend, removeFriend, renderBoard,
    publishSoon: () => { lastPush = Math.min(lastPush, now() - pushEvery() + 8000); }});
  DT.Stim.init({get S() { return S; }, A, gain, spend, fmt, unit, toast, confetti, flash, shake, banner, addFeed, lite,
    give: (t, why) => DT.Cards.give(t, why), save: () => saveLocal(), modalOpen: () => modalOpen(),
    visible: () => inGame && SET.stim !== false, videos: () => SET.video !== false, font: DT.stageFont, mono: DT.stageMono,
    onChange: () => { if (inGame) updateUI(true); }});
  DT.Cards.init({get S() { return S; }, A, toast, confetti, shake, addFeed, flash, banner, save: () => saveLocal(),
    onChange: () => { if (inGame) { updateUI(true); DT.Cards.renderCollection(); renderEmotes(); } }});
  applySettings();
  $('btnSettings').innerHTML = DT.svg('gear');
  $('btnHelp').innerHTML = DT.svg('help');
  bgResize();
  addEventListener('resize', bgResize);
  setMode('login');
  const acc = await NET.resume();
  if (acc) { $('resume').hidden = false; $('authForms').hidden = true; $('resumeName').textContent = acc.name; }
  else showForms();
  requestAnimationFrame(t => { lastFrame = t; frame(t); });
  await loading;
}
boot();

// Outil de test uniquement (URL avec ?debug), jamais actif dans le .exe.
if (new URLSearchParams(location.search).has('debug')) window.__dt = {G, gain, showEvent, spawnGolden, push, pull, Stage, X: DT.Extras, Games: DT.Games, Casino: DT.Casino, A, tap, ranking, renderBoard, addFriend, get S() { return S; }, get players() { return players; }, get suspects() { return suspects; }};

})(window.DT);
