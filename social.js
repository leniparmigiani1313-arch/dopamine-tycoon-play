/* Dopamine Tycoon : saisons de classement, défi du jour, événements du week-end (boss mondial), clans et profils.
 *
 * Pas de serveur : tout se déduit de l'heure officielle (DT.now, calée sur ntfy) et des scores publiés.
 *  - Saison : une par semaine (lundi 0 h UTC). Points de saison = XP gagnée pendant la semaine (taps, objets, quêtes…),
 *    donc juste entre débutants et anciens. Le podium reçoit médaille et coffre au changement de saison.
 *  - Défi du jour : le même pour tout le monde (tiré de la date), avec son classement du jour.
 *  - Week-end (vendredi 17 h UTC → lundi 0 h UTC) : production ×2 ou pluie de coffres, et un boss mondial dont les
 *    points de vie baissent avec les coups de tous les joueurs (somme des dégâts publiés).
 *  - Clans : un nom choisi librement ; le score d'un clan = la somme des points de saison de ses membres.
 * Les classements de fin de jour et de saison sont calculés par chaque joueur à partir de ce qu'il a vu (instantané
 * gardé dans localStorage), ce qui suffit entre potes et reste cohérent à grande échelle. */
window.DT = window.DT || {};
(function (DT) {
'use strict';

const $ = id => document.getElementById(id);
const DAY = 864e5, HOUR = 36e5, SEASON0 = 2961;
let api = null;

const now = () => DT.now();
const dayId = (t = now()) => Math.floor(t / DAY);
const weekId = (t = now()) => Math.floor((dayId(t) + 3) / 7);
const weekStart = w => (w * 7 - 3) * DAY;
const seasonNum = w => w - SEASON0;
function hash(n) { let x = Math.imul(n | 0, 2654435761) ^ 0x5bd1e995; x = Math.imul(x ^ (x >>> 15), 2246822519); return (x ^ (x >>> 13)) >>> 0; }
function left(ms) {
  const s = Math.max(0, Math.floor(ms / 1000)), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
  return d ? `${d} j ${h} h` : h ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`;
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

/* ---------- Défi du jour ---------- */
const DC = [
  {id: 'taps',   txt: 'Fais 3 000 taps',                c: 'totClicks',    n: 3000, u: 'taps'},
  {id: 'crush',  txt: 'Écrase 150 objets sous la presse', c: 'crushed',    n: 150,  u: 'objets'},
  {id: 'boss',   txt: 'Terrasse 3 boss',                c: 'bosses',       n: 3,    u: 'boss'},
  {id: 'combo',  txt: 'Fais un combo de 120',           c: 'combo',        n: 120,  u: 'combo'},
  {id: 'chest',  txt: 'Ouvre 6 coffres',                c: 'chestsOpened', n: 6,    u: 'coffres'},
  {id: 'casino', txt: 'Joue 25 parties de casino',      c: 'casinoPlays',  n: 25,   u: 'parties'},
  {id: 'gold',   txt: 'Attrape 4 notifications dorées', c: 'goldClicks',   n: 4,    u: 'dorées'},
  {id: 'mega',   txt: 'Déclenche 3 Méga-Presses',       c: 'megas',        n: 3,    u: 'Méga-Presses'},
  {id: 'popit',  txt: 'Termine 10 pop-it',              c: 'popits',       n: 10,   u: 'pop-it'},
];
const dcOf = d => DC[hash(d * 7 + 3) % DC.length];
const COUNTERS = [...new Set(DC.map(d => d.c).filter(c => c !== 'combo'))];

/* ---------- Week-end ---------- */
function weekend(t = now()) {
  const d = dayId(t), dow = (d + 4) % 7, h = Math.floor((t % DAY) / HOUR);
  const on = (dow === 5 && h >= 17) || dow === 6 || dow === 0;
  const w = weekId(t), type = w % 2 ? 'x2' : 'chests';
  const startT = weekStart(w) + 4 * DAY + 17 * HOUR, endT = weekStart(w + 1);
  return {on, w, type, startT, endT, nextT: on ? endT : (t < startT ? startT : weekStart(w + 1) + 4 * DAY + 17 * HOUR)};
}
const EV = {
  x2: {title: 'WEEK-END ×2', desc: 'Production ×2 tout le week-end, et un boss mondial à abattre tous ensemble.'},
  chests: {title: 'PLUIE DE COFFRES', desc: 'Un coffre doré toutes les 8 minutes de jeu, production ×1,25, et un boss mondial à abattre tous ensemble.'},
};
const WB_CAP = 150000, WB_MIN = 50, WB_HP = 15000;  // points de vie du boss par joueur qui participe
const TIERS = [[0.25, 'wood'], [0.5, 'gold'], [0.75, 'magic'], [1, 'legend']];

/* ---------- État ---------- */
function st() {
  const S = api.S;
  if (!S.season || typeof S.season !== 'object') S.season = {id: 0, pts: 0};
  if (!S.medals || typeof S.medals !== 'object') S.medals = {g: 0, s: 0, b: 0};
  if (!S.dc || typeof S.dc !== 'object') S.dc = {id: 0, base: {}, combo: 0, done: false};
  if (!S.wb || typeof S.wb !== 'object') S.wb = {id: 0, dmg: 0, tiers: [], last: 0, ann: 0};
  if (!S.clan || typeof S.clan !== 'object') S.clan = {name: '', at: 0};
  return S;
}
const ok = () => DT.clock.trusted && api && api.inGame();
const life = pct => { const v = (1 - pct) * 100; return v > 99 && v < 100 ? v.toFixed(1).replace('.', ',') : String(Math.round(v)); };
function dcValue() {
  const S = st(), d = dcOf(S.dc.id);
  if (d.c === 'combo') return S.dc.combo || 0;
  return Math.max(0, (S[d.c] || 0) - (S.dc.base[d.c] || 0));
}
const curSeasonPts = () => { const S = st(); return S.season.id === weekId() ? S.season.pts : 0; };

/* Instantanés des classements du jour et de la saison (ce que ce joueur a vu), pour les récompenses de fin. */
let snap = null;
function snapKey() { return 'dt-snap-' + (api.me() ? api.me().key : '-'); }
function loadSnap() { snap = DT.LS.get(snapKey()) || {}; if (!snap.day) snap.day = {id: 0, v: {}}; if (!snap.season) snap.season = {id: 0, v: {}}; }
let snapDirty = false;
function saveSnap() { if (snapDirty) { snapDirty = false; DT.LS.set(snapKey(), snap); } }

function rankIn(v, myKey) {
  // simple comptage (pas de tri) : appelé deux fois par seconde avec des milliers de joueurs
  const sus = api.suspects(), mine = v[myKey] || 0;
  let n = 0, above = 0;
  for (const k in v) { const x = v[k]; if (!(x > 0) || sus[k]) continue; n++; if (x > mine) above++; }
  return {rank: mine > 0 ? above + 1 : 0, n};
}

/* ---------- Changements de jour, de saison, de week-end ---------- */
function rollover() {
  const S = st(), me = api.me();
  if (!me) return;
  const d = dayId(), w = weekId();
  // jour
  if (S.dc.id !== d) {
    if (S.dc.id && snap.day.id === S.dc.id && S.dcRew !== S.dc.id) {
      snap.day.v[me.key] = dcValue();
      const {rank, n} = rankIn(snap.day.v, me.key);
      S.dcRew = S.dc.id;
      if (rank && n >= 2 && rank <= 3) {
        const chest = rank === 1 ? 'magic' : 'gold';
        api.give(chest, `défi du jour : ${rank === 1 ? '1er' : rank + 'e'} sur ${n}`);
        api.banner('DÉFI DU JOUR', rank === 1 ? 'NUMÉRO 1 !' : `${rank}e PLACE`, `Hier, tu as fini ${rank === 1 ? '1er' : rank + 'e'} sur ${n} joueurs.`);
        api.addFeed(`Défi d'hier : tu finis <b>${rank === 1 ? '1er' : rank + 'e'}</b> sur ${n}.`);
      }
    }
    S.dc = {id: d, base: Object.fromEntries(COUNTERS.map(c => [c, S[c] || 0])), combo: 0, done: false};
    snap.day = {id: d, v: {}}; snapDirty = true;
  }
  // saison
  if (S.season.id !== w) {
    if (S.season.id && snap.season.id === S.season.id && S.seasonDone !== S.season.id && S.season.pts > 0) {
      snap.season.v[me.key] = S.season.pts;
      const {rank, n} = rankIn(snap.season.v, me.key);
      S.seasonDone = S.season.id;
      const num = seasonNum(S.season.id);
      if (rank && n >= 2) {
        let chest = 'wood', title = `${rank}e sur ${n}`;
        if (rank === 1) { chest = 'legend'; S.medals.g++; title = 'CHAMPION 🥇'; }
        else if (rank === 2) { chest = 'magic'; S.medals.s++; title = '2e PLACE 🥈'; }
        else if (rank === 3) { chest = 'magic'; S.medals.b++; title = '3e PLACE 🥉'; }
        else if (rank <= 10) chest = 'gold';
        api.give(chest, `saison ${num} : ${rank === 1 ? '1er' : rank + 'e'} sur ${n}`);
        api.banner(`SAISON ${num} TERMINÉE`, title, `Tu finis ${rank === 1 ? '1er' : rank + 'e'} sur ${n} joueurs avec ${api.fmt(S.season.pts)} points.`);
        if (rank <= 3) { api.confetti(innerWidth / 2, innerHeight * 0.35, 180); api.flash('#FFD23F'); }
        api.addFeed(`Saison ${num} terminée : <b>${rank === 1 ? '1er' : rank + 'e'}</b> sur ${n}.`);
      }
    }
    S.season = {id: w, pts: 0};
    snap.season = {id: w, v: {}}; snapDirty = true;
    api.toast(`<b>Saison ${seasonNum(w)}</b> : nouveau classement de la semaine ! Chaque XP gagnée compte.`, 'mint');
  }
  // week-end
  const ev = weekend();
  if (ev.on && S.wb.id !== ev.w) S.wb = {id: ev.w, dmg: 0, tiers: [], last: 0, ann: 0};
  if (ev.on && S.wb.ann !== ev.w) {
    S.wb.ann = ev.w;
    api.banner('ÉVÉNEMENT', EV[ev.type].title, EV[ev.type].desc);
    api.flash('#FF9F1C'); api.confetti(innerWidth / 2, innerHeight * 0.3, 120); api.A.jackpot();
    api.addFeed(`Événement du week-end : <b>${EV[ev.type].title}</b>.`);
  }
  saveSnap();
}

