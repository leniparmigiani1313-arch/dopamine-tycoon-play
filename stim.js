/* Dopamine Tycoon : les Stimulations (façon Stimulation Clicker).
 * Chaque stimulation achetée ajoute du chaos à l'écran (logo DVD, mèmes, notifications, gameplay de runner,
 * vraie presse hydraulique, chat en direct…) et +10 % de production. Rien n'est interactif : on regarde.
 * Les tuiles canvas sont dessinées à 30 images/s (15 en effets réduits), seulement quand elles sont visibles. */
window.DT = window.DT || {};
(function (DT) {
'use strict';

const $ = id => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
let api = null;

const STIMS = [
  {id: 'dvd',      icon: '📀', name: 'Logo DVD',               cost: 50,     desc: 'Un logo rebondit sur ton écran. Le jour où il touche un coin pile… JACKPOT.'},
  {id: 'memes',    icon: '🤡', name: 'Mèmes en folie',         cost: 500,    desc: 'Les mèmes surgissent toutes les 20 secondes au lieu de toutes les minutes.'},
  {id: 'notifs',   icon: '🔔', name: 'Notifications',          cost: 3000,   desc: 'Ton téléphone vibre. Encore. Et encore. Chaque notif rapporte un peu.'},
  {id: 'subway',   icon: '🏃', name: 'Gameplay Subway Surfers', cost: 2e4,   desc: 'Du vrai gameplay de Subway Surfers tourne en boucle à côté du jeu. Tu ne peux rien faire. Tu regardes.', tile: true},
  {id: 'parkour',  icon: '⛏️', name: 'Parkour',                cost: 6e4,    desc: 'Du vrai parkour filmé, en boucle, à côté du runner. Ton cerveau ne sait plus où regarder.', tile: true, needsVideo: true},
  {id: 'press',    icon: '🗜️', name: 'Presse hydraulique',     cost: 1.5e5,  desc: 'Une vraie presse hydraulique écrase du métal en boucle.', tile: true},
  {id: 'chat',     icon: '💬', name: 'Chat en direct',         cost: 1e6,    desc: 'Des milliers de viewers commentent chacun de tes exploits.', tile: true},
  {id: 'bars',     icon: '📶', name: 'Barres de progression',  cost: 8e6,    desc: 'Des barres qui se remplissent. Pour rien. C\'est parfait.', tile: true},
  {id: 'sand',     icon: '🔪', name: 'Sable cinétique',        cost: 6e7,    desc: 'Du sable cinétique coupé en tranches. ASMR garanti.', tile: true},
  {id: 'subs',     icon: '📈', name: 'Compteur d\'abonnés',    cost: 5e8,    desc: 'Ton nombre d\'abonnés en direct. Il ne fait que monter.', tile: true},
  {id: 'rgb',      icon: '🌈', name: 'Éclairage RGB',          cost: 4e9,    desc: 'Un contour RGB de gamer autour de l\'écran. +10 % de FPS (c\'est faux).'},
  {id: 'owl',      icon: '🦉', name: 'Le Hibou',               cost: 3e10,   desc: 'Un hibou te rappelle ta leçon quotidienne. Il ne lâche jamais l\'affaire.'},
  {id: 'confetti', icon: '🎉', name: 'Confettis gratuits',     cost: 3e11,   desc: 'Des confettis. Sans raison. Tout le temps.'},
  {id: 'wash',     icon: '🚿', name: 'Nettoyeur haute pression', cost: 3e12, desc: 'Un vrai jet haute pression nettoie un trottoir crasseux. En boucle.', tile: true},
  {id: 'spinner',  icon: '🌀', name: 'Fidget spinner',         cost: 1e13,   desc: 'Un fidget spinner arc-en-ciel qui tourne à l\'infini. Chaque tap le relance encore plus vite.', tile: true},
  {id: 'slime',    icon: '🟢', name: 'Slime ASMR',             cost: 4e13,   desc: 'Du slime pailleté écrasé en boucle. Squish… squish…', tile: true},
  {id: 'grass',    icon: '🌱', name: 'Toucher de l\'herbe',    cost: 1e14,   desc: 'La stimulation ultime. Ou la fin de toutes les stimulations ?'},
];
// Une stimulation qui n'existe qu'en vidéo n'est proposée que si le fichier est présent.
for (let i = STIMS.length - 1; i >= 0; i--) if (STIMS[i].needsVideo && !(DT.VIDEO_FILES || {})[STIMS[i].id]) STIMS.splice(i, 1);
const BY = Object.fromEntries(STIMS.map(s => [s.id, s]));
const owns = id => !!(api && api.S.stim && api.S.stim[id]);
const count = S => Object.keys(S.stim || {}).filter(id => BY[id]).length;
// +10 % par stimulation, +50 % de plus pour l'herbe.
const bonus = S => count(S) * 0.1 + (S.stim && S.stim.grass ? 0.5 : 0);
const on = () => api && api.visible() && !grassOpen;
const small = () => api.unit();  // une seconde de production : l'unité des petits gains

/* ======================= Boutique ======================= */
function renderShop() {
  const S = api.S, box = $('stimList');
  if (!box) return;
  const n = count(S), shown = n + 2;
  box.innerHTML = STIMS.map((s, i) => {
    const got = owns(s.id);
    if (!got && i >= shown) return `<div class="st-item st-lock"><span class="st-ic">?</span><b>???</b><small>Achète les stimulations précédentes pour la découvrir.</small></div>`;
    return `<div class="st-item${got ? ' st-got' : ''}" data-id="${s.id}"><span class="st-ic">${s.icon}</span><b>${esc(s.name)}</b><small>${esc(s.desc)}</small>
      ${got ? '<em class="st-own">ACTIVÉE · +10 %</em>' : `<button type="button" class="st-buy" data-buy="${s.id}">${api.fmt(s.cost)} nmol</button>`}</div>`;
  }).join('');
  DT.setText($('stimCount'), `${n}/${STIMS.length}`);
  DT.setText($('stimBonus'), `+${Math.round(bonus(S) * 100)} %`);
  shopClock = 1;
}
let shopClock = 0;
function refreshShop(dt) {
  shopClock += dt;
  if (shopClock < 0.25 || $('tab-stim').hidden) return;
  shopClock = 0;
  for (const b of $('stimList').querySelectorAll('[data-buy]')) DT.setDisabled(b, api.S.bank < BY[b.dataset.buy].cost);
}
function buy(id) {
  const S = api.S, s = BY[id];
  if (!s || owns(id)) return;
  if (S.bank < s.cost) { api.A.denied(); return; }
  api.spend(s.cost);
  S.stim = S.stim || {}; S.stim[id] = DT.now();
  api.A.levelUp(); api.flash('#FF7EB6'); api.shake(document.body);
  api.confetti(innerWidth / 2, innerHeight * 0.35, 150);
  api.banner('STIMULATION', s.name.toUpperCase(), s.desc);
  api.addFeed(`Nouvelle stimulation : <b>${esc(s.name)}</b>.`);
  renderShop(); layout(); api.onChange(); api.save();
  if (id === 'grass') setTimeout(touchGrass, 1200);
  if (id === 'memes') setTimeout(showMeme, 2500);
  if (id === 'notifs') setTimeout(notify, 1500);
  if (id === 'owl') setTimeout(owl, 3000);
}

/* ======================= Vraies vidéos (fichiers locaux, zéro pub) ======================= */
// Les fichiers de app/videos (subway.mp4, parkour.mp4, press.mp4, sand.mp4, wash.mp4…) sont listés dans
// app/videos/index.js par tools/import-videos.js. Lus en muet et en boucle, sans internet et sans aucune pub.
// Une vidéo ne se charge que si sa tuile est visible ; sans fichier (ou option coupée), le dessin canvas prend le relais.
const VIDEOS = DT.VIDEO_FILES || {};
// Chromium met les vidéos en pause quand la fenêtre est cachée : on les relance au retour.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) document.querySelectorAll('.st-tile video').forEach(v => v.play().catch(() => {}));
});
function syncVideo(id) {
  const el = $('st-' + id); if (!el) return;
  const want = !!VIDEOS[id] && api.videos() && !el.hidden && el.offsetParent !== null;
  let v = el.querySelector('video');
  if (want && !v) {
    v = document.createElement('video');
    v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true; v.preload = 'auto';
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true'); v.tabIndex = -1;
    v.addEventListener('loadedmetadata', () => { if (v.duration > 20) v.currentTime = rand(0, v.duration - 10); v.play().catch(() => {}); }, {once: true});
    v.addEventListener('error', () => { v.remove(); el.classList.remove('st-vid'); }, {once: true});
    v.src = 'videos/' + VIDEOS[id];
    el.prepend(v);
  } else if (!want && v) { v.pause(); v.removeAttribute('src'); v.load(); v.remove(); }
  if (el.classList.contains('st-vid') !== want) el.classList.toggle('st-vid', want);
}

/* ======================= Mise en place des widgets ======================= */
const TILES = {};
function layout() {
  renderShop();
  const vis = api.visible();
  const wall = $('stWall'), anyTile = STIMS.some(s => s.tile && owns(s.id));
  DT.setHidden(wall, !vis || !anyTile);
  for (const s of STIMS) if (s.tile) DT.setHidden($('st-' + s.id), !vis || !owns(s.id));
  DT.setHidden($('stDvd'), !vis || !owns('dvd'));
  DT.setHidden($('stRgb'), !vis || !owns('rgb'));
  for (const id of Object.keys(VIDEOS)) syncVideo(id);
  for (const t of Object.values(TILES)) t.stale = true;
  dvd.stale = true;
}
addEventListener('resize', () => { for (const t of Object.values(TILES)) t.stale = true; dvd.stale = true; });

// Une tuile canvas : mesurée seulement quand elle a changé de taille, dessinée à 30 images/s.
function tile(id, renderer) {
  const t = {id, r: renderer, cv: null, ctx: null, w: 0, h: 0, stale: true, acc: 0, dpr: 1};
  TILES[id] = t;
  return t;
}
// Fluidité : chaque tuile vit à son rythme (step), mais au plus 2 tuiles sont redessinées par image,
// les plus en retard d'abord, pour éviter les pics quand toutes se redessinent en même temps.
function stepTile(t, dt) {
  t.due = false;
  if (!owns(t.id)) return;
  const el = $('st-' + t.id);
  if (!el || el.hidden || el.classList.contains('st-vid')) return;  // la vraie vidéo joue : pas de dessin
  if (!t.cv) { t.cv = el.querySelector('canvas'); t.ctx = t.cv.getContext('2d'); if (t.r.init) t.r.init(); }
  t.r.step(Math.min(dt, 0.1));
  t.acc += dt;
  t.due = t.acc >= 1 / (api.lite() ? 12 : 24);
}
function drawTiles() {
  const due = Object.values(TILES).filter(t => t.due).sort((a, b) => b.acc - a.acc);
  for (let i = 0; i < due.length && i < 2; i++) drawTile(due[i]);
}
function drawTile(t) {
  t.acc = 0;
  if (t.stale) {
    t.stale = false;
    t.w = t.cv.clientWidth; t.h = t.cv.clientHeight; t.dpr = Math.min(1.25, devicePixelRatio || 1);
    if (!t.w || !t.h) { t.stale = true; return; }
    t.cv.width = Math.round(t.w * t.dpr); t.cv.height = Math.round(t.h * t.dpr);
    if (t.r.resize) t.r.resize(t.w, t.h, t.dpr);
  }
  const c = t.ctx;
  c.setTransform(t.dpr, 0, 0, t.dpr, 0, 0);
  t.r.draw(c, t.w, t.h);
}
// Petit gain affiché dans la tuile.
function tilePop(id, txt) {
  const el = $('st-' + id); if (!el || el.hidden) return;
  const d = document.createElement('span');
  d.className = 'st-pop'; d.textContent = txt;
  d.style.left = rand(15, 70) + '%'; d.style.top = rand(25, 60) + '%';
  el.appendChild(d);
  d.animate([{transform: 'translateY(0) scale(.6)', opacity: 0}, {transform: 'translateY(-8px) scale(1.1)', opacity: 1, offset: 0.2}, {transform: 'translateY(-40px) scale(1)', opacity: 0}], {duration: 1100, easing: 'ease-out'});
  setTimeout(() => d.remove(), 1100);
}
function earn(id, sec, label) {
  const g = small() * sec;
  api.gain(g);
  if (label !== false) tilePop(id, '+' + api.fmt(g));
  return g;
}

