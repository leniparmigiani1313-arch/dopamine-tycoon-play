/* Dopamine Tycoon : la Bourse Dopamine. Des actions imaginaires dont le cours ne dépend que de l'heure :
 * tous les joueurs voient exactement le même marché, sans serveur. On parie à la hausse ou à la baisse,
 * avec un levier. Tout se joue en nmol du jeu. */
window.DT = window.DT || {};
(function (DT) {
'use strict';

const $ = id => document.getElementById(id);
const now = () => DT.now();
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const pct = x => (x >= 0 ? '+' : '') + (x * 100).toFixed(Math.abs(x) < 0.1 ? 2 : 1).replace('.', ',') + ' %';
let api = null;

/* ---------- Le marché ---------- */
const STOCKS = [
  {sym: 'DOPA',   name: 'Dopamine Corp',     base: 42,  vol: 1,   seed: 11, color: '#FF4F79'},
  {sym: 'STONK',  name: 'Stonks Industries', base: 137, vol: 1.2, seed: 23, color: '#5FE0B7'},
  {sym: 'BANANE', name: 'Banane Dorée',      base: 8.5, vol: 1.5, seed: 37, color: '#FFD23F'},
  {sym: 'POPIT',  name: 'Pop-it Holdings',   base: 64,  vol: 0.8, seed: 41, color: '#4FD8FF'},
  {sym: 'CHAD',   name: 'Chad Capital',      base: 250, vol: 1.1, seed: 53, color: '#C77DFF'},
  {sym: 'LUNE',   name: 'LuneCoin',          base: 3.2, vol: 2.4, seed: 67, color: '#FF9F1C'},
  // Pack France
  {sym: 'BAGUET', name: 'Baguette & Fils',   base: 1.2, vol: 0.9, seed: 71, color: '#E9B872'},
  {sym: 'CROISS', name: 'Croissant Capital', base: 18,  vol: 1.3, seed: 83, color: '#F4A259'},
  {sym: 'PETANQ', name: 'Pétanque Holdings', base: 95,  vol: 0.7, seed: 97, color: '#9AA5B1'},
];
const BY = Object.fromEntries(STOCKS.map(s => [s.sym, s]));
// Bruit lissé : période (s) et amplitude (en log du prix) de chaque couche.
const OCT = [[4, 0.010], [15, 0.024], [60, 0.05], [300, 0.1], [1800, 0.16], [7200, 0.25]];
const NEWS_EVERY = 150, NEWS_RISE = 4, NEWS_FADE = 90;
const NEWS_UP = ['{n} signe un partenariat avec la Lune', 'Un influenceur IA recommande {s}', '{n} invente le pop-it infini',
  'Record de ventes pour {n}', '{n} rachète tous les boutons « J\'aime »', 'Le Chad investit dans {s}',
  '{n} ouvre une boulangerie sur Mars', 'Cocorico : {n} élu meilleure entreprise de France', 'Les Bleus sponsorisés par {n}'];
const NEWS_DOWN = ['Scandale : {n} utilisait des dark patterns', 'Le PDG de {n} a touché de l\'herbe', 'Panne mondiale chez {n}',
  '{n} convoqué au tribunal des notifications', 'Un singe blond vend toutes ses {s}', 'Rumeur de faillite chez {n}',
  'Grève générale chez {n}', '{n} oublie de remplir sa déclaration d\'impôts', 'Pénurie de beurre : {n} plonge'];

function hash(i, s) {
  let x = Math.imul(i | 0, 374761393) ^ Math.imul(s | 0, 668265263);
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}
function noise(t, period, seed) {
  const u = t / period, i = Math.floor(u), f = u - i, k = f * f * (3 - 2 * f);
  return (hash(i, seed) * (1 - k) + hash(i + 1, seed) * k) * 2 - 1;
}
// Annonce de la fenêtre w (ou null) : moment, sens et force du choc.
function newsOf(st, w) {
  if (hash(w, st.seed + 77) > 0.2) return null;
  const up = hash(w, st.seed + 79) < 0.55;
  const list = up ? NEWS_UP : NEWS_DOWN;
  return {t0: w * NEWS_EVERY + hash(w, st.seed + 78) * 110, up, mag: (up ? 1 : -1) * (0.1 + 0.25 * hash(w, st.seed + 80)) * Math.min(1.6, st.vol),
    txt: list[Math.floor(hash(w, st.seed + 81) * list.length)].replace('{n}', st.name).replace('{s}', st.sym)};
}
function logPrice(st, t) {
  let v = 0;
  for (let k = 0; k < OCT.length; k++) v += OCT[k][1] * noise(t, OCT[k][0], st.seed * 7 + k);
  v *= st.vol;
  const w = Math.floor(t / NEWS_EVERY);
  for (let j = w - 3; j <= w; j++) {
    const n = newsOf(st, j);
    if (!n || t < n.t0) continue;
    const a = t - n.t0;
    v += n.mag * Math.min(1, a / NEWS_RISE) * Math.exp(-Math.max(0, a - NEWS_RISE) / NEWS_FADE);
  }
  return v;
}
const price = (st, t = now() / 1000) => st.base * Math.exp(logPrice(st, t));

/* ---------- Positions ---------- */

const LEVS = [1, 5, 10, 25];
// Objectif : la position s'encaisse toute seule quand elle rapporte autant (vérifié même fenêtre fermée).
const TPS = [0, 0.5, 1, 3];
const tpLab = x => x ? '+' + Math.round(x * 100) + ' %' : 'Aucun';
// Durée affichée par le graphique
const SPANS = [[60, '1 min'], [180, '3 min'], [900, '15 min'], [3600, '1 h']];
let sel = 'DOPA', lev = 1, tp = 0, span = 180, lastNews = {}, uiClock = 0, liqClock = 0, sparkClock = 1;
// Session (tant que le jeu reste ouvert) : trades, gagnants, bilan, meilleur.
const sess = {n: 0, won: 0, net: 0, best: 0};
const betAmt = () => DT.Bet.amount(api.S.bank);  // jauge de mise commune (mise.js)
const valueOf = (p, px) => p.amt * Math.max(0, 1 + p.dir * p.lev * (px / p.p0 - 1));
const liqPrice = p => p.p0 * (1 - p.dir / p.lev);

function openPos(dir) {
  if (!clockOk()) return;
  const S = api.S, amt = betAmt();
  if (amt < 1 || S.bank < amt) { api.A.denied(); res('Pas assez de dopamine pour cette mise.', ''); return; }
  if (S.bPos.length >= 8) { api.A.denied(); res('8 positions maximum : encaisses-en une d\'abord.', ''); return; }
  api.spend(amt);
  const st = BY[sel];
  S.bPos.push({id: Math.random().toString(36).slice(2, 9), sym: sel, dir, lev, amt, p0: price(st), t: now(), tp});
  S.bTrades = (S.bTrades || 0) + 1;
  api.A.buy();
  res(`${dir > 0 ? 'HAUSSE' : 'BAISSE'} sur ${sel} ×${lev} : ${api.fmt(amt)} nmol engagés${tp ? `, objectif ${tpLab(tp)}` : ''}.`, '');
  const btn = $(dir > 0 ? 'bxUp' : 'bxDown'); btn.animate([{transform: 'scale(.94)'}, {transform: 'scale(1)'}], {duration: 180, easing: 'ease-out'});
  renderPos(true); api.onChange();
}
const TIERS = [[9, 'TO THE MOON', '#5FE0B7'], [3, 'ÉNORME TRADE', '#C77DFF'], [1, 'BEAU TRADE', '#FFD23F']];
// how : '' (clic), 'auto' (objectif atteint), 'all' (tout encaisser : pas de fête par position)
function closePos(id, how = '') {
  if (!DT.clock.synced) { if (!how) clockOk(); return null; }
  const S = api.S, i = S.bPos.findIndex(p => p.id === id);
  if (i < 0) return null;
  const p = S.bPos[i], v = valueOf(p, price(BY[p.sym])), r = v / p.amt - 1, gain = v - p.amt;
  S.bPos.splice(i, 1);
  api.gain(v);
  S.bWon = (S.bWon || 0) + gain;
  if (r > (S.bBest || 0)) S.bBest = r;
  if (r >= 1) S.bMoon = (S.bMoon || 0) + 1;
  sess.n++; sess.net += gain; if (r > 0) sess.won++; sess.best = Math.max(sess.best, r);
  const open = !$('bourseModal').hidden;
  if (how !== 'all') {
    const tier = TIERS.find(([at]) => r >= at);
    if (tier) {
      S.bigWins = (S.bigWins || 0) + (r >= 9 ? 1 : 0);
      api.A.jackpot(); api.flash(tier[2]);
      if (r >= 3) api.shake(document.body);
      for (let k = 0; k < (r >= 9 ? 4 : r >= 3 ? 3 : 2); k++) setTimeout(() => api.confetti(innerWidth * (0.25 + Math.random() * 0.5), innerHeight * 0.3, 90), k * 230);
      if (r >= 9) api.addFeed(`<b>TO THE MOON</b> en Bourse : ${p.sym} ${pct(r)}, +${api.fmt(gain)} nmol.`);
      if (open) bigTrade(tier, p, r, gain); else api.banner(tier[1], pct(r), `+${api.fmt(gain)} nmol sur ${p.sym}`);
    } else if (r > 0) { api.A.upgrade(); api.confetti(innerWidth / 2, innerHeight * 0.45, Math.round(20 + Math.min(80, r * 60))); }
    else api.A.click();
    if (how === 'auto' && !open) api.toast(`🎯 <b>Objectif atteint</b> sur ${p.sym} ×${p.lev} : ${pct(r)}, +${api.fmt(gain)} nmol encaissés.`, 'mint');
    if (open) countRes(`${how === 'auto' ? '🎯 Objectif atteint · ' : ''}${p.sym} encaissé : ${pct(r)}`, gain, r >= 0 ? 'good' : '');
    if (r > 0 && open) { const b = $('bxRes').getBoundingClientRect(); api.flyTo(b.left + b.width / 2, b.top, $('bank'), Math.min(24, 4 + Math.round(r * 8))); }
  }
  renderPos(true); renderSess(); api.onChange(); api.save();
  return {r, gain};
}
function closeAll() {
  const S = api.S;
  if (!S.bPos.length || !clockOk()) return;
  let n = 0, tot = 0, best = -1;
  for (const id of S.bPos.map(p => p.id)) { const x = closePos(id, 'all'); if (x) { n++; tot += x.gain; best = Math.max(best, x.r); } }
  if (!n) return;
  if (tot > 0) { api.A.jackpot(); api.confetti(innerWidth / 2, innerHeight * 0.4, Math.min(160, 40 + n * 15)); } else api.A.click();
  countRes(`${n} position${n > 1 ? 's' : ''} encaissée${n > 1 ? 's' : ''} (meilleure ${pct(best)}) :`, tot, tot >= 0 ? 'good' : '');
}
// Le gain défile dans la ligne de résultat.
let countT = 0, bigT = 0;
function countRes(label, gain, cls) {
  const r = $('bxRes'), t0 = performance.now(), dur = Math.abs(gain) > 0 ? 500 : 0;
  r.className = 'slot-res ' + cls; clearInterval(countT);
  const step = () => {
    const k = dur ? Math.min(1, (performance.now() - t0) / dur) : 1, v = gain * (1 - Math.pow(1 - k, 3));
    r.textContent = `${label} ${v >= 0 ? '+' : '−'}${api.fmt(Math.abs(v))} nmol`;
    if (k >= 1) clearInterval(countT);
  };
  step(); if (dur) countT = setInterval(step, 40);
}
function bigTrade(tier, p, r, gain) {
  const el = $('bxBig'), t0 = performance.now();
  clearTimeout(bigT);
  el.hidden = false; el.style.setProperty('--tc', tier[2]);
  el.innerHTML = `<b>${tier[1]}</b><span id="bxBigN">+0</span><small>${p.dir > 0 ? '▲' : '▼'} ${p.sym} ×${p.lev} · ${pct(r)}</small>`;
  const iv = setInterval(() => {
    const k = Math.min(1, (performance.now() - t0) / 1300);
    DT.setText($('bxBigN'), '+' + api.fmt(gain * (1 - Math.pow(1 - k, 3))));
    if (k >= 1) { clearInterval(iv); bigT = setTimeout(() => { el.hidden = true; }, 1100); }
  }, 40);
}
function renderSess() {
  DT.setHTML($('bxSess'), sess.n ? `Session : <b>${sess.n}</b> trade${sess.n > 1 ? 's' : ''} · <b>${sess.won}</b> gagnant${sess.won > 1 ? 's' : ''} · <span class="${sess.net >= 0 ? 'is-up' : 'is-down'}">bilan ${sess.net >= 0 ? '+' : '−'}${api.fmt(Math.abs(sess.net))}</span>${sess.best > 0 ? ` · meilleur <b>${pct(sess.best)}</b>` : ''}` : '');
}
// Liquidation : si le cours franchit le seuil, la mise est perdue (vérifié chaque seconde, même fenêtre fermée).
function checkLiq() {
  const S = api.S;
  if (!S.bPos.length || !DT.clock.synced) return;
  const t = now() / 1000;
  for (let i = S.bPos.length - 1; i >= 0; i--) {
    const p = S.bPos[i], v = valueOf(p, price(BY[p.sym], t));
    if (p.tp > 0 && v / p.amt - 1 >= p.tp) { closePos(p.id, 'auto'); continue; }
    if (v > 0) continue;
    S.bPos.splice(i, 1);
    S.bLiq = (S.bLiq || 0) + 1; S.bWon = (S.bWon || 0) - p.amt;
    sess.n++; sess.net -= p.amt; renderSess();
    api.A.bossKill(); api.toast(`<b>LIQUIDÉ !</b> Ta position ×${p.lev} sur ${p.sym} est partie en fumée (−${api.fmt(p.amt)} nmol).`, 'coral');
    if (!$('bourseModal').hidden) { api.shake($('bxChart')); res(`LIQUIDÉ sur ${p.sym} ×${p.lev}.`, ''); }
    renderPos(true);
  }
}

// Les cours dépendent de l'heure : on ne joue qu'à l'heure officielle du serveur (changer l'heure du PC ne sert à rien).
function clockOk() {
  if (DT.clock.synced) return true;
  api.A.denied(); res('Connexion au serveur pour avoir l\'heure officielle… La Bourse a besoin d\'internet.', '');
  return false;
}

/* ---------- Affichage ---------- */
function res(txt, cls) { const r = $('bxRes'); r.textContent = txt; r.className = 'slot-res ' + cls; }
function renderList() {
  const t = now() / 1000;
  for (const st of STOCKS) {
    const row = st.row || (st.row = $('bxList').querySelector(`[data-s="${st.sym}"]`));
    if (!row) continue;
    const p = price(st, t), ch = p / price(st, t - 60) - 1;
    DT.setText(row._p || (row._p = row.querySelector('.bx-p')), fmtP(p));
    const c = row._c || (row._c = row.querySelector('.bx-c'));
    DT.setText(c, pct(ch)); DT.setClass(c, 'bx-c ' + (ch >= 0 ? 'is-up' : 'is-down'));
    if (sparkClock >= 1) {
      const pl = row._s || (row._s = row.querySelector('.bx-spark polyline')), N = 24, ps = [];
      let lo = Infinity, hi = -Infinity;
      for (let i = 0; i <= N; i++) { const q = price(st, t - 180 + 180 * i / N); ps.push(q); if (q < lo) lo = q; if (q > hi) hi = q; }
      const d = hi - lo || 1;
      pl.setAttribute('points', ps.map((q, i) => `${(i / N * 60).toFixed(1)},${(17 - (q - lo) / d * 16).toFixed(1)}`).join(' '));
      pl.setAttribute('stroke', ps[N] >= ps[0] ? '#5FE0B7' : '#FF4F79');
    }
  }
  if (sparkClock >= 1) sparkClock = 0;
}
const fmtP = p => p >= 100 ? p.toFixed(1).replace('.', ',') : p.toFixed(2).replace('.', ',');
function buildList() {
  $('bxList').innerHTML = STOCKS.map(st => `<button type="button" class="bx-row" data-s="${st.sym}" aria-pressed="${st.sym === sel}" style="--c:${st.color}">
    <b>${st.sym}</b><small>${esc(st.name)}</small><span class="bx-p"></span><span class="bx-c"></span>
    <svg class="bx-spark" viewBox="0 0 60 18" preserveAspectRatio="none" aria-hidden="true"><polyline fill="none" stroke-width="1.6" points=""/></svg></button>`).join('');
  STOCKS.forEach(st => { st.row = null; });
  sparkClock = 1;
}
function renderSegs() {
  DT.Bet.refresh();
  $('bxLevs').innerHTML = LEVS.map(l => `<button type="button" data-l="${l}" aria-pressed="${l === lev}" class="${l >= 25 ? 'allin' : ''}">×${l}</button>`).join('');
  $('bxTps').innerHTML = TPS.map(x => `<button type="button" data-tp="${x}" aria-pressed="${x === tp}">${x ? tpLab(x) : '—'}</button>`).join('');
  $('bxSpans').innerHTML = SPANS.map(([s, l]) => `<button type="button" data-sp="${s}" aria-pressed="${s === span}">${l}</button>`).join('');
}
let posKey = '';
function renderPos(force) {
  const S = api.S, box = $('bxPos'), t = now() / 1000;
  const key = S.bPos.map(p => p.id).join();
  if (force || key !== posKey) {
    posKey = key;
    box.innerHTML = S.bPos.length ? S.bPos.map(p => `<li data-id="${p.id}" style="--c:${BY[p.sym].color}">
      <span class="bx-tag ${p.dir > 0 ? 'is-up' : 'is-down'}">${p.dir > 0 ? '▲' : '▼'} ${p.sym} ×${p.lev}${p.tp ? ` <em class="bx-tp">🎯 ${tpLab(p.tp)}</em>` : ''}</span>
      <span class="bx-amt">${api.fmt(p.amt)}</span><span class="bx-pl"></span>
      <button type="button" class="btn bx-close" data-close="${p.id}">ENCAISSER</button></li>`).join('')
      : '<li class="empty">Aucune position. Choisis une action, une mise, un levier, puis parie !</li>';
  }
  for (const li of box.querySelectorAll('li[data-id]')) {
    const p = S.bPos.find(q => q.id === li.dataset.id); if (!p) continue;
    const v = valueOf(p, price(BY[p.sym], t)), r = v / p.amt - 1;
    const pl = li._pl || (li._pl = li.querySelector('.bx-pl'));
    DT.setText(pl, `${pct(r)} · ${api.fmt(v)}`); DT.setClass(pl, 'bx-pl ' + (r >= 0 ? 'is-up' : 'is-down'));
    const b = li._b || (li._b = li.querySelector('.bx-close'));
    DT.setText(b, r >= 0 ? `ENCAISSER +${api.fmt(v - p.amt)}` : 'COUPER');
    DT.setClass(b, 'btn bx-close' + (r >= 0.5 ? ' hot' : ''));
  }
  const tot = S.bPos.reduce((a, p) => a + valueOf(p, price(BY[p.sym], t)) - p.amt, 0);
  DT.setText($('bxTot'), S.bPos.length ? `${tot >= 0 ? '+' : ''}${api.fmt(tot)} nmol en cours` : `Bilan : ${(S.bWon || 0) >= 0 ? '+' : ''}${api.fmt(S.bWon || 0)} nmol`);
  DT.setHidden($('bxAll'), S.bPos.length < 2);
  if (S.bPos.length >= 2) DT.setText($('bxAll'), `TOUT ENCAISSER ${tot >= 0 ? '+' : '−'}${api.fmt(Math.abs(tot))}`);
}

/* Graphique : la durée choisie (1 min à 1 h), redessiné à chaque image tant que la fenêtre est ouverte. */
let range = null;
function drawChart() {
  const cv = $('bxChart');
  if (!cv._w || cv._stale) { cv._w = cv.clientWidth; cv._h = cv.clientHeight; cv._stale = false; }
  const dpr = Math.min(1.5, devicePixelRatio || 1), w = cv._w, h = cv._h;
  if (!w) return;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const st = BY[sel], t = now() / 1000, N = 120, pts = new Array(N + 1);
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i <= N; i++) { const p = price(st, t - span + span * i / N); pts[i] = p; if (p < lo) lo = p; if (p > hi) hi = p; }
  // boule de cristal : le cours des prochaines secondes (il ne dépend que de l'heure)
  const fut = DT.Fun ? DT.Fun.crystal() : 0, FN = 20, fp = [];
  if (fut) for (let j = 0; j <= FN; j++) { const p = price(st, t + fut * j / FN); fp.push(p); if (p < lo) lo = p; if (p > hi) hi = p; }
  const mine = api.S.bPos.filter(p => p.sym === sel);
  for (const p of mine) { lo = Math.min(lo, p.p0); hi = Math.max(hi, p.p0); }
  const pad = (hi - lo) * 0.15 + hi * 0.002;
  const tgt = [lo - pad, hi + pad];
  if (!range || range.sym !== sel || range.span !== span) range = {sym: sel, span, lo: tgt[0], hi: tgt[1]};
  range.lo += (tgt[0] - range.lo) * 0.08; range.hi += (tgt[1] - range.hi) * 0.08;
  range.lo = Math.min(range.lo, lo); range.hi = Math.max(range.hi, hi);
  const L = 8, R = w - 62, T = 10, B = h - 12;
  const Wt = span + fut, X = i => L + (R - L) * (span * i / N) / Wt, XF = j => L + (R - L) * (span + fut * j / FN) / Wt;
  const Y = p => B - (B - T) * (p - range.lo) / (range.hi - range.lo);
  c.fillStyle = '#120A1E'; c.fillRect(0, 0, w, h);
  c.strokeStyle = 'rgba(255,255,255,.06)'; c.lineWidth = 1; c.beginPath();
  for (let k = 1; k < 4; k++) { const y = T + (B - T) * k / 4; c.moveTo(L, y); c.lineTo(R, y); }
  for (let k = 1; k < 6; k++) { const x = L + (R - L) * k / 6; c.moveTo(x, T); c.lineTo(x, B); }
  c.stroke();
  const up = pts[N] >= pts[0], col = up ? '#5FE0B7' : '#FF4F79';
  c.beginPath(); c.moveTo(X(0), Y(pts[0]));
  for (let i = 1; i <= N; i++) c.lineTo(X(i), Y(pts[i]));
  c.lineWidth = 3; c.lineJoin = 'round'; c.strokeStyle = col; c.stroke();
  c.lineTo(X(N), B); c.lineTo(X(0), B); c.closePath();
  const g = c.createLinearGradient(0, T, 0, B); g.addColorStop(0, up ? 'rgba(95,224,183,.35)' : 'rgba(255,79,121,.35)'); g.addColorStop(1, 'rgba(18,10,30,0)');
  c.fillStyle = g; c.fill();
  c.font = `700 11px ${api.mono || 'monospace'}`; c.textBaseline = 'middle';
  for (const p of mine) {
    const y = Y(p.p0), v = valueOf(p, pts[N]), r = v / p.amt - 1;
    c.setLineDash([6, 5]); c.strokeStyle = r >= 0 ? '#5FE0B7' : '#FF4F79'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(L, y); c.lineTo(R, y); c.stroke(); c.setLineDash([]);
    c.fillStyle = r >= 0 ? '#5FE0B7' : '#FF4F79'; c.fillText(`${p.dir > 0 ? '▲' : '▼'}×${p.lev} ${pct(r)}`, L + 4, y - 9);
    const lq = liqPrice(p);
    if (lq > range.lo && lq < range.hi) { const yl = Y(lq); c.strokeStyle = 'rgba(255,79,121,.6)'; c.setLineDash([2, 4]); c.beginPath(); c.moveTo(L, yl); c.lineTo(R, yl); c.stroke(); c.setLineDash([]); c.fillStyle = '#FF4F79'; c.fillText('LIQUIDATION', L + 4, yl + 9); }
  }
  if (fut) {
    c.setLineDash([5, 4]); c.strokeStyle = '#FFD23F'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(X(N), Y(pts[N]));
    for (let j = 1; j <= FN; j++) c.lineTo(XF(j), Y(fp[j]));
    c.stroke(); c.setLineDash([]);
    const d = fp[FN] / pts[N] - 1;
    c.fillStyle = '#FFD23F'; c.fillText(`🔮 ${fut} s : ${pct(d)}`, Math.max(L + 4, XF(FN) - 92), Math.max(T + 10, Y(fp[FN]) - 12));
  }
  const lx = X(N), ly = Y(pts[N]), pulse = 5 + Math.sin(t * 6) * 2;
  c.fillStyle = col; c.globalAlpha = 0.3; c.beginPath(); c.arc(lx, ly, pulse + 4, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
  c.beginPath(); c.arc(lx, ly, 5, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#1B1029'; c.lineWidth = 2; c.stroke();
  c.fillStyle = col; const lab = fmtP(pts[N]); const tw = c.measureText(lab).width + 12;
  c.beginPath(); c.roundRect(R + 4, ly - 11, Math.max(tw, 52), 22, 6); c.fill();
  c.fillStyle = '#1B1029'; c.fillText(lab, R + 10, ly + 1);
  DT.setText($('bxSym'), `${st.sym} · ${st.name}`);
  DT.setText($('bxPrice'), fmtP(pts[N]));
  const ch = pts[N] / pts[0] - 1;
  DT.setText($('bxChg'), `${pct(ch)} en ${SPANS.find(x => x[0] === span)[1]}`); DT.setClass($('bxChg'), 'bx-chg ' + (ch >= 0 ? 'is-up' : 'is-down'));
}

/* Annonces : une par action et par fenêtre de 150 s ; toast si tu as une position dessus. */
function checkNews() {
  const t = now() / 1000, w = Math.floor(t / NEWS_EVERY);
  for (const st of STOCKS) {
    const n = newsOf(st, w);
    if (!n || t < n.t0 || t > n.t0 + 30 || lastNews[st.sym] === w) continue;
    lastNews[st.sym] = w;
    const open = !$('bourseModal').hidden, held = api.S.bPos.some(p => p.sym === st.sym);
    if (open) { DT.setText($('bxNews'), `${n.up ? '🚀' : '💥'} FLASH INFO · ${n.txt}`); DT.setClass($('bxNews'), 'bx-news ' + (n.up ? 'is-up' : 'is-down')); $('bxNews').animate([{transform: 'scale(1.06)'}, {transform: 'scale(1)'}], {duration: 300, easing: 'ease-out'}); api.A.event(); }
    else if (held) api.toast(`${n.up ? '🚀' : '💥'} <b>${st.sym}</b> : ${esc(n.txt)}`, n.up ? 'mint' : 'coral');
  }
}

function open() {
  $('bourseModal').hidden = false;
  $('bxChart')._stale = true;
  buildList(); renderSegs(); renderPos(true); renderList(); renderSess(); res('', ''); $('bxBig').hidden = true;
  api.A.click();
}
function tick(dt) {
  liqClock += dt;
  if (liqClock >= 0.5) { liqClock = 0; checkLiq(); checkNews(); }
  if ($('bourseModal').hidden) return;
  drawChart();
  uiClock += dt; sparkClock += dt;
  if (uiClock >= 0.25) {
    uiClock = 0; renderList(); renderPos(false);
    DT.setText($('bxBank'), api.fmt(api.S.bank));
    DT.setText($('bxUp'), `▲ HAUSSE · ${api.fmt(betAmt())}`); DT.setText($('bxDown'), `▼ BAISSE · ${api.fmt(betAmt())}`);
  }
}
function init(a) {
  api = a;
  $('bourseBtn').addEventListener('click', open);
  $('bxClose').addEventListener('click', () => { $('bourseModal').hidden = true; });
  $('bxList').addEventListener('click', e => {
    const b = e.target.closest('.bx-row'); if (!b) return;
    sel = b.dataset.s; range = null; api.A.click();
    $('bxList').querySelectorAll('.bx-row').forEach(r => r.setAttribute('aria-pressed', r.dataset.s === sel));
  });
  DT.Bet.mount($('bxBets'), {bank: () => api.S.bank, fmt: api.fmt, A: api.A,
    onChange: all => { if (all) res(`TAPIS : toute ta banque (${api.fmt(api.S.bank)} nmol) sur une seule position.`, ''); }});
  $('bxLevs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; lev = +b.dataset.l; renderSegs(); api.A.click();
    if (lev > 1) res(`Levier ×${lev} : gains et pertes multipliés par ${lev}. Liquidé si le cours bouge de ${Math.round(100 / lev)} % contre toi.`, ''); });
  $('bxUp').addEventListener('click', () => openPos(1));
  $('bxDown').addEventListener('click', () => openPos(-1));
  $('bxPos').addEventListener('click', e => { const b = e.target.closest('[data-close]'); if (b) closePos(b.dataset.close); });
  $('bxAll').addEventListener('click', closeAll);
  $('bxTps').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; tp = +b.dataset.tp; renderSegs(); api.A.click();
    res(tp ? `Objectif ${tpLab(tp)} : tes prochaines positions s'encaissent toutes seules quand elles rapportent ${tpLab(tp)}.` : 'Pas d\'objectif : tu encaisses toi-même.', ''); });
  $('bxSpans').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; span = +b.dataset.sp; range = null; renderSegs(); api.A.click(); });
  // Flèche haut : HAUSSE, flèche bas : BAISSE, E : tout encaisser
  document.addEventListener('keydown', e => {
    if ($('bourseModal').hidden || e.repeat || (e.target.closest && e.target.closest('input, select, textarea'))) return;
    if (e.key === 'ArrowUp') { e.preventDefault(); openPos(1); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); openPos(-1); }
    else if (e.key === 'e' || e.key === 'E') closeAll();
  });
  addEventListener('resize', () => { $('bxChart')._stale = true; });
}

DT.Bourse = {init, tick, open, STOCKS, price};

})(window.DT);
