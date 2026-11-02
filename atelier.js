/* Dopamine Tycoon : l'onglet Atelier (v1.29).
 *  - Pêche : 24 poissons à collectionner (lancer, attendre la touche, ferrer à temps) ;
 *  - Jardin : 6 parcelles, 8 graines qui poussent en temps réel (5 min à 24 h) ;
 *  - Horoscope : 12 signes, un bonus différent chaque jour ;
 *  - Talismans : 10 talismans à améliorer avec les écailles (pêche et jardin).
 * État : S.fish, S.scales, S.garden, S.talis, S.hor (gardés à la cure). */
window.DT = window.DT || {};
(function (DT) {
'use strict';

const $ = id => document.getElementById(id);
const now = () => DT.now();
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const HOUR = 36e5, DAY = 864e5, MIN = 6e4;
const today = () => Math.floor(now() / DAY);
function hash(n) { let x = Math.imul(n | 0, 2654435761) ^ 0x5bd1e995; x = Math.imul(x ^ (x >>> 15), 2246822519); return (x ^ (x >>> 13)) >>> 0; }
const clockStr = ms => { const s = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min ${String(s % 60).padStart(2, '0')}`; };
let api = null, ver = 0;
function st() {
  const S = api.S;
  if (!S.fish || typeof S.fish !== 'object') S.fish = {};
  if (!S.talis || typeof S.talis !== 'object') S.talis = {};
  if (!Array.isArray(S.garden)) S.garden = [null, null, null, null, null, null];
  if (!S.hor) S.hor = {sign: -1, since: -1};
  return S;
}

/* ======================= Talismans ======================= */
const TALIS = [
  {id: 'prod', ic: '🏭', name: 'Talisman de la presse', desc: 'Production ×1,25 par niveau', base: 5},
  {id: 'tap', ic: '👆', name: 'Talisman du doigt', desc: 'Taps ×1,3 par niveau', base: 5},
  {id: 'xp', ic: '📘', name: 'Talisman du savoir', desc: 'XP ×1,1 par niveau', base: 10},
  {id: 'ser', ic: '🪷', name: 'Talisman du calme', desc: 'Sérénité gagnée ×1,15 par niveau', base: 10},
  {id: 'luck', ic: '🍀', name: 'Talisman du trèfle', desc: 'Casino et machines +0,5 % par niveau', base: 25, max: 10},
  {id: 'fish', ic: '🎣', name: 'Talisman du pêcheur', desc: 'Gains de pêche ×1,5 et poissons rares plus fréquents', base: 8},
  {id: 'garden', ic: '🌱', name: 'Talisman du jardinier', desc: 'Les plantes poussent 7 % plus vite par niveau', base: 15, max: 10},
  {id: 'scales', ic: '🐚', name: 'Talisman des marées', desc: 'Écailles gagnées ×1,2 par niveau', base: 20},
  {id: 'horo', ic: '🔮', name: 'Talisman des astres', desc: 'Bonus de l\'horoscope +20 % par niveau', base: 30},
  {id: 'ultime', ic: '🌌', name: 'Talisman ultime', desc: 'Production ×3 par niveau', base: 500},
];
const tl = id => (st().talis[id] || 0);
const talCost = t => Math.ceil(t.base * Math.pow(1.6, tl(t.id)));
function buyTal(id) {
  const S = st(), t = TALIS.find(x => x.id === id);
  if (!t || (t.max && tl(id) >= t.max)) return;
  const c = talCost(t);
  if ((S.scales || 0) < c) { api.A.denied(); return; }
  S.scales -= c; S.talis[id] = tl(id) + 1; ver++;
  api.A.upgrade(); api.toast(`${t.ic} <b>${t.name}</b> niveau ${S.talis[id]} !`, 'mint');
  api.save(); api.onChange(); render(true);
}
function addScales(n) { const S = st(); n = Math.ceil(n * Math.pow(1.2, tl('scales'))); S.scales = (S.scales || 0) + n; return n; }

/* ======================= Horoscope ======================= */
const SIGNS = [['♈', 'Bélier'], ['♉', 'Taureau'], ['♊', 'Gémeaux'], ['♋', 'Cancer'], ['♌', 'Lion'], ['♍', 'Vierge'],
  ['♎', 'Balance'], ['♏', 'Scorpion'], ['♐', 'Sagittaire'], ['♑', 'Capricorne'], ['♒', 'Verseau'], ['♓', 'Poissons']];
const FORE = [
  {k: 'prod', v: 3, txt: v => `production ×${fmtN(v)}`, say: 'Les astres font tourner ta presse à plein régime.'},
  {k: 'tap', v: 5, txt: v => `taps ×${fmtN(v)}`, say: 'Mars te donne des doigts de feu.'},
  {k: 'xp', v: 2, txt: v => `XP ×${fmtN(v)}`, say: 'Mercure aiguise ton esprit.'},
  {k: 'ser', v: 2, txt: v => `Sérénité ×${fmtN(v)}`, say: 'Vénus t\'apaise : la cure rapporte plus.'},
  {k: 'luck', v: 0.05, txt: v => `chance +${Math.round(v * 100)} %`, say: 'Jupiter te sourit au casino.'},
  {k: 'fish', v: 2, txt: v => `pêche ×${fmtN(v)}`, say: 'Neptune remplit tes filets.'},
];
const fmtN = v => (Math.round(v * 100) / 100).toString().replace('.', ',');
function horo() {
  const S = st(), d = today();
  if (S.hor.sign < 0 || S.hor.since >= d || !DT.clock.trusted) return null;
  const f = FORE[hash(d * 12 + S.hor.sign + 7) % FORE.length], s = 1 + 0.2 * tl('horo');
  return {k: f.k, v: f.k === 'luck' ? f.v * s : 1 + (f.v - 1) * s, f};
}
function setSign(i) {
  const S = st();
  if (i === S.hor.sign) return;
  S.hor = {sign: i, since: S.hor.sign >= 0 ? today() : -1}; ver++;  // premier choix : actif tout de suite ; changement : actif demain
  api.A.click(); api.save(); api.onChange(); render(true);
}

/* ======================= Pêche ======================= */
const FISH = [
  ['boot', '🥾', 'Vieille botte', 0], ['sardine', '🐟', 'Sardine', 0], ['clown', '🐠', 'Poisson-clown', 0], ['shrimp', '🦐', 'Crevette', 0],
  ['shell', '🐚', 'Coquillage', 0], ['frog', '🐸', 'Grenouille', 0], ['puffer', '🐡', 'Poisson-globe', 1], ['crab', '🦀', 'Crabe', 1],
  ['lobster', '🦞', 'Homard', 1], ['turtle', '🐢', 'Tortue', 1], ['jelly', '🪼', 'Méduse', 1], ['octo', '🐙', 'Poulpe', 2],
  ['squid', '🦑', 'Calmar', 2], ['dolphin', '🐬', 'Dauphin', 2], ['seal', '🦭', 'Phoque', 2], ['croc', '🐊', 'Crocodile', 2],
  ['shark', '🦈', 'Requin', 3], ['whale', '🐋', 'Baleine', 3], ['sperm', '🐳', 'Cachalot', 3], ['mermaid', '🧜', 'Sirène', 3],
  ['dragon', '🐉', 'Dragon des mers', 4], ['diamond', '💎', 'Poisson de diamant', 4], ['king', '👑', 'Roi des abysses', 4], ['phone', '📱', 'Téléphone tombé à l\'eau', 4],
].map(([id, ic, name, r]) => ({id, ic, name, r}));
const RAR = [{n: 'commun', w: 60, first: 1.05, sec: 3, sc: 1, col: '#8FB8FF'}, {n: 'rare', w: 25, first: 1.1, sec: 10, sc: 3, col: '#FF9F1C'},
  {n: 'épique', w: 10, first: 1.25, sec: 40, sc: 10, col: '#C77DFF'}, {n: 'légendaire', w: 4, first: 1.5, sec: 180, sc: 40, col: '#5CFFE1'},
  {n: 'mythique', w: 1, first: 2, sec: 900, sc: 200, col: '#FFD23F'}];
const fishing = {st: 'idle', t: 0};
const fishMult = () => { const h = horo(); return Math.pow(1.5, tl('fish')) * (h && h.k === 'fish' ? h.v : 1); };
function cast() {
  if (!api.inGame()) return;
  if (fishing.st === 'bite') return strike();
  if (fishing.st === 'wait') { fishing.st = 'idle'; msg('Trop tôt ! Le poisson a eu peur.'); api.A.denied(); return; }
  fishing.st = 'wait'; fishing.t = now() + 1500 + Math.random() * 3500;
  msg('La ligne est à l\'eau… attends que ça morde !'); api.A.click();
}
function strike() {
  const S = st(), boost = 1 + 0.15 * tl('fish');
  fishing.st = 'idle';
  const w = RAR.map((r, i) => r.w * (i ? boost : 1)), tot = w.reduce((a, b) => a + b, 0);
  let x = Math.random() * tot, r = 0;
  while (x >= w[r] && r < 4) x -= w[r++];
  const pool = FISH.filter(f => f.r === r), f = pool[Math.floor(Math.random() * pool.length)], R = RAR[r], first = !S.fish[f.id];
  S.fish[f.id] = (S.fish[f.id] || 0) + 1; S.fishCaught = (S.fishCaught || 0) + 1; ver++;
  const g = api.gainTime(R.sec * fishMult()), sc = addScales(R.sc);
  if (r === 3) api.give('gold', 'pêche'); if (r === 4) api.give('legend', 'pêche');
  msg(`${f.ic} ${f.name} (${R.n}) ! +${api.fmt(g)} · +${sc} 🐚${first ? ' · NOUVEAU : production ×' + fmtN(R.first) : ''}`);
  if (first || r >= 3) { api.banner('PÊCHE', `${f.ic} ${f.name.toUpperCase()}`, first ? `Nouvelle espèce ! Production ×${fmtN(R.first)} pour toujours.` : `Prise ${R.n} !`); api.confetti(innerWidth / 2, innerHeight * 0.45, 40 + r * 30); }
  r >= 3 ? api.A.jackpot() : api.A.buy();
  api.save(); api.onChange(); renderAqua();
}
function msg(t) { DT.setText($('atFishMsg'), t); }
function fishTick() {
  const t = now(), b = $('atCast');
  if (fishing.st === 'wait' && t >= fishing.t) { fishing.st = 'bite'; fishing.t = t + 850; msg('ÇA MORD ! FERRE VITE !'); api.A.click(); }
  else if (fishing.st === 'bite' && t >= fishing.t) { fishing.st = 'idle'; msg('Raté… il s\'est échappé.'); }
  DT.setText(b, fishing.st === 'bite' ? '🐟 FERRER !' : fishing.st === 'wait' ? '⏳ …' : '🎣 LANCER');
  DT.setClass(b, fishing.st === 'bite' ? 'btn-hero at-cast bite' : 'btn-hero at-cast');
}

/* ======================= Jardin ======================= */
const SEEDS = [
  {id: 'radish', ic: '🥕', name: 'Radis', ms: 5 * MIN, txt: '2 min de production', sc: 1, fx: () => api.gainTime(120)},
  {id: 'tulip', ic: '🌷', name: 'Tulipe', ms: 20 * MIN, txt: '10 min de production + 25 XP', sc: 2, fx: () => { api.gainTime(600); api.addXp(25); }},
  {id: 'sun', ic: '🌻', name: 'Tournesol', ms: HOUR, txt: '40 min de production + 1 ticket', sc: 4, fx: () => { api.gainTime(2400); api.S.tickets = (api.S.tickets || 0) + 1; }},
  {id: 'shroom', ic: '🍄', name: 'Champignon', ms: 2 * HOUR, txt: 'coffre doré', sc: 6, fx: () => api.give('gold', 'jardin')},
  {id: 'cactus', ic: '🌵', name: 'Cactus', ms: 4 * HOUR, txt: '3 h de production + 3 tours de roue', sc: 10, fx: () => { api.gainTime(3 * 3600); api.S.spins = (api.S.spins || 0) + 3; }},
  {id: 'bamboo', ic: '🎋', name: 'Bambou', ms: 8 * HOUR, txt: 'coffre magique + 5 tickets', sc: 20, fx: () => { api.give('magic', 'jardin'); api.S.tickets = (api.S.tickets || 0) + 5; }},
  {id: 'rose', ic: '🌹', name: 'Rose dorée', ms: 12 * HOUR, txt: 'coffre légendaire', sc: 35, fx: () => api.give('legend', 'jardin')},
  {id: 'mandra', ic: '🌿', name: 'Mandragore', ms: 24 * HOUR, txt: 'relique (1 chance sur 4) ou 2 coffres légendaires', sc: 80,
    fx: () => { if (!(Math.random() < 0.25 && DT.Plus.giveRelic('cueillie au jardin'))) { api.give('legend', 'jardin'); api.give('legend', 'jardin'); } }},
];
const PLOT_LVL = [0, 0, 0, 15, 30, 50];
const growMs = s => s.ms * Math.pow(0.93, tl('garden'));
let pickPlot = -1;
function plant(i, id) {
  const S = st(), s = SEEDS.find(x => x.id === id);
  if (!s || S.garden[i] || !DT.clock.trusted || (S.lvl || 0) < PLOT_LVL[i]) return;
  S.garden[i] = {id, until: now() + growMs(s)}; pickPlot = -1;
  api.A.click(); api.save(); render(true);
}
function harvest(i) {
  const S = st(), p = S.garden[i];
  if (!p || now() < p.until) return;
  const s = SEEDS.find(x => x.id === p.id);
  S.garden[i] = null; S.harvests = (S.harvests || 0) + 1;
  s.fx(); const sc = addScales(s.sc);
  api.toast(`${s.ic} <b>${s.name}</b> récolté : ${s.txt} · +${sc} 🐚`, 'mint');
  api.confetti(innerWidth / 2, innerHeight * 0.5, 30); api.A.upgrade();
  api.save(); api.onChange(); render(true);
}
function harvestAll() { st().garden.forEach((p, i) => { if (p && now() >= p.until) harvest(i); }); }

/* ======================= Bonus ======================= */
let cache = {ver: -1, S: null, d: -1, v: null};
function eff() {
  const S = st(), d = today();
  if (cache.ver === ver && cache.S === S && cache.d === d) return cache.v;
  const v = {prod: Math.pow(1.25, tl('prod')) * Math.pow(3, tl('ultime')), tap: Math.pow(1.3, tl('tap')), xp: Math.pow(1.1, tl('xp')), ser: Math.pow(1.15, tl('ser')), luck: 0.005 * tl('luck')};
  for (const f of FISH) if (S.fish[f.id]) v.prod *= RAR[f.r].first;
  const h = horo();
  if (h) { if (h.k === 'luck') v.luck += h.v; else if (v[h.k]) v[h.k] *= h.v; }
  cache = {ver, S, d, v};
  return v;
}

/* ======================= Affichage ======================= */
function renderAqua() {
  const S = st(), n = FISH.filter(f => S.fish[f.id]).length;
  DT.setHTML($('atAqua'), `<p class="small">${n}/${FISH.length} espèces · ${api.fmt(S.fishCaught || 0)} prises · ${api.fmt(S.scales || 0)} 🐚 écailles</p><div class="at-aqua">${FISH.map(f => {
    const c = S.fish[f.id] || 0;
    return `<span class="at-f${c ? ' got' : ''}" style="--rc:${RAR[f.r].col}" title="${esc(c ? `${f.name} (${RAR[f.r].n}) : ${c} prise${c > 1 ? 's' : ''}` : `Espèce inconnue (${RAR[f.r].n})`)}">${c ? f.ic : '❔'}</span>`; }).join('')}</div>`);
}
function render(force) {
  if (!api || ($('tab-atel').hidden && !force)) return;
  const S = st(), t = now(), fmt = api.fmt;
  renderAqua();
  DT.setHTML($('atGarden'), `<div class="at-plots">${S.garden.map((p, i) => {
    if ((S.lvl || 0) < PLOT_LVL[i]) return `<div class="at-plot lock">🔒<small>niveau ${PLOT_LVL[i]}</small></div>`;
    if (!p) return `<button type="button" class="at-plot${pickPlot === i ? ' on' : ''}" data-plot="${i}">🟫<small>planter</small></button>`;
    const s = SEEDS.find(x => x.id === p.id), ok = t >= p.until;
    return ok ? `<button type="button" class="at-plot ripe" data-harv="${i}">${s.ic}<small>RÉCOLTER</small></button>`
      : `<div class="at-plot grow">🌱<small>${s.name} · ${clockStr(p.until - t)}</small></div>`; }).join('')}</div>` +
    (pickPlot >= 0 ? `<div class="at-seeds">${SEEDS.map(s => `<button type="button" class="fn-boost ok" data-seed="${s.id}"><span>${s.ic}</span><b>${s.name} · ${clockStr(growMs(s))}</b><em>${s.txt} · +${s.sc} 🐚</em></button>`).join('')}</div>` : '') +
    (S.garden.some(p => p && t >= p.until) ? '<button type="button" class="btn mint" data-harvall>TOUT RÉCOLTER</button>' : ''));
  const h = horo();
  DT.setHTML($('atHoro'), `<div class="pl-chips">${SIGNS.map(([ic, n], i) => `<button type="button" class="pl-chip${S.hor.sign === i ? ' on' : ''}" data-sign="${i}">${ic} ${n}</button>`).join('')}</div>
    <p class="at-fore">${S.hor.sign < 0 ? 'Choisis ton signe pour recevoir ton horoscope chaque jour.' : h ? `<b>${SIGNS[S.hor.sign][0]} ${SIGNS[S.hor.sign][1]} :</b> ${h.f.say} Aujourd'hui, <b>${h.f.txt(h.v)}</b>.` : `Nouveau signe : ton horoscope commence demain.`}</p>`);
  DT.setHTML($('atTalis'), `<p class="small">${fmt(S.scales || 0)} 🐚 écailles (pêche et jardin).</p>` + TALIS.map(x => { const lv = tl(x.id), mx = x.max && lv >= x.max, c = talCost(x);
    return `<div class="at-tal"><span>${x.ic}</span><div><b>${x.name} · niv. ${lv}</b><small>${x.desc}</small></div>${mx ? '<em class="fn-max">MAX</em>' : `<button type="button" class="btn${(S.scales || 0) >= c ? ' mint' : ''}" data-tal="${x.id}">${fmt(c)} 🐚</button>`}</div>`; }).join(''));
}
let clock = 0;
function tick(dt) {
  if (!api || !api.inGame()) return;
  if (fishing.st !== 'idle' || !$('tab-atel').hidden) fishTick();
  clock += dt; if (clock < 1) return; clock = 0;
  render(false);
}
function enter() { st(); ver++; fishing.st = 'idle'; }
function init(a) {
  api = a;
  $('atCast').addEventListener('click', cast);
  $('tab-atel').addEventListener('click', e => {
    const g = s => e.target.closest(s);
    let b;
    if ((b = g('[data-plot]'))) { pickPlot = pickPlot === +b.dataset.plot ? -1 : +b.dataset.plot; return render(true); }
    if ((b = g('[data-seed]'))) return plant(pickPlot, b.dataset.seed);
    if ((b = g('[data-harv]'))) return harvest(+b.dataset.harv);
    if (g('[data-harvall]')) return harvestAll();
    if ((b = g('[data-sign]'))) return setSign(+b.dataset.sign);
    if ((b = g('[data-tal]'))) return buyTal(b.dataset.tal);
  });
}

DT.Atel = {init, enter, tick, render: () => render(true), FISH,
  mult: k => api ? eff()[k] || 1 : 1, luck: () => api ? eff().luck : 0};

})(window.DT);
