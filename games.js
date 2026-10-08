/* Dopamine Tycoon : salle de jeux (bandit manchot, tickets à gratter), pluie de dopamine et duels entre potes. */
window.DT = window.DT || {};
(function (DT) {
'use strict';

const $ = id => document.getElementById(id);
const now = () => DT.now();
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const newId = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), x => x.toString(16).padStart(2, '0')).join('');
let api = null;
const Q = (t, n) => DT.Extras && DT.Extras.quest(t, n);

/* ======================= Bandit manchot ======================= */
const SYMS = [
  {id: 'wave',      w: 22, mult: 5},
  {id: 'knight',    w: 20, mult: 5},
  {id: 'barbarian', w: 16, mult: 8},
  {id: 'moon',      w: 13, mult: 10},
  {id: 'yuno',      w: 10, mult: 15},
  {id: 'giant',     w: 8,  mult: 25},
  {id: 'chad',      w: 6,  mult: 50},
  {id: 'comrade',   w: 5,  mult: 100, jackpot: true},
];
const SYM_W = SYMS.reduce((a, s) => a + s.w, 0);
const BETS = [{label: '1 min', sec: 60}, {label: '10 min', sec: 600}, {label: '1 h', sec: 3600}];
let bet = 0, slotBusy = false;
const rollSym = () => { let x = Math.random() * SYM_W; for (const s of SYMS) { x -= s.w; if (x <= 0) return s; } return SYMS[0]; };
const betAmount = () => Math.max(10, Math.round(api.unit() * BETS[bet].sec));
const symHTML = s => `<div class="sym">${DT.cardArt(s.id)}</div>`;

