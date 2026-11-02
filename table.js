/* Dopamine Tycoon : la Table des potes, une roulette partagée.
 * Toutes les 45 s, un tirage commun à tous les joueurs : le numéro se calcule à partir du numéro de la manche
 * (heure du serveur, DT.now), donc chacun voit le même résultat au même moment, sans serveur de jeu.
 * Ta mise part dans ton message signé (champ `tb`) ; on voit les jetons de ses potes posés sur la même manche.
 * Ici, pas de coup de pouce : ce sont les vraies probabilités de la roulette (le tirage est le même pour tout le monde). */
window.DT = window.DT || {};
(function (DT) {
'use strict';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const ROUND = 45000, BET_END = 33000, SPIN_END = 40000;
const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const col = n => n === 0 ? 'green' : REDS.has(n) ? 'red' : 'black';
// Mises possibles : type, libellé, gain (× la mise), condition
const BETS = {
  red: ['ROUGE', 2, n => REDS.has(n)], black: ['NOIR', 2, n => n > 0 && !REDS.has(n)],
  even: ['PAIR', 2, n => n > 0 && n % 2 === 0], odd: ['IMPAIR', 2, n => n % 2 === 1],
  low: ['1-18', 2, n => n >= 1 && n <= 18], high: ['19-36', 2, n => n >= 19],
  d1: ['1re douzaine', 3, n => n >= 1 && n <= 12], d2: ['2e douzaine', 3, n => n >= 13 && n <= 24], d3: ['3e douzaine', 3, n => n >= 25],
  zero: ['ZÉRO', 36, n => n === 0],
};
DT.TABLE_BETS = Object.keys(BETS);
// Numéro tiré pour une manche : un hachage du numéro de manche (le même chez tout le monde).
function result(r) { let x = (r * 2654435761 + 0x9E3779B9) >>> 0; x ^= x >>> 16; x = Math.imul(x, 0x85EBCA6B) >>> 0; x ^= x >>> 13; x = Math.imul(x, 0xC2B2AE35) >>> 0; x ^= x >>> 16; return (x >>> 0) % 37; }
const roundOf = t => Math.floor(t / ROUND);

let api = null, shown = -1;
// Ma mise de la manche, gardée dans la sauvegarde : un rechargement ne la fait pas disparaître.
const M = () => api.S.tbMine || null;
const seen = {};  // clé du joueur → {name, r, s, a}
const hist = [];
function onMsg(m) {
  if (!m.tb || !api.isFriend(m.key)) return;
  const cur = roundOf(DT.now());
  if (m.tb.r < cur - 1) return;
  seen[m.key] = {name: m.name, r: m.tb.r, s: m.tb.s, a: m.tb.a};
}
function place(s) {
  const t = DT.now(), r = roundOf(t);
  if (!DT.clock.trusted) { api.toast('Connexion au serveur en cours, réessaie dans un instant.'); return; }
  if (t - r * ROUND > BET_END) { api.A.denied(); DT.Casino.H.res('Rien ne va plus : attends la prochaine manche.', ''); return; }
  if (M() && M().r === r) { api.A.denied(); DT.Casino.H.res('Tu as déjà misé sur cette manche.', ''); return; }
  const a = DT.Casino.H.take(); if (!a) return;
  api.S.tbMine = {r, s, a, allIn: DT.Casino.H.isAllIn(), paid: false};
  api.save();
  api.A.chestShake();
  DT.Casino.H.res(`Mise posée : ${api.fmt(a)} nmol sur ${BETS[s][0]}. Tes potes la voient.`, '');
  api.publish({r, s, a: Math.round(a)});
  render(true);
}
function settle(t) {
  const b = M();
  if (!b || b.paid || t < b.r * ROUND + SPIN_END) return;
  b.paid = true; api.save();
  const n = result(b.r);
  if (BETS[b.s][2](n)) DT.Casino.H.payout(b.a, BETS[b.s][1], `Table des potes (${n})`, b.allIn);
  else { DT.Casino.H.res(`Le ${n} sort. Perdu !`, ''); api.A.denied(); }
}
function render(force) {
  const t = DT.now(), r = roundOf(t), in_ = t - r * ROUND;
  const phase = in_ < BET_END ? 'bet' : in_ < SPIN_END ? 'spin' : 'res';
  const left = Math.ceil((phase === 'bet' ? BET_END - in_ : ROUND - in_) / 1000);
  DT.setText($('tbClock'), phase === 'bet' ? `Faites vos jeux : ${left} s` : phase === 'spin' ? 'Rien ne va plus…' : `Prochaine manche dans ${left} s`);
  const n = result(r), ball = $('tbBall');
  if (phase === 'spin') { DT.setText(ball, String(Math.floor(Math.random() * 37))); DT.setClass(ball, 'tb-ball spin'); }
  else if (phase === 'res') { DT.setText(ball, String(n)); DT.setClass(ball, 'tb-ball ' + col(n)); }
  else { DT.setText(ball, '?'); DT.setClass(ball, 'tb-ball'); }
  // résultat de la manche : historique, puis ma mise réglée une seule fois (même en retard, si la fenêtre était fermée)
  if (phase === 'res' && shown !== r) {
    shown = r; hist.unshift(n); hist.length = Math.min(hist.length, 12);
    DT.setHTML($('tbHist'), hist.map(x => `<span class="${col(x)}">${x}</span>`).join(''));
    api.A.slam(0);
  }
  settle(t);
  // sièges : mes potes et moi sur cette manche
  const seats = Object.entries(seen).filter(([, b]) => b.r === r)
    .map(([, b]) => ({name: b.name, s: b.s, a: b.a, me: false}));
  if (M() && M().r === r) seats.unshift({name: 'Toi', s: M().s, a: M().a, me: true});
  const html = seats.length ? seats.map(b => {
    const win = phase === 'res' ? BETS[b.s][2](n) : null;
    return `<li class="${b.me ? 'me' : ''}${win === true ? ' win' : win === false ? ' lose' : ''}"><b>${esc(b.name)}</b> <span>${esc(BETS[b.s][0])}</span> <em>${api.fmt(b.a)}</em>${win === true ? ` <i>+${api.fmt(b.a * BETS[b.s][1])}</i>` : ''}</li>`;
  }).join('') : '<li class="empty">Personne n\'a encore misé. Invite tes potes à s\'asseoir !</li>';
  if (force || html !== render.last) { render.last = html; $('tbSeats').innerHTML = html; }
  document.querySelectorAll('#tbBets button').forEach(b => { const off = phase !== 'bet' || !!(M() && M().r === r); if (b.disabled !== off) b.disabled = off; });
}
let clock = 0;
DT.Casino.register('table', {
  init() {
    api = DT.Table._api;
    $('tbBets').innerHTML = Object.entries(BETS).map(([k, [l, m]]) => `<button type="button" class="tb-b ${k}" data-s="${k}">${l}<small>×${m}</small></button>`).join('');
    $('tbBets').addEventListener('click', e => { const b = e.target.closest('[data-s]'); if (b) place(b.dataset.s); });
  },
  show() { render(true); },
  tick(dt, game) { if (game !== 'table') return; clock += dt; if (clock < 0.25) return; clock = 0; render(false); },
  busy: () => false,
});
let st = 0;
function tick(dt) { st += dt; if (st < 1) return; st = 0; if (api && api.S.tbMine) settle(DT.now()); }
DT.Table = {init(a) { DT.Table._api = a; api = a; }, onMsg, render, tick, active: () => DT.Casino && DT.Casino.H.game === 'table' && !$('casinoModal').hidden, result};

})(window.DT);
