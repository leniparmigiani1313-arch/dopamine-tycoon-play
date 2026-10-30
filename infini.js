/* Dopamine Tycoon : l'onglet Infini (v1.26). Ce qui rend le jeu presque sans fin :
 *  - jalons infinis : chaque puissance de 10 de la production totale donne +2 % pour toujours ;
 *  - arbre de talents (40 talents, 4 branches) acheté avec les Éclats d'éternité (S.tal, S.eclatsSpent) ;
 *  - automatisations débloquées par les talents (S.auto : interrupteurs) ;
 *  - 8 défis à 5 niveaux (S.chal en cours, S.chalDone) : une partie avec un handicap, chaque niveau réussi ×3 ;
 *  - la Renaissance : 3e remise à zéro, contre des Étoiles (S.etoiles : production ×10, Sérénité ×2, Éclats ×1,5). */
window.DT = window.DT || {};
(function (DT) {
'use strict';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
let api = null;

/* ---------- Talents ---------- */
const COST = [1, 2, 3, 5, 8, 13, 25, 50, 100, 250];
const BR = [
  {id: 'p', name: '🏭 Production', nodes: [['×3', {prod: 3}], ['×3', {prod: 3}], ['×5', {prod: 5}], ['×5', {prod: 5}], ['×10', {prod: 10}], ['×10', {prod: 10}],
    ['×25', {prod: 25}], ['×50', {prod: 50}], ['×100', {prod: 100}], ['×1 000', {prod: 1000}]].map(([n, e]) => ({name: 'Production ' + n, desc: `Production ${n}, pour toujours.`, eff: e}))},
  {id: 'a', name: '🤖 Automatisation', nodes: [
    {name: 'Achat auto des mécaniques', desc: 'Achète toutes seules les mécaniques abordables.', auto: 'gens'},
    {name: 'Achat auto des améliorations', desc: 'Achète toutes seules les améliorations abordables.', auto: 'ups'},
    {name: 'Méga-Presse auto', desc: 'Lance la Méga-Presse dès qu\'elle est pleine.', auto: 'mega'},
    {name: 'Dopa nourri tout seul', desc: 'Nourrit Dopa quand il a faim.', auto: 'pet'},
    {name: 'Coffre-fort auto', desc: 'Lance et ouvre le coffre-fort tout seul.', auto: 'vault'},
    {name: 'Loterie auto', desc: 'Prend ta grille gratuite et regarde le tirage tout seul.', auto: 'lotto'},
    {name: 'Infinies auto', desc: 'Achète tout seul les niveaux des améliorations infinies.', auto: 'inf'},
    {name: 'Cure auto', desc: 'Part en cure de désintox dès qu\'elle double ta Sérénité.', auto: 'detox'},
    {name: 'Sagesses auto', desc: 'Achète toutes seules les sagesses et sagesses infinies abordables.', auto: 'sag'},
    {name: 'Transcendance auto', desc: 'Transcende dès que ça double tes Éclats.', auto: 'trans'}]},
  {id: 'l', name: '🍀 Chance et jeux', nodes: [
    {name: 'Croupier complice', desc: 'Casino +2 % de chances.', eff: {casino: 0.02}},
    {name: 'Rouleaux dociles', desc: 'Machines à sous +2 % de chances.', eff: {slots: 0.02}},
    {name: 'Champ de trèfles', desc: 'Les trèfles à 4 feuilles arrivent 2 fois plus souvent.', eff: {clover: 2}},
    {name: 'Frénésie dorée', desc: 'Les frénésies réussies donnent un coffre magique en plus.', eff: {frenzy: 1}},
    {name: 'Tickets marqués', desc: 'Tickets : +10 % de chances de retirer un perdant.', eff: {ticket: 0.1}},
    {name: 'Coffres sacrés', desc: 'Coffres : +10 % de chances de rareté tirée deux fois.', eff: {chest: 0.1}},
    {name: 'Cagnotte double', desc: 'Le jackpot progressif grossit 2 fois plus vite.', eff: {pot: 2}},
    {name: 'Roue généreuse', desc: 'Un tour de roue gratuit toutes les 5 min au lieu de 10.', eff: {wheel: 1}},
    {name: 'Main chaude', desc: 'Casino et machines +3 %.', eff: {casino: 0.03, slots: 0.03}},
    {name: 'Chance absolue', desc: 'Casino et machines +5 %, tickets et coffres +10 %.', eff: {casino: 0.05, slots: 0.05, ticket: 0.1, chest: 0.1}}]},
  {id: 's', name: '🌌 Sérénité et éternité', nodes: [
    {name: 'Calme intérieur', desc: 'Sérénité gagnée ×2.', eff: {ser: 2}},
    {name: 'Sommeil profond', desc: 'Hors ligne : production à 100 %.', eff: {offRate: 1}},
    {name: 'Hibernation', desc: 'Hors ligne : jusqu\'à 48 h au lieu de 8 h.', eff: {offH: 48}},
    {name: 'Sérénité ×3', desc: 'Sérénité gagnée ×3.', eff: {ser: 3}},
    {name: 'Éclats ×2', desc: 'Éclats gagnés à la Transcendance ×2.', eff: {eclat: 2}},
    {name: 'Sérénité ×5', desc: 'Sérénité gagnée ×5.', eff: {ser: 5}},
    {name: 'Éclats ×2', desc: 'Éclats gagnés ×2.', eff: {eclat: 2}},
    {name: 'Pouce divin', desc: 'Taps ×100.', eff: {tap: 100}},
    {name: 'Éclats ×3', desc: 'Éclats gagnés ×3.', eff: {eclat: 3}},
    {name: 'Porte de la Renaissance', desc: 'Débloque la Renaissance (3e remise à zéro).', eff: {reb: 1}}]},
];
const tal = () => { const S = api.S; if (!S.tal || typeof S.tal !== 'object') S.tal = {}; return S.tal; };
const owned = (b, k) => !!tal()[b + k];
const eclAvail = () => Math.max(0, (api.S.eclats || 0) - (api.S.eclatsSpent || 0));
// effets cumulés des talents, recalculés seulement quand le nombre de talents change
let cacheN = -1, cacheS = null, E = null;
function effs() {
  const t = tal(), n = Object.keys(t).length;
  if (n === cacheN && cacheS === api.S) return E;
  E = {prod: 1, tap: 1, ser: 1, eclat: 1, casino: 0, slots: 0, ticket: 0, chest: 0, clover: 1, frenzy: 0, pot: 1, wheel: 0, offRate: 0, offH: 0, reb: 0, auto: {}};
  for (const b of BR) b.nodes.forEach((nd, k) => {
    if (!t[b.id + k]) return;
    if (nd.auto) E.auto[nd.auto] = 1;
    for (const key in nd.eff || {}) {
      const v = nd.eff[key];
      if (['prod', 'tap', 'ser', 'eclat', 'clover', 'pot'].includes(key)) E[key] *= v;
      else if (key === 'offH') E.offH = Math.max(E.offH, v); else E[key] += v;
    }
  });
  cacheN = n; cacheS = api.S;
  return E;
}
function buyTal(b, k) {
  const S = api.S, br = BR.find(x => x.id === b);
  if (!br || owned(b, k) || (k > 0 && !owned(b, k - 1))) return;
  if (eclAvail() < COST[k]) { api.A.denied(); return; }
  S.eclatsSpent = (S.eclatsSpent || 0) + COST[k]; tal()[b + k] = 1;
  const nd = br.nodes[k];
  if (nd.auto) { S.auto = S.auto || {}; S.auto[nd.auto] = true; }
  api.A.upgrade(); api.confetti(innerWidth / 2, innerHeight * 0.4, 50);
  api.toast(`Talent débloqué : <b>${esc(nd.name)}</b>`, 'mint');
  api.save(); api.onChange(); render(true);
}

/* ---------- Défis ---------- */
const CHAL = [
  {id: 'notap', name: 'Sans les mains', desc: 'Les taps ne rapportent rien.'},
  {id: 'prod10', name: 'Panne de courant', desc: 'Production ÷10.'},
  {id: 'cost10', name: 'Inflation', desc: 'Les mécaniques coûtent 10 fois plus.'},
  {id: 'noup', name: 'Sans paliers', desc: 'Les paliers des mécaniques ne doublent plus rien.'},
  {id: 'd2', name: 'Récepteurs en miettes', desc: 'Les récepteurs D2 s\'usent 3 fois plus vite.'},
  {id: 'noser', name: 'Sans Sérénité', desc: 'La Sérénité ne donne plus de bonus.'},
  {id: 'nocard', name: 'Écran noir', desc: 'Cartes et stimulations ne donnent plus de bonus.'},
  {id: 'ultra', name: 'Cauchemar ultime', desc: 'Production ÷100 et mécaniques 10 fois plus chères.'},
];
const CHAL_MAX = 5;
const goal = n => Math.pow(10, 12 + 8 * n);  // niveau 1 : 1e12 produits dans la partie, puis ×1e8 à chaque niveau
const done = id => ((api.S.chalDone || {})[id]) || 0;
const inChal = id => !!api && api.S.chal === id;
function enterChal(id) {
  const S = api.S;
  if (S.chal || done(id) >= CHAL_MAX || !(S.trans > 0)) { api.A.denied(); return; }
  api.challenge(id);
  render(true);
}
function quitChal() { api.S.chal = null; api.toast('Défi abandonné.'); api.onChange(); render(true); }
function chalTick() {
  const S = api.S;
  if (!S.chal) return;
  const c = CHAL.find(x => x.id === S.chal), n = done(S.chal);
  if (S.run < goal(n)) return;
  S.chalDone = S.chalDone || {}; S.chalDone[S.chal] = n + 1; S.chal = null;
  api.banner('DÉFI RÉUSSI', c.name.toUpperCase(), `Niveau ${n + 1}/${CHAL_MAX} : production ×3 pour toujours !`);
  api.flash('#FFD23F'); api.confetti(innerWidth / 2, innerHeight * 0.35, 180); api.A.jackpot();
  api.addFeed(`Défi « ${esc(c.name)} » réussi (niveau ${n + 1}) !`);
  api.save(); api.onChange(); render(true);
}
const chalMult = () => { let n = 0; for (const c of CHAL) n += done(c.id); return Math.pow(3, n); };

/* ---------- Jalons, Renaissance ---------- */
const jalons = () => Math.max(0, Math.floor(Math.log10(Math.max(1, api.S.life || 0))) - 6);
const rebGain = () => { const e = api.S.eclats || 0; return effs().reb && e >= 100 ? Math.max(1, Math.floor(Math.log10(e) * 2) - 3) : 0; };
let rebArm = 0;
function rebClick() {
  const g = rebGain(); if (!g) { api.A.denied(); return; }
  if (performance.now() > rebArm) { rebArm = performance.now() + 4000; render(true); return; }
  rebArm = 0; api.renaissance(g); render(true);
}

/* ---------- Multiplicateurs pour le moteur ---------- */
function mult(k) {
  if (!api) return 1;
  const e = effs(), S = api.S, et = S.etoiles || 0;
  if (k === 'prod') return Math.pow(1.02, jalons()) * e.prod * chalMult() * Math.pow(10, et) * (inChal('prod10') ? 0.1 : 1) * (inChal('ultra') ? 0.01 : 1);
  if (k === 'tap') return inChal('notap') ? 0 : e.tap;
  if (k === 'ser') return e.ser * Math.pow(2, et);
  if (k === 'eclat') return e.eclat * Math.pow(1.5, et);
  if (k === 'cost') return inChal('cost10') || inChal('ultra') ? 10 : 1;
  if (k === 'slope') return inChal('d2') ? 3 : 1;
  return 1;
}

/* ---------- Automatisations (une fois par seconde) ---------- */
const autoOn = k => effs().auto[k] && (api.S.auto || {})[k] !== false;
function autoTick() {
  const S = api.S;
  if (autoOn('gens') || autoOn('ups') || autoOn('inf')) api.autoBuy({gens: autoOn('gens'), ups: autoOn('ups'), inf: autoOn('inf')});
  if (autoOn('mega') && (S.mega || 0) >= 100) api.megaFire();
  if (autoOn('pet') && DT.Fun) DT.Fun.autoPet();
  if (autoOn('vault') && DT.Fun) DT.Fun.autoVault();
  if (autoOn('lotto') && DT.Fun) DT.Fun.autoLotto();
  if (autoOn('sag')) api.autoSag();
  if (autoOn('detox')) { const g = api.serGain(); if (g >= 1 && g >= (S.ser || 0)) api.detoxNow(); }
  if (autoOn('trans') && DT.Fun) { const g = DT.Fun.transGain(); if (g >= 1 && g >= (S.eclats || 1)) api.transcend(g); }
}

/* ---------- Affichage ---------- */
function render(force) {
  if (!api || ($('tab-inf').hidden && !force)) return;
  const S = api.S, fmt = api.fmt, j = jalons();
  DT.setHTML($('ifJal'), `<b>${j}</b> jalon${j > 1 ? 's' : ''} · production <b>×${fmt(Math.pow(1.02, j))}</b> · prochain à ${fmt(Math.pow(10, j + 7))} nmol produites`);
  DT.setText($('ifEcl'), `${fmt(eclAvail())} Éclat${eclAvail() > 1 ? 's' : ''} à dépenser`);
  DT.setHTML($('ifTree'), BR.map(b => `<div class="if-br"><h4>${b.name}</h4>${b.nodes.map((nd, k) => {
    const got = owned(b.id, k), open = !got && (k === 0 || owned(b.id, k - 1)), ok = open && eclAvail() >= COST[k];
    const aut = nd.auto && got ? `<label class="if-sw"><input type="checkbox" data-auto="${nd.auto}" ${(S.auto || {})[nd.auto] !== false ? 'checked' : ''}> actif</label>` : '';
    return `<button type="button" class="if-node${got ? ' got' : ok ? ' ok' : open ? ' open' : ''}" data-tal="${b.id}${k}" ${got || !open ? 'aria-disabled="true"' : ''}>
      <b>${esc(nd.name)}</b><small>${esc(nd.desc)}</small><em>${got ? '✓' : open ? COST[k] + ' éclat' + (COST[k] > 1 ? 's' : '') : '🔒'}</em>${aut}</button>`; }).join('')}</div>`).join(''));
  const tr = S.trans > 0;
  DT.setHTML($('ifChal'), (S.chal ? `<p class="if-cur">Défi en cours : <b>${esc(CHAL.find(c => c.id === S.chal).name)}</b> · objectif ${fmt(goal(done(S.chal)))} nmol produites dans la partie (${fmt(S.run)}) <button type="button" class="btn" data-quit="1">Abandonner</button></p>` : '')
    + (tr ? '' : '<p class="small">Les défis se débloquent après ta première Transcendance (onglet Bonus).</p>')
    + `<div class="if-chals">${CHAL.map(c => { const n = done(c.id), max = n >= CHAL_MAX;
      return `<div class="if-chal${S.chal === c.id ? ' cur' : ''}"><b>${esc(c.name)} <em>${n}/${CHAL_MAX}</em></b><small>${esc(c.desc)} Objectif : ${fmt(goal(n))} nmol dans la partie.</small>
        ${max ? '<em class="fn-max">TERMINÉ</em>' : `<button type="button" class="btn${tr && !S.chal ? ' mint' : ''}" data-chal="${c.id}" ${tr && !S.chal ? '' : 'disabled'}>LANCER</button>`}</div>`; }).join('')}</div>
    <p class="small">Lancer un défi recommence ta partie (comme une cure, sans Sérénité). Chaque niveau réussi : production ×3 pour toujours (×${fmt(chalMult())} en tout).</p>`);
  const g = rebGain();
  DT.setHTML($('ifReb'), `<p>Étoiles : <b>${S.etoiles || 0}</b> · production ×${fmt(Math.pow(10, S.etoiles || 0))}, Sérénité ×${fmt(Math.pow(2, S.etoiles || 0))}, Éclats ×${fmt(Math.pow(1.5, S.etoiles || 0))}</p>
    <p class="small">La Renaissance efface tes Éclats, tes talents et tout ce qu'efface la Transcendance, contre des Étoiles. ${effs().reb ? (g ? `Tu gagnerais <b>${g} Étoile${g > 1 ? 's' : ''}</b>.` : 'Il faut 100 Éclats.') : 'Débloque-la avec le dernier talent de la branche Sérénité.'}</p>
    <button type="button" class="btn${g ? ' warn' : ''}" data-reb="1" ${g ? '' : 'disabled'}>${performance.now() < rebArm ? `CONFIRMER : +${g} ÉTOILE${g > 1 ? 'S' : ''}` : 'RENAISSANCE'}</button>`);
}
let clock = 0;
function tick(dt) {
  if (!api || !api.inGame() || !DT.clock.trusted) return;
  clock += dt;
  if (clock < 1) return;
  clock = 0;
  chalTick(); autoTick(); render(false);
}
function init(a) {
  api = a;
  $('tab-inf').addEventListener('click', e => {
    const t = e.target.closest('[data-tal]'); if (t) return buyTal(t.dataset.tal[0], +t.dataset.tal.slice(1));
    const c = e.target.closest('[data-chal]'); if (c) return enterChal(c.dataset.chal);
    if (e.target.closest('[data-quit]')) return quitChal();
    if (e.target.closest('[data-reb]')) return rebClick();
  });
  $('tab-inf').addEventListener('change', e => {
    const s = e.target.closest('[data-auto]'); if (!s) return;
    api.S.auto = api.S.auto || {}; api.S.auto[s.dataset.auto] = s.checked; api.save();
  });
}

DT.Inf = {init, tick, render: () => render(true), mult, eff: () => api ? effs() : {casino: 0, slots: 0, ticket: 0, chest: 0, clover: 1, frenzy: 0, pot: 1, wheel: 0, offRate: 0, offH: 0},
  noUp: () => inChal('noup'), noSer: () => inChal('noser'), noCard: () => inChal('nocard'), CHAL, BR};

})(window.DT);
