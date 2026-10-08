/* Dopamine Tycoon : mode Hype (appelé « fever » dans le code), roue de la dopamine, quêtes et cadeau quotidien. */
window.DT = window.DT || {};
(function (DT) {
'use strict';

const $ = id => document.getElementById(id);
const now = () => DT.now();
const rand = (a, b) => a + Math.random() * (b - a);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
let api = null;

/* ======================= Fièvre ======================= */
const FEVER_SECS = 15, FEVER_MULT = 5;
let feverIdle = 0;
const feverOn = () => (api.S.feverUntil || 0) > now();
// Sagesse « Hype contrôlée » : jauge 30 % plus rapide, 5 s de plus.
const feverLen = () => FEVER_SECS + (api.sag('s_fever') ? 5 : 0);
function feverAdd(x) {
  const S = api.S;
  if (feverOn()) return;
  S.fever = Math.min(100, (S.fever || 0) + x * (api.sag('s_fever') ? 1.3 : 1));
  feverIdle = 0;
  if (S.fever >= 100) startFever();
}
function startFever() {
  const S = api.S;
  const secs = feverLen();
  S.fever = 0; S.feverUntil = now() + secs * 1000; S.fevers = (S.fevers || 0) + 1;
  api.buff('prod', FEVER_MULT, secs, `HYPE ×${FEVER_MULT}`);
  api.buff('tap', FEVER_MULT, secs, `Tap ×${FEVER_MULT}`);
  api.A.fever();
  api.banner('MODE', 'HYPE', `Production et taps ×${FEVER_MULT} pendant ${secs} s`);
  api.flash('#FF4F79'); api.shake(document.body);
  api.confetti(innerWidth / 2, innerHeight * 0.4, 90);
  quest('fever', 1);
}
function feverTick(dt) {
  const S = api.S, on = feverOn();
  if (document.body.classList.contains('fever-on') !== on) document.body.classList.toggle('fever-on', on);
  if (!on) { feverIdle += dt; if (feverIdle > 2) S.fever = Math.max(0, (S.fever || 0) - 7 * dt); }
  const bar = $('feverBar');
  if (!bar) return;
  const pct = on ? ((S.feverUntil - now()) / (feverLen() * 1000)) * 100 : (S.fever || 0);
  DT.setStyle(bar, 'width', Math.round(Math.max(0, Math.min(100, pct)) * 2) / 2 + '%');
  DT.setText($('feverLab'), on ? `HYPE ×${FEVER_MULT} · ${Math.ceil((S.feverUntil - now()) / 1000)} s` : `HYPE ${Math.floor(S.fever || 0)} %`);
  const hot = on || (S.fever || 0) > 80;
  if ($('fever').classList.contains('hot') !== hot) $('fever').classList.toggle('hot', hot);
}

/* ======================= Roue ======================= */
const FREE_EVERY = 10 * 60000;
const WHEEL = [
  {label: '×2 PROD', sub: '60 s',        color: '#FF4F79', w: 14, fx: () => { api.buff('prod', 2, 60, 'Roue ×2'); return 'Production ×2 pendant 60 s !'; }},
  {label: 'COFFRE',  sub: 'en bois',     color: '#B5773B', w: 16, fx: () => { api.give('wood', 'roue'); return 'Un coffre en bois !'; }},
  {label: '+5 MIN',  sub: 'de prod',     color: '#2FBF71', w: 14, fx: () => `+${api.fmt(api.gainTime(300))} nmol !`},
  {label: 'RATÉ !',  sub: 'dommage',     color: '#4A3560', w: 10, fx: () => 'Raté ! La roue se moque de toi.'},
  {label: 'COFFRE',  sub: 'doré',        color: '#FFC247', w: 11, fx: () => { api.give('gold', 'roue'); return 'Un coffre doré !'; }},
  {label: 'HYPE',    sub: 'immédiate',   color: '#FF9F1C', w: 9,  fx: () => { setTimeout(startFever, 400); return 'HYPE immédiate !'; }},
  {label: '+2 TOURS', sub: 'gratuits',   color: '#4FD8FF', w: 9,  fx: () => { api.S.spins = (api.S.spins || 0) + 2; return '+2 tours de roue !'; }},
  {label: 'COFFRE',  sub: 'magique',     color: '#C77DFF', w: 8,  fx: () => { api.give('magic', 'roue'); return 'Un coffre magique !'; }},
  {label: 'JACKPOT', sub: '1 h de prod', color: '#FFD23F', w: 5,  jackpot: true, fx: () => `JACKPOT : +${api.fmt(api.gainTime(3600))} nmol !`},
  {label: 'LÉGENDE', sub: 'coffre',      color: '#5CFFE1', w: 4,  fx: () => { api.give('legend', 'roue'); return 'COFFRE LÉGENDAIRE !'; }},
];
const TOTAL_W = WHEEL.reduce((a, s) => a + s.w, 0);
let segs = [];
{ let a = 0; segs = WHEEL.map(s => { const a0 = a; a += s.w / TOTAL_W * Math.PI * 2; return {...s, a0, a1: a}; }); }
let wRot = 0, spin = null, wheelSize = 0, face = null, faceKey = '', uiClock = 0;
addEventListener('resize', () => { wheelSize = 0; });

function freeReady() { return DT.clock.trusted && now() >= (api.S.nextFree || 0); }
function spinsAvail() { return (api.S.spins || 0) + (freeReady() ? 1 : 0); }
function buildFace(size, dpr) {
  const fc = document.createElement('canvas');
  fc.width = fc.height = Math.round(size * dpr);
  const c = fc.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const R = size / 2 - 8;
  c.translate(size / 2, size / 2);
  c.lineWidth = 3; c.strokeStyle = '#1B1029'; c.lineJoin = 'round';
  for (const s of segs) {
    c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, R, s.a0, s.a1); c.closePath();
    c.fillStyle = s.color; c.fill(); c.stroke();
    const g = c.createRadialGradient(0, 0, R * 0.2, 0, 0, R);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,.18)');
    c.fillStyle = g; c.fill();
    c.save(); c.rotate((s.a0 + s.a1) / 2);
    c.textAlign = 'right'; c.textBaseline = 'middle';
    c.font = `400 ${Math.max(11, R * 0.085)}px ${api.font}`;
    c.lineWidth = 4; c.strokeStyle = '#1B1029'; c.strokeText(s.label, R - 12, -6); c.fillStyle = '#fff'; c.fillText(s.label, R - 12, -6);
    c.font = `700 ${Math.max(9, R * 0.055)}px ${api.mono}`;
    c.lineWidth = 3; c.strokeText(s.sub, R - 12, R * 0.07); c.fillStyle = '#FFF6CC'; c.fillText(s.sub, R - 12, R * 0.07);
    c.restore();
  }
  return fc;
}
function drawWheel() {
  const cv = $('wheelCv'); if (!cv) return;
  if (!wheelSize) wheelSize = cv.clientWidth || 360;
  const dpr = Math.min(2, devicePixelRatio || 1), size = wheelSize;
  if (cv.width !== Math.round(size * dpr)) { cv.width = cv.height = Math.round(size * dpr); }
  if (faceKey !== size + ':' + dpr) { face = buildFace(size, dpr); faceKey = size + ':' + dpr; const k = faceKey; DT.bitmap(face, b => { if (faceKey === k) face = b; }); }
  const c = cv.getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const R = size / 2 - 8, cx = size / 2, cy = size / 2;
  c.save(); c.translate(cx, cy); c.rotate(wRot);
  c.drawImage(face, -size / 2, -size / 2, size, size);
  c.strokeStyle = '#1B1029';
  // ampoules sur le bord
  for (let k = 0; k < 24; k++) {
    const a = k / 24 * Math.PI * 2, on = Math.floor(now() / 180 + k) % 2 === 0;
    c.fillStyle = on ? '#FFF6B0' : '#FF9F1C';
    c.beginPath(); c.arc(Math.cos(a) * (R + 1), Math.sin(a) * (R + 1), 4.5, 0, 7); c.fill(); c.lineWidth = 1.5; c.stroke();
  }
  c.restore();
  c.lineWidth = 4; c.strokeStyle = '#1B1029';
  c.beginPath(); c.arc(cx, cy, R + 6, 0, 7); c.stroke();
  // moyeu
  const hub = c.createRadialGradient(cx - 8, cy - 8, 2, cx, cy, R * 0.2);
  hub.addColorStop(0, '#FFF1A8'); hub.addColorStop(1, '#FFB800');
  c.fillStyle = hub; c.beginPath(); c.arc(cx, cy, R * 0.17, 0, 7); c.fill(); c.stroke();
  c.fillStyle = '#1B1029'; c.font = `400 ${R * 0.08}px ${api.font}`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('DOPA', cx, cy + 1);
}
function segAtPointer() {
  let a = (-Math.PI / 2 - wRot) % (Math.PI * 2); if (a < 0) a += Math.PI * 2;
  return segs.findIndex(s => a >= s.a0 && a < s.a1);
}
function openWheel() {
  $('wheelModal').hidden = false; wheelSize = 0; $('wheelRes').textContent = ''; $('wheelRes').style.color = '';
  refreshWheelUI(); drawWheel();
  api.A.click();
}
function refreshWheelUI() {
  const S = api.S, b = $('wheelSpin');
  const n = spinsAvail();
  if (b) {
    DT.setDisabled(b, !!spin || n <= 0);
    DT.setText(b, spin ? 'Ça tourne…' : freeReady() ? 'LANCER (gratuit)' : n > 0 ? `LANCER (${n} tour${n > 1 ? 's' : ''})` : 'Plus de tours');
  }
  const left = Math.max(0, (S.nextFree || 0) - now());
  const next = freeReady() ? 'Tour gratuit disponible !' : `Prochain tour gratuit dans ${Math.floor(left / 60000)}:${String(Math.floor(left % 60000 / 1000)).padStart(2, '0')}`;
  DT.setText($('wheelNext'), next);
  const badge = $('wheelBadge'), btn = $('wheelBtn');
  if (badge) { DT.setText(badge, n); DT.setHidden(badge, n <= 0); }
  if (btn && btn.classList.contains('ready') !== n > 0) btn.classList.toggle('ready', n > 0);
}
function doSpin() {
  const S = api.S;
  if (spin || spinsAvail() <= 0) return;
  if (freeReady()) S.nextFree = now() + FREE_EVERY; else S.spins--;
  S.spinsDone = (S.spinsDone || 0) + 1;
  // tirage pondéré
  let x = Math.random() * TOTAL_W, idx = 0;
  for (let i = 0; i < WHEEL.length; i++) { x -= WHEEL[i].w; if (x <= 0) { idx = i; break; } }
  const s = segs[idx];
  const inside = s.a0 + (s.a1 - s.a0) * rand(0.2, 0.8);
  let target = -Math.PI / 2 - inside;
  const base = wRot + Math.PI * 2 * 6;
  target += Math.ceil((base - target) / (Math.PI * 2)) * Math.PI * 2;
  spin = {from: wRot, to: target, t: 0, dur: rand(4.2, 5.2), idx, last: segAtPointer()};
  $('wheelRes').textContent = '';
  refreshWheelUI();
  api.A.click();
  quest('spin', 1);
}
function wheelTick(dt) {
  dt = Math.min(dt, 0.05);  // un à-coup ne fait plus sauter la roue
  if ($('wheelModal').hidden) { uiClock += dt; if (uiClock > 0.5) { uiClock = 0; refreshWheelUI(); } return; }
  if (spin) {
    spin.t = Math.min(1, spin.t + dt / spin.dur);
    const e = 1 - Math.pow(1 - spin.t, 4);
    wRot = spin.from + (spin.to - spin.from) * e;
    const cur = segAtPointer();
    if (cur !== spin.last) {
      spin.last = cur; api.A.wheelTick();
      $('wheelPin').animate([{transform: 'translateX(-50%) rotate(0)'}, {transform: 'translateX(-50%) rotate(-22deg)', offset: 0.4}, {transform: 'translateX(-50%) rotate(0)'}], {duration: 120, easing: 'ease-out'});
    }
    if (spin.t >= 1) {
      const s = WHEEL[spin.idx]; spin = null;
      const msg = s.fx();
      const res = $('wheelRes'); res.textContent = msg; res.style.color = s.color;
      res.animate([{transform: 'scale(1.6)'}, {transform: 'scale(1)'}], {duration: 350, easing: 'cubic-bezier(.2,1.6,.4,1)'});
      if (s.jackpot) {
        api.S.jackpots = (api.S.jackpots || 0) + 1;
        api.A.jackpot(); api.banner('', 'JACKPOT', msg); api.shake(document.body); api.flash('#FFD23F');
        api.confetti(innerWidth / 2, innerHeight * 0.3, 160);
        api.addFeed(`<b>JACKPOT</b> à la roue : ${esc(msg)}`);
      } else if (s.label === 'RATÉ !') { api.A.denied(); }
      else { api.A.upgrade(); api.confetti(innerWidth / 2, innerHeight * 0.4, 40); }
      api.onChange();
    }
  }
  refreshWheelUI();
  drawWheel();
}

