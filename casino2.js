/* Dopamine Tycoon : Casino, deuxième salle (Roulette, Blackjack, Vidéo poker, La Tour, Dés). */
window.DT = window.DT || {};
(function (DT) {
'use strict';

const $ = id => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const ri = n => Math.floor(Math.random() * n);
const pick = a => a[ri(a.length)];
const H = () => DT.Casino.H;
const A = () => H().api.A;
const api = () => H().api;
const fmt = n => api().fmt(n);
const fx2 = m => '×' + m.toFixed(2).replace('.', ',');
function sizeCanvas(cv) {
  if (!cv._w || cv._stale) { cv._w = cv.clientWidth; cv._h = cv.clientHeight; cv._stale = false; }
  const dpr = Math.min(2, devicePixelRatio || 1), w = cv._w, h = cv._h;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
  return [c, w, h];
}
function lose(txt) { H().res(txt, ''); A().denied(); api().onChange(); }

/* ---------- Cartes ---------- */
const SUITS = ['♠', '♥', '♦', '♣'], RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const isRed = s => s === '♥' || s === '♦';
const newCard = () => ({r: pick(RANKS), s: pick(SUITS)});
function deck52() {
  const d = [];
  for (const s of SUITS) for (const r of RANKS) d.push({r, s});
  for (let i = d.length - 1; i > 0; i--) { const j = ri(i + 1); [d[i], d[j]] = [d[j], d[i]]; }
  return d;
}
function cardHTML(c, opts = {}) {
  if (opts.hidden) return `<div class="pcard back${opts.deal ? ' deal' : ''}"></div>`;
  const face = ['J', 'Q', 'K'].includes(c.r);
  return `<div class="pcard${isRed(c.s) ? ' red' : ''}${opts.deal ? ' deal' : ''}${opts.cls ? ' ' + opts.cls : ''}" ${opts.attr || ''}>
    <span class="tl">${c.r}<i>${c.s}</i></span><span class="mid${face ? ' face' : ''}">${face ? c.r : c.s}</span><span class="br">${c.r}<i>${c.s}</i></span>${opts.tag ? `<em>${opts.tag}</em>` : ''}</div>`;
}

/* ======================= Roulette ======================= */
const WHEEL = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const numColor = n => n === 0 ? 'green' : REDS.has(n) ? 'red' : 'black';
const STEP = Math.PI * 2 / 37;
const rou = {sel: {type: 'red', label: 'ROUGE'}, spin: null, wRot: 0, ballIdx: null, hist: [], lastTickIdx: -1};
const SEL = {
  red: {label: 'ROUGE', mult: 2, p: 0.7, ok: n => REDS.has(n)},
  black: {label: 'NOIR', mult: 2, p: 0.7, ok: n => n > 0 && !REDS.has(n)},
  even: {label: 'PAIR', mult: 2, p: 0.7, ok: n => n > 0 && n % 2 === 0},
  odd: {label: 'IMPAIR', mult: 2, p: 0.7, ok: n => n % 2 === 1},
  low: {label: '1 À 18', mult: 2, p: 0.7, ok: n => n >= 1 && n <= 18},
  high: {label: '19 À 36', mult: 2, p: 0.7, ok: n => n >= 19},
  dozen: {mult: 3, p: 0.5, ok: (n, d) => n >= 1 + (d - 1) * 12 && n <= d * 12},
  num: {mult: 36, p: 0.12, ok: (n, x) => n === x},
};
const selDef = () => SEL[rou.sel.type];
function rouTable() {
  const cells = [`<button type="button" class="rc green" data-t="num" data-n="0" style="grid-row:1/4;grid-column:1">0</button>`];
  for (let n = 1; n <= 36; n++) {
    const col = Math.floor((n - 1) / 3) + 2, row = 3 - ((n - 1) % 3);
    cells.push(`<button type="button" class="rc ${numColor(n)}" data-t="num" data-n="${n}" style="grid-row:${row};grid-column:${col}">${n}</button>`);
  }
  for (let d = 1; d <= 3; d++) cells.push(`<button type="button" class="rc out" data-t="dozen" data-n="${d}" style="grid-row:4;grid-column:${2 + (d - 1) * 4}/span 4">${d === 1 ? '1re' : d + 'e'} douzaine</button>`);
  [['low', '1-18'], ['even', 'PAIR'], ['red', '<span class="dia red"></span>'], ['black', '<span class="dia black"></span>'], ['odd', 'IMPAIR'], ['high', '19-36']]
    .forEach(([t, l], i) => cells.push(`<button type="button" class="rc out" data-t="${t}" style="grid-row:5;grid-column:${2 + i * 2}/span 2">${l}</button>`));
  $('rouTable').innerHTML = cells.join('');
  rouMark();
}
function rouMark() {
  document.querySelectorAll('#rouTable .rc').forEach(b => {
    const on = b.dataset.t === rou.sel.type && (b.dataset.n === undefined || +b.dataset.n === rou.sel.n);
    b.classList.toggle('sel', on);
  });
  const d = selDef();
  $('rouInfo').innerHTML = `Mise sur <b>${rou.sel.label}</b> · gain ×${d.mult} · ${Math.round(d.p * 100)} % de chances`;
}
function rouPick(b) {
  if (rou.spin) return;
  const t = b.dataset.t, n = b.dataset.n !== undefined ? +b.dataset.n : undefined;
  rou.sel = {type: t, n, label: t === 'num' ? `LE ${n}` : t === 'dozen' ? `${n === 1 ? '1re' : n + 'e'} DOUZAINE` : SEL[t].label};
  rouMark(); A().click();
}
function rouSpin() {
  if (rou.spin) return;
  const bet = H().take(); if (!bet) return;
  const d = selDef(), win = Math.random() < d.p;
  const pool = WHEEL.filter(n => d.ok(n, rou.sel.n) === win);
  const target = pick(pool.length ? pool : WHEEL);
  const idx = WHEEL.indexOf(target);
  const w0 = rou.wRot, w1 = w0 + Math.PI * 2 * 3 + rand(0, Math.PI * 2);
  const targetAbs = w1 + idx * STEP;
  const b0 = rand(0, Math.PI * 2);
  let b1 = targetAbs; while (b1 > b0 - Math.PI * 2 * 5) b1 -= Math.PI * 2;
  rou.spin = {w0, w1, b0, b1, t: 0, dur: 5, target, bet, allIn: H().isAllIn(), win};
  rou.ballIdx = null;
  $('rouResult').className = 'rou-result'; $('rouResult').textContent = '';
  H().res('Les jeux sont faits, rien ne va plus…', '');
  A().chestShake();
}
function rouTick(dt, game) {
  if (rou.spin) {
    const s = rou.spin;
    s.t = Math.min(1, s.t + dt / s.dur);
    const e = 1 - Math.pow(1 - s.t, 3), eb = 1 - Math.pow(1 - s.t, 4);
    rou.wRot = s.w0 + (s.w1 - s.w0) * e;
    s.ballA = s.b0 + (s.b1 - s.b0) * eb;
    const k = s.t < 0.68 ? 0 : Math.min(1, (s.t - 0.68) / 0.22);
    s.ballR = 0.9 - k * 0.17 + (k > 0 && k < 1 ? Math.abs(Math.sin(k * Math.PI * 3)) * 0.04 * (1 - k) : 0);
    const rel = Math.floor(((s.ballA - rou.wRot) % (Math.PI * 2) + Math.PI * 4) / STEP);
    if (rel !== rou.lastTickIdx && s.t > 0.55 && s.t < 0.97) { rou.lastTickIdx = rel; A().wheelTick(); }
    if (s.t >= 1) rouEnd();
  } else if (game === 'roulette') rou.wRot += dt * 0.25;
  if (game === 'roulette') rouDraw();
}
function rouEnd() {
  const s = rou.spin; rou.spin = null;
  rou.ballIdx = WHEEL.indexOf(s.target);
  rou.hist.unshift(s.target); rou.hist.length = Math.min(rou.hist.length, 14);
  $('rouHist').innerHTML = rou.hist.map(n => `<span class="${numColor(n)}">${n}</span>`).join('');
  const r = $('rouResult'); r.textContent = s.target; r.className = `rou-result show ${numColor(s.target)}`;
  A().slam(0);
  if (s.win) {
    if (rou.sel.type === 'num') api().S.rouNum = (api().S.rouNum || 0) + 1;
    H().payout(s.bet, selDef().mult, `Roulette (${s.target})`, s.allIn);
  } else lose(`Le ${s.target} ${numColor(s.target) === 'red' ? 'rouge' : numColor(s.target) === 'black' ? 'noir' : 'vert'} sort. Perdu !`);
}
let rouFace = null, rouRim = null, rouKey = '';
function rouLayer(size, dpr, fn) {
  const cv = document.createElement('canvas'); cv.width = cv.height = Math.ceil(size * dpr);
  const c = cv.getContext('2d'); c.scale(dpr, dpr); fn(c); return cv;
}
function rouBuild(w, h) {
  const dpr = Math.min(2, devicePixelRatio || 1), size = Math.min(w, h), R = size / 2 - 6, cx = size / 2, cy = size / 2;
  // jante fixe
  rouRim = rouLayer(size, dpr, c => {
    const rim = c.createRadialGradient(cx, cy, R * 0.8, cx, cy, R);
    rim.addColorStop(0, '#3A1A08'); rim.addColorStop(0.5, '#8B4A1C'); rim.addColorStop(1, '#4A220C');
    c.fillStyle = rim; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.fill();
    c.strokeStyle = '#E6B84A'; c.lineWidth = 3; c.beginPath(); c.arc(cx, cy, R - 1.5, 0, 7); c.stroke();
    const tr = c.createRadialGradient(cx, cy, R * 0.84, cx, cy, R * 0.95);
    tr.addColorStop(0, '#2A1206'); tr.addColorStop(1, '#6B3A1A');
    c.fillStyle = tr; c.beginPath(); c.arc(cx, cy, R * 0.95, 0, 7); c.arc(cx, cy, R * 0.84, 0, 7, true); c.fill();
  });
  // plateau qui tourne : cases, numéros, cône et tourelle
  rouFace = rouLayer(size, dpr, c => {
    for (let i = 0; i < 37; i++) {
      const a0 = (i - 0.5) * STEP, a1 = a0 + STEP, n = WHEEL[i];
      c.beginPath(); c.arc(cx, cy, R * 0.84, a0, a1); c.arc(cx, cy, R * 0.6, a1, a0, true); c.closePath();
      c.fillStyle = n === 0 ? '#1E9E57' : REDS.has(n) ? '#C8102E' : '#16161C'; c.fill();
      c.strokeStyle = '#E6B84A'; c.lineWidth = 1.2; c.stroke();
      const am = i * STEP;
      c.save(); c.translate(cx + Math.cos(am) * R * 0.76, cy + Math.sin(am) * R * 0.76); c.rotate(am + Math.PI / 2);
      c.fillStyle = '#fff'; c.font = `700 ${Math.max(8, R * 0.075)}px ${api().mono}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(n, 0, 0); c.restore();
    }
    c.strokeStyle = '#E6B84A'; c.lineWidth = 2;
    c.beginPath(); c.arc(cx, cy, R * 0.6, 0, 7); c.stroke();
    const cone = c.createRadialGradient(cx - R * 0.1, cy - R * 0.1, 2, cx, cy, R * 0.6);
    cone.addColorStop(0, '#8B4A1C'); cone.addColorStop(1, '#2C1408');
    c.fillStyle = cone; c.beginPath(); c.arc(cx, cy, R * 0.58, 0, 7); c.fill();
    c.save(); c.translate(cx, cy);
    c.strokeStyle = '#E6B84A'; c.lineWidth = Math.max(3, R * 0.03); c.lineCap = 'round';
    for (let k = 0; k < 4; k++) {
      c.rotate(Math.PI / 2);
      c.beginPath(); c.moveTo(0, 0); c.lineTo(R * 0.36, 0); c.stroke();
      c.fillStyle = '#FFD86B'; c.beginPath(); c.arc(R * 0.38, 0, R * 0.04, 0, 7); c.fill();
    }
    c.restore();
  });
}
function rouDraw() {
  const [c, w, h] = sizeCanvas($('rouCv'));
  if (!w) return;
  const key = w + 'x' + h;
  if (rouKey !== key) { rouBuild(w, h); rouKey = key; DT.bitmap(rouRim, b => { rouRim = b; }); DT.bitmap(rouFace, b => { rouFace = b; }); }
  const size = Math.min(w, h), R = size / 2 - 6, cx = w / 2, cy = h / 2, ox = cx - size / 2, oy = cy - size / 2;
  c.clearRect(0, 0, w, h);
  c.drawImage(rouRim, ox, oy, size, size);
  c.save(); c.translate(cx, cy); c.rotate(rou.wRot); c.drawImage(rouFace, -size / 2, -size / 2, size, size); c.restore();
  const dome = c.createRadialGradient(cx - R * 0.04, cy - R * 0.04, 1, cx, cy, R * 0.12);
  dome.addColorStop(0, '#FFF3B0'); dome.addColorStop(1, '#C8912A');
  c.fillStyle = dome; c.beginPath(); c.arc(cx, cy, R * 0.11, 0, 7); c.fill();
  // bille
  let ba = null, br = null;
  if (rou.spin) { ba = rou.spin.ballA; br = rou.spin.ballR; }
  else if (rou.ballIdx !== null) { ba = rou.wRot + rou.ballIdx * STEP; br = 0.73; }
  if (ba !== null) {
    const bx = cx + Math.cos(ba) * R * br, by = cy + Math.sin(ba) * R * br, rr = Math.max(4, R * 0.04);
    c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.arc(bx + 2, by + 2, rr, 0, 7); c.fill();
    const bg = c.createRadialGradient(bx - rr * 0.3, by - rr * 0.3, 1, bx, by, rr);
    bg.addColorStop(0, '#FFFFFF'); bg.addColorStop(1, '#C9D2DE');
    c.fillStyle = bg; c.beginPath(); c.arc(bx, by, rr, 0, 7); c.fill();
  }
}

/* ======================= Blackjack ======================= */
const bj = {phase: 'idle', p: [], d: [], bet: 0, allIn: false, shownP: 0, shownD: 0};
const val = r => r === 'A' ? 11 : ['J', 'Q', 'K'].includes(r) ? 10 : +r;
function total(h) { let t = 0, a = 0; for (const c of h) { t += val(c.r); if (c.r === 'A') a++; } while (t > 21 && a) { t -= 10; a--; } return t; }
const natural = h => h.length === 2 && total(h) === 21;
function bjRender() {
  const hideHole = bj.phase === 'play';
  $('bjDealer').innerHTML = bj.d.map((c, i) => cardHTML(c, {hidden: hideHole && i === 1, deal: i >= bj.shownD})).join('');
  $('bjPlayer').innerHTML = bj.p.map((c, i) => cardHTML(c, {deal: i >= bj.shownP})).join('');
  bj.shownD = bj.d.length; bj.shownP = bj.p.length;
  $('bjDT').textContent = bj.d.length ? (hideHole ? val(bj.d[0].r) : total(bj.d)) : '';
  $('bjPT').textContent = bj.p.length ? total(bj.p) : '';
  const play = bj.phase === 'play';
  $('bjDeal').hidden = play || bj.phase === 'dealer';
  $('bjDeal').textContent = `DISTRIBUER · ${fmt(H().betAmt())} nmol`;
  for (const id of ['bjHit', 'bjStand', 'bjDouble']) $(id).hidden = !play;
  $('bjDouble').disabled = !(play && bj.p.length === 2 && api().S.bank >= bj.bet);
}
function bjDeal() {
  if (bj.phase === 'play' || bj.phase === 'dealer') return;
  const bet = H().take(); if (!bet) return;
  Object.assign(bj, {phase: 'play', p: [newCard(), newCard()], d: [newCard(), newCard()], bet, allIn: H().isAllIn(), shownP: 0, shownD: 0});
  if (natural(bj.d) && Math.random() < 0.5) bj.d[1] = newCard();
  A().pop(); H().res('', '');
  if (natural(bj.p)) {
    bj.phase = 'done'; bjRender();
    if (natural(bj.d)) { api().gain(bj.bet); H().res('Blackjack des deux côtés : égalité, mise rendue.', ''); }
    else { api().S.bjNat = (api().S.bjNat || 0) + 1; H().payout(bj.bet, 2.5, 'BLACKJACK !', bj.allIn); }
    return;
  }
  bjRender();
}
function bjHit() {
  if (bj.phase !== 'play') return;
  let c = newCard();
  if (total([...bj.p, c]) > 21 && Math.random() < 0.55) c = newCard();
  bj.p.push(c); A().pop();
  const t = total(bj.p);
  if (t > 21) { bj.phase = 'done'; bjRender(); lose(`Tu dépasses avec ${t}. Perdu !`); return; }
  bjRender();
  if (t === 21) bjStand();
}
function bjDouble() {
  if (bj.phase !== 'play' || bj.p.length !== 2 || api().S.bank < bj.bet) return;
  api().spend(bj.bet); bj.bet *= 2; A().click();
  bjHit();
  if (bj.phase === 'play') bjStand();
}
function bjStand() {
  if (bj.phase !== 'play') return;
  bj.phase = 'dealer'; bjRender(); A().wheelTick();
  const pt = total(bj.p);
  const step = () => {
    if (total(bj.d) < 17) {
      let c = newCard();
      const t2 = total([...bj.d, c]);
      if (t2 >= 17 && t2 <= 21 && t2 > pt && Math.random() < 0.5) c = newCard();
      bj.d.push(c); A().pop(); bjRender();
      setTimeout(step, 550);
      return;
    }
    const dt = total(bj.d);
    bj.phase = 'done'; bjRender();
    if (dt > 21) H().payout(bj.bet, 2, `Le croupier saute (${dt})`, bj.allIn);
    else if (pt > dt) H().payout(bj.bet, 2, `${pt} contre ${dt}`, bj.allIn);
    else if (pt === dt) { api().gain(bj.bet); H().res(`Égalité à ${pt} : mise rendue.`, ''); A().click(); api().onChange(); }
    else lose(`${pt} contre ${dt} pour le croupier. Perdu !`);
  };
  setTimeout(step, 500);
}

/* ======================= Vidéo poker ======================= */
const PAY = [
  {id: 'royal', name: 'Quinte flush royale', mult: 250}, {id: 'sf', name: 'Quinte flush', mult: 50},
  {id: 'quads', name: 'Carré', mult: 25}, {id: 'full', name: 'Full', mult: 9}, {id: 'flush', name: 'Couleur', mult: 6},
  {id: 'straight', name: 'Quinte', mult: 4}, {id: 'trips', name: 'Brelan', mult: 3}, {id: 'two', name: 'Double paire', mult: 2},
  {id: 'jacks', name: 'Paire de valets ou mieux', mult: 1},
];
const payOf = id => PAY.find(p => p.id === id);
function evalHand(h) {
  const v = h.map(c => RANKS.indexOf(c.r) + 2).sort((a, b) => a - b);
  const flush = h.every(c => c.s === h[0].s);
  const uniq = [...new Set(v)];
  const straight = uniq.length === 5 && (v[4] - v[0] === 4 || v.join() === '2,3,4,5,14');
  const cnt = {}; v.forEach(x => { cnt[x] = (cnt[x] || 0) + 1; });
  const counts = Object.values(cnt).sort((a, b) => b - a);
  if (straight && flush && v[0] === 10) return payOf('royal');
  if (straight && flush) return payOf('sf');
  if (counts[0] === 4) return payOf('quads');
  if (counts[0] === 3 && counts[1] === 2) return payOf('full');
  if (flush) return payOf('flush');
  if (straight) return payOf('straight');
  if (counts[0] === 3) return payOf('trips');
  if (counts[0] === 2 && counts[1] === 2) return payOf('two');
  if (counts[0] === 2) { const pr = +Object.keys(cnt).find(k => cnt[k] === 2); if (pr >= 11) return payOf('jacks'); }
  return null;
}
const pk = {phase: 'idle', hand: [], held: [false, false, false, false, false], deck: [], bet: 0, allIn: false, fresh: [], hit: null};
function pkRender() {
  $('pkHand').innerHTML = pk.hand.length
    ? pk.hand.map((c, i) => cardHTML(c, {deal: pk.fresh.includes(i), cls: pk.held[i] ? 'held' : '', tag: pk.held[i] ? 'GARDÉE' : '', attr: `data-i="${i}"`})).join('')
    : Array.from({length: 5}, () => cardHTML(null, {hidden: true})).join('');
  pk.fresh = [];
  $('pkPay').innerHTML = PAY.map(p => `<tr class="${pk.hit && pk.hit.id === p.id ? 'hit' : ''}"><td>${p.name}</td><td>×${p.mult}</td></tr>`).join('');
  const b = $('pkBtn');
  b.textContent = pk.phase === 'hold' ? 'TIRER' : `DISTRIBUER · ${fmt(H().betAmt())} nmol`;
  $('pkHint').textContent = pk.phase === 'hold' ? 'Clique sur les cartes à garder, puis TIRER.' : 'Paire de valets ou mieux pour gagner.';
}
function pkBtn() {
  if (pk.phase === 'hold') { pkDraw(); return; }
  const bet = H().take(); if (!bet) return;
  pk.bet = bet; pk.allIn = H().isAllIn(); pk.hit = null;
  pk.deck = deck52(); pk.hand = pk.deck.splice(0, 5);
  if (!evalHand(pk.hand) && Math.random() < 0.3) { pk.deck = deck52(); pk.hand = pk.deck.splice(0, 5); }
  pk.held = [false, false, false, false, false]; pk.fresh = [0, 1, 2, 3, 4];
  pk.phase = 'hold'; A().pop(); H().res('', '');
  // garde automatiquement les paires et mieux pour aider
  const e = evalHand(pk.hand);
  if (e) { const v = pk.hand.map(c => c.r); pk.held = v.map(r => v.filter(x => x === r).length >= 2 || ['straight', 'flush', 'full', 'sf', 'royal'].includes(e.id)); }
  pkRender();
}
function pkDraw() {
  const keep = pk.hand.slice(), deck = pk.deck.slice();
  const drawOnce = d => pk.hand.map((c, i) => pk.held[i] ? c : d.shift());
  let h = drawOnce(deck);
  if (!evalHand(h) && Math.random() < 0.45) { const d2 = pk.deck.slice().sort(() => Math.random() - 0.5); h = keep.map((c, i) => pk.held[i] ? c : d2.shift()); }
  pk.fresh = pk.held.map((x, i) => x ? -1 : i).filter(i => i >= 0);
  pk.hand = h; pk.phase = 'idle';
  const e = evalHand(h); pk.hit = e;
  pkRender(); A().pop();
  if (e) {
    if (e.id === 'royal') api().S.pokerRoyal = (api().S.pokerRoyal || 0) + 1;
    H().payout(pk.bet, e.mult, e.name, pk.allIn);
  } else lose('Rien du tout. Perdu !');
}

/* ======================= La Tour ======================= */
const FLOORS = 10;
const towerMult = k => k >= FLOORS ? Math.pow(1.25, FLOORS) * 1.5 : Math.pow(1.25, k);
const tw = {phase: 'idle', floor: 0, picks: [], bombs: [], bet: 0, allIn: false};
function twRender() {
  const box = $('twRows');
  box.innerHTML = Array.from({length: FLOORS}, (_, f) => {
    const cur = tw.phase === 'play' && f === tw.floor, past = f < tw.floor || (tw.phase === 'lost' && f === tw.floor);
    const tiles = [0, 1, 2].map(t => {
      let cls = 'tw', inner = '';
      if (past || (tw.phase === 'lost' && f === tw.floor)) {
        if (tw.bombs[f] === t) { cls += ' bomb'; inner = '<span class="bomb-ic"></span>'; }
        else if (tw.picks[f] === t) { cls += ' gem'; inner = DT.cardArt(tw.art[f] || 'wave'); }
        else cls += ' dim';
      }
      if (cur) cls += ' live';
      return `<button type="button" class="${cls}" data-f="${f}" data-t="${t}" ${cur ? '' : 'disabled'}>${inner}</button>`;
    }).join('');
    return `<div class="tw-row${cur ? ' cur' : ''}${f < tw.floor && tw.phase !== 'idle' ? ' done' : ''}"><span class="tw-m">${fx2(towerMult(f + 1))}</span>${tiles}</div>`;
  }).join('');
  const b = $('twBtn');
  if (tw.phase === 'play') { b.textContent = tw.floor ? `ENCAISSER ${fx2(towerMult(tw.floor))} · +${fmt(tw.bet * towerMult(tw.floor))}` : 'Choisis une case au 1er étage…'; b.disabled = !tw.floor; }
  else { b.textContent = `GRIMPER · ${fmt(H().betAmt())} nmol`; b.disabled = false; }
}
function twBtn() {
  if (tw.phase === 'play') { twCash(); return; }
  const bet = H().take(); if (!bet) return;
  const owned = Object.keys(api().S.cards || {});
  Object.assign(tw, {phase: 'play', floor: 0, picks: [], bombs: [], bet, allIn: H().isAllIn(), art: Array.from({length: FLOORS}, () => owned.length ? pick(owned) : pick(['wave', 'moon', 'chad']))});
  H().res('Une bombe se cache à chaque étage. 80 % de chances de passer.', '');
  A().click(); twRender();
}
function twClick(f, t) {
  if (tw.phase !== 'play' || f !== tw.floor) return;
  const boom = Math.random() < 0.2;
  tw.picks[f] = t;
  tw.bombs[f] = boom ? t : pick([0, 1, 2].filter(x => x !== t));
  if (boom) {
    tw.phase = 'lost'; twRender();
    A().bossKill(); api().shake($('twRows'));
    lose(`BOUM à l'étage ${f + 1} ! La tour garde ta mise.`);
    return;
  }
  tw.floor++;
  A().tap(Math.min(19, tw.floor * 2));
  if (tw.floor >= FLOORS) { api().S.towerTop = (api().S.towerTop || 0) + 1; twCash(); return; }
  twRender();
}
function twCash() {
  if (tw.phase !== 'play' || !tw.floor) return;
  const m = towerMult(tw.floor);
  tw.phase = 'won'; twRender();
  H().payout(tw.bet, m, tw.floor >= FLOORS ? 'SOMMET DE LA TOUR' : `La Tour, étage ${tw.floor}`, tw.allIn);
}

/* ======================= Dés ======================= */
const dice = {target: 70, rolling: false, auto: 0};
const diceMult = () => Math.floor(99 / dice.target * 100) / 100;
function diceInfo() {
  $('diceInfo').innerHTML = `Gagne si le dé fait <b>moins de ${dice.target}</b> · ${dice.target} % de chances · gain <b>${fx2(diceMult())}</b>`;
  $('diceBar').style.setProperty('--t', dice.target + '%');
  $('diceBtn').textContent = dice.rolling ? 'Ça roule…' : `LANCER · ${fmt(H().betAmt())} nmol`;
  $('diceAuto').textContent = dice.auto ? `STOP (${dice.auto})` : 'AUTO ×10';
  $('diceBtn').disabled = dice.rolling;
}
function diceRoll() {
  if (dice.rolling) return;
  const bet = H().take(); if (!bet) { dice.auto = 0; diceInfo(); return; }
  dice.rolling = true; diceInfo();
  const allIn = H().isAllIn();
  const final = Math.floor(Math.random() * 10000) / 100;
  let n = 0;
  const num = $('diceNum');
  num.className = 'dice-num rolling';
  const iv = setInterval(() => {
    num.textContent = (Math.random() * 100).toFixed(2).replace('.', ',');
    if (++n % 2) A().wheelTick();
    if (n >= 12) {
      clearInterval(iv);
      num.textContent = final.toFixed(2).replace('.', ',');
      $('diceMark').style.left = final + '%';
      const win = final < dice.target;
      num.className = 'dice-num ' + (win ? 'win' : 'lose');
      dice.rolling = false;
      if (win) H().payout(bet, diceMult(), `Dé ${final.toFixed(2).replace('.', ',')}`, allIn);
      else lose(`Le dé fait ${final.toFixed(2).replace('.', ',')}. Perdu !`);
      if (dice.auto > 0) { dice.auto--; if (dice.auto > 0) setTimeout(diceRoll, 380); }
      diceInfo();
    }
  }, 45);
}

/* ======================= Plus ou Moins ======================= */
// Une carte est retournée : la suivante sera-t-elle plus haute ou plus basse ? Égalité = perdu.
// Le gain de chaque bonne réponse dépend de la probabilité (95 % de retour en moyenne). Encaisse quand tu veux.
const RV = r => RANKS.indexOf(r) + 2;  // 2 … 14 (As)
const hl = {phase: 'idle', card: null, pot: 0, bet: 0, streak: 0, allIn: false, hist: []};
const hlP = dir => { const v = RV(hl.card.r); return (dir > 0 ? 14 - v : v - 2) / 13; };
const hlMult = dir => { const p = hlP(dir); return p <= 0 ? 0 : Math.max(1.05, Math.floor(0.95 / p * 100) / 100); };
function hlRender() {
  const play = hl.phase === 'play';
  $('hlCard').innerHTML = cardHTML(hl.card, {hidden: !hl.card, deal: true});
  $('hlHist').innerHTML = hl.hist.slice(-8).map(c => cardHTML(c)).join('');
  for (const [id, dir, lab] of [['hlUp', 1, '▲ PLUS HAUT'], ['hlDown', -1, '▼ PLUS BAS']]) {
    const m = play ? hlMult(dir) : 0, b = $(id);
    b.hidden = !play; b.disabled = !m;
    b.innerHTML = m ? `${lab}<small>×${m.toFixed(2).replace('.', ',')} · ${Math.round(hlP(dir) * 100)} %</small>` : `${lab}<small>impossible</small>`;
  }
  const b = $('hlBtn');
  b.textContent = play ? (hl.streak ? `ENCAISSER ${fmt(hl.pot)} nmol` : 'Plus haut ou plus bas ?') : `JOUER · ${fmt(H().betAmt())} nmol`;
  b.disabled = play && !hl.streak;
  $('hlInfo').textContent = play ? `Série : ${hl.streak} · pot ${fmt(hl.pot)} nmol` : 'Devine si la carte suivante sera plus haute ou plus basse. Égalité = perdu.';
}
function hlBtn() {
  if (hl.phase === 'play') { hlCash(); return; }
  const bet = H().take(); if (!bet) return;
  Object.assign(hl, {phase: 'play', card: newCard(), pot: bet, bet, streak: 0, allIn: H().isAllIn(), hist: []});
  A().pop(); H().res('', ''); hlRender();
}
function hlGuess(dir) {
  if (hl.phase !== 'play' || !hlMult(dir)) return;
  const m = hlMult(dir), next = newCard(), a = RV(hl.card.r), b = RV(next.r);
  hl.hist.push(hl.card); hl.card = next;
  if (dir > 0 ? b > a : b < a) {
    hl.pot *= m; hl.streak++;
    const S = api().S; S.hiloBest = Math.max(S.hiloBest || 0, hl.streak);
    A().tap(Math.min(19, hl.streak * 3)); H().res(`Bien vu ! ${next.r}${next.s} · série de ${hl.streak}`, 'good');
    if (hl.streak >= 5) api().flash('#5FE0B7');
    hlRender();
  } else {
    hl.phase = 'lost'; hlRender();
    A().bossKill(); api().shake($('hlCard'));
    lose(`${next.r}${next.s}… ${a === b ? 'égalité' : 'raté'} ! Le pot de ${fmt(hl.pot)} nmol est perdu.`);
  }
}
function hlCash() {
  if (hl.phase !== 'play' || !hl.streak) return;
  hl.phase = 'won';
  H().payout(hl.bet, hl.pot / hl.bet, `Plus ou Moins, série de ${hl.streak}`, hl.allIn);
  hlRender();
}

/* ======================= Enregistrement dans le casino ======================= */
DT.Casino.register('hilo', {
  init() {
    $('hlBtn').addEventListener('click', hlBtn);
    $('hlUp').addEventListener('click', () => hlGuess(1));
    $('hlDown').addEventListener('click', () => hlGuess(-1));
    hlRender();
  },
  show: hlRender,
  tick(dt, game) { if (game === 'hilo' && hl.phase !== 'play') DT.setText($('hlBtn'), `JOUER · ${fmt(H().betAmt())} nmol`); },
  busy: () => hl.phase === 'play',
});
DT.Casino.register('roulette', {
  init() {
    rouTable();
    $('rouTable').addEventListener('click', e => { const b = e.target.closest('.rc'); if (b) rouPick(b); });
    $('rouBtn').addEventListener('click', rouSpin);
  },
  show() { rouMark(); $('rouBtn').textContent = `LANCER LA BILLE · ${fmt(H().betAmt())} nmol`; },
  tick(dt, game) { rouTick(dt, game); if (game === 'roulette' && !rou.spin) DT.setText($('rouBtn'), `LANCER LA BILLE · ${fmt(H().betAmt())} nmol`); DT.setDisabled($('rouBtn'), !!rou.spin); },
  busy: () => !!rou.spin,
});
DT.Casino.register('blackjack', {
  init() {
    $('bjDeal').addEventListener('click', bjDeal); $('bjHit').addEventListener('click', bjHit);
    $('bjStand').addEventListener('click', bjStand); $('bjDouble').addEventListener('click', bjDouble);
    bjRender();
  },
  show: bjRender,
  tick(dt, game) { if (game === 'blackjack' && (bj.phase === 'idle' || bj.phase === 'done')) DT.setText($('bjDeal'), `DISTRIBUER · ${fmt(H().betAmt())} nmol`); },
  busy: () => bj.phase === 'play' || bj.phase === 'dealer',
});
DT.Casino.register('poker', {
  init() {
    $('pkBtn').addEventListener('click', pkBtn);
    $('pkHand').addEventListener('click', e => { const c = e.target.closest('.pcard'); if (!c || pk.phase !== 'hold') return; const i = +c.dataset.i; pk.held[i] = !pk.held[i]; A().click(); pkRender(); });
    pkRender();
  },
  show: pkRender,
  tick(dt, game) { if (game === 'poker' && pk.phase !== 'hold') DT.setText($('pkBtn'), `DISTRIBUER · ${fmt(H().betAmt())} nmol`); },
  busy: () => pk.phase === 'hold',
});
DT.Casino.register('tower', {
  init() {
    $('twBtn').addEventListener('click', twBtn);
    $('twRows').addEventListener('click', e => { const b = e.target.closest('.tw'); if (b) twClick(+b.dataset.f, +b.dataset.t); });
    twRender();
  },
  show: twRender,
  tick(dt, game) { if (game === 'tower' && tw.phase !== 'play') DT.setText($('twBtn'), `GRIMPER · ${fmt(H().betAmt())} nmol`); },
  busy: () => tw.phase === 'play',
});
DT.Casino.register('dice', {
  init() {
    $('diceT').addEventListener('input', e => { dice.target = +e.target.value; diceInfo(); });
    $('diceBtn').addEventListener('click', diceRoll);
    $('diceAuto').addEventListener('click', () => { if (dice.auto) { dice.auto = 0; diceInfo(); return; } dice.auto = 10; if (!dice.rolling) diceRoll(); });
    diceInfo();
  },
  show: diceInfo,
  tick(dt, game) { if (game === 'dice' && !dice.rolling) diceInfo(); },
  busy: () => dice.rolling || dice.auto > 0,
});

})(window.DT);