/* ======================= Gameplay de runner (style course infinie) ======================= */
// Tout ce qui est détaillé (personnage, pièces, façades de trains, barrières, ciel, sol, rails) est dessiné une seule
// fois dans des images (sprites) à chaque changement de taille ; à chaque image on ne fait que les recoller.
const runner = (() => {
  const LANES = [-1, 0, 1], FAR = 44, TH = 1.35;
  let W = 0, H = 0, DP = 1, LW = 0, HY = 0, GY = 0;
  let objs = [], parts = [], dist = 0, speed = 15, spawnAt = 6, score = 0, coins = 0, t = 0, banner = 0, bannerTxt = '', bannerCol = '#FFD23F';
  let hud = null, hudT = -1, jetIn = 22, dustT = 0, hoverIn = 12, hover = 0;
  const R = {lane: 0, x: 0, y: 0, vy: 0, roll: 0, step: 0, jet: 0};
  const SP = {};
  const TRAINS = [['#E63946', '#9E1B28', '#F1FAEE'], ['#1D7BD8', '#0E4A86', '#FFD23F'], ['#2FBF71', '#16774A', '#FFFFFF'], ['#9B5DE5', '#5F2DA8', '#FFE14D'], ['#FF9F1C', '#B85F00', '#FFFFFF']];
  const WALLS = [['#FF4F79', '#B0174A'], ['#4FD8FF', '#1A79A8'], ['#FFD23F', '#C99700'], ['#5FE0B7', '#1E9A70'], ['#C77DFF', '#7E3BC7'], ['#FF9F1C', '#C25F00']];
  const hash = (i, s) => { let x = Math.imul(i | 0, 374761393) ^ Math.imul(s | 0, 668265263); x = Math.imul(x ^ (x >>> 13), 1274126177); return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };
  const proj = z => { const p = 1 / (1 + Math.max(-0.9, z) * 0.17); return {p, y: HY + (GY - HY) * p}; };
  const X = (l, z) => W / 2 + l * LW * proj(z).p;
  const mk = (w, h) => { const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(w)); cv.height = Math.max(1, Math.round(h)); return [cv, cv.getContext('2d')]; };

  function reset() { objs = []; parts = []; dist = 0; speed = 15; spawnAt = 6; score = 0; coins = 0; jetIn = rand(18, 28); Object.assign(R, {lane: 0, x: 0, y: 0, vy: 0, roll: 0, jet: 0}); }
  function spawn() {
    // une rangée : jusqu'à 2 trains, au moins une voie libre, des pièces et parfois une barrière sur les voies libres
    const lanes = [...LANES].sort(() => Math.random() - 0.5);
    const nTrain = R.jet > 0 ? 0 : Math.random() < 0.25 ? 0 : Math.random() < 0.55 ? 1 : 2;
    for (let i = 0; i < nTrain; i++) {
      const lane = lanes[i];
      if (objs.some(o => o.type === 'train' && o.lane === lane && o.z + o.len > FAR - 4)) continue;
      objs.push({type: 'train', lane, z: FAR, len: rand(10, 18), col: Math.floor(Math.random() * TRAINS.length), n: Math.floor(rand(10, 99))});
    }
    const free = lanes.slice(nTrain);
    if (free.length && R.jet <= 0 && Math.random() < 0.45) objs.push({type: Math.random() < 0.6 ? 'low' : 'high', lane: pick(free), z: FAR + rand(0, 3)});
    if (free.length) { const lane = pick(free), arc = Math.random() < 0.3; for (let k = 0; k < 7; k++) objs.push({type: 'coin', lane, z: FAR + k * 1.3, h: arc ? Math.sin(k / 6 * Math.PI) * 0.9 : 0, ph: k}); }
  }
  function jetpack() {
    R.jet = 4.5; R.vy = 0;
    const lane = R.lane;
    for (let k = 0; k < 26; k++) objs.push({type: 'coin', lane, z: 6 + k * 1.4, h: 2.2, ph: k, air: true});
    banner = 1.8; bannerTxt = 'JETPACK !'; bannerCol = '#5FE0B7';
  }
  const laneFree = (lane, from, to) => !objs.some(o => o.type === 'train' && o.lane === lane && o.z < to && o.z + o.len > from);
  function ai() {
    if (R.jet > 0) return;
    if (objs.some(o => o.type === 'train' && o.lane === R.lane && o.z > 0.3 && o.z < 10)) {
      const opts = LANES.filter(l => Math.abs(l - R.lane) === 1 && laneFree(l, -1, 11));
      const alt = opts.length ? pick(opts) : LANES.filter(l => l !== R.lane && laneFree(l, -1, 7))[0];
      if (alt !== undefined) R.lane = alt;
    }
    const near = objs.find(o => o.lane === R.lane && o.z > 0.4 && o.z < 1.9 && (o.type === 'low' || o.type === 'high'));
    if (near && near.type === 'low' && R.y === 0) R.vy = 7.5;
    if (near && near.type === 'high' && R.roll <= 0 && R.y === 0) R.roll = 0.7;
    const coin = objs.find(o => o.type === 'coin' && !o.air && o.z > 2 && o.z < 8 && Math.abs(o.lane - R.lane) === 1);
    if (coin && laneFree(coin.lane, -1, 12) && Math.random() < 0.05) R.lane = coin.lane;
  }
  function burst(x, y, n, col, star) {
    for (let i = 0; i < n; i++) { const a = rand(0, 6.28), v = rand(30, 110); parts.push({x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, t: 0, life: rand(0.35, 0.7), col, star, r: rand(2, 4)}); }
  }
  function step(dt) {
    t += dt; speed = Math.min(26, speed + dt * 0.12);
    const dz = speed * dt; dist += dz; score += dz * 10 * (R.jet > 0 ? 2 : 1);
    for (const o of objs) o.z -= dz;
    spawnAt -= dz;
    if (spawnAt <= 0) { spawn(); spawnAt = rand(7, 11); }
    jetIn -= dt;
    hoverIn -= dt; hover = Math.max(0, hover - dt);
    if (hoverIn <= 0 && R.jet <= 0) { hoverIn = rand(30, 45); hover = 6; banner = 1.6; bannerTxt = 'HOVERBOARD !'; bannerCol = '#4FD8FF'; }
    if (jetIn <= 0 && R.y === 0) { jetIn = rand(22, 34); jetpack(); }
    ai();
    R.x += (R.lane - R.x) * Math.min(1, dt * 11);
    if (R.jet > 0) { R.jet -= dt; R.y += (2.2 - R.y) * Math.min(1, dt * 4); if (R.jet <= 0) R.vy = 0; }
    else if (R.vy || R.y > 0) { R.y += R.vy * dt; R.vy -= 22 * dt; if (R.y <= 0) { R.y = 0; R.vy = 0; if (W) burst(X(R.x, 0.5), proj(0.5).y, 6, 'rgba(230,220,200,.9)'); } }
    R.roll -= dt; R.step += dt * speed * 0.55;
    // pièces ramassées, objets passés
    for (let i = objs.length - 1; i >= 0; i--) {
      const o = objs[i];
      if (o.type === 'coin' && o.z < 0.9 && o.z > -0.4 && Math.abs(o.lane - R.x) < 0.45 && Math.abs((o.h || 0) - R.y) < 0.9) {
        objs.splice(i, 1); coins++; score += 50;
        if (W) { const q = proj(0.5); burst(X(o.lane, 0.5), q.y - (0.35 + o.h) * LW, 5, '#FFE066', true); }
        if (coins % 10 === 0) earn('subway', 0.5);
        continue;
      }
      if (o.z + (o.len || 0) < -3) objs.splice(i, 1);
    }
    // poussière sous les pieds
    dustT -= dt;
    if (W && dustT <= 0 && R.y === 0 && R.roll <= 0) { dustT = 0.06; const q = proj(0.5); parts.push({x: X(R.x, 0.5) + rand(-4, 4), y: q.y, vx: rand(-15, 15), vy: rand(-25, -5), t: 0, life: 0.4, col: 'rgba(210,195,170,.7)', r: rand(2, 3.5)}); }
    if (W && hover > 0 && R.jet <= 0) { const q = proj(0.5); parts.push({x: X(R.x, 0.5) + rand(-8, 8), y: q.y - R.y * LW * 0.55, vx: rand(-20, 20), vy: rand(10, 40), t: 0, life: 0.45, col: pick(['#4FD8FF', '#C77DFF', '#FF7EB6']), r: rand(2, 3.5)}); }
    if (W && R.jet > 0) { const q = proj(0.5); parts.push({x: X(R.x, 0.5) + rand(-3, 3), y: q.y - R.y * LW * 0.55 - H * 0.02, vx: rand(-10, 10), vy: rand(60, 120), t: 0, life: 0.35, col: pick(['#FFD23F', '#FF9F1C', '#FF4F79']), r: rand(2, 4)}); }
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 120 * dt; if (p.t > p.life) parts.splice(i, 1); }
    if (parts.length > 80) parts.splice(0, parts.length - 80);
    if (Math.floor(score / 10000) > Math.floor((score - dz * 10) / 10000)) { banner = 1.6; bannerTxt = pick(['INCROYABLE !', 'NOUVEAU RECORD !', 'TROP FORT !', 'IMBATTABLE !']); bannerCol = '#FFD23F'; }
    banner -= dt;
    if (dist > 2600) reset();
  }

  /* ---------- Sprites ---------- */
  function drawPerson(x, s, phase, mode) {
    // vu de dos, centré en bas ; s = échelle (le personnage fait 100 unités de haut)
    x.save(); x.scale(s, s); x.lineCap = 'round'; x.lineJoin = 'round';
    const O = '#1B1029', sw = Math.sin(phase), sw2 = Math.sin(phase + Math.PI);
    if (mode === 'roll') {
      x.translate(0, -26);
      x.fillStyle = '#FF6B35'; x.strokeStyle = O; x.lineWidth = 4;
      x.beginPath(); x.arc(0, 0, 24, 0, 7); x.fill(); x.stroke();
      x.fillStyle = '#3D5AFE'; x.beginPath(); x.arc(0, 0, 24, -0.6, 1.4); x.lineTo(0, 0); x.closePath(); x.fill(); x.stroke();
      x.fillStyle = '#E53935'; x.beginPath(); x.arc(-6, -10, 9, 0, 7); x.fill(); x.stroke();
      x.restore(); return;
    }
    const leg = (side, a) => {
      const hipX = side * 9, hipY = -50, lift = mode === 'jump' ? 12 : Math.max(0, a) * 16, bend = mode === 'jump' ? 14 : Math.max(0, a) * 10;
      const kneeX = hipX + side * 2, kneeY = hipY + 22 - lift * 0.6, footX = hipX + side * 1, footY = -6 - lift + bend * 0.3;
      x.strokeStyle = O; x.lineWidth = 15; x.beginPath(); x.moveTo(hipX, hipY); x.lineTo(kneeX, kneeY); x.lineTo(footX, footY); x.stroke();
      x.strokeStyle = '#2B4C9B'; x.lineWidth = 10; x.beginPath(); x.moveTo(hipX, hipY); x.lineTo(kneeX, kneeY); x.lineTo(footX, footY); x.stroke();
      x.fillStyle = '#FAFAFA'; x.strokeStyle = O; x.lineWidth = 3;
      x.beginPath(); x.roundRect(footX - 9, footY - 4, 18, 11, 4); x.fill(); x.stroke();
      x.fillStyle = '#FF4F79'; x.fillRect(footX - 9, footY + 3, 18, 3);
    };
    // la jambe qui recule passe derrière
    if (sw > 0) { leg(-1, sw2); leg(1, sw); } else { leg(1, sw); leg(-1, sw2); }
    const bob = mode === 'jump' ? 0 : Math.abs(sw) * 2;
    x.translate(0, -bob);
    const arm = (side, a) => {
      x.save(); x.translate(side * 17, -82); x.rotate(side * 0.25 + a * 0.7);
      x.strokeStyle = O; x.lineWidth = 13; x.beginPath(); x.moveTo(0, 0); x.lineTo(0, 26); x.stroke();
      x.strokeStyle = '#FF6B35'; x.lineWidth = 9; x.beginPath(); x.moveTo(0, 0); x.lineTo(0, 24); x.stroke();
      x.fillStyle = '#C68642'; x.strokeStyle = O; x.lineWidth = 3; x.beginPath(); x.arc(0, 29, 5, 0, 7); x.fill(); x.stroke();
      x.restore();
    };
    arm(-1, mode === 'jump' ? -1.2 : sw); arm(1, mode === 'jump' ? 1.2 : sw2);
    // sweat à capuche
    let g = x.createLinearGradient(-20, 0, 20, 0); g.addColorStop(0, '#FF8A50'); g.addColorStop(1, '#E85A1E');
    x.fillStyle = g; x.strokeStyle = O; x.lineWidth = 4;
    x.beginPath(); x.roundRect(-20, -92, 40, 46, 10); x.fill(); x.stroke();
    x.fillStyle = 'rgba(0,0,0,.15)'; x.fillRect(-20, -52, 40, 6);
    // sac à dos
    g = x.createLinearGradient(-14, -88, 14, -56); g.addColorStop(0, '#5C7CFF'); g.addColorStop(1, '#2A3FD1');
    x.fillStyle = g; x.beginPath(); x.roundRect(-14, -88, 28, 32, 7); x.fill(); x.stroke();
    x.fillStyle = '#FFD23F'; x.beginPath(); x.roundRect(-9, -72, 18, 10, 3); x.fill(); x.stroke();
    x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(-10, -84, 4, 14);
    // capuche et tête
    x.fillStyle = '#E85A1E'; x.beginPath(); x.ellipse(0, -93, 15, 6, 0, 0, 7); x.fill(); x.stroke();
    x.fillStyle = '#C68642'; x.beginPath(); x.arc(-13, -106, 4, 0, 7); x.arc(13, -106, 4, 0, 7); x.fill();
    x.fillStyle = '#3E2723'; x.beginPath(); x.arc(0, -107, 14, 0, 7); x.fill(); x.stroke();
    // casquette à l'envers
    x.fillStyle = '#E53935'; x.beginPath(); x.arc(0, -110, 14.5, Math.PI * 1.05, Math.PI * 1.95); x.closePath(); x.fill(); x.stroke();
    x.beginPath(); x.roundRect(-11, -104, 22, 6, 3); x.fill(); x.stroke();
    x.fillStyle = '#FFD23F'; x.beginPath(); x.arc(0, -123, 2.5, 0, 7); x.fill();
    x.restore();
  }
  function sprites() {
    const d = DP;
    // personnage : 8 images de course, saut, roulade
    const ph = Math.round(H * 0.25 * d), pw = Math.round(ph * 0.6);
    SP.run = [];
    for (let i = 0; i < 8; i++) { const [cv, x] = mk(pw, ph); x.translate(pw / 2, ph - 2); drawPerson(x, (ph - 4) / 128, i / 8 * Math.PI * 2, 'run'); SP.run.push(cv); }
    { const [cv, x] = mk(pw, ph); x.translate(pw / 2, ph - 2); drawPerson(x, (ph - 4) / 128, 0, 'jump'); SP.jump = cv; }
    { const [cv, x] = mk(pw, ph); x.translate(pw / 2, ph - 2); drawPerson(x, (ph - 4) / 128, 0, 'roll'); SP.roll = cv; }
    SP.pw = pw / d; SP.ph = ph / d;
    // pièce qui tourne : 8 images
    const cs = Math.round(LW * 0.3 * d);
    SP.coin = [];
    for (let i = 0; i < 8; i++) {
      const [cv, x] = mk(cs, cs), k = Math.abs(Math.cos(i / 8 * Math.PI)), r = cs * 0.44;
      x.translate(cs / 2, cs / 2); x.scale(Math.max(0.12, k), 1);
      const g = x.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r); g.addColorStop(0, '#FFF6B0'); g.addColorStop(0.5, '#FFC107'); g.addColorStop(1, '#E08E00');
      x.fillStyle = g; x.strokeStyle = '#8A4B00'; x.lineWidth = cs * 0.06; x.beginPath(); x.arc(0, 0, r, 0, 7); x.fill(); x.stroke();
      x.strokeStyle = 'rgba(138,75,0,.55)'; x.lineWidth = cs * 0.04; x.beginPath(); x.arc(0, 0, r * 0.68, 0, 7); x.stroke();
      x.fillStyle = 'rgba(255,255,255,.75)'; x.beginPath(); x.ellipse(-r * 0.35, -r * 0.35, r * 0.18, r * 0.32, 0.7, 0, 7); x.fill();
      SP.coin.push(cv);
    }
    SP.cs = cs / d;
    // façades de trains
    const fw = Math.round(LW * 0.92 * d), fh = Math.round(LW * TH * d);
    SP.front = TRAINS.map(([c1, c2, acc]) => {
      const [cv, x] = mk(fw, fh), lw = Math.max(2, fw * 0.03);
      let g = x.createLinearGradient(0, 0, fw, 0); g.addColorStop(0, c2); g.addColorStop(0.3, c1); g.addColorStop(0.7, c1); g.addColorStop(1, c2);
      x.fillStyle = g; x.strokeStyle = '#1B1029'; x.lineWidth = lw;
      x.beginPath(); x.roundRect(lw / 2, lw / 2, fw - lw, fh - lw, [fw * 0.38, fw * 0.38, fw * 0.05, fw * 0.05]); x.fill(); x.stroke();
      g = x.createLinearGradient(0, fh * 0.12, 0, fh * 0.48); g.addColorStop(0, '#0B1A33'); g.addColorStop(1, '#27466E');
      x.fillStyle = g; x.beginPath(); x.roundRect(fw * 0.12, fh * 0.12, fw * 0.76, fh * 0.34, fw * 0.08); x.fill(); x.stroke();
      x.fillStyle = 'rgba(255,255,255,.28)'; x.beginPath(); x.moveTo(fw * 0.2, fh * 0.44); x.lineTo(fw * 0.42, fh * 0.14); x.lineTo(fw * 0.52, fh * 0.14); x.lineTo(fw * 0.3, fh * 0.44); x.fill();
      x.fillStyle = acc; x.fillRect(lw, fh * 0.56, fw - lw * 2, fh * 0.08);
      x.fillStyle = '#1B1029'; x.fillRect(fw * 0.1, fh * 0.86, fw * 0.8, fh * 0.1);
      for (const s of [0.24, 0.76]) {
        const hx = fw * s, hy = fh * 0.74, r = fw * 0.075;
        const hg = x.createRadialGradient(hx, hy, 0, hx, hy, r * 2.4); hg.addColorStop(0, 'rgba(255,250,200,.9)'); hg.addColorStop(1, 'rgba(255,250,200,0)');
        x.fillStyle = hg; x.beginPath(); x.arc(hx, hy, r * 2.4, 0, 7); x.fill();
        x.fillStyle = '#FFFDE7'; x.strokeStyle = '#1B1029'; x.lineWidth = lw * 0.7; x.beginPath(); x.arc(hx, hy, r, 0, 7); x.fill(); x.stroke();
      }
      return cv;
    });
    // barrières
    { const bw = Math.round(LW * 0.85 * d), bh = Math.round(LW * 0.42 * d), [cv, x] = mk(bw, bh), lw = Math.max(2, bw * 0.025);
      x.fillStyle = '#546E7A'; x.strokeStyle = '#1B1029'; x.lineWidth = lw;
      for (const px of [bw * 0.08, bw * 0.84]) { x.fillRect(px, bh * 0.3, bw * 0.08, bh * 0.7); x.strokeRect(px, bh * 0.3, bw * 0.08, bh * 0.7); }
      x.save(); x.beginPath(); x.roundRect(lw, lw, bw - lw * 2, bh * 0.45, bh * 0.08); x.clip();
      x.fillStyle = '#FAFAFA'; x.fillRect(0, 0, bw, bh);
      x.fillStyle = '#E53935'; for (let k = -2; k < 10; k++) { x.beginPath(); x.moveTo(k * bw / 6, bh * 0.5); x.lineTo(k * bw / 6 + bw / 12, bh * 0.5); x.lineTo(k * bw / 6 + bw / 12 + bh * 0.5, 0); x.lineTo(k * bw / 6 + bh * 0.5, 0); x.fill(); }
      x.restore(); x.strokeStyle = '#1B1029'; x.beginPath(); x.roundRect(lw, lw, bw - lw * 2, bh * 0.45, bh * 0.08); x.stroke();
      SP.low = cv; }
    { const bw = Math.round(LW * 0.85 * d), bh = Math.round(LW * 1.05 * d), [cv, x] = mk(bw, bh), lw = Math.max(2, bw * 0.025);
      x.fillStyle = '#546E7A'; x.strokeStyle = '#1B1029'; x.lineWidth = lw;
      for (const px of [bw * 0.04, bw * 0.88]) { x.fillRect(px, 0, bw * 0.08, bh); x.strokeRect(px, 0, bw * 0.08, bh); }
      x.fillStyle = '#FFD23F'; x.beginPath(); x.roundRect(lw, bh * 0.06, bw - lw * 2, bh * 0.2, bh * 0.04); x.fill(); x.stroke();
      x.fillStyle = '#1B1029'; for (let k = 0; k < 6; k++) x.fillRect(bw * (0.1 + k * 0.15), bh * 0.08, bw * 0.06, bh * 0.16);
      SP.high = cv; }
    // ciel, soleil, nuages, ville
    { const [cv, x] = mk(W * d, (HY + H * 0.04) * d); x.scale(d, d);
      let g = x.createLinearGradient(0, 0, 0, HY); g.addColorStop(0, '#2E86DE'); g.addColorStop(0.6, '#7FD1FF'); g.addColorStop(1, '#FFE3A8');
      x.fillStyle = g; x.fillRect(0, 0, W, HY + H * 0.04);
      const sx = W * 0.76, sy = HY * 0.3, sr = H * 0.05;
      g = x.createRadialGradient(sx, sy, 0, sx, sy, sr * 4); g.addColorStop(0, 'rgba(255,248,200,.95)'); g.addColorStop(0.25, 'rgba(255,236,150,.5)'); g.addColorStop(1, 'rgba(255,236,150,0)');
      x.fillStyle = g; x.fillRect(sx - sr * 4, sy - sr * 4, sr * 8, sr * 8);
      x.fillStyle = '#FFF7D1'; x.beginPath(); x.arc(sx, sy, sr, 0, 7); x.fill();
      const city = (base, hmin, hmax, col, lit) => {
        let px = -4; let i = 0;
        while (px < W) {
          const bw = W * (0.06 + hash(i, base * 7) * 0.08), bh = H * (hmin + hash(i, base * 13) * (hmax - hmin));
          x.fillStyle = col; x.fillRect(px, HY + H * 0.03 - bh, bw + 1, bh);
          if (lit) { x.fillStyle = 'rgba(255,236,150,.85)'; for (let wy = HY + H * 0.03 - bh + 4; wy < HY; wy += 6) for (let wx = px + 3; wx < px + bw - 3; wx += 5) if (hash(wx * 7 + wy, i) < 0.35) x.fillRect(wx, wy, 1.6, 2.2); }
          px += bw; i++;
        }
      };
      city(1, 0.06, 0.16, 'rgba(120,130,200,.55)', false);
      city(2, 0.04, 0.12, '#5A4E8F', true);
      SP.sky = cv; }
    { const cw = W * 0.34, chh = H * 0.05, [cv, x] = mk(cw * d, chh * d); x.scale(d, d); x.fillStyle = 'rgba(255,255,255,.92)';
      for (const [u, v, r] of [[0.25, 0.65, 0.3], [0.5, 0.45, 0.42], [0.75, 0.62, 0.3]]) { x.beginPath(); x.ellipse(cw * u, chh * v, cw * r * 0.5, chh * r * 1.2, 0, 0, 7); x.fill(); }
      x.fillRect(cw * 0.15, chh * 0.6, cw * 0.7, chh * 0.35); SP.cloud = cv; SP.cw = cw; SP.ch = chh; }
    // sol fixe : ballast texturé, lits de voie, et rails (calque séparé, au-dessus des traverses)
    { const [cv, x] = mk(W * d, (H - HY) * d); x.scale(d, d); x.translate(0, -HY);
      const top = proj(FAR), bot = proj(-0.6);
      const quad = (l0, l1, col) => { x.fillStyle = col; x.beginPath(); x.moveTo(W / 2 + l0 * LW * bot.p, bot.y); x.lineTo(W / 2 + l1 * LW * bot.p, bot.y); x.lineTo(W / 2 + l1 * LW * top.p, top.y); x.lineTo(W / 2 + l0 * LW * top.p, top.y); x.fill(); };
      // au-delà des murs : quartier d'immeubles (dégradé + façades aux fenêtres allumées)
      let bgr = x.createLinearGradient(0, HY, 0, H); bgr.addColorStop(0, '#8E86B8'); bgr.addColorStop(1, '#4A4270');
      x.fillStyle = bgr; x.fillRect(0, HY, W, H - HY);
      for (const side of [-1, 1]) for (let i = 0; i < 7; i++) {
        const z = FAR * (1 - i / 7) + 2, q = proj(z), bx = W / 2 + side * LW * (2.1 + hash(i, side + 5) * 0.4) * q.p, bwid = LW * (1.4 + hash(i, side + 9)) * q.p, bh = H * (0.25 + hash(i, side + 13) * 0.35) * q.p;
        x.fillStyle = ['#6E5FA8', '#5B7DB8', '#8A5FA0', '#4F6E9E'][i % 4];
        const left = side > 0 ? bx : bx - bwid; x.fillRect(left, q.y - bh - H * 0.3 * q.p, bwid, bh + H * 0.3 * q.p);
        x.fillStyle = 'rgba(255,236,150,.7)';
        for (let wy = q.y - bh - H * 0.3 * q.p + 4; wy < q.y; wy += Math.max(4, 9 * q.p)) for (let wx = left + 3; wx < left + bwid - 3; wx += Math.max(4, 8 * q.p)) if (hash(Math.round(wx * 3 + wy), i) < 0.4) x.fillRect(wx, wy, Math.max(1, 3 * q.p), Math.max(1, 4 * q.p));
      }
      quad(-2.4, 2.4, '#9C8B78');
      for (const l of LANES) quad(l - 0.45, l + 0.45, '#7D6B5A');
      for (let i = 0; i < 900; i++) { const z = Math.pow(Math.random(), 1.6) * FAR, q = proj(z), l = rand(-2.3, 2.3); x.fillStyle = Math.random() < 0.5 ? 'rgba(60,45,35,.35)' : 'rgba(255,245,230,.25)'; const s = Math.max(0.6, 2.2 * q.p); x.fillRect(W / 2 + l * LW * q.p, q.y, s, s); }
      SP.ground = cv; }
    { const [cv, x] = mk(W * d, (H - HY) * d); x.scale(d, d); x.translate(0, -HY);
      const top = proj(FAR), bot = proj(-0.6);
      for (const l of LANES) for (const s of [-0.24, 0.24]) {
        x.strokeStyle = '#4E5B66'; x.lineWidth = 4; x.beginPath(); x.moveTo(W / 2 + (l + s) * LW * bot.p, bot.y); x.lineTo(W / 2 + (l + s) * LW * top.p, top.y); x.stroke();
        x.strokeStyle = '#E3ECF2'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(W / 2 + (l + s) * LW * bot.p, bot.y - 1); x.lineTo(W / 2 + (l + s) * LW * top.p, top.y); x.stroke();
      }
      SP.rails = cv; }
    // brume à l'horizon
    { const fh2 = H * 0.16, [cv, x] = mk(W * d, fh2 * d); x.scale(d, d);
      const g = x.createLinearGradient(0, 0, 0, fh2); g.addColorStop(0, 'rgba(255,227,168,0)'); g.addColorStop(0.45, 'rgba(255,227,168,.55)'); g.addColorStop(1, 'rgba(255,227,168,0)');
      x.fillStyle = g; x.fillRect(0, 0, W, fh2); SP.fog = cv; SP.fh = fh2; }
    // étoile d'étincelle
    { const s = 12, [cv, x] = mk(s, s); x.translate(s / 2, s / 2); x.fillStyle = '#FFF8C4'; x.beginPath(); for (let k = 0; k < 8; k++) { const r = k % 2 ? s * 0.16 : s * 0.5, a = k / 8 * Math.PI * 2; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); } x.fill(); SP.star = cv; }
    hud = null;
  }
  function resize(w, h, dpr) {
    W = w; H = h; DP = dpr; LW = w * 0.29; HY = h * 0.32; GY = h * 0.985;
    sprites();
  }

  /* ---------- Dessin ---------- */
  function wallSeg(c, z, side, k) {
    const z0 = Math.max(-0.6, z), z1 = z + 8, a = proj(z0), b = proj(z1);
    const xa = W / 2 + side * LW * 1.8 * a.p, xb = W / 2 + side * LW * 1.8 * b.p, ha = H * 0.42 * a.p, hb = H * 0.42 * b.p;
    const wc = n => WALLS[((n % WALLS.length) + WALLS.length) % WALLS.length];  // k peut être négatif
    const [c1, c2] = wc(k * 3 + (side > 0 ? 2 : 0));
    c.fillStyle = c1; c.beginPath(); c.moveTo(xa, a.y); c.lineTo(xb, b.y); c.lineTo(xb, b.y - hb); c.lineTo(xa, a.y - ha); c.fill();
    c.fillStyle = c2; c.beginPath(); c.moveTo(xa, a.y); c.lineTo(xb, b.y); c.lineTo(xb, b.y - hb * 0.18); c.lineTo(xa, a.y - ha * 0.18); c.fill();
    // graffitis : bulles et éclair, placés dans le panneau (u le long, v en hauteur)
    const at = (u, v) => [xa + (xb - xa) * u, (a.y + (b.y - a.y) * u) - (ha + (hb - ha) * u) * v, a.p + (b.p - a.p) * u];
    for (let j = 0; j < 3; j++) {
      const [px, py, pp] = at(0.15 + hash(k, j * 3 + side) * 0.7, 0.35 + hash(k, j * 5 + 9) * 0.45), r = LW * (0.12 + hash(k, j + 40) * 0.14) * pp;
      c.fillStyle = wc(k + j + 1)[0]; c.beginPath(); c.ellipse(px, py, r * 0.75, r, 0, 0, 7); c.fill();
    }
    const p1 = at(0.2, 0.55), p2 = at(0.45, 0.75), p3 = at(0.6, 0.45), p4 = at(0.85, 0.7);
    c.strokeStyle = '#FFFFFF'; c.lineWidth = Math.max(1, 3 * (a.p + b.p) / 2); c.beginPath(); c.moveTo(p1[0], p1[1]); c.lineTo(p2[0], p2[1]); c.lineTo(p3[0], p3[1]); c.lineTo(p4[0], p4[1]); c.stroke();
    // rebord en béton et joint entre deux panneaux
    const lh = H * 0.035;
    c.fillStyle = '#D7D2C8'; c.beginPath(); c.moveTo(xa, a.y - ha); c.lineTo(xb, b.y - hb); c.lineTo(xb, b.y - hb - lh * b.p); c.lineTo(xa, a.y - ha - lh * a.p); c.fill();
    c.strokeStyle = 'rgba(27,16,41,.35)'; c.lineWidth = Math.max(1, 2 * a.p); c.beginPath(); c.moveTo(xa, a.y); c.lineTo(xa, a.y - ha - lh * a.p); c.stroke();
    // un lampadaire tous les deux panneaux
    if (k % 2 === 0) {
      const ph2 = H * 0.3 * a.p, px = xa - side * LW * 0.08 * a.p;
      c.strokeStyle = '#37474F'; c.lineWidth = Math.max(1, 3 * a.p); c.beginPath(); c.moveTo(px, a.y - ha); c.lineTo(px, a.y - ha - ph2); c.lineTo(px - side * LW * 0.35 * a.p, a.y - ha - ph2); c.stroke();
      c.fillStyle = '#FFF59D'; c.beginPath(); c.arc(px - side * LW * 0.35 * a.p, a.y - ha - ph2 + 2 * a.p, Math.max(1.2, 4 * a.p), 0, 7); c.fill();
    }
  }
  function train(c, o) {
    const zf = Math.max(o.z, -0.6), zb = Math.min(FAR, o.z + o.len), f = proj(zf), b = proj(zb);
    const tw = LW * 0.92, th = LW * TH, fx = X(o.lane, zf), bx = X(o.lane, zb), [c1, c2, acc] = TRAINS[o.col];
    // flanc visible (côté intérieur), avec ses vitres
    if (o.lane !== 0) {
      const s = -o.lane, fxs = fx + s * tw / 2 * f.p, bxs = bx + s * tw / 2 * b.p;
      c.fillStyle = c2; c.beginPath(); c.moveTo(fxs, f.y); c.lineTo(bxs, b.y); c.lineTo(bxs, b.y - th * b.p); c.lineTo(fxs, f.y - th * f.p); c.fill();
      c.fillStyle = acc; c.beginPath(); c.moveTo(fxs, f.y - th * 0.36 * f.p); c.lineTo(bxs, b.y - th * 0.36 * b.p); c.lineTo(bxs, b.y - th * 0.44 * b.p); c.lineTo(fxs, f.y - th * 0.44 * f.p); c.fill();
      c.fillStyle = '#16304F';
      const n = Math.max(2, Math.round(o.len / 2.6));
      for (let k = 0; k < n; k++) {
        const za = zf + (zb - zf) * (k + 0.2) / n, zc = zf + (zb - zf) * (k + 0.8) / n; if (za > FAR) break;
        const qa = proj(za), qc = proj(zc), xa2 = X(o.lane, za) + s * tw / 2 * qa.p, xc2 = X(o.lane, zc) + s * tw / 2 * qc.p;
        c.beginPath(); c.moveTo(xa2, qa.y - th * 0.58 * qa.p); c.lineTo(xc2, qc.y - th * 0.58 * qc.p); c.lineTo(xc2, qc.y - th * 0.86 * qc.p); c.lineTo(xa2, qa.y - th * 0.86 * qa.p); c.fill();
      }
    }
    // toit
    c.fillStyle = c1; c.strokeStyle = '#1B1029'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(fx - tw / 2 * f.p, f.y - th * f.p); c.lineTo(fx + tw / 2 * f.p, f.y - th * f.p); c.lineTo(bx + tw / 2 * b.p, b.y - th * b.p); c.lineTo(bx - tw / 2 * b.p, b.y - th * b.p); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.moveTo(fx - tw * 0.3 * f.p, f.y - th * f.p); c.lineTo(fx - tw * 0.1 * f.p, f.y - th * f.p); c.lineTo(bx - tw * 0.1 * b.p, b.y - th * b.p); c.lineTo(bx - tw * 0.3 * b.p, b.y - th * b.p); c.fill();
    // blocs de climatisation sur le toit, pour le relief
    c.fillStyle = c2;
    for (let za = Math.ceil(zf / 5) * 5 + 2; za < zb - 1 && za < FAR; za += 5) {
      const qa = proj(za), qb = proj(Math.min(FAR, za + 1.4)), xa = X(o.lane, za), xb2 = X(o.lane, za + 1.4), hw = tw * 0.22, hh = th * 0.06;
      c.beginPath(); c.moveTo(xa - hw * qa.p, qa.y - th * qa.p); c.lineTo(xa + hw * qa.p, qa.y - th * qa.p); c.lineTo(xb2 + hw * qb.p, qb.y - th * qb.p - hh * qb.p); c.lineTo(xb2 - hw * qb.p, qb.y - th * qb.p - hh * qb.p); c.closePath(); c.fill(); c.stroke();
    }
    // façade (image pré-dessinée) ; un train qui a dépassé la caméra montre une tranche pleine
    if (o.z > -0.6) c.drawImage(SP.front[o.col], fx - tw / 2 * f.p, f.y - th * f.p, tw * f.p, th * f.p);
    else { c.fillStyle = c2; c.fillRect(fx - tw / 2 * f.p, f.y - th * f.p, tw * f.p, th * f.p); c.fillStyle = acc; c.fillRect(fx - tw / 2 * f.p, f.y - th * 0.44 * f.p, tw * f.p, th * 0.08 * f.p); }
  }
  function draw(c, w, h) {
    if (!SP.sky) return;
    c.drawImage(SP.sky, 0, 0, W, HY + H * 0.04);
    for (let i = 0; i < 3; i++) { const span = W + SP.cw, x0 = ((i * span / 3 + 30) - t * (6 + i * 3)) % span; c.drawImage(SP.cloud, (x0 < -SP.cw ? x0 + span : x0) - SP.cw * 0.2, H * (0.04 + i * 0.07), SP.cw * (0.7 + i * 0.15), SP.ch * (0.7 + i * 0.15)); }
    c.drawImage(SP.ground, 0, HY, W, H - HY);
    // traverses en bois, en un seul tracé
    c.fillStyle = '#6D4C41'; c.beginPath();
    for (let z = FAR - (dist % 1.6); z > -0.6; z -= 1.6) { const q = proj(z), th = Math.max(1, 7 * q.p); for (const l of LANES) { const x0 = X(l - 0.36, z), x1 = X(l + 0.36, z); c.rect(x0, q.y - th / 2, x1 - x0, th); } }
    c.fill();
    c.drawImage(SP.rails, 0, HY, W, H - HY);
    const seg = 8, off = dist % seg;
    for (let z = FAR - off; z > -seg; z -= seg) { const k = Math.floor((dist + z) / seg); wallSeg(c, z, -1, k); wallSeg(c, z, 1, k + 7); }
    const list = objs.filter(o => o.z < FAR).sort((a, b) => b.z - a.z);
    for (const o of list) {
      const q = proj(Math.max(o.z, -0.6));
      if (o.type === 'train') train(c, o);
      else if (o.type === 'low') c.drawImage(SP.low, X(o.lane, o.z) - LW * 0.425 * q.p, q.y - LW * 0.42 * q.p, LW * 0.85 * q.p, LW * 0.42 * q.p);
      else if (o.type === 'high') c.drawImage(SP.high, X(o.lane, o.z) - LW * 0.425 * q.p, q.y - LW * 1.05 * q.p, LW * 0.85 * q.p, LW * 1.05 * q.p);
      else if (o.type === 'coin') {
        const fr = SP.coin[Math.floor((t * 10 + o.ph) % 8)], s = SP.cs * q.p, cy = q.y - (0.35 + (o.h || 0)) * LW * q.p - Math.sin(t * 4 + o.ph) * 2 * q.p;
        c.drawImage(fr, X(o.lane, o.z) - s / 2, cy - s / 2, s, s);
      }
    }
    // coureur, ombre, flammes du jetpack
    const q = proj(0.5), rx = X(R.x, 0.5), ry = q.y - R.y * LW * 0.55 - (hover > 0 && R.jet <= 0 ? SP.ph * 0.07 : 0);
    c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(rx, q.y, SP.pw * 0.32 / (1 + R.y * 0.3), SP.pw * 0.08, 0, 0, 7); c.fill();
    if (R.jet > 0) { const fl = 1 + Math.sin(t * 40) * 0.25; c.fillStyle = 'rgba(255,159,28,.85)'; c.beginPath(); c.ellipse(rx, ry + SP.ph * 0.02, SP.pw * 0.12, SP.ph * 0.16 * fl, 0, 0, 7); c.fill(); c.fillStyle = '#FFF3B0'; c.beginPath(); c.ellipse(rx, ry, SP.pw * 0.06, SP.ph * 0.08 * fl, 0, 0, 7); c.fill(); }
    if (hover > 0 && R.jet <= 0 && R.roll <= 0) {
      const bw = SP.pw * 0.9, by = ry - SP.ph * 0.02, gl = c.createRadialGradient(rx, by, 0, rx, by, bw * 0.7);
      gl.addColorStop(0, 'rgba(79,216,255,.55)'); gl.addColorStop(1, 'rgba(79,216,255,0)');
      c.fillStyle = gl; c.fillRect(rx - bw * 0.7, by - bw * 0.7, bw * 1.4, bw * 1.4);
      const bg = c.createLinearGradient(rx - bw / 2, 0, rx + bw / 2, 0); bg.addColorStop(0, '#FF4F79'); bg.addColorStop(0.5, '#FFD23F'); bg.addColorStop(1, '#4FD8FF');
      c.fillStyle = bg; c.strokeStyle = '#1B1029'; c.lineWidth = 2; c.beginPath(); c.roundRect(rx - bw / 2, by - SP.ph * 0.035, bw, SP.ph * 0.07, SP.ph * 0.035); c.fill(); c.stroke();
    }
    const spr = R.roll > 0 ? SP.roll : (R.y > 0 || R.jet > 0) ? SP.jump : SP.run[Math.floor(R.step * 1.4) % 8];
    if (R.roll > 0) { c.save(); c.translate(rx, ry - SP.ph * 0.2); c.rotate(-R.roll * 16); c.drawImage(spr, -SP.pw / 2, -SP.ph * 0.8, SP.pw, SP.ph); c.restore(); }
    else c.drawImage(spr, rx - SP.pw / 2, ry - SP.ph, SP.pw, SP.ph);
    for (const p of parts) { c.globalAlpha = 1 - p.t / p.life; if (p.star) c.drawImage(SP.star, p.x - 5, p.y - 5, 10, 10); else { c.fillStyle = p.col; c.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r); } }
    c.globalAlpha = 1;
    c.drawImage(SP.fog, 0, HY - SP.fh * 0.55, W, SP.fh);
    // lignes de vitesse
    if (speed > 18) {
      c.strokeStyle = `rgba(255,255,255,${Math.min(0.5, (speed - 18) / 14)})`; c.lineWidth = 1.5; c.beginPath();
      for (let i = 0; i < 6; i++) { const a = hash(i, Math.floor(t * 12)) * Math.PI * 2, r0 = W * 0.42, r1 = W * (0.55 + hash(i + 9, Math.floor(t * 12)) * 0.3); c.moveTo(W / 2 + Math.cos(a) * r0, H * 0.55 + Math.sin(a) * r0 * 1.4); c.lineTo(W / 2 + Math.cos(a) * r1, H * 0.55 + Math.sin(a) * r1 * 1.4); }
      c.stroke();
    }
    // interface (redessinée 4 fois par seconde : le texte coûte cher)
    if (!hud || t - hudT > 0.25) {
      hudT = t;
      if (!hud) hud = mk(W * DP, H * 0.16 * DP)[0];
      const x = hud.getContext('2d'); x.setTransform(DP, 0, 0, DP, 0, 0); x.clearRect(0, 0, W, H * 0.16);
      const fs = Math.round(H * 0.05);
      x.font = `400 ${fs}px ${api.font || 'Impact'}`; x.textBaseline = 'top'; x.lineJoin = 'round'; x.lineWidth = 4; x.strokeStyle = '#1B1029';
      const sc = String(Math.floor(score)).padStart(6, '0');
      x.textAlign = 'right'; x.fillStyle = '#FFFFFF'; x.strokeText(sc, W - 7, 6); x.fillText(sc, W - 7, 6);
      const cy = 10 + fs, cw = x.measureText(String(coins)).width;
      x.fillStyle = 'rgba(27,16,41,.55)'; x.beginPath(); x.roundRect(W - 14 - cw - fs, cy - 2, cw + fs + 10, fs + 4, (fs + 4) / 2); x.fill();
      x.drawImage(SP.coin[0], W - 10 - cw - fs, cy, fs, fs);
      x.fillStyle = '#FFD23F'; x.strokeText(String(coins), W - 7, cy + 1); x.fillText(String(coins), W - 7, cy + 1);
      const m = '×' + (2 + Math.floor(speed / 8) + (R.jet > 0 ? 2 : 0));
      x.textAlign = 'left'; x.fillStyle = '#5FE0B7'; x.beginPath(); x.roundRect(5, 4, x.measureText(m).width + 10, fs + 4, 6); x.fill(); x.stroke();
      x.fillStyle = '#1B1029'; x.fillText(m, 9, 6);
    }
    c.drawImage(hud, 0, 0, W, H * 0.16);
    if (banner > 0) {
      c.save(); c.textAlign = 'center'; c.font = `400 ${Math.round(H * 0.075)}px ${api.font || 'Impact'}`;
      const fit = Math.min(1, W * 0.9 / (c.measureText(bannerTxt).width + 8)), k = (1 + Math.max(0, banner - 1.4) * 1.5) * fit;
      c.translate(W / 2, H * 0.38); c.scale(k, k);
      c.globalAlpha = Math.min(1, banner * 2); c.fillStyle = bannerCol; c.lineWidth = 6; c.strokeStyle = '#1B1029'; c.lineJoin = 'round';
      c.strokeText(bannerTxt, 0, 0); c.fillText(bannerTxt, 0, 0); c.restore();
    }
  }
  return {step, draw, resize, init: reset};
})();
tile('subway', runner);