function openSlot() {
  $('slotModal').hidden = false;
  $('slotRes').textContent = ''; $('slotRes').className = 'slot-res';
  $('slotBets').innerHTML = BETS.map((b, i) => `<button type="button" data-i="${i}" aria-pressed="${i === bet}">${b.label}</button>`).join('');
  $('slotPay').innerHTML = SYMS.slice().reverse().map(s => `<div class="pay"><span>${DT.cardArt(s.id)}${DT.cardArt(s.id)}${DT.cardArt(s.id)}</span><b>×${s.mult}</b></div>`).join('') +
    `<div class="pay"><span class="two">2 identiques</span><b>×2</b></div>`;
  document.querySelectorAll('#slotReels .strip').forEach(st => { if (!st.children.length) st.innerHTML = symHTML(rollSym()) + symHTML(rollSym()) + symHTML(rollSym()); });
  refreshSlot();
  api.A.click();
}
function refreshSlot() {
  const a = betAmount();
  DT.setText($('slotSpin'), slotBusy ? 'Ça tourne…' : `JOUER ${api.fmt(a)} nmol`);
  DT.setDisabled($('slotSpin'), slotBusy || api.S.bank < a);
}
function spinSlot() {
  if (slotBusy) return;
  const a = betAmount();
  if (api.S.bank < a) { api.A.denied(); return; }
  api.spend(a);
  slotBusy = true; refreshSlot();
  $('slotRes').textContent = ''; $('slotRes').className = 'slot-res';
  $('slotMachine').classList.remove('win', 'jack');
  let res;
  if (Math.random() < 0.7) {
    const s = rollSym();
    if (Math.random() < 0.2) res = [s, s, s];
    else { let o; do { o = rollSym(); } while (o.id === s.id); res = [s, s, o].sort(() => Math.random() - 0.5); }
  } else {
    const a = rollSym(); let b, c;
    do { b = rollSym(); } while (b.id === a.id);
    do { c = rollSym(); } while (c.id === a.id || c.id === b.id);
    res = [a, b, c];
  }
  const reels = [...document.querySelectorAll('#slotReels .strip')];
  const H = reels[0].parentElement.clientHeight / 3;
  let stopped = 0;
  const ticker = setInterval(() => api.A.wheelTick(), 70);
  reels.forEach((st, i) => {
    const n = 26 + i * 8;
    const syms = Array.from({length: n}, () => rollSym());
    syms[n - 2] = res[i];
    st.innerHTML = syms.map(symHTML).join('');
    const anim = st.animate([{transform: 'translateY(0)'}, {transform: `translateY(${-(n - 3) * H}px)`}],
      {duration: 1100 + i * 500, easing: 'cubic-bezier(.15,.85,.35,1.06)', fill: 'forwards'});
    anim.onfinish = () => {
      api.A.slam(0);
      st.parentElement.animate([{transform: 'translateY(6px)'}, {transform: 'translateY(0)'}], {duration: 160});
      if (++stopped === 3) { clearInterval(ticker); endSlot(res, a); }
    };
  });
  api.A.click();
  Q('slot', 1);
  api.S.slotSpins = (api.S.slotSpins || 0) + 1;
}
function endSlot(res, a) {
  slotBusy = false;
  let mult = 0, sym = null;
  if (res[0].id === res[1].id && res[1].id === res[2].id) { mult = res[0].mult; sym = res[0]; }
  else if (res[0].id === res[1].id || res[1].id === res[2].id || res[0].id === res[2].id) mult = 2;
  const r = $('slotRes'), m = $('slotMachine');
  if (mult) {
    const win = a * mult;
    api.gain(win);
    api.S.slotBest = Math.max(api.S.slotBest || 0, mult);
    r.textContent = `${sym ? 'TRIPLE ! ' : ''}×${mult} : +${api.fmt(win)} nmol`;
    r.className = 'slot-res good';
    m.classList.add('win');
    const b = m.getBoundingClientRect();
    api.flyTo(b.left + b.width / 2, b.top + b.height / 2, $('bank'), Math.min(30, 6 + mult));
    if (sym && sym.jackpot) {
      api.S.slotJackpots = (api.S.slotJackpots || 0) + 1;
      m.classList.add('jack');
      api.A.jackpot(); api.banner('', '777', `JACKPOT ×100 : +${api.fmt(win)} nmol`);
      api.shake(document.body); api.flash('#FFD23F'); api.confetti(innerWidth / 2, innerHeight * 0.3, 180);
      api.addFeed(`<b>777</b> au bandit manchot : +${api.fmt(win)} nmol !`);
    } else if (mult >= 15) {
      api.A.jackpot(); api.banner('GROS GAIN', `×${mult}`, `+${api.fmt(win)} nmol`); api.confetti(innerWidth / 2, innerHeight * 0.35, 100);
    } else { api.A.upgrade(); api.confetti(b.left + b.width / 2, b.top, 30); }
  } else {
    r.textContent = pick(['Perdu ! La maison gagne toujours.', 'Raté… encore un petit ?', 'Presque ! (non)']);
    api.A.denied();
  }
  refreshSlot(); api.onChange();
}