/* ---------- Gains et coups ---------- */
function xp(n) {
  if (!ok()) return;
  const S = st();
  if (S.season.id === weekId()) S.season.pts += n;
}
function hit(n) {
  if (!ok()) return;
  const ev = weekend();
  if (!ev.on) return;
  const S = st();
  if (S.wb.id !== ev.w) return;
  S.wb.dmg = Math.min(WB_CAP, S.wb.dmg + n);
}
function tap(combo) {
  if (!ok()) return;
  const S = st();
  if (S.dc.id === dayId() && combo > (S.dc.combo || 0)) S.dc.combo = combo;
  hit(1);
}
function mult() {
  if (!DT.clock.trusted) return 1;
  const ev = weekend();
  return !ev.on ? 1 : ev.type === 'x2' ? 2 : 1.25;
}

/* ---------- Boss mondial ---------- */
let boss = {total: 0, hp: WB_HP, parts: 1, pct: 0};
function bossCalc() {
  const S = st(), ev = weekend(), P = api.players(), sus = api.suspects();
  let total = S.wb.id === ev.w ? S.wb.dmg : 0, parts = total >= WB_MIN ? 1 : 0;
  for (const k in P) {
    const s = P[k].st;
    if (sus[k] || s.wi !== ev.w) continue;
    total += Math.min(WB_CAP, s.wd || 0);
    if ((s.wd || 0) >= WB_MIN) parts++;
  }
  const hp = WB_HP * Math.max(1, parts);
  boss = {total, hp, parts, pct: Math.min(1, total / hp)};
  if (!ev.on || S.wb.id !== ev.w || S.wb.dmg < WB_MIN) return;
  for (const [at, chest] of TIERS) {
    if (boss.pct < at || S.wb.tiers.includes(at)) continue;
    S.wb.tiers.push(at);
    api.give(chest, `boss mondial à ${Math.round(at * 100)} %`);
    if (at >= 1) {
      S.wbKills = (S.wbKills || 0) + 1;
      api.banner('BOSS MONDIAL', 'K.O. !', `${boss.parts} joueurs l'ont abattu ensemble. Coffre légendaire !`);
      api.shake(document.body); api.flash('#FFD23F'); api.confetti(innerWidth / 2, innerHeight * 0.4, 200); api.A.bossKill();
      api.addFeed(`Le <b>boss mondial</b> tombe : ${boss.parts} joueurs ensemble !`);
    } else api.toast(`Boss mondial à <b>${Math.round(at * 100)} %</b> de dégâts : coffre pour tous ceux qui ont tapé !`, 'mint');
  }
}

