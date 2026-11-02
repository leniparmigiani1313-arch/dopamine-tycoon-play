/* Dopamine Tycoon : l'onglet Aventure (v1.28).
 *  - 20 reliques (bonus permanents, trouvées en écrasant, en expédition ou au marché noir) ;
 *  - marché noir : 4 offres qui changent toutes les heures (les mêmes pour tous), 7 sortes d'offres ;
 *  - expéditions : 3 équipes envoyées 30 min, 2 h ou 8 h ;
 *  - contrats du jour : 3 missions tirées au hasard (une peut être changée par jour) ;
 *  - 8 thèmes de couleurs et 15 titres à débloquer.
 * État : S.relics, S.mkt, S.exp, S.ctr, S.theme, S.title (gardés à la cure). */
window.DT = window.DT || {};
(function (DT) {
'use strict';

const $ = id => document.getElementById(id);
const now = () => DT.now();
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const pick = a => a[Math.floor(Math.random() * a.length)];
const HOUR = 36e5, DAY = 864e5;
function hash(n) { let x = Math.imul(n | 0, 2654435761) ^ 0x5bd1e995; x = Math.imul(x ^ (x >>> 15), 2246822519); return (x ^ (x >>> 13)) >>> 0; }
const clockStr = ms => { const s = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min ${String(s % 60).padStart(2, '0')}`; };
let api = null;
function st() {
  const S = api.S;
  if (!S.relics || typeof S.relics !== 'object') S.relics = {};
  if (!Array.isArray(S.exp)) S.exp = [null, null, null];
  return S;
}

/* ======================= Reliques ======================= */
const RELICS = [
  ['r_sock', '🧦', 'Chaussette porte-bonheur', 'Casino et machines +2 %.', {luck: 0.02}], ['r_coin', '🪙', 'Pièce de Nasdas', 'Production ×2.', {prod: 2}],
  ['r_phone', '📱', 'Premier smartphone', 'Taps ×3.', {tap: 3}], ['r_owl', '🦉', 'Plume du hibou', 'XP ×1,25.', {xp: 1.25}],
  ['r_lotus', '🪷', 'Lotus ancien', 'Sérénité gagnée ×1,5.', {ser: 1.5}], ['r_dice', '🎲', 'Dé pipé', 'Casino et machines +3 %.', {luck: 0.03}],
  ['r_crown', '👑', 'Couronne du roi du scroll', 'Production ×3.', {prod: 3}], ['r_glove', '🧤', 'Gant de boxe', 'Taps ×5.', {tap: 5}],
  ['r_hourglass', '⏳', 'Sablier figé', 'Production ×2.', {prod: 2}], ['r_skull', '💀', 'Crâne de cristal', 'Sérénité gagnée ×2.', {ser: 2}],
  ['r_book', '📕', 'Grimoire des likes', 'XP ×1,5.', {xp: 1.5}], ['r_horse', '🐴', 'Fer à cheval', 'Casino et machines +3 %.', {luck: 0.03}],
  ['r_gem', '💎', 'Diamant de l\'algorithme', 'Production ×5.', {prod: 5}], ['r_bolt', '⚡', 'Éclair en bouteille', 'Taps ×10.', {tap: 10}],
  ['r_moon', '🌙', 'Éclat de lune', 'Sérénité gagnée ×3.', {ser: 3}], ['r_star', '⭐', 'Étoile filante', 'Production ×10.', {prod: 10}],
  ['r_key', '🗝️', 'Clé du serveur', 'Production ×5 et XP ×1,25.', {prod: 5, xp: 1.25}], ['r_eye', '👁️', 'Œil qui voit tout', 'Casino et machines +5 %.', {luck: 0.05}],
  ['r_egg', '🥚', 'Œuf de Dopa', 'Taps ×25.', {tap: 25}], ['r_infinity', '♾️', 'Ruban de l\'infini', 'Production ×100.', {prod: 100}],
].map(([id, ic, name, desc, eff]) => ({id, ic, name, desc, eff}));
let relCache = {n: -1, S: null, v: null};
function relEff() {
  const S = st(), n = Object.keys(S.relics).length;
  if (relCache.n === n && relCache.S === S) return relCache.v;
  const v = {prod: 1, tap: 1, ser: 1, xp: 1, luck: 0};
  for (const r of RELICS) if (S.relics[r.id]) for (const k in r.eff) { if (k === 'luck') v.luck += r.eff[k]; else v[k] *= r.eff[k]; }
  relCache = {n, S, v};
  return v;
}
function giveRelic(why) {
  const S = st(), left = RELICS.filter(r => !S.relics[r.id]);
  if (!left.length) return false;
  const r = pick(left);
  S.relics[r.id] = now();
  api.banner('RELIQUE', `${r.ic} ${r.name.toUpperCase()}`, `${r.desc} (${why})`);
  api.flash('#C77DFF'); api.confetti(innerWidth / 2, innerHeight * 0.4, 120); api.A.jackpot();
  api.addFeed(`Relique trouvée : <b>${esc(r.name)}</b> !`);
  api.save(); api.onChange();
  return true;
}
function onCrush() { if (Math.random() < 0.002) giveRelic('trouvée sous la presse'); }

/* ======================= Marché noir ======================= */
const OFFERS = [
  {id: 'legend', ic: '🎁', name: 'Coffre légendaire', secs: 1800, fx: () => api.give('legend', 'marché noir')},
  {id: 'magic3', ic: '✨', name: '3 coffres magiques', secs: 1500, fx: () => { for (let i = 0; i < 3; i++) api.give('magic', 'marché noir'); }},
  {id: 'tickets', ic: '🎟️', name: '5 tickets à gratter', secs: 900, fx: () => { api.S.tickets = (api.S.tickets || 0) + 5; }},
  {id: 'spins', ic: '🎡', name: '10 tours de roue', secs: 600, fx: () => { api.S.spins = (api.S.spins || 0) + 10; }},
  {id: 'boost', ic: '🏭', name: 'Production ×3 (15 min)', secs: 2400, fx: () => api.buff('prod', 3, 900, 'Marché noir ×3')},
  {id: 'relic', ic: '🏺', name: 'Relique au hasard', secs: 7200, fx: () => { if (!giveRelic('achetée au marché noir')) api.give('legend', 'marché noir'); }},
  {id: 'mega', ic: '💥', name: 'Méga-Presse pleine + Hype', secs: 300, fx: () => { api.S.mega = 100; if (DT.Extras) DT.Extras.startFever(); }},
];
const hourId = () => Math.floor(now() / HOUR);
function market() {
  const S = st(), h = hourId();
  if (!S.mkt || S.mkt.h !== h) {
    const ids = [], pool = OFFERS.map(o => o.id);
    let x = hash(h * 7 + 3);
    while (ids.length < 4) { const k = pool.splice(x % pool.length, 1)[0]; ids.push(k); x = hash(x + ids.length); }
    S.mkt = {h, ids, bought: []};
  }
  return S.mkt;
}
const offerCost = o => api.unit() * o.secs * 0.6;  // prix : un peu plus de la moitié du temps de production équivalent
function buyOffer(id) {
  const M = market(), o = OFFERS.find(x => x.id === id), S = st();
  if (!o || M.bought.includes(id)) return;
  const c = offerCost(o);
  if (S.bank < c) { api.A.denied(); return; }
  api.spend(c); M.bought.push(id); o.fx();
  api.A.buy(); api.toast(`${o.ic} <b>${o.name}</b> acheté au marché noir !`, 'mint');
  api.save(); api.onChange(); render(true);
}

/* ======================= Expéditions ======================= */
const EXPS = [
  {id: 'short', name: '30 min', ms: 30 * 60e3, rew: () => { api.give('gold', 'expédition'); api.gainTime(600); }, relic: 0.03, txt: 'coffre doré + 10 min de production'},
  {id: 'mid', name: '2 h', ms: 2 * HOUR, rew: () => { api.give('magic', 'expédition'); api.gainTime(3600); }, relic: 0.12, txt: 'coffre magique + 1 h de production'},
  {id: 'long', name: '8 h', ms: 8 * HOUR, rew: () => { api.give('legend', 'expédition'); api.give('legend', 'expédition'); api.gainTime(4 * 3600); }, relic: 0.4, txt: '2 coffres légendaires + 4 h de production'},
];
function expStart(slot, id) {
  const S = st(), e = EXPS.find(x => x.id === id);
  if (!DT.clock.trusted || S.exp[slot] || !e) return;
  S.exp[slot] = {id, until: now() + e.ms};
  api.A.click(); api.save(); render(true);
}
function expClaim(slot) {
  const S = st(), x = S.exp[slot];
  if (!x || now() < x.until) return;
  const e = EXPS.find(y => y.id === x.id);
  S.exp[slot] = null;
  e.rew();
  const rel = Math.random() < e.relic && giveRelic('rapportée d\'expédition');
  if (!rel) { api.banner('EXPÉDITION', 'DE RETOUR !', e.txt); api.confetti(innerWidth / 2, innerHeight * 0.4, 80); api.A.upgrade(); }
  api.save(); api.onChange(); render(true);
}

/* ======================= Contrats du jour ======================= */
const CTR = [
  {c: 'crushed', n: 300, txt: 'Écrase 300 objets'}, {c: 'totClicks', n: 2000, txt: 'Fais 2 000 taps'}, {c: 'casinoPlays', n: 20, txt: 'Joue 20 parties de casino'},
  {c: 'slotSpins', n: 30, txt: 'Fais 30 tours de machine'}, {c: 'scratched', n: 5, txt: 'Gratte 5 tickets'}, {c: 'chestsOpened', n: 10, txt: 'Ouvre 10 coffres'},
  {c: 'goldClicks', n: 5, txt: 'Attrape 5 notifications dorées'}, {c: 'bTrades', n: 5, txt: 'Ouvre 5 positions en Bourse'}, {c: 'spinsDone', n: 5, txt: 'Tourne 5 fois la roue'},
  {c: 'megas', n: 3, txt: 'Lance 3 Méga-Presses'}, {c: 'bosses', n: 3, txt: 'Terrasse 3 boss'}, {c: 'popits', n: 8, txt: 'Termine 8 pop-it'},
];
const REW = ['gold', 'magic', 'legend'];
function ctr() {
  const S = st(), d = Math.floor(now() / DAY);
  if (!S.ctr || S.ctr.d !== d) {
    const pool = CTR.slice(), list = [];
    while (list.length < 3) { const q = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]; list.push({c: q.c, base: S[q.c] || 0, claimed: false}); }
    S.ctr = {d, list, rr: false};
  }
  return S.ctr;
}
const ctrDef = q => CTR.find(x => x.c === q.c);
const ctrVal = q => Math.max(0, (api.S[q.c] || 0) - q.base);
function ctrClaim(i) {
  const C = ctr(), q = C.list[i];
  if (!q || q.claimed || ctrVal(q) < ctrDef(q).n) return;
  q.claimed = true;
  api.give(REW[i], 'contrat du jour'); api.addXp(50);
  api.A.questDone(); api.confetti(innerWidth / 2, innerHeight * 0.45, 60);
  if (C.list.every(x => x.claimed)) { api.S.tickets = (api.S.tickets || 0) + 3; api.banner('CONTRATS', 'TOUS REMPLIS', '3 tickets à gratter en prime !'); }
  api.save(); render(true);
}
function ctrReroll(i) {
  const C = ctr(), S = st();
  if (C.rr || C.list[i].claimed) return;
  const used = C.list.map(x => x.c), pool = CTR.filter(x => !used.includes(x.c)), q = pick(pool);
  C.list[i] = {c: q.c, base: S[q.c] || 0, claimed: false}; C.rr = true;
  api.A.click(); api.save(); render(true);
}

/* ======================= Thèmes et titres ======================= */
const THEMES = [
  {id: '', name: 'Classique', need: () => true, how: ''},
  {id: 'neon', name: 'Néon', need: S => S.lvl >= 10, how: 'niveau 10'},
  {id: 'sunset', name: 'Coucher de soleil', need: S => S.lvl >= 25, how: 'niveau 25'},
  {id: 'matrix', name: 'Matrice', need: S => (S.era || 0) >= 4, how: 'chapitre V'},
  {id: 'ocean', name: 'Océan', need: S => Object.keys(S.relics || {}).length >= 3, how: '3 reliques'},
  {id: 'gold', name: 'Or massif', need: S => (S.slotJackpots || 0) + (S.jackpots || 0) >= 5, how: '5 jackpots'},
  {id: 'vampire', name: 'Vampire', need: S => (S.eclats || 0) >= 1, how: 'une Transcendance'},
  {id: 'rainbow', name: 'Arc-en-ciel', need: S => Object.keys(S.relics || {}).length >= 10, how: '10 reliques'},
];
const TITLES = [
  {id: 'novice', name: 'Novice du scroll', need: S => S.clicks >= 100}, {id: 'tapeur', name: 'Tapeur fou', need: S => S.totClicks >= 10000},
  {id: 'flambeur', name: 'Flambeur', need: S => (S.casinoPlays || 0) >= 100}, {id: 'gratteur', name: 'Gratteur pro', need: S => (S.scratched || 0) >= 50},
  {id: 'trader', name: 'Loup de la Bourse', need: S => (S.bTrades || 0) >= 50}, {id: 'chanceux', name: 'Chanceux', need: S => (S.slotJackpots || 0) >= 1},
  {id: 'collect', name: 'Collectionneur', need: S => Object.keys(S.cards || {}).length >= 50}, {id: 'sage', name: 'Grand sage', need: S => Object.keys(S.sag || {}).length >= 10},
  {id: 'explo', name: 'Explorateur', need: S => Object.keys(S.relics || {}).length >= 5}, {id: 'milliard', name: 'Milliardaire', need: S => S.life >= 1e9},
  {id: 'gogol', name: 'Gogolionnaire', need: S => S.life >= 1e100}, {id: 'eternel', name: 'Éternel', need: S => (S.eclats || 0) >= 10},
  {id: 'etoile', name: 'Né des étoiles', need: S => (S.etoiles || 0) >= 1}, {id: 'boss', name: 'Tueur de boss', need: S => (S.bosses || 0) >= 100},
  {id: 'legende', name: 'Légende vivante', need: S => Object.keys(S.relics || {}).length >= 20},
];
function setTheme(id) {
  const S = st(), t = THEMES.find(x => x.id === id);
  if (!t || !t.need(S)) { api.A.denied(); return; }
  S.theme = id; applyTheme(); api.A.click(); api.save(); render(true);
}
function applyTheme() { const id = st().theme || ''; THEMES.forEach(t => t.id && document.body.classList.toggle('th-' + t.id, t.id === id)); }
function setTitle(id) {
  const S = st(), t = TITLES.find(x => x.id === id);
  if (id && (!t || !t.need(S))) { api.A.denied(); return; }
  S.title = id; api.A.click(); api.save(); api.onChange(); render(true);
}

/* ======================= Affichage ======================= */
function render(force) {
  if (!api || ($('tab-plus').hidden && !force)) return;
  const S = st(), t = now(), fmt = api.fmt, R = relEff();
  DT.setHTML($('plRel'), `<p class="small">${Object.keys(S.relics).length}/${RELICS.length} reliques · production ×${fmt(R.prod)} · taps ×${fmt(R.tap)} · Sérénité ×${fmt(R.ser)} · chance +${Math.round(R.luck * 100)} %</p>
    <div class="pl-rel">${RELICS.map(r => `<span class="pl-r${S.relics[r.id] ? ' got' : ''}" title="${esc(S.relics[r.id] ? r.name + ' : ' + r.desc : 'Relique inconnue')}">${S.relics[r.id] ? r.ic : '❔'}</span>`).join('')}</div>`);
  const M = market();
  DT.setHTML($('plMkt'), `<p class="small">Nouvelles offres dans ${clockStr((M.h + 1) * HOUR - t)}.</p><div class="fn-boosts">${M.ids.map(id => { const o = OFFERS.find(x => x.id === id), b = M.bought.includes(id), c = offerCost(o);
    return `<button type="button" class="fn-boost${!b && S.bank >= c ? ' ok' : ''}" data-mkt="${id}" ${b ? 'disabled' : ''}><span>${o.ic}</span><b>${o.name}</b><em>${b ? 'acheté' : fmt(c)}</em></button>`; }).join('')}</div>`);
  DT.setHTML($('plExp'), S.exp.map((x, i) => {
    if (!x) return `<div class="pl-exp"><b>Équipe ${i + 1}</b> <span>${EXPS.map(e => `<button type="button" class="btn" data-exp="${i}:${e.id}" title="${esc(e.txt)}">${e.name}</button>`).join('')}</span></div>`;
    const e = EXPS.find(y => y.id === x.id);
    return t >= x.until ? `<div class="pl-exp"><b>Équipe ${i + 1}</b> <button type="button" class="btn-hero" data-expc="${i}">RÉCUPÉRER</button></div>`
      : `<div class="pl-exp"><b>Équipe ${i + 1}</b> <span>expédition de ${e.name} · retour dans ${clockStr(x.until - t)}</span></div>`;
  }).join('') + '<p class="small">30 min : coffre doré · 2 h : coffre magique · 8 h : 2 coffres légendaires. Plus c\'est long, plus il y a de chances de rapporter une relique.</p>');
  const C = ctr();
  DT.setHTML($('plCtr'), C.list.map((q, i) => { const d = ctrDef(q), v = Math.min(d.n, ctrVal(q)), ok = v >= d.n;
    return `<div class="pl-ctr${q.claimed ? ' done' : ''}"><b>${esc(d.txt)}</b><span class="fn-bar"><i style="width:${Math.round(v / d.n * 100)}%"></i></span><small>${fmt(v)}/${fmt(d.n)} · récompense : ${['coffre doré', 'coffre magique', 'coffre légendaire'][i]}</small>
      ${q.claimed ? '<em class="fn-max">FAIT</em>' : ok ? `<button type="button" class="btn mint" data-ctr="${i}">RÉCUPÉRER</button>` : C.rr ? '' : `<button type="button" class="btn" data-ctrr="${i}">↻</button>`}</div>`; }).join(''));
  DT.setHTML($('plTheme'), THEMES.map(th => { const ok = th.need(S), on = (S.theme || '') === th.id;
    return `<button type="button" class="pl-chip${on ? ' on' : ''}" data-theme="${th.id}" ${ok ? '' : 'disabled'}>${esc(th.name)}${ok ? '' : ` 🔒 ${esc(th.how)}`}</button>`; }).join(''));
  DT.setHTML($('plTitle'), `<button type="button" class="pl-chip${S.title ? '' : ' on'}" data-title="">Aucun</button>` + TITLES.map(ti => { const ok = ti.need(S), on = S.title === ti.id;
    return `<button type="button" class="pl-chip${on ? ' on' : ''}" data-title="${ti.id}" ${ok ? '' : 'disabled'}>${ok ? '' : '🔒 '}${esc(ti.name)}</button>`; }).join(''));
}
let clock = 0;
function tick(dt) {
  if (!api || !api.inGame() || !DT.clock.trusted) return;
  clock += dt; if (clock < 1) return; clock = 0;
  render(false);
}
function enter() { st(); applyTheme(); }
function init(a) {
  api = a;
  $('tab-plus').addEventListener('click', e => {
    const g = s => e.target.closest(s);
    let b;
    if ((b = g('[data-mkt]'))) return buyOffer(b.dataset.mkt);
    if ((b = g('[data-exp]'))) { const [i, id] = b.dataset.exp.split(':'); return expStart(+i, id); }
    if ((b = g('[data-expc]'))) return expClaim(+b.dataset.expc);
    if ((b = g('[data-ctr]'))) return ctrClaim(+b.dataset.ctr);
    if ((b = g('[data-ctrr]'))) return ctrReroll(+b.dataset.ctrr);
    if ((b = g('[data-theme]'))) return setTheme(b.dataset.theme);
    if ((b = g('[data-title]'))) return setTitle(b.dataset.title);
  });
}

DT.Plus = {init, enter, tick, onCrush, render: () => render(true), RELICS, giveRelic,
  mult: k => api ? relEff()[k] || 1 : 1, luck: () => api ? relEff().luck : 0,
  title: () => { if (!api) return ''; const t = TITLES.find(x => x.id === api.S.title); return t ? t.name : ''; }};

})(window.DT);