/* ======================= Tickets à gratter ======================= */
const SCRATCH = [
  {id: 'comrade', label: 'Coffre légendaire', w: 4,  fx: () => api.give('legend', 'ticket gagnant')},
  {id: 'chad',    label: 'Coffre magique',    w: 10, fx: () => api.give('magic', 'ticket gagnant')},
  {id: 'giant',   label: 'Coffre doré',       w: 20, fx: () => api.give('gold', 'ticket gagnant')},
  {id: 'yuno',    label: '3 tours de roue',   w: 22, fx: () => { api.S.spins = (api.S.spins || 0) + 3; }},
  {id: 'moon',    label: '20 min de prod',    w: 22, fx: () => api.gainTime(1200)},
  {id: 'wave',    label: 'Coffre en bois',    w: 22, fx: () => api.give('wood', 'ticket gagnant')},
];
let scratch = null;
function buyTicket() {
  const price = Math.max(50, Math.round(api.unit() * 300));
  if (api.S.bank < price) { api.A.denied(); api.toast(`Il te faut ${api.fmt(price)} nmol pour un ticket.`); return; }
  api.spend(price); api.S.tickets = (api.S.tickets || 0) + 1; api.A.buy();
  api.toast('<b>+1 ticket à gratter.</b>'); api.onChange();
}
function openScratch() {
  const S = api.S;
  if (!(S.tickets > 0)) { api.toast("Tu n'as pas de ticket. Monte de niveau, bats un boss ou achète-en un."); api.A.denied(); return; }
  S.tickets--;
  S.scratched = (S.scratched || 0) + 1;
  // tirage décidé d'avance, puis on dispose la grille
  const win = Math.random() < 0.7;
  let prize = null, cells = [];
  const counts = {};
  if (win) {
    let x = Math.random() * SCRATCH.reduce((a, s) => a + s.w, 0);
    for (const s of SCRATCH) { x -= s.w; if (x <= 0) { prize = s; break; } }
    prize = prize || SCRATCH[5];
    cells = [prize, prize, prize]; counts[prize.id] = 3;
  }
  while (cells.length < 9) {
    const s = pick(SCRATCH);
    if ((counts[s.id] || 0) >= 2 && !(prize && s.id === prize.id)) continue;
    if (prize && s.id === prize.id) continue;
    counts[s.id] = (counts[s.id] || 0) + 1; cells.push(s);
  }
  cells.sort(() => Math.random() - 0.5);
  scratch = {prize, done: false, moves: 0, lastSnd: 0};
  $('scratchLegend').innerHTML = SCRATCH.map(s => `<span class="chip">${DT.cardArt(s.id)}<b>${s.label}</b></span>`).join('');
  $('scratchGrid').innerHTML = cells.map(s => `<div class="sc" data-id="${s.id}">${DT.cardArt(s.id)}</div>`).join('');
  $('scratchRes').textContent = 'Gratte avec la souris !'; $('scratchRes').className = 'slot-res';
  $('scratchDone').hidden = true;
  $('scratchModal').hidden = false;
  paintFoil();
  Q('scratch', 1);
  api.onChange();
}
function paintFoil() {
  const cv = $('scratchCv'), box = cv.parentElement.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = Math.round(box.width * dpr); cv.height = Math.round(box.height * dpr);
  const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.globalCompositeOperation = 'source-over';
  const g = c.createLinearGradient(0, 0, box.width, box.height);
  g.addColorStop(0, '#C9D2DE'); g.addColorStop(0.35, '#F4F7FB'); g.addColorStop(0.6, '#AAB5C4'); g.addColorStop(1, '#E3E8EF');
  c.fillStyle = g; c.fillRect(0, 0, box.width, box.height);
  c.fillStyle = 'rgba(27,16,41,.12)';
  for (let i = 0; i < 260; i++) c.fillRect(Math.random() * box.width, Math.random() * box.height, 2, 2);
  c.save(); c.translate(box.width / 2, box.height / 2); c.rotate(-0.2);
  c.font = `400 ${Math.max(18, box.width * 0.08)}px ${api.font}`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = 'rgba(27,16,41,.35)';
  for (let y = -2; y <= 2; y++) c.fillText('GRATTE ICI', 0, y * box.height * 0.22);
  c.restore();
}
function scratchAt(e) {
  if (!scratch || scratch.done) return;
  const cv = $('scratchCv'), r = cv.getBoundingClientRect();
  const c = cv.getContext('2d');
  c.globalCompositeOperation = 'destination-out';
  c.fillStyle = '#000';
  c.beginPath(); c.arc(e.clientX - r.left, e.clientY - r.top, Math.max(16, r.width * 0.055), 0, Math.PI * 2); c.fill();
  if (now() - scratch.lastSnd > 70) { scratch.lastSnd = now(); api.A.scratch(); }
  if (++scratch.moves % 10 === 0) checkScratch();
}
function checkScratch() {
  const cv = $('scratchCv'), c = cv.getContext('2d');
  const d = c.getImageData(0, 0, cv.width, cv.height).data;
  let clear = 0, tot = 0;
  for (let i = 3; i < d.length; i += 4 * 97) { tot++; if (d[i] === 0) clear++; }
  if (clear / tot > 0.55) revealScratch();
}
function revealScratch() {
  if (!scratch || scratch.done) return;
  scratch.done = true;
  const cv = $('scratchCv');
  cv.animate([{opacity: 1}, {opacity: 0}], {duration: 400, fill: 'forwards'});
  const r = $('scratchRes');
  if (scratch.prize) {
    api.S.scratchWins = (api.S.scratchWins || 0) + 1;
    document.querySelectorAll('#scratchGrid .sc').forEach(el => { if (el.dataset.id === scratch.prize.id) el.classList.add('hit'); });
    scratch.prize.fx();
    r.textContent = `GAGNÉ : ${scratch.prize.label} !`; r.className = 'slot-res good';
    api.A.jackpot(); api.confetti(innerWidth / 2, innerHeight * 0.4, 90);
  } else {
    r.textContent = 'Perdu… Le prochain sera le bon.'; api.A.denied();
  }
  $('scratchDone').hidden = false;
  api.onChange(); api.save();
}

