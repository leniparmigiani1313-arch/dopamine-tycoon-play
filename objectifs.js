/* Dopamine Tycoon : objectifs qui donnent envie de revenir (v1.14).
 *  - Coffres du jour : 5 coffres à 3, 10, 20, 40 et 60 minutes de jeu actif (remis à zéro chaque jour).
 *  - Missions de la semaine : 5 missions communes à tous (tirées de la semaine), un coffre chacune.
 *  - Ligues : Bronze → Légende selon les points de saison de la semaine ; chaque promotion donne un coffre.
 *  - Rival : le pote (ou le joueur) juste devant toi en points de saison ; le dépasser rapporte un coffre doré.
 *  - Heures folles : 4 fois 20 minutes par jour, les mêmes pour tous (production ×2, taps ×3 ou XP ×2).
 *  - Série de connexion : paliers à 3, 7, 14 et 30 jours ; cadeau de retour après 2 jours d'absence.
 *  - Boost débutant (production ×2 pendant les 2 premières heures de jeu), paliers de production, « Quoi de neuf ».
 * Tout se déduit de l'heure officielle (DT.now) : changer l'heure du PC ne rapporte rien. */
window.DT = window.DT || {};
(function (DT) {
'use strict';

const $ = id => document.getElementById(id);
const DAY = 864e5, HOUR = 36e5, MIN = 6e4;
let api = null;

const now = () => DT.now();
const dayId = (t = now()) => Math.floor(t / DAY);
const weekId = (t = now()) => Math.floor((dayId(t) + 3) / 7);
function hash(n) { let x = Math.imul(n | 0, 2654435761) ^ 0x5bd1e995; x = Math.imul(x ^ (x >>> 15), 2246822519); return (x ^ (x >>> 13)) >>> 0; }
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const ok = () => DT.clock.trusted && api && api.inGame() && api.me();
const clock = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const hm = t => { const d = new Date(t); return `${d.getHours()} h ${String(d.getMinutes()).padStart(2, '0')}`; };
const CHEST_NAME = {wood: 'coffre en bois', gold: 'coffre doré', magic: 'coffre magique', legend: 'coffre légendaire'};

/* ---------- État (dans la sauvegarde, gardé à la cure de désintox) ---------- */
function st() {
  const S = api.S;
  if (!S.ob || typeof S.ob !== 'object' || Array.isArray(S.ob)) S.ob = {};
  const o = S.ob;
  if (!o.ps || typeof o.ps !== 'object') o.ps = {d: 0, sec: 0, got: 0};
  if (!o.wk || typeof o.wk !== 'object' || !Array.isArray(o.wk.done)) o.wk = {id: 0, base: {}, done: []};
  if (!o.lg || typeof o.lg !== 'object') o.lg = {w: 0, i: 0};
  if (!o.rv || typeof o.rv !== 'object') o.rv = {d: 0, n: 0};
  if (!Number.isFinite(o.sm)) o.sm = 0;
  if (!Number.isInteger(o.mk)) o.mk = -1;
  return o;
}

/* ---------- Coffres du jour (temps de jeu actif) ---------- */
const PLAY = [{m: 3, c: 'wood'}, {m: 10, c: 'gold'}, {m: 20, c: 'gold'}, {m: 40, c: 'magic'}, {m: 60, c: 'legend'}];
const playNext = () => { const o = st(); return o.ps.got < PLAY.length ? PLAY[o.ps.got] : null; };
const playReady = () => { const n = playNext(); return !!n && st().ps.sec >= n.m * 60; };
function playTick(dt) {
  const o = st(), d = dayId();
  if (o.ps.d !== d) o.ps = {d, sec: 0, got: 0};
  if (o.ps.got >= PLAY.length || document.hidden || api.S.paused) return;
  if (now() - api.lastInput() > 90000) return;  // joueur parti : le temps ne compte plus
  o.ps.sec = Math.min(o.ps.sec + Math.min(dt, 1), PLAY[PLAY.length - 1].m * 60);
}
function claimPlay(from) {
  if (!ok() || !playReady()) return false;
  const o = st(), p = PLAY[o.ps.got];
  o.ps.got++;
  api.give(p.c, `${p.m} min de jeu aujourd'hui`);
  api.A.questDone();
  const b = from ? from.getBoundingClientRect() : null;
  api.confetti(b ? b.left + b.width / 2 : innerWidth / 2, b ? b.top : innerHeight / 2, p.c === 'legend' ? 140 : 50);
  if (o.ps.got === PLAY.length) { api.banner('COFFRES DU JOUR', 'TOUS OUVERTS !', 'Reviens demain : 5 nouveaux coffres t\'attendent.'); api.flash('#5FE0B7'); }
  api.save(); render(true);
  return true;
}

/* ---------- Missions de la semaine ---------- */
const MS = [
  {c: 'totClicks', n: 15000, txt: 'Fais 15 000 taps'},
  {c: 'crushed', n: 800, txt: 'Écrase 800 objets'},
  {c: 'bosses', n: 15, txt: 'Terrasse 15 boss'},
  {c: 'chestsOpened', n: 30, txt: 'Ouvre 30 coffres'},
  {c: 'casinoPlays', n: 100, txt: 'Joue 100 parties de casino'},
  {c: 'goldClicks', n: 20, txt: 'Attrape 20 notifications dorées'},
  {c: 'megas', n: 15, txt: 'Déclenche 15 Méga-Presses'},
  {c: 'popits', n: 50, txt: 'Termine 50 pop-it'},
  {c: 'questsDone', n: 20, txt: 'Termine 20 quêtes'},
  {c: 'slotSpins', n: 150, txt: 'Fais 150 tours de machines à sous'},
  {c: 'scratched', n: 15, txt: 'Gratte 15 tickets'},
  {c: 'dcDone', n: 4, txt: 'Réussis 4 défis du jour'},
  {c: 'fevers', n: 25, txt: 'Déclenche 25 fois le mode Hype'},
  {c: 'spinsDone', n: 20, txt: 'Tourne 20 fois la roue'},
];
const MS_REW = ['gold', 'gold', 'magic', 'magic', 'legend'];  // dans l'ordre où on les finit
const msCache = {w: -1, list: []};
function missions(w = weekId()) {
  if (msCache.w === w) return msCache.list;
  const pool = MS.slice(), list = [];
  let h = hash(w * 13 + 5);
  while (list.length < 5) { list.push(pool.splice(h % pool.length, 1)[0]); h = hash(h + list.length); }
  msCache.w = w; msCache.list = list;
  return list;
}
const msVal = m => Math.max(0, (api.S[m.c] || 0) - (st().wk.base[m.c] || 0));
function weekTick() {
  const o = st(), w = weekId();
  if (o.wk.id !== w) o.wk = {id: w, base: Object.fromEntries(MS.map(m => [m.c, api.S[m.c] || 0])), done: []};
  missions(w).forEach((m, i) => {
    if (o.wk.done.includes(i) || msVal(m) < m.n) return;
    o.wk.done.push(i);
    const chest = MS_REW[Math.min(o.wk.done.length, MS_REW.length) - 1];
    api.give(chest, `mission de la semaine : ${m.txt.toLowerCase()}`);
    if (o.wk.done.length === 5) {
      api.S.tickets = (api.S.tickets || 0) + 3;
      api.banner('SEMAINE PARFAITE', '5 / 5', 'Toutes les missions de la semaine : coffre légendaire et 3 tickets à gratter !');
      api.flash('#FFD23F'); api.confetti(innerWidth / 2, innerHeight * 0.35, 200); api.A.jackpot();
      api.addFeed('Tu termines <b>toutes les missions de la semaine</b> !');
    } else {
      api.banner('MISSION DE LA SEMAINE', `${o.wk.done.length} / 5`, `${m.txt} : ${CHEST_NAME[chest]} !`);
      api.confetti(innerWidth / 2, innerHeight * 0.4, 90); api.A.questDone();
    }
    api.save();
  });
}

/* ---------- Ligues (points de saison de la semaine) ---------- */
const LEAGUES = [
  {n: 'Bronze', ico: '🟤', at: 0, c: '#C98B55'},
  {n: 'Argent', ico: '⚪', at: 1500, c: '#D7D7E6', chest: 'wood'},
  {n: 'Or', ico: '🟡', at: 6000, c: '#FFC247', chest: 'gold'},
  {n: 'Platine', ico: '💠', at: 20000, c: '#4FD8FF', chest: 'magic'},
  {n: 'Diamant', ico: '💎', at: 50000, c: '#9DB8FF', chest: 'magic'},
  {n: 'Légende', ico: '👑', at: 120000, c: '#FF7EB6', chest: 'legend'},
];
function leagueOf(pts) { let i = 0; for (let k = 0; k < LEAGUES.length; k++) if (pts >= LEAGUES[k].at) i = k; return i; }
let myPts = 0;
function leagueTick() {
  const o = st(), w = weekId();
  if (o.lg.w !== w) o.lg = {w, i: 0};
  const i = leagueOf(myPts);
  if (i <= o.lg.i) return;
  for (let k = o.lg.i + 1; k <= i; k++) api.give(LEAGUES[k].chest, `promotion en ligue ${LEAGUES[k].n}`);
  o.lg.i = i;
  const L = LEAGUES[i];
  api.banner('PROMOTION', `${L.ico} LIGUE ${L.n.toUpperCase()}`, i < LEAGUES.length - 1 ? `Prochaine ligue à ${api.fmt(LEAGUES[i + 1].at)} points de saison.` : 'La plus haute ligue. Respect.');
  api.flash(L.c); api.confetti(innerWidth / 2, innerHeight * 0.35, 120); api.A.levelUp();
  api.addFeed(`Promotion en <b>ligue ${L.n}</b> ${L.ico} !`);
  api.publishSoon(); api.save();
}

/* ---------- Rival : celui qui est juste devant en points de saison ---------- */
let rival = null, chaser = null, prevRival = null;
function findRival() {
  const P = api.players(), sus = api.suspects(), fr = api.hasFriends();
  let above = null, below = null;
  for (const k in P) {
    if (sus[k] || (fr && !api.isFriend(k))) continue;
    const v = DT.Social.val(P[k].st, 'sp');
    if (!(v > 0)) continue;
    if (v > myPts) { if (!above || v < above.pts) above = {key: k, name: P[k].name, pts: v}; }
    else if (!below || v > below.pts) below = {key: k, name: P[k].name, pts: v};
  }
  rival = above; chaser = below;
}
function rivalTick() {
  findRival();
  const o = st(), d = dayId(), P = api.players();
  if (prevRival && (!rival || rival.key !== prevRival.key) && P[prevRival.key]) {
    const v = DT.Social.val(P[prevRival.key].st, 'sp');
    if (v > 0 && myPts > v) {
      if (o.rv.d !== d) o.rv = {d, n: 0};
      const paid = o.rv.n < 3;
      if (paid) { o.rv.n++; api.give('gold', `rival dépassé : ${prevRival.name}`); }
      api.banner('RIVAL DÉPASSÉ', '⚔️', `Tu passes devant ${prevRival.name} en points de saison${paid ? ' : coffre doré !' : '.'}`);
      api.confetti(innerWidth / 2, innerHeight * 0.4, 80); api.A.upgrade();
      api.addFeed(`Tu dépasses ton rival <b>${esc(prevRival.name)}</b> !`);
    }
  }
  prevRival = rival;
}

/* ---------- Heures folles : 4 fenêtres de 20 min par jour, les mêmes pour tous ---------- */
const HTYPES = [
  {k: 'prod', m: 2, t: 'PRODUCTION ×2', s: 'production ×2', ico: '🏭'},
  {k: 'tap', m: 3, t: 'TAPS ×3', s: 'taps ×3', ico: '👆'},
  {k: 'xp', m: 2, t: 'XP ×2', s: 'XP ×2 (saison et Pass)', ico: '⭐'},
];
const HLEN = 20 * MIN;
const hCache = {d: -1, list: []};
function hoursOf(d) {
  // une fenêtre dans chaque bloc de 3 h, de 9 h à 21 h UTC (10 h → 23 h en France)
  const out = [];
  for (let b = 0; b < 4; b++) {
    const h = hash(d * 31 + b * 7 + 1), start = d * DAY + (9 + b * 3) * HOUR + (h % 160) * MIN;
    out.push({start, end: start + HLEN, type: HTYPES[(h >>> 9) % HTYPES.length]});
  }
  return out;
}
function hours(t = now()) {
  const d = dayId(t);
  if (hCache.d !== d) { hCache.d = d; hCache.list = hoursOf(d).concat(hoursOf(d + 1)); }
  return hCache.list;
}
let happyAt = 0, happyNow = null;
function happy() {
  const t = now();
  if (Math.abs(t - happyAt) > 1000) { happyAt = t; happyNow = DT.clock.trusted ? hours(t).find(x => t >= x.start && t < x.end) || null : null; }
  return happyNow;
}
const nextHappy = () => { const t = now(); return hours(t).find(x => x.start > t) || null; };
function happyTick() {
  const o = st(), h = happy(), t = now();
  if (h && o.hs !== h.start) {
    o.hs = h.start;
    if (t - h.start < 5 * MIN) {
      api.banner('HEURE FOLLE', `${h.type.ico} ${h.type.t}`, `Pendant 20 minutes, pour tous les joueurs !`);
      api.flash('#FFD23F'); api.confetti(innerWidth / 2, innerHeight * 0.3, 120); api.A.jackpot();
      api.addFeed(`<b>Heure folle</b> : ${h.type.s} pendant 20 min.`);
    }
  }
  const n = nextHappy();
  if (!h && n && n.start - t < 5 * MIN && o.hw !== n.start) {
    o.hw = n.start;
    api.toast(`⚡ <b>Heure folle dans ${Math.ceil((n.start - t) / MIN)} min</b> : ${n.type.s}. Ne pars pas !`, 'mint');
  }
}

/* ---------- Boost débutant et multiplicateurs ---------- */
const NEWBIE = 2 * 3600;
const newbie = () => !!api && !(api.S.resets > 0) && (api.S.playTime || 0) < NEWBIE;
function mult(k) {
  if (!api) return 1;
  let m = 1;
  if (k === 'prod' && newbie()) m *= 2;
  const h = happy();
  if (h && h.type.k === k) m *= h.type.m;
  return m;
}

/* ---------- Série de connexion et retour ---------- */
const STREAK = [
  {d: 3, c: 'gold', txt: 'coffre doré'},
  {d: 7, c: 'legend', txt: 'coffre légendaire'},
  {d: 14, c: 'legend', tk: 5, txt: 'coffre légendaire + 5 tickets'},
  {d: 30, c: 'legend', tk: 10, spins: 10, txt: 'coffre légendaire + 10 tickets + 10 tours de roue'},
];
function streakTick() {
  const S = api.S, o = st(), s = (S.daily && S.daily.streak) || 0;
  if (s < o.sm) o.sm = 0;
  for (const m of STREAK) {
    if (m.d <= o.sm || m.d > s) continue;
    o.sm = m.d;
    api.give(m.c, `série de ${m.d} jours`);
    if (m.tk) S.tickets = (S.tickets || 0) + m.tk;
    if (m.spins) S.spins = (S.spins || 0) + m.spins;
    api.banner(`SÉRIE DE ${m.d} JOURS`, '🔥', `Tu reviens chaque jour : ${m.txt} !`);
    api.confetti(innerWidth / 2, innerHeight * 0.35, 140); api.A.jackpot();
    api.addFeed(`Série de <b>${m.d} jours</b> d'affilée !`);
    api.save();
  }
}
let awayFrom = 0, backDone = true;
function backTick() {
  backDone = true;
  const S = api.S, away = now() - awayFrom;
  if (!awayFrom || away < 2 * DAY || (S.clicks < 30 && !S.resets)) return;
  api.buff('prod', 3, 15 * 60, 'Bon retour ×3');
  api.give('magic', 'cadeau de retour');
  if (away >= 7 * DAY) api.give('legend', 'cadeau de retour');
  S.spins = (S.spins || 0) + 3;
  api.banner('BON RETOUR !', `${Math.floor(away / DAY)} JOURS`, `Production ×3 pendant 15 min, ${away >= 7 * DAY ? 'coffre légendaire, ' : ''}coffre magique et 3 tours de roue. Tu nous as manqué.`);
  api.flash('#5FE0B7'); api.confetti(innerWidth / 2, innerHeight * 0.35, 160); api.A.jackpot();
  api.addFeed(`Bon retour après <b>${Math.floor(away / DAY)} jours</b> !`);
  api.save();
}

/* ---------- Paliers de production (total depuis le début) ---------- */
const MARK = ['', 'MILLE', 'UN MILLION', 'UN MILLIARD', 'UN BILLION', 'UN BILLIARD', 'UN TRILLION', 'UN TRILLIARD'];
function markTick() {
  const S = api.S, o = st(), i = Math.floor(Math.log10(Math.max(1, S.life || 0)) / 3 + 1e-9);
  if (o.mk < 0) { o.mk = i; return; }  // première fois : pas de pluie de paliers pour les anciens joueurs
  if (i <= o.mk) return;
  o.mk = i;
  if (i < 2) return;
  api.banner('PALIER', MARK[i] || api.fmt(Math.pow(1000, i)), 'de nmol produites depuis le début. Continue !');
  api.flash('#FFC247'); api.confetti(innerWidth / 2, innerHeight * 0.35, 100); api.A.levelUp();
  api.addFeed(`Palier franchi : <b>${MARK[i] ? MARK[i].toLowerCase() : api.fmt(Math.pow(1000, i))}</b> de nmol produites.`);
}

/* ---------- Quoi de neuf (une fois par version) ---------- */
const NEWS = '1.26';
let newsAt = 0;
function newsTick() {
  const S = api.S, o = st();
  if (o.news === NEWS || performance.now() < newsAt || api.modalOpen()) return;
  o.news = NEWS;
  if (S.clicks < 30 && !S.resets) return;  // nouveau joueur : le coach suffit
  $('obNews').hidden = false; api.A.daily();
}

/* ---------- Affichage ---------- */
function stepsHTML() {
  const o = st();
  return PLAY.map((p, i) => {
    const got = i < o.ps.got, ready = i === o.ps.got && o.ps.sec >= p.m * 60;
    const prev = i ? PLAY[i - 1].m * 60 : 0, pct = got ? 100 : Math.max(0, Math.min(100, (o.ps.sec - prev) / (p.m * 60 - prev) * 100));
    return `<div class="ob-step${got ? ' got' : ready ? ' ready' : i === o.ps.got ? ' next' : ''}"><span class="ob-ch">${DT.chestSVG(p.c, got)}</span><b>${p.m} min</b><i style="width:${Math.round(pct)}%"></i></div>`;
  }).join('');
}
function render() {
  if (!api || !api.me() || !DT.clock.trusted) return;
  const o = st(), T = DT.setText, t = now(), w = weekId(), S = api.S;
  // ligue
  const li = leagueOf(myPts), L = LEAGUES[li], N = LEAGUES[li + 1];
  T($('obLgName'), `${L.ico} LIGUE ${L.n.toUpperCase()}`);
  T($('obLgNext'), N ? `${N.ico} ${N.n} à ${api.fmt(N.at)}` : 'ligue max');
  DT.setStyle($('obLgBar'), 'width', (N ? Math.round((myPts - L.at) / (N.at - L.at) * 100) : 100) + '%');
  DT.setStyle($('obLeague'), '--lgc', L.c);
  DT.setHTML($('obLgInfo'), N ? `<b>${api.fmt(myPts)}</b> points de saison · encore <b>${api.fmt(N.at - myPts)}</b> pour la promotion (${CHEST_NAME[N.chest]})` : `<b>${api.fmt(myPts)}</b> points de saison · tu es tout en haut`);
  // rival
  if (rival) {
    const gap = rival.pts - myPts;
    T($('obRvTxt'), `${rival.name} · ${api.fmt(gap)} pts devant toi`);
    T($('obRvSub'), `dépasse-le : coffre doré (${Math.max(0, 3 - (o.rv.d === dayId() ? o.rv.n : 0))}/3 aujourd'hui)`);
    DT.setStyle($('obRvBar'), 'width', Math.round(Math.min(1, myPts / rival.pts) * 100) + '%');
  } else {
    T($('obRvTxt'), myPts > 0 ? (chaser ? `Tu es en tête ! ${chaser.name} est à ${api.fmt(myPts - chaser.pts)} pts derrière.` : 'Tu es en tête de la saison !') : 'Gagne de l\'XP pour entrer dans la course de la saison.');
    T($('obRvSub'), api.hasFriends() ? 'entre potes' : 'monde');
    DT.setStyle($('obRvBar'), 'width', myPts > 0 ? '100%' : '0%');
  }
  DT.setClass($('obRival'), 'so-card ob-rival' + (!rival && myPts > 0 ? ' lead' : ''));
  // heures folles
  const h = happy(), n = nextHappy();
  DT.setClass($('obHour'), 'so-card ob-hour' + (h ? ' on' : ''));
  T($('obHrTitle'), h ? `⚡ HEURE FOLLE : ${h.type.t}` : '⚡ HEURES FOLLES');
  T($('obHrEnd'), h ? `fin dans ${clock(h.end - t)}` : n ? `prochaine à ${hm(n.start)}` : '');
  T($('obHrTxt'), h ? `${h.type.ico} ${h.type.s.charAt(0).toUpperCase() + h.type.s.slice(1)} pour tous les joueurs !` : n ? `Prochaine : ${n.type.ico} ${n.type.s}, dans ${Math.ceil((n.start - t) / MIN)} min.` : '');
  T($('obHrList'), 'Aujourd\'hui : ' + hours(t).filter(x => dayId(x.start) === dayId(t)).map(x => `${hm(x.start)} ${x.type.ico}`).join(' · '));
  // coffres du jour
  DT.setHTML($('obSteps'), stepsHTML());
  const nx = playNext();
  T($('obPlayInfo'), nx ? (playReady() ? 'coffre prêt !' : `prochain dans ${clock((nx.m * 60 - o.ps.sec) * 1000)} de jeu`) : 'tous ouverts · reviens demain');
  DT.setHidden($('obPlayClaim'), !playReady());
  // missions
  const ms = missions(w);
  T($('obWkCount'), `${o.wk.id === w ? o.wk.done.length : 0}/5 · fin dans ${Math.ceil((((w + 1) * 7 - 3) * DAY - t) / DAY)} j`);
  DT.setHTML($('obMissions'), ms.map((m, i) => {
    const done = o.wk.id === w && o.wk.done.includes(i), v = Math.min(m.n, msVal(m));
    return `<li class="${done ? 'done' : ''}"><div class="r"><span>${done ? '✓ ' : ''}${esc(m.txt)}</span><span>${api.fmt(v)}/${api.fmt(m.n)}</span></div><div class="so-bar"><i style="width:${Math.round(v / m.n * 100)}%"></i></div></li>`;
  }).join(''));
  // série
  const s = (S.daily && S.daily.streak) || 0, next = STREAK.find(m => m.d > s);
  T($('obStreakN'), `${s} jour${s > 1 ? 's' : ''}`);
  DT.setHTML($('obStreakTxt'), next ? `Reviens chaque jour pour le cadeau du jour. Palier <b>${next.d} jours</b> : ${next.txt}.` : 'Série de 30 jours et plus : légende vivante.');
  // pastilles sous la presse
  const ready = playReady();
  DT.setClass($('obChipPlay'), 'so-chip' + (ready ? ' ob-ready' : ''));
  T($('obChipPlay'), ready ? '🎁 COFFRE PRÊT !' : nx ? `🎁 Coffre dans ${clock((nx.m * 60 - o.ps.sec) * 1000)}` : '🎁 Coffres du jour ✓');
  const showH = !!h || (n && n.start - t < HOUR);
  DT.setHidden($('obChipHour'), !showH);
  if (showH) T($('obChipHour'), h ? `⚡ ${h.type.t} · ${clock(h.end - t)}` : `⚡ Heure folle à ${hm(n.start)}`);
  DT.setClass($('obChipHour'), 'so-chip' + (h ? ' ev' : ''));
  DT.setHidden($('obChipBoost'), !newbie());
  if (newbie()) T($('obChipBoost'), `🚀 Boost débutant ×2 · ${clock((NEWBIE - S.playTime) * 1000)}`);
}

let uiClock = 0;
function tick(dt) {
  if (!api || !api.inGame() || !api.me()) return;
  if (DT.clock.trusted) playTick(dt);
  uiClock += dt;
  if (uiClock < 0.5) return;
  uiClock = 0;
  if (!DT.clock.trusted) return;
  myPts = DT.Social.val(api.myStats(), 'sp');
  if (!backDone) backTick();
  weekTick(); leagueTick(); rivalTick(); happyTick(); streakTick(); markTick(); newsTick();
  render();
}
function enter() {
  st();
  awayFrom = api.S.saved || 0; backDone = false;  // avant le calcul des gains hors ligne, qui remet S.saved à maintenant
  prevRival = null; rival = null; chaser = null;
  newsAt = performance.now() + 4000;
  uiClock = 1;
}
function goPanel() {
  const b = document.querySelector('#mnav [data-view="live"]');
  if (b && getComputedStyle($('mnav')).display !== 'none') b.click();
  $('obPanel').scrollIntoView({behavior: 'smooth', block: 'start'});
}
function init(a) {
  api = a;
  $('obPlayClaim').addEventListener('click', e => claimPlay(e.currentTarget));
  $('obChipPlay').addEventListener('click', e => { if (!claimPlay(e.currentTarget)) goPanel(); });
  $('obChipHour').addEventListener('click', goPanel);
  $('obChipBoost').addEventListener('click', () => api.toast('🚀 <b>Boost débutant</b> : ta production est doublée pendant tes 2 premières heures de jeu. Profites-en !', 'mint'));
  for (const id of ['obNewsClose', 'obNewsGo']) $(id).addEventListener('click', () => { $('obNews').hidden = true; api.A.click(); });
}

DT.Objectifs = {init, enter, tick, mult, LEAGUES, leagueOf,
  leagueIco: pts => LEAGUES[leagueOf(pts)].ico, leagueName: pts => { const L = LEAGUES[leagueOf(pts)]; return `${L.ico} ${L.n}`; }};

})(window.DT);
