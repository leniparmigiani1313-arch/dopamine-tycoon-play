/* Dopamine Tycoon : petits outils de performance.
 * Réécrire un texte ou une classe identique force quand même le navigateur à recalculer la page :
 * ces fonctions n'écrivent dans le DOM que si la valeur change vraiment. */
window.DT = window.DT || {};
(function (DT) {
'use strict';
DT.setText = (el, v) => { v = String(v); if (el && el.textContent !== v) el.textContent = v; };
DT.setHTML = (el, v) => { if (el && el._dtHTML !== v) { el._dtHTML = v; el.innerHTML = v; } };
DT.setClass = (el, v) => { if (el && el.className !== v) el.className = v; };
DT.setStyle = (el, k, v) => { if (el && el._dtStyle !== k + v) { el._dtStyle = k + v; el.style[k] = v; } };
DT.setHidden = (el, v) => { v = !!v; if (el && el.hidden !== v) el.hidden = v; };
DT.setDisabled = (el, v) => { v = !!v; if (el && el.disabled !== v) el.disabled = v; };
// Version du jeu : transmise par main.js (app.getVersion(), donc celle de package.json). « dev » dans un navigateur.
// La version vient de package.json : passée par Electron (?ver=), sinon écrite dans version.js (version web).
DT.VERSION = new URLSearchParams(location.search).get('ver') || DT.BUILD_VERSION || 'dev';
// Compare deux versions « 1.5.0 » : vrai si a est plus récente que b.
DT.newer = (a, b) => {
  const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
  if (pa.length !== 3 || pb.length !== 3 || pa.some(isNaN) || pb.some(isNaN)) return false;
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] > pb[i];
  return false;
};
/* Horloge du jeu. Changer l'heure du PC ne doit rien rapporter (Bourse, gains hors ligne, cadeau du jour…) :
 * - pendant la partie, le temps avance avec performance.now(), que l'heure du système ne touche pas ;
 * - l'heure officielle vient du serveur ntfy (réponse à chaque publication) et corrige l'horloge du PC ;
 * - sans serveur, le temps ne recule jamais sous le dernier moment connu de la partie (DT.clock.floor). */
const T0 = Date.now(), P0 = performance.now();
let clockOff = 0, clockSynced = false;
const bootAt = performance.now();
DT.now = () => T0 + (performance.now() - P0) + clockOff;
DT.clock = {
  // Heure exacte du serveur (en ms).
  sync(serverMs) {
    if (!(serverMs > 1.6e12)) return;
    clockOff = serverMs - (T0 + (performance.now() - P0));
    clockSynced = true;
  },
  // Heure minimale certaine (un message déjà publié par quelqu'un) : on rattrape un retard, jamais l'inverse.
  atLeast(ms) { if (ms > DT.now() + 2000) clockOff += ms - DT.now(); },
  // Hors ligne : le temps ne recule pas sous ms (moment de la dernière sauvegarde).
  floor(ms) { if (!clockSynced && ms > DT.now()) clockOff += ms - DT.now(); },
  get synced() { return clockSynced; },
  // Heure fiable : synchronisée, ou 12 s sans réseau (on joue hors ligne avec l'horloge du PC, qui ne recule pas).
  get trusted() { return clockSynced || performance.now() - bootAt > 12000; },
  get skew() { return clockOff; },
};

// Convertit une image pré-dessinée en ImageBitmap (gardée sur la carte graphique) ; le canvas sert en attendant.
DT.bitmap = (cv, done) => { if (window.createImageBitmap) createImageBitmap(cv).then(done).catch(() => {}); };
})(window.DT);