/* ======================= Pluie de dopamine ======================= */
let rainIn = rand(200, 320), rain = null;
function startRain() {
  if (rain) return;
  rain = {t: 0, spawn: 0, caught: 0, total: 0};
  api.banner('PLUIE', 'DE DOPAMINE', 'Attrape tout ce qui tombe !');
  api.A.fever();
  $('rainLayer').hidden = false;
}
function spawnDrop() {
  const meme = Math.random() < 0.2;
  const owned = Object.keys(api.S.cards || {});
  const el = document.createElement('button');
  el.type = 'button'; el.className = 'drop' + (meme ? ' meme-drop' : '');
  el.innerHTML = meme ? DT.cardArt(owned.length ? pick(owned) : 'wave') : '<span>DOPA</span>';
  const size = meme ? rand(64, 84) : rand(40, 56);
  el.style.width = el.style.height = size + 'px';
  el.style.left = rand(2, 94) + 'vw';
  const dur = rand(2.2, 3.6);
  el.style.animationDuration = dur + 's';
  el.addEventListener('pointerdown', e => {
    e.stopPropagation();
    if (el.dataset.got) return;
    el.dataset.got = '1';
    const v = api.unit() * (meme ? 75 : 15);
    api.gain(v); rain.caught++;
    api.A.pop(); api.burst(e.clientX, e.clientY, meme ? '#FF4F79' : '#FFD23F', 14, 260);
    const f = document.createElement('span'); f.className = 'drop-float'; f.textContent = '+' + api.fmt(v);
    f.style.left = e.clientX + 'px'; f.style.top = e.clientY + 'px';
    document.body.appendChild(f); setTimeout(() => f.remove(), 900);
    el.remove();
  });
  $('rainLayer').appendChild(el);
  setTimeout(() => el.remove(), dur * 1000 + 100);
  rain.total++;
}
function rainTick(dt) {
  if (!rain) {
    if (!api.modalOpen() && !api.S.paused && dt < 5 && !document.hidden) { rainIn -= dt; if (rainIn <= 0) startRain(); }
    return;
  }
  rain.t += dt;
  if (rain.t < 8) {
    rain.spawn += dt;
    while (rain.spawn > 0.14) { rain.spawn -= 0.14; spawnDrop(); }
  } else if (rain.t > 11.5) {
    const n = rain.caught;
    api.S.drops = (api.S.drops || 0) + n;
    api.S.bestRain = Math.max(api.S.bestRain || 0, n);
    Q('drops', n);
    api.toast(`Pluie terminée : tu as attrapé <b>${n} goutte${n > 1 ? 's' : ''}</b> sur ${rain.total}.`, 'mint');
    $('rainLayer').hidden = true; $('rainLayer').innerHTML = '';
    rain = null; rainIn = rand(360, 600);
    api.onChange();
  }
}

