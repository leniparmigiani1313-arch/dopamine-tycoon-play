/* Dopamine Tycoon : le coach des premières minutes. Une bulle indique la prochaine action et fait briller le bon
 * bouton (sur téléphone, d'abord l'onglet du bas qui y mène). Remplace le long guide au premier lancement ;
 * le guide complet reste sur le bouton « ? ». S.tuto : étape en cours (99 = terminé). */
window.DT = window.DT || {};
(function (DT) {
'use strict';

const $ = id => document.getElementById(id);
const DONE = 99;
let api = null, glowEl = null, stepAt = 0, clock = 0, shown = -1;

const STEPS = [
  {ic: '👆', txt: 'Tape sur la presse pour produire de la dopamine !', el: () => $('stage'), view: 'play', done: S => S.clicks >= 10},
  {ic: '🛒', txt: 'Achète ta première mécanique : elle produit de la dopamine toute seule, même jeu fermé.', el: () => document.querySelector('#gens .gen'), view: 'shop', done: S => S.gens[0] >= 1},
  {ic: '⬆️', txt: 'Achète une amélioration : elles multiplient tout. « Pouce agile » double la force de tes taps !', el: () => document.querySelector('#ups .up'), view: 'shop', done: S => Object.keys(S.ups || {}).length >= 1},
  {ic: '🎁', txt: 'Ouvre ton coffre : chaque carte augmente ta production pour toujours.', el: () => $('chestSlots'), view: 'play', done: S => (S.chestsOpened || 0) >= 1},
  {ic: '🔥', txt: 'Tape sans t\'arrêter : le combo multiplie tes taps et remplit la jauge de Hype !', el: () => $('stage'), view: 'play', done: S => (S.bestCombo || 0) >= 30},
  {ic: '🏆', txt: 'Bravo ! Défi du jour, saison, clans et classement t\'attendent dans « Potes & live ». Le « ? » en haut explique tout. Bon jeu !', el: () => $('soPanel'), view: 'live', done: (S, t) => t > 10},
];
// Même condition que le bloc « Téléphone » de style.css (pas de lecture de style dans la boucle).
const MOBILE = matchMedia('(max-width:820px),(max-height:520px) and (pointer:coarse)');
const mobile = () => MOBILE.matches;

function glow(el) {
  if (glowEl === el) return;
  if (glowEl) glowEl.classList.remove('coach-glow');
  glowEl = el;
  if (el) el.classList.add('coach-glow');
}
function finish(skipped) {
  const S = api.S;
  S.tuto = DONE; glow(null); DT.setHidden($('coach'), true);
  if (!skipped) { api.toast('Tutoriel terminé : à toi de jouer !', 'mint'); api.confetti(innerWidth / 2, innerHeight * 0.4, 80); }
  api.save();
}
function render() {
  const S = api.S, i = S.tuto, step = STEPS[i];
  const hide = !step || !api.inGame() || api.modalOpen();
  DT.setHidden($('coach'), hide);
  if (hide) { glow(null); return; }
  let txt = step.txt, el = step.el();
  // Sur téléphone, si la bonne colonne n'est pas affichée, on montre d'abord l'onglet du bas.
  if (mobile() && step.view && document.body.dataset.view !== step.view) {
    const tab = document.querySelector(`#mnav [data-view="${step.view}"]`);
    const name = {play: 'Jouer', shop: 'Améliorer', live: 'Potes & live'}[step.view];
    txt = `Touche « ${name} » en bas. ` + txt; el = tab;
  }
  DT.setText($('coachIc'), step.ic); DT.setText($('coachTxt'), txt);
  DT.setText($('coachStep'), `${i + 1}/${STEPS.length}`);
  glow(el);
  if (shown !== i) { shown = i; $('coach').animate([{transform: 'translate(-50%, 16px) scale(.9)', opacity: 0}, {transform: 'translate(-50%, 0) scale(1)', opacity: 1}], {duration: 260, easing: 'ease-out'}); }
}
function tick(dt) {
  if (!api || !api.inGame()) return;
  const S = api.S;
  if (!(S.tuto < STEPS.length)) { if (glowEl) glow(null); return; }
  clock += dt;
  if (clock < 0.25) return;
  clock = 0;
  const step = STEPS[S.tuto];
  if (step.done(S, (performance.now() - stepAt) / 1000)) {
    S.tuto++; stepAt = performance.now(); api.A.upgrade();
    if (S.tuto >= STEPS.length) { finish(false); return; }
  }
  render();
}
function enter() { stepAt = performance.now(); shown = -1; if (!(api.S.tuto < STEPS.length)) { glow(null); DT.setHidden($('coach'), true); } }
function init(a) {
  api = a;
  $('coachSkip').addEventListener('click', () => finish(true));
}

DT.Coach = {init, tick, enter, DONE};

})(window.DT);
