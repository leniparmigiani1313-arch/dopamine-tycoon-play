/* Dopamine Tycoon : échanges de cartes entre potes.
 * On propose un de ses doublons contre un doublon d'un pote. Les messages voyagent avec les scores
 * (signés par net.js) et sont renvoyés à chaque publication pendant 12 h, le temps que ntfy les garde.
 * La carte proposée est mise de côté dès l'envoi : elle revient si l'offre est refusée, annulée ou expirée. */
window.DT = window.DT || {};
(function (DT) {
'use strict';

const $ = id => document.getElementById(id);
const now = () => DT.now();
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const H12 = 12 * 3600e3, H11 = 11 * 3600e3;
let api = null, pick = {to: null, g: null, w: null};

const card = id => DT.CARDS.find(c => c.id === id);
const count = id => (api.S.cards || {})[id] || 0;
const dups = () => DT.CARDS.filter(c => count(c.id) >= 2).map(c => c.id);
const rid = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), b => b.toString(16).padStart(2, '0')).join('');

function st() {
  const S = api.S;
  S.swaps = S.swaps && S.swaps.in && S.swaps.out ? S.swaps : {in: {}, out: {}};
  S.swapOut = Array.isArray(S.swapOut) ? S.swapOut : [];
  S.swapSeen = Array.isArray(S.swapSeen) ? S.swapSeen : [];
  return S;
}
function send(msg) {
  const S = st();
  S.swapOut.push({...msg, t: now()});
  S.swapOut = S.swapOut.filter(m => now() - m.t < H12).slice(-8);
  api.save(); api.publish();
}
// Messages renvoyés à chaque publication (net.js les ajoute au score signé).
function outbox() {
  if (!api || !api.S.swapOut) return null;
  const list = api.S.swapOut.filter(m => now() - m.t < H12).slice(-8);
  return list.length ? list : null;
}

function mini(id, extra = '') {
  const c = card(id); if (!c) return '';
  const r = DT.RARITIES[c.rarity];
  return `<span class="sw-card ${extra}" style="--rc:${r.color}" title="${esc(c.name)} (${r.name})">${DT.cardArt(id)}<b>${esc(c.name)}</b></span>`;
}

/* ---------- Actions ---------- */
function propose() {
  const S = st(), {to, g, w} = pick, friend = api.players()[to];
  if (!friend || !g || !w) return;
  if (count(g) < 2) { api.A.denied(); api.toast('Tu ne peux proposer qu\'un doublon.', 'coral'); return; }
  S.cards[g]--;
  const id = rid();
  S.swaps.out[id] = {to, name: friend.name, g, w, t: now(), st: 'sent'};
  send({id, to, k: 'o', g, w});
  api.A.chestGet();
  api.toast(`Offre envoyée à <b>${esc(friend.name)}</b> : ton ${esc(card(g).name)} contre son ${esc(card(w).name)}.`, 'mint');
  pick = {to: null, g: null, w: null};
  render(); api.onChange();
}
function accept(id) {
  const S = st(), o = S.swaps.in[id];
  if (!o || o.st !== 'new') return;
  if (now() - o.t > H11) { o.st = 'exp'; render(); return; }
  if (count(o.w) < 2) { api.A.denied(); api.toast(`Il te faut un doublon de <b>${esc(card(o.w).name)}</b> pour accepter.`, 'coral'); return; }
  S.cards[o.w]--; S.cards[o.g] = count(o.g) + 1;
  o.st = 'done'; S.swapsDone = (S.swapsDone || 0) + 1;
  send({id, to: o.from, k: 'a', g: o.g, w: o.w});
  celebrate(o.g, `Échange réussi avec ${o.name} !`);
  api.addFeed(`Échange avec <b>${esc(o.name)}</b> : tu reçois <b>${esc(card(o.g).name)}</b>.`);
  render(); api.onChange();
}
function refuse(id) {
  const S = st(), o = S.swaps.in[id];
  if (!o || o.st !== 'new') return;
  o.st = 'no';
  send({id, to: o.from, k: 'n', g: o.g, w: o.w});
  api.A.click(); render();
}
function cancel(id) {
  const S = st(), o = S.swaps.out[id];
  if (!o || o.st !== 'sent') return;
  o.st = 'x'; S.cards[o.g] = count(o.g) + 1;
  send({id, to: o.to, k: 'x', g: o.g, w: o.w});
  api.A.click(); render(); api.onChange();
}
function celebrate(id, title) {
  const c = card(id), r = DT.RARITIES[c.rarity];
  api.A.card(c.rarity); api.A.jackpot();
  api.banner('ÉCHANGE', c.name.toUpperCase(), title);
  api.flash(r.color); api.confetti(innerWidth / 2, innerHeight * 0.4, 120);
}

