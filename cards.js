/* Dopamine Tycoon : cartes à collectionner et coffres façon Clash. */
window.DT = window.DT || {};
(function (DT) {
'use strict';

const {CARDS, RARITIES, RARITY_ORDER, CHESTS, SETS} = DT;
const PLURAL = {common: 'Communes', rare: 'Rares', epic: 'Épiques', legendary: 'Légendaires', champion: 'Champions'};
const NEXT = r => RARITY_ORDER[RARITY_ORDER.indexOf(r) + 1];
const BY_ID = Object.fromEntries(CARDS.map(c => [c.id, c]));
const EMO = Object.fromEntries((DT.EMOTES || []).map(e => [e.id, e]));
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const MAX_CHESTS = 100000;  // pratiquement sans limite (v1.27) : les coffres s'accumulent, « Tout ouvrir » les ouvre d'un coup
let api = null;

/* ---------- Images (app/memes/<id>.*) ---------- */
const src = {};
function preload() {
  // memes/index.js (généré à l'import des images) liste les fichiers présents : aucune requête dans le vide.
  if (DT.MEME_FILES) {
    for (const [id, file] of Object.entries(DT.MEME_FILES)) if (BY_ID[id] || EMO[id]) src[id] = 'memes/' + file;
    api.onChange();
    return;
  }
  const exts = ['jpg', 'png', 'webp', 'jpeg', 'gif'];
  let pending = CARDS.length;
  for (const c of CARDS) {
    let k = 0;
    const tryNext = () => {
      if (k >= exts.length) { if (--pending === 0) api.onChange(); return; }
      const im = new Image(), url = `memes/${c.id}.${exts[k++]}`;
      im.onload = () => { src[c.id] = url; if (--pending === 0) api.onChange(); else api.onChange(); };
      im.onerror = tryNext;
      im.src = url;
    };
    tryNext();
  }
}
function silhouette(r) {
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" fill="rgba(${r.rgb},.28)"/>
    <circle cx="50" cy="42" r="19" fill="#1B1029" opacity=".55"/><path d="M14 100 Q18 64 50 64 Q82 64 86 100Z" fill="#1B1029" opacity=".55"/>
    <text x="50" y="50" text-anchor="middle" font-size="24" fill="#fff" font-family="Bungee, Impact, sans-serif">?</text></svg>`;
}
function art(id) {
  if (src[id]) return `<img src="${src[id]}" alt="" draggable="false">`;
  if (EMO[id]) return `<svg viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" fill="#fff"/>${EMO[id].svg}</svg>`;
  return silhouette(RARITIES[(BY_ID[id] || {}).rarity || 'common']);
}
DT.cardArt = art;
DT.hasCardImage = id => !!src[id];

/* ---------- Collection ---------- */
const level = copies => copies > 0 ? 1 + Math.floor(Math.log2(copies)) : 0;
const nextAt = copies => Math.pow(2, level(copies));
const own = (S, id) => ((S.cards || {})[id] || 0) > 0;
const setDone = (S, x) => x.cards.every(id => own(S, id));
// Le bonus est lu plusieurs fois par image (production de chaque mécanique) : on le garde 100 ms en mémoire.
let bCache = 0, bAt = -1, bS = null;
function bonus(S, fresh) {
  const t = performance.now();
  if (!fresh && S === bS && t - bAt < 100) return bCache;
  let b = 0;
  for (const [id, n] of Object.entries(S.cards || {})) { const c = BY_ID[id]; if (c) b += RARITIES[c.rarity].bonus * level(n); }
  for (const x of SETS) if (setDone(S, x)) b += x.bonus;
  bS = S; bAt = t; bCache = b;
  return b;
}
function cardHTML(c, copies, extra = '') {
  const r = RARITIES[c.rarity], owned = copies > 0, lv = level(copies);
  const pct = owned ? Math.round(copies / nextAt(copies) * 100) : 0;
  return `<div class="ccard r-${c.rarity}${owned ? '' : ' locked'}" ${extra}>
    <div class="cc-art">${owned ? art(c.id) : silhouette(r)}</div>
    ${owned ? `<span class="cc-lvl">Niv. ${lv}</span>` : ''}
    <div class="cc-name">${owned ? esc(c.name) : '???'}</div>
    <div class="cc-rar">${r.name}${owned ? ` · +${Math.round(r.bonus * lv * 100)} %` : ''}</div>
    ${owned ? `<div class="cc-bar" title="${copies}/${nextAt(copies)} pour le niveau suivant"><i style="width:${pct}%"></i></div>` : ''}
  </div>`;
}
function renderCollection() {
  const S = api.S, box = $('cards');
  if (!box) return;
  if (!cur) checkSets(false);
  const owned = Object.keys(S.cards || {}).length;
  $('cardCount').textContent = `${owned}/${CARDS.length}`;
  $('cardBonus').textContent = `+${Math.round(bonus(S, true) * 100)} %`;
  const sorted = [...CARDS].sort((a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity));
  box.innerHTML = sorted.map(c => cardHTML(c, (S.cards || {})[c.id] || 0, `title="${esc(c.line)}"`)).join('');
  renderSets(); renderFusion();
}

/* ---------- Collections ---------- */
function renderSets() {
  const S = api.S;
  DT.setHTML($('setList'), SETS.map(x => {
    const have = x.cards.filter(id => own(S, id)).length, done = have === x.cards.length;
    const minis = x.cards.map(id => {
      const c = BY_ID[id], mine = own(S, id);
      return `<span class="cs-mini${mine ? '' : ' off'}" title="${esc(mine ? c.name : '???')}">${mine ? art(id) : ''}</span>`;
    }).join('');
    return `<div class="cs-set${done ? ' done' : ''}"><div class="cs-head"><b>${esc(x.name)}</b><span>${done ? 'Complète · ' : ''}${have}/${x.cards.length} · +${Math.round(x.bonus * 100)} %</span></div>
      <div class="cs-bar"><i style="width:${Math.round(have / x.cards.length * 100)}%"></i></div><div class="cs-cards">${minis}</div></div>`;
  }).join(''));
}
// Annonce les séries qui viennent d'être complétées. silent : à la connexion, on note sans fêter.
function checkSets(silent) {
  const S = api.S;
  S.setsDone = S.setsDone || {};
  for (const x of SETS) {
    if (S.setsDone[x.id] || !setDone(S, x)) continue;
    S.setsDone[x.id] = DT.now();
    if (silent) continue;
    const pct = Math.round(x.bonus * 100);
    api.banner('COLLECTION', 'COMPLÈTE', `${x.name} : +${pct} % de production`);
    api.A.jackpot(); api.flash('#FFD23F'); api.confetti(innerWidth / 2, innerHeight * 0.4, 120);
    api.toast(`Collection <b>${esc(x.name)}</b> complète : <b>+${pct} %</b> de production pour toujours !`);
    api.addFeed(`Tu complètes la collection <b>${esc(x.name)}</b> (+${pct} %).`);
  }
}

/* ---------- Fusion : 5 cartes en trop d'une rareté donnent 1 carte de la rareté suivante ---------- */
// Cartes en trop : tous les exemplaires sauf le dernier de chaque carte (on ne perd jamais une carte).
const spares = (S, r) => CARDS.reduce((n, c) => n + (c.rarity === r ? Math.max(0, ((S.cards || {})[c.id] || 0) - 1) : 0), 0);
function renderFusion() {
  const S = api.S;
  DT.setHTML($('fuseRow'), RARITY_ORDER.slice(0, -1).map(r => {
    const sp = spares(S, r), n = Math.floor(sp / 5), nx = NEXT(r);
    return `<button type="button" class="fu-btn r-${nx}" data-r="${r}"${n ? '' : ' disabled'}>Fusion : 5 ${PLURAL[r]} → 1 ${RARITIES[nx].name}` +
      `<small>${n ? `${n} possible${n > 1 ? 's' : ''}` : `${sp}/5 cartes en trop`}</small></button>`;
  }).join(''));
}
function fuse(r) {
  const S = api.S, nx = NEXT(r);
  if (cur || !nx || spares(S, r) < 5) { api.A.denied(); return; }
  const used = [];
  for (let i = 0; i < 5; i++) {
    // on puise d'abord dans les cartes qu'on a en plus grand nombre
    const c = CARDS.filter(x => x.rarity === r && (S.cards[x.id] || 0) > 1).sort((a, b) => S.cards[b.id] - S.cards[a.id])[0];
    S.cards[c.id]--; used.push(c);
  }
  // 70 % de chances d'obtenir une carte qu'on n'a pas encore, s'il en reste
  const pool = CARDS.filter(c => c.rarity === nx), missing = pool.filter(c => !own(S, c.id));
  const from = missing.length && Math.random() < 0.7 ? missing : pool;
  const res = from[Math.floor(Math.random() * from.length)];
  S.cards[res.id] = (S.cards[res.id] || 0) + 1;  // créditée tout de suite, même si le jeu est fermé pendant l'animation
  S.fusions = (S.fusions || 0) + 1;
  api.save();
  cur = {type: null, fusion: {from: r, to: nx, used}, cards: [res], info: [{before: S.cards[res.id] - 1}], idx: -1, results: [], busy: false, bonus0: null};
  const m = $('chestModal');
  m.style.setProperty('--ray', RARITIES[nx].rgb);
  $('cmTitle').textContent = `Fusion : 5 ${PLURAL[r]} → 1 ${RARITIES[nx].name}`;
  $('cmStage').innerHTML = `<div class="fu-ring">${used.map((c, i) => {
    const a = (i * 72 - 90) * Math.PI / 180;
    return `<div class="fu-slot" style="transform:translate(${Math.round(Math.cos(a) * 150)}px,${Math.round(Math.sin(a) * 125)}px)">${cardHTML(c, S.cards[c.id] || 1)}</div>`;
  }).join('')}</div>`;
  $('cmCount').textContent = `5 ${PLURAL[r].toLowerCase()} en trop`;
  $('cmHint').textContent = 'Clique pour fusionner';
  $('cmSummary').hidden = true; $('cmClose').hidden = true; $('cmHint').hidden = false; $('cmSkip').hidden = true;
  m.className = 'chest-modal';
  m.hidden = false;
  renderCollection();
  api.A.chestShake();
}

/* ---------- Coffres ---------- */
function chestSVG(type, open = false) {
  const ch = CHESTS[type], metal = type === 'wood' ? '#9AA5B5' : '#FFD23F';
  const lid = open
    ? `<g transform="rotate(-28 12 52)"><path d="M12 52 Q12 16 60 16 Q108 16 108 52Z" fill="${ch.color}"/><rect x="12" y="44" width="96" height="8" fill="${metal}"/></g>`
    : `<path d="M12 52 Q12 16 60 16 Q108 16 108 52Z" fill="${ch.color}"/><rect x="12" y="44" width="96" height="8" fill="${metal}"/>
       <path d="M24 38 Q28 24 48 22" stroke="rgba(255,255,255,.55)" stroke-width="5" fill="none"/>`;
  return `<svg viewBox="0 0 120 112" aria-hidden="true"><g stroke="#1B1029" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">
    ${open ? `<ellipse cx="60" cy="52" rx="44" ry="10" fill="#FFF6B0" stroke="none" opacity=".9"/>` : ''}
    <rect x="12" y="50" width="96" height="54" rx="8" fill="${ch.color}"/>
    <rect x="12" y="66" width="96" height="9" fill="${metal}"/>
    <rect x="26" y="50" width="10" height="54" fill="${metal}"/><rect x="84" y="50" width="10" height="54" fill="${metal}"/>
    ${lid}
    ${open ? '' : `<rect x="50" y="42" width="20" height="24" rx="4" fill="${metal}"/><circle cx="60" cy="53" r="3.5" fill="#1B1029" stroke="none"/>`}
  </g></svg>`;
}
DT.chestSVG = chestSVG;

function renderSlots() {
  const S = api.S, box = $('chestSlots');
  if (!box) return;
  const list = S.chests || [];
  let html = '';
  for (let i = 0; i < 4; i++) {
    const t = list[i];
    html += t
      ? `<button type="button" class="slot full c-${t}" data-i="${i}" aria-label="Ouvrir : ${CHESTS[t].name}">${chestSVG(t)}<span>OUVRIR</span></button>`
      : `<div class="slot vide"><span>Vide</span></div>`;
  }
  box.innerHTML = html;
  $('chestMore').textContent = list.length > 4 ? `+${list.length - 4} en attente` : '';
  DT.setHidden($('chestAll'), list.length < 2);
  DT.setText($('chestAll'), `TOUT OUVRIR (${list.length})`);
  box.querySelectorAll('button.slot').forEach(b => b.addEventListener('click', () => open(+b.dataset.i)));
}
function give(type, why) {
  const S = api.S;
  S.chests = S.chests || [];
  if (S.chests.length >= MAX_CHESTS) { api.toast(`Tes emplacements de coffres sont pleins : <b>${CHESTS[type].name}</b> perdu. Ouvre-les !`, 'coral'); return; }
  S.chests.push(type);
  renderSlots();
  api.A.chestGet();
  api.toast(`<b>${CHESTS[type].name}</b> obtenu${why ? ' : ' + why : ''} !`);
  const slot = $('chestSlots').querySelector(`.slot:nth-child(${Math.min(4, S.chests.length)})`);
  if (slot) slot.animate([{transform: 'scale(1.35) rotate(-8deg)'}, {transform: 'scale(1)'}], {duration: 450, easing: 'cubic-bezier(.2,1.6,.4,1)'});
}

function roll(type) {
  const ch = CHESTS[type], out = [];
  const pickRarity = () => {
    let x = Math.random();
    for (const r of RARITY_ORDER) { x -= ch.odds[r] || 0; if (x <= 0) return r; }
    return 'common';
  };
  const luck = DT.Fun ? DT.Fun.chestLuck() : 0;
  for (let i = 0; i < ch.n; i++) {
    let r = pickRarity();
    // chance : la rareté est tirée une deuxième fois et la meilleure est gardée
    if (Math.random() < luck) { const r2 = pickRarity(); if (RARITY_ORDER.indexOf(r2) > RARITY_ORDER.indexOf(r)) r = r2; }
    out.push(r);
  }
  if (ch.sure) {
    const min = RARITY_ORDER.indexOf(ch.sure);
    if (!out.some(r => RARITY_ORDER.indexOf(r) >= min)) out[0] = ch.sure;
  }
  out.sort((a, b) => RARITY_ORDER.indexOf(a) - RARITY_ORDER.indexOf(b));
  return out.map(r => { const pool = CARDS.filter(c => c.rarity === r); return pool[Math.floor(Math.random() * pool.length)]; });
}

/* ---------- Ouverture (la séquence dopamine) ----------
 * 1. Le coffre : il faut le taper 2 fois. Il saute, la lumière fuit par les fentes ; dès le 1er tap,
 *    sa couleur trahit la meilleure carte cachée dedans (façon pack).
 * 2. Il explose : colonne de lumière de la couleur de la meilleure carte ; pour un légendaire ou un champion,
 *    l'écran s'assombrit et s'annonce avant les cartes.
 * 3. Les cartes une par une (face cachée, lueur, retournement ; un tap pendant l'attente la retourne tout de suite),
 *    ou « Tout révéler ».
 * 4. Le butin : les cartes arrivent une à une, les nouvelles marquées, et le bonus de production avant → après.
 * Les cartes sont créditées dès l'ouverture : fermer le jeu pendant l'animation ne fait rien perdre. */
let cur = null;
const TAPS = 2;
// Ce que chaque carte change, calculé à l'ouverture (avant de créditer) : nombre d'exemplaires avant, nouvelle ou non.
function credit(S, cards) {
  S.cards = S.cards || {};
  return cards.map(c => { const before = S.cards[c.id] || 0; S.cards[c.id] = before + 1; return {before}; });
}
function open(i) {
  const S = api.S;
  if (cur || !S.chests || !S.chests[i]) return;
  const type = S.chests.splice(i, 1)[0];
  S.chestsOpened = (S.chestsOpened || 0) + 1;
  if (DT.Extras) DT.Extras.quest('chest', 1);
  const cards = roll(type), bonus0 = bonus(S, true);
  const best = Math.max(...cards.map(c => RARITY_ORDER.indexOf(c.rarity)));
  cur = {type, cards, info: credit(S, cards), idx: -1, results: [], taps: 0, best, bonus0};
  api.save();
  renderSlots();
  const m = $('chestModal');
  m.style.setProperty('--ray', CHESTS[type].rgb);
  $('cmTitle').textContent = CHESTS[type].name;
  $('cmStage').innerHTML = `<div class="cm-box"><div class="cm-leak"></div><div class="cm-chest shaking">${chestSVG(type)}</div><b class="cm-n">×${cards.length}</b></div>`;
  $('cmCount').textContent = `${cards.length} cartes à l'intérieur`;
  $('cmHint').textContent = `Tape ${TAPS} fois pour l'ouvrir !`;
  $('cmSummary').hidden = true; $('cmClose').hidden = true; $('cmHint').hidden = false; $('cmSkip').hidden = true;
  m.className = 'chest-modal';
  m.hidden = false;
  api.A.chestShake();
}
function tapChest() {
  cur.taps++;
  const box = $('cmStage').querySelector('.cm-box'), chest = box.querySelector('.cm-chest'), leak = box.querySelector('.cm-leak');
  const k = cur.taps, best = RARITIES[RARITY_ORDER[cur.best]];
  chest.classList.remove('shaking');
  chest.animate([{transform: 'translateY(0) scale(1) rotate(0)'}, {transform: `translateY(${-14 - k * 10}px) scale(${1.04 + k * 0.05}) rotate(${k % 2 ? -6 - k * 2 : 6 + k * 2}deg)`, offset: 0.35},
    {transform: 'translateY(0) scale(1) rotate(0)'}], {duration: 380, easing: 'cubic-bezier(.2,1.4,.4,1)'});
  // la lumière qui fuit prend la couleur de la meilleure carte
  box.style.setProperty('--leak', best.rgb);
  box.className = `cm-box t${k}${cur.best >= 2 ? ' hot' : ''}`;
  leak.animate([{transform: 'scale(.8)', opacity: 0.6}, {transform: 'scale(1.15)', opacity: 1}, {transform: 'scale(1)', opacity: 0.9}], {duration: 380});
  api.A.chestShake();
  const r = chest.getBoundingClientRect();
  api.confetti(r.left + r.width / 2, r.top + r.height * 0.4, 8 + k * 8);
  if (cur.best >= 3) api.shake(document.body);
  if (k < TAPS) { $('cmHint').textContent = cur.best >= 3 ? 'Ça brille fort… ENCORE !' : cur.best >= 2 ? 'Ça brille… encore une fois !' : 'Encore une fois !'; return; }
  burst();
}
function burst() {
  const best = RARITIES[RARITY_ORDER[cur.best]], big = cur.best >= 3;
  cur.idx = 0; cur.busy = true;
  const m = $('chestModal');
  m.style.setProperty('--ray', best.rgb);
  $('cmStage').innerHTML = `<div class="cm-box open" style="--leak:${best.rgb}"><div class="cm-pillar"></div><div class="cm-chest opened">${chestSVG(cur.type, true)}</div></div>`;
  $('cmHint').textContent = '';
  api.A.chestOpen(); api.flash(big ? best.color : '#FFFFFF');
  api.confetti(innerWidth / 2, innerHeight * 0.5, big ? 140 : 60);
  if (big) {
    // annonce avant les cartes : l'écran s'assombrit, le nom de la rareté claque
    setTimeout(() => {
      if (!cur) return;
      m.classList.add('walkout');
      $('cmStage').insertAdjacentHTML('beforeend', `<b class="cm-walk" style="--rc:${best.color}">${cur.best === 4 ? 'UN CHAMPION' : 'DU LÉGENDAIRE'}<small>est dans ce coffre…</small></b>`);
      api.A.card(RARITY_ORDER[cur.best]); api.shake(document.body);
    }, 280);
  }
  setTimeout(() => { if (!cur) return; m.classList.remove('walkout'); cur.busy = false; reveal(); }, big ? 1500 : 380);
}
function step() {
  if (!cur) return;
  if (cur.busy) { if (cur.ff) { const f = cur.ff; cur.ff = null; f(); } return; }  // un tap pendant l'attente retourne la carte tout de suite
  if (cur.idx === -1 && cur.fusion) {
    // les 5 cartes convergent au centre, un flash, puis la révélation
    cur.idx = 0; cur.busy = true;
    $('cmStage').querySelectorAll('.fu-slot').forEach((el, i) => el.animate(
      [{transform: el.style.transform, opacity: 1}, {transform: `translate(0,0) scale(.25) rotate(${i % 2 ? 25 : -25}deg)`, opacity: 0.2}],
      {duration: 450, easing: 'cubic-bezier(.55,0,.85,.35)', fill: 'forwards'}));
    api.A.chestOpen();
    setTimeout(() => {
      if (!cur) return;
      api.flash(RARITIES[cur.fusion.to].color); api.confetti(innerWidth / 2, innerHeight * 0.45, 60);
      cur.busy = false; reveal();
    }, 470);
    return;
  }
  if (cur.idx === -1) { tapChest(); return; }
  if (cur.idx < cur.cards.length - 1) { cur.idx++; reveal(); return; }
  if ($('cmSummary').hidden) summary();
}
function reveal() {
  if (!cur) return;
  const c = cur.cards[cur.idx], r = RARITIES[c.rarity], {before} = cur.info[cur.idx];
  const isNew = before === 0, lvUp = !isNew && level(before + 1) > level(before);
  cur.results.push(c);
  const m = $('chestModal');
  m.style.setProperty('--ray', r.rgb);
  m.className = `chest-modal rar-${c.rarity}`;
  const tag = isNew ? '<b class="cm-tag new">NOUVELLE CARTE !</b>' : lvUp ? `<b class="cm-tag up">NIVEAU ${level(before + 1)} !</b>` : `<b class="cm-tag">+1 · ${before + 1}/${nextAt(before + 1)}</b>`;
  // Façon pack : la carte arrive face cachée, sa lueur trahit la rareté, puis elle se retourne (plus longtemps pour les rares).
  const ri = RARITY_ORDER.indexOf(c.rarity), wait = [90, 160, 380, 700, 1000][ri];
  $('cmStage').innerHTML = `<div class="cm-reveal pk-r${ri}" style="--rc:${r.color}"><div class="pk-rays"></div><div class="pk-flip"><div class="pk-back"><span>🧠</span></div><div class="pk-front">${cardHTML(c, before + 1, 'data-big="1"')}</div></div><div class="pk-after">${tag}<b class="cm-rname">${r.name.toUpperCase()}</b><p class="cm-line">${esc(c.line)}</p></div></div>`;
  cur.busy = true;
  const flip = $('cmStage').querySelector('.pk-flip'), after = $('cmStage').querySelector('.pk-after');
  flip.animate([{transform: 'scale(.6) translateY(60px)', opacity: 0}, {transform: 'scale(1)', opacity: 1}], {duration: 200, easing: 'cubic-bezier(.2,1.4,.4,1)'});
  const shiver = ri >= 2 ? flip.animate([{transform: 'translateX(-3px)'}, {transform: 'translateX(3px)'}], {duration: 60, iterations: Math.round(wait / 60), delay: 200}) : null;
  const doFlip = () => {
    if (!cur) return;
    cur.ff = null; if (shiver) shiver.cancel();
    flip.animate([{transform: 'rotateY(0deg) scale(1)'}, {transform: 'rotateY(90deg) scale(1.15)'}, {transform: 'rotateY(180deg) scale(1)'}], {duration: 380, easing: 'ease-in-out', fill: 'forwards'});
    if (ri >= 2) flip.classList.add('holo');
    // au moment où la carte se retourne : la fête, à la mesure de la rareté
    setTimeout(() => {
      if (!cur) return;
      if (ri >= 2) { const b = flip.getBoundingClientRect(); api.confetti(b.left + b.width / 2, b.top + b.height / 2, 30 + ri * 35); }
      if (ri >= 3) { api.shake(document.body); api.flash(r.color); }
    }, 190);
    setTimeout(() => { if (!cur) return; after.classList.add('on'); cur.busy = false; }, 380);
  };
  const t1 = setTimeout(doFlip, 200 + wait);
  cur.ff = () => { clearTimeout(t1); doFlip(); };
  const left = cur.cards.length - 1 - cur.idx;
  $('cmCount').textContent = left ? `${left} carte${left > 1 ? 's' : ''} restante${left > 1 ? 's' : ''}` : 'Dernière carte';
  $('cmHint').textContent = left ? 'Clique pour la suivante' : 'Clique pour voir le butin';
  DT.setHidden($('cmSkip'), left < 2 || !!cur.fusion);
  api.A.card(c.rarity);
  if (isNew) api.addFeed(`Nouvelle carte : <b>${esc(c.name)}</b> (${r.name}).`);
  if (cur.fusion) api.addFeed(`Fusion de 5 cartes ${PLURAL[cur.fusion.from].toLowerCase()} : tu obtiens <b>${esc(c.name)}</b> (${r.name}).`);
  api.onChange();
}
// « Tout révéler » : les cartes restantes passent directement au butin.
function skip() {
  if (!cur || cur.idx < 0) return;
  for (let i = cur.idx + 1; i < cur.cards.length; i++) {
    const c = cur.cards[i];
    cur.results.push(c);
    if (cur.info[i].before === 0) api.addFeed(`Nouvelle carte : <b>${esc(c.name)}</b> (${RARITIES[c.rarity].name}).`);
  }
  cur.idx = cur.cards.length - 1; cur.busy = false;
  api.A.chestOpen();
  summary();
}
function summary() {
  $('cmStage').innerHTML = '';
  const S = api.S, order = cur.results.map((c, i) => ({c, i})).sort((a, b) => RARITY_ORDER.indexOf(b.c.rarity) - RARITY_ORDER.indexOf(a.c.rarity));
  $('cmSummary').innerHTML = order.map(({c, i}) => {
    const isNew = cur.info[i].before === 0;
    return `<div class="cm-sc${isNew ? ' new' : ''}" style="--rc:${RARITIES[c.rarity].color}">${cardHTML(c, S.cards[c.id])}${isNew ? '<b class="cm-newb">NOUVEAU</b>' : ''}</div>`;
  }).join('');
  $('cmSummary').hidden = false; $('cmClose').hidden = false; $('cmHint').hidden = true; $('cmSkip').hidden = true;
  [...$('cmSummary').children].forEach((el, k) => el.animate([{transform: 'translateY(40px) scale(.6)', opacity: 0}, {transform: 'translateY(-6px) scale(1.06)', opacity: 1, offset: 0.7}, {transform: 'none', opacity: 1}],
    {duration: 320, delay: k * 70, easing: 'ease-out', fill: 'backwards'}));
  const b1 = Math.round(bonus(S, true) * 100), b0 = cur.bonus0 == null ? null : Math.round(cur.bonus0 * 100);
  const news = cur.info.filter(x => x.before === 0).length;
  $('cmCount').innerHTML = `${news ? `<b class="cm-gain">${news} nouvelle${news > 1 ? 's' : ''} carte${news > 1 ? 's' : ''} !</b> · ` : ''}Bonus des cartes : ${b0 != null && b1 > b0 ? `+${b0} % → <b class="cm-gain">+${b1} %</b>` : `+${b1} %`} de production`;
  $('chestModal').className = 'chest-modal';
  if (news) api.A.levelUp();
}
// Ouvre tous les coffres d'un coup : toutes les cartes créditées, puis le butin complet (cartes regroupées, ×n, nouvelles).
function openAll() {
  const S = api.S;
  if (cur || !S.chests || !S.chests.length) return;
  const list = S.chests.splice(0), bonus0 = bonus(S, true), got = new Map(), counts = {};
  for (const type of list) {
    counts[type] = (counts[type] || 0) + 1;
    for (const c of roll(type)) {
      const g = got.get(c.id) || {c, n: 0, before: (S.cards || {})[c.id] || 0};
      g.n++; got.set(c.id, g);
    }
  }
  S.cards = S.cards || {};
  let news = 0, total = 0;
  for (const g of got.values()) { S.cards[g.c.id] = g.before + g.n; total += g.n; if (!g.before) { news++; if (news <= 5) api.addFeed(`Nouvelle carte : <b>${esc(g.c.name)}</b> (${RARITIES[g.c.rarity].name}).`); } }
  if (news > 5) api.addFeed(`<b>${news} nouvelles cartes</b> en ouvrant ${list.length} coffres d'un coup !`);
  S.chestsOpened = (S.chestsOpened || 0) + list.length;
  if (DT.Extras) DT.Extras.quest('chest', list.length);
  api.save(); renderSlots();
  const sorted = [...got.values()].sort((a, b) => RARITY_ORDER.indexOf(b.c.rarity) - RARITY_ORDER.indexOf(a.c.rarity) || b.n - a.n);
  const best = sorted[0] ? sorted[0].c.rarity : 'common';
  cur = {type: null, cards: [], info: [], idx: 0, results: [], busy: false, all: true};
  const m = $('chestModal');
  m.style.setProperty('--ray', RARITIES[best].rgb);
  m.className = 'chest-modal rar-' + best;
  $('cmTitle').textContent = `${list.length} coffres ouverts`;
  $('cmStage').innerHTML = '';
  $('cmSummary').innerHTML = sorted.map(g => `<div class="cm-sc${g.before ? '' : ' new'}" style="--rc:${RARITIES[g.c.rarity].color}">${cardHTML(g.c, S.cards[g.c.id])}${g.before ? '' : '<b class="cm-newb">NOUVEAU</b>'}${g.n > 1 ? `<b class="cm-xn">×${g.n}</b>` : ''}</div>`).join('');
  $('cmSummary').hidden = false; $('cmClose').hidden = false; $('cmHint').hidden = true; $('cmSkip').hidden = true;
  const b1 = Math.round(bonus(S, true) * 100), b0 = Math.round(bonus0 * 100);
  $('cmCount').innerHTML = `${total} cartes · ${got.size} différentes${news ? ` · <b class="cm-gain">${news} nouvelle${news > 1 ? 's' : ''}</b>` : ''} · bonus des cartes ${b1 > b0 ? `+${b0} % → <b class="cm-gain">+${b1} %</b>` : `+${b1} %`}`;
  m.hidden = false;
  [...$('cmSummary').children].slice(0, 40).forEach((el, k) => el.animate([{transform: 'scale(.5)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 260, delay: k * 35, fill: 'backwards'}));
  api.A.chestOpen(); api.flash(RARITIES[best].color); api.confetti(innerWidth / 2, innerHeight * 0.4, Math.min(220, 60 + list.length));
  if (news) api.A.levelUp();
  api.onChange();
}
function close() {
  $('chestModal').hidden = true; cur = null;
  renderCollection(); renderSlots(); api.onChange(); api.save();
}

function init(a) {
  api = a;
  $('chestModal').addEventListener('click', e => {
    if (e.target.closest('#cmClose')) { close(); return; }
    if (e.target.closest('#cmSkip')) { skip(); return; }
    step();
  });
  $('chestAll').addEventListener('click', openAll);
  $('fuseRow').addEventListener('click', e => { const b = e.target.closest('.fu-btn'); if (b && !b.disabled) fuse(b.dataset.r); });
  document.addEventListener('keydown', e => { if (cur && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); if (!$('cmClose').hidden) close(); else step(); } });
  preload();
}

// À la connexion : les séries déjà complètes sont notées sans être fêtées une deuxième fois.
function enter() { checkSets(true); }

DT.Cards = {init, enter, give, renderSlots, renderCollection, bonus, level, spares, full: () => (api.S.chests || []).length >= MAX_CHESTS, get opening() { return !!cur; }};

})(window.DT);
