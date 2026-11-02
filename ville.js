/* Dopamine Tycoon : l'onglet Ville (v1.30).
 *  - Météo : 6 temps qui changent toutes les 2 h (le même pour tous), chacun avec son bonus ;
 *  - Ville : 12 bâtiments à construire et améliorer ;
 *  - Arène : 20 adversaires à battre, chacun donne un bonus pour toujours ;
 *  - Cuisine : 10 plats à préparer avec les poissons de l'Atelier (bonus temporaires) ;
 *  - Arcade : Tape-taupe et Mémoire.
 * État : S.city, S.arena, S.arenaCd, S.cook, S.arc (gardés à la cure). */
window.DT = window.DT || {};
(function (DT) {
'use strict';

const $ = id => document.getElementById(id);
const now = () => DT.now();
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const MIN = 6e4, HOUR = 36e5;
function hash(n) { let x = Math.imul(n | 0, 2654435761) ^ 0x5bd1e995; x = Math.imul(x ^ (x >>> 15), 2246822519); return (x ^ (x >>> 13)) >>> 0; }
const clockStr = ms => { const s = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min ${String(s % 60).padStart(2, '0')}`; };
const fmtN = v => (Math.round(v * 100) / 100).toString().replace('.', ',');
let api = null, ver = 0;
function st() {
  const S = api.S;
  if (!S.city || typeof S.city !== 'object') S.city = {};
  if (!S.arc || typeof S.arc !== 'object') S.arc = {};
  S.arena = Math.max(0, Math.min(ARENA.length, S.arena | 0));
  return S;
}

/* ======================= Météo ======================= */
const WEATHER = [
  {ic: '☀️', name: 'Grand soleil', k: 'prod', v: 1.5, txt: 'production ×1,5'},
  {ic: '🌧️', name: 'Pluie', k: 'xp', v: 1.5, txt: 'XP ×1,5'},
  {ic: '⛈️', name: 'Orage', k: 'tap', v: 2, txt: 'taps ×2'},
  {ic: '🌈', name: 'Arc-en-ciel', k: 'luck', v: 0.03, txt: 'chance +3 %'},
  {ic: '❄️', name: 'Neige', k: 'ser', v: 1.5, txt: 'Sérénité ×1,5'},
  {ic: '🌪️', name: 'Tornade', k: 'arena', v: 1.5, txt: 'puissance à l\'Arène ×1,5'},
];
const slot = () => Math.floor(now() / (2 * HOUR));
const weather = () => DT.clock.trusted ? WEATHER[hash(slot() * 31 + 5) % WEATHER.length] : null;

/* ======================= Ville ======================= */
const CITY = [
  {id: 'house', ic: '🏠', name: 'Maison', k: 'prod', per: 1.1, secs: 60, desc: 'production ×1,1'},
  {id: 'factory', ic: '🏭', name: 'Usine', k: 'prod', per: 1.25, secs: 900, desc: 'production ×1,25'},
  {id: 'tower', ic: '🏙️', name: 'Gratte-ciel', k: 'prod', per: 2, secs: 14400, desc: 'production ×2'},
  {id: 'gym', ic: '🏋️', name: 'Salle de sport', k: 'tap', per: 1.2, secs: 120, desc: 'taps ×1,2'},
  {id: 'dojo', ic: '🥋', name: 'Dojo', k: 'tap', per: 1.5, secs: 3600, desc: 'taps ×1,5'},
  {id: 'school', ic: '🏫', name: 'École', k: 'xp', per: 1.05, secs: 300, desc: 'XP ×1,05'},
  {id: 'univ', ic: '🎓', name: 'Université', k: 'xp', per: 1.12, secs: 7200, desc: 'XP ×1,12'},
  {id: 'temple', ic: '⛩️', name: 'Temple', k: 'ser', per: 1.1, secs: 1800, desc: 'Sérénité ×1,1'},
  {id: 'casino', ic: '🎰', name: 'Casino municipal', k: 'luck', per: 0.003, secs: 2400, max: 10, desc: 'chance +0,3 %'},
  {id: 'barracks', ic: '🛡️', name: 'Caserne', k: 'arena', per: 1.3, secs: 600, desc: 'puissance à l\'Arène ×1,3'},
  {id: 'resto', ic: '🍽️', name: 'Restaurant', k: 'cook', per: 0.2, secs: 1200, max: 10, desc: 'plats +20 % plus longs'},
  {id: 'arcade', ic: '🕹️', name: 'Salle d\'arcade', k: 'arcade', per: 1.3, secs: 900, desc: 'gains de l\'Arcade ×1,3'},
];
const cl = id => st().city[id] || 0;
const cityCost = b => api.unit() * b.secs * Math.pow(1.8, cl(b.id));
function build(id) {
  const S = st(), b = CITY.find(x => x.id === id);
  if (!b || (b.max && cl(id) >= b.max)) return;
  const c = cityCost(b);
  if (S.bank < c) { api.A.denied(); return; }
  api.spend(c); S.city[id] = cl(id) + 1; ver++;
  api.A.upgrade(); api.toast(`${b.ic} <b>${b.name}</b> niveau ${S.city[id]} !`, 'mint');
  api.save(); api.onChange(); render(true);
}

/* ======================= Arène ======================= */
const ARENA = [
  ['🐀', 'Rat des égouts', 5], ['🦇', 'Chauve-souris', 8], ['🐺', 'Loup affamé', 12], ['👺', 'Gobelin', 16], ['🧟', 'Zombie du scroll', 20],
  ['🤖', 'Bot à likes', 25], ['🦂', 'Scorpion géant', 30], ['👻', 'Fantôme des notifs', 38], ['🧌', 'Troll des commentaires', 46], ['🐗', 'Sanglier enragé', 55],
  ['🧛', 'Vampire de l\'attention', 65], ['🦖', 'T-Rex', 78], ['🐲', 'Dragon vert', 92], ['👽', 'Envahisseur', 110], ['🦑', 'Kraken', 130],
  ['💀', 'Liche', 155], ['😈', 'Démon de la procrastination', 185], ['🌋', 'Titan de lave', 220], ['🌑', 'Dévoreur d\'étoiles', 260], ['♾️', 'L\'Algorithme', 300],
].map(([ic, name, need]) => ({ic, name, need}));
const arenaMult = () => { const w = weather(); return Math.pow(1.3, cl('barracks')) * (w && w.k === 'arena' ? w.v : 1) * (1 + 0.1 * (dish() && dish().d.k === 'arena' ? dish().d.v : 0)); };
const power = () => Math.log10(Math.max(10, api.S.life || 0)) * (1 + 0.02 * (api.S.lvl || 0)) * arenaMult();
function fight() {
  const S = st(), m = ARENA[S.arena];
  if (!m || now() < (S.arenaCd || 0)) return;
  const p = power(), roll = p * (0.85 + Math.random() * 0.3);
  if (roll >= m.need) {
    S.arena++; ver++;
    api.give(S.arena % 5 === 0 ? 'legend' : 'magic', 'arène');
    api.banner('ARÈNE', `${m.ic} ${m.name.toUpperCase()} VAINCU`, 'Production et taps ×1,5 pour toujours !');
    api.flash('#FF4F79'); api.confetti(innerWidth / 2, innerHeight * 0.4, 100); api.A.jackpot();
    api.addFeed(`Arène : <b>${esc(m.name)}</b> vaincu !`);
  } else {
    S.arenaCd = now() + MIN;
    api.toast(`${m.ic} <b>${m.name}</b> t'a battu (${fmtN(roll)} contre ${m.need}). Reviens dans 1 min, plus fort !`, 'coral');
    api.A.denied();
  }
  api.save(); api.onChange(); render(true);
}

/* ======================= Cuisine ======================= */
// n = nombre de poissons par rareté (0 commun … 4 mythique) ; on garde toujours un poisson de chaque espèce.
const DISHES = [
  {id: 'sushi', ic: '🍣', name: 'Sushis', n: [3], sc: 0, k: 'prod', v: 3, min: 15},
  {id: 'chips', ic: '🍟', name: 'Fish and chips', n: [5], sc: 0, k: 'tap', v: 5, min: 15},
  {id: 'onigiri', ic: '🍙', name: 'Onigiris', n: [2], sc: 10, k: 'prod', v: 2, min: 60},
  {id: 'soup', ic: '🍲', name: 'Soupe de crabe', n: [0, 2], sc: 0, k: 'prod', v: 5, min: 20},
  {id: 'paella', ic: '🥘', name: 'Paella', n: [0, 3], sc: 0, k: 'prod', v: 4, min: 60},
  {id: 'tako', ic: '🍡', name: 'Takoyakis', n: [0, 0, 2], sc: 0, k: 'tap', v: 10, min: 20},
  {id: 'bouilla', ic: '🍜', name: 'Bouillabaisse', n: [3, 0, 1], sc: 0, k: 'prod', v: 3, min: 120},
  {id: 'royal', ic: '🍱', name: 'Plateau royal', n: [0, 0, 0, 1], sc: 0, k: 'prod', v: 10, min: 30},
  {id: 'caviar', ic: '🫙', name: 'Caviar', n: [0, 0, 0, 0, 1], sc: 0, k: 'prod', v: 25, min: 60},
  {id: 'feast', ic: '🍖', name: 'Grand festin', n: [1, 1, 1, 1], sc: 0, k: 'arena', v: 5, min: 60, also: 8},
];
function spare(r) { const S = api.S; return (DT.Atel ? DT.Atel.FISH : []).filter(f => f.r === r).reduce((a, f) => a + Math.max(0, ((S.fish || {})[f.id] || 0) - 1), 0); }
const canCook = d => d.n.every((c, r) => spare(r) >= c) && (api.S.scales || 0) >= d.sc;
function dish() { const S = api.S; if (!S.cook || now() >= S.cook.until) return null; const d = DISHES.find(x => x.id === S.cook.id); return d ? {d, until: S.cook.until} : null; }
function cook(id) {
  const S = st(), d = DISHES.find(x => x.id === id);
  if (!d || dish() || !canCook(d)) { api.A.denied(); return; }
  d.n.forEach((c, r) => { for (const f of DT.Atel.FISH) { if (f.r !== r) continue; while (c > 0 && (S.fish[f.id] || 0) > 1) { S.fish[f.id]--; c--; } } });
  S.scales -= d.sc;
  const secs = d.min * 60 * (1 + 0.2 * cl('resto'));
  S.cook = {id, until: now() + secs * 1000}; ver++;
  if (d.k === 'prod' || d.k === 'tap') api.buff(d.k, d.v, secs, `${d.ic} ${d.name}`);
  if (d.also) { api.buff('prod', d.also, secs, `${d.ic} ${d.name}`); api.buff('tap', d.also, secs, `${d.ic} ${d.name}`); }
  api.A.buy(); api.toast(`${d.ic} <b>${d.name}</b> servi !`, 'mint');
  api.save(); api.onChange(); render(true);
}
const dishTxt = d => (d.k === 'arena' ? `Arène +${d.v * 10} %, production et taps ×${d.also}` : `${d.k === 'prod' ? 'production' : 'taps'} ×${d.v}`) + ` · ${d.min} min`;
const RN = ['commun', 'rare', 'épique', 'légendaire', 'mythique'];
const needTxt = d => d.n.map((c, r) => c ? `${c} ${RN[r]}${c > 1 ? 's' : ''}` : '').filter(Boolean).join(' + ') + (d.sc ? ` + ${d.sc} 🐚` : '');

/* ======================= Arcade ======================= */
const arcMult = () => Math.pow(1.3, cl('arcade'));
let game = null, gameTimer = 0;
function endGame(score, kind) {
  const S = st(), best = S.arc[kind] || 0;
  const g = api.gainTime(Math.min(score, 40) * 5 * arcMult());  // plafond : un autoclic ne rapporte pas plus qu'un bon joueur
  if (score > best) S.arc[kind] = score;
  if (kind === 'mole' && score >= 25) api.S.tickets = (api.S.tickets || 0) + 1;
  api.toast(`🕹️ ${kind === 'mole' ? 'Tape-taupe' : 'Mémoire'} : ${score} points · +${api.fmt(g)}${score > best ? ' · NOUVEAU RECORD' : ''}${kind === 'mole' && score >= 25 ? ' · +1 ticket' : ''}`, 'mint');
  api.A.questDone(); game = null; renderGame(); api.save(); render(true);
}
function moleStart() {
  if (game) return;
  game = {kind: 'mole', end: now() + 20000, score: 0, hole: -1, next: 0};
  renderGame();
}
function memStart() {
  if (game) return;
  const ic = ['🍒', '🍋', '🍇', '🍉', '⭐', '💎', '🔔', '7️⃣'], deck = ic.concat(ic);
  for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
  game = {kind: 'mem', deck, open: [], done: [], moves: 0};
  renderGame();
}
function renderGame() {
  const box = $('vlGame');
  if (!game) { DT.setHTML(box, ''); return; }
  if (game.kind === 'mole') DT.setHTML(box, `<p class="small">Tape les taupes ! ${game.score} points · ${Math.max(0, Math.ceil((game.end - now()) / 1000))} s</p><div class="vl-grid g3">${
    Array.from({length: 9}, (_, i) => `<button type="button" class="vl-cell${i === game.hole ? ' up' : ''}" data-mole="${i}">${i === game.hole ? '🐹' : '🕳️'}</button>`).join('')}</div>`);
  else DT.setHTML(box, `<p class="small">Retrouve les paires. ${game.moves} coups.</p><div class="vl-grid g4">${
    game.deck.map((c, i) => { const shown = game.open.includes(i) || game.done.includes(i); return `<button type="button" class="vl-cell${game.done.includes(i) ? ' ok' : ''}" data-mem="${i}">${shown ? c : '❓'}</button>`; }).join('')}</div>`);
}
function moleHit(i) {
  if (!game || game.kind !== 'mole' || i !== game.hole) return;
  game.score++; game.hole = -1; game.next = now() + 150; api.A.click(); renderGame();
}
function memFlip(i) {
  if (!game || game.kind !== 'mem' || game.open.length >= 2 || game.open.includes(i) || game.done.includes(i)) return;
  game.open.push(i); api.A.click();
  if (game.open.length === 2) {
    game.moves++;
    const [a, b] = game.open;
    if (game.deck[a] === game.deck[b]) { game.done.push(a, b); game.open = []; }
    else setTimeout(() => { if (game && game.kind === 'mem') { game.open = []; renderGame(); } }, 650);
    if (game.done.length === 16) { const sc = Math.max(5, 40 - game.moves); renderGame(); return endGame(sc, 'mem'); }
  }
  renderGame();
}
function gameTick(dt) {
  if (!game || game.kind !== 'mole') return;
  const t = now();
  if (t >= game.end) return endGame(game.score, 'mole');
  if (t >= game.next) { game.hole = game.hole < 0 ? Math.floor(Math.random() * 9) : -1; game.next = t + (game.hole < 0 ? 200 + Math.random() * 300 : 650 + Math.random() * 350); renderGame(); }
  gameTimer += dt; if (gameTimer > 0.5) { gameTimer = 0; renderGame(); }
}

/* ======================= Bonus ======================= */
let cache = {ver: -1, S: null, w: null, c: null, v: null};
function eff() {
  const S = st(), w = weather(), c = dish();
  if (cache.ver === ver && cache.S === S && cache.w === w && cache.c === (c && c.d)) return cache.v;
  const v = {prod: 1, tap: 1, xp: 1, ser: 1, luck: 0};
  for (const b of CITY) { const lv = cl(b.id); if (!lv) continue; if (b.k === 'luck') v.luck += b.per * lv; else if (v[b.k]) v[b.k] *= Math.pow(b.per, lv); }
  const wins = Math.pow(1.5, S.arena || 0); v.prod *= wins; v.tap *= wins;
  if (w) { if (w.k === 'luck') v.luck += w.v; else if (v[w.k]) v[w.k] *= w.v; }
  cache = {ver, S, w, c: c && c.d, v};
  return v;
}

/* ======================= Affichage ======================= */
function render(force) {
  if (!api || ($('tab-ville').hidden && !force)) return;
  const S = st(), t = now(), fmt = api.fmt, w = weather();
  DT.setHTML($('vlWeather'), w ? `<div class="vl-w"><span>${w.ic}</span><div><b>${w.name}</b><small>${w.txt} · change dans ${clockStr((slot() + 1) * 2 * HOUR - t)}</small></div></div>` : '<p class="small">Météo en attente de l\'heure du serveur…</p>');
  DT.setHTML($('vlCity'), `<div class="vl-city">${CITY.map(b => { const lv = cl(b.id), mx = b.max && lv >= b.max, c = cityCost(b);
    return `<button type="button" class="fn-boost${!mx && S.bank >= c ? ' ok' : ''}" data-build="${b.id}" ${mx ? 'disabled' : ''}><span>${b.ic}</span><b>${b.name} · niv. ${lv}</b><em>${b.desc}${mx ? ' · MAX' : ' · ' + fmt(c)}</em></button>`; }).join('')}</div>`);
  const m = ARENA[S.arena], cd = (S.arenaCd || 0) - t;
  DT.setHTML($('vlArena'), `<p class="small">${S.arena}/${ARENA.length} vaincus · bonus ×${fmt(Math.pow(1.5, S.arena))} · ta puissance : <b>${fmtN(power())}</b></p>` +
    (m ? `<div class="vl-foe"><span>${m.ic}</span><div><b>${m.name}</b><small>puissance ${m.need}</small></div><button type="button" class="btn-hero" data-fight ${cd > 0 ? 'disabled' : ''}>${cd > 0 ? clockStr(cd) : 'COMBATTRE'}</button></div>` : '<p><b>Tu as vaincu tous les adversaires. Champion de l\'Arène !</b></p>') +
    `<div class="vl-foes">${ARENA.map((a, i) => `<span class="${i < S.arena ? 'got' : ''}" title="${esc(a.name)}">${i <= S.arena ? a.ic : '❔'}</span>`).join('')}</div>`);
  const cur = dish();
  DT.setHTML($('vlCook'), (cur ? `<p class="vl-cur">${cur.d.ic} <b>${cur.d.name}</b> en cours · encore ${clockStr(cur.until - t)}</p>` : '<p class="small">Un plat à la fois. Les poissons viennent de la pêche (onglet Atelier) ; on garde toujours un poisson de chaque espèce.</p>') +
    `<div class="vl-city">${DISHES.map(d => { const ok = !cur && canCook(d);
      return `<button type="button" class="fn-boost${ok ? ' ok' : ''}" data-cook="${d.id}" ${ok ? '' : 'disabled'}><span>${d.ic}</span><b>${d.name}</b><em>${needTxt(d)} → ${dishTxt(d)}</em></button>`; }).join('')}</div>`);
  if (!game) DT.setHTML($('vlArcade'), `<div class="vl-city"><button type="button" class="fn-boost ok" data-arc="mole"><span>🐹</span><b>Tape-taupe</b><em>20 s · record ${S.arc.mole || 0}</em></button><button type="button" class="fn-boost ok" data-arc="mem"><span>🃏</span><b>Mémoire</b><em>8 paires · record ${S.arc.mem || 0}</em></button></div>`);
  else DT.setHTML($('vlArcade'), '');
}
let clock = 0;
function tick(dt) {
  if (!api || !api.inGame()) return;
  if (game) gameTick(dt);
  clock += dt; if (clock < 1) return; clock = 0;
  if (cache.w !== weather()) api.onChange();
  render(false);
}
function enter() { st(); ver++; game = null; renderGame(); }
function init(a) {
  api = a;
  $('tab-ville').addEventListener('click', e => {
    const g = s => e.target.closest(s);
    let b;
    if ((b = g('[data-build]'))) return build(b.dataset.build);
    if (g('[data-fight]')) return fight();
    if ((b = g('[data-cook]'))) return cook(b.dataset.cook);
    if ((b = g('[data-arc]'))) { b.dataset.arc === 'mole' ? moleStart() : memStart(); return render(true); }
    if ((b = g('[data-mole]'))) return moleHit(+b.dataset.mole);
    if ((b = g('[data-mem]'))) return memFlip(+b.dataset.mem);
  });
}

DT.Ville = {init, enter, tick, render: () => render(true),
  mult: k => api ? eff()[k] || 1 : 1, luck: () => api ? eff().luck : 0};

})(window.DT);