/* ---------- Messages reçus (déjà vérifiés par net.js) ---------- */
function onMsg(m, me) {
  if (!me || !Array.isArray(m.tx)) return;
  const S = st();
  let changed = false;
  for (const x of m.tx) {
    if (x.to !== me.key) continue;
    const tag = `${m.key}:${x.id}:${x.k}`;
    if (S.swapSeen.includes(tag)) continue;
    S.swapSeen.push(tag); if (S.swapSeen.length > 120) S.swapSeen.shift();
    changed = true;
    if (x.k === 'o') {
      if (S.swaps.in[x.id] || now() - x.t > H11) continue;
      // Anti-spam : 3 offres en attente au plus par joueur, 30 en tout (sinon la sauvegarde enflerait sans fin).
      const pend = Object.values(S.swaps.in).filter(o => o.st === 'new');
      if (pend.length >= 30 || pend.filter(o => o.from === m.key).length >= 3) continue;
      S.swaps.in[x.id] = {from: m.key, name: m.name, g: x.g, w: x.w, t: x.t, st: 'new'};
      api.A.goldenSpawn();
      api.toast(`<b>${esc(m.name)}</b> te propose un échange : son ${esc(card(x.g).name)} contre ton ${esc(card(x.w).name)}.`, 'mint');
    } else if (x.k === 'a') {
      const o = S.swaps.out[x.id];
      if (!o || o.to !== m.key || (o.st !== 'sent' && o.st !== 'exp')) continue;
      // Offre expirée entre-temps : la carte était revenue, on la reprend si on l'a encore en double.
      if (o.st === 'exp' && count(o.g) >= 2) S.cards[o.g]--;
      S.cards[o.w] = count(o.w) + 1;
      o.st = 'done'; S.swapsDone = (S.swapsDone || 0) + 1;
      celebrate(o.w, `${o.name} accepte ton échange !`);
      api.addFeed(`<b>${esc(o.name)}</b> accepte ton échange : tu reçois <b>${esc(card(o.w).name)}</b>.`);
    } else if (x.k === 'n') {
      const o = S.swaps.out[x.id];
      if (!o || o.to !== m.key || o.st !== 'sent') continue;
      o.st = 'no'; S.cards[o.g] = count(o.g) + 1;
      api.toast(`<b>${esc(o.name)}</b> refuse ton échange. Ton ${esc(card(o.g).name)} te revient.`, 'coral');
    } else if (x.k === 'x') {
      const o = S.swaps.in[x.id];
      if (o && o.from === m.key && o.st === 'new') o.st = 'x';
    }
  }
  if (changed) { render(); api.onChange(); api.save(); }
}
// Offres envoyées sans réponse depuis 12 h : la carte revient (seulement après un premier relevé réseau).
function expire() {
  const S = st();
  for (const o of Object.values(S.swaps.out)) if (o.st === 'sent' && now() - o.t > H12) { o.st = 'exp'; S.cards[o.g] = count(o.g) + 1; api.toast(`Pas de réponse de <b>${esc(o.name)}</b> : ton ${esc(card(o.g).name)} te revient.`); }
  for (const [id, o] of Object.entries(S.swaps.in)) if ((o.st !== 'new' && now() - o.t > 3 * 86400e3) || (o.st === 'new' && now() - o.t > H12)) delete S.swaps.in[id];
  for (const [id, o] of Object.entries(S.swaps.out)) if (o.st !== 'sent' && now() - o.t > 3 * 86400e3) delete S.swaps.out[id];
}