/* ======================= Vraie presse hydraulique ======================= */
const press = (() => {
  // Chaque objet : dessin (centré en bas, hauteur 1), couleur des éclats, type de casse
  const OBJS = [
    {name: 'BOULE DE BOWLING', hgt: 0.42, kind: 'shard', cols: ['#1A237E', '#3949AB', '#0D1137'], draw(c) {
      const g = c.createRadialGradient(-0.15, -0.65, 0.05, 0, -0.5, 0.55); g.addColorStop(0, '#5C6BC0'); g.addColorStop(1, '#0D1137');
      c.fillStyle = g; c.beginPath(); c.arc(0, -0.5, 0.5, 0, 7); c.fill();
      c.fillStyle = '#05070F'; for (const [x, y] of [[-0.12, -0.72], [0.06, -0.76], [-0.02, -0.58]]) { c.beginPath(); c.arc(x, y, 0.055, 0, 7); c.fill(); }
    }},
    {name: 'CANETTE', hgt: 0.5, kind: 'juice', cols: ['#FFF59D', '#FFFFFF', '#E53935'], crumple: true, draw(c) {
      const g = c.createLinearGradient(-0.3, 0, 0.3, 0); g.addColorStop(0, '#8E0000'); g.addColorStop(0.35, '#FF5252'); g.addColorStop(0.6, '#D50000'); g.addColorStop(1, '#6D0000');
      c.fillStyle = g; c.fillRect(-0.3, -0.92, 0.6, 0.86);
      c.fillStyle = '#fff'; c.beginPath(); c.moveTo(-0.3, -0.5); c.bezierCurveTo(-0.1, -0.62, 0.1, -0.38, 0.3, -0.5); c.lineTo(0.3, -0.44); c.bezierCurveTo(0.1, -0.32, -0.1, -0.56, -0.3, -0.44); c.fill();
      c.fillStyle = '#CFD8DC'; c.fillRect(-0.28, -1, 0.56, 0.08); c.fillRect(-0.28, -0.06, 0.56, 0.06);
    }},
    {name: 'NOUNOURS EN GÉLATINE', hgt: 0.45, kind: 'jelly', cols: ['#76FF03', '#B2FF59'], jelly: true, draw(c) {
      c.fillStyle = 'rgba(118,255,3,.85)';
      c.beginPath(); c.ellipse(0, -0.35, 0.33, 0.36, 0, 0, 7); c.fill();
      c.beginPath(); c.arc(0, -0.8, 0.22, 0, 7); c.fill();
      for (const k of [-1, 1]) { c.beginPath(); c.arc(k * 0.17, -0.98, 0.08, 0, 7); c.fill(); c.beginPath(); c.ellipse(k * 0.32, -0.45, 0.1, 0.14, k * 0.5, 0, 7); c.fill(); c.beginPath(); c.ellipse(k * 0.18, -0.06, 0.13, 0.08, 0, 0, 7); c.fill(); }
      c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(-0.12, -0.5, 0.06, 0.12, 0.4, 0, 7); c.fill();
    }},
    {name: 'POMME', hgt: 0.4, kind: 'juice', cols: ['#FFF8E1', '#FFECB3', '#C62828'], draw(c) {
      const g = c.createRadialGradient(-0.15, -0.6, 0.05, 0, -0.45, 0.55); g.addColorStop(0, '#FF8A80'); g.addColorStop(1, '#B71C1C');
      c.fillStyle = g; c.beginPath(); c.moveTo(0, -0.82); c.bezierCurveTo(0.55, -1.05, 0.65, -0.1, 0.12, 0); c.lineTo(-0.12, 0); c.bezierCurveTo(-0.65, -0.1, -0.55, -1.05, 0, -0.82); c.fill();
      c.strokeStyle = '#5D4037'; c.lineWidth = 0.05; c.beginPath(); c.moveTo(0, -0.82); c.lineTo(0.04, -1.02); c.stroke();
      c.fillStyle = '#43A047'; c.beginPath(); c.ellipse(0.16, -0.98, 0.14, 0.06, -0.4, 0, 7); c.fill();
    }},
    {name: 'PASTÈQUE', hgt: 0.45, kind: 'juice', cols: ['#FF1744', '#FF5252', '#212121'], draw(c) {
      c.fillStyle = '#2E7D32'; c.beginPath(); c.ellipse(0, -0.45, 0.7, 0.45, 0, 0, 7); c.fill();
      c.strokeStyle = '#1B5E20'; c.lineWidth = 0.07; for (let k = -2; k <= 2; k++) { c.beginPath(); c.ellipse(k * 0.12, -0.45, 0.12, 0.44, 0, 0, 7); c.stroke(); }
    }},
    {name: 'CANARD EN PLASTIQUE', hgt: 0.42, kind: 'shard', cols: ['#FFEB3B', '#FF9800'], draw(c) {
      c.fillStyle = '#FFEB3B'; c.beginPath(); c.ellipse(0, -0.3, 0.5, 0.3, 0, 0, 7); c.fill();
      c.beginPath(); c.arc(-0.18, -0.72, 0.24, 0, 7); c.fill();
      c.fillStyle = '#FF9800'; c.beginPath(); c.ellipse(-0.45, -0.68, 0.14, 0.06, 0, 0, 7); c.fill();
      c.fillStyle = '#212121'; c.beginPath(); c.arc(-0.25, -0.78, 0.04, 0, 7); c.fill();
    }},
    {name: 'TÉLÉPHONE', hgt: 0.55, kind: 'spark', cols: ['#FFFFFF', '#80D8FF', '#FFD740'], draw(c) {
      c.fillStyle = '#212121'; c.beginPath(); c.roundRect(-0.3, -1, 0.6, 1, 0.08); c.fill();
      const g = c.createLinearGradient(0, -0.95, 0, -0.05); g.addColorStop(0, '#7C4DFF'); g.addColorStop(1, '#18FFFF');
      c.fillStyle = g; c.fillRect(-0.26, -0.94, 0.52, 0.88);
    }},
    {name: 'CRAYONS DE COULEUR', hgt: 0.5, kind: 'shard', cols: ['#F44336', '#FFEB3B', '#4CAF50', '#2196F3', '#9C27B0'], draw(c) {
      const cs = ['#F44336', '#FF9800', '#FFEB3B', '#4CAF50', '#2196F3', '#9C27B0'];
      cs.forEach((col, i) => { const x = -0.45 + i * 0.18; c.fillStyle = col; c.fillRect(x, -0.82, 0.15, 0.82); c.fillStyle = '#FFE0B2'; c.beginPath(); c.moveTo(x, -0.82); c.lineTo(x + 0.15, -0.82); c.lineTo(x + 0.075, -1); c.fill(); c.fillStyle = col; c.beginPath(); c.moveTo(x + 0.05, -0.94); c.lineTo(x + 0.1, -0.94); c.lineTo(x + 0.075, -1); c.fill(); });
    }},
  ];
  let frame = null, o = OBJS[0], ph = 'in', pt = 0, d = 0, plateY = 0, parts = [], cracks = [], burst = false, stamp = 0, flats = 0, shake = 0;
  const DUR = {in: 0.8, down: 0.9, crush: 1.7, hold: 0.5, up: 0.9, out: 0.6};
  function next() { o = pick(OBJS); ph = 'in'; pt = 0; d = 0; burst = false; cracks = []; }
  function step(dt) {
    pt += dt;
    if (pt >= DUR[ph]) {
      pt = 0;
      ph = {in: 'down', down: 'crush', crush: 'hold', hold: 'up', up: 'out', out: 'in'}[ph];
      if (ph === 'hold') { stamp = 1.2; flats++; earn('press', 3); if (api.visible()) api.A.crunch(); }
      if (ph === 'in') next();
    }
    if (ph === 'crush') {
      d = ease(pt / DUR.crush);
      shake = 2.5 * d;
      if (o.kind === 'shard' && d > 0.3 && cracks.length < 6 && Math.random() < 0.3) cracks.push([rand(-0.4, 0.4), rand(-0.9, -0.1), rand(0, 6.28), rand(0.15, 0.35)]);
      if (!burst && d > 0.55) { burst = true; boom(o.kind === 'jelly' ? 6 : 26); }
      if (o.kind === 'spark' && Math.random() < 0.4) boom(2);
    } else shake *= 0.85;
    stamp = Math.max(0, stamp - dt);
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 900 * dt; if (p.t > p.life) parts.splice(i, 1); }
  }
  let geo = null;
  function boom(n) {
    if (!geo) return;
    for (let i = 0; i < n; i++) {
      const a = rand(-Math.PI, 0);
      parts.push({x: geo.cx + rand(-geo.s * 0.3, geo.s * 0.3), y: geo.base - geo.s * 0.15, vx: Math.cos(a) * rand(80, 260) * (Math.random() < 0.5 ? -1 : 1), vy: Math.sin(a) * rand(120, 380), r: rand(1.5, 4), c: pick(o.cols), t: 0, life: rand(0.5, 1.1), sq: o.kind === 'shard'});
    }
  }
  function resize(w, h, dpr) {
    // décor fixe pré-dessiné : atelier, colonnes chromées, traverse, socle, manomètre
    const c = document.createElement('canvas'); c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    const x = c.getContext('2d'); x.scale(dpr, dpr);
    let g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2B2F36'); g.addColorStop(1, '#121417'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(255,255,255,.03)'; for (let i = 0; i < 10; i++) x.fillRect(0, i * h / 10, w, 1);
    const colW = w * 0.09;
    for (const cx of [w * 0.12, w * 0.88 - colW]) { g = x.createLinearGradient(cx, 0, cx + colW, 0); g.addColorStop(0, '#5F6670'); g.addColorStop(0.35, '#E8ECF1'); g.addColorStop(0.6, '#9AA3AD'); g.addColorStop(1, '#4A5059'); x.fillStyle = g; x.fillRect(cx, h * 0.1, colW, h * 0.78); }
    g = x.createLinearGradient(0, h * 0.04, 0, h * 0.14); g.addColorStop(0, '#FFC107'); g.addColorStop(1, '#C79100'); x.fillStyle = g; x.fillRect(w * 0.06, h * 0.04, w * 0.88, h * 0.1);
    x.fillStyle = '#1B1B1B'; for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(w * 0.06 + i * w * 0.1, h * 0.14); x.lineTo(w * 0.06 + i * w * 0.1 + w * 0.05, h * 0.04); x.lineTo(w * 0.06 + i * w * 0.1 + w * 0.08, h * 0.04); x.lineTo(w * 0.06 + i * w * 0.1 + w * 0.03, h * 0.14); x.fill(); }
    x.fillStyle = '#fff'; x.font = `400 ${Math.round(h * 0.045)}px ${api.font || 'Impact'}`; x.textAlign = 'center'; x.lineWidth = 4; x.strokeStyle = '#1B1B1B'; x.strokeText('200 TONNES', w / 2, h * 0.105); x.fillText('200 TONNES', w / 2, h * 0.105);
    g = x.createLinearGradient(0, h * 0.82, 0, h * 0.92); g.addColorStop(0, '#9AA3AD'); g.addColorStop(1, '#3E444C'); x.fillStyle = g; x.fillRect(w * 0.04, h * 0.82, w * 0.92, h * 0.1);
    x.fillStyle = '#5F6670'; x.fillRect(w * 0.04, h * 0.92, w * 0.92, h * 0.04);
    frame = c;
    geo = {cx: w / 2, base: h * 0.82, s: Math.min(w * 0.55, h * 0.36), top: h * 0.14, w, h};
  }
  function draw(c, w, h) {
    if (!frame || !geo) return;
    c.save();
    if (shake > 0.2) c.translate(rand(-shake, shake), rand(-shake, shake));
    c.drawImage(frame, 0, 0, w, h);
    const s = geo.s, oh = s * o.hgt * 2.1;
    // position de l'objet et du plateau
    let ox = geo.cx;
    if (ph === 'in') ox = -s + (geo.cx + s) * ease(pt / DUR.in);
    if (ph === 'out') ox = geo.cx + (w + s - geo.cx) * ease(pt / DUR.out);
    const sy = o.jelly ? 1 - 0.8 * d : 1 - 0.86 * d, sx = o.jelly ? 1 + 1.4 * d : 1 + 0.75 * d;
    const contact = geo.base - oh * sy;
    const rest = geo.top + h * 0.06;
    if (ph === 'in' || ph === 'out') plateY = rest;
    else if (ph === 'down') plateY = rest + (geo.base - oh - rest) * ease(pt / DUR.down);
    else if (ph === 'crush' || ph === 'hold') plateY = contact;
    else if (ph === 'up') plateY = contact + (rest - contact) * ease(pt / DUR.up);
    // objet déformé
    c.save(); c.translate(ox, geo.base);
    const wob = o.jelly && (ph === 'crush' || ph === 'hold') ? 1 + Math.sin(pt * 30) * 0.04 : 1;
    if (o.crumple && d > 0.15) { c.scale(sx, sy); c.scale(oh, oh); c.beginPath(); for (let k = 0; k <= 8; k++) { const yy = -k / 8; c.lineTo(-0.3 - (k % 2) * 0.1 * d, yy); } for (let k = 8; k >= 0; k--) { const yy = -k / 8; c.lineTo(0.3 + (k % 2) * 0.1 * d, yy); } c.clip(); c.scale(1, 1); o.draw(c); }
    else { c.scale(sx * wob, sy / wob); c.scale(oh, oh); o.draw(c); }
    if (cracks.length) { c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 0.025; for (const [x0, y0, a, l] of cracks) { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0 + Math.cos(a) * l, y0 + Math.sin(a) * l * 0.6); c.lineTo(x0 + Math.cos(a + 0.6) * l * 1.6, y0 + Math.sin(a + 0.6) * l); c.stroke(); } }
    c.restore();
    // vérin chromé et plateau
    const rodW = w * 0.14;
    let g = c.createLinearGradient(geo.cx - rodW / 2, 0, geo.cx + rodW / 2, 0); g.addColorStop(0, '#6B737D'); g.addColorStop(0.4, '#F5F7FA'); g.addColorStop(1, '#59616B');
    c.fillStyle = g; c.fillRect(geo.cx - rodW / 2, geo.top, rodW, plateY - geo.top);
    g = c.createLinearGradient(0, plateY - h * 0.07, 0, plateY); g.addColorStop(0, '#B0B8C1'); g.addColorStop(1, '#3E444C');
    c.fillStyle = g; c.fillRect(w * 0.18, plateY - h * 0.07, w * 0.64, h * 0.07);
    c.fillStyle = '#2B2F36'; for (const k of [0.22, 0.42, 0.58, 0.78]) { c.beginPath(); c.arc(w * k, plateY - h * 0.035, 2.2, 0, 7); c.fill(); }
    // éclats
    for (const p of parts) { c.globalAlpha = 1 - p.t / p.life; c.fillStyle = p.c; if (p.sq) c.fillRect(p.x, p.y, p.r * 1.6, p.r * 1.6); else { c.beginPath(); c.arc(p.x, p.y, p.r, 0, 7); c.fill(); } }
    c.globalAlpha = 1;
    c.restore();
    // manomètre et légendes
    const gx = w * 0.84, gy = h * 0.24, gr = Math.min(w, h) * 0.08, ton = (ph === 'crush' ? d : ph === 'hold' ? 1 : ph === 'up' ? 1 - pt / DUR.up : 0);
    c.fillStyle = '#ECEFF1'; c.beginPath(); c.arc(gx, gy, gr, 0, 7); c.fill(); c.strokeStyle = '#263238'; c.lineWidth = 2; c.stroke();
    c.strokeStyle = '#D50000'; c.lineWidth = 2; c.beginPath(); const a = Math.PI * 0.8 + ton * Math.PI * 1.4; c.moveTo(gx, gy); c.lineTo(gx + Math.cos(a) * gr * 0.85, gy + Math.sin(a) * gr * 0.85); c.stroke();
    c.font = `700 ${Math.round(h * 0.035)}px ${api.mono || 'monospace'}`; c.textAlign = 'center'; c.fillStyle = '#FFD23F';
    c.fillText(`${Math.round(ton * 200)} T`, gx, gy + gr + h * 0.035);
    c.font = `400 ${Math.round(h * 0.04)}px ${api.font || 'Impact'}`; c.fillStyle = '#fff'; c.strokeStyle = '#000'; c.lineWidth = 4;
    c.strokeText(o.name, w / 2, h * 0.985); c.fillText(o.name, w / 2, h * 0.985);
    if (stamp > 0) {
      c.save(); c.translate(w / 2, h * 0.45); c.rotate(-0.18); const k = 1 + Math.max(0, stamp - 0.9) * 2; c.scale(k, k);
      c.globalAlpha = Math.min(1, stamp * 2); c.font = `400 ${Math.round(h * 0.09)}px ${api.font || 'Impact'}`; c.fillStyle = '#FF1744'; c.lineWidth = 6; c.strokeStyle = '#fff';
      c.strokeText('ÉCRASÉ !', 0, 0); c.fillText('ÉCRASÉ !', 0, 0); c.restore();
    }
  }
  return {step, draw, resize, init: next};
})();
tile('press', press);