/* ======================= Quêtes ======================= */
const QTYPES = [
  {t: 'crush',  label: n => `Écraser ${n} objets`,                min: 15,  max: 40},
  {t: 'tap',    label: n => `Taper ${n} fois`,                    min: 150, max: 500},
  {t: 'popit',  label: n => `Terminer ${n} pop-it`,               min: 2,   max: 5},
  {t: 'col',    label: n => `Finir ${n} colonnes de pop-it`,      min: 6,   max: 16},
  {t: 'combo',  label: n => `Faire un combo de ${n}`,             min: 25,  max: 70, best: true},
  {t: 'golden', label: n => `Attraper ${n} notification${n > 1 ? 's' : ''} dorée${n > 1 ? 's' : ''}`, min: 1, max: 3},
  {t: 'buy',    label: n => `Acheter ${n} mécaniques`,            min: 10,  max: 40},
  {t: 'chest',  label: n => `Ouvrir ${n} coffre${n > 1 ? 's' : ''}`, min: 1, max: 3},
  {t: 'fever',  label: n => n > 1 ? `Déclencher ${n} fois le mode Hype` : 'Déclencher le mode Hype', min: 1, max: 2},
  {t: 'crit',   label: n => `Réussir ${n} taps critiques`,        min: 5,   max: 15},
  {t: 'spin',   label: n => `Tourner la roue ${n} fois`,          min: 1,   max: 2},
  {t: 'boss',   label: () => 'Terrasser un boss',                 min: 1,   max: 1},
  {t: 'slot',   label: n => `Jouer ${n} fois au bandit manchot`,  min: 3,   max: 6},
  {t: 'scratch', label: n => `Gratter ${n} ticket${n > 1 ? 's' : ''}`, min: 1, max: 2},
  {t: 'drops',  label: n => `Attraper ${n} gouttes de dopamine`,  min: 15,  max: 40},
  {t: 'casino', label: n => `Jouer ${n} parties au casino`,      min: 5,   max: 12},
  {t: 'duel',   label: () => 'Défier un pote en duel',           min: 1,   max: 1, friends: true},
];
const REWARDS = [
  {kind: 'chest', type: 'wood',  label: 'Coffre en bois', w: 30},
  {kind: 'chest', type: 'gold',  label: 'Coffre doré',    w: 25},
  {kind: 'spins', n: 2,          label: '2 tours de roue', w: 22},
  {kind: 'time',  sec: 900,      label: '15 min de prod', w: 15},
  {kind: 'chest', type: 'magic', label: 'Coffre magique', w: 8},
  {kind: 'ticket',               label: 'Ticket à gratter', w: 15},
];
function newQuest(exclude) {
  const pool = QTYPES.filter(q => !exclude.includes(q.t) && (!q.friends || (api.hasFriends && api.hasFriends())));
  const q = pool[Math.floor(Math.random() * pool.length)];
  const lvlBoost = 1 + Math.min(1.5, ((api.S.lvl || 1) - 1) * 0.03);
  const n = q.best ? Math.round(rand(q.min, q.max)) : Math.max(1, Math.round(rand(q.min, q.max) * (q.max > 5 ? lvlBoost : 1)));
  let x = Math.random() * REWARDS.reduce((a, r) => a + r.w, 0), reward = REWARDS[0];
  for (const r of REWARDS) { x -= r.w; if (x <= 0) { reward = r; break; } }
  return {t: q.t, n, p: 0, done: false, reward, fresh: true};
}
function ensureQuests() {
  const S = api.S;
  S.quests = (S.quests || []).filter(q => QTYPES.some(t => t.t === q.t));
  while (S.quests.length < 3) S.quests.push(newQuest(S.quests.map(q => q.t)));
}
function quest(t, amount) {
  const S = api.S;
  if (!S.quests) return;
  let changed = false;
  for (const q of S.quests) {
    if (q.t !== t || q.done) continue;
    const def = QTYPES.find(d => d.t === t);
    q.p = def.best ? Math.max(q.p, amount) : q.p + amount;
    if (q.p >= q.n) {
      q.p = q.n; q.done = true;
      api.A.questDone();
      api.toast(`Quête terminée : <b>${esc(def.label(q.n))}</b>. Récupère ta récompense !`, 'mint');
      questsDirty = true; qClock = 1;
    }
    changed = true;
  }
  if (changed) questsDirty = true;
}
function claim(i, btn) {
  const S = api.S, q = S.quests[i];
  if (!q || !q.done) return;
  const r = q.reward;
  if (r.kind === 'chest') api.give(r.type, 'quête');
  else if (r.kind === 'spins') { S.spins = (S.spins || 0) + r.n; api.toast(`+${r.n} tours de roue !`); }
  else if (r.kind === 'ticket') { S.tickets = (S.tickets || 0) + 1; api.toast('+1 ticket à gratter !'); }
  else { const g = api.gainTime(r.sec); api.toast(`+${api.fmt(g)} nmol !`); }
  S.questsDone = (S.questsDone || 0) + 1;
  api.A.upgrade(); api.addXp(12);
  const b = btn.getBoundingClientRect();
  api.confetti(b.left + b.width / 2, b.top, 30);
  if (r.kind === 'time') api.flyTo(b.left + b.width / 2, b.top, $('bank'), 14);
  S.quests.splice(i, 1);
  renderQuests(true);
  setTimeout(() => { ensureQuests(); renderQuests(true); }, 500);
}
function renderQuests(full = true) {
  const S = api.S, box = $('quests');
  if (!box || !S.quests) return;
  if (!full && box.children.length === S.quests.length) {
    S.quests.forEach((q, i) => {
      const el = box.children[i];
      el.querySelector('i').style.width = `${q.p / q.n * 100}%`;
      el.querySelector('.qp').textContent = `${Math.floor(q.p)}/${q.n}`;
      el.classList.toggle('done', q.done);
      el.querySelector('button').hidden = !q.done;
    });
    return;
  }
  box.innerHTML = S.quests.map((q, i) => {
    const def = QTYPES.find(d => d.t === q.t);
    return `<li class="quest${q.done ? ' done' : ''}${q.fresh ? ' fresh' : ''}">
      <div class="qh"><span>${esc(def.label(q.n))}</span><span class="qp">${Math.floor(q.p)}/${q.n}</span></div>
      <div class="qbar"><i style="width:${q.p / q.n * 100}%"></i></div>
      <div class="qr"><span>Récompense : <b>${esc(q.reward.label)}</b></span><button type="button" class="qclaim" data-i="${i}" ${q.done ? '' : 'hidden'}>RÉCUPÉRER</button></div>
    </li>`;
  }).join('');
  S.quests.forEach(q => { q.fresh = false; });
}

