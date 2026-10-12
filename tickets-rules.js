/* Dopamine Tycoon : les règles des tickets à gratter (sans affichage, testées par tools/tickets-test.js).
 *
 * Chaque ticket définit :
 *  - Z      : ses zones (nombre de cases, colonnes, titre, disposition) ;
 *  - score  : la vérification. Elle recalcule le gain à partir des symboles seuls → {v, h} (v en × le prix P, ou J) ;
 *  - make   : la fabrication d'un ticket pour un palier v (null si la tentative échoue) ;
 *  - outs   : les paliers ordinaires possibles (en × P).
 * Le résultat est tiré à l'achat (tirage du palier, puis fabrication, puis vérification par score : une grille
 * incohérente est rejetée et refabriquée). Gratter ne fait que dévoiler ce qui est déjà décidé.
 *
 * Symboles (chaînes, pour la sauvegarde) : '$n' montant n × P (0 = perdu), '#n' numéro (option '|o' doré),
 * '%n' face de dé, '@Rs' carte (rang 23456789TJQKA, couleur shdc), '*n' multiplicateur, '~TEXTE' étiquette,
 * '·' passage, sinon 'emoji|teinte|légende' (teintes : g b r v w y k(bronze) s(argent) o(or) R(royal) n(neutre)).
 * Les corrections apportées au cahier des charges sont notées « Correction » et listées dans TICKETS.md. */