/* ======================= Sable cinétique ======================= */
const sand = (() => {
  const PALS = [['#FF8FAB', '#FFC8DD', '#BDE0FE', '#A2D2FF', '#CDB4DB'], ['#9BF6FF', '#CAFFBF', '#FDFFB6', '#FFD6A5', '#FFADAD'], ['#B9FBC0', '#98F5E1', '#8EECF5', '#90DBF4', '#A3C4F3']];
  let pal = PALS[0], left = 0, right = 1, slices = [], knife = 0, ph = 'cut', pt = 0, crumbs = [], tex = null, inX = 0;
  const SW = 0.11;
  function reset() { pal = pick(PALS); left = 0.12; right = 0.88; slices = []; ph = 'in'; pt = 0; inX = 1; }
  function step(dt) {
    pt += dt;
    if (ph === 'in') { inX = Math.max(0, 1 - pt / 0.7); if (pt > 0.7) { ph = 'cut'; pt = 0; } }
    else if (ph === 'cut') { knife = Math.min(1, pt / 0.55); if (pt > 0.6) { ph = 'fall'; pt = 0; slices.push({x0: right - SW, w: SW, a: 0, t: 0, pal}); right -= SW; earn('sand', 0.5, false); } }
    else if (ph === 'fall') { knife = Math.max(0, 1 - pt / 0.35); if (pt > 0.45) { ph = right - left < SW * 1.2 ? 'out' : 'cut'; pt = 0; } }
    else if (ph === 'out') { if (pt > 0.8) reset(); }
    for (const s of slices) { s.t += dt; s.a = Math.min(Math.PI / 2, s.a + dt * (2 + s.t * 9)); if (s.a >= Math.PI / 2 && !s.done) { s.done = true; for (let i = 0; i < 14; i++) crumbs.push({x: s.x0 + s.w + rand(0, 0.25), y: 0, vx: rand(-0.1, 0.4), vy: rand(-0.6, -0.1), c: pick(s.pal), t: 0}); } }
    if (slices.length > 6) slices.shift();
    for (let i = crumbs.length - 1; i >= 0; i--) { const p = crumbs[i]; p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 2.5 * dt; if (p.y > 0) { p.y = 0; p.vx *= 0.5; p.vy = 0; } if (p.t > 1.6) crumbs.splice(i, 1); }
  }
  function resize(w, h, dpr) {
    const c = document.createElement('canvas'); c.width = 64; c.height = 64; const x = c.getContext('2d');
    for (let i = 0; i < 500; i++) { x.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${rand(0.04, 0.12)})`; x.fillRect(rand(0, 64), rand(0, 64), 1.4, 1.4); }
    tex = c;
  }
  function block(c, x, y, w, h, p) {
    const n = p.length; for (let i = 0; i < n; i++) { c.fillStyle = p[i]; c.fillRect(x, y + h * i / n, w, h / n + 0.5); }
    if (tex) { c.save(); c.fillStyle = c.createPattern(tex, 'repeat'); c.fillRect(x, y, w, h); c.restore(); }
  }
  function draw(c, w, h) {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#FFF3E0'); g.addColorStop(1, '#FFE0B2'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    const base = h * 0.82, bh = h * 0.42, off = inX * w;
    c.fillStyle = 'rgba(0,0,0,.08)'; c.fillRect(w * 0.06, base, w * 0.9, h * 0.04);
    if (ph !== 'out' || pt < 0.3) block(c, left * w + off, base - bh, (right - left) * w, bh, pal);
    for (const s of slices) {
      c.save(); c.translate((s.x0 + s.w) * w, base); c.rotate(s.a); block(c, -s.w * w, -bh, s.w * w, bh, s.pal); c.restore();
    }
    for (const p of crumbs) { c.fillStyle = p.c; c.fillRect(p.x * w, base + p.y * h - 3, 3, 3); }
    // couteau
    if (ph === 'cut' || ph === 'fall') {
      const kx = (right - SW) * w + off, ky = base - bh - h * 0.25 + (bh + h * 0.2) * knife;
      const gg = c.createLinearGradient(kx - 6, 0, kx + 6, 0); gg.addColorStop(0, '#90A4AE'); gg.addColorStop(0.5, '#FFFFFF'); gg.addColorStop(1, '#78909C');
      c.fillStyle = gg; c.beginPath(); c.moveTo(kx - 4, ky - h * 0.3); c.lineTo(kx + 4, ky - h * 0.3); c.lineTo(kx + 4, ky); c.lineTo(kx, ky + 8); c.lineTo(kx - 4, ky); c.fill();
      c.fillStyle = '#4E342E'; c.fillRect(kx - 6, ky - h * 0.42, 12, h * 0.12);
    }
    c.font = `400 ${Math.round(h * 0.07)}px ${api.font || 'Impact'}`; c.textAlign = 'center'; c.fillStyle = '#6D4C41'; c.fillText('ASMR', w / 2, h * 0.14);
  }
  return {step, draw, resize, init: reset};
})();
tile('sand', sand);

/* ======================= Nettoyeur haute pression ======================= */
const wash = (() => {
  let clean = null, dirt = null, dctx = null, W = 0, H = 0, dp = 1, path = 0, ph = 'wash', pt = 0, drops = [], hue = 0;
  const ROWS = 7;
  function paintClean() {
    const c = document.createElement('canvas'); c.width = W * dp; c.height = H * dp; const x = c.getContext('2d'); x.scale(dp, dp);
    hue = rand(0, 360);
    const n = 6, tw = W / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < Math.ceil(H / tw); j++) { x.fillStyle = `hsl(${(hue + (i + j) * 25) % 360},85%,${(i + j) % 2 ? 62 : 72}%)`; x.fillRect(i * tw, j * tw, tw - 2, tw - 2); }
    x.font = `400 ${Math.round(H * 0.16)}px ${api.font || 'Impact'}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 6; x.strokeStyle = '#1B1029'; x.fillStyle = '#fff';
    x.strokeText('DOPA', W / 2, H / 2); x.fillText('DOPA', W / 2, H / 2);
    clean = c;
  }
  function paintDirt() {
    dirt = document.createElement('canvas'); dirt.width = W * dp; dirt.height = H * dp; dctx = dirt.getContext('2d'); dctx.scale(dp, dp);
    dctx.fillStyle = '#5D4A3A'; dctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 160; i++) { dctx.fillStyle = `rgba(${pick(['40,30,20', '90,75,55', '30,40,25'])},${rand(0.2, 0.6)})`; dctx.beginPath(); dctx.arc(rand(0, W), rand(0, H), rand(2, W * 0.07), 0, 7); dctx.fill(); }
  }
  function nozzle() {
    // trajet en zigzag ligne par ligne
    const row = Math.min(ROWS - 1, Math.floor(path)), f = path - row, dir = row % 2 ? -1 : 1;
    const x = dir > 0 ? f * W : (1 - f) * W, y = (row + 0.5) / ROWS * H;
    return [x, y];
  }
  function step(dt) {
    if (!dctx) return;
    pt += dt;
    if (ph === 'wash') {
      const r = H / ROWS * 0.75;
      for (let k = 0; k < 3; k++) {
        path += dt / 3 * 0.9;
        const [x, y] = nozzle();
        dctx.globalCompositeOperation = 'destination-out';
        const g = dctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.7, 'rgba(0,0,0,.9)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        dctx.fillStyle = g; dctx.beginPath(); dctx.arc(x, y, r, 0, 7); dctx.fill();
        dctx.globalCompositeOperation = 'source-over';
      }
      const [x, y] = nozzle();
      for (let k = 0; k < 3; k++) drops.push({x, y, vx: rand(-80, 80), vy: rand(-120, -20), t: 0});
      if (path >= ROWS) { ph = 'shine'; pt = 0; earn('wash', 20); }
    } else if (ph === 'shine' && pt > 1.4) { ph = 'dirty'; pt = 0; }
    else if (ph === 'dirty' && pt > 0.6) { paintClean(); paintDirt(); path = 0; ph = 'wash'; pt = 0; }
    for (let i = drops.length - 1; i >= 0; i--) { const p = drops[i]; p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 500 * dt; if (p.t > 0.4) drops.splice(i, 1); }
    if (drops.length > 60) drops.splice(0, drops.length - 60);
  }
  function resize(w, h, dpr) { W = w; H = h; dp = dpr; paintClean(); paintDirt(); path = 0; ph = 'wash'; }
  function draw(c, w, h) {
    if (!clean) return;
    c.drawImage(clean, 0, 0, w, h);
    if (ph === 'dirty') { c.globalAlpha = Math.min(1, pt / 0.6); c.fillStyle = '#5D4A3A'; c.fillRect(0, 0, w, h); c.globalAlpha = 1; }
    else c.drawImage(dirt, 0, 0, w, h);
    if (ph === 'wash') {
      const [x, y] = nozzle();
      c.strokeStyle = 'rgba(225,245,254,.85)'; c.lineWidth = 3; c.beginPath(); c.moveTo(w * 1.02, h * 1.02); c.lineTo(x, y); c.stroke();
      c.fillStyle = '#FFC107'; c.save(); c.translate(w * 0.98, h * 0.98); c.rotate(Math.atan2(y - h * 0.98, x - w * 0.98)); c.fillRect(-4, -5, 26, 10); c.restore();
      c.fillStyle = 'rgba(225,245,254,.9)'; for (const p of drops) c.fillRect(p.x, p.y, 2, 2);
    }
    if (ph === 'shine') {
      c.font = `400 ${Math.round(h * 0.1)}px ${api.font || 'Impact'}`; c.textAlign = 'center'; c.lineWidth = 5; c.strokeStyle = '#1B1029'; c.fillStyle = '#FFD23F';
      c.strokeText('TOUT PROPRE ✨', w / 2, h * 0.2); c.fillText('TOUT PROPRE ✨', w / 2, h * 0.2);
    }
  }
  return {step, draw, resize};
})();
tile('wash', wash);