/* ======================= Duels de taps ======================= */
const RACE_SECS = 10;
let race = null;
function startRace(opts) {
  if (race) return;
  race = {...opts, taps: 0, phase: 'count', t: 3};
  $('raceTitle').textContent = opts.mode === 'answer' ? `Défi de ${opts.name}` : `Duel contre ${opts.name}`;
  $('raceGoal').textContent = opts.mode === 'answer' ? `Score à battre : ${opts.target} taps en ${RACE_SECS} s` : `Fais le meilleur score en ${RACE_SECS} s. ${opts.name} devra le battre.`;
  $('raceCount').textContent = '3'; $('raceBar').style.width = '100%';
  $('raceBtn').innerHTML = DT.cardArt(opts.mode === 'answer' ? 'giant' : 'chad') + '<b>TAPE !</b>';
  $('raceBtn').disabled = true; $('raceEnd').hidden = true; $('raceRes').textContent = '';
  $('raceModal').hidden = false;
  api.A.boss();
}
// Un humain tape au plus ~15 fois par seconde : au-delà de 20/s c'est un autoclic, le tap ne compte pas.
const RACE_MAX = 20 * RACE_SECS;
let raceTokens = 12, raceAt = 0;
function raceTap(e) {
  if (e) e.preventDefault();
  if (e && e.repeat) return;  // touche maintenue enfoncée
  if (!race || race.phase !== 'go') return;
  const t = performance.now();
  raceTokens = Math.min(12, raceTokens + (t - raceAt) / 1000 * 20); raceAt = t;
  if (raceTokens < 1) return;
  raceTokens--;
  race.taps++;
  $('raceCount').textContent = race.taps;
  api.A.tap(Math.min(race.taps, 19));
  const b = $('raceBtn');
  b.animate([{transform: 'scale(.9) rotate(-3deg)'}, {transform: 'scale(1)'}], {duration: 120});
  const r = b.getBoundingClientRect();
  api.burst(r.left + r.width / 2 + rand(-40, 40), r.top + r.height / 2 + rand(-40, 40), pick(['#FF4F79', '#FFD23F', '#5FE0B7', '#4FD8FF']), 6, 200);
}
function raceTick(dt) {
  if (!race) return;
  if (race.phase === 'count') {
    const before = Math.ceil(race.t);
    race.t -= dt;
    const after = Math.ceil(race.t);
    if (after !== before && after > 0) { $('raceCount').textContent = after; api.A.click(); }
    if (race.t <= 0) { race.phase = 'go'; race.t = RACE_SECS; $('raceCount').textContent = 'GO !'; $('raceBtn').disabled = false; api.A.upgrade(); }
  } else if (race.phase === 'go') {
    race.t -= dt;
    $('raceBar').style.width = Math.max(0, race.t / RACE_SECS * 100) + '%';
    if (race.t <= 0) endRace();
  }
}
function endRace() {
  const S = api.S, R = race;
  R.phase = 'end';
  $('raceBtn').disabled = true;
  S.duels = S.duels || {out: {}, in: {}};
  if (R.mode === 'challenge') {
    const id = newId();
    S.duels.out[id] = {to: R.key, name: R.name, score: R.taps, t: now(), status: 'sent'};
    S.duelsSent = (S.duelsSent || 0) + 1;
    api.publishDuel({id, to: R.key, k: 'c', s: R.taps});
    $('raceRes').innerHTML = `<b>${R.taps} taps !</b> Défi envoyé à ${esc(R.name)}. Tu seras prévenu quand il l'aura relevé.`;
    api.addFeed(`Tu défies <b>${esc(R.name)}</b> : ${R.taps} taps en ${RACE_SECS} s.`);
    Q('duel', 1);
    api.A.upgrade();
  } else {
    const d = S.duels.in[R.id];
    const win = R.taps > R.target, tie = R.taps === R.target;
    if (d) { d.status = 'done'; d.mine = R.taps; }
    api.publishDuel({id: R.id, to: R.key, k: 'r', s: R.taps, w: win ? 1 : tie ? 2 : 0});
    if (win) {
      S.duelsWon = (S.duelsWon || 0) + 1;
      $('raceRes').innerHTML = `<b>VICTOIRE !</b> ${R.taps} contre ${R.target}. Coffre doré gagné.`;
      api.give('gold', 'duel gagné'); api.A.jackpot(); api.banner('DUEL', 'VICTOIRE', `${R.taps} contre ${R.target}`);
      api.confetti(innerWidth / 2, innerHeight * 0.4, 120); api.flash('#5FE0B7');
    } else if (tie) {
      $('raceRes').innerHTML = `<b>ÉGALITÉ !</b> ${R.taps} partout. Coffre en bois de consolation.`;
      api.give('wood', 'duel à égalité');
    } else {
      $('raceRes').innerHTML = `<b>DÉFAITE…</b> ${R.taps} contre ${R.target}. ${esc(R.name)} garde le titre.`;
      api.A.denied();
    }
    api.addFeed(`Duel contre <b>${esc(R.name)}</b> : ${R.taps} contre ${R.target}, ${win ? 'gagné' : tie ? 'égalité' : 'perdu'}.`);
  }
  $('raceEnd').hidden = false;
  renderDuels(); api.onChange(); api.save();
}
function closeRace() { $('raceModal').hidden = true; race = null; }

