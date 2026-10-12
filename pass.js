/* Dopamine Tycoon : le Pass Dopamine. 30 paliers débloqués par l'XP (chaque point d'XP compte aussi pour le pass),
 * avec une récompense à récupérer à chaque palier. Après le palier 30, un coffre doré tous les 400 points. */
window.DT = window.DT || {};
(function (DT) {
'use strict';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const STEP = 400, TIERS = 30;
let api = null;

/* ---------- Récompenses ---------- */
const chest = (type, label) => ({kind: 'chest', type, label, art: () => DT.chestSVG(type), to: 'chestSlots',
  fx: () => api.give(type, 'Pass Dopamine')});
const R = {
  wood: chest('wood', 'Coffre en bois'), gold: chest('gold', 'Coffre doré'), magic: chest('magic', 'Coffre magique'), legend: chest('legend', 'Coffre légendaire'),
  spins2: {label: '2 tours de roue', art: '2×', cls: 'ps-spin', to: 'wheelBtn', fx: () => { api.S.spins = (api.S.spins || 0) + 2; }},
  spins3: {label: '3 tours de roue', art: '3×', cls: 'ps-spin', to: 'wheelBtn', fx: () => { api.S.spins = (api.S.spins || 0) + 3; }},
  ticket: {label: '1 ticket à gratter', art: '?', cls: 'ps-ticket', to: 'scratchBtn', fx: () => { api.S.tickets = (api.S.tickets || 0) + 1; }},
  tickets2: {label: '2 tickets à gratter', art: '??', cls: 'ps-ticket', to: 'scratchBtn', fx: () => { api.S.tickets = (api.S.tickets || 0) + 2; }},
  tickets3: {label: '3 tickets à gratter', art: '???', cls: 'ps-ticket', to: 'scratchBtn', fx: () => { api.S.tickets = (api.S.tickets || 0) + 3; }},
  prod: {label: 'Production ×3 pendant 60 s', art: '×3', cls: 'ps-prod', to: 'dps', fx: () => api.buff('prod', 3, 60, 'Pass ×3')},
  hype: {label: 'Hype immédiate', art: 'HYPE', cls: 'ps-hype', to: 'fever', fx: () => {
    // Si une Hype tourne déjà, on la prolonge par un bonus équivalent plutôt que de la relancer.
    if (DT.Extras.feverOn()) api.buff('prod', 5, 15, 'Pass HYPE ×5'); else DT.Extras.startFever();
  }},
  time15: {label: '15 min de production', art: '+15', cls: 'ps-time', to: 'bank', fx: () => api.gainTime(900)},
  time30: {label: '30 min de production', art: '+30', cls: 'ps-time', to: 'bank', fx: () => api.gainTime(1800)},
  time60: {label: '1 h de production', art: '+1 h', cls: 'ps-time', to: 'bank', fx: () => api.gainTime(3600)},
  mega: {label: 'Méga-Presse rechargée', art: 'MÉGA', cls: 'ps-mega', to: 'megaBtn', fx: () => { api.S.mega = 100; }},
};
// Les paliers 10, 20 et 30 donnent un coffre légendaire.
const LADDER = [
  'wood', 'spins2', 'ticket', 'prod', 'gold', 'time15', 'mega', 'hype', 'tickets2', 'legend',
  'gold', 'spins3', 'time30', 'magic', 'prod', 'mega', 'tickets2', 'hype', 'time60', 'legend',
  'magic', 'spins3', 'mega', 'gold', 'hype', 'time60', 'tickets3', 'magic', 'prod', 'legend',
].map(k => R[k]);

/* ---------- État ---------- */
function P() {
  const S = api.S;
  if (!S.pass || typeof S.pass !== 'object') S.pass = {pts: 0, claimed: [], bonus: 0};
  if (!Array.isArray(S.pass.claimed)) S.pass.claimed = [];
  return S.pass;
}
const tierOf = pts => Math.min(TIERS, Math.floor(pts / STEP));
const bonusReady = p => Math.max(0, Math.floor(Math.max(0, p.pts - TIERS * STEP) / STEP) - (p.bonus || 0));
function ready() {
  const p = P(), t = tierOf(p.pts);
  let n = 0;
  for (let k = 0; k < t; k++) if (!p.claimed.includes(k)) n++;
  return n + bonusReady(p);
}
function add(n) {
  if (!(n > 0) || !api) return;
  const p = P(), before = tierOf(p.pts), bBefore = bonusReady(p);
  p.pts += n;
  const after = tierOf(p.pts);
  if (after > before) {
    api.A.questDone();
    api.toast(`<b>Pass Dopamine : palier ${after}</b> atteint. Récompense : ${esc(LADDER[after - 1].label)}.`, 'mint');
    if (!$('passModal').hidden) render();
  } else if (bonusReady(p) > bBefore) {
    api.toast('<b>Pass Dopamine</b> : un coffre doré bonus à récupérer.', 'mint');
    if (!$('passModal').hidden) render();
  }
}

/* ---------- Récupération ---------- */
function flyFrom(el, r) {
  const b = el.getBoundingClientRect(), x = b.left + b.width / 2, y = b.top + b.height / 2;
  api.confetti(x, y, 24);
  const target = $(r.to);
  if (target) api.flyTo(x, y, target, 12, r.kind === 'chest' ? '#FFD23F' : '#5FE0B7');
}
// Un coffre ne peut pas être récupéré si les emplacements sont pleins : il serait perdu.
function chestBlocked(r, quiet) {
  if (r.kind !== 'chest' || !DT.Cards.full()) return false;
  if (!quiet) {
    api.A.denied();
    api.toast('Tes emplacements de coffres sont pleins. Ouvre un coffre avant de récupérer cette récompense.', 'coral');
  }
  return true;
}
function claim(k, el, quiet) {
  const p = P();
  if (k >= tierOf(p.pts) || p.claimed.includes(k)) return false;
  const r = LADDER[k];
  if (chestBlocked(r, quiet)) return false;
  p.claimed.push(k);
  r.fx();
  if (el) flyFrom(el, r);
  if (k % 10 === 9) { api.A.jackpot(); api.flash('#5CFFE1'); } else api.A.upgrade();
  if (k === TIERS - 1) { api.banner('PASS', 'COMPLET', 'Un coffre doré bonus tous les 400 points'); api.addFeed('Tu termines le <b>Pass Dopamine</b> !'); }
  return true;
}
function claimBonus(el, quiet) {
  const p = P();
  if (bonusReady(p) <= 0 || chestBlocked(R.gold, quiet)) return false;
  p.bonus = (p.bonus || 0) + 1;
  R.gold.fx();
  if (el) flyFrom(el, R.gold);
  api.A.upgrade();
  return true;
}
// Récupère tout, une récompense toutes les 140 ms. Les coffres qui ne rentrent plus restent à récupérer,
// avec un seul avertissement.
function claimAll() {
  const p = P(), t = tierOf(p.pts), list = [];
  for (let k = 0; k < t; k++) if (!p.claimed.includes(k)) list.push(k);
  for (let i = bonusReady(p); i > 0; i--) list.push('bonus');
  let warned = false;
  const next = () => {
    const k = list.shift();
    if (k === undefined) { api.save(); return; }
    const chestFull = DT.Cards.full() && (k === 'bonus' || LADDER[k].kind === 'chest');
    const ok = k === 'bonus' ? claimBonus($('psAll'), warned) : claim(k, $('psGrid').querySelector(`[data-k="${k}"]`), warned);
    if (!ok && chestFull) warned = true;
    render(); api.onChange();
    setTimeout(next, ok ? 140 : 0);
  };
  next();
}

/* ---------- Interface ---------- */
function tileArt(r) { return r.kind === 'chest' ? r.art() : `<b class="${r.cls}">${esc(r.art)}</b>`; }
function render() {
  const p = P(), t = tierOf(p.pts);
  const into = t < TIERS ? p.pts - t * STEP : (p.pts - TIERS * STEP) % STEP;
  $('psInfo').innerHTML = t < TIERS
    ? `Palier <b>${t} / ${TIERS}</b> · ${Math.floor(into)} / ${STEP} points vers le palier ${t + 1}. Chaque point d'XP compte : taper, écraser, finir des pop-it, ouvrir des coffres.`
    : `Pass complet ! Encore ${STEP - Math.floor(into)} points avant le prochain coffre doré bonus.`;
  DT.setStyle($('psFill'), 'width', Math.round(Math.min(1, into / STEP) * 100) + '%');
  $('psGrid').innerHTML = LADDER.map((r, k) => {
    const got = p.claimed.includes(k), ok = !got && k < t;
    const state = got ? 'done' : ok ? 'ready' : 'locked';
    return `<button type="button" class="ps-tile ${state}${k % 10 === 9 ? ' big' : ''}" data-k="${k}" ${ok ? '' : 'aria-disabled="true"'}>
      <small>${k + 1}</small><span class="ps-art">${tileArt(r)}</span><span class="ps-lab">${esc(r.label)}</span>
      <em>${got ? 'Récupéré' : ok ? 'RÉCUPÉRER' : `${(k + 1) * STEP} pts`}</em></button>`;
  }).join('');
  const b = bonusReady(p);
  $('psBonus').textContent = t < TIERS ? 'Après le palier 30 : un coffre doré tous les 400 points.'
    : b ? `${b} coffre${b > 1 ? 's' : ''} doré${b > 1 ? 's' : ''} bonus à récupérer.` : 'Un coffre doré bonus tous les 400 points.';
  const n = ready();
  DT.setDisabled($('psAll'), n <= 0);
  DT.setText($('psAll'), n > 0 ? `TOUT RÉCUPÉRER (${n})` : 'RIEN À RÉCUPÉRER');
}
// Petite barre sous la jauge Hype, mise à jour avec le reste de l'interface.
function tick() {
  const p = P(), t = tierOf(p.pts), n = ready();
  const into = t < TIERS ? (p.pts - t * STEP) / STEP : ((p.pts - TIERS * STEP) % STEP) / STEP;
  DT.setText($('passTier'), t < TIERS ? `palier ${t}` : 'complet');
  DT.setStyle($('passFill'), 'width', Math.round(into * 100) + '%');
  DT.setText($('passDot'), n);
  DT.setHidden($('passDot'), n <= 0);
  DT.setClass($('passBar'), 'ps-bar' + (n > 0 ? ' ready' : ''));
}
function open() {
  render();
  $('passModal').hidden = false;
  api.A.click();
}
function init(a) {
  api = a;
  $('passBar').addEventListener('click', open);
  $('psClose').addEventListener('click', () => { $('passModal').hidden = true; api.save(); });
  $('psAll').addEventListener('click', claimAll);
  $('psGrid').addEventListener('click', e => {
    const b = e.target.closest('.ps-tile.ready'); if (!b) return;
    if (claim(+b.dataset.k, b)) { render(); api.onChange(); api.save(); }
  });
}

DT.Pass = {init, add, tick, open, ready, tierOf: pts => tierOf(pts), STEP, TIERS};

})(window.DT);