window.DT = window.DT || {};
(function (DT) {
'use strict';

const J = 'J';
const ri = n => Math.floor(Math.random() * n);
const pick = a => a[ri(a.length)];
const between = (a, b) => a + ri(b - a + 1);
const shuf = a => { for (let i = a.length - 1; i > 0; i--) { const j = ri(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const rep = (n, f) => Array.from({length: n}, (_, i) => f(i));
const blank = n => Array.from({length: n});
const uniq = a => [...new Set(a)];
const sum = a => a.reduce((s, x) => s + x, 0);
const rnd = x => Math.round(x * 100) / 100;
const count = (a, k) => a.reduce((s, x) => s + (x === k ? 1 : 0), 0);
const where = (a, f) => { const r = []; for (let i = 0; i < a.length; i++) if (f(a[i], i)) r.push(i); return r; };
const at = (z, idx) => idx.map(i => [z, i]);
const caps = (keys, n) => { const o = {}; for (const k of keys) o[k] = n; return o; };
const tone = (k, t) => k.split('|')[0] + '|' + t + (k.split('|')[2] ? '|' + k.split('|')[2] : '');
// Place n fois le symbole k sur des cases vides au hasard.
function put(a, k, n) { const fr = shuf(where(a, x => x === undefined)); if (fr.length < n) return false; for (let i = 0; i < n; i++) a[fr[i]] = k; return true; }
// Remplit les cases vides en respectant un maximum par symbole ; faux s'il n'y a pas assez de place.
function fillCaps(a, cp) {
  const pool = []; for (const k in cp) for (let i = 0; i < cp[k]; i++) pool.push(k);
  shuf(pool); let p = 0;
  for (let i = 0; i < a.length; i++) if (a[i] === undefined) { if (p >= pool.length) return false; a[i] = pool[p++]; }
  return true;
}
function fillR(a, keys) { for (let i = 0; i < a.length; i++) if (a[i] === undefined) a[i] = pick(keys); return a; }
const rowsOf = (c, r) => rep(r, y => rep(c, x => y * c + x));
const colsOf = (c, r) => rep(c, x => rep(r, y => y * c + x));
const full = (a, idx) => idx.every(i => a[i] !== undefined && a[i] === a[idx[0]]);
const lazy = f => { let v; return () => v || (v = f()); };
// Somme : tous les totaux possibles d'une liste de parties (chaque partie : liste de valeurs).
function sums(lists) { let s = new Set([0]); for (const l of lists) { const n = new Set(); for (const a of s) for (const v of l) n.add(rnd(a + v)); s = n; } return [...s].sort((a, b) => a - b); }
// Découpe un total en une valeur par partie, au hasard ; ok(choix) peut refuser une découpe (combinaison du jackpot).
function decompose(lists, target, ok) {
  const memo = new Map();
  const can = (i, r) => {
    if (r < -1e-9) return false;
    if (i === lists.length) return Math.abs(r) < 1e-9;
    const k = i + ':' + r; if (memo.has(k)) return memo.get(k);
    const res = lists[i].some(v => can(i + 1, rnd(r - v))); memo.set(k, res); return res;
  };
  for (let t = 0; t < 30; t++) {
    if (!can(0, target)) return null;
    const out = []; let r = target;
    for (let i = 0; i < lists.length; i++) { const v = shuf(lists[i].slice()).find(x => can(i + 1, rnd(r - x))); out.push(v); r = rnd(r - v); }
    if (!ok || ok(out)) return out;
  }
  return null;
}

/* ======================= Parties réutilisables ======================= */
/* --- Dés --- types : Y 5 identiques, Q carré, F full, S suite, T brelan, D deux paires, P paire, N rien */
function diceEval(keys) {
  const d = keys.map(k => +k.slice(1)), c = {};
  for (const x of d) c[x] = (c[x] || 0) + 1;
  const g = Object.entries(c).map(([f, n]) => [+f, n]).sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const ds = Object.keys(c).map(Number).sort((a, b) => a - b);
  const st = ds.length === 5 && ds[4] - ds[0] === 4;
  const n0 = g[0][1], n1 = g[1] ? g[1][1] : 0;
  const type = n0 === 5 ? 'Y' : n0 === 4 ? 'Q' : n0 === 3 && n1 === 2 ? 'F' : st ? 'S' : n0 === 3 ? 'T' : n0 === 2 && n1 === 2 ? 'D' : n0 === 2 ? 'P' : 'N';
  const faces = 'YFS'.includes(type) ? ds : type === 'D' ? [g[0][0], g[1][0]] : type === 'N' ? [] : [g[0][0]];
  return {type, faces, h: where(d, x => faces.includes(x))};
}
function diceMake(type, f) {
  const a = f || between(1, 6);
  const others = (ex, n) => shuf([1, 2, 3, 4, 5, 6].filter(x => !ex.includes(x))).slice(0, n);
  let d;
  if (type === 'Y') d = [a, a, a, a, a];
  else if (type === 'Q') d = [a, a, a, a, ...others([a], 1)];
  else if (type === 'F') { const b = others([a], 1)[0]; d = [a, a, a, b, b]; }
  else if (type === 'S') { const lo = f === 6 ? 2 : f === 1 ? 1 : pick([1, 2]); d = [0, 1, 2, 3, 4].map(i => lo + i); }
  else if (type === 'T') d = [a, a, a, ...others([a], 2)];
  else if (type === 'D') { const b = others([a], 1)[0]; d = [a, a, b, b, ...others([a, b], 1)]; }
  else if (type === 'P') d = [a, a, ...others([a], 3)];
  else { const ex = pick([2, 3, 4, 5]); d = [1, 2, 3, 4, 5, 6].filter(x => x !== ex); }
  return shuf(d).map(x => '%' + x);
}
const DICE_N = ['N', 'P', 'D', 'T', 'S', 'F', 'Q', 'Y'];
const DICE_NAME = {Y: 'cinq dés identiques', Q: 'carré', F: 'full', S: 'suite', T: 'brelan', D: 'deux paires', P: 'paire', N: ''};

/* --- Poker (jeu de 52 cartes, sans doublon) --- */
const RK = '23456789TJQKA', SU = 'shdc';
const rv = r => RK.indexOf(r) + 2;
function pokerEval(cs) {
  const r = cs.map(c => rv(c[1])), s = cs.map(c => c[2]);
  const flush = s.every(x => x === s[0]);
  const u = uniq(r).sort((a, b) => a - b);
  const straight = u.length === 5 && (u[4] - u[0] === 4 || u.join() === '2,3,4,5,14');
  const c = {}; r.forEach(x => { c[x] = (c[x] || 0) + 1; });
  const g = Object.entries(c).map(([k, n]) => [+k, n]).sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const n0 = g[0][1], n1 = g[1] ? g[1][1] : 0;
  let type;
  if (straight && flush) type = u[0] === 10 ? 'RF' : 'SF';
  else if (n0 === 4) type = 'Q4'; else if (n0 === 3 && n1 === 2) type = 'FH'; else if (flush) type = 'FL';
  else if (straight) type = 'ST'; else if (n0 === 3) type = 'T3'; else if (n0 === 2 && n1 === 2) type = 'TP';
  else if (n0 === 2) type = 'P1'; else type = 'HC';
  const ranks = ['RF', 'SF', 'FH', 'FL', 'ST'].includes(type) ? u : type === 'TP' ? [g[0][0], g[1][0]] : type === 'HC' ? [] : [g[0][0]];
  return {type, ranks, h: where(r, x => ranks.includes(x))};
}
const straightRanks = lo => lo === 0 ? ['A', '2', '3', '4', '5'] : RK.slice(lo - 1, lo + 4).split('');
function pokerMake(type, rk) {
  const card = (r, s) => '@' + r + s, SS = SU.split('');
  const suits = n => shuf(SS.slice()).slice(0, n);
  const oth = (ex, n) => shuf(RK.split('').filter(x => !ex.includes(x))).slice(0, n);
  const mixed = rs => { let ss; do { ss = rs.map(() => pick(SS)); } while (ss.every(x => x === ss[0])); return rs.map((r, i) => card(r, ss[i])); };
  const a = rk || pick(RK.split(''));
  let out;
  if (type === 'RF') { const s = pick(SS); out = 'TJQKA'.split('').map(r => card(r, s)); }
  else if (type === 'SF') { const s = pick(SS); out = straightRanks(between(0, 8)).map(r => card(r, s)); }
  else if (type === 'Q4') out = [...SS.map(s => card(a, s)), card(oth([a], 1)[0], pick(SS))];
  else if (type === 'FH') { const b = oth([a], 1)[0]; out = [...suits(3).map(s => card(a, s)), ...suits(2).map(s => card(b, s))]; }
  else if (type === 'FL') { const s = pick(SS); out = oth([], 5).map(r => card(r, s)); }
  else if (type === 'ST') out = mixed(straightRanks(between(0, 9)));
  else if (type === 'T3') { const [b, c] = oth([a], 2); out = [...suits(3).map(s => card(a, s)), card(b, pick(SS)), card(c, pick(SS))]; }
  else if (type === 'TP') { const [b, c] = oth([a], 2); out = [...suits(2).map(s => card(a, s)), ...suits(2).map(s => card(b, s)), card(c, pick(SS))]; }
  else if (type === 'P1') out = [...suits(2).map(s => card(a, s)), ...oth([a], 3).map(r => card(r, pick(SS)))];
  else out = mixed(oth([], 5));
  return shuf(out);
}
const POKER_NAME = {RF: 'quinte flush royale', SF: 'quinte flush', Q4: 'carré', FH: 'full', FL: 'couleur', ST: 'quinte', T3: 'brelan', TP: 'double paire', P1: 'paire', HC: ''};

/* --- Bingo 4×4 : 16 numéros distincts de 1 à 40, 10 numéros tirés --- */
const B_LINES = [...rowsOf(4, 4), ...colsOf(4, 4)], B_DIAG = [[0, 5, 10, 15], [3, 6, 9, 12]];
function bingoEval(drawn, grid) {
  const D = new Set(drawn), m = grid.map(k => D.has(k));
  let v = 0, d = 0; const h = new Set();
  for (const l of B_LINES) if (l.every(i => m[i])) { v += 5; l.forEach(i => h.add(i)); }
  for (const l of B_DIAG) if (l.every(i => m[i])) { v += 10; d++; l.forEach(i => h.add(i)); }
  return {v, cross: d === 2, m, h: [...h]};
}
const bits = l => l.reduce((m, i) => m | 1 << i, 0), BM_LINES = B_LINES.map(bits), BM_DIAG = B_DIAG.map(bits);
// Toutes les grilles cochées possibles (au plus 10 cases), rangées par gain.
const bingoMasks = lazy(() => {
  const by = {};
  for (let mask = 0; mask < 65536; mask++) {
    let pop = 0; for (let x = mask; x; x &= x - 1) pop++;
    if (pop > 10) continue;
    let v = 0, d = 0;
    for (const L of BM_LINES) if ((mask & L) === L) v += 5;
    for (const L of BM_DIAG) if ((mask & L) === L) { v += 10; d++; }
    const k = v + (d === 2 ? 'X' : '');
    (by[k] = by[k] || []).push(mask);
  }
  return by;
});
function bingoMake(mask) {
  const nums = shuf(rep(40, i => i + 1)), grid = nums.slice(0, 16);
  const drawn = grid.filter((_, i) => mask >> i & 1);
  let p = 16; while (drawn.length < 10) drawn.push(nums[p++]);
  return [shuf(drawn).map(n => '#' + n), grid.map(n => '#' + n)];
}

/* --- Constellations (positions fixes en %, liens visibles) --- */
const SKY5 = [
  {n: 'Le Cerf-volant', p: [[8, 14], [20, 6], [28, 22], [14, 32]], l: [[0, 1], [1, 2], [2, 3], [3, 0]]},
  {n: 'La Flèche', p: [[36, 44], [46, 38], [56, 32], [66, 26]], l: [[0, 1], [1, 2], [2, 3]]},
  {n: 'Le Carré', p: [[74, 8], [92, 8], [92, 24], [74, 24]], l: [[0, 1], [1, 2], [2, 3], [3, 0]]},
  {n: 'Le Crochet', p: [[8, 56], [18, 66], [30, 62], [30, 50]], l: [[0, 1], [1, 2], [2, 3]]},
  {n: 'La Couronne', p: [[62, 66], [72, 56], [82, 66], [92, 56]], l: [[0, 1], [1, 2], [2, 3]]},
];
const SKY8 = {n: 'Le Grand Chariot', p: [[8, 30], [24, 24], [40, 30], [54, 38], [66, 30], [84, 30], [86, 62], [66, 62]], l: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 4]]};

/* ======================= Les tickets ======================= */
// Les 15 catégories du catalogue (10 tickets chacune). Prix et jackpot de chaque ticket : table CAT plus bas.
const SER = {cl: {n: 'Classique'}, br: {n: 'Bronze'}, ag: {n: 'Argent'}, or: {n: 'Or'}, di: {n: 'Diamant'}, em: {n: 'Émeraude'},
  ru: {n: 'Rubis'}, pl: {n: 'Platine'}, my: {n: 'Mythique'}, le: {n: 'Légendaire'}, ce: {n: 'Céleste'}, dv: {n: 'Divin'},
  co: {n: 'Cosmique'}, in: {n: 'Infini'}, do: {n: 'Dopamine Ultime'}};
const TK = [];
function T(num, name, ser, ico, c, Z, rule, o) {
  const {outs, ...rest} = o;
  const t = Object.assign({num, id: 't' + String(num).padStart(3, '0'), name, ser, ico, c, Z, rule, jm: 0}, rest);
  // Paliers : une liste, ou outsF() calculée à la première demande (certaines énumérations coûtent cher au chargement).
  let cache = outs && outs.length ? outs : null;
  Object.defineProperty(t, 'outs', {get: () => cache || (cache = t.outsF ? t.outsF() : []), set: v => { cache = v; }, enumerable: true});
  TK.push(t); return t;
}
const COLS = ['g', 'b', 'r', 'v'];

/* ---------- 001–010 : CLASSIQUE ---------- */
// 001 : trèfles de couleur ; le meilleur groupe (3+) paie, un trèfle doré double ; 9 dorés = jackpot.
const CLV = {P3: {g: 1, b: 1.5, r: 2, v: 3}, P4: {g: 2, b: 3, r: 5, v: 10}, G: '🍀|o', K: c => '🍀|' + c};
function cloverScore(g) {
  const n = {}; for (const x of g) n[x] = (n[x] || 0) + 1;
  let best = 0, bc = null;
  for (const c of COLS) { const k = n[CLV.K(c)] || 0; if (k >= 3) { const p = (k >= 4 ? CLV.P4 : CLV.P3)[c]; if (p > best) { best = p; bc = c; } } }
  if (!best) return {v: 0, h: []};
  const gold = n[CLV.G] || 0;
  return {v: gold ? best * 2 : best, h: where(g, x => x === CLV.K(bc) || (gold && x === CLV.G))};
}
const CLV_OPTS = []; for (const c of COLS) for (const n of [3, 4, 5]) for (const d of [0, 1]) CLV_OPTS.push({c, n, d, v: (n >= 4 ? CLV.P4 : CLV.P3)[c] * (d ? 2 : 1)});
function cloverMake(v) {
  const a = blank(9);
  if (!v) { put(a, CLV.G, between(1, 3)); return fillCaps(a, caps(COLS.map(CLV.K), 2)) ? a : null; }
  const o = pick(CLV_OPTS.filter(x => x.v === v)); if (!o) return null;
  put(a, CLV.K(o.c), o.n); if (o.d) put(a, CLV.G, between(1, 2));
  return fillCaps(a, caps(COLS.filter(c => c !== o.c).map(CLV.K), 2)) ? a : null;
}
T(1, 'Trèfle Chanceux', 'cl', '🍀', ['#1B5E20', '#A5D6A7'], [{n: 9, c: 3}],
  'Au moins 3 trèfles de la même couleur : tu gagnes (vert 1×, bleu 1,5×, rouge 2×, violet 3× ; doublé à partir de 4). Un trèfle doré double le gain. 9 trèfles dorés = JACKPOT.',
  {outs: uniq(CLV_OPTS.map(o => o.v)),
    score(b) { const g = b[0]; if (g.every(x => x === CLV.G)) return {v: J, h: at(0, rep(9, i => i))}; const r = cloverScore(g); return {v: r.v, h: at(0, r.h)}; },
    make(v) { if (v === J) return [blank(9).fill(CLV.G)]; const a = cloverMake(v); return a && [a]; }});

// 002 : sept chiffres ; trois 7 = 2×, quatre = 10×, cinq = jackpot (six ou sept 7 n'existent pas).
T(2, 'Lucky Seven', 'cl', '7️⃣', ['#B71C1C', '#FFCDD2'], [{n: 7, c: 7}],
  'Trois 7 : 2× la mise. Quatre 7 : 10×. Cinq 7 : JACKPOT.',
  {outs: [2, 10],
    score(b) { const n = count(b[0], '#7'), h = at(0, where(b[0], x => x === '#7')); return {v: n >= 5 ? J : n === 4 ? 10 : n === 3 ? 2 : 0, h: n >= 3 ? h : []}; },
    make(v) { const n = v === J ? 5 : v === 10 ? 4 : v === 2 ? 3 : ri(3), a = blank(7); put(a, '#7', n); return [fillR(a, [0, 1, 2, 3, 4, 5, 6, 8, 9].map(x => '#' + x))]; }});

// 003 : montants ; 3 identiques (le joker arc-en-ciel complète un montant présent) ; 3 JACKPOT = jackpot.
{
  const AM = [1, 2, 3, 5, 10], JK = '🌈|w|joker', JP = '~JACKPOT';
  T(3, 'Pièces Magiques', 'cl', '🪙', ['#4A148C', '#FFD54F'], [{n: 12, c: 4}],
    'Trois montants identiques : tu gagnes ce montant. Le joker 🌈 remplace un montant manquant. Seul le meilleur montant est payé. Trois JACKPOT = JACKPOT.',
    {outs: AM,
      score(b) {
        const g = b[0];
        if (count(g, JP) >= 3) return {v: J, h: at(0, where(g, x => x === JP))};
        const j = count(g, JK);
        for (const a of AM.slice().reverse()) { const c = count(g, '$' + a); if (c >= 1 && c + j >= 3) return {v: a, h: at(0, where(g, x => x === '$' + a || x === JK))}; }
        return {v: 0, h: []};
      },
      make(v) {
        const a = blank(12), amt = AM.map(x => '$' + x);
        if (v === J) { put(a, JP, 3); return fillCaps(a, caps(amt, 2)) ? [a] : null; }
        if (!v) return fillCaps(a, {...caps(amt, 2), [JP]: 2}) ? [a] : null;
        if (ri(2)) { put(a, '$' + v, 3); return fillCaps(a, {...caps(amt.filter(x => x !== '$' + v), 2), [JP]: 2}) ? [a] : null; }
        put(a, '$' + v, 2); put(a, JK, 1);
        const cp = {[JP]: 2}; for (const x of AM) if (x !== v) cp['$' + x] = x > v ? 1 : 2;
        return fillCaps(a, cp) ? [a] : null;
      }});
}

// 004 : 4 lignes de 3 rouleaux, chaque ligne est jugée seule, les gains s'additionnent ; 777 = jackpot.
{
  const S = ['🍒', '🍋', '🍊', '🔔', '💎', '7️⃣'], PAY = {'🍒': 2, '🍋': 3, '🍊': 5, '🔔': 10, '💎': 25};
  const lists = rep(4, () => [0, 2, 3, 5, 10, 25]);
  const lose = () => { let l; do { l = rep(3, () => pick(S)); } while (l[0] === l[1] && l[1] === l[2]); return l; };
  T(4, 'Cherry Pop', 'cl', '🍒', ['#C2185B', '#FFF59D'], [{n: 12, c: 3, lines: true}],
    'Trois symboles identiques sur une ligne : 🍒 2×, 🍋 3×, 🍊 5×, 🔔 10×, 💎 25×. Les 4 lignes s\'additionnent. 7️⃣7️⃣7️⃣ = JACKPOT.',
    {outs: sums(lists).filter(v => v > 0),
      score(b) {
        const g = b[0]; let v = 0, jack = false; const h = [];
        for (const l of rowsOf(3, 4)) if (full(g, l)) { if (g[l[0]] === '7️⃣') jack = true; else v += PAY[g[l[0]]]; h.push(...l); }
        return {v: jack ? J : v, h: at(0, h)};
      },
      make(v) {
        if (v === J) { const r = ri(4); return [rep(4, i => i === r ? ['7️⃣', '7️⃣', '7️⃣'] : lose()).flat()]; }
        const d = decompose(lists, v); if (!d) return null;
        return [shuf(d).map(x => x ? rep(3, () => Object.keys(PAY).find(k => PAY[k] === x)) : lose()).flat()];
      }});
}

// 005 : 6 coffres (clé, montant ou vide) ; chaque clé ouvre la case bonus suivante (de gauche à droite).
{
  const KEY = '🗝️|y|clé', EMPTY = '📭|n', CROWN = '👑|o|couronne', BON = [2, 5, 10, 'C'];
  const conf = lazy(() => {
    const by = {};
    for (let k = 0; k <= 3; k++) for (let n1 = 0; n1 <= 6 - k; n1++) for (let n2 = 0; n2 <= 6 - k - n1; n2++)
      for (const x of BON) for (const y of BON) for (const z of BON) {
        const bo = [x, y, z], jack = k === 3 && bo.every(q => q === 'C');
        const v = jack ? J : n1 + 2 * n2 + sum(bo.slice(0, k).map(q => q === 'C' ? 0 : q));
        (by[v] = by[v] || []).push({k, n1, n2, bo});
      }
    return by;
  });
  T(5, 'Mini Coffres', 'cl', '🧰', ['#5D4037', '#FFE0B2'], [{n: 6, c: 3, t: 'Coffres'}, {n: 3, c: 3, t: 'Cases bonus : la 1re clé ouvre la 1re case, etc.', lock: true}],
    'Les montants trouvés dans les coffres s\'additionnent. Chaque clé ouvre une case bonus (une seule fois) et ajoute son montant. 3 clés et 3 couronnes dans les cases bonus = JACKPOT.',
    {outs: [], // calculé plus bas
      score(b) {
        const [c, bo] = b, k = Math.min(3, count(c, KEY));
        if (k === 3 && bo.every(x => x === CROWN)) return {v: J, h: [...at(0, where(c, x => x === KEY)), ...at(1, [0, 1, 2])], open: 3};
        const h = at(0, where(c, x => x[0] === '$' || x === KEY));
        let v = sum(c.filter(x => x[0] === '$').map(x => +x.slice(1)));
        for (let i = 0; i < k; i++) if (bo[i][0] === '$') { v += +bo[i].slice(1); h.push([1, i]); }
        return {v, h: v ? h : [], open: k};
      },
      make(v) {
        const L = conf()[v]; if (!L) return null;
        const o = pick(L), c = shuf([...rep(o.k, () => KEY), ...rep(o.n1, () => '$1'), ...rep(o.n2, () => '$2')]);
        while (c.length < 6) c.push(EMPTY);
        return [shuf(c), o.bo.map(q => q === 'C' ? CROWN : '$' + q)];
      }});
  TK[TK.length - 1].outsF = () => Object.keys(conf()).filter(k => k !== J).map(Number).filter(v => v > 0).sort((a, b) => a - b);
}

// 006 : étoiles 3×3 ; lignes, colonnes, diagonales ; 3 identiques = gain de la couleur ; 3 dorées en diagonale = jackpot.
{
  const SC = ['b', 'r', 'g', 'v', 'o'], PAY = {b: 1, r: 2, g: 3, v: 5, o: 10}, K = c => '⭐|' + c;
  const L8 = [...rowsOf(3, 3), ...colsOf(3, 3), [0, 4, 8], [2, 4, 6]];
  const sc = g => {
    let v = 0, jack = false; const h = [];
    L8.forEach((l, li) => { if (!full(g, l)) return; const c = g[l[0]].split('|')[1]; if (c === 'o' && li >= 6) jack = true; else v += PAY[c]; h.push(...l); });
    return {v: jack ? J : v, h};
  };
  const opts = lazy(() => {
    const by = {}, sub = [];
    for (let a = 0; a < 8; a++) { sub.push([a]); for (let b = a + 1; b < 8; b++) { sub.push([a, b]); for (let c = b + 1; c < 8; c++) sub.push([a, b, c]); } }
    for (const s of sub) {
      const combos = s.length === 1 ? SC.map(x => [x]) : s.length === 2 ? SC.flatMap(x => SC.map(y => [x, y])) : SC.flatMap(x => SC.flatMap(y => SC.map(z => [x, y, z])));
      for (const cs of combos) {
        const g = blank(9); let ok = true;
        s.forEach((li, j) => L8[li].forEach(i => { if (g[i] !== undefined && g[i] !== K(cs[j])) ok = false; g[i] = K(cs[j]); }));
        if (!ok) continue;
        const v = sc(g).v; if (v === J || !v) continue;
        (by[v] = by[v] || []).push(g);
      }
    }
    return by;
  });
  T(6, 'Étoile Filante', 'cl', '🌠', ['#1A237E', '#90CAF9'], [{n: 9, c: 3}],
    '3 étoiles identiques sur une ligne, une colonne ou une diagonale : bleue 1×, rouge 2×, verte 3×, violette 5×, dorée 10×. Les lignes s\'additionnent. 3 étoiles dorées en diagonale = JACKPOT.',
    {outs: [],
      score(b) { const r = sc(b[0]); return {v: r.v, h: at(0, r.h)}; },
      make(v) {
        let g;
        if (v === J) { g = blank(9); pick([[0, 4, 8], [2, 4, 6]]).forEach(i => { g[i] = K('o'); }); }
        else if (!v) g = blank(9);
        else { const L = opts()[v]; if (!L) return null; g = pick(L).slice(); }
        return [fillR(g, SC.map(K))];
      }});
  TK[TK.length - 1].outsF = () => Object.keys(opts()).map(Number).sort((a, b) => a - b);
}

// 007 : cinq dés ; seule la meilleure combinaison est payée.
{
  const PAY = {Y: J, Q: 50, F: 25, S: 10, T: 5, D: 2, P: 1, N: 0};
  T(7, 'Dés Dorés', 'cl', '🎲', ['#E65100', '#FFE082'], [{n: 5, c: 5}],
    'Paire 1×, deux paires 2×, brelan 5×, suite 10×, full 25×, carré 50×. Cinq dés identiques = JACKPOT. Seule la meilleure combinaison est payée.',
    {outs: [1, 2, 5, 10, 25, 50],
      score(b) { const r = diceEval(b[0]); return {v: PAY[r.type], h: PAY[r.type] ? at(0, r.h) : [], why: DICE_NAME[r.type]}; },
      make(v) { const ty = DICE_N.find(k => PAY[k] === v); return ty ? [diceMake(ty)] : null; }});
}

// 008 : gemmes ; 4 identiques 3×, 5 → 10×, 6+ → 25× ; 12 diamants = jackpot.
{
  const GEM = ['💎|r', '💎|b', '💎|g', '💎|v', '💎|w'], DIA = '💎|w';
  T(8, 'Chasse aux Gemmes', 'cl', '💎', ['#00695C', '#B2DFDB'], [{n: 12, c: 4}],
    'Rubis, saphirs, émeraudes, améthystes, diamants : 4 identiques 3×, 5 identiques 10×, 6 ou plus 25×. Seule la meilleure famille est payée. 12 diamants blancs = JACKPOT.',
    {outs: [3, 10, 25],
      score(b) {
        const g = b[0]; if (g.every(x => x === DIA)) return {v: J, h: at(0, rep(12, i => i))};
        let best = 0, bk = null; for (const k of GEM) { const n = count(g, k); if (n > best) { best = n; bk = k; } }
        const v = best >= 6 ? 25 : best === 5 ? 10 : best === 4 ? 3 : 0;
        return {v, h: v ? at(0, where(g, x => x === bk)) : []};
      },
      make(v) {
        const a = blank(12);
        if (v === J) return [a.fill(DIA)];
        if (!v) return fillCaps(a, caps(GEM, 3)) ? [a] : null;
        const k = pick(GEM); put(a, k, v === 3 ? 4 : v === 10 ? 5 : between(6, 8));
        return fillCaps(a, caps(GEM.filter(x => x !== k), 3)) ? [a] : null;
      }});
}

// 009 : pièces 1×, 2×, 5× ; série = au moins 4 pièces identiques (+5×), annulée par 3 bombes ; 8 coffres = jackpot.
{
  const BOMB = '💣|n|bombe', CHEST = '🧰|o|COFFRE', SY = ['$1', '$2', '$5', BOMB, CHEST];
  const sc = g => {
    if (g.every(x => x === CHEST)) return {v: J, h: rep(8, i => i)};
    let v = sum(g.filter(x => x[0] === '$').map(x => +x.slice(1)));
    const serie = ['$1', '$2', '$5'].some(k => count(g, k) >= 4) && count(g, BOMB) < 3;
    if (serie) v += 5;
    return {v, h: where(g, x => x[0] === '$'), serie};
  };
  const conf = lazy(() => {
    const by = {};
    const rec = (i, left, acc) => {
      if (i === SY.length - 1) { const ms = [...acc, ...rep(left, () => SY[i])]; const v = sc(ms).v; if (v !== J) (by[v] = by[v] || []).push(ms); return; }
      for (let n = 0; n <= left; n++) rec(i + 1, left - n, [...acc, ...rep(n, () => SY[i])]);
    };
    rec(0, 8, []);
    return by;
  });
  T(9, 'Bombe de Coins', 'cl', '💣', ['#212121', '#FFB74D'], [{n: 8, c: 4}],
    'Tous les montants trouvés s\'additionnent. Série : 4 pièces identiques ou plus = +5×, sauf s\'il y a 3 bombes ou plus (elles n\'annulent que la série). 8 COFFRES = JACKPOT. L\'ordre de grattage ne change rien.',
    {outs: [],
      score(b) { const r = sc(b[0]); return {v: r.v, h: at(0, r.h), why: r.serie ? 'série' : ''}; },
      make(v) { if (v === J) return [blank(8).fill(CHEST)]; const L = conf()[v]; return L ? [shuf(pick(L).slice())] : null; }});
  TK[TK.length - 1].outsF = () => Object.keys(conf()).map(Number).filter(v => v > 0).sort((a, b) => a - b);
}

// 010 et 030 : mini-grilles de 3 symboles (3 identiques = gain du symbole) ; toutes avec le symbole doré = jackpot.
function miniGames(num, name, ser, ico, c, games, vals) {
  const lists = games.map(() => [0, ...vals]), jc = games.map(() => vals[2]);
  const keyOf = (gi, v) => games[gi].s[vals.indexOf(v)];
  return T(num, name, ser, ico, c, games.map(g => ({n: 3, c: 3, t: g.t})),
    `Chaque mini-jeu : 3 symboles identiques = gain du symbole (${games[0].s.map((s, i) => s.split('|')[0] + (i === 2 ? ' doré' : '') + ' ' + vals[i] + '×').join(', ')}). Les gains s'additionnent. Tous les mini-jeux avec le symbole doré = JACKPOT.`,
    {outsF: () => sums(lists).filter(v => v > 0 && decompose(lists, v, d => d.join() !== jc.join())),
      score(b) {
        let v = 0, golds = 0; const h = [];
        b.forEach((z, zi) => { if (!full(z, [0, 1, 2])) return; const i = games[zi].s.indexOf(z[0]); if (i < 0) return; v += vals[i]; if (i === 2) golds++; h.push(...at(zi, [0, 1, 2])); });
        return {v: golds === games.length ? J : v, h};
      },
      make(v) {
        const d = v === J ? jc : decompose(lists, v, x => x.join() !== jc.join()); if (!d) return null;
        return d.map((x, gi) => { if (x) return rep(3, () => keyOf(gi, x)); let z; do { z = rep(3, () => pick(games[gi].s)); } while (full(z, [0, 1, 2])); return z; });
      }});
}
miniGames(10, 'Super Chance', 'cl', '🌈', ['#6A1B9A', '#F8BBD0'], [
  {t: 'Trèfles', s: ['🍀|g', '🍀|b', '🍀|o']}, {t: 'Dés', s: ['🎲|w', '🎲|r', '🎲|o']},
  {t: 'Pièces', s: ['🪙|k', '🪙|s', '🪙|o']}, {t: 'Étoiles', s: ['⭐|b', '⭐|v', '⭐|o']}], [1, 2, 5]);

/* ---------- 011–020 : BRONZE ---------- */
// Compteur générique : n symboles « cible » → gain selon des seuils ; un symbole « doubleur » double le gain.
function countTicket(num, name, ser, ico, c, Z, rule, o) {
  const n = Z[0].n;
  return T(num, name, ser, ico, c, Z, rule, {
    outs: uniq(o.th.flatMap(([, v]) => o.dbl ? [v, v * 2] : [v])).sort((a, b) => a - b),
    score(b) {
      const g = b[0];
      if (o.jack(g)) return {v: J, h: at(0, rep(n, i => i))};
      const k = o.tgt.reduce((s, t) => s + count(g, t), 0);
      const th = o.th.slice().reverse().find(([m]) => k >= m);
      if (!th) return {v: 0, h: []};
      const d = o.dbl && g.includes(o.dbl);
      return {v: th[1] * (d ? 2 : 1), h: at(0, where(g, x => o.tgt.includes(x) || (d && x === o.dbl)))};
    },
    make(v) {
      const a = blank(n);
      if (v === J) return o.makeJ();
      let opts = [];
      o.th.forEach(([m], i) => { const hi = o.th[i + 1] ? o.th[i + 1][0] - 1 : Math.min(n, m + 2); [0, 1].forEach(d => { if (d && !o.dbl) return; const val = o.th[i][1] * (d ? 2 : 1); if (val === v) opts.push({lo: m, hi, d}); }); });
      if (!v) opts = [{lo: 0, hi: o.th[0][0] - 1, d: 0}];
      const op = pick(opts); if (!op) return null;
      const k = between(op.lo, Math.min(op.hi, n - (op.d ? 1 : 0) - (o.minRest || 0)));
      for (let i = 0; i < k; i++) put(a, pick(o.tgt), 1);
      if (op.d) put(a, o.dbl, between(1, Math.min(3, n - k)));
      else if (o.dbl && !v) put(a, o.dbl, ri(3));
      return [fillR(a, o.rest)];
    }});
}
countTicket(11, 'Bronze Rush', 'br', '🧈', ['#6D4C41', '#D7A26A'], [{n: 15, c: 5}],
  'Lingots de bronze : 3 = 3×, 4 = 10×, 5 ou plus = 25×. Un lingot brillant double le gain. 15 lingots brillants = JACKPOT.',
  {tgt: ['🧈|k'], dbl: '🧈|o', th: [[3, 3], [4, 10], [5, 25]], rest: ['🪨|n', '🔸|k'],
    jack: g => g.every(x => x === '🧈|o'), makeJ: () => [blank(15).fill('🧈|o')]});

// 012 : 5 tunnels de 4 cases ; 3 pépites ou plus = 2×, 4 coffres = 10× ; 5 tunnels gagnants = jackpot.
{
  const ST = '🪨|n', NU = '🔸|y', CH = '🧰|k', SY = [ST, NU, CH];
  const tun = r => { const n = count(r, NU); return count(r, CH) === 4 ? 10 : n >= 3 ? 2 : 0; };
  const mk = v => { let r; if (v === 10) return [CH, CH, CH, CH]; if (v === 2) { const n = between(3, 4); r = [...rep(n, () => NU), ...rep(4 - n, () => pick([ST, CH]))]; return shuf(r); } do { r = rep(4, () => pick(SY)); } while (tun(r)); return r; };
  const lists4 = rep(4, () => [0, 2, 10]);
  T(12, 'Mine Abandonnée', 'br', '⛏️', ['#3E2723', '#A1887F'], [{n: 20, c: 4, lines: true, t: '5 tunnels'}],
    'Un tunnel avec au moins 3 pépites : 2×. Un tunnel avec 4 coffres : 10×. Les tunnels s\'additionnent. Les 5 tunnels gagnants = JACKPOT.',
    {outs: sums(lists4).filter(v => v > 0),
      score(b) {
        const g = b[0], rs = rowsOf(4, 5); let v = 0, w = 0; const h = [];
        for (const l of rs) { const x = tun(l.map(i => g[i])); if (x) { v += x; w++; h.push(...l); } }
        return {v: w === 5 ? J : v, h: at(0, h)};
      },
      make(v) {
        if (v === J) return [rep(5, () => mk(pick([2, 10]))).flat()];
        const d = decompose(lists4, v); if (!d) return null;
        d.splice(ri(5), 0, 0);
        return [d.map(mk).flat()];
      }});
}

// 013 : bingo. Correction : une grille entière (16 cases) est impossible avec 10 numéros tirés ; le jackpot est la croix (les 2 diagonales).
T(13, 'Bingo Bronze', 'br', '🎱', ['#8D6E63', '#FFCC80'], [{n: 10, c: 5, t: 'Numéros tirés'}, {n: 16, c: 4, t: 'Ta grille'}],
  'Chaque ligne ou colonne entièrement cochée : 5×. Chaque diagonale complète : 10×. Une case compte pour toutes ses lignes. Les deux diagonales (la croix) = JACKPOT.',
  {outs: [],
    score(b) {
      const r = bingoEval(b[0], b[1]);
      const D = new Set(b[1]);
      const hd = at(0, where(b[0], x => D.has(x)));
      return {v: r.cross ? J : r.v, h: [...at(1, r.h), ...(r.v ? hd : [])], mark: at(1, where(r.m, x => x))};
    },
    make(v) { const L = bingoMasks()[v === J ? pick(Object.keys(bingoMasks()).filter(k => k.endsWith('X'))) : v]; return L ? bingoMake(pick(L)) : null; }});
TK[TK.length - 1].outsF = () => Object.keys(bingoMasks()).filter(k => !k.endsWith('X')).map(Number).filter(v => v > 0).sort((a, b) => a - b);

// 014 : roue de 6 segments ; roues 3 → 10×, 4 → 25×, 5 → 50×, 6 → jackpot ; sinon 3 métaux identiques → 2×.
{
  const WH = '🛞|n', MET = ['🥉', '🥈', '🥇'], CR = '👑|n';
  T(14, 'Roue Antique', 'br', '🛞', ['#795548', '#E6C27A'], [{n: 6, c: 3, kind: 'ring'}],
    'Roues : 3 = 10×, 4 = 25×, 5 = 50×, 6 = JACKPOT. Sans combinaison de roues, 3 métaux identiques (bronze, argent, or) = 2×. Seul le meilleur gain est payé.',
    {outs: [2, 10, 25, 50],
      score(b) {
        const g = b[0], w = count(g, WH);
        if (w >= 3) return {v: w === 6 ? J : w === 5 ? 50 : w === 4 ? 25 : 10, h: at(0, where(g, x => x === WH))};
        const m = MET.find(x => count(g, x) >= 3);
        return m ? {v: 2, h: at(0, where(g, x => x === m))} : {v: 0, h: []};
      },
      make(v) {
        const a = blank(6);
        if (v === J) return [a.fill(WH)];
        if (v >= 10) { put(a, WH, {10: 3, 25: 4, 50: 5}[v]); return [fillR(a, [...MET, CR])]; }
        put(a, WH, ri(3));
        if (v === 2) { put(a, pick(MET), 3); return [fillR(a, [...MET, CR])]; }
        return fillCaps(a, {...caps(MET, 2), [CR]: 6}) ? [a] : null;
      }});
}

// 015 : glyphes. Correction : une « paire » = un glyphe présent exactement 2 fois (sinon tous les tickets gagneraient).
{
  const GL = ['☀️', '🌙', '🐍', '👁️', '🗝️', '👑'], VAL = g => g === '🗝️' || g === '👑' ? 5 : 1, SEAL = '🔏|o|SCEAU', NO = '🪨|n';
  const conf = lazy(() => {
    const by = {};
    const rec = (i, left, acc) => {
      if (i === 5) { const v = [...acc, left]; const val = sum(v.map((n, j) => n === 2 ? VAL(GL[j]) : 0)); (by[val] = by[val] || []).push(v); return; }
      for (let n = 0; n <= left; n++) rec(i + 1, left - n, [...acc, n]);
    };
    rec(0, 12, []);
    return by;
  });
  const six = v => v.every(n => n === 2);
  T(15, 'Temple Perdu', 'br', '🏛️', ['#33691E', '#D4B483'], [{n: 12, c: 4}, {n: 1, c: 1, t: 'Zone bonus'}],
    'Un glyphe présent exactement 2 fois forme une paire : 1× (clé ou couronne : 5×). Les paires s\'additionnent. Les 6 paires avec le SCEAU dans la zone bonus = JACKPOT.',
    {outs: [],
      score(b) {
        const g = b[0], pairs = GL.filter(x => count(g, x) === 2);
        if (pairs.length === 6 && b[1][0] === SEAL) return {v: J, h: [...at(0, rep(12, i => i)), [1, 0]]};
        return {v: sum(pairs.map(VAL)), h: at(0, where(g, x => pairs.includes(x)))};
      },
      make(v) {
        if (v === J) return [shuf(GL.flatMap(x => [x, x])), [SEAL]];
        const L = conf()[v]; if (!L) return null;
        const vec = pick(L);
        return [shuf(vec.flatMap((n, j) => rep(n, () => GL[j]))), [six(vec) ? NO : pick([SEAL, NO, NO])]];
      }});
  TK[TK.length - 1].outsF = () => Object.keys(conf()).map(Number).filter(v => v > 0).sort((a, b) => a - b);
}

// 016 : poker, meilleure main uniquement.
{
  const PAY = {RF: J, SF: 100, Q4: 50, FH: 25, FL: 15, ST: 10, T3: 5, TP: 2, P1: 1, HC: 0};
  T(16, 'Poker Bronze', 'br', '🃏', ['#1B5E20', '#CD7F32'], [{n: 5, c: 5}],
    'Paire 1×, double paire 2×, brelan 5×, quinte 10×, couleur 15×, full 25×, carré 50×, quinte flush 100×. Quinte flush royale = JACKPOT.',
    {outs: [1, 2, 5, 10, 15, 25, 50, 100],
      score(b) { const r = pokerEval(b[0]); return {v: PAY[r.type], h: PAY[r.type] ? at(0, r.h) : [], why: POKER_NAME[r.type]}; },
      make(v) { const ty = Object.keys(PAY).find(k => PAY[k] === v); return ty ? [pokerMake(ty)] : null; },
      check: b => uniq(b[0]).length === 5});
}

// 017 et 046 : codes. Chaque position a un symbole gagnant et 3 candidats ; seule la bonne position compte.
function codeTicket(num, name, ser, ico, c, P, pool, tiles, pays, rule) {
  const [nt, gt] = tiles;  // teinte normale, teinte dorée/royale
  const nm = Object.keys(pays).map(Number);
  return T(num, name, ser, ico, c, [{n: P, c: P, t: 'Code'}, {n: 3 * P, c: P, t: 'Tes candidats (colonne = position)'}], rule, {
    outs: uniq(Object.values(pays)).sort((a, b) => a - b),
    score(b) {
      const [code, cand] = b;
      const m = rep(P, p => [0, 1, 2].some(r => cand[r * P + p] === code[p]));
      const n = m.filter(Boolean).length;
      const h = []; m.forEach((x, p) => { if (x) { h.push([0, p]); [0, 1, 2].forEach(r => { if (cand[r * P + p] === code[p]) h.push([1, r * P + p]); }); } });
      if (n === P && code.every(k => k.endsWith('|' + gt))) return {v: J, h};
      return {v: pays[n] || 0, h: pays[n] ? h : []};
    },
    make(v) {
      let n;
      if (v === J) n = P; else if (!v) n = between(0, Math.min(...nm) - 1); else n = +pick(nm.filter(k => pays[k] === v));
      if (n === undefined || isNaN(n)) return null;
      const pos = shuf(rep(P, i => i)).slice(0, n);
      const sym = () => pick(pool) + '|' + (Math.random() < 0.2 ? gt : nt);
      const code = rep(P, () => sym());
      if (v === J) code.forEach((k, i) => { code[i] = tone(k, gt); });
      const cand = blank(3 * P);
      for (let p = 0; p < P; p++) {
        const win = pos.includes(p), wr = ri(3);
        for (let r = 0; r < 3; r++) { let k; if (win && r === wr) k = code[p]; else do { k = sym(); } while (k === code[p]); cand[r * P + p] = k; }
      }
      return [code, cand];
    }});
}
codeTicket(17, 'Coffre du Roi', 'br', '👑', ['#4E342E', '#CD7F32'], 4, ['👑', '💍', '🗝️', '🏺', '📜', '⚜️'], ['k', 'o'], {1: 1, 2: 3, 3: 10, 4: 50},
  'Une position est trouvée si un de ses 3 candidats est son symbole exact (même couleur). 1 position : 1×, 2 : 3×, 3 : 10×, 4 : 50×. 4 positions avec 4 symboles dorés = JACKPOT.');

// Lignes : chaque ligne de L cases, gain selon le symbole quand la ligne est complète ; les lignes s'additionnent.
function lineTicket(num, name, ser, ico, c, R, L, pays, rule, o = {}) {
  const S = Object.keys(pays), lists = rep(R, () => [0, ...uniq(Object.values(pays))]);
  const all = o.all;  // symbole qui, sur toutes les lignes, donne le jackpot
  const lose = () => { let l; do { l = rep(L, () => pick([...S, ...(o.extra || [])])); } while (full(l, rep(L, i => i)) && S.includes(l[0])); return l; };
  return T(num, name, ser, ico, c, [{n: R * L, c: L, lines: true}], rule, {
    outsF: () => sums(lists).filter(v => v > 0 && decompose(lists, v, x => !x.every(y => y === pays[all]))),
    score(b) {
      const g = b[0]; let v = 0, n = 0; const h = [];
      for (const l of rowsOf(L, R)) if (full(g, l) && pays[g[l[0]]]) { v += pays[g[l[0]]]; h.push(...l); if (g[l[0]] === all) n++; }
      return {v: n === R ? J : v, h: at(0, h)};
    },
    make(v) {
      if (v === J) return [blank(R * L).fill(all)];
      const d = decompose(lists, v, x => !x.every(y => y === pays[all])); if (!d) return null;
      return [d.map(x => x ? rep(L, () => pick(S.filter(k => pays[k] === x))) : lose()).flat()];
    }});
}
lineTicket(18, 'Cascade de Coins', 'br', '💰', ['#5D4037', '#FFD180'], 5, 4, {'🪙|k': 3, '💰|k': 5, '🧈|o': 10, '👑|o': 25},
  'Une ligne de 4 symboles identiques : pièces 3×, sacs 5×, lingots 10×, couronnes 25×. Les lignes s\'additionnent. 5 lignes de couronnes = JACKPOT.', {all: '👑|o'});

// 019 : œufs (meilleure combinaison) ; 3 dragons dorés dans la zone bonus = jackpot.
{
  const EG = [['🥚|w', 2], ['🥚|b', 10], ['🥚|o', 50]], DG = '🐉|o', DN = '🐉|k', REST = ['🔶|k', '🪨|n'];
  T(19, 'Dragon de Bronze', 'br', '🐉', ['#BF360C', '#CD7F32'], [{n: 12, c: 4}, {n: 3, c: 3, t: 'Zone bonus'}],
    '3 œufs ordinaires (blancs) : 2×, 3 œufs rares (bleus) : 10×, 3 œufs royaux (dorés) : 50×. Seule la meilleure combinaison est payée. 3 dragons dorés dans la zone bonus = JACKPOT.',
    {outs: [2, 10, 50],
      score(b) {
        if (b[1].every(x => x === DG)) return {v: J, h: at(1, [0, 1, 2])};
        const e = EG.slice().reverse().find(([k]) => count(b[0], k) >= 3);
        return e ? {v: e[1], h: at(0, where(b[0], x => x === e[0]))} : {v: 0, h: []};
      },
      make(v) {
        const a = blank(12), bo = rep(3, () => pick([DG, DN]));
        if (v === J) return [fillR(a, [...EG.map(e => e[0]), ...REST]), [DG, DG, DG]];
        if (bo.every(x => x === DG)) bo[ri(3)] = DN;
        const e = EG.find(x => x[1] === v);
        if (e) put(a, e[0], between(3, 4));
        const cp = caps(REST, 12); for (const [k] of EG) if (!e || k !== e[0]) cp[k] = 2;
        return fillCaps(a, cp) ? [a, bo] : null;
      }});
}

// 020 : 5×5 ; ligne complète 5×, colonne complète 10× ; 25 couronnes = jackpot.
{
  const S = ['🥉', '🪖', '🗡️', '🛡️', '👑|o'], CR = '👑|o', RS = rowsOf(5, 5), CS = colsOf(5, 5);
  const pairs = []; for (let r = 0; r <= 5; r++) for (let c = 0; c <= 5; c++) if (r + c && (r < 5 && c < 5 || r === 5 && c === 0 || c === 5 && r === 0 || r === 5 && c === 5)) pairs.push([r, c]);
  T(20, 'Bronze Suprême', 'br', '🛡️', ['#3E2723', '#CD7F32'], [{n: 25, c: 5}],
    'Une ligne de 5 symboles identiques : 5×. Une colonne : 10×. Tout s\'additionne. 5 lignes de couronnes = JACKPOT.',
    {outs: uniq(pairs.map(([r, c]) => 5 * r + 10 * c)).sort((a, b) => a - b),
      score(b) {
        const g = b[0]; let v = 0; const h = [];
        for (const l of RS) if (full(g, l)) { v += 5; h.push(...l); }
        for (const l of CS) if (full(g, l)) { v += 10; h.push(...l); }
        return {v: g.every(x => x === CR) ? J : v, h: at(0, uniq(h))};
      },
      make(v) {
        const g = blank(25);
        if (v === J) return [g.fill(CR)];
        if (v) {
          const p = pick(pairs.filter(([r, c]) => 5 * r + 10 * c === v)); if (!p) return null;
          const [r, c] = p, rs = shuf(RS.slice()).slice(0, r), cs = shuf(CS.slice()).slice(0, c);
          const one = pick(S.filter(x => !(r === 5 && c === 5) || x !== CR));
          if (r && c) [...rs, ...cs].forEach(l => l.forEach(i => { g[i] = one; }));
          else { const ls = [...rs, ...cs], ks = ls.map(() => pick(S)); if (ls.length === 5 && ks.every(k => k === ks[0])) ks[0] = S.find(k => k !== ks[1]); ls.forEach((l, j) => l.forEach(i => { g[i] = ks[j]; })); }
        }
        return [fillR(g, S)];
      }});
}

/* ---------- 021–030 : ARGENT ---------- */
countTicket(21, 'Silver Storm', 'ag', '⚡', ['#37474F', '#CFD8DC'], [{n: 10, c: 5}],
  'Éclairs : 3 = 5×, 5 = 25×, 7 ou plus = 50×. Un éclair argenté double le gain. 10 éclairs argentés = JACKPOT.',
  {tgt: ['⚡|y'], dbl: '⚡|s', th: [[3, 5], [5, 25], [7, 50]], rest: ['☁️|n', '🌧️|n'],
    jack: g => g.every(x => x === '⚡|s'), makeJ: () => [blank(10).fill('⚡|s')]});

// 022 : phases de lune. Lecture : de gauche à droite puis de haut en bas.
{
  const PH = ['🌑', '🌓', '🌕', '🌗'], DEC = ['☁️|n', '🦉|n', '🌲|n', '🪨|n'];
  const ph = k => PH.indexOf(k.split('|')[0]);
  const ordered = g => { let want = 0; for (const k of g) if (ph(k) === want) want++; return want === 4; };
  T(22, 'Trésor Lunaire', 'ag', '🌕', ['#1A237E', '#E0E0E0'], [{n: 8, c: 4}],
    '2 phases de lune différentes : 2×. 3 phases : 10×. Les 4 phases dans l\'ordre (🌑 🌓 🌕 🌗, en lisant de gauche à droite) : 50×. Les 4 phases dorées = JACKPOT.',
    {outs: [2, 10, 50],
      score(b) {
        const g = b[0], types = uniq(g.map(ph).filter(x => x >= 0));
        const gold = uniq(g.filter(k => k.endsWith('|o')).map(ph).filter(x => x >= 0));
        const h = at(0, where(g, k => ph(k) >= 0));
        if (gold.length === 4) return {v: J, h};
        const n = types.length, v = n === 4 ? (ordered(g) ? 50 : 10) : n === 3 ? 10 : n === 2 ? 2 : 0;
        return {v, h: v ? h : []};
      },
      make(v) {
        const a = blank(8), tile = () => Math.random() < 0.2 ? 'o' : 's';
        if (v === J) { const p = shuf(rep(8, i => i)).slice(0, 4); PH.forEach((e, i) => { a[p[i]] = e + '|o'; }); return [fillR(a, DEC)]; }
        if (v === 50) { const p = shuf(rep(8, i => i)).slice(0, 4).sort((x, y) => x - y); PH.forEach((e, i) => { a[p[i]] = e + '|' + tile(); }); return [fillR(a, DEC)]; }
        const n = v === 2 ? 2 : v === 10 ? pick([3, 4]) : ri(2);
        const ty = shuf(PH.slice()).slice(0, n);
        if (n === 4) { const p = shuf(rep(8, i => i)).slice(0, 4); ty.forEach((e, i) => { a[p[i]] = e + '|' + tile(); }); }
        else ty.forEach(e => put(a, e + '|' + tile(), between(1, 2)));
        return [fillR(a, DEC)];
      }});
}

// 023 : 5 rouleaux, 3 lignes horizontales, symboles consécutifs depuis le 1er rouleau ; 3 lignes de 7 argentés = jackpot.
{
  const S = ['🍒', '🔔', '⭐', '💎', '7️⃣|s'], SV = '7️⃣|s', PAY = {3: 2, 4: 10, 5: 50};
  const run = l => { let n = 1; while (n < l.length && l[n] === l[0]) n++; return n; };
  const lists = rep(3, () => [0, 2, 10, 50]);
  const row = x => {
    if (!x) { let l; do { l = rep(5, () => pick(S)); } while (run(l) >= 3); return l; }
    const n = +Object.keys(PAY).find(k => PAY[k] === x), s = pick(S), l = rep(n, () => s);
    if (n < 5) l.push(pick(S.filter(k => k !== s)));
    while (l.length < 5) l.push(pick(S));
    return l;
  };
  T(23, 'Silver Slots', 'ag', '🎰', ['#263238', '#B0BEC5'], [{n: 15, c: 5, lines: true}],
    'Sur chacune des 3 lignes, symboles identiques à la suite depuis le 1er rouleau : 3 = 2×, 4 = 10×, 5 = 50×. Les lignes s\'additionnent. Les 3 lignes en 7 argentés = JACKPOT.',
    {outs: sums(lists).filter(v => v > 0),
      score(b) {
        const g = b[0]; let v = 0; const h = [];
        for (const l of rowsOf(5, 3)) { const r = l.map(i => g[i]), n = run(r); if (n >= 3) { v += PAY[n]; h.push(...l.slice(0, n)); } }
        return {v: g.every(x => x === SV) ? J : v, h: at(0, h)};
      },
      make(v) {
        if (v === J) return [blank(15).fill(SV)];
        const d = decompose(lists, v); if (!d) return null;
        const g = d.map(row).flat();
        return g.every(x => x === SV) ? null : [g];
      }});
}

countTicket(24, 'Argent Caché', 'ag', '🪨', ['#424242', '#E0E0E0'], [{n: 20, c: 5}],
  'Lingots d\'argent : 3 = 2×, 4 = 10×, 5 ou plus = 25×. Seule la meilleure combinaison est payée. 5 lingots royaux = JACKPOT.',
  {tgt: ['🧈|s'], th: [[3, 2], [4, 10], [5, 25]], rest: ['🪨|n', '🪨|n', '🪨|n', '🪨|n', '🪨|n', '🪨|n', '🪨|n', '🧈|R'],
    jack: g => count(g, '🧈|R') >= 5, makeJ: () => { const a = blank(20); put(a, '🧈|R', 5); return [fillR(a, ['🪨|n', '🧈|s'])]; }});
// (le remplissage peut ajouter des lingots royaux : la vérification refuse les grilles qui en ont 5)

// 025 : labyrinthe 5×5, entrée en haut à gauche, sortie en bas à droite, chemin orthogonal continu.
{
  const FL = '·', WA = '🧱|n', CH = '🧰|s', RC = '🧰|R';
  const reach = g => {
    if (g[0] === WA) return new Set();
    const seen = new Set([0]), q = [0];
    while (q.length) { const i = q.shift(), x = i % 5, y = (i / 5) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, j = ny * 5 + nx; if (nx < 0 || ny < 0 || nx > 4 || ny > 4 || seen.has(j) || g[j] === WA) continue; seen.add(j); q.push(j); } }
    return seen;
  };
  T(25, 'Labyrinthe Argenté', 'ag', '🧭', ['#455A64', '#ECEFF1'], [{n: 25, c: 5, kind: 'maze'}],
    'Le chemin part de l\'entrée (en haut à gauche) et passe de case en case sans les murs. Il atteint un coffre : 10×, deux coffres : 25×, la sortie (en bas à droite) : 50×. La sortie avec 3 coffres royaux sur le chemin = JACKPOT.',
    {outs: [10, 25, 50],
      score(b) {
        const g = b[0], R = reach(g), ch = [...R].filter(i => g[i] === CH || g[i] === RC), roy = ch.filter(i => g[i] === RC).length;
        const path = at(0, [...R]);
        if (R.has(24)) return {v: roy >= 3 ? J : 50, h: path, path: [...R]};
        const v = ch.length >= 2 ? 25 : ch.length === 1 ? 10 : 0;
        return {v, h: v ? path : [], path: [...R]};
      },
      make(v) {
        const g = blank(25);
        if (v === J || v === 50) {
          const mv = shuf([1, 1, 1, 1, 5, 5, 5, 5]); let i = 0; const p = [0]; for (const m of mv) { i += m; p.push(i); }
          p.forEach(k => { g[k] = FL; });
          if (v === J) shuf(p.slice(1, -1)).slice(0, 3).forEach(k => { g[k] = RC; });
          else put(g, pick([CH, RC]), ri(3));
          for (let k = 0; k < 25; k++) if (g[k] === undefined) g[k] = Math.random() < 0.5 ? WA : FL;
          return [g];
        }
        for (let k = 0; k < 25; k++) g[k] = Math.random() < 0.55 ? WA : FL;
        g[0] = v ? FL : g[0];
        const R = [...reach(g)].filter(k => k);
        const n = v === 25 ? between(2, 3) : v === 10 ? 1 : 0;
        if (R.length < n) return null;
        shuf(R).slice(0, n).forEach(k => { g[k] = Math.random() < 0.3 ? RC : CH; });
        const out = where(g, (x, k) => x === WA && !R.includes(k)); shuf(out).slice(0, ri(3)).forEach(k => { g[k] = pick([CH, RC]); });
        return [g];
      },
      check: b => b[0].every(k => [FL, WA, CH, RC].includes(k))});
}

// 026 : cristaux. Correction : avec 16 cases et 5 couleurs, une grille perdante (≤ 3 par couleur) est impossible ;
// on ajoute un symbole sans valeur, l'éclat (🪨).
countTicket(26, 'Crystal Match', 'ag', '💠', ['#01579B', '#E1F5FE'], [{n: 16, c: 4}],
  '4 cristaux identiques : 3×, 5 : 10×, 6 ou plus : 25×. Seule la meilleure couleur est payée (les éclats 🪨 ne valent rien). 16 cristaux blancs = JACKPOT.',
  {tgt: null, th: [[4, 3], [5, 10], [6, 25]], rest: null, jack: g => g.every(x => x === '💠|w'), makeJ: () => [blank(16).fill('💠|w')]});
{ // le compteur porte sur la meilleure couleur : on remplace score/make par une version « famille »
  const t = TK[TK.length - 1], CR = ['💠|w', '💠|b', '💠|r', '💠|g', '💠|v'], SH = '🪨|n';
  t.outs = [3, 10, 25];
  t.score = b => {
    const g = b[0]; if (g.every(x => x === '💠|w')) return {v: J, h: at(0, rep(16, i => i))};
    let best = 0, bk; for (const k of CR) { const n = count(g, k); if (n > best) { best = n; bk = k; } }
    const v = best >= 6 ? 25 : best === 5 ? 10 : best === 4 ? 3 : 0;
    return {v, h: v ? at(0, where(g, x => x === bk)) : []};
  };
  t.make = v => {
    const a = blank(16); if (v === J) return [a.fill('💠|w')];
    let k; if (v) { k = pick(CR); put(a, k, v === 3 ? 4 : v === 10 ? 5 : between(6, 8)); }
    return fillCaps(a, {...caps(CR.filter(x => x !== k), 3), [SH]: 16}) ? [a] : null;
  };
}

countTicket(27, 'Lucky Moon', 'ag', '🌙', ['#311B92', '#D1C4E9'], [{n: 9, c: 3}],
  'Pleines lunes : 3 = 5×, 4 = 10×, 5 ou plus = 25×. 5 pleines lunes dorées = JACKPOT.',
  {tgt: ['🌕|n', '🌕|o'], th: [[3, 5], [4, 10], [5, 25]], rest: ['🌙|n', '🌗|n', '⭐|n'],
    jack: g => count(g, '🌕|o') >= 5, makeJ: () => { const a = blank(9); put(a, '🌕|o', 5); return [fillR(a, ['🌙|n', '🌗|n', '⭐|n', '🌕|n'])]; }});

// Collections : chaque ensemble a des pièces distinctes ; complet seulement si toutes ses pièces sont là (un doublon ne remplace rien).
function collTicket(num, name, ser, ico, c, Z, sets, pieces, pays, rule) {
  const n = Z[0].n, S = sets.length, key = (s, p) => sets[s] + '|' + (p + 1);
  const done = g => rep(S, s => rep(pieces, p => g.includes(key(s, p))).every(Boolean));
  const nm = Object.keys(pays).map(Number);
  return T(num, name, ser, ico, c, Z, rule, {
    outs: uniq(Object.values(pays)).sort((a, b) => a - b),
    score(b) {
      const g = b[0], d = done(g), k = d.filter(Boolean).length;
      if (k === S) return {v: J, h: at(0, rep(n, i => i))};
      const h = at(0, where(g, x => d[sets.findIndex(s => x.startsWith(s + '|'))]));
      return {v: pays[k] || 0, h: pays[k] ? h : []};
    },
    make(v) {
      const k = v === J ? S : v ? +pick(nm.filter(x => pays[x] === v)) : 0;
      if (isNaN(k)) return null;
      const comp = shuf(rep(S, i => i)).slice(0, k), g = comp.flatMap(s => rep(pieces, p => key(s, p)));
      if (k === S) return g.length === n ? [shuf(g)] : null;
      // les ensembles incomplets perdent chacun une pièce précise, jamais présente
      const inc = rep(S, i => i).filter(s => !comp.includes(s));
      const pool = [...inc.flatMap(s => { const miss = ri(pieces); return rep(pieces, p => p).filter(p => p !== miss).map(p => key(s, p)); }), ...g];
      while (g.length < n) g.push(pick(pool));
      return g.length === n ? [shuf(g)] : null;
    }});
}
collTicket(28, 'Silver Kingdom', 'ag', '🏰', ['#37474F', '#B0BEC5'], [{n: 16, c: 4}], ['👑|r', '👑|b', '👑|g', '👑|v'], 4, {1: 5, 2: 15, 3: 50},
  'Chaque couronne (rouge, bleue, verte, violette) a 4 fragments numérotés. Une couronne complète : 5×, deux : 15×, trois : 50×. Les 4 couronnes complètes = JACKPOT. Un fragment en double ne remplace pas celui qui manque.');

// 029 : paires clé + coffre.
{
  const KEY = '🗝️|s', KG = '🗝️|o', CH = '🧰|s', CR = '🧰|R', CRY = '💠|w', X2 = '*2';
  const OPT = [{p: 1, m: 1, v: 3}, {p: 1, m: 2, v: 6}, {p: 2, m: 1, v: 6}, {p: 2, m: 2, v: 12}, {p: 3, m: 1, v: 25}, {p: 3, m: 2, v: 50}];
  T(29, 'Coffres Gelés', 'ag', '🧊', ['#006064', '#E0F7FA'], [{n: 12, c: 4}],
    'Chaque paire clé + coffre : 3×. Trois paires ou plus : 25×. Un ×2 double le gain (une seule fois). 3 coffres royaux et 3 clés dorées = JACKPOT.',
    {outs: [3, 6, 12, 25, 50],
      score(b) {
        const g = b[0], kg = count(g, KG), cr = count(g, CR);
        if (kg >= 3 && cr >= 3) return {v: J, h: at(0, where(g, x => x === KG || x === CR))};
        const k = count(g, KEY) + kg, c = count(g, CH) + cr, p = Math.min(k, c);
        const base = p >= 3 ? 25 : p * 3, m = g.includes(X2) ? 2 : 1;
        return {v: base * m, h: base ? at(0, where(g, x => [KEY, KG, CH, CR].includes(x) || (m > 1 && x === X2))) : []};
      },
      make(v) {
        const a = blank(12);
        if (v === J) { put(a, KG, 3); put(a, CR, 3); return [fillR(a, [CRY, KEY, CH, X2])]; }
        const o = v ? pick(OPT.filter(x => x.v === v)) : {p: 0, m: ri(2) + 1};
        if (!o) return null;
        const p = o.p === 3 ? between(3, 4) : o.p, extra = ri(3), kN = ri(2) ? p : p + extra, cN = kN === p ? p + extra : p;
        for (let i = 0; i < kN; i++) put(a, Math.random() < 0.25 ? KG : KEY, 1);
        for (let i = 0; i < cN; i++) put(a, Math.random() < 0.25 ? CR : CH, 1);
        if (o.m === 2) put(a, X2, between(1, 2));
        return [fillR(a, [CRY])];
      }});
}

miniGames(30, 'Silver Jackpot', 'ag', '🎯', ['#263238', '#E0E0E0'], [
  {t: 'Dés', s: ['🎲|w', '🎲|b', '🎲|o']}, {t: 'Trèfles', s: ['🍀|g', '🍀|b', '🍀|o']}, {t: 'Pièces', s: ['🪙|k', '🪙|s', '🪙|o']},
  {t: 'Cartes', s: ['🃏|w', '🃏|r', '🃏|o']}, {t: 'Cristaux', s: ['💠|b', '💠|v', '💠|o']}], [2, 5, 10]);

/* ---------- 031–040 : OR ---------- */
{
  const NU = '🔶|o', SA = '💰|o', SR = '💰|R', IN = '🧈|o', RO = '🪨|n';
  T(31, 'Gold Fever', 'or', '🔶', ['#E65100', '#FFD54F'], [{n: 16, c: 4}],
    '3 pépites : 2×, 3 sacs d\'or : 5×, 3 lingots : 10×. Seul le meilleur gain est payé. 3 sacs royaux et 12 pépites = JACKPOT.',
    {outs: [2, 5, 10],
      score(b) {
        const g = b[0], nu = count(g, NU), sa = count(g, SA) + count(g, SR);
        if (count(g, SR) >= 3 && nu >= 12) return {v: J, h: at(0, where(g, x => x === SR || x === NU))};
        if (count(g, IN) >= 3) return {v: 10, h: at(0, where(g, x => x === IN))};
        if (sa >= 3) return {v: 5, h: at(0, where(g, x => x === SA || x === SR))};
        if (nu >= 3) return {v: 2, h: at(0, where(g, x => x === NU))};
        return {v: 0, h: []};
      },
      make(v) {
        const a = blank(16);
        if (v === J) { put(a, NU, 12); put(a, SR, 3); return [fillR(a, [RO])]; }
        const cp = {[NU]: 2, [SA]: 1, [SR]: 1, [IN]: 2, [RO]: 16};
        if (v === 10) { put(a, IN, between(3, 4)); cp[IN] = 0; cp[NU] = 5; cp[SA] = 3; }
        if (v === 5) { put(a, SA, between(2, 3)); put(a, SR, 1); cp[SA] = 0; cp[SR] = 0; cp[NU] = 5; }
        if (v === 2) { put(a, NU, between(3, 6)); cp[NU] = 0; }
        return fillCaps(a, cp) ? [a] : null;
      }});
}

// 032. Correction : un niveau d'une seule case ne peut pas avoir 2 soleils ; la pyramide a 5 niveaux de 3 cases (15 cases).
{
  const SU = '☀️|y', SG = '☀️|o', OT = ['🌙|n', '👁️|n', '🪲|n'];
  const ok = l => count(l, SU) >= 2 || count(l, SG) >= 2;
  T(32, 'Golden Pyramid', 'or', '🔺', ['#BF8F00', '#FFF3C4'], rep(5, i => ({n: 3, c: 3, kind: 'pyr', w: 52 + i * 12})),
    'Un niveau est validé s\'il contient au moins 2 soleils identiques. 1 ou 2 niveaux : 2×, 3 ou 4 niveaux : 10×, les 5 niveaux : 50×. Toute la pyramide en soleils dorés = JACKPOT.',
    {outs: [2, 10, 50],
      score(b) {
        if (b.every(l => l.every(x => x === SG))) return {v: J, h: b.flatMap((l, zi) => at(zi, [0, 1, 2]))};
        const k = b.filter(ok).length, v = k === 5 ? 50 : k >= 3 ? 10 : k >= 1 ? 2 : 0;
        return {v, h: b.flatMap((l, zi) => ok(l) ? at(zi, [0, 1, 2]) : [])};
      },
      make(v) {
        if (v === J) return rep(5, () => [SG, SG, SG]);
        const k = v === 50 ? 5 : v === 10 ? between(3, 4) : v === 2 ? between(1, 2) : 0;
        const lv = shuf(rep(5, i => i)).slice(0, k);
        const out = rep(5, i => {
          if (lv.includes(i)) { const s = pick([SU, SG]), l = blank(3); put(l, s, between(2, 3)); return fillR(l, [...OT, SU, SG].filter(x => x !== s)); }
          const l = blank(3); return fillCaps(l, {[SU]: 1, [SG]: 1, ...caps(OT, 3)}) ? l : null;
        });
        return out.some(x => !x) || out.every(l => l.every(x => x === SG)) ? null : out;
      }});
}

// 033 : 7 lignes de 3 chiffres ; 3 lignes ou plus = 50× ; les 7 lignes en 7 dorés = jackpot.
{
  const SE = ['#7', '#7|o'], DG = [0, 1, 2, 3, 4, 5, 6, 8, 9].map(x => '#' + x);
  const win = l => l.every(x => SE.includes(x));
  T(33, 'Gold Rush 777', 'or', '7️⃣', ['#8D6E00', '#FFE082'], [{n: 21, c: 3, lines: true}],
    'Une ligne de trois 7 : 10×. Deux lignes : 20×. Trois lignes ou plus : 50×. Les 7 lignes en 7 dorés = JACKPOT.',
    {outs: [10, 20, 50],
      score(b) {
        const g = b[0]; if (g.every(x => x === '#7|o')) return {v: J, h: at(0, rep(21, i => i))};
        const ls = rowsOf(3, 7).filter(l => win(l.map(i => g[i]))), k = ls.length;
        return {v: k >= 3 ? 50 : k * 10, h: at(0, ls.flat())};
      },
      make(v) {
        if (v === J) return [blank(21).fill('#7|o')];
        const k = v === 50 ? between(3, 7) : v / 10, lines = shuf(rep(7, i => i)).slice(0, k);
        const g = rep(7, i => {
          if (lines.includes(i)) return rep(3, () => Math.random() < 0.3 ? '#7|o' : '#7');
          let l; do { l = rep(3, () => Math.random() < 0.3 ? pick(SE) : pick(DG)); } while (win(l)); return l;
        }).flat();
        return [g];
      }});
}

// 034 : ensembles carte + boussole + clé ; 3 ensembles et le coffre royal en zone bonus = jackpot.
{
  const MA = '🗺️', CO = '🧭', KE = '🗝️', CH = '🧰|n', TR = '🪤|n', RC = '🧰|R', NO = '🪨|n';
  T(34, 'Treasure King', 'or', '🗺️', ['#4E342E', '#FFD54F'], [{n: 9, c: 3}, {n: 1, c: 1, t: 'Zone bonus'}],
    'Une carte + une boussole + une clé forment un ensemble : 10×. Deux ensembles : 25×. Trois ensembles et le coffre royal dans la zone bonus = JACKPOT.',
    {outs: [10, 25],
      score(b) {
        const g = b[0], s = Math.min(count(g, MA), count(g, CO), count(g, KE));
        const h = at(0, where(g, x => [MA, CO, KE].includes(x)));
        if (s === 3 && b[1][0] === RC) return {v: J, h: [...h, [1, 0]]};
        return {v: s >= 2 ? 25 : s === 1 ? 10 : 0, h: s ? h : []};
      },
      make(v) {
        const a = blank(9);
        const s = v === J ? 3 : v === 25 ? between(2, 3) : v === 10 ? 1 : 0;
        for (const k of [MA, CO, KE]) put(a, k, s);
        const missing = pick([MA, CO, KE]), cp = {[CH]: 9, [TR]: 9};
        for (const k of [MA, CO, KE]) cp[k] = k === missing ? 0 : 2;
        if (!fillCaps(a, cp)) return null;
        return [a, [v === J ? RC : s === 3 ? NO : pick([RC, NO, NO])]];
      }});
}

// 035 : parties de dragon distinctes ; les 5 parties dorées et l'œuf royal = jackpot.
{
  const PA = [['🐲', 'tête'], ['🪽', 'ailes'], ['🐉', 'corps'], ['🐾', 'griffes'], ['🦎', 'queue']];
  const K = (i, t) => PA[i][0] + '|' + t + '|' + PA[i][1], EGG = '🥚|R|œuf royal', ST = '🪨|n';
  const part = k => PA.findIndex(p => k.startsWith(p[0] + '|'));
  T(35, 'Golden Dragon', 'or', '🐲', ['#B71C1C', '#FFD700'], [{n: 15, c: 5}],
    'Parties de dragon différentes : 3 = 5×, 4 = 15×, 5 = 50×. Les 5 parties en or et l\'œuf royal = JACKPOT.',
    {outs: [5, 15, 50],
      score(b) {
        const g = b[0], ps = uniq(g.map(part).filter(x => x >= 0)), gold = uniq(g.filter(k => k.includes('|o|')).map(part));
        const h = at(0, where(g, k => part(k) >= 0));
        if (gold.length === 5 && g.includes(EGG)) return {v: J, h: [...h, ...at(0, where(g, x => x === EGG))]};
        const v = {3: 5, 4: 15, 5: 50}[ps.length] || 0;
        return {v, h: v ? h : []};
      },
      make(v) {
        const a = blank(15);
        if (v === J) { PA.forEach((_, i) => put(a, K(i, 'o'), 1)); put(a, EGG, 1); return [fillR(a, [ST])]; }
        const n = {5: 3, 15: 4, 50: 5}[v] || ri(3);
        shuf(rep(5, i => i)).slice(0, n).forEach(i => put(a, K(i, Math.random() < 0.3 ? 'o' : 'r'), between(1, 2)));
        if (Math.random() < 0.3) put(a, EGG, 1);
        return [fillR(a, [ST])];
      }});
}

// 036 : montant × multiplicateur sur chaque ligne. Correction : sans case « perdue » (✖) tous les tickets gagneraient.
{
  const AM = [0, 1, 2, 5], MU = [1, 2, 5, 10], CR = '👑|o', EM = ['⚜️|n', '🔱|n', '🏛️|n'];
  const prods = uniq(AM.flatMap(a => MU.map(m => a * m)));
  const lists = rep(3, () => prods);
  T(36, 'Gold Multiplier', 'or', '✖️', ['#5D4037', '#FFD700'], [{n: 9, c: 3, lines: true, head: ['Montant', 'Multi', 'Emblème']}],
    'Sur chaque ligne, le montant est multiplié par le multiplicateur de la même ligne (jamais d\'une autre). Les 3 lignes s\'additionnent. Trois ×10 avec trois couronnes = JACKPOT.',
    {outs: sums(lists).filter(v => v > 0),
      score(b) {
        const g = b[0], rs = rowsOf(3, 3);
        if (rs.every(l => g[l[1]] === '*10' && g[l[2]] === CR)) return {v: J, h: at(0, rep(9, i => i))};
        let v = 0; const h = [];
        for (const l of rs) { const x = +g[l[0]].slice(1) * +g[l[1]].slice(1); if (x) { v += x; h.push(l[0], l[1]); } }
        return {v, h: at(0, h)};
      },
      make(v) {
        if (v === J) return [rep(3, () => ['$' + pick(AM), '*10', CR]).flat()];
        const d = decompose(lists, v); if (!d) return null;
        const g = d.map(x => { const [a, m] = pick(AM.flatMap(a => MU.map(m => [a, m])).filter(([a, m]) => a * m === x)); return ['$' + a, '*' + m, pick([...EM, CR])]; });
        if (g.every(l => l[1] === '*10' && l[2] === CR)) g[0][2] = EM[0];
        return [g.flat()];
      }});
}

collTicket(37, 'Royal Crown', 'or', '👑', ['#4A148C', '#FFD700'], [{n: 18, c: 6}], ['👑|o', '👑|s', '👑|k'], 6, {1: 10, 2: 30},
  'Trois couronnes (or, argent, bronze) de 6 fragments numérotés. Une couronne complète : 10×, deux : 30×. Les trois couronnes complètes = JACKPOT. Un fragment en double ne remplace pas celui qui manque.');

// 038 : poker + dés + machine à sous ; les gains s'additionnent. Jackpot : les 3 zones gagnent avec le symbole royal
// (le Roi dans la main de poker, le 6 dans la combinaison de dés, trois 👑 sur la machine).
{
  const PP = {RF: 100, SF: 100, Q4: 50, FH: 25, FL: 15, ST: 10, T3: 5, TP: 2, P1: 1, HC: 0};
  const DP = {Y: 50, Q: 50, F: 25, S: 10, T: 5, D: 2, P: 1, N: 0};
  const SL = {'🍒': 2, '🔔': 5, '⭐': 10, '👑|o': 25}, SLS = [...Object.keys(SL), '🍋'];
  const lists = [uniq(Object.values(PP)), uniq(Object.values(DP)), [0, ...Object.values(SL)]];
  const zone = b => {
    const p = pokerEval(b[0]), d = diceEval(b[1]), s = full(b[2], [0, 1, 2]) ? b[2][0] : null;
    return {p, d, s, pv: PP[p.type], dv: DP[d.type], sv: s ? SL[s] || 0 : 0};
  };
  const royal = z => z.pv > 0 && z.p.ranks.includes(13) && z.dv > 0 && z.d.faces.includes(6) && z.s === '👑|o';
  T(38, 'Golden Casino', 'or', '🎰', ['#1B1B1B', '#FFD700'], [{n: 5, c: 5, t: 'Poker'}, {n: 5, c: 5, t: 'Dés'}, {n: 3, c: 3, t: 'Machine'}],
    'Poker : paire 1× … quinte flush 100×. Dés : paire 1× … carré ou 5 identiques 50×. Machine : 🍒🍒🍒 2×, 🔔 5×, ⭐ 10×, 👑 25×. Les 3 zones s\'additionnent. Les 3 zones gagnantes avec le symbole royal (un Roi au poker, un 6 aux dés, 👑👑👑) = JACKPOT.',
    {outs: sums(lists).filter(v => v > 0),
      score(b) {
        const z = zone(b), h = [...(z.pv ? at(0, z.p.h) : []), ...(z.dv ? at(1, z.d.h) : []), ...(z.sv ? at(2, [0, 1, 2]) : [])];
        return {v: royal(z) ? J : z.pv + z.dv + z.sv, h};
      },
      make(v) {
        if (v === J) return [pokerMake('P1', 'K'), diceMake('P', 6), ['👑|o', '👑|o', '👑|o']];
        const d = decompose(lists, v); if (!d) return null;
        const pt = pick(Object.keys(PP).filter(k => PP[k] === d[0])), dt = pick(Object.keys(DP).filter(k => DP[k] === d[1]));
        let sl; if (d[2]) sl = rep(3, () => Object.keys(SL).find(k => SL[k] === d[2])); else do { sl = rep(3, () => pick(SLS)); } while (full(sl, [0, 1, 2]) && SL[sl[0]]);
        return [pokerMake(pt), diceMake(dt), sl];
      },
      check: b => uniq(b[0]).length === 5});
}

// 039 : chaque main de Midas change une pierre voisine (haut, droite, bas, gauche) en pièce d'or, dans l'ordre de lecture.
{
  const CO = '🪙|o', HA = '🫳|o', ST = '🪨|n';
  const gild = g => {
    const out = new Set();
    g.forEach((k, i) => {
      if (k !== HA) return;
      const x = i % 4, y = (i / 4) | 0;
      for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) { const nx = x + dx, ny = y + dy, j = ny * 4 + nx; if (nx < 0 || nx > 3 || ny < 0 || ny > 2) continue; if (g[j] === ST && !out.has(j)) { out.add(j); break; } }
    });
    return [...out];
  };
  const P = {0: [0.12, 0.1], 5: [0.25, 0.15], 25: [0.45, 0.2], 50: [0.65, 0.18]};
  T(39, 'Midas Touch', 'or', '🫳', ['#795500', '#FFF59D'], [{n: 12, c: 4}],
    'Chaque main de Midas change une pierre voisine en pièce d\'or. Pièces d\'or : 3 = 5×, 6 = 25×, 9 = 50×. 12 pièces d\'or = JACKPOT.',
    {outs: [5, 25, 50],
      score(b) {
        const g = b[0], gl = gild(g), n = count(g, CO) + gl.length;
        const h = at(0, [...where(g, x => x === CO), ...gl]);
        if (n === 12) return {v: J, h, gild: gl};
        const v = n >= 9 ? 50 : n >= 6 ? 25 : n >= 3 ? 5 : 0;
        return {v, h: v ? h : [], gild: gl};
      },
      make(v) {
        if (v === J) return [blank(12).fill(CO)];
        const [pc, ph] = P[v]; if (pc === undefined) return null;
        return [rep(12, () => { const x = Math.random(); return x < pc ? CO : x < pc + ph ? HA : ST; })];
      }});
}

collTicket(40, 'Golden Empire', 'or', '🏛️', ['#6D4C00', '#FFE082'], [{n: 20, c: 5}], ['🏛️|o', '🗿|r', '🏯|g', '🕌|b', '🗼|v'], 4, {1: 5, 2: 10, 3: 25, 4: 30},
  'Cinq monuments de 4 fragments numérotés. Un monument complet : 5×, deux : 10×, trois : 25×, quatre : 30×. Les cinq monuments complets = JACKPOT.');

/* ---------- 041–050 : DIAMANT ---------- */
// 041 : suites de 3, 4 ou 5 diamants identiques, en ligne ou en colonne ; chaque suite est payée une fois.
{
  const DC = ['💎|w', '💎|b', '💎|r', '💎|g', '💎|v'], WH = '💎|w', LN = [...rowsOf(5, 5), ...colsOf(5, 5)];
  const PAY = {3: 5, 4: 10, 5: 25};
  const runs = g => {
    const out = [];
    for (const l of LN) { let s = 0; for (let i = 1; i <= 5; i++) { if (i < 5 && g[l[i]] !== undefined && g[l[i]] === g[l[s]]) continue; if (i - s >= 3 && g[l[s]] !== undefined) out.push(l.slice(s, i)); s = i; } }
    return out;
  };
  const makesRun = (a, i) => {
    const x = i % 5, y = (i / 5) | 0, k = a[i];
    let n = 1; for (let xx = x - 1; xx >= 0 && a[y * 5 + xx] === k; xx--) n++; for (let xx = x + 1; xx < 5 && a[y * 5 + xx] === k; xx++) n++; if (n >= 3) return true;
    n = 1; for (let yy = y - 1; yy >= 0 && a[yy * 5 + x] === k; yy--) n++; for (let yy = y + 1; yy < 5 && a[yy * 5 + x] === k; yy++) n++; return n >= 3;
  };
  const noRun = a => { for (let i = 0; i < 25; i++) if (a[i] === undefined) { const k = shuf(DC.slice()).find(c => { a[i] = c; const bad = makesRun(a, i); a[i] = undefined; return !bad; }); if (!k) return false; a[i] = k; } return true; };
  const DEC = {5: [[3]], 10: [[4], [3, 3]], 15: [[3, 4], [3, 3, 3]], 20: [[4, 4]], 25: [[5]], 30: [[5, 3]], 35: [[5, 4]], 50: [[5, 5]]};
  T(41, 'Diamond Spark', 'di', '✨', ['#0D47A1', '#E3F2FD'], [{n: 25, c: 5}],
    'Diamants identiques alignés à la suite, en ligne ou en colonne : 3 = 5×, 4 = 10×, 5 = 25×. Toutes les suites s\'additionnent. 5 lignes complètes de diamants blancs = JACKPOT.',
    {outs: Object.keys(DEC).map(Number),
      score(b) {
        const g = b[0], wl = LN.filter(l => l.every(i => g[i] === WH)).length;
        const rs = runs(g);
        if (wl >= 5) return {v: J, h: at(0, uniq(rs.flat()))};
        return {v: sum(rs.map(r => PAY[r.length])), h: at(0, uniq(rs.flat()))};
      },
      make(v) {
        const a = blank(25);
        if (v === J) return [a.fill(WH)];
        if (v) {
          const lens = pick(DEC[v]); if (!lens) return null;
          const lines = shuf(LN.slice()).slice(0, lens.length);
          for (let j = 0; j < lens.length; j++) { const st = ri(5 - lens[j] + 1), c = pick(DC); for (let q = 0; q < lens[j]; q++) { const i = lines[j][st + q]; if (a[i] !== undefined && a[i] !== c) return null; a[i] = c; } }
        }
        return noRun(a) ? [a] : null;
      }});
}

countTicket(42, 'Blue Ice', 'di', '🧊', ['#01579B', '#B3E5FC'], [{n: 16, c: 4}],
  'Diamants bleus : 3 = 5×, 5 = 25×, 8 ou plus = 50×. 16 diamants royaux = JACKPOT.',
  {tgt: ['💎|b'], th: [[3, 5], [5, 25], [8, 50]], rest: ['🧊|n', '🧊|n', '🔷|b', '💎|R'],
    jack: g => g.every(x => x === '💎|R'), makeJ: () => [blank(16).fill('💎|R')]});

// 043, 047, 050 : rangées (ou lignes et colonnes) entièrement faites du même diamant.
function veinTicket(num, name, ser, ico, c, R, L, rule, cols) {
  const DC = ['💎|w', '💎|b', '💎|r', '💎|g', '💎|v'], RY = '💎|R', ROCK = '🪨|n';
  const LS = cols ? [...rowsOf(L, R), ...colsOf(L, R)] : rowsOf(L, R);
  const win = (g, l) => full(g, l) && g[l[0]] !== ROCK;
  return T(num, name, ser, ico, c, [{n: R * L, c: L, lines: !cols}], rule, {
    outs: [10, 20, 50],
    score(b) {
      const g = b[0], ws = LS.filter(l => win(g, l)), roy = ws.filter(l => g[l[0]] === RY).length;
      const h = at(0, uniq(ws.flat()));
      if (roy >= R) return {v: J, h};
      const k = ws.length;
      return {v: k >= 3 ? 50 : k * 10, h};
    },
    make(v) {
      const g = blank(R * L);
      if (v === J) return [g.fill(RY)];
      const k = v === 50 ? between(3, Math.min(R, 5)) : v / 10;
      if (cols && k && Math.random() < 0.3) {  // lignes et colonnes mêlées : une seule couleur
        const ls = shuf(LS.slice()).slice(0, k), c = pick(DC);
        ls.forEach(l => l.forEach(i => { g[i] = c; }));
      } else shuf(rowsOf(L, R)).slice(0, k).forEach(l => { const c = Math.random() < 0.1 ? RY : pick(DC); l.forEach(i => { g[i] = c; }); });
      for (let i = 0; i < g.length; i++) if (g[i] === undefined) g[i] = Math.random() < 0.3 ? ROCK : pick([...DC, RY]);
      return [g];
    }});
}
veinTicket(43, 'Diamond Mine', 'di', '⛏️', ['#263238', '#80DEEA'], 6, 4,
  'Un filon de 4 diamants identiques : 10×. Deux filons : 20×. Trois filons ou plus : 50×. Les 6 filons en diamants royaux = JACKPOT.');

// 044 : colonnes monochromes.
{
  const CR = ['💠|w', '💠|b', '💠|r', '💠|g', '💠|v'], CS = colsOf(4, 5);
  T(44, 'Crystal Palace', 'di', '🏰', ['#4A148C', '#E1BEE7'], [{n: 20, c: 4}],
    'Une colonne de 5 cristaux de la même couleur : 5×. Deux colonnes : 15×. Trois ou quatre : 50×. Les 4 colonnes en cristaux blancs = JACKPOT.',
    {outs: [5, 15, 50],
      score(b) {
        const g = b[0], ws = CS.filter(l => full(g, l)), h = at(0, ws.flat());
        if (ws.length === 4 && g.every(x => x === '💠|w')) return {v: J, h};
        const k = ws.length; return {v: k >= 3 ? 50 : k === 2 ? 15 : k === 1 ? 5 : 0, h};
      },
      make(v) {
        const g = blank(20);
        if (v === J) return [g.fill('💠|w')];
        const k = v === 50 ? between(3, 4) : v === 15 ? 2 : v === 5 ? 1 : 0, cs = shuf(CS.slice()).slice(0, k);
        cs.forEach(l => { const c = pick(CR); l.forEach(i => { g[i] = c; }); });
        return [fillR(g, CR)];
      }});
}

// 045 : 7 consécutifs sur chaque ligne ; lignes additionnées ; 25 sept diamantés = jackpot.
{
  const SE = '7️⃣|n', D7 = '7️⃣|b', OT = ['💎|w', '🍒', '🔔'], PAY = {3: 5, 4: 15, 5: 50};
  const is7 = k => k === SE || k === D7;
  const best = l => { let m = 0, n = 0, e = -1; l.forEach((k, i) => { n = is7(k) ? n + 1 : 0; if (n > m) { m = n; e = i; } }); return {m, e}; };
  const lists = rep(5, () => [0, 5, 15, 50]);
  const row = x => {
    if (!x) { let l; do { l = rep(5, () => Math.random() < 0.4 ? pick([SE, D7]) : pick(OT)); } while (best(l).m >= 3); return l; }
    const L = +Object.keys(PAY).find(k => PAY[k] === x), st = ri(5 - L + 1), l = rep(5, () => pick(OT));
    for (let q = 0; q < L; q++) l[st + q] = Math.random() < 0.3 ? D7 : SE;
    return l;
  };
  T(45, 'Diamond 777', 'di', '7️⃣', ['#0D47A1', '#B3E5FC'], [{n: 25, c: 5, lines: true}],
    'Sur chaque ligne, des 7 à la suite : 3 = 5×, 4 = 15×, 5 = 50×. Les lignes s\'additionnent. Les 5 lignes en 7 diamantés (bleus) = JACKPOT.',
    {outs: sums(lists).filter(v => v > 0),
      score(b) {
        const g = b[0]; if (g.every(x => x === D7)) return {v: J, h: at(0, rep(25, i => i))};
        let v = 0; const h = [];
        for (const l of rowsOf(5, 5)) { const r = best(l.map(i => g[i])); if (r.m >= 3) { v += PAY[r.m]; for (let q = r.e - r.m + 1; q <= r.e; q++) h.push(l[q]); } }
        return {v, h: at(0, h)};
      },
      make(v) {
        if (v === J) return [blank(25).fill(D7)];
        const d = decompose(lists, v); if (!d) return null;
        const g = d.map(row).flat();
        return g.every(x => x === D7) ? null : [g];
      }});
}

codeTicket(46, 'Diamond Vault', 'di', '🔐', ['#1A237E', '#C5CAE9'], 5, ['💎', '💍', '👑', '⚜️', '🏆', '💠'], ['b', 'R'], {3: 5, 4: 25, 5: 50},
  'Une position est trouvée si un de ses 3 candidats est son symbole exact (même couleur). 3 positions : 5×, 4 : 25×, 5 : 50×. Les 5 positions avec 5 symboles royaux = JACKPOT.');

veinTicket(47, 'Diamond Rain', 'di', '🌧️', ['#004D40', '#B2EBF2'], 6, 5,
  'Une rangée de 5 diamants identiques : 10×. Deux rangées : 20×. Trois rangées ou plus : 50×. Les 6 rangées en diamants royaux = JACKPOT.');

// 048 : constellations à géométrie fixe ; une constellation est validée si ses 4 étoiles sont des diamants.
{
  const DS = '💎|b', RS = '💎|R', ST = '⭐|n';
  const isD = k => k === DS || k === RS;
  T(48, 'Diamond Galaxy', 'di', '🌌', ['#1A0033', '#B388FF'], [{n: 20, kind: 'sky', sky: SKY5}],
    'Une constellation est validée quand ses 4 étoiles sont des diamants. 1 constellation : 5×, 2 : 10×, 3 ou 4 : 25×, les 5 : 50×. Les 5 constellations en diamants royaux = JACKPOT.',
    {outs: [5, 10, 25, 50],
      score(b) {
        const g = b[0], ok = rep(5, c => rep(4, p => isD(g[c * 4 + p])).every(Boolean)), k = ok.filter(Boolean).length;
        const h = at(0, rep(20, i => i).filter(i => ok[(i / 4) | 0]));
        if (g.every(x => x === RS)) return {v: J, h};
        return {v: k === 5 ? 50 : k >= 3 ? 25 : k === 2 ? 10 : k === 1 ? 5 : 0, h, links: ok};
      },
      make(v) {
        if (v === J) return [blank(20).fill(RS)];
        const k = v === 50 ? 5 : v === 25 ? between(3, 4) : v === 10 ? 2 : v === 5 ? 1 : 0, cs = shuf(rep(5, i => i)).slice(0, k);
        const g = rep(5, c => { if (cs.includes(c)) return rep(4, () => Math.random() < 0.15 ? RS : DS); const l = rep(4, () => pick([DS, ST, ST, RS])); l[ri(4)] = ST; return l; }).flat();
        return g.every(x => x === RS) ? null : [g];
      }});
}

collTicket(49, 'Diamond Emperor', 'di', '🤴', ['#311B92', '#FFD700'], [{n: 12, c: 4}], ['👑|R', '🪄|R', '🪑|R'], 4, {1: 10, 2: 30},
  'La couronne, le sceptre et le trône ont chacun 4 fragments numérotés. Un objet complet : 10×, deux : 30×. Les trois objets complets = JACKPOT. Un fragment en double ne remplace pas celui qui manque.');

veinTicket(50, 'Diamond Supreme', 'di', '💎', ['#000000', '#B3E5FC'], 6, 6,
  'Une ligne ou une colonne de 6 diamants identiques : 10×. Deux : 20×. Trois ou plus : 50×. Six lignes de diamants royaux = JACKPOT.', true);

/* ---------- Mini-jeux réutilisables (073 Platinum Casino, 150 THE ULTIMATE DOPAMINE) ---------- */
const PART = (() => {
  const PP = {RF: 100, SF: 100, Q4: 50, FH: 25, FL: 15, ST: 10, T3: 5, TP: 2, P1: 1, HC: 0};
  const DP = {Y: 50, Q: 50, F: 25, S: 10, T: 5, D: 2, P: 1, N: 0};
  const SL = ['🍒', '🔔', '⭐', '💎', '7️⃣'], SLP = {3: 2, 4: 10, 5: 50};
  const slotRun = l => { let n = 1; while (n < 5 && l[n] === l[0]) n++; return n; };
  const KEY = n => '🗝️|y|n°' + n, NOKEY = '❌|n', ICE = ['🧊|n', '🔷|b'], BD = '💎|b';
  const ULT = ['⭐|n', '👑|n', '🐉|n', '💎|n', '♾️|n'], INFG = '♾️|o', ultBase = k => k === INFG ? '♾️|n' : k;
  const AM = [0, 1, 2, 5], MU = [1, 2, 5, 10], PRODS = uniq(AM.flatMap(a => MU.map(m => a * m)));
  const keyVals = lazy(() => { const by = {}; for (let mask = 0; mask < 32; mask++) for (const amts of [[1, 2, 5, 1, 2], [5, 2, 1, 2, 1], [1, 1, 2, 5, 5]]) { const v = sum(amts.filter((_, i) => mask >> i & 1)); (by[v] = by[v] || []).push([mask, amts]); } return by; });
  return {
    INFG, SEVEN: '7️⃣',
    clover: {Z: [{n: 9, c: 3, t: 'Trèfles'}], vals: () => [0, ...uniq(CLV_OPTS.map(o => o.v)), 20],
      score: ([g]) => g.every(x => x === CLV.G) ? {v: 20, h: at(0, rep(9, i => i))} : (r => ({v: r.v, h: at(0, r.h)}))(cloverScore(g)),
      make: v => v === 20 && Math.random() < 0.2 ? [blank(9).fill(CLV.G)] : (a => a && [a])(cloverMake(v))},
    dice: {Z: [{n: 5, c: 5, t: 'Dés'}], vals: () => uniq(Object.values(DP)),
      score: ([g]) => { const r = diceEval(g); return {v: DP[r.type], h: DP[r.type] ? at(0, r.h) : []}; },
      make: v => [diceMake(pick(Object.keys(DP).filter(k => DP[k] === v)))]},
    poker: {Z: [{n: 5, c: 5, t: 'Poker'}], vals: () => uniq(Object.values(PP)),
      score: ([g]) => { const r = pokerEval(g); return {v: PP[r.type], h: PP[r.type] ? at(0, r.h) : []}; },
      make: v => [pokerMake(pick(Object.keys(PP).filter(k => PP[k] === v)))], check: ([g]) => uniq(g).length === 5},
    slot5: {Z: [{n: 5, c: 5, t: 'Machine à sous'}], vals: () => [0, 2, 10, 50],
      score: ([g]) => { const n = slotRun(g); return n >= 3 ? {v: SLP[n], h: at(0, rep(n, i => i))} : {v: 0, h: []}; },
      make: v => { if (!v) { let l; do { l = rep(5, () => pick(SL)); } while (slotRun(l) >= 3); return [l]; } const n = +Object.keys(SLP).find(k => SLP[k] === v), s = pick(SL), l = rep(n, () => s); if (n < 5) l.push(pick(SL.filter(k => k !== s))); while (l.length < 5) l.push(pick(SL)); return [l]; }},
    bingo: {Z: [{n: 10, c: 5, t: 'Bingo : numéros tirés'}, {n: 16, c: 4, t: 'Ta grille'}],
      vals: () => uniq(Object.keys(bingoMasks()).map(k => parseInt(k, 10))).sort((a, b) => a - b),
      score: ([d, g]) => { const r = bingoEval(d, g); return {v: r.v, h: at(1, r.h)}; },
      make: v => { const by = bingoMasks(), ks = Object.keys(by).filter(k => parseInt(k, 10) === v); return ks.length ? bingoMake(pick(by[pick(ks)])) : null; }},
    chests: {Z: [{n: 5, c: 5, t: 'Coffres n°1 à 5', num: true}, {n: 5, c: 5, t: 'Clés (chaque clé ouvre le coffre de son numéro)'}],
      vals: () => Object.keys(keyVals()).map(Number).sort((a, b) => a - b),
      score: ([ch, ks]) => { const nums = uniq(ks.filter(k => k !== NOKEY).map(k => +k.split('n°')[1])); const h = []; let v = 0; nums.forEach(n => { v += +ch[n - 1].slice(1); h.push([0, n - 1]); }); ks.forEach((k, i) => { if (k !== NOKEY) h.push([1, i]); }); return {v, h: v ? h : []}; },
      make: v => { const L = keyVals()[v]; if (!L) return null; const [mask, amts] = pick(L); const nums = rep(5, i => i + 1).filter(n => mask >> (n - 1) & 1); const ks = nums.map(KEY); while (ks.length < 5) ks.push(nums.length && Math.random() < 0.3 ? KEY(pick(nums)) : NOKEY); return [amts.map(a => '$' + a), shuf(ks)]; }},
    ice: {Z: [{n: 16, c: 4, t: 'Diamants'}], vals: () => [0, 5, 25, 50],
      score: ([g]) => { const n = count(g, BD), v = n >= 8 ? 50 : n >= 5 ? 25 : n >= 3 ? 5 : 0; return {v, h: v ? at(0, where(g, x => x === BD)) : []}; },
      make: v => { const a = blank(16); put(a, BD, v === 50 ? between(8, 10) : v === 25 ? between(5, 7) : v === 5 ? between(3, 4) : ri(3)); return [fillR(a, ICE)]; }},
    sky8: {Z: [{n: 8, kind: 'sky', sky: [SKY8], t: 'Constellation'}], vals: () => [0, 25],
      score: ([g]) => g.every(x => x === BD) ? {v: 25, h: at(0, rep(8, i => i)), links: [true]} : {v: 0, h: []},
      make: v => { if (v) return [blank(8).fill(BD)]; const l = rep(8, () => pick([BD, BD, '⭐|n'])); l[ri(8)] = '⭐|n'; return [l]; }},
    mult3: {Z: [{n: 6, c: 2, t: 'Montants × multiplicateurs', lines: true}], vals: () => sums(rep(3, () => PRODS)),
      score: ([g]) => { let v = 0; const h = []; for (let r = 0; r < 3; r++) { const x = +g[r * 2].slice(1) * +g[r * 2 + 1].slice(1); if (x) { v += x; h.push(r * 2, r * 2 + 1); } } return {v, h: at(0, h)}; },
      make: v => { const d = decompose(rep(3, () => PRODS), v); if (!d) return null; return [d.flatMap(x => { const [a, m] = pick(AM.flatMap(a => MU.map(m => [a, m])).filter(([a, m]) => a * m === x)); return ['$' + a, '*' + m]; })]; }},
    ult: {Z: [{n: 5, c: 5, t: 'Coffre ultime'}], vals: () => [0, 5, 25, 50],
      score: ([g]) => { const b = g.map(ultBase); let best = 0, bk; for (const k of ULT) { const n = count(b, k); if (n > best) { best = n; bk = k; } } const v = best === 5 ? 50 : best === 4 ? 25 : best === 3 ? 5 : 0; return {v, h: v ? at(0, where(b, x => x === bk)) : []}; },
      make: v => { const n = {50: 5, 25: 4, 5: 3}[v] || 0, a = blank(5); if (n) { const k = pick(ULT); for (let i = 0; i < n; i++) put(a, k === '♾️|n' && Math.random() < 0.4 ? INFG : k, 1); if (n === 5 && a.every(x => x === INFG)) a[0] = '♾️|n'; } return fillCaps(a, n ? caps(ULT.filter(x => !a.includes(x) && !(a.includes(INFG) && x === '♾️|n')), 1) : {...caps(ULT, 2), [INFG]: 1}) ? [a] : null; }},
  };
})();
// Ticket à plusieurs mini-jeux : chaque mini-jeu a sa propre vérification, les gains s'additionnent (plafonnés au jackpot) ;
// le jackpot spécial remplace la somme quand sa combinaison exacte est là.
function comboT(num, name, ico, c, parts, rule, o) {
  const offs = []; let q = 0; for (const p of parts) { offs.push(q); q += p.Z.length; }
  const lists = lazy(() => parts.map(p => p.vals()));
  const split = b => parts.map((p, i) => b.slice(offs[i], offs[i] + p.Z.length));
  const Z = parts.flatMap((p, i) => p.Z.map((z, j) => Object.assign({}, z, o.numbered && j === 0 ? {t: `${i + 1}. ${z.t}`} : {})));
  return T(num, name, 'x', ico, c, Z, rule, {
    outsF: () => (o.pal || sums(lists())).filter(v => v > 0 && decompose(lists(), v)),
    score(b) {
      const zs = split(b), rs = zs.map((z, i) => parts[i].score(z)), h = [];
      let v = 0; rs.forEach((r, i) => { v += r.v; h.push(...r.h.map(([z, cc]) => [z + offs[i], cc])); });
      const sk = rs.find(r => r.links);
      return {v: o.jack(zs, rs) ? J : v, h, links: sk && sk.links};
    },
    make(v) {
      const d = v === J ? lists().map(l => pick(l.filter(x => x > 0))) : decompose(lists(), v);
      if (!d) return null;
      const out = [];
      for (let i = 0; i < parts.length; i++) { const z = v === J && o.jackMake[i] ? o.jackMake[i]() : parts[i].make(d[i]); if (!z) return null; out.push(...z); }
      return out;
    },
    check: b => split(b).every((z, i) => !parts[i].check || parts[i].check(z))});
}
comboT(150, 'THE ULTIMATE DOPAMINE', '🧠', ['#880E4F', '#00E5FF'],
  [PART.clover, PART.dice, PART.poker, PART.slot5, PART.bingo, PART.chests, PART.ice, PART.sky8, PART.mult3, PART.ult],
  'Dix jeux sur un seul ticket, chacun avec son propre gain : trèfles, dés, poker, machine à sous, bingo, coffres et clés, diamants, constellation, montants × multiplicateurs et coffre ultime. Les gains s\'additionnent. Les dix jeux gagnants et 5 ♾️ dorés dans le coffre ultime = JACKPOT.',
  {numbered: true, pal: [1, 2, 3, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200],
    jack: (zs, rs) => rs.every(r => r.v > 0) && zs[9][0].every(x => x === PART.INFG),
    jackMake: {9: () => [rep(5, () => PART.INFG)]}});
comboT(73, 'Platinum Casino', '🎰', ['#37474F', '#E0E0E0'], [PART.poker, PART.dice, PART.slot5, PART.bingo],
  'Quatre jeux de casino sur un ticket : poker (paire 1× … quinte flush 100×), dés (paire 1× … carré ou 5 identiques 50×), machine à sous (3, 4 ou 5 symboles à la suite depuis la gauche : 2×, 10×, 50×) et bingo (ligne ou colonne 5×, diagonale 10×). Les gains s\'additionnent. Les 4 jeux gagnants avec cinq 7️⃣ sur la machine = JACKPOT.',
  {numbered: true, jack: (zs, rs) => rs.every(r => r.v > 0) && zs[2][0].every(x => x === PART.SEVEN),
    jackMake: {2: () => [rep(5, () => PART.SEVEN)]}});

/* ---------- Familles de mécaniques (tickets 051 à 149) ---------- */
const fx = v => String(v).replace('.', ',') + '×';
const ths = th => Array.isArray(th) ? th : Object.entries(th).map(([k, v]) => [+k, v]).sort((a, b) => a[0] - b[0]);
// « 3 : 2×, 4 : 10×, 5 ou plus : 50× »
const payTxt = (th, unit = '', plus = true) => ths(th).map(([k, v], i, a) => `${k}${unit}${plus && i === a.length - 1 ? ' ou plus' : ''} : ${fx(v)}`).join(', ');
const payOf = (th, x) => { const t = ths(th).filter(([k]) => x >= k).pop(); return t ? t[1] : 0; };
// Nombre au hasard qui donne le palier v (entre son seuil et le suivant).
const countFor = (th, v, max) => { const a = ths(th), i = a.findIndex(([, w]) => w === v); if (i < 0) return NaN; return between(a[i][0], Math.min(max, a[i + 1] ? a[i + 1][0] - 1 : a[i][0] + 2)); };
const emo = k => k.split('|')[0];

// Trouver : n cases ; seuils sur le nombre de symboles cibles ; jackpot = au moins jn symboles royaux.
function findT(num, name, ico, c, n, cols, tgt, label, th, rest, jk, jn) {
  return countTicket(num, name, 'x', ico, c, [{n, c: cols}],
    `Trouve ${label} ${emo(tgt)} parmi ${n} cases : ${payTxt(th)}. ${jn} ${emo(jk)} royaux = JACKPOT.`,
    {tgt: [tgt], th: ths(th), rest, jack: g => count(g, jk) >= jn, makeJ: () => { const a = blank(n); put(a, jk, jn); return [fillR(a, rest)]; }});
}
// Collection d'un objet en K pièces distinctes (numérotées, ou K symboles différents) : seules les pièces différentes comptent.
function piecesT(num, name, ico, c, n, cols, em, tint, K, pays, decoys, label) {
  const single = typeof em === 'string', ems = single ? rep(K, () => em) : em;
  const key = (i, t) => ems[i] + '|' + t + (single ? '|' + (i + 1) : '');
  const id = k => { const p = k.split('|'); if (single) return p[0] === em && p[2] ? +p[2] - 1 : -1; return p[1] !== 'n' ? ems.indexOf(p[0]) : -1; };
  const th = ths(pays), lo = th[0][0];
  return T(num, name, 'x', ico, c, [{n, c: cols}],
    `${K} ${label} différents à réunir${single ? ' (numérotés de 1 à ' + K + ')' : ''} : ${payTxt(pays, ' différents', false)}. Un doublon ne remplace jamais une pièce manquante. Les ${K} en version royale = JACKPOT.`,
    {outs: uniq(th.map(x => x[1])).sort((a, b) => a - b),
      score(b) {
        const g = b[0], have = uniq(g.map(id).filter(x => x >= 0)), roy = uniq(g.filter(k => k.split('|')[1] === 'R').map(id).filter(x => x >= 0));
        const h = at(0, where(g, k => id(k) >= 0));
        if (roy.length === K) return {v: J, h};
        const v = payOf(pays, have.length);
        return {v, h: v ? h : []};
      },
      make(v) {
        const a = blank(n), d = v === J ? K : v ? countFor(pays, v, K) : between(Math.max(0, lo - 3), lo - 1);
        if (isNaN(d) || d > n) return null;
        const ids = shuf(rep(K, i => i)).slice(0, d);
        ids.forEach(i => put(a, key(i, v === J ? 'R' : Math.random() < 0.12 ? 'R' : tint), 1));
        const extra = ri(Math.max(1, Math.floor((n - d) / 3)));
        for (let e = 0; e < extra && ids.length; e++) put(a, key(pick(ids), tint), 1);
        return [fillR(a, decoys)];
      }});
}
// Ciel : N constellations de k étoiles (formes fixes, propres au ticket, liens visibles).
const SKYN = ['Le Cerf-volant', 'La Flèche', 'Le Carré', 'Le Crochet', 'La Couronne', 'Le Serpent', 'La Lyre', 'Le Phare', 'L\'Ancre', 'Le Dragon', 'La Harpe', 'Le Trident'];
function skyLayout(seed, N, k) {
  let s = seed % 2147483647; const rnd = () => { s = s * 16807 % 2147483647; return s / 2147483647; };
  const cols = N === 1 ? 1 : Math.ceil(Math.sqrt(N * 1.6)), rows = Math.ceil(N / cols), W = 100 / cols, H = 72 / rows;
  const gx = Math.max(1, Math.ceil(Math.sqrt(k * W / H))), gy = Math.ceil(k / gx);
  return rep(N, ci => {
    const ox = (ci % cols) * W, oy = Math.floor(ci / cols) * H, order = [];
    for (let y = 0; y < gy; y++) for (let x = 0; x < gx; x++) order.push([y % 2 ? gx - 1 - x : x, y]);
    const p = order.slice(0, k).map(([x, y]) => [+(ox + W * (x + 0.2 + 0.6 * rnd()) / gx).toFixed(1), +(oy + 3 + (H - 9) * (y + 0.2 + 0.6 * rnd()) / gy).toFixed(1)]);
    return {n: N > 1 ? SKYN[ci % SKYN.length] : '', p, l: rep(k - 1, j => [j, j + 1])};
  });
}
function skyT(num, name, ico, c, N, k, on, off, pays, label) {
  const sky = skyLayout(num * 7919 + 1, N, k), RY = emo(on) + '|R', isOn = x => x === on || x === RY, th = ths(pays), tot = N * k;
  return T(num, name, 'x', ico, c, [{n: tot, kind: 'sky', sky}],
    N === 1 ? `Une constellation de ${k} ${label} : compte les ${emo(on)} (${payTxt(pays, '', false)}). Toutes en version royale = JACKPOT.`
      : `${N} constellations de ${k} ${label}. Une constellation est validée quand toutes ses étoiles sont des ${emo(on)} : ${payTxt(pays, ' validées', false)}. Toutes en version royale = JACKPOT.`,
    {outs: uniq(th.map(x => x[1])).sort((a, b) => a - b),
      score(b) {
        const g = b[0];
        if (g.every(x => x === RY)) return {v: J, h: at(0, rep(tot, i => i)), links: rep(N, () => true)};
        if (N === 1) { const x = g.filter(isOn).length, v = payOf(pays, x); return {v, h: v ? at(0, where(g, isOn)) : [], links: [x === k]}; }
        const ok = rep(N, ci => rep(k, j => isOn(g[ci * k + j])).every(Boolean)), v = payOf(pays, ok.filter(Boolean).length);
        return {v, h: at(0, rep(tot, i => i).filter(i => ok[(i / k) | 0])), links: ok};
      },
      make(v) {
        if (v === J) return [blank(tot).fill(RY)];
        const x = v ? countFor(pays, v, N === 1 ? k : N) : between(Math.max(0, th[0][0] - 2), th[0][0] - 1);
        if (isNaN(x)) return null;
        if (N === 1) { const a = blank(k); for (let i = 0; i < x; i++) put(a, Math.random() < 0.12 ? RY : on, 1); return [fillR(a, [off])]; }
        const cs = shuf(rep(N, i => i)).slice(0, x);
        return [rep(N, ci => { if (cs.includes(ci)) return rep(k, () => Math.random() < 0.12 ? RY : on); const l = rep(k, () => pick([on, on, off])); l[ri(k)] = off; return l; }).flat()];
      }});
}
// Coffres numérotés et clés : chaque clé ouvre le coffre de son numéro, une seule fois ; les coffres ouverts s'additionnent.
function chestT(num, name, ico, c, N, M, AM) {
  const KEY = n => '🗝️|y|n°' + n, NO = '❌|n', CR = '👑|o', lists = rep(N, () => [0, ...AM]);
  return T(num, name, 'x', ico, c, [{n: N, c: Math.min(N, 5), t: 'Coffres', num: true}, {n: M, c: Math.min(M, 6), t: 'Clés : chaque clé ouvre le coffre de son numéro'}],
    `${N} coffres numérotés et ${M} cases de clés. Chaque clé ouvre le coffre de son numéro (une seule fois, un doublon n'ouvre rien de plus) et tu gagnes son contenu. Les gains s'additionnent. Les ${N} coffres ouverts et pleins de couronnes = JACKPOT.`,
    {outsF: () => sums(lists).filter(v => v > 0),
      score(b) {
        const [ch, ks] = b, nums = uniq(ks.filter(k => k !== NO).map(k => +k.split('n°')[1])).filter(x => x >= 1 && x <= N), h = [];
        let v = 0;
        nums.forEach(x => { h.push([0, x - 1]); if (ch[x - 1][0] === '$') v += +ch[x - 1].slice(1); });
        ks.forEach((k, i) => { if (k !== NO) h.push([1, i]); });
        if (nums.length === N && ch.every(x => x === CR)) return {v: J, h};
        return {v, h: v ? h : []};
      },
      make(v) {
        const d = v === J ? rep(N, () => 1) : decompose(lists, v); if (!d) return null;
        const open = rep(N, i => i + 1).filter(x => d[x - 1] > 0);
        if (open.length > M) return null;
        const ch = d.map(x => v === J ? CR : '$' + (x || pick(AM))), ks = open.map(KEY);
        while (ks.length < M) ks.push(open.length && Math.random() < 0.3 ? KEY(pick(open)) : NO);
        return [ch, shuf(ks)];
      }});
}
// Montant × multiplicateur sur chaque ligne (jamais d'une autre ligne) ; lignes additionnées.
function multT(num, name, ico, c, L, AM, MU, EMB) {
  const prods = uniq(AM.flatMap(a => MU.map(m => a * m))), lists = rep(L, () => prods), top = '*' + Math.max(...MU), CR = '👑|o';
  return T(num, name, 'x', ico, c, [{n: L * 3, c: 3, lines: true, head: ['Montant', 'Multi', 'Emblème']}],
    `${L} lignes : sur chaque ligne, le montant est multiplié par le multiplicateur de la même ligne (jamais d'une autre, et une seule fois). Les lignes s'additionnent. ${L} multiplicateurs ×${Math.max(...MU)} avec ${L} couronnes = JACKPOT.`,
    {outsF: () => sums(lists).filter(v => v > 0),
      score(b) {
        const g = b[0], rs = rowsOf(3, L);
        if (rs.every(l => g[l[1]] === top && g[l[2]] === CR)) return {v: J, h: at(0, rep(L * 3, i => i))};
        let v = 0; const h = [];
        for (const l of rs) { const x = +g[l[0]].slice(1) * +g[l[1]].slice(1); if (x) { v += x; h.push(l[0], l[1]); } }
        return {v, h: at(0, h)};
      },
      make(v) {
        if (v === J) return [rep(L, () => ['$' + pick(AM), top, CR]).flat()];
        const d = decompose(lists, v); if (!d) return null;
        const g = d.map(x => { const [a, m] = pick(AM.flatMap(a => MU.map(m => [a, m])).filter(([a, m]) => a * m === x)); return ['$' + a, '*' + m, pick([...EMB, CR])]; });
        if (g.every(l => l[1] === top && l[2] === CR)) g[0][2] = EMB[0];
        return [g.flat()];
      }});
}
// Lignes de trois 7 ; seuils sur le nombre de lignes ; toutes les cases en 7 royaux = jackpot.
function sevenT(num, name, ico, c, L, sev, th) {
  const RY = emo(sev) + '|R', SE = [sev, RY], DEC = ['🍒|n', '🔔|n', '⭐|n', '💎|n'], win = l => l.every(x => SE.includes(x));
  return T(num, name, 'x', ico, c, [{n: L * 3, c: 3, lines: true}],
    `${L} lignes de 3 cases. Une ligne de trois ${emo(sev)} gagne. Lignes gagnantes : ${payTxt(th, '', true)}. Toutes les lignes en 7 royaux = JACKPOT.`,
    {outs: uniq(ths(th).map(x => x[1])).sort((a, b) => a - b),
      score(b) {
        const g = b[0]; if (g.every(x => x === RY)) return {v: J, h: at(0, rep(L * 3, i => i))};
        const ls = rowsOf(3, L).filter(l => win(l.map(i => g[i]))), v = payOf(th, ls.length);
        return {v, h: v ? at(0, ls.flat()) : []};
      },
      make(v) {
        if (v === J) return [blank(L * 3).fill(RY)];
        const k = v ? countFor(th, v, L) : 0; if (isNaN(k)) return null;
        const ls = shuf(rep(L, i => i)).slice(0, k);
        const g = rep(L, i => { if (ls.includes(i)) return rep(3, () => Math.random() < 0.25 ? RY : sev); let l; do { l = rep(3, () => Math.random() < 0.35 ? pick(SE) : pick(DEC)); } while (win(l)); return l; }).flat();
        return g.every(x => x === RY) ? null : [g];
      }});
}
// 3 symboles identiques (meilleur gain seulement) ; 3 symboles royaux = jackpot. fixed : cases imposées (décor).
function matchT(num, name, ico, c, n, cols, syms, jk, decoys, fixed) {
  const S = Object.keys(syms);
  return T(num, name, 'x', ico, c, [{n, c: cols}],
    `Trois symboles identiques : ${S.map(k => emo(k) + ' ' + fx(syms[k])).join(', ')} (la couleur de la case compte). Seul le meilleur gain est payé. Trois ${emo(jk)} royaux = JACKPOT.`,
    {outs: uniq(Object.values(syms)).sort((a, b) => a - b),
      score(b) {
        const g = b[0]; if (count(g, jk) >= 3) return {v: J, h: at(0, where(g, x => x === jk))};
        let best = 0, bk; for (const k of S) if (count(g, k) >= 3 && syms[k] > best) { best = syms[k]; bk = k; }
        return best ? {v: best, h: at(0, where(g, x => x === bk))} : {v: 0, h: []};
      },
      make(v) {
        const a = blank(n); if (fixed) for (const i in fixed) a[i] = fixed[i];
        if (v === J) { put(a, jk, 3); return [fillR(a, decoys)]; }
        const cp = {...caps(S, 2), [jk]: 2}; for (const d of decoys) cp[d] = Math.ceil(n / 3);
        if (v) { const k = pick(S.filter(x => syms[x] === v)); put(a, k, between(3, 4)); cp[k] = 0; }
        return fillCaps(a, cp) ? [a] : null;
      }});
}
// Grandes grilles N×N : une ligne ou une colonne entière du même symbole est gagnante (les 🪨 ne comptent pas).
function gridT(num, name, ico, c, N, syms, royal, th, jn, label) {
  const LS = [...rowsOf(N, N), ...colsOf(N, N)], ROCK = '🪨|n';
  return T(num, name, 'x', ico, c, [{n: N * N, c: N}],
    `Grille ${N}×${N} : une ligne ou une colonne entière du même symbole ${label} est gagnante (pas les diagonales, chaque ligne compte une fois). Lignes gagnantes : ${payTxt(th)}. ${jn} lignes de ${emo(royal)} royaux = JACKPOT.`,
    {outs: uniq(ths(th).map(x => x[1])).sort((a, b) => a - b),
      score(b) {
        const g = b[0], ws = LS.filter(l => full(g, l) && g[l[0]] !== ROCK), h = at(0, uniq(ws.flat()));
        if (ws.filter(l => g[l[0]] === royal).length >= jn) return {v: J, h};
        const v = payOf(th, ws.length); return {v, h: v ? h : []};
      },
      make(v) {
        const g = blank(N * N);
        if (v === J) shuf(rowsOf(N, N)).slice(0, jn).forEach(l => l.forEach(i => { g[i] = royal; }));
        else if (v) {
          const k = countFor(th, v, N); if (isNaN(k)) return null;
          if (Math.random() < 0.3) { const s = pick(syms); shuf(LS.slice()).slice(0, k).forEach(l => l.forEach(i => { g[i] = s; })); }
          else shuf(rowsOf(N, N)).slice(0, k).forEach(l => { const s = pick(syms); l.forEach(i => { g[i] = s; }); });
        }
        for (let i = 0; i < g.length; i++) if (g[i] === undefined) g[i] = Math.random() < 0.25 ? ROCK : pick([...syms, royal]);
        return [g];
      }});
}
// Salles (ou chambres) de L cases : selon le nombre de symboles dans chaque salle ; toutes les salles gagnantes = jackpot.
function chamberT(num, name, ico, c, R, L, sym, others, pays, label) {
  const th = ths(pays), vals = uniq(th.map(x => x[1])), lists = rep(R - 1, () => [0, ...vals]);
  const val = r => payOf(pays, count(r, sym));
  const mk = v => { let r; if (v) { const n = countFor(pays, v, L); r = [...rep(n, () => sym), ...rep(L - n, () => pick(others))]; return shuf(r); } do { r = rep(L, () => Math.random() < 0.4 ? sym : pick(others)); } while (val(r)); return r; };
  return T(num, name, 'x', ico, c, [{n: R * L, c: L, lines: true, t: `${R} ${label}`}],
    `${R} ${label} de ${L} cases. Dans chaque ${label.replace(/s$/, '')}, les ${emo(sym)} : ${payTxt(pays, '', false)}. Les gains s'additionnent. Les ${R} gagnantes = JACKPOT.`,
    {outsF: () => sums(lists).filter(v => v > 0),
      score(b) {
        const g = b[0]; let v = 0, w = 0; const h = [];
        for (const l of rowsOf(L, R)) { const x = val(l.map(i => g[i])); if (x) { v += x; w++; h.push(...l); } }
        return {v: w === R ? J : v, h: at(0, h)};
      },
      make(v) {
        if (v === J) return [rep(R, () => mk(pick(vals))).flat()];
        const d = decompose(lists, v); if (!d) return null;
        d.splice(ri(R), 0, 0);
        return [d.map(mk).flat()];
      }});
}
const codeRule = (P, pays) => `Code à ${P} positions, 3 candidats par position (colonne). Une position est trouvée si un de ses candidats est exactement son symbole (même couleur) ; un bon symbole à la mauvaise position ne compte pas. Positions trouvées : ${payTxt(pays, '', false)}. Les ${P} positions avec ${P} symboles royaux = JACKPOT.`;

/* ---------- 051–060 : ÉMERAUDE ---------- */
const EM = ['#1B5E20', '#69F0AE'], RU = ['#B71C1C', '#FF8A80'], PL = ['#455A64', '#E0E0E0'], MY = ['#4A148C', '#EA80FC'], LE = ['#E65100', '#FFD740'];
const CE = ['#0D47A1', '#82B1FF'], DV = ['#F9A825', '#FFFDE7'], CO = ['#1A0033', '#7C4DFF'], IN = ['#000000', '#18FFFF'], DO = ['#880E4F', '#00E5FF'];
findT(51, 'Emerald Forest', '🌳', EM, 20, 5, '🌳|g', 'des arbres émeraude', [[3, 2], [4, 10], [5, 50]], ['🌲|n', '🌿|n', '🍄|n', '🪨|n'], '🌳|R', 5);
matchT(52, 'Jungle Fortune', '🦁', ['#33691E', '#C5E1A5'], 9, 3, {'🐒|g': 2, '🦜|g': 3, '🐍|g': 5, '🐆|g': 10, '🦍|g': 25, '🐘|g': 50}, '🦁|R', ['🌿|n']);
piecesT(53, 'Green Dragon', '🐉', ['#004D40', '#A7FFEB'], 15, 5, '🐉', 'g', 6, {3: 2, 4: 6, 5: 20, 6: 75}, ['🍃|n', '🪨|n'], 'écailles de dragon');
codeTicket(54, 'Emerald Temple', 'x', '🛕', ['#1B5E20', '#B9F6CA'], 4, ['ᚠ', 'ᚱ', 'ᚦ', 'ᛟ', 'ᚹ', 'ᛉ'], ['g', 'R'], {2: 3, 3: 15, 4: 60}, codeRule(4, {2: 3, 3: 15, 4: 60}));
findT(55, 'Lucky Jungle', '🌼', ['#2E7D32', '#FFF59D'], 20, 5, '🌼|o', 'des fleurs dorées', [[3, 3], [4, 10], [5, 50]], ['🍃|g', '🌿|g', '🍂|n'], '🌺|R', 5);
multT(56, 'Emerald Multiplier', '✳️', ['#00695C', '#B2DFDB'], 4, [0, 1, 2, 5], [1, 2, 3, 5, 10], ['💚|n', '🍀|n', '🌿|n']);
piecesT(57, 'Ancient Forest', '🦉', ['#3E2723', '#AED581'], 16, 4, ['🦉', '🦌', '🐻', '🦊', '🐺'], 'g', 5, {3: 3, 4: 12, 5: 50}, ['🌲|n', '🍄|n', '🪨|n'], 'gardiens de la forêt');
piecesT(58, 'Emerald Throne', '🪑', ['#1B5E20', '#FFD54F'], 20, 5, '🪑', 'g', 8, {5: 3, 6: 10, 7: 30, 8: 80}, ['🪨|n', '🍃|n'], 'fragments du trône');
findT(59, 'Emerald Infinity', '♾️', ['#004D40', '#64FFDA'], 25, 5, '♾️|g', 'des symboles infini', [[4, 3], [6, 15], [8, 60]], ['💚|n', '🍀|n', '🪨|n'], '♾️|R', 8);
findT(60, 'Emerald God', '💎', ['#00332A', '#00E676'], 49, 7, '💎|g', 'des cristaux sacrés', [[4, 2], [5, 8], [6, 30], [7, 100]], ['🌿|n', '🪨|n', '🍃|n', '🌱|n'], '💎|R', 7);

/* ---------- 061–070 : RUBIS ---------- */
matchT(61, 'Ruby Fire', '🔥', RU, 9, 3, {'🔥|y': 2, '🔥|r': 10, '🔥|v': 40}, '🔥|R', ['🪨|n', '💨|n']);
chamberT(62, 'Volcano Cash', '🌋', ['#3E2723', '#FF7043'], 6, 4, '💎|r', ['🪨|n', '🌋|n'], {3: 3, 4: 15}, 'chambres');
sevenT(63, 'Crimson 777', '7️⃣', ['#880E4F', '#FF80AB'], 5, '7️⃣|r', [[1, 10], [2, 25], [3, 100]]);
piecesT(64, 'Ruby Dragon', '🐾', ['#B71C1C', '#FFCDD2'], 12, 4, '🐾', 'r', 5, {3: 3, 4: 12, 5: 60}, ['🪨|n', '🔥|n'], 'griffes du dragon');
chestT(65, 'Inferno Treasure', '🧰', ['#BF360C', '#FFAB40'], 4, 4, [1, 2, 5, 10, 20]);
piecesT(66, 'Ruby King', '👑', ['#C62828', '#FFD54F'], 16, 4, '💍', 'r', 7, {4: 2, 5: 8, 6: 25, 7: 80}, ['🪨|n', '🔥|n'], 'rubis de la couronne');
matchT(67, 'Lava Fortune', '🌋', ['#3E2723', '#FF5722'], 16, 4, {'💎|r': 5, '💎|b': 10, '💎|g': 20, '💎|w': 50}, '💎|R', ['🌋|n', '🔥|n', '🪨|n']);
piecesT(68, 'Phoenix Flame', '🪶', ['#D84315', '#FFE082'], 15, 5, '🪶', 'r', 6, {3: 2, 4: 6, 5: 20, 6: 75}, ['🔥|n', '🪨|n'], 'plumes du phénix');
findT(69, 'Ruby Apocalypse', '☄️', ['#4A0000', '#FF1744'], 25, 5, '☄️|r', 'des météorites rubis', [[2, 3], [3, 30], [4, 100]], ['🪨|n', '🌑|n', '🔥|n'], '☄️|R', 3);
codeTicket(70, 'Eternal Ruby', 'x', '⭕', ['#880E4F', '#FF8A80'], 5, ['💍', '💎', '🔴', '🌹', '🍒', '❤️'], ['r', 'R'], {3: 8, 4: 30, 5: 120}, codeRule(5, {3: 8, 4: 30, 5: 120}));

/* ---------- 071–080 : PLATINE ---------- */
findT(71, 'Platinum Rush', '🧈', PL, 20, 5, '🧈|w', 'des lingots de platine', [[3, 2], [4, 10], [5, 50]], ['🪨|n', '⚙️|n', '🔩|n'], '🧈|R', 5);
piecesT(72, 'Silver Phoenix', '🪶', ['#546E7A', '#ECEFF1'], 15, 5, '🪶', 's', 6, {3: 2, 4: 6, 5: 20, 6: 75}, ['⚙️|n', '🪨|n'], 'plumes métalliques');
chestT(74, 'Platinum Vault', '🔐', ['#37474F', '#CFD8DC'], 5, 6, [1, 2, 5, 10, 25]);
lineTicket(75, 'Royal Platinum', 'x', '👑', ['#263238', '#E0E0E0'], 5, 5, {'👑|w': 5, '👑|s': 10, '👑|o': 25, '👑|R': 50},
  'Une ligne de 5 couronnes identiques : blanches 5×, argent 10×, or 25×, royales 50×. Les lignes s\'additionnent. 5 lignes de couronnes royales = JACKPOT.', {all: '👑|R', extra: ['⚙️|n']});
skyT(76, 'Platinum Galaxy', '🪐', ['#263238', '#B0BEC5'], 5, 5, '🪐|s', '🌑|n', {1: 5, 2: 12, 3: 30, 4: 60, 5: 120}, 'planètes');
countTicket(77, 'Titanium Storm', 'x', '⚡', ['#212121', '#B0BEC5'], [{n: 15, c: 5}],
  'Éclairs de titane : 3 = 3×, 5 = 15×, 7 ou plus = 60×. Un éclair argenté double le gain. 6 éclairs royaux = JACKPOT.',
  {tgt: ['⚡|w'], dbl: '⚡|s', th: [[3, 3], [5, 15], [7, 60]], rest: ['☁️|n', '🌧️|n'],
    jack: g => count(g, '⚡|R') >= 6, makeJ: () => { const a = blank(15); put(a, '⚡|R', 6); return [fillR(a, ['☁️|n', '🌧️|n'])]; }});
piecesT(78, 'Platinum Dragon', '🛡️', ['#37474F', '#90A4AE'], 18, 6, '🛡️', 's', 8, {5: 2, 6: 8, 7: 25, 8: 90}, ['⚙️|n', '🪨|n'], 'pièces d\'armure');
collTicket(79, 'Platinum Emperor', 'x', '🎖️', ['#455A64', '#FFD54F'], [{n: 15, c: 5}], ['🎖️|s', '🏅|s', '⚜️|s', '🦅|s', '🛡️|s'], 3, {1: 3, 2: 8, 3: 20, 4: 60},
  'Cinq insignes impériaux de 3 fragments numérotés. Insignes complets : 1 = 3×, 2 = 8×, 3 = 20×, 4 = 60×. Les 5 complets = JACKPOT. Un fragment en double ne remplace pas celui qui manque.');
piecesT(80, 'Platinum Supreme', '💠', ['#263238', '#80DEEA'], 16, 4, ['💠', '🔮', '🧿', '🪬', '💎', '🗝️', '📿', '🏺'], 's', 8, {5: 3, 6: 10, 7: 30, 8: 100}, ['🪨|n', '⚙️|n'], 'symboles rares');

/* ---------- 081–090 : MYTHIQUE ---------- */
codeTicket(81, 'Mystic Runes', 'x', 'ᛟ', MY, 5, ['ᚠ', 'ᚱ', 'ᚦ', 'ᛟ', 'ᚹ', 'ᛉ', 'ᛗ'], ['v', 'R'], {2: 2, 3: 8, 4: 30, 5: 100}, codeRule(5, {2: 2, 3: 8, 4: 30, 5: 100}));
piecesT(82, 'Dragon Soul', '🐲', ['#311B92', '#B388FF'], 12, 4, '🔮', 'v', 4, {2: 2, 3: 10, 4: 50}, ['🌫️|n', '🪨|n'], 'fragments d\'âme');
piecesT(83, 'Mythic Temple', '🏛️', ['#4A148C', '#E1BEE7'], 15, 5, '🏛️', 'v', 6, {3: 2, 4: 6, 5: 20, 6: 75}, ['🌫️|n', '🪨|n'], 'piliers');
piecesT(84, 'Ancient Gods', '⚡', ['#311B92', '#FFD54F'], 15, 5, ['⚡', '🌊', '☀️', '🌙', '💀'], 'v', 5, {3: 3, 4: 12, 5: 60}, ['🌫️|n', '🪨|n'], 'divinités');
skyT(85, 'Mystic Galaxy', '🌌', ['#12005E', '#B388FF'], 6, 4, '⭐|v', '⭐|n', {1: 2, 2: 5, 3: 12, 4: 30, 5: 60, 6: 150}, 'étoiles mythiques');
sevenT(86, 'Mythic 777', '7️⃣', ['#4A148C', '#FF80AB'], 6, '7️⃣|v', [[1, 10], [2, 25], [3, 100]]);
piecesT(87, 'Dragon Emperor', '🐉', ['#311B92', '#FF8A65'], 16, 4, '📜', 'v', 7, {4: 2, 5: 8, 6: 25, 7: 80}, ['🌫️|n', '🪨|n'], 'sceaux du dragon');
piecesT(88, 'Mythic Crown', '👑', ['#4A148C', '#FFD740'], 18, 6, '💎', 'v', 8, {5: 2, 6: 8, 7: 25, 8: 90}, ['🌫️|n', '🪨|n'], 'gemmes de la couronne');
codeTicket(89, 'Eternal Temple', 'x', '🚪', ['#311B92', '#D1C4E9'], 7, ['🗝️', '🔮', '📜', '🕯️', '💀', '🌙', '⚱️'], ['v', 'R'], {4: 3, 5: 10, 6: 40, 7: 150}, codeRule(7, {4: 3, 5: 10, 6: 40, 7: 150}));
gridT(90, 'Mythic Supreme', '🔯', ['#1A0033', '#EA80FC'], 7, ['🔮|v', '🌙|v', '⭐|v', '💀|v'], '🔯|R', [[1, 5], [2, 15], [3, 40], [4, 100]], 5, 'mythique');

/* ---------- 091–100 : LÉGENDAIRE ---------- */
findT(91, 'Legendary Gold', '🧈', LE, 20, 5, '🧈|o', 'des lingots légendaires', [[3, 2], [4, 10], [5, 50]], ['🪨|n', '💰|n', '🪙|n'], '🧈|R', 5);
findT(92, 'Phoenix Reborn', '🔥', ['#BF360C', '#FFD180'], 25, 5, '🔥|o', 'des flammes de renaissance', [[3, 2], [5, 10], [7, 60]], ['🪶|n', '💨|n', '🪨|n'], '🔥|R', 7);
collTicket(93, 'Dragon Kingdom', 'x', '🏯', ['#E65100', '#FFE0B2'], [{n: 15, c: 5}], ['🐉|r', '🐉|b', '🐉|g', '🐉|o', '🐉|v'], 3, {1: 3, 2: 8, 3: 20, 4: 60},
  'Cinq royaumes dragons (rouge, bleu, vert, or, violet) de 3 symboles numérotés. Royaumes complets : 1 = 3×, 2 = 8×, 3 = 20×, 4 = 60×. Les 5 complets = JACKPOT. Un symbole en double ne remplace pas celui qui manque.');
piecesT(94, 'Legendary Crown', '👑', ['#FF6F00', '#FFF8E1'], 20, 5, '👑', 'o', 9, {6: 2, 7: 8, 8: 25, 9: 90}, ['🪨|n', '🪙|n'], 'parties de la couronne');
skyT(95, 'Golden Universe', '✨', ['#3E2723', '#FFD740'], 4, 6, '🌟|o', '⭐|n', {1: 5, 2: 15, 3: 50, 4: 120}, 'étoiles dorées');
piecesT(96, 'Legendary Vault', '🗝️', ['#5D4037', '#FFD54F'], 16, 4, '🗝️', 'o', 7, {4: 2, 5: 8, 6: 25, 7: 80}, ['🪨|n', '🔒|n'], 'clés du coffre');
piecesT(97, 'Eternal Dragon', '🐲', ['#BF360C', '#FFD740'], 18, 6, ['🐲', '🪽', '🐉', '🐾', '🦎', '🔥', '👁️', '🥚'], 'o', 8, {5: 2, 6: 8, 7: 25, 8: 90}, ['🪨|n'], 'symboles du dragon');
findT(98, 'King of Fortune', '💰', ['#E65100', '#FFF59D'], 16, 4, '💰|o', 'des trésors royaux', [[3, 3], [4, 12], [5, 60]], ['🪙|n', '🪨|n', '📜|n'], '💰|R', 5);
matchT(99, 'Legendary Infinity', '♾️', ['#FF6F00', '#FFFDE7'], 9, 3, {'♾️|y': 3, '♾️|o': 15, '♾️|v': 60}, '♾️|R', ['🪨|n', '✨|n']);
gridT(100, 'Legendary Supreme', '🏆', ['#BF360C', '#FFD740'], 8, ['🏆|o', '👑|o', '💰|o', '🪙|o'], '🏆|R', [[1, 5], [2, 15], [3, 40], [4, 120]], 5, 'légendaire');

/* ---------- 101–110 : CÉLESTE ---------- */
skyT(101, 'Celestial Stars', '🌠', CE, 5, 5, '⭐|b', '⭐|n', {1: 5, 2: 12, 3: 30, 4: 60, 5: 150}, 'étoiles');
{ // 102 : les 8 phases de la lune
  const PH = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'], DEC = ['☁️|n', '⭐|n', '🦉|n'], TH = {4: 2, 5: 5, 6: 12, 7: 30, 8: 60};
  const ph = k => PH.indexOf(emo(k));
  const ordered = g => { let w = 0; for (const k of g) if (ph(k) === w) w++; return w === 8; };
  T(102, 'Moon Goddess', 'x', '🌕', ['#1A237E', '#E8EAF6'], [{n: 12, c: 4}],
    `Les 8 phases de la lune. Phases différentes trouvées : ${payTxt(TH, '', false)}. Les 8 dans l'ordre (🌑 → 🌘, en lisant de gauche à droite puis de haut en bas) : 150×. Les 8 phases dorées = JACKPOT.`,
    {outs: [2, 5, 12, 30, 60, 150],
      score(b) {
        const g = b[0], types = uniq(g.map(ph).filter(x => x >= 0)), gold = uniq(g.filter(k => k.endsWith('|o')).map(ph).filter(x => x >= 0));
        const h = at(0, where(g, k => ph(k) >= 0));
        if (gold.length === 8) return {v: J, h};
        const v = types.length === 8 && ordered(g) ? 150 : payOf(TH, types.length);
        return {v, h: v ? h : []};
      },
      make(v) {
        const a = blank(12), tile = () => Math.random() < 0.15 ? 'o' : 'b';
        if (v === J || v === 150) { const p = shuf(rep(12, i => i)).slice(0, 8).sort((x, y) => x - y); PH.forEach((e, i) => { a[p[i]] = e + '|' + (v === J ? 'o' : tile()); }); return [fillR(a, DEC)]; }
        const n = v ? +Object.keys(TH).find(k => TH[k] === v) : between(1, 3);
        const ty = shuf(PH.slice()).slice(0, n), p = shuf(rep(12, i => i));
        ty.forEach((e, i) => { a[p[i]] = e + '|' + tile(); });
        return [fillR(a, DEC)];
      }});
}
piecesT(103, 'Solar Fortune', '☀️', ['#F57F17', '#FFFDE7'], 16, 4, '☀️', 'y', 7, {4: 2, 5: 8, 6: 25, 7: 80}, ['☁️|n', '🌫️|n'], 'rayons du soleil');
findT(104, 'Heavenly Gold', '🧈', ['#1565C0', '#FFE082'], 20, 5, '🧈|b', 'des lingots célestes', [[3, 2], [5, 15], [7, 80]], ['☁️|n', '⭐|n', '🪨|n'], '🧈|R', 7);
piecesT(105, 'Angel Wings', '🪽', ['#90CAF9', '#FFFFFF'], 18, 6, '🪽', 'b', 8, {5: 2, 6: 8, 7: 25, 8: 90}, ['☁️|n', '✨|n'], 'plumes d\'ange');
skyT(106, 'Celestial Dragon', '🐉', ['#0D47A1', '#B3E5FC'], 1, 7, '⭐|b', '⭐|n', {4: 2, 5: 8, 6: 25, 7: 100}, 'étoiles du dragon');
piecesT(107, 'Galaxy Crown', '👑', ['#1A237E', '#B388FF'], 20, 5, '💎', 'b', 9, {6: 2, 7: 8, 8: 25, 9: 90}, ['🌌|n', '⭐|n'], 'gemmes galactiques');
chestT(108, 'Heaven\'s Vault', '🧰', ['#1565C0', '#E3F2FD'], 7, 8, [1, 2, 5, 10, 20]);
findT(109, 'Star Infinity', '🌟', ['#0D47A1', '#FFF59D'], 16, 4, '🌟|b', 'des étoiles infinies', [[3, 3], [4, 12], [5, 60]], ['⭐|n', '☁️|n'], '🌟|R', 5);
gridT(110, 'Celestial Supreme', '🌌', ['#0A1A4F', '#82B1FF'], 9, ['⭐|b', '🌙|b', '☀️|b', '🪐|b'], '🌌|R', [[1, 5], [2, 15], [3, 40], [4, 100]], 5, 'céleste');

/* ---------- 111–120 : DIVIN ---------- */
findT(111, 'Divine Light', '💡', DV, 25, 5, '💎|y', 'des cristaux de lumière', [[4, 2], [5, 8], [6, 25], [7, 100]], ['☁️|n', '✨|n', '🕯️|n'], '💎|R', 7);
piecesT(112, 'God of Fortune', '🙏', ['#F9A825', '#FFF8E1'], 15, 5, ['🪙', '🍀', '🎲', '💰', '⭐'], 'y', 5, {3: 3, 4: 12, 5: 60}, ['☁️|n', '✨|n'], 'symboles divins');
piecesT(113, 'Divine Dragon', '🐉', ['#FBC02D', '#FFFDE7'], 20, 5, '🐉', 'y', 9, {6: 2, 7: 8, 8: 25, 9: 90}, ['☁️|n', '✨|n'], 'écailles divines');
codeTicket(114, 'Eternal Heaven', 'x', '⛩️', ['#F57F17', '#FFF9C4'], 7, ['🕊️', '☀️', '🌙', '⭐', '🪽', '💫', '🕯️'], ['y', 'R'], {4: 3, 5: 10, 6: 40, 7: 150}, codeRule(7, {4: 3, 5: 10, 6: 40, 7: 150}));
sevenT(115, 'Divine 777', '7️⃣', ['#F9A825', '#FFFFFF'], 7, '7️⃣|y', [[1, 10], [2, 25], [3, 100]]);
piecesT(116, 'God\'s Treasure', '🏺', ['#E65100', '#FFF8E1'], 18, 6, ['🏺', '📿', '🕯️', '📜', '⚱️', '🔔', '🗡️', '🛡️'], 'y', 8, {5: 2, 6: 8, 7: 25, 8: 90}, ['✨|n', '🪨|n'], 'reliques divines');
findT(117, 'Divine Phoenix', '🔥', ['#FF6F00', '#FFFDE7'], 30, 6, '🔥|y', 'des flammes du phénix', [[5, 2], [6, 6], [7, 20], [8, 60], [9, 150]], ['🪶|n', '✨|n', '☁️|n'], '🔥|R', 9);
piecesT(118, 'Divine Crown', '👑', ['#F9A825', '#FFFFFF'], 20, 5, '👑', 'y', 10, {7: 2, 8: 8, 9: 30, 10: 120}, ['✨|n', '☁️|n'], 'fragments de couronne');
findT(119, 'Divine Infinity', '♾️', ['#FBC02D', '#FFFFFF'], 20, 5, '♾️|y', 'des symboles infinis divins', [[3, 2], [4, 10], [5, 50]], ['✨|n', '☁️|n'], '♾️|R', 5);
gridT(120, 'Divine Supreme', '🔱', ['#F57F17', '#FFFDE7'], 10, ['✨|y', '🕊️|y', '☀️|y', '🔱|y'], '👼|R', [[1, 3], [2, 8], [3, 15], [4, 30], [5, 60], [6, 120]], 7, 'divin');

/* ---------- 121–130 : COSMIQUE ---------- */
skyT(121, 'Cosmic Stars', '💫', CO, 7, 4, '⭐|v', '⭐|n', {1: 2, 2: 4, 3: 8, 4: 15, 5: 30, 6: 70, 7: 150}, 'étoiles cosmiques');
matchT(122, 'Black Hole', '🕳️', ['#000000', '#7C4DFF'], 9, 3, {'🌑|v': 2, '☄️|v': 5, '🪐|v': 15, '⭐|v': 40}, '🌌|R', ['🌫️|n'], {4: '🕳️|n'});
piecesT(123, 'Supernova', '💥', ['#1A0033', '#FF6E40'], 18, 6, '💥', 'v', 8, {5: 2, 6: 8, 7: 25, 8: 90}, ['🌑|n', '🌫️|n'], 'fragments d\'étoile');
skyT(124, 'Galaxy Fortune', '🪐', ['#12005E', '#80D8FF'], 1, 9, '🪐|v', '🌑|n', {6: 2, 7: 8, 8: 30, 9: 120}, 'planètes');
piecesT(125, 'Cosmic Dragon', '🐉', ['#1A0033', '#B388FF'], 20, 5, '🐉', 'v', 10, {7: 2, 8: 8, 9: 30, 10: 120}, ['🌌|n', '🌑|n'], 'symboles du dragon cosmique');
findT(126, 'Nebula Gold', '🌫️', ['#311B92', '#FFD740'], 25, 5, '💎|v', 'des cristaux de nébuleuse', [[3, 2], [5, 10], [7, 50]], ['🌫️|n', '🌑|n', '⭐|n'], '💎|R', 7);
piecesT(127, 'Universe Crown', '👑', ['#0D0221', '#EA80FC'], 20, 5, '💎', 'v', 10, {7: 2, 8: 8, 9: 30, 10: 120}, ['🌌|n', '⭐|n'], 'gemmes universelles');
findT(128, 'Cosmic Infinity', '♾️', ['#1A0033', '#18FFFF'], 25, 5, '♾️|v', 'des symboles infinis cosmiques', [[3, 2], [4, 6], [5, 25], [6, 100]], ['🌌|n', '🌑|n', '⭐|n'], '♾️|R', 6);
chestT(129, 'Multiverse Vault', '🌀', ['#311B92', '#80D8FF'], 9, 10, [1, 2, 5, 10, 20]);
gridT(130, 'Cosmic Supreme', '🌌', ['#0D0221', '#7C4DFF'], 10, ['🪐|v', '⭐|v', '☄️|v', '🌑|v'], '🌌|R', [[1, 3], [2, 8], [3, 15], [4, 30], [5, 60], [6, 120]], 8, 'cosmique');

/* ---------- 131–140 : INFINI ---------- */
findT(131, 'Infinity Cash', '♾️', IN, 30, 6, '♾️|w', 'des symboles infinis', [[4, 2], [5, 6], [6, 20], [7, 80]], ['💵|n', '🪙|n', '🌀|n'], '♾️|R', 7);
skyT(132, 'Eternal Galaxy', '🌌', ['#000000', '#82B1FF'], 1, 10, '🌌|b', '⭐|n', {7: 2, 8: 8, 9: 30, 10: 120}, 'galaxies');
piecesT(133, 'Infinite Dragon', '🐉', ['#000000', '#64FFDA'], 20, 5, '🐉', 'w', 10, {7: 2, 8: 8, 9: 30, 10: 120}, ['🌀|n', '🪨|n'], 'écailles infinies');
sevenT(134, 'Infinity 777', '7️⃣', ['#000000', '#FF4081'], 7, '7️⃣|w', [[1, 10], [2, 25], [3, 60], [5, 150]]);
piecesT(135, 'Eternal Crown', '👑', ['#000000', '#FFD740'], 24, 6, '💎', 'w', 12, {9: 2, 10: 8, 11: 30, 12: 120}, ['🌀|n', '🪨|n'], 'gemmes éternelles');
chestT(136, 'Infinity Vault', '🧰', ['#000000', '#B2FF59'], 10, 12, [1, 2, 5, 10, 20]);
piecesT(137, 'Beyond Universe', '🌀', ['#0D0221', '#18FFFF'], 20, 5, ['🌀', '🕳️', '🪐', '☄️', '🌌', '👽', '🛸', '🔮', '⚛️'], 'w', 9, {6: 2, 7: 8, 8: 25, 9: 90}, ['🌑|n', '⭐|n'], 'symboles interdimensionnels');
lineTicket(138, 'Infinite Fortune', 'x', '♾️', ['#000000', '#EEFF41'], 10, 4, {'💵|w': 2, '💎|w': 5, '♾️|w': 10, '♾️|R': 20},
  '10 lignes de 4 cases. Une ligne de 4 symboles identiques : billets 2×, diamants 5×, ♾️ 10×, ♾️ royaux 20×. Les lignes s\'additionnent. Les 10 lignes en ♾️ royaux = JACKPOT.', {all: '♾️|R', extra: ['🌀|n']});
findT(139, 'Eternal Infinity', '♾️', ['#000000', '#FFD740'], 30, 6, '♾️|o', 'des symboles infinis éternels', [[4, 2], [6, 10], [8, 60]], ['🌀|n', '⭐|n', '🪨|n'], '♾️|R', 8);
gridT(140, 'Infinity Supreme', '♾️', ['#000000', '#18FFFF'], 12, ['♾️|w', '🌀|w', '⭐|w', '💎|w'], '♾️|R', [[1, 3], [2, 8], [3, 20], [4, 50], [5, 120]], 6, 'infini');

/* ---------- 141–149 : DOPAMINE ULTIME ---------- */
findT(141, 'Dopamine Rush', '⚡', DO, 50, 10, '⚡|v', 'des éclairs dopamine', [[5, 2], [6, 5], [7, 12], [8, 30], [9, 80], [10, 200]], ['🧠|n', '💊|n', '🫧|n'], '⚡|R', 10);
skyT(142, 'Dopamine Galaxy', '🧠', ['#4A0072', '#00E5FF'], 1, 12, '⭐|v', '⭐|n', {8: 2, 9: 6, 10: 20, 11: 60, 12: 200}, 'étoiles dopamine');
piecesT(143, 'Dopamine Dragon', '🐉', ['#880E4F', '#FF80AB'], 24, 6, '🐉', 'v', 12, {9: 2, 10: 8, 11: 30, 12: 120}, ['🧠|n', '💊|n'], 'symboles du dragon dopamine');
multT(144, 'Dopamine Overload', '💊', ['#AD1457', '#18FFFF'], 8, [0, 1, 2], [1, 2, 3, 5, 10], ['🧠|n', '💊|n', '⚡|n']);
piecesT(145, 'Dopamine King', '👑', ['#880E4F', '#FFD740'], 24, 6, '👑', 'v', 12, {9: 2, 10: 8, 11: 30, 12: 120}, ['🧠|n', '💊|n'], 'fragments de couronne');
findT(146, 'Dopamine Infinity', '♾️', ['#4A0072', '#FF4081'], 40, 8, '♾️|v', 'des symboles infinis', [[5, 2], [6, 5], [7, 12], [8, 30], [9, 60], [10, 150]], ['🧠|n', '💊|n', '🫧|n'], '♾️|R', 10);
findT(147, 'Dopamine Universe', '🪐', ['#1A0033', '#FF4081'], 49, 7, '🪐|v', 'des planètes dopamine', [[6, 2], [8, 10], [10, 40], [12, 150]], ['🌑|n', '⭐|n', '🧠|n'], '🪐|R', 12);
piecesT(148, 'Dopamine God', '🧠', ['#880E4F', '#FFFFFF'], 30, 6, ['🧠', '💊', '⚡', '🫧', '🎰', '🎲', '💎', '👑', '🔥', '🌈', '🚀', '🍀', '⭐', '💰', '♾️'], 'v', 15, {11: 2, 12: 6, 13: 20, 14: 60, 15: 150}, ['🌫️|n'], 'symboles divins dopamine');
gridT(149, 'Dopamine Apocalypse', '☢️', ['#000000', '#FF1744'], 15, ['🧠|v', '💊|v', '⚡|v', '🔥|v'], '☢️|R', [[1, 2], [2, 5], [3, 10], [4, 20], [6, 50], [8, 100], [10, 200]], 12, 'dopamine');

/* ---------- Catalogue : prix et jackpots (K, M, B, T, Qa, Qi, Sx, Sp, Oc, No, Dc = 10^3 … 10^33) ---------- */
const UNIT = {K: 1e3, M: 1e6, B: 1e9, T: 1e12, Qa: 1e15, Qi: 1e18, Sx: 1e21, Sp: 1e24, Oc: 1e27, No: 1e30, Dc: 1e33};
const amt = s => { const m = /^([\d.]+)([A-Za-z]*)$/.exec(s); return +m[1] * (m[2] ? UNIT[m[2]] : 1); };
const CAT = `100 10K 200 20K 350 35K 500 50K 750 75K 1K 100K 2K 250K 3K 400K 5K 750K 8K 2M
10K 2.5M 20K 5M 35K 8M 50K 12M 75K 18M 100K 25M 200K 50M 300K 80M 500K 125M 800K 200M
1M 250M 2M 500M 3.5M 800M 5M 1.2B 7.5M 1.8B 10M 2.5B 20M 5B 30M 8B 50M 12.5B 80M 20B
100M 25B 200M 50B 350M 80B 500M 120B 750M 180B 1B 250B 2B 500B 3B 800B 5B 1.25T 8B 2T
10B 2.5T 20B 5T 35B 8T 50B 12T 75B 18T 100B 25T 200B 50T 300B 80T 500B 125T 800B 200T
1T 250T 2T 500T 3.5T 800T 5T 1.2Qa 7.5T 1.8Qa 10T 2.5Qa 20T 5Qa 30T 8Qa 50T 12.5Qa 80T 20Qa
100T 25Qa 200T 50Qa 350T 80Qa 500T 120Qa 750T 180Qa 1Qa 250Qa 2Qa 500Qa 3Qa 800Qa 5Qa 1.25Qi 8Qa 2Qi
10Qa 25Qi 20Qa 50Qi 35Qa 80Qi 50Qa 120Qi 75Qa 180Qi 100Qa 250Qi 200Qa 500Qi 300Qa 800Qi 500Qa 1.25Sx 800Qa 2Sx
1Qi 250Qi 2Qi 500Qi 3.5Qi 800Qi 5Qi 1.2Sx 7.5Qi 1.8Sx 10Qi 2.5Sx 20Qi 5Sx 30Qi 8Sx 50Qi 12.5Sx 80Qi 20Sx
100Qi 25Sx 200Qi 50Sx 350Qi 80Sx 500Qi 120Sx 750Qi 180Sx 1Sx 250Sx 2Sx 500Sx 3Sx 800Sx 5Sx 1.25Sp 8Sx 2Sp
10Sx 25Sp 20Sx 50Sp 35Sx 80Sp 50Sx 120Sp 75Sx 180Sp 100Sx 250Sp 200Sx 500Sp 300Sx 800Sp 500Sx 1.25Oc 800Sx 2Oc
1Sp 250Sp 2Sp 500Sp 3.5Sp 800Sp 5Sp 1.2Oc 7.5Sp 1.8Oc 10Sp 2.5Oc 20Sp 5Oc 30Sp 8Oc 50Sp 12.5Oc 80Sp 20Oc
100Sp 25Oc 200Sp 50Oc 350Sp 80Oc 500Sp 120Oc 750Sp 180Oc 1Oc 250Oc 2Oc 500Oc 3Oc 800Oc 5Oc 1.25No 8Oc 2No
10Oc 25No 20Oc 50No 35Oc 80No 50Oc 120No 75Oc 180No 100Oc 250No 200Oc 500No 300Oc 800No 500Oc 1.25Dc 800Oc 2Dc
1No 250No 2No 500No 3.5No 800No 5No 1.2Dc 7.5No 1.8Dc 10No 2.5Dc 20No 5Dc 30No 8Dc 50No 12.5Dc 80No 20Dc`.trim().split(/\s+/);
const SERK = ['cl', 'br', 'ag', 'or', 'di', 'em', 'ru', 'pl', 'my', 'le', 'ce', 'dv', 'co', 'in', 'do'];
for (const t of TK) {
  t.price = amt(CAT[(t.num - 1) * 2]); t.jackpot = amt(CAT[(t.num - 1) * 2 + 1]);
  t.jm = t.jackpot / t.price;  // jackpot en × le prix
  t.ser = SERK[Math.ceil(t.num / 10) - 1];
}
TK.sort((a, b) => a.num - b.num);

/* ======================= Tirage ======================= */
const RTP = 0.82, J_SHARE = 0.04, HIT = 0.33;
// Table de probabilités propre à chaque ticket : la part du jackpot est fixe, le reste est réparti sur ses paliers
// (plus le palier est haut, plus il est rare) pour rendre 82 % des mises, avec environ un ticket gagnant sur trois.
function odds(t) {
  if (t._odds) return t._odds;
  const outs = t.outs.filter(v => v > 0 && v < t.jm).sort((a, b) => a - b), pj = J_SHARE / t.jm, rest = RTP - J_SHARE;
  const f = a => { const q = outs.map(v => Math.pow(v, -a)), c = rest / sum(q.map((x, i) => x * outs[i])); return {p: q.map(x => x * c), hit: c * sum(q)}; };
  let lo = -2, hi = 8, r = f(hi);
  if (r.hit > HIT) { for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (f(m).hit > HIT) hi = m; else lo = m; } r = f(hi); }
  t._odds = {outs, p: r.p, pj, hit: r.hit + pj, rtp: RTP};
  return t._odds;
}
function drawV(t) {
  const o = odds(t); let x = Math.random();
  if (x < o.pj) return J; x -= o.pj;
  for (let i = 0; i < o.outs.length; i++) { if (x < o.p[i]) return o.outs[i]; x -= o.p[i]; }
  return 0;
}
// Gain vérifié : recalculé depuis les symboles, plafonné au jackpot.
function judge(t, b) { const r = t.score(b); if (r.v !== J && r.v > t.jm) r.v = t.jm; return r; }
const same = (a, b) => a === b || (a !== J && b !== J && Math.abs(a - b) < 1e-9);
function build(t, v, tries = 600) {
  for (let i = 0; i < tries; i++) {
    let b = null; try { b = t.make(v); } catch (e) { b = null; }
    if (!b || b.some(z => !z || z.some(k => k === undefined))) continue;
    if (t.check && !t.check(b)) continue;
    if (same(judge(t, b).v, v)) return b;
  }
  return null;
}
// Achat : palier tiré, ticket fabriqué et vérifié. Repli sur un ticket perdant si un palier ne se fabrique pas.
function deal(t) {
  let v = drawV(t), b = build(t, v);
  if (!b) { v = 0; b = build(t, 0); }
  return {v, b};
}
const payout = (t, P, v) => v === J ? P * t.jm : P * v;

DT.TicketRules = {TK, SER, J, odds, drawV, judge, build, deal, payout, same, SKY5, SKY8, pokerEval, diceEval, bingoEval};

})(window.DT);