/* Messages de duel reçus (déjà vérifiés et signés par net.js). */
function onDuelMsg(m, me) {
  const d = m.dl, S = api.S;
  if (!d || !me || d.to !== me.key) return;
  S.duels = S.duels || {out: {}, in: {}};
  S.duelSeen = S.duelSeen || [];
  const tag = d.k + d.id;
  if (S.duelSeen.includes(tag)) return;
  S.duelSeen.push(tag); if (S.duelSeen.length > 80) S.duelSeen.shift();
  if (now() - m.t > 12 * 3600e3) return;
  if (d.k === 'c') {
    // Un score de défi impossible (autoclic) est ignoré ; et pas plus de 3 défis en attente par joueur.
    if (d.s > RACE_MAX) return;
    const pend = Object.values(S.duels.in).filter(x => x.from === m.key && x.status === 'new').length;
    if (pend >= 3) return;
    for (const [id, x] of Object.entries(S.duels.in)) if (now() - x.t > 3 * 86400e3) delete S.duels.in[id];
    S.duels.in[d.id] = {from: m.key, name: m.name, score: d.s, t: m.t, status: 'new'};
    api.toast(`<b>${esc(m.name)}</b> te défie ! Score à battre : <b>${d.s} taps</b>. Va dans Quêtes pour relever le défi.`, 'coral');
    api.A.boss(); api.addFeed(`<b>${esc(m.name)}</b> te lance un défi : ${d.s} taps en ${RACE_SECS} s.`, m.t);
  } else if (d.k === 'r') {
    const o = S.duels.out[d.id];
    if (!o || o.status === 'done' || o.to !== m.key) return;
    o.status = 'done'; o.theirs = d.s;
    // Le résultat se recalcule ici à partir des deux scores : on ne croit pas l'adversaire sur parole.
    const w = d.s > RACE_MAX ? 0 : d.s > o.score ? 1 : d.s === o.score ? 2 : 0;
    if (w === 0) {
      S.duelsWon = (S.duelsWon || 0) + 1;
      api.give('gold', 'duel gagné'); api.A.jackpot();
      api.banner('DUEL', 'VICTOIRE', `${esc(m.name)} a fait ${d.s}, toi ${o.score}`);
      api.addFeed(`<b>${esc(m.name)}</b> a perdu ton défi : ${d.s} contre ${o.score}. Coffre doré !`, m.t);
    } else if (w === 2) {
      api.toast(`${esc(m.name)} fait égalité à ton défi (${d.s}).`); api.give('wood', 'duel à égalité');
    } else {
      api.toast(`<b>${esc(m.name)}</b> a battu ton défi : ${d.s} contre ${o.score}.`, 'coral'); api.A.denied();
      api.addFeed(`<b>${esc(m.name)}</b> bat ton défi : ${d.s} contre ${o.score}.`, m.t);
    }
  }
  renderDuels(); api.onChange();
}
function renderDuels() {
  const S = api.S, box = $('duels');
  if (!box) return;
  const ins = Object.entries((S.duels || {}).in || {}).filter(([, d]) => d.status === 'new' && now() - d.t < 12 * 3600e3);
  const outs = Object.entries((S.duels || {}).out || {}).filter(([, d]) => d.status === 'sent' && now() - d.t < 12 * 3600e3);
  box.hidden = !ins.length && !outs.length;
  box.innerHTML = ins.map(([id, d]) => `<li class="duel in"><span><b>${esc(d.name)}</b> te défie : ${d.score} taps</span><button type="button" class="qclaim" data-duel="${id}">RELEVER</button></li>`).join('') +
    outs.map(([, d]) => `<li class="duel out"><span>Défi envoyé à <b>${esc(d.name)}</b> (${d.score} taps)</span><em>en attente</em></li>`).join('');
}