/* ======================= Fidget spinner ======================= */
// Le spinner est dessiné une fois dans une image ; à chaque image on ne fait que la tourner. Chaque tap le relance.
const spinner = (() => {
  let spr = null, S2 = 0, ang = 0, w = 7, turns = 0, hue = 0, flash = 0;
  function resize(wd, ht, dpr) {
    S2 = Math.min(wd, ht) * 0.86;
    const sz = Math.round(S2 * dpr), c = document.createElement('canvas'); c.width = c.height = sz;
    const x = c.getContext('2d'); x.scale(dpr, dpr); x.translate(S2 / 2, S2 / 2);
    const R = S2 * 0.3, r = S2 * 0.16;
    const cols = [['#FF4F79', '#FFB3C6'], ['#4FD8FF', '#B8F0FF'], ['#FFD23F', '#FFF1B0']];
    // bras
    x.fillStyle = '#2B1B3D'; x.beginPath();
    for (let i = 0; i < 3; i++) { const a = i * 2.094 - 1.5708; x.moveTo(0, 0); x.arc(Math.cos(a) * R, Math.sin(a) * R, r * 0.78, 0, 7); }
    x.fill();
    x.lineWidth = r * 0.9; x.strokeStyle = '#3B2754'; x.lineCap = 'round'; x.beginPath();
    for (let i = 0; i < 3; i++) { const a = i * 2.094 - 1.5708; x.moveTo(0, 0); x.lineTo(Math.cos(a) * R, Math.sin(a) * R); }
    x.stroke();
    // roulements colorés
    for (let i = 0; i < 3; i++) {
      const a = i * 2.094 - 1.5708, cx = Math.cos(a) * R, cy = Math.sin(a) * R;
      const g = x.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r);
      g.addColorStop(0, cols[i][1]); g.addColorStop(1, cols[i][0]);
      x.fillStyle = g; x.strokeStyle = '#1B1029'; x.lineWidth = 3;
      x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); x.stroke();
      x.fillStyle = 'rgba(255,255,255,.55)'; x.beginPath(); x.arc(cx - r * 0.35, cy - r * 0.35, r * 0.22, 0, 7); x.fill();
    }
    const g = x.createRadialGradient(-r * 0.2, -r * 0.2, 0, 0, 0, r * 0.75);
    g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, '#9EA7B8');
    x.fillStyle = g; x.strokeStyle = '#1B1029'; x.lineWidth = 3; x.beginPath(); x.arc(0, 0, r * 0.7, 0, 7); x.fill(); x.stroke();
    spr = c;
  }
  function poke() { w = Math.min(70, w + 1.6); }
  function step(dt) {
    w += (7 - w) * Math.min(1, dt * 0.35);
    ang += w * dt; hue = (hue + w * dt * 8) % 360;
    flash = Math.max(0, flash - dt);
    const t = Math.floor(ang / 6.2832);
    if (t > turns) { const n = t - turns; turns = t; if (turns % 12 < n) { earn('spinner', 3); flash = 0.4; } }
  }
  function draw(c, wd, ht) {
    c.fillStyle = '#120A1E'; c.fillRect(0, 0, wd, ht);
    const cx = wd / 2, cy = ht / 2, sp = Math.min(1, (w - 7) / 40);
    // traînée arc-en-ciel : plus il tourne vite, plus elle brille
    c.lineWidth = Math.max(3, S2 * 0.05); c.lineCap = 'round';
    for (let k = 0; k < 6; k++) {
      c.strokeStyle = `hsla(${(hue + k * 60) % 360},95%,62%,${0.12 + sp * 0.45})`;
      c.beginPath(); c.arc(cx, cy, S2 * 0.47, ang + k * 1.05, ang + k * 1.05 + 0.6 + sp * 0.4); c.stroke();
    }
    if (spr) {
      c.save(); c.translate(cx, cy); c.rotate(ang);
      if (sp > 0.3) { c.globalAlpha = 0.25; c.rotate(-0.25); c.drawImage(spr, -S2 / 2, -S2 / 2, S2, S2); c.rotate(0.25); c.globalAlpha = 1; }
      c.drawImage(spr, -S2 / 2, -S2 / 2, S2, S2); c.restore();
    }
    const rpm = Math.round(w * 9.55);
    c.font = `700 ${Math.round(ht * 0.075)}px ${api.mono || 'monospace'}`; c.textAlign = 'center';
    c.fillStyle = flash > 0 ? '#FFD23F' : 'rgba(255,255,255,.75)';
    c.fillText(`${rpm} TR/MIN`, wd / 2, ht * 0.95);
  }
  return {step, draw, resize, poke};
})();
tile('spinner', spinner);