/* ======================= Cadeau quotidien ======================= */
const DAILY = [
  {label: 'Coffre en bois', fx: () => api.give('wood', 'cadeau du jour')},
  {label: '2 tours de roue', fx: () => { api.S.spins = (api.S.spins || 0) + 2; }},
  {label: 'Coffre doré', fx: () => api.give('gold', 'cadeau du jour')},
  {label: '3 tours de roue', fx: () => { api.S.spins = (api.S.spins || 0) + 3; }},
  {label: 'Coffre magique', fx: () => api.give('magic', 'cadeau du jour')},
  {label: '5 tours de roue', fx: () => { api.S.spins = (api.S.spins || 0) + 5; }},
  {label: 'Coffre légendaire', fx: () => api.give('legend', 'cadeau du jour')},
];
const dayStr = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
let dailyPending = false;
function checkDaily() {
  const S = api.S, today = dayStr(new Date(now()));
  S.daily = S.daily || {last: null, streak: 0};
  dailyPending = S.daily.last !== today;
}
function showDaily() {
  const S = api.S, today = new Date(now()), y = new Date(today); y.setDate(y.getDate() - 1);
  const streak = S.daily.last === dayStr(y) ? S.daily.streak + 1 : 1;
  const k = (streak - 1) % 7;
  $('dailyStreak').textContent = streak > 1 ? `Série de ${streak} jours d'affilée !` : 'Reviens chaque jour pour de meilleures récompenses.';
  $('dailyDays').innerHTML = DAILY.map((d, i) => {
    const art = d.label.startsWith('Coffre') ? DT.chestSVG({'Coffre en bois': 'wood', 'Coffre doré': 'gold', 'Coffre magique': 'magic', 'Coffre légendaire': 'legend'}[d.label]) : `<b class="dspin">${d.label.split(' ')[0]}×</b>`;
    return `<div class="dday${i < k ? ' past' : ''}${i === k ? ' today' : ''}"><small>Jour ${i + 1}</small><div class="dart">${art}</div><span>${d.label}</span></div>`;
  }).join('');
  $('dailyModal').hidden = false;
  $('dailyClaim').onclick = () => {
    DAILY[k].fx();
    S.daily = {last: dayStr(new Date(now())), streak};
    S.dailyBest = Math.max(S.dailyBest || 0, streak);
    $('dailyModal').hidden = true; dailyPending = false;
    api.A.jackpot(); api.confetti(innerWidth / 2, innerHeight / 2, 80);
    api.toast(`Cadeau du jour ${k + 1} : <b>${DAILY[k].label}</b> !`);
    api.onChange(); api.save();
  };
  api.A.daily();
}

/* ======================= Boucle et branchement ======================= */
let questsDirty = false, qClock = 0;
function tick(dt) {
  qClock += dt;
  if (questsDirty && qClock > 0.25) { qClock = 0; questsDirty = false; renderQuests(false); }
  feverTick(dt);
  wheelTick(dt);
  if (dailyPending && !api.modalOpen() && DT.clock.trusted) { checkDaily(); if (!dailyPending) return; dailyPending = false; setTimeout(showDaily, 600); }
}
function enter() {
  const S = api.S;
  if (S.nextFree == null) S.nextFree = now();
  ensureQuests(); renderQuests(true); checkDaily(); refreshWheelUI();
}
function init(a) {
  api = a;
  $('wheelBtn').addEventListener('click', openWheel);
  $('wheelSpin').addEventListener('click', doSpin);
  $('wheelClose').addEventListener('click', () => { if (!spin) $('wheelModal').hidden = true; });
  $('quests').addEventListener('click', e => { const b = e.target.closest('.qclaim'); if (b) claim(+b.dataset.i, b); });
}

DT.Extras = {init, enter, tick, feverAdd, feverOn, quest, startFever, get spinning() { return !!spin; }};

})(window.DT);
