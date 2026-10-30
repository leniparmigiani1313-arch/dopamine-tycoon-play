/* Dopamine Tycoon : l'onglet Bonus (v1.25). Tout ce qui donne envie de revenir et de rester :
 *  - Chance : améliorations permanentes (casino, machines, tickets, coffres, roue, boule de cristal de la Bourse) ;
 *  - Boosters à acheter ; Dopa, l'animal de compagnie ; le coffre-fort à minuteur ; la loterie de la semaine ;
 *  - la tournée des jeux du jour ; la Transcendance (2e remise à zéro, Éclats d'éternité) ; les rappels ;
 *  - en jeu : les frénésies (défis éclair) et le trèfle à 4 feuilles.
 * Tout ce qui dépend du temps suit l'heure officielle (DT.now). */
window.DT = window.DT || {};
(function (DT) {
'use strict';

const $ = id => document.getElementById(id);
const now = () => DT.now();
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const DAY = 864e5, HOUR = 36e5;
const dayId = (t = now()) => Math.floor(t / DAY);
const weekId = (t = now()) => Math.floor((dayId(t) + 3) / 7);
function hash(n) { let x = Math.imul(n | 0, 2654435761) ^ 0x5bd1e995; x = Math.imul(x ^ (x >>> 15), 2246822519); return (x ^ (x >>> 13)) >>> 0; }
const clockStr = ms => { const s = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min ${String(s % 60).padStart(2, '0')}`; };
let api = null;

/* ---------- État (dans la sauvegarde) ---------- */
function st() {
  const S = api.S;
  if (!S.luck || typeof S.luck !== 'object') S.luck = {};
  if (!S.pet || typeof S.pet !== 'object') S.pet = {lvl: 0, xp: 0, food: 100, t: now()};
  if (!S.fun || typeof S.fun !== 'object') S.fun = {fz: 0, clover: 0, vaults: 0, lotto: 0, tours: 0};
  return S;
}

/* ======================= Chance ======================= */
const LUCK = [
  {id: 'casino', ic: '🎲', name: 'Croupier ami',       desc: l => `Casino : ${Math.round((0.75 + 0.03 * l) * 100)} % de parties gagnées (+3 % par niveau).`},
  {id: 'slots',  ic: '🎰', name: 'Machines truquées',  desc: l => `Machines à sous : ${Math.round((0.75 + 0.03 * l) * 100)} % de tours gagnants (+3 % par niveau).`},
  {id: 'ticket', ic: '🎟️', name: 'Ticket porte-bonheur', desc: l => `Un ticket perdant a ${15 * l} % de chances d'être retiré (+15 % par niveau).`},
  {id: 'chest',  ic: '🎁', name: 'Coffres bénis',       desc: l => `Chaque carte a ${12 * l} % de chances de tirer sa rareté deux fois et de garder la meilleure.`},
  {id: 'wheel',  ic: '🎡', name: 'Roue penchée',        desc: l => `Cases JACKPOT, LÉGENDE et coffre magique ${l ? '×' + (1 + 0.4 * l).toFixed(1).replace('.', ',') : 'normales'} sur la roue.`},
  {id: 'crystal', ic: '🔮', name: 'Boule de cristal',   desc: l => l ? `Bourse : tu vois le cours ${CRYSTAL[l]} s dans le futur.` : 'Bourse : voir le cours dans le futur (5 à 60 s).'},
];
const CRYSTAL = [0, 5, 10, 20, 40, 60], LUCK_MAX = 5;
const luckCost = (u, l) => 1e6 * Math.pow(100, l) * (u.id === 'crystal' ? 10 : 1);
const lv = id => Math.min(LUCK_MAX, Math.floor(+(st().luck[id]) || 0));
let cloverUntil = 0, luckBoostUntil = 0;
// Bonus de chance (en points de probabilité) pour le casino et les machines : améliorations + trèfle + booster.
function luckBonus(k) {
  if (!api) return 0;
  const ie = DT.Inf ? DT.Inf.eff() : {};
  let b = (k === 'slots' ? lv('slots') : lv('casino')) * 0.03 + ((k === 'slots' ? ie.slots : ie.casino) || 0);
  const t = now();
  if (t < cloverUntil) b += 0.1;
  if (t < luckBoostUntil) b += 0.1;
  return b;
}
const ticketLuck = () => api ? Math.min(0.95, 0.15 * lv('ticket') + (now() < cloverUntil ? 0.1 : 0) + (DT.Inf ? DT.Inf.eff().ticket : 0)) : 0;
const chestLuck = () => api ? Math.min(0.95, 0.12 * lv('chest') + (now() < cloverUntil ? 0.1 : 0) + (DT.Inf ? DT.Inf.eff().chest : 0)) : 0;
const wheelLuck = () => api ? 1 + 0.4 * lv('wheel') : 1;
const crystal = () => api ? CRYSTAL[lv('crystal')] : 0;
function buyLuck(id) {
  const u = LUCK.find(x => x.id === id), l = lv(id), S = st();
  if (!u || l >= LUCK_MAX) return;
  const c = luckCost(u, l);
  if (S.bank < c) { api.A.denied(); return; }
  api.spend(c); S.luck[id] = l + 1;
  api.A.upgrade(); api.confetti(innerWidth / 2, innerHeight * 0.4, 50);
  api.toast(`${u.ic} <b>${esc(u.name)}</b> niveau ${l + 1} !`, 'mint');
  api.save(); render(true);
}

/* ======================= Boosters ======================= */
const BOOST = [
  {id: 'prod', ic: '🏭', name: 'Production ×2', desc: '10 minutes', secs: 900, fx: () => api.buff('prod', 2, 600, 'Booster ×2')},
  {id: 'tap',  ic: '👆', name: 'Taps ×5',       desc: '5 minutes',  secs: 300, fx: () => api.buff('tap', 5, 300, 'Booster taps ×5')},
  {id: 'luck', ic: '🍀', name: 'Chance +10 %',  desc: '5 minutes, casino et machines', secs: 1200, fx: () => { luckBoostUntil = Math.max(now(), luckBoostUntil) + 300000; }},
];
const boostCost = b => api.unit() * b.secs;  // le prix suit ta production : b.secs secondes de production
function buyBoost(id) {
  const b = BOOST.find(x => x.id === id), c = boostCost(b), S = st();
  if (S.bank < c) { api.A.denied(); return; }
  api.spend(c); b.fx();
  api.A.levelUp(); api.flash('#FFD23F'); api.confetti(innerWidth / 2, innerHeight * 0.4, 60);
  api.toast(`${b.ic} <b>${b.name}</b> activé (${b.desc}) !`, 'mint');
  api.onChange(); render(true);
}

/* ======================= Dopa, l'animal de compagnie ======================= */
// La faim descend de 100 à 0 en 16 h. Nourri, Dopa donne +3 % de production par niveau (la moitié s'il a faim).
const PET_HUNGER = 16 * HOUR;
function pet() {
  const p = st().pet, t = now();
  if (DT.clock.trusted && p.t) { p.food = Math.max(0, p.food - (t - p.t) / PET_HUNGER * 100); p.t = t; }
  return p;
}
const petCost = () => api.unit() * 120;
const petMood = p => p.food <= 0 ? ['😿', 'affamé'] : p.food < 25 ? ['🙀', 'a faim'] : p.food < 60 ? ['😺', 'content'] : ['😻', 'aux anges'];
function feedPet() {
  const p = pet(), c = petCost(), S = st();
  if (!DT.clock.trusted) return;
  if (p.food >= 100) { api.toast('Dopa n\'a plus faim. Reviens plus tard !'); return; }
  if (S.bank < c) { api.A.denied(); return; }
  api.spend(c);
  p.food = Math.min(100, p.food + 25); p.xp++;
  const need = 3 + p.lvl;
  if (p.xp >= need) {
    p.xp -= need; p.lvl++;
    api.banner('DOPA', `NIVEAU ${p.lvl}`, `+${3 * p.lvl} % de production tant qu'il est nourri.`);
    api.confetti(innerWidth / 2, innerHeight * 0.4, 90); api.A.levelUp();
  } else api.A.pop();
  api.save(); render(true);
}
const petMult = () => { if (!api) return 1; const p = st().pet; return 1 + 0.03 * p.lvl * (p.food > 0 ? 1 : 0.5); };

/* ======================= Coffre-fort à minuteur ======================= */
const VAULT_MS = 3 * HOUR;
function vaultStart() {
  const S = st();
  if (!DT.clock.trusted || S.vault) return;
  S.vault = {until: now() + VAULT_MS};
  api.A.click(); api.toast('🔐 Coffre-fort lancé : il s\'ouvre dans 3 h. Reviens le chercher !');
  api.save(); render(true);
}
function vaultOpen() {
  const S = st();
  if (!S.vault || now() < S.vault.until || !DT.clock.trusted) return;
  S.vault = null; S.fun.vaults++;
  api.give('legend', 'coffre-fort');
  const g = api.gainTime(1800);
  S.tickets = (S.tickets || 0) + 2;
  api.banner('COFFRE-FORT', 'OUVERT !', `Coffre légendaire, +${api.fmt(g)} nmol et 2 tickets à gratter`);
  api.flash('#FFD23F'); api.confetti(innerWidth / 2, innerHeight * 0.4, 150); api.A.jackpot();
  api.save(); api.onChange(); render(true);
}

/* ======================= Loterie de la semaine ======================= */
// Tirage commun à tous : 5 numéros sur 30, déduits de la semaine. Les grilles sont tirées au hasard (pas de choix :
// on ne peut pas viser les bons numéros), 1 gratuite par semaine et jusqu'à 4 de plus, payantes.
const LOTTO_N = 30, LOTTO_K = 5, LOTTO_MAX = 5;
function draw(w) {
  const out = [];
  let h = hash(w * 97 + 13);
  while (out.length < LOTTO_K) { const n = 1 + h % LOTTO_N; if (!out.includes(n)) out.push(n); h = hash(h + out.length * 31); }
  return out.sort((a, b) => a - b);
}
function quickPick() { const out = []; while (out.length < LOTTO_K) { const n = 1 + Math.floor(Math.random() * LOTTO_N); if (!out.includes(n)) out.push(n); } return out.sort((a, b) => a - b); }
const LOTTO_PRIZE = {2: ['wood', 0, 'coffre en bois'], 3: ['gold', 600, 'coffre doré + 10 min de production'], 4: ['magic', 3600, 'coffre magique + 1 h de production'], 5: ['legend', 86400, 'JACKPOT : coffre légendaire + 24 h de production']};
const lottoCost = () => api.unit() * 600;
function lotto() {
  const S = st(), w = weekId();
  if (!S.lotto || typeof S.lotto !== 'object') S.lotto = {w, grids: [], prev: null};
  if (S.lotto.w !== w) S.lotto = {w, grids: [], prev: S.lotto.grids.length ? {w: S.lotto.w, grids: S.lotto.grids, claimed: false} : S.lotto.prev};
  return S.lotto;
}
function lottoBuy() {
  const L = lotto(), S = st();
  if (!DT.clock.trusted || L.grids.length >= LOTTO_MAX) return;
  if (L.grids.length) { const c = lottoCost(); if (S.bank < c) { api.A.denied(); return; } api.spend(c); }
  L.grids.push(quickPick());
  api.A.buy(); api.save(); render(true);
}
function lottoClaim() {
  const L = lotto(), S = st();
  if (!L.prev || L.prev.claimed) return;
  const d = draw(L.prev.w);
  let best = 0;
  for (const g of L.prev.grids) {
    const k = g.filter(n => d.includes(n)).length;
    best = Math.max(best, k);
    const pz = LOTTO_PRIZE[k];
    if (pz) { api.give(pz[0], `loterie : ${k} bons numéros`); if (pz[1]) api.gainTime(pz[1]); }
  }
  L.prev.claimed = true;
  if (best >= 3) S.fun.lotto++;
  if (best >= 5) { api.banner('LOTERIE', 'JACKPOT !!!', '5 bons numéros sur 5 !'); api.flash('#FFD23F'); api.confetti(innerWidth / 2, innerHeight * 0.3, 250); api.A.jackpot(); api.addFeed('<b>JACKPOT</b> à la loterie de la semaine !'); }
  else if (best >= 2) { api.banner('LOTERIE', `${best} BONS NUMÉROS`, LOTTO_PRIZE[best][2]); api.confetti(innerWidth / 2, innerHeight * 0.4, 80); api.A.upgrade(); }
  else { api.toast('Loterie : aucun gain cette fois. Nouvelle grille gratuite cette semaine !'); api.A.denied(); }
  api.save(); api.onChange(); render(true);
}

/* ======================= Tournée des jeux du jour ======================= */
const TOUR = [
  {c: 'slotSpins', ic: '🎰', txt: 'Un tour de machine à sous'}, {c: 'casinoPlays', ic: '🎲', txt: 'Une partie de casino'},
  {c: 'scratched', ic: '🎟️', txt: 'Un ticket à gratter'}, {c: 'spinsDone', ic: '🎡', txt: 'Un tour de roue'}, {c: 'bTrades', ic: '📈', txt: 'Une position en Bourse'},
];
function tour() {
  const S = st(), d = dayId();
  if (!S.tour || S.tour.d !== d) S.tour = {d, base: Object.fromEntries(TOUR.map(x => [x.c, S[x.c] || 0])), done: false};
  return S.tour;
}
const tourOk = x => (api.S[x.c] || 0) > (tour().base[x.c] || 0);
function tourCheck() {
  const T = tour(), S = st();
  if (T.done || !TOUR.every(tourOk)) return;
  T.done = true; S.fun.tours++;
  api.give('magic', 'tournée des jeux');
  S.spins = (S.spins || 0) + 5;
  api.banner('TOURNÉE DES JEUX', 'COMPLÈTE !', 'Coffre magique et 5 tours de roue. Reviens demain !');
  api.confetti(innerWidth / 2, innerHeight * 0.4, 120); api.A.jackpot();
  api.save();
}

/* ======================= Transcendance ======================= */
const transGain = () => { if (!api) return 0; const b = Math.max(0, Math.floor(Math.log10(Math.max(1, api.S.ser || 0))) - 7); return b ? Math.floor(b * (DT.Inf ? DT.Inf.mult('eclat') : 1)) : 0; };
let transArm = 0;
function transClick() {
  const g = transGain();
  if (g < 1) { api.A.denied(); return; }
  if (performance.now() > transArm) { transArm = performance.now() + 4000; render(true); return; }
  transArm = 0;
  api.transcend(g);
  render(true);
}

/* ======================= Rappels (notifications du navigateur) ======================= */
let notifOn = false; const sent = {};
try { notifOn = localStorage.getItem('dt-notif') === '1'; } catch (e) {}
async function toggleNotif() {
  if (!('Notification' in window)) { api.toast('Ton navigateur ne gère pas les notifications.'); return; }
  if (notifOn) { notifOn = false; try { localStorage.setItem('dt-notif', '0'); } catch (e) {} render(true); return; }
  let p = Notification.permission;
  if (p !== 'granted') p = await Notification.requestPermission();
  notifOn = p === 'granted';
  try { localStorage.setItem('dt-notif', notifOn ? '1' : '0'); } catch (e) {}
  api.toast(notifOn ? '🔔 Rappels activés : tu seras prévenu quand le jeu est en arrière-plan.' : 'Notifications refusées par le navigateur.');
  render(true);
}
function remind(key, title, body) {
  if (!notifOn || !document.hidden || sent[key] || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  sent[key] = 1;
  try { new Notification(title, {body, icon: 'icons/icon-192.png', tag: key}); } catch (e) {}
}

/* ======================= Frénésies : défis éclair pendant le jeu ======================= */
let fz = null, fzIn = rand(240, 420);
const FZ = [
  {k: 'tap', c: 'totClicks', n: () => Math.round(rand(40, 70)), secs: 10, txt: n => `${n} taps en 10 s`},
  {k: 'crush', c: 'crushed', n: () => Math.round(rand(5, 9)), secs: 15, txt: n => `écrase ${n} objets en 15 s`},
];
function fzStart() {
  const f = pick(FZ), n = f.n();
  fz = {f, n, base: api.S[f.c] || 0, left: f.secs};
  api.A.boss(); api.flash('#FF9F1C');
  const box = $('fzBox'); box.hidden = false;
  box.animate([{transform: 'translate(-50%,-30px) scale(.5)', opacity: 0}, {transform: 'translate(-50%,0) scale(1)', opacity: 1}], {duration: 300, easing: 'cubic-bezier(.2,1.6,.4,1)'});
}
function fzTick(dt) {
  if (!fz) {
    if (api.modalOpen() || api.S.paused || document.hidden || now() - api.lastInput() > 30000) return;
    fzIn -= dt; if (fzIn <= 0) { fzIn = rand(240, 420); fzStart(); }
    return;
  }
  fz.left -= dt;
  const v = Math.max(0, (api.S[fz.f.c] || 0) - fz.base);
  DT.setHTML($('fzBox'), `<b>⚡ FRÉNÉSIE</b><span>${fz.f.txt(fz.n)}</span><span class="fz-bar"><i style="width:${Math.min(100, Math.round(v / fz.n * 100))}%"></i></span><em>${Math.min(v, fz.n)}/${fz.n} · ${Math.max(0, Math.ceil(fz.left))} s</em>`);
  if (v >= fz.n) {
    st().fun.fz++;
    api.give('gold', 'frénésie réussie'); api.buff('tap', 3, 30, 'Frénésie ×3');
    if (DT.Inf && DT.Inf.eff().frenzy) api.give('magic', 'frénésie dorée');
    api.banner('FRÉNÉSIE', 'RÉUSSIE !', 'Coffre doré et taps ×3 pendant 30 s');
    api.confetti(innerWidth / 2, innerHeight * 0.4, 100); api.A.jackpot();
    fz = null; $('fzBox').hidden = true;
  } else if (fz.left <= 0) {
    api.toast('⚡ Frénésie ratée… La prochaine sera la bonne !', 'coral'); api.A.denied();
    fz = null; $('fzBox').hidden = true;
  }
}

/* ======================= Trèfle à 4 feuilles ======================= */
let clover = null, cloverIn = rand(300, 600);
function cloverSpawn() {
  const b = $('fnClover');
  b.hidden = false;
  b.style.left = rand(8, 82) + 'vw'; b.style.top = rand(18, 70) + 'vh';
  clover = {left: 9};
  api.A.goldenSpawn();
}
function cloverTick(dt) {
  if (!clover) {
    if (api.modalOpen() || document.hidden || api.S.paused) return;
    cloverIn -= dt; if (cloverIn <= 0) { cloverIn = rand(360, 720) / (DT.Inf ? DT.Inf.eff().clover : 1); cloverSpawn(); }
    return;
  }
  clover.left -= dt;
  if (clover.left <= 0) { clover = null; $('fnClover').hidden = true; }
}
function cloverClick() {
  if (!clover) return;
  clover = null; $('fnClover').hidden = true;
  st().fun.clover++;
  cloverUntil = Math.max(now(), cloverUntil) + 90000;
  const g = api.gainTime(60);
  api.banner('TRÈFLE À 4 FEUILLES', '🍀 CHANCE +10 %', `Pendant 90 s : casino, machines, tickets et coffres. +${api.fmt(g)} nmol`);
  api.confetti(innerWidth / 2, innerHeight * 0.4, 90); api.A.golden();
}

/* ======================= Affichage de l'onglet ======================= */
function render(force) {
  if (!api || $('tab-bonus').hidden && !force) return;
  const S = st(), fmt = api.fmt, t = now();
  // Chance
  DT.setHTML($('fnLuck'), LUCK.map(u => { const l = lv(u.id), max = l >= LUCK_MAX, c = max ? 0 : luckCost(u, l);
    return `<div class="fn-row"><span class="fn-ic">${u.ic}</span><div><b>${esc(u.name)} <em>${l}/${LUCK_MAX}</em></b><small>${esc(u.desc(l))}</small></div>
      ${max ? '<em class="fn-max">MAX</em>' : `<button type="button" class="btn${S.bank >= c ? ' mint' : ''}" data-luck="${u.id}">${fmt(c)}</button>`}</div>`; }).join(''));
  const lb = [t < cloverUntil ? `🍀 trèfle ${clockStr(cloverUntil - t)}` : '', t < luckBoostUntil ? `🍀 booster ${clockStr(luckBoostUntil - t)}` : ''].filter(Boolean).join(' · ');
  DT.setText($('fnLuckNow'), `Casino ${Math.round(DT.Luck.p('casino') * 100)} % · machines ${Math.round(DT.Luck.p('slots') * 100)} %${lb ? ' · ' + lb : ''}`);
  // Boosters
  DT.setHTML($('fnBoost'), BOOST.map(b => { const c = boostCost(b);
    return `<button type="button" class="fn-boost${S.bank >= c ? ' ok' : ''}" data-boost="${b.id}"><span>${b.ic}</span><b>${b.name}</b><small>${b.desc}</small><em>${fmt(c)}</em></button>`; }).join(''));
  // Dopa
  const p = pet(), [face, mood] = petMood(p), need = 3 + p.lvl;
  DT.setHTML($('fnPet'), `<div class="fn-pet"><span class="fn-face">${face}</span><div><b>Dopa · niveau ${p.lvl}</b><small>${mood} · bonus +${Math.round((petMult() - 1) * 100)} % de production</small>
    <span class="fn-bar food"><i style="width:${Math.round(p.food)}%"></i></span><small>Repas ${Math.round(p.food)} % · ${p.xp}/${need} vers le niveau ${p.lvl + 1}</small></div>
    <button type="button" class="btn${S.bank >= petCost() && p.food < 100 ? ' mint' : ''}" data-act="feed">NOURRIR · ${fmt(petCost())}</button></div>`);
  // Coffre-fort
  const V = S.vault;
  DT.setHTML($('fnVault'), !V ? `<p>Lance le minuteur : dans 3 h, un coffre légendaire, 30 min de production et 2 tickets.</p><button type="button" class="btn mint" data-act="vault">LANCER LE COFFRE-FORT (3 h)</button>`
    : t >= V.until ? `<p><b>Le coffre-fort est prêt !</b></p><button type="button" class="btn-hero" data-act="vaultOpen">OUVRIR</button>`
      : `<p>Ouverture dans <b>${clockStr(V.until - t)}</b></p><span class="fn-bar"><i style="width:${Math.round((1 - (V.until - t) / VAULT_MS) * 100)}%"></i></span>`);
  // Loterie
  const L = lotto(), dPrev = L.prev ? draw(L.prev.w) : null;
  const gridHTML = (g, d) => `<span class="fn-grid">${g.map(n => `<i class="${d && d.includes(n) ? 'hit' : ''}">${n}</i>`).join('')}</span>`;
  DT.setHTML($('fnLotto'), `${L.prev && !L.prev.claimed ? `<p><b>Tirage de la semaine dernière :</b> ${gridHTML(dPrev)}</p>${L.prev.grids.map(g => gridHTML(g, dPrev)).join('')}<button type="button" class="btn-hero" data-act="lottoClaim">VOIR MES GAINS</button>` : ''}
    <p>Cette semaine : ${L.grids.length ? L.grids.map(g => gridHTML(g)).join('') : 'aucune grille'} <small>tirage lundi 1 h (heure de Paris) · 2 à 5 bons numéros gagnent</small></p>
    ${L.grids.length < LOTTO_MAX ? `<button type="button" class="btn${!L.grids.length || S.bank >= lottoCost() ? ' mint' : ''}" data-act="lotto">${L.grids.length ? `GRILLE EN PLUS · ${fmt(lottoCost())}` : 'MA GRILLE GRATUITE'}</button>` : '<small>5 grilles maximum par semaine.</small>'}`);
  // Tournée
  const T = tour();
  DT.setHTML($('fnTour'), `<ul class="fn-tour">${TOUR.map(x => `<li class="${tourOk(x) ? 'ok' : ''}">${tourOk(x) ? '✅' : x.ic} ${esc(x.txt)}</li>`).join('')}</ul>
    <small>${T.done ? 'Tournée faite : coffre magique et 5 tours de roue gagnés. Nouvelle tournée demain !' : 'Les 5 aujourd\'hui : coffre magique et 5 tours de roue.'}</small>`);
  // Transcendance
  const g = transGain();
  DT.setHTML($('fnTrans'), `<p>Éclats d'éternité : <b>${S.eclats || 0}</b> · production <b>×${fmt(Math.pow(2, S.eclats || 0))}</b> pour toujours.</p>
    <p class="small">Transcender efface ta Sérénité, tes sagesses et tes sagesses infinies (comme une cure de désintox en plus fort), contre des Éclats d'éternité : chacun double ta production pour toujours. ${g ? `Tu gagnerais <b>${g} éclat${g > 1 ? 's' : ''}</b>.` : `Premier éclat à 100 M de Sérénité (tu en as ${fmt(S.ser || 0)}).`}</p>
    <button type="button" class="btn${g ? ' warn' : ''}" data-act="trans" ${g ? '' : 'disabled'}>${performance.now() < transArm ? `CONFIRMER : TOUT EFFACER POUR +${g} ÉCLAT${g > 1 ? 'S' : ''}` : 'TRANSCENDER'}</button>`);
  // Rappels
  DT.setText($('fnNotif'), notifOn ? '🔔 Rappels activés' : '🔕 Activer les rappels');
}
function dot() {
  // pastille de l'onglet : quelque chose à récupérer
  const S = st(), t = now();
  const ready = (S.vault && t >= S.vault.until) || (S.lotto && S.lotto.prev && !S.lotto.prev.claimed) || (S.lotto && S.lotto.w === weekId() && !S.lotto.grids.length) || pet().food < 25;
  DT.setText($('bonusDot'), ready ? '●' : '');
}

/* ---------- Boucle ---------- */
let uiClock = 0;
function tick(dt) {
  if (!api || !api.inGame()) return;
  dt = Math.min(dt, 1);
  fzTick(dt); cloverTick(dt);
  uiClock += dt;
  if (uiClock < 1) return;
  uiClock = 0;
  if (!DT.clock.trusted) return;
  tourCheck(); dot(); render(false);
  const S = st(), t = now(), p = pet();
  if (S.vault && t >= S.vault.until) remind('vault' + S.vault.until, 'Dopamine Tycoon', '🔐 Ton coffre-fort est prêt à être ouvert !');
  if (p.food < 25) remind('pet' + dayId(), 'Dopamine Tycoon', '🙀 Dopa a faim ! Viens le nourrir.');
  if (S.lotto && S.lotto.prev && !S.lotto.prev.claimed) remind('lotto' + S.lotto.prev.w, 'Dopamine Tycoon', '🎟️ Le tirage de la loterie est tombé. As-tu gagné ?');
}
function enter() {
  st(); fz = null; clover = null; $('fzBox').hidden = true; $('fnClover').hidden = true;
  if (DT.clock.trusted && pet().food < 25) setTimeout(() => api.toast('🙀 <b>Dopa a faim !</b> Va le nourrir dans l\'onglet Bonus.', 'coral'), 5000);
}
function init(a) {
  api = a;
  const fzb = document.createElement('div'); fzb.className = 'fz-box'; fzb.id = 'fzBox'; fzb.hidden = true; fzb.setAttribute('role', 'status');
  $('stage').appendChild(fzb);
  const cl = document.createElement('button'); cl.type = 'button'; cl.className = 'fn-clover'; cl.id = 'fnClover'; cl.hidden = true; cl.textContent = '🍀';
  cl.setAttribute('aria-label', 'Trèfle à 4 feuilles : clique pour plus de chance');
  cl.addEventListener('click', cloverClick); document.body.appendChild(cl);
  $('tab-bonus').addEventListener('click', e => {
    const l = e.target.closest('[data-luck]'); if (l) return buyLuck(l.dataset.luck);
    const b = e.target.closest('[data-boost]'); if (b) return buyBoost(b.dataset.boost);
    const x = e.target.closest('[data-act]'); if (!x) return;
    ({feed: feedPet, vault: vaultStart, vaultOpen, lotto: lottoBuy, lottoClaim, trans: transClick})[x.dataset.act]();
  });
  $('fnNotif').addEventListener('click', toggleNotif);
}

// Pour les automatisations de l'onglet Infini
function autoPet() { const p = pet(); if (p.food < 60 && api.S.bank >= petCost()) feedPet(); }
function autoVault() { const S = st(); if (!S.vault) vaultStart(); else if (now() >= S.vault.until) vaultOpen(); }
function autoLotto() { const L = lotto(); if (L.prev && !L.prev.claimed) lottoClaim(); if (!L.grids.length) lottoBuy(); }
DT.Fun = {init, enter, tick, render: () => render(true), autoPet, autoVault, autoLotto, luckBonus, ticketLuck, chestLuck, wheelLuck, crystal, transGain,
  mult: k => k === 'prod' ? petMult() : 1, LUCK};

})(window.DT);