/* ======================= Slime ASMR ======================= */
const slime = (() => {
  const COLS = [['#7CFFB2', '#2BD47D'], ['#C77DFF', '#8B3BE0'], ['#FF8FC7', '#E8478F'], ['#7FD8FF', '#2B9BE0'], ['#FFE066', '#E0B000']];
  const N = 28;
  let col = COLS[0], t = 0, press = 0, fx = 0.5, word = 0, glit = [], loops = 0;
  function newLoop() {
    col = COLS[loops++ % COLS.length]; fx = rand(0.35, 0.65);
    glit = Array.from({length: 26}, () => ({a: rand(0, 6.28), d: rand(0.1, 0.85), c: pick(['#FFFFFF', '#FFD23F', '#FF7EB6', '#4FD8FF'])}));
  }
  newLoop();
  function step(dt) {
    t += dt;
    const cyc = t % 2.2;  // 2,2 s : le doigt descend, écrase, remonte
    const was = press;
    press = cyc < 0.9 ? Math.sin(Math.min(1, cyc / 0.9) * Math.PI / 2) : cyc < 1.3 ? 1 : Math.max(0, 1 - (cyc - 1.3) / 0.6);
    if (press >= 1 && was < 1) { word = 0.8; earn('slime', 2, false); }
    if (cyc < dt) newLoop();
    word = Math.max(0, word - dt);
  }
  function draw(c, w, h) {
    const g0 = c.createLinearGradient(0, 0, 0, h); g0.addColorStop(0, '#2B1B3D'); g0.addColorStop(1, '#170E24');
    c.fillStyle = g0; c.fillRect(0, 0, w, h);
    const cx = w / 2, base = h * 0.86, R = Math.min(w, h) * 0.34;
    const sq = press * 0.35, fxp = (fx - 0.5) * w * 0.4;
    // contour du slime : un cercle écrasé, creusé sous le doigt
    const pts = [];
    for (let i = 0; i < N; i++) {
      const a = i / N * Math.PI * 2;
      let x = Math.cos(a) * R * (1 + sq * 0.55), y = Math.sin(a) * R * (1 - sq * 0.5);
      if (y > 0) y *= 0.6;
      const dx = x - fxp, top = y < 0 ? Math.exp(-(dx * dx) / (R * R * 0.12)) : 0;
      y += top * press * R * 0.55;
      x += Math.sin(t * 2 + i) * R * 0.015;
      pts.push([cx + x, base - R * 0.45 + y]);
    }
    c.beginPath();
    for (let i = 0; i < N; i++) {
      const p = pts[i], q = pts[(i + 1) % N];
      const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
      if (i === 0) c.moveTo(mx, my); else c.quadraticCurveTo(p[0], p[1], mx, my);
    }
    c.quadraticCurveTo(pts[0][0], pts[0][1], (pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2);
    c.closePath();
    const g = c.createRadialGradient(cx - R * 0.3, base - R, R * 0.1, cx, base - R * 0.4, R * 1.4);
    g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.18, col[0]); g.addColorStop(1, col[1]);
    c.fillStyle = g; c.fill();
    c.lineWidth = 3; c.strokeStyle = '#1B1029'; c.stroke();
    c.save(); c.clip();
    for (const p of glit) {
      const x = cx + Math.cos(p.a) * p.d * R * (1 + sq * 0.5), y = base - R * 0.45 + Math.sin(p.a) * p.d * R * 0.5 * (1 - sq * 0.4);
      c.fillStyle = p.c; c.fillRect(x - 1.5, y - 1.5, 3, 3);
    }
    c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(cx - R * 0.35, base - R * 0.75 + press * R * 0.2, R * 0.22, R * 0.08, -0.4, 0, 7); c.fill();
    c.restore();
    // le doigt
    const fy = base - R * 1.55 + press * R * 0.75 + (press >= 1 ? 0 : 0);
    c.fillStyle = '#F5C6A5'; c.strokeStyle = '#1B1029'; c.lineWidth = 3;
    c.beginPath(); c.roundRect(cx + fxp - R * 0.13, fy - R * 1.2, R * 0.26, R * 1.25, R * 0.13); c.fill(); c.stroke();
    c.fillStyle = '#FFE4D2'; c.beginPath(); c.roundRect(cx + fxp - R * 0.08, fy - R * 0.02 - R * 0.2, R * 0.16, R * 0.16, R * 0.05); c.fill();
    if (word > 0) {
      c.font = `400 ${Math.round(h * 0.11)}px ${api.font || 'Impact'}`; c.textAlign = 'center';
      c.globalAlpha = Math.min(1, word * 2); c.lineWidth = 5; c.strokeStyle = '#1B1029'; c.fillStyle = col[0];
      c.strokeText('SQUISH', w / 2, h * 0.2); c.fillText('SQUISH', w / 2, h * 0.2); c.globalAlpha = 1;
    }
  }
  return {step, draw};
})();
tile('slime', slime);

