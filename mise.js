/* Dopamine Tycoon : la jauge de mise, commune au casino, à la Bourse et aux machines à sous.
 * On mise une part de sa banque, réglée au curseur (de 0,1 % à TAPIS), et le montant exact s'affiche en nmol.
 * Le réglage est partagé : la même mise te suit d'un jeu à l'autre (gardé sur l'appareil). */
window.DT = window.DT || {};
(function (DT) {
'use strict';

const MIN_F = 0.001;  // 0,1 % de la banque
const posOf = f => f >= 1 ? 100 : Math.max(0, Math.min(99, Math.round(Math.log(f / MIN_F) / Math.log(1 / MIN_F) * 100)));
const fOf = p => p >= 100 ? 1 : MIN_F * Math.pow(1 / MIN_F, p / 100);
let f = (() => { try { const v = +localStorage.getItem('dt-betf'); return v > 0 && v <= 1 ? v : 0.02; } catch (e) { return 0.02; } })();
const gauges = [];

const amount = bank => f >= 1 ? Math.floor(bank) : Math.max(10, Math.floor(bank * f));
const pct = () => f >= 1 ? 'TAPIS' : (f * 100 < 1 ? (f * 100).toFixed(1) : String(Math.round(f * 100))).replace('.', ',') + ' %';
function set(nf) {
  f = Math.max(MIN_F, Math.min(1, nf));
  try { localStorage.setItem('dt-betf', String(f)); } catch (e) {}
  for (const g of gauges) refreshOne(g, true);
}
function refreshOne(g, slider) {
  const bank = g.bank();
  DT.setText(g.amt, g.fmt(amount(bank)) + ' nmol');
  DT.setText(g.pct, f >= 1 ? 'TOUTE TA BANQUE' : `${pct()} de ta banque`);
  DT.setClass(g.el, 'mz' + (f >= 1 ? ' allin' : f >= 0.25 ? ' hot' : ''));
  if (slider && +g.range.value !== posOf(f)) g.range.value = posOf(f);
  // pile de jetons : plus la mise est grosse, plus la pile monte (et change de couleur)
  const n = f >= 1 ? 9 : Math.max(1, Math.min(8, Math.round(posOf(f) / 12) + 1));
  DT.setHTML(g.chips, Array.from({length: n}, (_, i) => `<i class="chip c${Math.min(5, Math.floor(i / 2) + (f >= 0.25 ? 2 : 0))}" style="--i:${i}"></i>`).join(''));
}
const QUICK = [['÷2', () => set(f >= 1 ? 0.5 : f / 2)], ['×2', () => set(f * 2)], ['1 %', () => set(0.01)], ['10 %', () => set(0.1)], ['50 %', () => set(0.5)], ['TAPIS', () => set(1)]];
/* Monte une jauge dans box. bank() : banque actuelle ; fmt : format des nombres ;
 * locked() : vrai pendant une partie (la mise ne bouge plus) ; onChange(allIn) : après un réglage. */
function mount(box, {bank, fmt, locked = () => false, onChange = () => {}, A}) {
  box.innerHTML = `<div class="mz"><div class="mz-top"><span class="lab">Mise</span><b class="mz-amt"></b><small class="mz-pct"></small><span class="mz-chips" aria-hidden="true"></span></div>
    <input type="range" class="mz-range" min="0" max="100" step="1" aria-label="Mise : part de ta banque">
    <div class="mz-btns">${QUICK.map(([l], i) => `<button type="button" data-q="${i}"${l === 'TAPIS' ? ' class="allin"' : ''}>${l}</button>`).join('')}</div></div>`;
  const g = {el: box.firstElementChild, chips: box.querySelector('.mz-chips'), amt: box.querySelector('.mz-amt'), pct: box.querySelector('.mz-pct'), range: box.querySelector('.mz-range'), bank, fmt};
  const guard = () => { if (!locked()) return false; refreshOne(g, true); if (A) A.denied(); return true; };
  g.range.addEventListener('input', () => { if (guard()) return; set(fOf(+g.range.value)); onChange(f >= 1); });
  box.querySelector('.mz-btns').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || guard()) return;
    QUICK[+b.dataset.q][1](); if (A) A.click(); onChange(f >= 1);
  });
  gauges.push(g);
  refreshOne(g, true);
  return g;
}
// À appeler régulièrement (la banque change) : met à jour le montant affiché.
function refresh() { for (const g of gauges) refreshOne(g, false); }  // n'écrit que ce qui change (DT.setText)

/* Chance du casino : le joueur gagne 3 parties sur 4 (choix de l'auteur du jeu). Chaque jeu tire d'abord
 * « gagné ou perdu » avec DT.Luck.roll(), puis montre un tirage réaliste qui correspond. */
// 75 % de base, plus les améliorations de chance, le trèfle et le booster (DT.Fun) ; jamais plus de 95 %.
DT.Luck = {
  p: (k = 'casino') => Math.min(0.95, 0.75 + (DT.Fun ? DT.Fun.luckBonus(k) : 0)),
  roll: (k = 'casino') => Math.random() < DT.Luck.p(k),
  get P() { return DT.Luck.p('casino'); },
};

DT.Bet = {mount, refresh, amount, allIn: () => f >= 1, get frac() { return f; }};

})(window.DT);
