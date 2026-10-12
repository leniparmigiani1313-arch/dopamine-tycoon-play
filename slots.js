/* Dopamine Tycoon : la salle des machines à sous. 20 machines, comme au casino :
 *  - machines classiques à 3 rouleaux (une ligne au centre, « 2 cerises » qui paient…) ;
 *  - vidéo-slots à 5 rouleaux et 5 lignes, avec joker (remplace tout), scatter (tours gratuits) et multiplicateurs.
 * Le moteur (tirage + gains) est séparé de l'affichage pour être simulé hors du jeu : tools/slots-rtp.js règle `k`
 * pour que chaque machine rende environ 93 % des mises sur la durée. */
window.DT = window.DT || {};
(function (DT) {
'use strict';

/* ---------- Les machines ----------
 * syms : {e: emoji, w: poids sur le rouleau, p: [gain pour 3, 4, 5 identiques] en × la mise de la ligne}
 * wild : joker (remplace les autres symboles, paie aussi) ; scatter : n'importe où, 3+ = tours gratuits ;
 * x2 : un joker sur la ligne double le gain ; two : gain spécial « 2 cerises » sur les machines classiques ;
 * jack : symbole du jackpot (ligne complète = JACKPOT) ; lvl : niveau pour débloquer ; k : réglage de redistribution. */
const M = [
  {id: 'fruits', name: 'Fruit Machine', ico: '🍒', reels: 3, c: ['#C62828', '#FFB300'], lvl: 1, two: '🍒', jack: '7️⃣',
    syms: [{e: '🍒', w: 9, p: [10]}, {e: '🍋', w: 9, p: [12]}, {e: '🍊', w: 8, p: [15]}, {e: '🍇', w: 6, p: [25]}, {e: '🔔', w: 4, p: [50]}, {e: '7️⃣', w: 2, p: [200]}]},
  {id: 'triple7', name: 'Triple 7', ico: '7️⃣', reels: 3, c: ['#1A237E', '#E53935'], lvl: 2, jack: '7️⃣',
    syms: [{e: '➖', w: 10, p: [8]}, {e: '🟰', w: 7, p: [15]}, {e: '≡', w: 5, p: [30]}, {e: '7️⃣', w: 2, p: [300]}], wild: '🃏', wildW: 0.7},
  {id: 'diamonds', name: 'Diamants Bleus', ico: '💎', reels: 3, c: ['#0D47A1', '#4FC3F7'], lvl: 3, jack: '💎',
    syms: [{e: '💍', w: 9, p: [10]}, {e: '👑', w: 7, p: [20]}, {e: '💰', w: 5, p: [40]}, {e: '💎', w: 2, p: [400]}], x2: true, wild: '✖️', wildW: 0.6},
  {id: 'bells', name: 'Cloches d\'Or', ico: '🔔', reels: 3, c: ['#5D4037', '#FFD54F'], lvl: 4, two: '🔔', jack: '🔔',
    syms: [{e: '🍀', w: 10, p: [8]}, {e: '⭐', w: 8, p: [14]}, {e: '🍉', w: 7, p: [20]}, {e: '🔔', w: 3, p: [150]}]},
  {id: 'clover', name: 'Trèfle Chanceux', ico: '🍀', reels: 5, c: ['#1B5E20', '#C6FF00'], lvl: 5, jack: '🌈',
    syms: [{e: '🍄', w: 10, p: [2, 5, 15]}, {e: '🪙', w: 9, p: [3, 8, 20]}, {e: '🎩', w: 7, p: [5, 12, 40]}, {e: '🍀', w: 5, p: [8, 25, 80]}, {e: '🌈', w: 3, p: [15, 60, 300]}], wild: '🧚', wildW: 2, scatter: '🏺'},
  {id: 'pharaoh', name: 'Trésor du Pharaon', ico: '🐫', reels: 5, c: ['#E65100', '#FFE082'], lvl: 7, jack: '☀️',
    syms: [{e: '🐍', w: 10, p: [2, 5, 15]}, {e: '🐫', w: 9, p: [3, 8, 20]}, {e: '🏺', w: 7, p: [5, 12, 40]}, {e: '👁️', w: 5, p: [10, 30, 100]}, {e: '☀️', w: 3, p: [20, 80, 400]}], wild: '🪲', wildW: 2, scatter: '🔺'},
  {id: 'pirates', name: 'L\'Île aux Pirates', ico: '🏴‍☠️', reels: 5, c: ['#263238', '#FFCA28'], lvl: 9, jack: '💰',
    syms: [{e: '⚓', w: 10, p: [2, 5, 15]}, {e: '🦜', w: 8, p: [4, 10, 25]}, {e: '🗺️', w: 7, p: [5, 15, 40]}, {e: '🦑', w: 5, p: [10, 30, 100]}, {e: '💰', w: 3, p: [25, 100, 500]}], wild: '🏴‍☠️', wildW: 2, scatter: '🧭'},
  {id: 'dragon', name: 'Dragon Impérial', ico: '🐉', reels: 5, c: ['#B71C1C', '#FFD700'], lvl: 11, jack: '🐉', x2: true,
    syms: [{e: '🀄', w: 10, p: [2, 5, 15]}, {e: '🏮', w: 9, p: [3, 8, 20]}, {e: '🧧', w: 7, p: [5, 12, 40]}, {e: '🪭', w: 5, p: [10, 30, 100]}, {e: '🐉', w: 2, p: [30, 150, 800]}], wild: '🔥', wildW: 2, scatter: '🎆'},
  {id: 'ocean', name: 'Abysses', ico: '🐙', reels: 5, c: ['#006064', '#18FFFF'], lvl: 13, jack: '🧜',
    syms: [{e: '🐚', w: 10, p: [2, 5, 15]}, {e: '🐠', w: 9, p: [3, 8, 20]}, {e: '🐙', w: 7, p: [5, 12, 40]}, {e: '🦈', w: 5, p: [10, 30, 100]}, {e: '🧜', w: 3, p: [20, 80, 400]}], wild: '🫧', wildW: 2, scatter: '🔱'},
  {id: 'candy', name: 'Sugar Rush', ico: '🍭', reels: 5, c: ['#AD1457', '#F8BBD0'], lvl: 15, jack: '🍭',
    syms: [{e: '🍬', w: 11, p: [2, 4, 12]}, {e: '🍫', w: 9, p: [3, 7, 18]}, {e: '🍩', w: 7, p: [5, 12, 35]}, {e: '🧁', w: 5, p: [8, 25, 90]}, {e: '🍭', w: 3, p: [20, 80, 400]}], wild: '🌟', wildW: 3, scatter: '🎂', x2: true},
  {id: 'western', name: 'Ruée vers l\'Or', ico: '🤠', reels: 5, c: ['#4E342E', '#FFB74D'], lvl: 17, jack: '🪙',
    syms: [{e: '🌵', w: 10, p: [2, 5, 15]}, {e: '🐎', w: 8, p: [4, 10, 25]}, {e: '🤠', w: 7, p: [5, 15, 40]}, {e: '🦅', w: 5, p: [10, 30, 100]}, {e: '🪙', w: 3, p: [25, 100, 500]}], wild: '⭐', wildW: 2, scatter: '⛏️'},
  {id: 'space', name: 'Cosmos', ico: '🚀', reels: 5, c: ['#1A0033', '#7C4DFF'], lvl: 19, jack: '🪐',
    syms: [{e: '☄️', w: 10, p: [2, 5, 15]}, {e: '🛸', w: 9, p: [3, 8, 20]}, {e: '👽', w: 7, p: [5, 12, 40]}, {e: '🚀', w: 5, p: [10, 30, 100]}, {e: '🪐', w: 3, p: [20, 80, 400]}], wild: '🌌', wildW: 2, scatter: '🌠', x2: true},
  {id: 'viking', name: 'Valhalla', ico: '🛡️', reels: 5, c: ['#37474F', '#90CAF9'], lvl: 21, jack: '⚡',
    syms: [{e: '🪵', w: 10, p: [2, 5, 15]}, {e: '🪓', w: 8, p: [4, 10, 25]}, {e: '🛡️', w: 7, p: [5, 15, 40]}, {e: '🐺', w: 5, p: [10, 30, 100]}, {e: '⚡', w: 3, p: [25, 100, 500]}], wild: '🔨', wildW: 2, scatter: '🐦‍⬛'},
  {id: 'jungle', name: 'Roi de la Jungle', ico: '🦁', reels: 5, c: ['#2E7D32', '#FFEB3B'], lvl: 23, jack: '🦁',
    syms: [{e: '🍌', w: 10, p: [2, 5, 15]}, {e: '🦜', w: 9, p: [3, 8, 20]}, {e: '🐒', w: 7, p: [5, 12, 40]}, {e: '🐍', w: 5, p: [10, 30, 100]}, {e: '🦁', w: 3, p: [20, 80, 400]}], wild: '🌴', wildW: 2, scatter: '🥁'},
  {id: 'halloween', name: 'Nuit Hantée', ico: '🎃', reels: 5, c: ['#311B92', '#FF6D00'], lvl: 25, jack: '💀',
    syms: [{e: '🕸️', w: 10, p: [2, 5, 15]}, {e: '🦇', w: 9, p: [3, 8, 20]}, {e: '🎃', w: 7, p: [5, 12, 40]}, {e: '👻', w: 5, p: [10, 30, 100]}, {e: '💀', w: 3, p: [20, 80, 400]}], wild: '🧙', wildW: 2, scatter: '🌕', x2: true},
  {id: 'disco', name: 'Disco Fever', ico: '🪩', reels: 5, c: ['#880E4F', '#00E5FF'], lvl: 27, jack: '🪩',
    syms: [{e: '🎵', w: 11, p: [2, 4, 12]}, {e: '🎧', w: 9, p: [3, 7, 18]}, {e: '🎤', w: 7, p: [5, 12, 35]}, {e: '🕺', w: 5, p: [10, 30, 100]}, {e: '🪩', w: 3, p: [20, 80, 400]}], wild: '💃', wildW: 3, scatter: '🎶'},
  {id: 'sushi', name: 'Sushi Bar', ico: '🍣', reels: 5, c: ['#BF360C', '#FFCCBC'], lvl: 29, jack: '🍣',
    syms: [{e: '🥢', w: 10, p: [2, 5, 15]}, {e: '🍙', w: 9, p: [3, 8, 20]}, {e: '🍤', w: 7, p: [5, 12, 40]}, {e: '🐟', w: 5, p: [10, 30, 100]}, {e: '🍣', w: 3, p: [20, 80, 400]}], wild: '🍵', wildW: 2, scatter: '🎏'},
  {id: 'vegas', name: 'Vegas Nights', ico: '🎰', reels: 5, c: ['#000000', '#FFD700'], lvl: 32, jack: '👑',
    syms: [{e: '🎲', w: 10, p: [2, 5, 15]}, {e: '🃏', w: 8, p: [4, 10, 25]}, {e: '💵', w: 7, p: [5, 15, 40]}, {e: '🍸', w: 5, p: [10, 30, 100]}, {e: '👑', w: 2, p: [40, 200, 1000]}], wild: '🎰', wildW: 2, scatter: '💎', x2: true},
  {id: 'arctic', name: 'Banquise', ico: '🐧', reels: 5, c: ['#01579B', '#E1F5FE'], lvl: 35, jack: '🐻‍❄️',
    syms: [{e: '❄️', w: 10, p: [2, 5, 15]}, {e: '🐟', w: 9, p: [3, 8, 20]}, {e: '🦭', w: 7, p: [5, 12, 40]}, {e: '🐧', w: 5, p: [10, 30, 100]}, {e: '🐻‍❄️', w: 3, p: [20, 80, 400]}], wild: '🧊', wildW: 2, scatter: '🌨️'},
  {id: 'mega', name: 'MÉGA JACKPOT', ico: '👑', reels: 5, c: ['#4A148C', '#FFD600'], lvl: 40, jack: '7️⃣',
    syms: [{e: '🍒', w: 11, p: [2, 4, 10]}, {e: '🔔', w: 9, p: [3, 8, 20]}, {e: '💰', w: 6, p: [8, 20, 60]}, {e: '💎', w: 4, p: [15, 60, 250]}, {e: '7️⃣', w: 1.5, p: [50, 500, 5000]}], wild: '👑', wildW: 2, scatter: '🎆', x2: true},
];
// Réglage de redistribution calculé par tools/slots-rtp.js (≈ 93 % des mises rendues sur la durée).
const K = {"fruits":1.3123,"triple7":0.499,"diamonds":0.2955,"bells":0.7728,"clover":1.3239,"pharaoh":1.2344,"pirates":1.0865,"dragon":0.7456,"ocean":1.2468,"candy":0.6527,"western":1.0843,"space":0.8051,"viking":1.0956,"jungle":1.2381,"halloween":0.7983,"disco":1.0614,"sushi":1.2326,"vegas":0.6434,"arctic":1.2343,"mega":0.5524};
const LINES5 = [[1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2]];
const LINES3 = [[1, 1, 1]];
const FREE = {3: 6, 4: 10, 5: 15};

function strip(m) {
  const s = m.syms.map(x => ({e: x.e, w: x.w}));
  if (m.wild) s.push({e: m.wild, w: m.wildW || 2});
  if (m.scatter) s.push({e: m.scatter, w: 1.6});
  return s;
}
function roll(st) { let t = 0; for (const s of st) t += s.w; let x = Math.random() * t; for (const s of st) { x -= s.w; if (x <= 0) return s.e; } return st[0].e; }
// Tirage : grid[rouleau][rangée], 3 rangées visibles.
function spin(m, st) { return Array.from({length: m.reels}, () => [roll(st), roll(st), roll(st)]); }
// Gains d'un tirage, en × la mise totale. Renvoie aussi les lignes gagnantes et les tours gratuits.
function evaluate(m, grid) {
  const lines = m.reels === 5 ? LINES5 : LINES3, per = 1 / lines.length, k = m.k || 1;
  let mult = 0, jackpot = false;
  const wins = [];
  lines.forEach((ln, li) => {
    const row = ln.map((r, i) => grid[i][r]);
    let first = row.find(e => e !== m.wild);
    if (first === m.scatter) return;
    if (!first) first = m.wild;  // ligne pleine de jokers : paie comme le meilleur symbole
    let n = 0, wilds = 0;
    for (const e of row) { if (e === first || e === m.wild) { n++; if (e === m.wild) wilds++; } else break; }
    const sym = m.syms.find(s => s.e === first) || m.syms[m.syms.length - 1];
    if (n >= 3) {
      let p = sym.p[Math.min(n, m.reels) - 3] * (m.x2 && wilds ? 2 : 1);
      mult += p * per * k; wins.push({li, n, e: first});
      if (first === m.jack && n === m.reels) jackpot = true;
    } else if (m.two && n === 2 && first === m.two) { mult += 2 * per * k; wins.push({li, n: 2, e: first}); }
  });
  let free = 0;
  if (m.scatter) {
    const sc = grid.flat().filter(e => e === m.scatter).length;
    if (sc >= 3) { free = FREE[Math.min(5, sc)]; mult += sc * k; }
  }
  return {mult, wins, free, jackpot, lines};
}

DT.SlotEngine = {M, spin, evaluate, strip, K};
if (typeof document === 'undefined') return;  // moteur seul (simulation hors du jeu)

/* ======================= Affichage ======================= */
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
let api = null, cur = null, busy = false, freeLeft = 0, freeWon = 0, auto = 0, freeBet = 0;
for (const m of M) { m.k = K[m.id] || m.k || 1; m.st = strip(m); }
const unlocked = m => (api.S.lvl || 1) >= m.lvl;

function lobby() {
  cur = null; auto = 0;
  $('slLobby').hidden = false; $('slGame').hidden = true;
  DT.setText($('slotT'), 'Salle des machines');
  $('slLobby').innerHTML = M.map(m => {
    const ok = unlocked(m);
    return `<button type="button" class="sl-pick${ok ? '' : ' locked'}" data-m="${m.id}" style="--c1:${m.c[0]};--c2:${m.c[1]}" ${ok ? '' : 'aria-disabled="true"'}>
      <span class="sl-pico">${m.ico}</span><b>${esc(m.name)}</b>
      <small>${ok ? `${m.reels} rouleaux · ${m.reels === 5 ? '5 lignes' : '1 ligne'}${m.scatter ? ' · tours gratuits' : ''}${m.x2 ? ' · joker ×2' : ''}` : `🔒 Niveau ${m.lvl}`}</small></button>`;
  }).join('');
}
function cellHTML(e) { return `<div class="sl-sym">${e}</div>`; }
function open(id) {
  const m = M.find(x => x.id === id);
  if (!m) return;
  if (!unlocked(m)) { api.A.denied(); api.toast(`<b>${esc(m.name)}</b> se débloque au niveau ${m.lvl}.`); return; }
  cur = m; freeLeft = 0; auto = 0;
  $('slLobby').hidden = true; $('slGame').hidden = false;
  DT.setText($('slotT'), m.name);
  const g = $('slGame');
  g.style.setProperty('--c1', m.c[0]); g.style.setProperty('--c2', m.c[1]);
  for (const st of document.querySelectorAll('#slReels .sl-strip')) for (const a of st.getAnimations()) a.cancel();
  $('slReels').className = 'sl-reels r' + m.reels;
  $('slReels').innerHTML = Array.from({length: m.reels}, () => `<div class="sl-reel"><div class="sl-strip">${[0, 1, 2].map(() => cellHTML(roll(m.st))).join('')}</div></div>`).join('');
  $('slLines').innerHTML = '';
  const rows = m.syms.slice().reverse().map(s => `<tr><td>${s.e.repeat(3)}${m.reels === 5 ? '…' : ''}</td><td>${s.p.map(x => '×' + fmtM(x * (m.k || 1) / (m.reels === 5 ? 5 : 1))).join(' / ')}</td></tr>`).join('');
  $('slPay').innerHTML = `<table>${rows}</table><p class="small">${m.reels === 5 ? 'Gains pour 3 / 4 / 5 symboles alignés depuis la gauche, sur 5 lignes, en × ta mise totale.' : 'Trois symboles sur la ligne du milieu, en × ta mise.'}
    ${m.two ? ` Deux ${m.two} au début de la ligne : ×${fmtM(2 * m.k)}.` : ''}${m.wild ? ` ${m.wild} = joker, remplace tous les symboles${m.x2 ? ' et double le gain' : ''}.` : ''}
    ${m.scatter ? ` 3 ${m.scatter} ou plus n'importe où : ${FREE[3]} à ${FREE[5]} tours gratuits.` : ''} ${m.jack.repeat(m.reels === 5 ? 5 : 3)} = JACKPOT.</p>`;
  $('slRes').textContent = ''; $('slRes').className = 'slot-res';
  refresh(); api.A.click();
}
const fmtM = x => (x < 10 ? x.toFixed(1) : String(Math.round(x))).replace('.', ',').replace(/,0$/, '');
function refresh() {
  if (!cur) return;
  const a = DT.Bet.amount(api.S.bank);
  DT.setText($('slSpin'), busy ? 'Ça tourne…' : freeLeft ? `TOUR GRATUIT (${freeLeft})` : `JOUER ${api.fmt(a)} nmol`);
  DT.setDisabled($('slSpin'), busy || (!freeLeft && api.S.bank < a));
  DT.setText($('slAuto'), auto ? `STOP (${auto})` : 'AUTO ×10');
}
function play() {
  if (!cur || busy || $('slotModal').hidden) { auto = 0; return; }
  const m = cur, S = api.S;
  let bet;
  if (freeLeft) { freeLeft--; bet = freeBet; }
  else {
    bet = DT.Bet.amount(S.bank);
    if (S.bank < bet || bet < 1) { api.A.denied(); auto = 0; refresh(); return; }
    api.spend(bet); freeBet = bet; freeWon = 0;
    S.casinoPlays = (S.casinoPlays || 0) + 1; S.casinoBet = (S.casinoBet || 0) + bet;
  }
  S.slotSpins = (S.slotSpins || 0) + 1;
  DT.Extras && DT.Extras.quest('slot', 1);
  busy = true; refresh();
  $('slRes').textContent = ''; $('slRes').className = 'slot-res';
  $('slMachine').classList.remove('win', 'jack');
  $('slLines').innerHTML = '';
  const grid = spin(m, m.st), res = evaluate(m, grid);
  const reels = [...document.querySelectorAll('#slReels .sl-strip')];
  const H = reels[0].parentElement.clientHeight / 3;
  let stopped = 0;
  const ticker = setInterval(() => api.A.wheelTick(), 70);
  reels.forEach((st, i) => {
    const n = 18 + i * (m.reels === 5 ? 5 : 8);
    const cells = Array.from({length: n}, () => roll(m.st));
    cells[n - 3] = grid[i][0]; cells[n - 2] = grid[i][1]; cells[n - 1] = grid[i][2];
    for (const a of st.getAnimations()) a.cancel();
    st.innerHTML = cells.map(cellHTML).join('');
    const dur = (auto ? 600 : 900) + i * (auto ? 160 : 300);
    st.animate([{transform: 'translateY(0)'}, {transform: `translateY(${-(n - 3) * H}px)`}],
      {duration: dur, easing: 'cubic-bezier(.15,.85,.35,1.06)', fill: 'forwards'});
    // Fin du tour au minuteur, pas à la fin de l'animation (qui se fige quand la fenêtre est cachée).
    setTimeout(() => {
      api.A.slam(0);
      if (++stopped === m.reels) { clearInterval(ticker); end(m, bet, res); }
    }, dur);
  });
  api.A.click();
}
function end(m, bet, res) {
  busy = false;
  const S = api.S, win = bet * res.mult, r = $('slRes'), mach = $('slMachine');
  // lignes gagnantes
  const W = $('slReels').clientWidth, Hh = $('slReels').clientHeight;
  $('slLines').innerHTML = res.wins.map(w => {
    const ln = res.lines[w.li], pts = ln.slice(0, Math.max(w.n, 2)).map((row, i) => `${(i + 0.5) / m.reels * W},${(row + 0.5) / 3 * Hh}`).join(' ');
    return `<polyline points="${pts}" />`;
  }).join('');
  $('slLines').setAttribute('viewBox', `0 0 ${W} ${Hh}`);
  if (res.free) { freeLeft += res.free; api.banner('TOURS GRATUITS', `+${res.free}`, `${m.scatter} ${m.scatter} ${m.scatter} : la machine tourne pour toi !`); api.A.jackpot(); }
  if (win > 0) {
    api.gain(win); freeWon += win;
    S.casinoWon = (S.casinoWon || 0) + win;
    S.slotBest = Math.max(S.slotBest || 0, Math.round(res.mult));
    r.textContent = `${res.wins.length > 1 ? res.wins.length + ' lignes ! ' : ''}×${fmtM(res.mult)} : +${api.fmt(win)} nmol`;
    r.className = 'slot-res good'; mach.classList.add('win');
    const b = mach.getBoundingClientRect();
    api.flyTo(b.left + b.width / 2, b.top + b.height / 2, $('bank'), Math.min(30, 6 + Math.round(res.mult)));
    if (res.jackpot) {
      S.slotJackpots = (S.slotJackpots || 0) + 1; mach.classList.add('jack');
      api.A.jackpot(); api.banner(m.name.toUpperCase(), 'JACKPOT !', `×${fmtM(res.mult)} : +${api.fmt(win)} nmol`);
      api.shake(document.body); api.flash(m.c[1]); api.confetti(innerWidth / 2, innerHeight * 0.3, 200);
      api.addFeed(`<b>JACKPOT</b> sur ${esc(m.name)} : +${api.fmt(win)} nmol !`);
    } else if (res.mult >= 10) {
      S.bigWins = (S.bigWins || 0) + 1;
      api.A.jackpot(); api.banner('GROS GAIN', `×${fmtM(res.mult)}`, `+${api.fmt(win)} nmol`); api.confetti(innerWidth / 2, innerHeight * 0.35, 100);
    } else { api.A.upgrade(); api.confetti(b.left + b.width / 2, b.top, 30); }
  } else if (!res.free) {
    r.textContent = freeLeft ? `Tours gratuits : encore ${freeLeft}` : ['Perdu ! La maison gagne toujours.', 'Raté… encore un petit ?', 'Presque ! (non)', 'Les rouleaux sont contre toi.'][Math.floor(Math.random() * 4)];
    if (!freeLeft) api.A.denied();
  }
  refresh(); api.onChange();
  if (freeLeft) setTimeout(play, 700);
  else if (auto > 0) { auto--; refresh(); if (auto > 0) setTimeout(play, 450); }
}
function openModal() {
  $('slotModal').hidden = false;
  if (cur) open(cur.id); else lobby();
  api.A.click();
}
function init(a) {
  api = a;
  $('slotBtn').addEventListener('click', openModal);
  $('slLobby').addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (b) open(b.dataset.m); });
  $('slBack').addEventListener('click', () => { if (busy || freeLeft) return; lobby(); api.A.click(); });
  $('slSpin').addEventListener('click', play);
  $('slAuto').addEventListener('click', () => { if (auto) { auto = 0; refresh(); return; } auto = 10; if (!busy) play(); });
  $('slotClose').addEventListener('click', () => { if (busy || freeLeft) return; auto = 0; $('slotModal').hidden = true; });
  DT.Bet.mount($('slotBets'), {bank: () => api.S.bank, fmt: api.fmt, A: api.A, locked: () => busy || freeLeft > 0});
}
let clock = 0;
function tick(dt) {
  clock += dt;
  if (clock < 0.3 || $('slotModal').hidden) return;
  clock = 0; refresh(); DT.Bet.refresh();
}

Object.assign(DT.SlotEngine, {init, tick, get busy() { return busy || freeLeft > 0; }});

})(window.DT);