/* ======================= Chat en direct ======================= */
const NICKS = ['xX_Dopa_Xx', 'pouce_agile', 'kevin_du_93', 'LaReineDuScroll', 'chad_officiel', 'mamie_gamer', 'le_vrai_singe', 'Gorille42', 'TouchGrass', 'notif_addict', 'Mr_Beluga', 'ZZZ_insomnie', 'pop_it_master', 'crypto_lune', 'ahah_ok', 'Jean-Scroll'];
const NCOL = ['#FF4F79', '#5FE0B7', '#FFD23F', '#4FD8FF', '#C77DFF', '#FF9F1C', '#FF7EB6', '#8FEAFF'];
const MSGS = ['W', 'W W W', 'pas mal', 'c\'est quoi ce jeu 😭', 'je peux plus m\'arrêter', 'encore 5 minutes et je dors', 'GG', 'trop satisfaisant', 'PRESSE PRESSE PRESSE', 'qui est là depuis le début ?', 'mdrrr', 'le canard 💀', 'first', 'ma prof me regarde', 'ratio', 'abonnez-vous', 'il est trop fort', '+1 dopamine', 'ça tourne en boucle depuis 3 h', 'le runner il va jamais tomber ?', 'je regarde juste le sable', 'POV : t\'as des devoirs', 'oh non mon forfait', 'le logo DVD va toucher le coin', 'c\'est mon pote qui m\'a envoyé ça', '🔥🔥🔥', '😭😭', 'POG', 'L', 'trop chill'];
const HYPE = ['LETS GOOOO', 'W W W W', '🔥🔥🔥🔥', 'NON MAIS LA', 'INCROYABLE', 'POGGERS', 'CLIP ÇA', 'ACTUALISE MA DOPAMINE', 'IL L\'A FAIT', 'GOAT'];
let chatT = 0, viewers = 1200, hypeQ = 0;
function chatLine(msg, hype) {
  const ul = $('stChatList'); if (!ul) return;
  const li = document.createElement('li');
  li.innerHTML = `<b style="color:${pick(NCOL)}">${esc(pick(NICKS))}</b> ${esc(msg)}`;
  if (hype) li.className = 'hype';
  ul.appendChild(li);
  while (ul.children.length > 18) ul.firstChild.remove();
}
function chatTick(dt) {
  if (!owns('chat') || $('st-chat').hidden) return;
  chatT -= dt;
  if (hypeQ > 0 && chatT < 0.35) { hypeQ--; chatLine(pick(HYPE), true); chatT = 0.12; return; }
  if (chatT > 0) return;
  chatT = rand(0.35, 1.1);
  chatLine(pick(MSGS));
  viewers = Math.max(300, Math.round(viewers * rand(0.97, 1.035) + rand(-20, 30)));
  DT.setText($('stViewers'), viewers.toLocaleString('fr-FR'));
}

/* ======================= Barres de progression ======================= */
const BAR_LABELS = ['Téléchargement de dopamine', 'Mise à jour du cerveau', 'Installation de TikTok 2', 'Chargement de l\'herbe', 'Compilation des likes', 'Recharge du pouce', 'Synchronisation des notifs', 'Décompression des mèmes', 'Calcul du sens de la vie', 'Optimisation du scroll'];
const bars = [];
function barsInit() {
  const box = $('stBars'); if (!box || bars.length) return;
  for (let i = 0; i < 5; i++) {
    const row = document.createElement('div'); row.className = 'st-bar';
    row.innerHTML = '<span class="st-bl"></span><span class="st-bt"><i></i></span><b class="st-bp"></b>';
    box.appendChild(row);
    bars.push({row, lab: row.querySelector('.st-bl'), fill: row.querySelector('i'), pct: row.querySelector('.st-bp'), p: rand(0, 0.8), v: rand(0.06, 0.3), done: 0});
    bars[i].lab.textContent = freeLabel();
  }
}
// un texte qu'aucune autre barre n'affiche
const freeLabel = () => pick(BAR_LABELS.filter(l => !bars.some(b => b.lab.textContent === l)));
// Fluidité : les barres avancent à chaque image mais ne sont écrites dans la page que 10 fois par seconde
// (une transition CSS lisse le mouvement, sans recalcul de la page).
let barClock = 0;
function barsTick(dt) {
  if (!owns('bars') || $('st-bars').hidden) return;
  barsInit();
  barClock += dt;
  if (barClock < 0.1) return;
  dt = barClock; barClock = 0;
  for (const b of bars) {
    if (b.done > 0) { b.done -= dt; if (b.done <= 0) { b.p = 0; b.v = rand(0.06, 0.32); b.lab.textContent = freeLabel(); DT.setClass(b.row, 'st-bar'); } continue; }
    // vitesse irrégulière, comme une vraie barre qui ment
    const slow = b.p > 0.9 ? 0.25 : 1;
    b.p = Math.min(1, b.p + b.v * dt * slow * (Math.random() < 0.02 ? 6 : 1));
    DT.setStyle(b.fill, 'transform', `scaleX(${b.p.toFixed(3)})`);
    DT.setText(b.pct, b.p >= 1 ? '✓' : Math.floor(b.p * 100) + ' %');
    if (b.p >= 1) { b.done = 1.2; DT.setClass(b.row, 'st-bar done'); b.row.animate([{transform: 'scale(1.06)'}, {transform: 'scale(1)'}], {duration: 300}); earn('bars', 2, false); if (api.visible()) api.A.click(); }
  }
}

