/* Dopamine Tycoon : pluie de dopamine et duels entre potes. */
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
  const rd = t > 0 || !!api.S.tkCur, sb = $('scratchBtn'); if (sb && sb.classList.contains('ready') !== rd) sb.classList.toggle('ready', rd);
}
function enter() { renderDuels(); rainIn = rand(200, 320); }
function init(a) {
  api = a;
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

DT.Games = {init, enter, tick, onDuelMsg, startRain, challenge: (key, name) => startRace({mode: 'challenge', key, name}), get busy() { return !!race; }};

})(window.DT);
