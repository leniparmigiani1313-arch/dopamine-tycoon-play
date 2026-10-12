/* Dopamine Tycoon : la boutique et le grattage des tickets. Les règles, le tirage et la vérification sont dans
 * tickets-rules.js (DT.TicketRules). Ici : la vitrine par série, l'affichage des zones, la pellicule à gratter
 * (une par zone), la révélation et le paiement.
 * Le ticket acheté est enregistré dans la sauvegarde (S.tkCur) jusqu'à sa révélation : fermer le jeu ne change rien,
 * et le gain payé est recalculé à partir des symboles (le même que celui affiché par « Tout révéler »). */
window.DT = window.DT || {};
(function (DT) {
'use strict';

const R = DT.TicketRules, J = R.J;
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const pick = a => a[Math.floor(Math.random() * a.length)];
const DIE = '⚀⚁⚂⚃⚄⚅', SUIT = {s: '♠', h: '♥', d: '♦', c: '♣'};
const FOIL = {
  cl: ['#C9D2DE', '#F4F7FB', '#AAB5C4', '#E3E8EF'], br: ['#8C5A2B', '#E0A96D', '#A0632F', '#F3C892'],
  ag: ['#9EA7B3', '#FFFFFF', '#B8C0CC', '#E9EEF4'], or: ['#B8860B', '#FFE082', '#C9A227', '#FFF3C4'],
  di: ['#80DEEA', '#FFFFFF', '#B388FF', '#E1F5FE'], em: ['#1B5E20', '#B9F6CA', '#43A047', '#E8F5E9'], ru: ['#8E0000', '#FF8A80', '#C62828', '#FFEBEE'],
  pl: ['#78909C', '#FFFFFF', '#CFD8DC', '#ECEFF1'], my: ['#4A148C', '#EA80FC', '#7B1FA2', '#F3E5F5'], le: ['#E65100', '#FFE57F', '#FF9800', '#FFF8E1'],
  ce: ['#0D47A1', '#E3F2FD', '#82B1FF', '#FFFFFF'], dv: ['#F9A825', '#FFFFFF', '#FFF176', '#FFFDE7'], co: ['#1A0033', '#7C4DFF', '#311B92', '#B388FF'],
  in: ['#000000', '#18FFFF', '#212121', '#84FFFF'], do: ['#FF80AB', '#FFD180', '#FFFF8D', '#84FFFF', '#B388FF'],
};
let api = null, ser = null, game = null, zoom = 1;
const fmtP = x => api.fmt(x) + ' nmol';

/* ---------- Prix (catalogue : prix et jackpot fixes, comme au bureau de tabac) ---------- */
const priceOf = t => t.price;
// Un ticket gratuit paie un ticket qui coûte au plus 10 minutes de production (au moins jusqu'à 1 000 nmol).
const freeMax = () => Math.max(1000, api.unit() * 600);
const freeOk = t => (api.S.tickets || 0) > 0 && t.price <= freeMax();
const big = t => t.Z.some(z => (z.c || 0) >= 7 || z.n >= 40);
// Catégorie proposée à l'ouverture : la plus chère dont le ticket le moins cher est abordable.
function bestSer() { let best = 'cl'; for (const k of Object.keys(R.SER)) { const m = Math.min(...R.TK.filter(t => t.ser === k).map(t => t.price)); if (m <= api.S.bank) best = k; } return best; }

/* ---------- Symboles ---------- */
function cellHTML(k, P) {
  const c0 = k[0];
  if (c0 === '$') { const v = +k.slice(1); return v ? `<b class="tk-amt">${api.fmt(v * P)}</b>` : '<b class="tk-amt off">✖</b>'; }
  if (c0 === '#') { const [n, t] = k.slice(1).split('|'); return `<b class="tk-num${t ? ' c-' + t : ''}">${n}</b>`; }
  if (c0 === '%') return `<b class="tk-die">${DIE[+k[1] - 1]}</b>`;
  if (c0 === '@') return `<b class="tk-card s-${k[2]}">${k[1] === 'T' ? '10' : k[1]}<i>${SUIT[k[2]]}</i></b>`;
  if (c0 === '*') return `<b class="tk-mul">×${k.slice(1)}</b>`;
  if (c0 === '~') return `<b class="tk-lbl">${esc(k.slice(1))}</b>`;
  if (k === '·') return '<span class="tk-floor"></span>';
  const [e, t, l] = k.split('|');
  return `<span class="tk-e c-${t || 'n'}">${e}${l ? `<small>${esc(l)}</small>` : ''}</span>`;
}
function zoneHTML(z, zi, cells, P) {
  const items = cells.map((k, ci) => `<div class="tk-c" data-z="${zi}" data-i="${ci}">${z.num ? `<i class="tk-badge">${ci + 1}</i>` : ''}${cellHTML(k, P)}</div>`);
  let inner;
  if (z.kind === 'sky') {
    const pts = z.sky.flatMap(c => c.p), lines = z.sky.flatMap((c, ci) => c.l.map(([a, b]) => {
      const o = z.sky.slice(0, ci).reduce((s, x) => s + x.p.length, 0), A = pts[o + a], B = pts[o + b];
      return `<line data-c="${ci}" x1="${A[0]}" y1="${A[1]}" x2="${B[0]}" y2="${B[1]}"/>`;
    })).join('');
    inner = `<div class="tk-sky" style="--ps:${Math.min(9, 50 / Math.sqrt(pts.length)).toFixed(1)}%"><svg viewBox="0 0 100 72" preserveAspectRatio="none">${lines}</svg>${items.map((h, i) => h.replace('class="tk-c"', `class="tk-c tk-pt" style="left:${pts[i][0]}%;top:${pts[i][1] / 72 * 100}%"`)).join('')}
      ${z.sky.map(c => `<em class="tk-cn" style="left:${c.p[0][0]}%;top:${(c.p[0][1] + 6) / 72 * 100}%">${esc(c.n)}</em>`).join('')}</div>`;
  } else inner = `<div class="tk-grid${z.kind ? ' k-' + z.kind : ''}${z.lines ? ' lines' : ''}${(z.c || 0) >= 7 ? ' big' : ''}">${z.head ? z.head.map(h => `<span class="tk-colh">${h}</span>`).join('') : ''}${items.join('')}</div>`;
  return `<section class="tk-zone">${z.t ? `<h4>${esc(z.t)}</h4>` : ''}<div class="tk-scr${z.kind === 'sky' ? ' sky' : ''}" style="--cols:${z.c || 1}${z.w ? `;width:${z.w}%;max-width:${z.w * 2.6}px` : ''}">${inner}<canvas class="tk-foil" data-z="${zi}"></canvas></div></section>`;
}

/* ---------- Boutique ---------- */
function shop() {
  $('tkShopBox').hidden = false; $('tkGame').hidden = true;
  const free = api.S.tickets || 0;
  DT.setText($('tkFree'), free ? `🎟️ ${free} ticket${free > 1 ? 's' : ''} gratuit${free > 1 ? 's' : ''} (jusqu'à ${fmtP(freeMax())})` : '');
  $('tkTabs').innerHTML = Object.entries(R.SER).map(([k, s]) => `<button type="button" data-s="${k}" aria-pressed="${k === ser}">${s.n}</button>`).join('');
  $('tkShop').innerHTML = R.TK.filter(t => t.ser === ser).map(t => {
    const pr = priceOf(t), o = R.odds(t), poor = !freeOk(t) && api.S.bank < pr;
    return `<button type="button" class="tk-pick s-${t.ser}${poor ? ' poor' : ''}" data-t="${t.id}" style="--c1:${t.c[0]};--c2:${t.c[1]}">
      <span class="tk-pico">${t.ico}</span><b>${esc(t.name)}</b><em>n°${String(t.num).padStart(3, '0')}</em>
      <small>${freeOk(t) ? 'GRATUIT' : fmtP(pr)}</small><i>jackpot ${fmtP(t.jackpot)} · 1 chance sur ${(1 / o.hit).toFixed(1).replace('.', ',')} de gagner</i></button>`;
  }).join('');
}

/* ---------- Achat et affichage ---------- */
function buy(id) {
  const t = R.TK.find(x => x.id === id), S = api.S;
  if (!t) return;
  if (S.tkCur) { show(); return; }
  const P = priceOf(t), free = freeOk(t);
  if (!free && S.bank < P) { api.A.denied(); api.toast(`Il te faut ${fmtP(P)} pour ce ticket.`); return; }
  if (free) S.tickets--; else { api.spend(P); S.casinoBet = (S.casinoBet || 0) + P; }
  const {v, b} = R.deal(t);  // le résultat est décidé ici, puis enregistré
  S.tkCur = {id: t.id, P, v, b, free};
  S.scratched = (S.scratched || 0) + 1;
  DT.Extras && DT.Extras.quest('scratch', 1);
  api.A.buy(); api.save(); api.onChange();
  show();
}
function show() {
  const cur = api.S.tkCur, t = cur && R.TK.find(x => x.id === cur.id);
  if (!t) { api.S.tkCur = null; shop(); return; }
  game = {t, cur, done: false, moves: 0, lastSnd: 0, clear: {}};
  $('tkShopBox').hidden = true; $('tkGame').hidden = false;
  const tk = $('tkTicket');
  tk.className = 'tk-ticket s-' + t.ser;
  tk.style.setProperty('--c1', t.c[0]); tk.style.setProperty('--c2', t.c[1]);
  $('tkName').textContent = `${t.ico} ${t.name}`;
  DT.setText($('tkNum'), `n°${String(t.num).padStart(3, '0')} · ${R.SER[t.ser].n}`);
  $('tkRule').textContent = t.rule;
  $('tkPlay').className = 'tk-play' + (t.Z.length > 4 ? ' many' : '');
  $('tkPlay').innerHTML = t.Z.map((z, zi) => zoneHTML(z, zi, cur.b[zi], cur.P)).join('');
  $('tkFoot').textContent = `Prix ${cur.free ? 'GRATUIT' : fmtP(cur.P)} · jackpot ${fmtP(R.payout(t, cur.P, J))}`;
  zoom = 1; $('tkPlay').style.zoom = ''; $('tkZoom').hidden = !big(t); DT.setText($('tkZoom'), '🔍 Zoom');
  $('scratchRes').textContent = 'Gratte les zones argentées, ou « Tout révéler ».'; $('scratchRes').className = 'slot-res';
  $('tkAgain').hidden = true; $('tkBack').hidden = true; $('tkAll').hidden = false;
  requestAnimationFrame(() => document.querySelectorAll('#tkPlay .tk-foil').forEach(paintFoil));
}
function paintFoil(cv) {
  const box = cv.parentElement.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = Math.max(1, Math.round(box.width * dpr)); cv.height = Math.max(1, Math.round(box.height * dpr)); cv.dataset.dpr = dpr;
  const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const t = game.t, cols = FOIL[t.ser], g = c.createLinearGradient(0, 0, box.width, box.height);
  cols.forEach((col, i) => g.addColorStop(i / (cols.length - 1), col));
  c.fillStyle = g; c.fillRect(0, 0, box.width, box.height);
  c.fillStyle = 'rgba(27,16,41,.10)';
  for (let i = 0; i < box.width * box.height / 300; i++) c.fillRect(Math.random() * box.width, Math.random() * box.height, 2, 2);
  // motif du ticket imprimé sur la pellicule
  const s = Math.max(16, Math.min(34, box.width / 8));
  c.font = `${s}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.globalAlpha = 0.22;
  for (let y = s / 2; y < box.height; y += s * 1.6) for (let x = s / 2 + ((y / s | 0) % 2) * s * 0.8; x < box.width; x += s * 1.6) c.fillText(t.ico, x, y);
  c.globalAlpha = 1;
  if (box.width > 120) { c.font = `400 ${Math.max(13, Math.min(22, box.width * 0.07))}px ${api.font}`; c.fillStyle = 'rgba(27,16,41,.5)'; c.fillText('GRATTE ICI', box.width / 2, box.height / 2); }
  cv.style.opacity = 1;
}
function scratchAt(cv, e) {
  if (!game || game.done) return;
  const r = cv.getBoundingClientRect(), c = cv.getContext('2d'), dpr = +cv.dataset.dpr || 1, sx = cv.width / dpr / r.width;
  c.globalCompositeOperation = 'destination-out'; c.fillStyle = '#000';
  c.beginPath(); c.arc((e.clientX - r.left) * sx, (e.clientY - r.top) * sx, Math.max(14, Math.min(26, r.width * 0.06)) * sx, 0, Math.PI * 2); c.fill();
  c.globalCompositeOperation = 'source-over';
  if (performance.now() - game.lastSnd > 70) { game.lastSnd = performance.now(); api.A.scratch(); }
  if (++game.moves % 10 === 0) check(cv);
}
// Part grattée de chaque zone ; au-delà de 65 % de la surface totale, tout se dévoile.
function check(cv) {
  const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
  let clear = 0, tot = 0;
  for (let i = 3; i < d.length; i += 4 * 61) { tot++; if (d[i] === 0) clear++; }
  game.clear[cv.dataset.z] = [clear / Math.max(1, tot), cv.width * cv.height];
  let a = 0, s = 0;
  document.querySelectorAll('#tkPlay .tk-foil').forEach(f => { const [p, w] = game.clear[f.dataset.z] || [0, f.width * f.height]; a += p * w; s += w; });
  if (s && a / s > 0.65) reveal();
}

/* ---------- Révélation et paiement ---------- */
function reveal() {
  if (!game || game.done) return;
  game.done = true;
  const {t, cur} = game, S = api.S, r = R.judge(t, cur.b), win = R.payout(t, cur.P, r.v), res = $('scratchRes');
  document.querySelectorAll('#tkPlay .tk-foil').forEach(cv => cv.animate([{opacity: 1}, {opacity: 0}], {duration: 450, fill: 'forwards'}));
  const cell = (z, i) => $('tkPlay').querySelector(`.tk-c[data-z="${z}"][data-i="${i}"]`);
  const hit = new Set(r.h.map(([z, i]) => z + ':' + i));
  $('tkPlay').querySelectorAll('.tk-c').forEach(el => el.classList.add(hit.has(el.dataset.z + ':' + el.dataset.i) ? 'hit' : 'dim'));
  (r.mark || []).forEach(([z, i]) => { const el = cell(z, i); if (el) el.classList.add('mark'); });
  (r.gild || []).forEach(i => { const el = cell(0, i); if (el) { el.innerHTML = cellHTML('🪙|o', cur.P); el.classList.add('gild'); } });
  (r.path || []).forEach(i => { const el = cell(0, i); if (el) el.classList.add('path'); });
  if (r.open !== undefined) for (let i = r.open; i < 3; i++) { const el = cell(1, i); if (el) el.classList.add('closed'); }
  if (r.links) $('tkPlay').querySelectorAll('.tk-sky line').forEach(l => l.classList.toggle('on', !!r.links[+l.dataset.c]));
  S.tkCur = null;
  if (win > 0) {
    api.gain(win);
    S.scratchWins = (S.scratchWins || 0) + 1; S.casinoWon = (S.casinoWon || 0) + win;
    const m = r.v === J ? t.jm : r.v;
    res.textContent = r.v === J ? `JACKPOT ! +${fmtP(win)}` : `GAGNÉ : +${fmtP(win)} (${String(m).replace('.', ',')}× le prix${r.why ? ', ' + r.why : ''})`;
    res.className = 'slot-res good';
    const b = $('tkTicket').getBoundingClientRect();
    api.flyTo(b.left + b.width / 2, b.top + b.height / 3, $('bank'), Math.min(30, 6 + Math.round(m)));
    if (r.v === J) {
      S.bigWins = (S.bigWins || 0) + 1; S.tkJackpots = (S.tkJackpots || 0) + 1;
      api.A.jackpot(); api.banner(t.name.toUpperCase(), 'JACKPOT !', `+${fmtP(win)}`);
      api.shake(document.body); api.flash(t.c[1]); api.confetti(innerWidth / 2, innerHeight * 0.3, 220);
      api.addFeed(`<b>JACKPOT</b> au ticket ${esc(t.name)} : +${fmtP(win)} !`);
    } else if (m >= 25) {
      S.bigWins = (S.bigWins || 0) + 1;
      api.A.jackpot(); api.banner('GROS LOT', `×${m}`, `+${fmtP(win)}`); api.confetti(innerWidth / 2, innerHeight * 0.35, 120);
    } else { api.A.upgrade(); api.confetti(b.left + b.width / 2, b.top + 20, m >= 5 ? 70 : 35); }
  } else {
    res.textContent = pick(['Perdu… Le prochain sera le bon.', 'Pas cette fois !', 'Raté. Un autre ?', 'Rien… mais presque !']);
    api.A.denied();
  }
  $('tkAll').hidden = true; $('tkAgain').hidden = false; $('tkBack').hidden = false;
  $('tkAgain').textContent = `REJOUER · ${freeOk(t) ? 'GRATUIT' : fmtP(priceOf(t))}`;
  api.onChange(); api.save();
}
function open() {
  $('scratchModal').hidden = false;
  if (api.S.tkCur) show(); else { game = null; ser = bestSer(); shop(); }
  api.A.click();
}
function init(a) {
  api = a;
  $('scratchBtn').addEventListener('click', open);
  $('buyTicket').addEventListener('click', open);
  $('tkTabs').addEventListener('click', e => { const b = e.target.closest('[data-s]'); if (!b) return; ser = b.dataset.s; shop(); api.A.click(); });
  $('tkShop').addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (b) buy(b.dataset.t); });
  const play = $('tkPlay');
  let down = null;
  play.addEventListener('pointerdown', e => { const cv = e.target.closest('.tk-foil'); if (!cv) return; down = cv; try { cv.setPointerCapture(e.pointerId); } catch (err) {} scratchAt(cv, e); });
  play.addEventListener('pointermove', e => { if (down) scratchAt(down, e); });
  const up = () => { if (down && game && !game.done) check(down); down = null; };
  play.addEventListener('pointerup', up); play.addEventListener('pointercancel', up);
  $('tkAll').addEventListener('click', () => { api.A.click(); reveal(); });
  // Grandes grilles : zoom ×1 → ×1,6 → ×2,4 (la pellicule suit, le grattage reste au bon endroit).
  $('tkZoom').addEventListener('click', () => { zoom = zoom >= 2.4 ? 1 : zoom >= 1.6 ? 2.4 : 1.6; $('tkPlay').style.zoom = zoom === 1 ? '' : zoom; DT.setText($('tkZoom'), zoom === 1 ? '🔍 Zoom' : `🔍 ×${String(zoom).replace('.', ',')}`); api.A.click(); });
  $('tkAgain').addEventListener('click', () => { if (game) buy(game.t.id); });
  $('tkBack').addEventListener('click', () => { game = null; shop(); api.A.click(); });
  // Fermer garde le ticket non gratté dans la sauvegarde : il réapparaît tel quel à la prochaine ouverture.
  $('tkClose').addEventListener('click', () => { $('scratchModal').hidden = true; });
  // Calcul des tables de chances en tâche de fond, un ticket à la fois (la boutique s'ouvre ensuite sans attente).
  let i = 0; const warm = () => { if (i >= R.TK.length) return; R.odds(R.TK[i++]); setTimeout(warm, 40); };
  setTimeout(warm, 4000);
}

DT.Tickets = {init, get busy() { return !!(game && !game.done); }, get pending() { return !!(api && api.S.tkCur); }};

})(window.DT);