/* ---------- Fenêtre ---------- */
const incoming = () => Object.entries(st().swaps.in).filter(([, o]) => o.st === 'new' && now() - o.t < H11);
function badge() {
  const n = incoming().length, b = $('swapBadge');
  DT.setText(b, String(n)); DT.setHidden(b, !n);
  const btn = $('swapBtn'); if (btn.classList.contains('ready') !== !!n) btn.classList.toggle('ready', !!n);
}
function render() {
  if (!api) return;
  badge();
  if ($('swapModal').hidden) return;
  const S = st(), players = api.players(), mine = dups();
  const ins = incoming();
  $('swIn').innerHTML = ins.length ? ins.map(([id, o]) => `<li class="sw-offer">
      <span class="sw-who"><b>${esc(o.name)}</b> te propose</span>
      <span class="sw-deal">${mini(o.g)}<i>⇄</i>${mini(o.w, count(o.w) >= 2 ? '' : 'miss')}</span>
      <span class="sw-act"><button type="button" class="btn-hero" data-acc="${id}" ${count(o.w) >= 2 ? '' : 'disabled'}>ACCEPTER</button><button type="button" class="btn" data-ref="${id}">REFUSER</button></span>
      ${count(o.w) >= 2 ? '' : `<small>Il te faut un doublon de ${esc(card(o.w).name)}.</small>`}</li>`).join('')
    : '<li class="empty">Aucune proposition pour l\'instant.</li>';
  const outs = Object.entries(S.swaps.out).filter(([, o]) => o.st === 'sent');
  $('swOut').innerHTML = outs.length ? outs.map(([id, o]) => `<li class="sw-offer">
      <span class="sw-who">Envoyée à <b>${esc(o.name)}</b> · expire dans ${Math.max(1, Math.ceil((H12 - (now() - o.t)) / 3600e3))} h</span>
      <span class="sw-deal">${mini(o.g)}<i>⇄</i>${mini(o.w)}</span>
      <span class="sw-act"><button type="button" class="btn" data-can="${id}">ANNULER</button></span></li>`).join('')
    : '<li class="empty">Aucune offre en attente.</li>';
  const friends = Object.entries(players).filter(([, p]) => now() - p.t < H12).sort((a, b) => b[1].t - a[1].t);
  $('swFriends').innerHTML = friends.length ? friends.map(([k, p]) => `<button type="button" class="sw-friend" data-to="${k}" aria-pressed="${pick.to === k}">${esc(p.name)}<small>${(p.st.dup || []).length} doublon${(p.st.dup || []).length > 1 ? 's' : ''}</small></button>`).join('')
    : '<p class="small">Aucun pote en ligne ces 12 dernières heures. Les échanges passent par le classement.</p>';
  const f = pick.to && players[pick.to];
  const theirs = f ? (f.st.dup || []) : [];
  $('swGive').innerHTML = mine.length ? mine.map(id => `<button type="button" class="sw-pick" data-g="${id}" aria-pressed="${pick.g === id}">${mini(id)}<em>×${count(id)}</em></button>`).join('')
    : '<p class="small">Tu n\'as aucun doublon. Ouvre des coffres !</p>';
  $('swWant').innerHTML = !f ? '<p class="small">Choisis d\'abord un pote.</p>' : theirs.length
    ? theirs.map(id => `<button type="button" class="sw-pick" data-w="${id}" aria-pressed="${pick.w === id}">${mini(id)}${count(id) ? '' : '<em class="new">NOUVELLE</em>'}</button>`).join('')
    : `<p class="small">${esc(f.name)} n'a aucun doublon à échanger.</p>`;
  const ok = f && pick.g && pick.w && mine.includes(pick.g) && theirs.includes(pick.w);
  $('swSend').disabled = !ok;
  $('swSend').textContent = ok ? `PROPOSER À ${f.name.toUpperCase()}` : 'PROPOSER L\'ÉCHANGE';
}
function open() {
  $('swapModal').hidden = false;
  if (pick.to && !api.players()[pick.to]) pick = {to: null, g: null, w: null};
  render(); api.A.click();
}

let clock = 0;
function tick(dt) {
  clock += dt;
  if (clock < 1) return;
  clock = 0;
  if (api.pulledOnce()) expire();
  badge();
}
function init(a) {
  api = a;
  $('swapBtn').addEventListener('click', open);
  $('swClose').addEventListener('click', () => { $('swapModal').hidden = true; });
  $('swapModal').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.acc) accept(b.dataset.acc);
    else if (b.dataset.ref) refuse(b.dataset.ref);
    else if (b.dataset.can) cancel(b.dataset.can);
    else if (b.dataset.to) { pick = {to: b.dataset.to, g: pick.g, w: null}; api.A.click(); render(); }
    else if (b.dataset.g) { pick.g = b.dataset.g; api.A.click(); render(); }
    else if (b.dataset.w) { pick.w = b.dataset.w; api.A.click(); render(); }
    else if (b.id === 'swSend') propose();
  });
}

DT.Echange = {init, tick, onMsg, outbox, dups, render};

})(window.DT);