/* ---------- Classements : valeur d'un joueur pour la saison ou le défi du jour ---------- */
function val(p, key) {
  if (key === 'sp') return p.ss === weekId() ? (p.sp || 0) : 0;
  if (key === 'dv') return p.dd === dayId() ? (p.dv || 0) : 0;
  return p[key] || 0;
}
// Ce que voient les autres : publié avec le score.
function stats() {
  const S = st(), ev = weekend();
  return {ss: S.season.id, sp: Math.round(S.season.pts), dd: S.dc.id, dv: dcValue(), wi: S.wb.id, wd: Math.round(S.wb.dmg),
    cn: S.clan.name || '', md: [S.medals.g || 0, S.medals.s || 0, S.medals.b || 0], ev: ev.on ? 1 : 0};
}
// Anti-triche : ces nouveaux scores restent possibles (un humain tape au plus 20 fois par seconde).
function audit(m) {
  const s = m.st, t = m.t || now();
  if (s.ss === weekId(t) && s.sp > (t - weekStart(s.ss)) / 1000 * 100 + 5000) return 'points de saison impossibles';
  if (s.dd === dayId(t) && s.dv > (t - s.dd * DAY) / 1000 * 25 + 200) return 'défi du jour impossible';
  if (s.wi === weekId(t) && s.wd > WB_CAP) return 'dégâts au boss impossibles';
  return '';
}