/* ======================= Boucle et branchement ======================= */
let badgeClock = 0;
function tick(dt) { rainTick(dt); raceTick(Math.min(dt, 0.1)); badgeClock += dt; if (badgeClock > 0.3) { badgeClock = 0; refreshBadges(); } }
function refreshBadges() {
  const t = api.S.tickets || 0, b = $('ticketBadge');
  if (b) { DT.setText(b, t); DT.setHidden(b, t <= 0); }
  const sb = $('scratchBtn'); if (sb && sb.classList.contains('ready') !== t > 0) sb.classList.toggle('ready', t > 0);
  if (!$('slotModal').hidden && !slotBusy) refreshSlot();
  DT.setText($('buyTicket'), `Acheter un ticket (${api.fmt(Math.max(50, Math.round(api.unit() * 300)))} nmol)`);
}
function enter() { renderDuels(); rainIn = rand(200, 320); }
function init(a) {
  api = a;
  $('slotBtn').addEventListener('click', openSlot);
  $('slotSpin').addEventListener('click', spinSlot);
  $('slotClose').addEventListener('click', () => { if (!slotBusy) $('slotModal').hidden = true; });
  $('slotBets').addEventListener('click', e => { const b = e.target.closest('button'); if (!b || slotBusy) return; bet = +b.dataset.i; document.querySelectorAll('#slotBets button').forEach(x => x.setAttribute('aria-pressed', x === b)); refreshSlot(); api.A.click(); });
  $('scratchBtn').addEventListener('click', openScratch);
  $('buyTicket').addEventListener('click', buyTicket);
  const cv = $('scratchCv');
  let down = false;
  cv.addEventListener('pointerdown', e => { down = true; try { cv.setPointerCapture(e.pointerId); } catch (err) {} scratchAt(e); });
  cv.addEventListener('pointermove', e => { if (down) scratchAt(e); });
  cv.addEventListener('pointerup', () => { down = false; if (scratch && !scratch.done) checkScratch(); });
  $('scratchDone').addEventListener('click', () => { $('scratchModal').hidden = true; scratch = null; });
  $('raceBtn').addEventListener('pointerdown', raceTap);
  document.addEventListener('keydown', e => { if (race && race.phase === 'go' && (e.key === ' ' || e.key === 'Enter')) raceTap(e); });
  $('raceClose').addEventListener('click', closeRace);
  $('duels').addEventListener('click', e => {
    const b = e.target.closest('[data-duel]'); if (!b) return;
    const d = api.S.duels.in[b.dataset.duel]; if (!d) return;
    startRace({mode: 'answer', id: b.dataset.duel, key: d.from, name: d.name, target: d.score});
  });
  $('board').addEventListener('click', e => {
    const b = e.target.closest('.duel-btn'); if (!b) return;
    e.stopPropagation();
    startRace({mode: 'challenge', key: b.dataset.k, name: b.dataset.n});
  });
}

DT.Games = {init, enter, tick, onDuelMsg, startRain, challenge: (key, name) => startRace({mode: 'challenge', key, name}), get busy() { return !!race || slotBusy; }};

})(window.DT);