/* ======================= Compteur d'abonnés ======================= */
let subs = 0, subT = 0, digits = [];
function subsInit() {
  const box = $('stSubN'); if (!box || digits.length) return;
  subs = Math.floor(1000 + Math.sqrt(api.S.life || 0) * 3);
  for (let i = 0; i < 10; i++) {
    const d = document.createElement('span'); d.className = 'st-dg';
    d.innerHTML = '<span>' + '0123456789'.split('').map(x => `<i>${x}</i>`).join('') + '</span>';
    box.appendChild(d); digits.push(d.firstChild);
  }
  showSubs();
}
function showSubs() {
  const s = String(subs).padStart(10, ' ');
  for (let i = 0; i < 10; i++) {
    const ch = s[i], d = digits[i];
    DT.setHidden(d.parentNode, ch === ' ');
    if (ch !== ' ') DT.setStyle(d, 'transform', `translateY(-${+ch * 10}%)`);
  }
}
function subsTick(dt) {
  if (!owns('subs') || $('st-subs').hidden) return;
  subsInit();
  subT -= dt; if (subT > 0) return;
  subT = rand(0.6, 1.4);
  const before = subs;
  subs += Math.max(1, Math.floor(subs * rand(0.0005, 0.004)));
  showSubs();
  const lead = n => String(n)[0] + String(n).length;
  if (lead(before) !== lead(subs)) {
    const m = $('stSubMsg'); DT.setText(m, `🎉 ${api.fmt(Math.floor(subs / Math.pow(10, String(subs).length - 1)) * Math.pow(10, String(subs).length - 1))} ABONNÉS !`);
    m.animate([{transform: 'scale(.5)', opacity: 0}, {transform: 'scale(1.15)', opacity: 1, offset: 0.3}, {transform: 'scale(1)', opacity: 1, offset: 0.8}, {opacity: 0}], {duration: 2200});
    earn('subs', 10);
  }
}

/* ======================= Logo DVD ======================= */
const dvd = {x: 80, y: 120, vx: 140, vy: 110, w: 130, h: 64, W: 0, H: 0, stale: true, hue: 0, lastX: -9, lastY: -9, t: 0};
function dvdTick(dt) {
  if (!owns('dvd') || $('stDvd').hidden) return;
  const el = $('stDvd');
  if (dvd.stale) { dvd.stale = false; dvd.W = innerWidth; dvd.H = innerHeight; dvd.w = el.offsetWidth || 130; dvd.h = el.offsetHeight || 64; dvd.x = clamp(dvd.x, 0, dvd.W - dvd.w); dvd.y = clamp(dvd.y, 0, dvd.H - dvd.h); }
  dt = Math.min(dt, 0.05); dvd.t += dt;
  dvd.x += dvd.vx * dt; dvd.y += dvd.vy * dt;
  let hx = false, hy = false;
  if (dvd.x <= 0 || dvd.x >= dvd.W - dvd.w) { dvd.vx = -dvd.vx; dvd.x = clamp(dvd.x, 0, dvd.W - dvd.w); hx = true; dvd.lastX = dvd.t; }
  if (dvd.y <= 0 || dvd.y >= dvd.H - dvd.h) { dvd.vy = -dvd.vy; dvd.y = clamp(dvd.y, 0, dvd.H - dvd.h); hy = true; dvd.lastY = dvd.t; }
  if (hx || hy) {
    dvd.hue = (dvd.hue + rand(60, 160)) % 360;
    DT.setStyle(el, 'color', `hsl(${Math.round(dvd.hue)},95%,62%)`);
    if (Math.abs(dvd.lastX - dvd.lastY) < 0.06) corner();
    // de temps en temps, il vise un coin (sinon on attendrait des heures)
    else if (hx && Math.random() < 0.18) {
      const tx = Math.abs(((dvd.vx > 0 ? dvd.W - dvd.w : 0) - dvd.x) / dvd.vx);
      const ty = dvd.vy > 0 ? dvd.H - dvd.h - dvd.y : dvd.y;
      const need = ty / tx;
      if (need > 60 && need < 200) dvd.vy = Math.sign(dvd.vy) * need;
    }
  }
  DT.setStyle(el, 'transform', `translate(${dvd.x.toFixed(1)}px,${dvd.y.toFixed(1)}px)`);
}
function corner() {
  const S = api.S;
  S.dvdCorners = (S.dvdCorners || 0) + 1;
  const g = small() * 300;
  api.gain(g);
  api.A.jackpot(); api.flash('#FFD23F'); api.shake(document.body);
  api.banner('LOGO DVD', 'COIN PARFAIT !', `+${api.fmt(g)} nmol et un coffre magique`);
  api.confetti(dvd.x + dvd.w / 2, dvd.y + dvd.h / 2, 160);
  api.give('magic', 'coin parfait du logo DVD');
  api.addFeed('Le logo DVD touche <b>le coin parfait</b> !');
  react('hype');
}

/* ======================= Notifications, mèmes, hibou, confettis ======================= */
const NOTIFS = [
  ['💬', 'Maman', 'Tu manges à la maison ce soir ?'], ['❤️', 'InstaPic', 'Ton crush a aimé ta story'], ['📦', 'Livraison', 'Ton colis arrive dans 3 arrêts'],
  ['🔥', 'Série', 'Ta flamme de 212 jours est en danger !'], ['🎮', 'Dopamine Tycoon', 'Tes potes jouent sans toi'], ['💸', 'Banque', 'Virement reçu : +12 € (merci mamie)'],
  ['📈', 'Bourse', 'LUNE a pris +40 % ce matin'], ['👀', 'Inconnu', 'tu dors ?'], ['🦉', 'Hibou', 'Tu n\'as pas fait ta leçon'], ['⭐', 'Abonnés', '+1 248 nouveaux abonnés'],
  ['🎵', 'Musique', 'Ton son préféré tourne en boucle depuis 3 h'], ['🍕', 'Pizza', '-50 % sur ta pizza préférée'], ['🏆', 'Succès', 'Tu as scrollé 2 km aujourd\'hui'], ['📸', 'Souvenirs', 'Il y a un an : toi, en train de jouer'],
];
let notifT = 12, memeT = 60, owlT = 70, confT = 30;
function notify() {
  const box = $('stNotifs'); if (!box) return;
  const [ic, app, txt] = pick(NOTIFS);
  const d = document.createElement('div'); d.className = 'st-notif';
  d.innerHTML = `<span class="st-nic">${ic}</span><span class="st-nt"><b>${esc(app)}</b><small>maintenant</small><span>${esc(txt)}</span></span>`;
  box.prepend(d);
  while (box.children.length > 3) box.lastChild.remove();
  d.animate([{transform: 'translateX(120%)'}, {transform: 'translateX(-6%)', offset: 0.7}, {transform: 'translateX(0)'}], {duration: 450, easing: 'ease-out'});
  setTimeout(() => { d.animate([{opacity: 1}, {opacity: 0, transform: 'translateX(60%)'}], {duration: 350}).onfinish = () => d.remove(); }, 4200);
  api.A.goldenSpawn();
  api.gain(small() * 3);
}
const CAPS = ['QUAND TU LANCES LE JEU', 'MOI À 3 H DU MAT', 'POV : TU AS DES DEVOIRS', 'QUAND LA PRESSE DESCEND', 'MON CERVEAU APRÈS 5 MIN', 'QUAND TU TOUCHES LE JACKPOT', 'LA TÊTE DE MES POTES', 'MOI QUAND JE PERDS MON COMBO', 'ENCORE UNE PETITE PARTIE', 'QUAND TU VOIS TA DOPAMINE', 'ATTENDS QUOI ?!', 'C\'EST MOI ÇA', 'MON PROF QUAND IL ME VOIT', 'LE SON DU POP-IT'];
function showMeme() {
  const box = $('stMeme'); if (!box || api.modalOpen()) return;
  const card = pick(DT.CARDS);
  box.innerHTML = `${DT.cardArt(card.id)}<b>${esc(pick(CAPS))}</b>`;
  box.hidden = false;
  box.style.left = rand(8, 62) + 'vw'; box.style.top = rand(12, 50) + 'vh';
  const r = rand(-14, 14);
  box.animate([{transform: `rotate(${r}deg) scale(0)`}, {transform: `rotate(${r}deg) scale(1.15)`, offset: 0.15}, {transform: `rotate(${r}deg) scale(1)`, offset: 0.25}, {transform: `rotate(${r}deg) scale(1)`, offset: 0.85}, {transform: `rotate(${r}deg) scale(0)`}], {duration: 2800, easing: 'ease-out'})
    .onfinish = () => { box.hidden = true; };
  api.A.emote();
}
const OWL = ['Tu n\'as pas fait ta leçon de dopamine aujourd\'hui.', 'Ça fait 5 minutes. Tu m\'as oublié ?', 'Ta série va casser. Ce serait dommage…', 'Je sais où tu habites. Fais ta leçon.', 'Une petite leçon ? Juste une ?', 'Je ne suis pas en colère. Juste déçu.'];
function owl() {
  const el = $('stOwl'); if (!el || api.modalOpen()) return;
  DT.setText($('stOwlTxt'), pick(OWL));
  el.hidden = false;
  el.animate([{transform: 'translateY(120%)'}, {transform: 'translateY(-8%)', offset: 0.12}, {transform: 'translateY(0)', offset: 0.18}, {transform: 'translateY(0)', offset: 0.88}, {transform: 'translateY(120%)'}], {duration: 5200, easing: 'ease-out'}).onfinish = () => { el.hidden = true; };
  api.A.emote();
  api.gain(small() * 5);
}
function confettiRain() {
  for (let i = 0; i < 3; i++) setTimeout(() => api.confetti(rand(0.1, 0.9) * innerWidth, rand(0.1, 0.5) * innerHeight, 50), i * 220);
  api.A.pop();
  api.gain(small() * 2);
}

/* ======================= Toucher de l'herbe ======================= */
let grassOpen = false;
function touchGrass() {
  const el = $('stGrass'); if (!el) return;
  grassOpen = true; el.hidden = false;
  $('stGrassBtn').hidden = true;
  el.animate([{opacity: 0}, {opacity: 1}], {duration: 1500});
  setTimeout(() => { $('stGrassBtn').hidden = false; }, 6000);
  api.S.grassDone = (api.S.grassDone || 0) + 1;
  api.onChange();
}
function leaveGrass() {
  const el = $('stGrass');
  el.animate([{opacity: 1}, {opacity: 0}], {duration: 600}).onfinish = () => { el.hidden = true; grassOpen = false; layout(); };
  api.banner('RETOUR', 'À LA DOPAMINE', 'Sérénité retrouvée : +50 % de production pour toujours');
  api.confetti(innerWidth / 2, innerHeight * 0.4, 200); api.A.levelUp();
}

/* ======================= Réactions du chat aux exploits ======================= */
function react(kind) { if (owns('chat')) hypeQ = Math.min(10, hypeQ + 6); }

/* ======================= Boucle ======================= */
let lastVis = null, vidT = 0;
function tick(dt) {
  // au retour d'une fenêtre en arrière-plan, dt peut valoir des minutes : on ne rattrape pas l'animation
  dt = Math.min(dt, 0.1);
  const vis = api.visible();
  if (vis !== lastVis) { lastVis = vis; layout(); }
  refreshShop(dt);
  if (!on()) return;
  for (const t of Object.values(TILES)) stepTile(t, dt);
  drawTiles();
  // les vraies vidéos rapportent aussi un peu, toutes les 6 secondes
  vidT += dt;
  if (vidT >= 6) { vidT = 0; for (const id of Object.keys(VIDEOS)) { const el = $('st-' + id); if (el && el.classList.contains('st-vid')) earn(id, 2); } }
  chatTick(dt); barsTick(dt); subsTick(dt); dvdTick(dt);
  // apparitions surprises
  memeT -= dt; if (memeT <= 0) { memeT = owns('memes') ? rand(18, 30) : rand(50, 80); showMeme(); }
  if (owns('notifs')) { notifT -= dt; if (notifT <= 0) { notifT = rand(12, 24); notify(); } }
  if (owns('owl')) { owlT -= dt; if (owlT <= 0) { owlT = rand(70, 110); owl(); } }
  if (owns('confetti')) { confT -= dt; if (confT <= 0) { confT = rand(22, 40); confettiRain(); } }
}
function init(a) {
  api = a;
  $('stimList').addEventListener('click', e => { const b = e.target.closest('[data-buy]'); if (b) buy(b.dataset.buy); });
  $('stGrassBtn').addEventListener('click', leaveGrass);
  // sans vidéo de parkour, les barres prennent toute la largeur (sinon un trou à côté d'elles)
  if (!BY.parkour) $('st-bars').classList.replace('tall', 'wide2');
  renderShop();
  layout();
}

DT.Stim = {init, tick, bonus, count, react, render: renderShop, layout, STIMS, poke: () => { if (owns('spinner')) spinner.poke(); },
  test: {showMeme, notify, owl, corner, touchGrass}};  // pour les tests (outil de debug)

})(window.DT);