/* ---------- Relevé : instantanés et affichage ---------- */
function observe() {
  if (!snap || !api.me()) return;
  const P = api.players(), d = dayId(), w = weekId();
  if (snap.day.id === d) for (const k in P) { const s = P[k].st; if (s.dd === d && s.dv > 0) { snap.day.v[k] = s.dv; snapDirty = true; } }
  if (snap.season.id === w) for (const k in P) { const s = P[k].st; if (s.ss === w && s.sp > 0) { snap.season.v[k] = s.sp; snapDirty = true; } }
  saveSnap();
  bossCalc();
  render(true);
}

/* ---------- Clans ---------- */
const CLAN_RE = /^[\p{L}\p{N} ._'-]+$/u;
const cleanClan = n => String(n || '').replace(/\s+/g, ' ').trim().slice(0, 20);
const clanKey = n => DT.net.nameKey(n);
function clans() {
  const P = api.players(), sus = api.suspects(), me = api.me(), S = st(), w = weekId(), out = {};
  const add = (k, name, cn, sp, self) => {
    if (!cn) return;
    const ck = clanKey(cn); if (!ck) return;
    const c = out[ck] || (out[ck] = {key: ck, name: cn, pts: 0, members: [], mine: false});
    c.pts += sp; c.members.push(name); if (self) { c.mine = true; c.name = cn; }
  };
  for (const k in P) { const s = P[k].st; if (!sus[k]) add(k, P[k].name, s.cn, s.ss === w ? s.sp || 0 : 0, false); }
  if (me) add(me.key, me.name, S.clan.name, curSeasonPts(), true);
  return Object.values(out).sort((a, b) => b.pts - a.pts || b.members.length - a.members.length);
}
function clansHTML() {
  const list = clans();
  if (!list.length) return `<li class="empty">Aucun clan pour l'instant. Crée le tien dans le panneau « Clan » au-dessus : tes potes n'auront qu'à taper le même nom.</li>`;
  const max = Math.max(1, list[0].pts);
  return list.slice(0, 100).map((c, i) => `<li class="pl so-clanrow${c.mine ? ' me' : ''} r${i + 1}"><span class="rk">${i + 1}</span>
    <span class="who"><span class="nm"><span>🛡️ ${esc(c.name)}</span>${c.mine ? '' : `<button type="button" class="fr-btn so-join" data-clan="${esc(c.name)}" title="Rejoindre ce clan">REJOINDRE</button>`}</span>
    <span class="sub">${c.members.length} membre${c.members.length > 1 ? 's' : ''} · ${esc(c.members.slice(0, 6).join(', '))}${c.members.length > 6 ? '…' : ''}</span></span>
    <span class="val">${api.fmt(c.pts)} <span class="unit">pts</span></span>
    <span class="pbar"><span style="width:${Math.max(2, Math.round(c.pts / max * 100))}%"></span></span></li>`).join('');
}
function joinClan(raw) {
  const S = st(), name = cleanClan(raw), msg = $('clanMsg');
  const say = (t, good) => { msg.textContent = t; msg.className = 'auth-msg' + (good ? ' ok' : ''); };
  if (name.length < 3 || !CLAN_RE.test(name) || clanKey(name).length < 3) { say('Nom de clan : 3 à 20 lettres, chiffres, espaces, . _ - \''); api.A.denied(); return; }
  if (S.clan.name && clanKey(S.clan.name) === clanKey(name)) { say('Tu es déjà dans ce clan.'); return; }
  if (S.clan.name && now() - (S.clan.at || 0) < DAY) { say(`Tu pourras changer de clan dans ${left(DAY - (now() - S.clan.at))}.`); api.A.denied(); return; }
  const existing = clans().find(c => c.key === clanKey(name));
  S.clan = {name: existing ? existing.name : name, at: now()};
  say(existing ? `Bienvenue dans ${existing.name} !` : `Clan ${name} créé ! Dis à tes potes de taper le même nom.`, true);
  api.A.upgrade(); api.confetti(innerWidth / 2, innerHeight * 0.4, 80);
  api.addFeed(`Tu rejoins le clan <b>${esc(S.clan.name)}</b>.`);
  $('clanName').value = '';
  api.save(); api.publishSoon(); render(true); api.renderBoard(); api.onChange();
}
function leaveClan() {
  const S = st();
  if (!S.clan.name) return;
  api.addFeed(`Tu quittes le clan <b>${esc(S.clan.name)}</b>.`);
  S.clan = {name: '', at: now()};
  api.A.click(); api.save(); api.publishSoon(); render(true); api.renderBoard();
}

/* ---------- Profil d'un joueur ---------- */
function profile(key) {
  const me = api.me(), P = api.players(), self = me && key === me.key;
  const p = self ? {name: me.name, st: api.myStats(), t: now()} : P[key];
  if (!p) return;
  const s = p.st, D = DT.DIFS[s.dif === undefined ? 1 : s.dif] || DT.DIFS[1], E = DT.ERAS[s.era || 0];
  const md = s.md || [0, 0, 0], sus = api.suspects()[key];
  const on = self || now() - p.t < 12 * 60000;
  const rows = [
    ['Total produit', api.fmt(s.life || 0) + ' nmol'], ['Production', api.fmt(s.dps || 0) + ' /s'], ['Sérénité', api.fmt(s.ser || 0)],
    ['Points de saison', api.fmt(val(s, 'sp'))], ['Défi du jour', `${api.fmt(val(s, 'dv'))} / ${dcOf(dayId()).n}`],
    ['Niveau', s.lvl || 1], ['Succès', `${s.ach || 0}/${DT.ACH.length}`], ['Cartes', `${s.cards || 0}/${DT.CARDS.length}`],
    ['Meilleur combo', api.fmt(s.combo || 0)], ['Boss terrassés', api.fmt(s.bosses || 0)], ['Duels gagnés', api.fmt(s.duelsWon || 0)],
    ['Jackpots', api.fmt((s.jackpots || 0) + (s.slotJackpots || 0))], ['Cures de désintox', api.fmt(s.resets || 0)],
    ['Version', s.ver || '?'],
  ];
  const fr = !self && api.isFriend(key);
  $('pfBody').innerHTML = `<div class="pf-head" style="--c:${E.color}"><span class="pf-av">${esc(p.name.charAt(0).toUpperCase())}</span>
      <div><h2>${esc(p.name)} ${D.ico}</h2><p>${esc(DT.rankOf(s.life || 0))} · chapitre ${E.num} : ${esc(E.name)}</p>
      <p class="pf-tags">${D.name}${s.cn ? ` · 🛡️ ${esc(s.cn)}` : ''}${md[0] ? ` · 🥇${md[0]}` : ''}${md[1] ? ` · 🥈${md[1]}` : ''}${md[2] ? ` · 🥉${md[2]}` : ''}</p>
      <p class="pf-on">${self ? 'C\'est toi' : on ? '● en jeu' : 'vu ' + api.ago(p.t)}</p></div></div>
    ${sus ? `<p class="pf-sus">⚠ Score douteux : ${esc(sus.r)}. Ce joueur est mis à part dans le classement Monde.</p>` : ''}
    <table class="pf-stats">${rows.map(([a, b]) => `<tr><td>${a}</td><td>${esc(b)}</td></tr>`).join('')}</table>
    ${self ? '' : `<div class="pf-acts"><button type="button" class="btn${fr ? '' : ' mint'}" id="pfFriend">${fr ? '★ Retirer des amis' : '☆ Ajouter en ami'}</button><button type="button" class="btn-hero" id="pfDuel">DÉFIER EN DUEL</button></div>`}`;
  $('profModal').hidden = false; api.A.click();
  if (!self) {
    $('pfFriend').onclick = () => { if (api.isFriend(key)) api.removeFriend(key); else api.addFriend(key, p.name); profile(key); };
    $('pfDuel').onclick = () => { $('profModal').hidden = true; DT.Games.challenge(key, p.name); };
  }
}

/* ---------- Affichage ---------- */
let uiClock = 0, chestClock = 0;
function render(force) {
  if (!api || !api.me() || !DT.clock.trusted) return;
  const S = st(), d = dayId(), w = weekId(), t = now(), T = DT.setText;
  // saison
  T($('soSeason'), `SAISON ${seasonNum(w)}`);
  T($('soSeasonEnd'), `fin dans ${left(weekStart(w + 1) - t)}`);
  const sv = Object.assign({}, snap ? snap.season.v : {}); if (api.me()) sv[api.me().key] = curSeasonPts();
  const sr = rankIn(sv, api.me().key);
  DT.setHTML($('soMe'), `Tes points : <b>${api.fmt(curSeasonPts())}</b>${sr.rank ? ` · <b>${sr.rank}${sr.rank === 1 ? 'er' : 'e'}</b> sur ${sr.n}` : ''} · 🥇${S.medals.g} 🥈${S.medals.s} 🥉${S.medals.b}`);
  // défi du jour
  const dc = dcOf(d), v = dcValue(), pct = Math.min(1, v / dc.n);
  T($('soDailyName'), dc.txt);
  T($('soDayEnd'), `nouveau dans ${left((d + 1) * DAY - t)}`);
  DT.setStyle($('soDailyBar'), 'width', Math.round(pct * 100) + '%');
  const dv = Object.assign({}, snap ? snap.day.v : {}); dv[api.me().key] = v;
  const dr = rankIn(dv, api.me().key);
  DT.setHTML($('soDailyInfo'), `${api.fmt(v)} / ${dc.n} ${dc.u}${S.dc.done ? ' · <b>RÉUSSI ✓</b>' : ' · coffre doré à la clé'}${dr.rank ? ` · ${dr.rank}${dr.rank === 1 ? 'er' : 'e'} du jour sur ${dr.n}` : ''}`);
  DT.setClass($('soDaily'), 'so-card so-daily' + (S.dc.done ? ' done' : ''));
  // week-end
  const ev = weekend();
  DT.setClass($('soEvent'), 'so-card so-event' + (ev.on ? ' on' : ''));
  T($('soEvTitle'), ev.on ? EV[ev.type].title : 'ÉVÉNEMENT DU WEEK-END');
  T($('soEvEnd'), ev.on ? `fin dans ${left(ev.endT - t)}` : `dans ${left(ev.nextT - t)}`);
  T($('soEvDesc'), ev.on ? EV[ev.type].desc : 'Chaque week-end (vendredi soir → dimanche) : production ×2 ou pluie de coffres, et un boss mondial à abattre avec tous les joueurs.');
  DT.setHidden($('soBoss'), !ev.on);
  if (ev.on) {
    DT.setStyle($('soBossBar'), 'width', Math.round((1 - boss.pct) * 1000) / 10 + '%');
    T($('soBossInfo'), `Boss mondial : ${life(boss.pct)} % de vie · ${boss.parts} joueur${boss.parts > 1 ? 's' : ''} · tes dégâts : ${api.fmt(S.wb.id === ev.w ? S.wb.dmg : 0)}${(S.wb.id === ev.w ? S.wb.dmg : 0) < WB_MIN ? ` (tape ${WB_MIN} fois pour toucher les coffres)` : ''}`);
  }
  // petites pastilles sous la presse (visibles même sur téléphone, vue « Jouer »)
  T($('soChipDaily'), S.dc.done ? '✓ Défi du jour réussi' : `🎯 Défi : ${api.fmt(v)}/${dc.n} ${dc.u}`);
  DT.setHidden($('soChipEv'), !ev.on);
  if (ev.on) T($('soChipEv'), `${ev.type === 'x2' ? '🔥 ×2' : '🎁 COFFRES'} · BOSS ${life(boss.pct)} %`);
  // clan
  const cl = S.clan.name ? clans().find(c => c.key === clanKey(S.clan.name)) : null;
  const ci = cl ? clans().indexOf(cl) + 1 : 0;
  DT.setHTML($('soClanTxt'), S.clan.name
    ? `Tu es dans <b>🛡️ ${esc(S.clan.name)}</b> · ${cl ? cl.members.length : 1} membre${cl && cl.members.length > 1 ? 's' : ''} · ${api.fmt(cl ? cl.pts : 0)} pts cette saison${ci ? ` · ${ci}${ci === 1 ? 'er' : 'e'} clan` : ''}`
    : 'Pas encore de clan. Crée-le avec un nom, puis tes potes tapent le même nom pour te rejoindre.');
  DT.setHidden($('clanLeave'), !S.clan.name);
  if (force) uiClock = 0;
}
function tick(dt) {
  if (!api || !api.inGame()) return;
  uiClock += dt;
  if (uiClock < 0.5) return;
  const S = st(), step = uiClock;
  uiClock = 0;
  if (!DT.clock.trusted) return;
  rollover();
  // défi réussi
  if (!S.dc.done && S.dc.id === dayId() && dcValue() >= dcOf(S.dc.id).n) {
    S.dc.done = true; S.dcDone = (S.dcDone || 0) + 1;
    api.give('gold', 'défi du jour réussi');
    api.banner('DÉFI DU JOUR', 'RÉUSSI !', `${dcOf(S.dc.id).txt} : coffre doré !`);
    api.confetti(innerWidth / 2, innerHeight * 0.4, 120); api.A.jackpot();
    api.addFeed('Tu réussis le <b>défi du jour</b> !');
    api.publishSoon(); api.save();
  }
  // pluie de coffres du week-end
  const ev = weekend();
  if (ev.on && ev.type === 'chests' && !api.modalOpen()) {
    chestClock += step;
    if (chestClock >= 480) { chestClock = 0; api.give('gold', 'pluie de coffres du week-end'); }
  }
  bossCalc();
  render();
}
function enter() {
  loadSnap();
  st();
  render(true);
}
function init(a) {
  api = a;
  $('clanForm').addEventListener('submit', e => { e.preventDefault(); joinClan($('clanName').value); });
  $('clanLeave').addEventListener('click', leaveClan);
  $('pfClose').addEventListener('click', () => { $('profModal').hidden = true; });
  $('profModal').addEventListener('click', e => { if (e.target === $('profModal')) $('profModal').hidden = true; });
  $('board').addEventListener('click', e => {
    const j = e.target.closest('.so-join');
    if (j) { e.stopPropagation(); joinClan(j.dataset.clan); }
  });
  for (const id of ['soChipDaily', 'soChipEv']) $(id).addEventListener('click', () => {
    const b = document.querySelector('#mnav [data-view="live"]');
    if (b && getComputedStyle($('mnav')).display !== 'none') b.click();
    $('soPanel').scrollIntoView({behavior: 'smooth', block: 'start'});
  });
}

DT.Social = {init, enter, tick, observe, xp, tap, hit, mult, val, stats, audit, clansHTML, profile, weekend,
  seasonLabel: () => `Saison ${seasonNum(weekId())} · fin dans ${left(weekStart(weekId() + 1) - now())}`,
  dailyUnit: () => dcOf(dayId()).u, cleanClan};

})(window.DT);
