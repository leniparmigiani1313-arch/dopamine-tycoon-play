/* Dopamine Tycoon : comptes protégés par mot de passe et classement en ligne via ntfy.sh.
 *
 * Aucun serveur à nous. Chaque compte possède une paire de clés ECDSA :
 *  - la clé privée est chiffrée avec le mot de passe (PBKDF2 + AES-GCM) ;
 *  - chaque score publié est signé, et les autres joueurs vérifient la signature ;
 *  - la première clé vue pour un pseudo est retenue (TOFU), donc un imposteur
 *    qui publie sous le même pseudo est ignoré ;
 *  - la sauvegarde voyage chiffrée avec les scores, pour jouer depuis un autre PC.
 */
window.DT = window.DT || {};
(function (DT) {
'use strict';

const QS = new URLSearchParams(location.search);
const TOPIC = QS.get('topic') || 'dopatycoon-q8x3m7k2v9w4z1';
// Test de charge uniquement (?debug&ntfy=self) : un faux serveur ntfy local qui sert aussi le jeu (tools/stress).
const BASE = (QS.has('debug') && QS.get('ntfy') === 'self' ? location.origin : 'https://ntfy.sh') + '/' + TOPIC;
// Limites du serveur public ntfy.sh (gratuit) : environ 250 messages par jour et par connexion internet,
// et une rafale de 60 requêtes puis une toutes les 5 s. On reste en dessous, et on se met en pause sur une erreur 429.
const DAY_BUDGET = 200, RESERVE = 25;
const FIRST_CAP = 4e6;  // premier relevé : au-delà de 4 Mo d'historique, on ne lit que la dernière heure
const KDF_ITER = 150000;
const enc = new TextEncoder(), dec = new TextDecoder();

const LS = {
  get(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
  // Renvoie false si l'écriture a échoué (disque plein, stockage refusé).
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  raw(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  setRaw(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
};
DT.LS = LS;

function b64(buf) {
  const a = new Uint8Array(buf); let s = '';
  for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000));
  return btoa(s);
}
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const ascii = s => s.replace(/[\u007f-￿]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));

const nameKey = n => String(n || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const cleanName = n => String(n || '').replace(/\s+/g, ' ').trim().slice(0, 16);
function checkName(n) {
  n = cleanName(n);
  if (n.length < 3) return 'Le pseudo doit faire au moins 3 caractères.';
  if (!/^[\p{L}\p{N} ._-]+$/u.test(n)) return 'Lettres, chiffres, espaces, points, tirets et _ uniquement.';
  if (nameKey(n).length < 3) return 'Le pseudo doit contenir au moins 3 lettres ou chiffres.';
  return null;
}

/* ---------- Primitives crypto ---------- */
const ECDSA = {name: 'ECDSA', namedCurve: 'P-256'};
const SIGN = {name: 'ECDSA', hash: 'SHA-256'};

async function deriveAes(pw, salt) {
  const base = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({name: 'PBKDF2', salt, iterations: KDF_ITER, hash: 'SHA-256'},
    base, {name: 'AES-GCM', length: 256}, true, ['encrypt', 'decrypt']);
}
async function aesEnc(key, bytes) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({name: 'AES-GCM', iv}, key, bytes);
  return b64(iv) + '.' + b64(ct);
}
async function aesDec(key, s) {
  const [iv, ct] = String(s).split('.');
  return new Uint8Array(await crypto.subtle.decrypt({name: 'AES-GCM', iv: unb64(iv)}, key, unb64(ct)));
}
async function pipe(bytes, stream) {
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
}
const deflate = b => pipe(b, new CompressionStream('deflate-raw'));
const inflate = b => pipe(b, new DecompressionStream('deflate-raw'));

const pubCache = new Map();
async function importPub(pk) {
  if (pubCache.size > 5000) pubCache.clear();  // inondation de fausses clés : la mémoire ne grossit pas sans fin
  if (!pubCache.has(pk)) pubCache.set(pk, crypto.subtle.importKey('raw', unb64(pk), ECDSA, false, ['verify']));
  return pubCache.get(pk);
}

/* ---------- Comptes ---------- */
// dt-accounts : comptes connus sur ce PC (clé publique, sel, clé privée chiffrée). Jamais le mot de passe.
// dt-session  : présent seulement si « rester connecté » est coché.
const accounts = () => LS.get('dt-accounts') || {};
const known = LS.get('dt-known') || {};  // pseudo -> clé publique vue en premier

let me = null;         // {name, key, pk, salt, vault, priv, aes}
let lastId = null;
let prepared = null;   // dernier message signé, pour l'envoi à la fermeture
let directory = {};    // pseudo -> dernier message vérifié {name, pk, salt, vault, sv, st, t}

function remember(acc, remember) {
  const all = accounts();
  all[acc.key] = {name: acc.name, pk: acc.pk, salt: acc.salt, vault: acc.vault};
  LS.set('dt-accounts', all);
  known[acc.key] = acc.pk; LS.set('dt-known', known);
  if (remember) {
    Promise.all([crypto.subtle.exportKey('jwk', acc.priv), crypto.subtle.exportKey('raw', acc.aes)]).then(([jwk, raw]) =>
      LS.set('dt-session', {key: acc.key, jwk, aes: b64(raw)}));
  } else LS.del('dt-session');
}

/* ---------- Réseau : limites, pauses, lecture plafonnée ---------- */
let pauseUntil = 0, pauseStep = 0;
function paused() { return Date.now() < pauseUntil; }
function hit429() {
  pauseStep = Math.min(pauseStep + 1, 5);
  pauseUntil = Date.now() + 60000 * Math.pow(2, pauseStep - 1);  // 1, 2, 4, 8 puis 16 min
}
function okResponse() { pauseStep = 0; }
function budget() {
  const d = new Date(DT.now()).toISOString().slice(0, 10);
  let b = LS.get('dt-budget');
  if (!b || b.d !== d) b = {d, n: 0};
  return b;
}
// Lit une réponse en s'arrêtant à cap octets (renvoie null si l'historique est trop gros).
async function readCapped(r, cap) {
  if (!r.body || !r.body.getReader) { const t = await r.text(); return t.length > cap ? null : t; }
  const rd = r.body.getReader(), parts = [];
  let n = 0;
  for (;;) {
    const {done, value} = await rd.read();
    if (done) break;
    n += value.length;
    if (n > cap) { try { await rd.cancel(); } catch (e) {} return null; }
    parts.push(value);
  }
  return dec.decode(await new Blob(parts).arrayBuffer());
}
async function get(query, cap, base = BASE) {
  if (paused()) throw new Error('pause');
  const r = await fetch(`${base}/json?poll=1&${query}`);
  if (r.status === 429) { hit429(); throw new Error('429'); }
  if (!r.ok) throw new Error('net');
  okResponse();
  return cap ? readCapped(r, cap) : r.text();
}
// Dernier message d'un compte qui contient sa sauvegarde (étiqueté sv-<pseudo>), sans tout télécharger.
// Les comptes qui n'ont pas encore joué à cette version n'ont pas d'étiquette : on relit alors l'historique (plafonné).
async function fetchAccount(key) {
  let list = await parseLines(await get(`since=12h&tags=sv-${key}`, 0, BASE_SV), false, key);
  if (!list.some(m => m.key === key)) {
    const txt = await get('since=12h', FIRST_CAP) || await get('since=1h');
    list = await parseLines(txt, false, key);
  }
  let best = null;
  for (const m of list) if (m.key === key && !m.impostor && (m.sv || !best)) best = m;
  return best;
}
async function fetchAll(key) {
  const m = await fetchAccount(key);
  return m ? {[key]: m} : {};
}

async function register(name, pw, keep) {
  const err = checkName(name);
  if (err) throw new Error(err);
  if (String(pw).length < 6) throw new Error('Le mot de passe doit faire au moins 6 caractères.');
  name = cleanName(name);
  const key = nameKey(name);
  if (accounts()[key]) throw new Error('Ce compte existe déjà sur ce PC. Connecte-toi.');
  let remote;
  try { remote = await fetchAll(key); } catch (e) { throw new Error(e.message === '429' || e.message === 'pause' ? 'Le serveur du classement est saturé : réessaie dans quelques minutes.' : 'Pas de connexion : impossible de vérifier que le pseudo est libre.'); }
  if (remote[key] || known[key]) throw new Error('Ce pseudo est déjà pris. Choisis-en un autre.');

  const pair = await crypto.subtle.generateKey(ECDSA, true, ['sign', 'verify']);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const aes = await deriveAes(pw, salt);
  const pkcs8 = await crypto.subtle.exportKey('pkcs8', pair.privateKey);
  const acc = {
    name, key, pk: b64(await crypto.subtle.exportKey('raw', pair.publicKey)), salt: b64(salt),
    vault: await aesEnc(aes, pkcs8), priv: pair.privateKey, aes,
  };
  remember(acc, keep);
  me = acc;
  return {account: acc, save: null};
}

async function unlock(rec, pw) {
  const aes = await deriveAes(pw, unb64(rec.salt));
  let pkcs8;
  try { pkcs8 = await aesDec(aes, rec.vault); } catch (e) { throw new Error('Mot de passe incorrect.'); }
  const priv = await crypto.subtle.importKey('pkcs8', pkcs8, ECDSA, true, ['sign']);
  return {aes, priv};
}

async function login(name, pw, keep) {
  const key = nameKey(name);
  if (!key) throw new Error('Entre ton pseudo.');
  let rec = accounts()[key], remoteSave = null, remote = null;
  try { remote = (await fetchAll(key))[key]; } catch (e) { if (!rec) throw new Error('Pas de connexion, et ce compte n\'est pas encore sur ce PC.'); }
  if (!rec) {
    if (!remote) throw new Error('Compte introuvable. Crée-le, ou joue une fois dessus depuis ton autre PC (le serveur garde les parties 12 h).');
    rec = {name: remote.name, pk: remote.pk, salt: remote.salt, vault: remote.vault};
  }
  const {aes, priv} = await unlock(rec, pw);
  const acc = {name: rec.name, key, pk: rec.pk, salt: rec.salt, vault: rec.vault, priv, aes};
  if (remote && remote.pk === acc.pk && remote.sv) {
    try { remoteSave = JSON.parse(dec.decode(await inflate(await aesDec(aes, remote.sv)))); } catch (e) {}
  }
  remember(acc, keep);
  me = acc;
  return {account: acc, save: remoteSave};
}

async function resume() {
  const s = LS.get('dt-session');
  const rec = s && accounts()[s.key];
  if (!rec) return null;
  try {
    const priv = await crypto.subtle.importKey('jwk', s.jwk, ECDSA, true, ['sign']);
    const aes = await crypto.subtle.importKey('raw', unb64(s.aes), {name: 'AES-GCM'}, true, ['encrypt', 'decrypt']);
    me = {name: rec.name, key: s.key, pk: rec.pk, salt: rec.salt, vault: rec.vault, priv, aes};
    return me;
  } catch (e) { LS.del('dt-session'); return null; }
}
function logout() { LS.del('dt-session'); me = null; prepared = null; lastId = null; directory = {}; }

/* ---------- Code de sauvegarde (exporter / importer sa partie) ----------
 * Le code contient le compte (clé publique, sel, clé privée chiffrée par le mot de passe) et la partie chiffrée
 * avec la clé du mot de passe. Sans le mot de passe il est illisible, et une partie modifiée à la main est refusée
 * (AES-GCM vérifie l'intégrité). Il permet de retrouver son compte sur un autre PC, même après les 12 h de ntfy. */
const BAD_CODE = 'Ce code de sauvegarde est invalide ou incomplet. Copie-le en entier.';
async function exportCode(save) {
  if (!me) throw new Error('Connecte-toi d\'abord.');
  const sv = await aesEnc(me.aes, await deflate(enc.encode(JSON.stringify(save))));
  return 'DT1.' + b64(enc.encode(JSON.stringify({n: me.name, pk: me.pk, salt: me.salt, vault: me.vault, sv})));
}
async function importCode(code, pw, keep) {
  let o;
  try {
    const s = String(code || '').replace(/\s+/g, '');
    if (!s.startsWith('DT1.')) throw new Error();
    o = JSON.parse(dec.decode(unb64(s.slice(4))));
  } catch (e) { throw new Error(BAD_CODE); }
  const name = cleanName(o && o.n), key = nameKey(name);
  if (!key || checkName(name) || ![o.pk, o.salt, o.vault, o.sv].every(x => typeof x === 'string')) throw new Error(BAD_CODE);
  const mine = accounts()[key];
  if ((mine && mine.pk !== o.pk) || (known[key] && known[key] !== o.pk)) throw new Error(`Un autre compte « ${name} » existe déjà : ce code ne lui appartient pas.`);
  const rec = {name, pk: o.pk, salt: o.salt, vault: o.vault};
  const {aes, priv} = await unlock(rec, pw);
  // La clé privée doit bien correspondre à la clé publique du compte.
  const probe = enc.encode('dt-probe');
  let ok = false;
  try { ok = await crypto.subtle.verify(SIGN, await importPub(o.pk), await crypto.subtle.sign(SIGN, priv, probe), probe); } catch (e) {}
  if (!ok) throw new Error(BAD_CODE);
  let save;
  try { save = JSON.parse(dec.decode(await inflate(await aesDec(aes, o.sv)))); } catch (e) { throw new Error('La partie contenue dans ce code est illisible.'); }
  if (!save || typeof save !== 'object') throw new Error('La partie contenue dans ce code est illisible.');
  const acc = {name, key, pk: o.pk, salt: o.salt, vault: o.vault, priv, aes};
  remember(acc, keep);
  me = acc; prepared = null; lastId = null;
  return {account: acc, save};
}

/* ---------- Publication ----------
 * Deux sortes de messages :
 *  - les scores, petits (~1 ko), sur le topic du classement que tout le monde relève ;
 *  - la sauvegarde chiffrée (2 à 4 ko), de temps en temps, sur un topic à part (TOPIC-sv) et étiquetée sv-<pseudo> :
 *    elle sert seulement à se connecter depuis un autre appareil, donc personne ne la télécharge pour rien.
 * (Les anciennes versions mettaient la sauvegarde dans chaque score : avec 1 500 joueurs, 4 fois plus de données.) */
const BASE_SV = BASE + '-sv';
let preparedSv = null;
async function sign(o) {
  const body = JSON.stringify(o);
  const sig = b64(await crypto.subtle.sign(SIGN, me.priv, enc.encode(body)));
  return ascii(JSON.stringify({b: body, s: sig}));
}
async function build(stats, save, em, dl) {
  if (!me) return null;
  const msg = await sign({v: 2, n: me.name, pk: me.pk, st: stats, em: em || null, dl: dl || null, tx: (DT.Echange && DT.Echange.outbox()) || null, ts: Math.round(DT.now())});
  let svMsg = null;
  if (save) {
    const sv = await aesEnc(me.aes, await deflate(enc.encode(JSON.stringify(save))));
    svMsg = await sign({v: 2, n: me.name, pk: me.pk, salt: me.salt, vault: me.vault, sv, ts: Math.round(DT.now())});
    if (svMsg.length > 4000) svMsg = null;  // ntfy : 4 096 octets max par message (le code de sauvegarde reste possible)
  }
  prepared = msg; if (svMsg) preparedSv = svMsg;
  return {msg, svMsg};
}
function spend(important) {
  const b = budget();
  if (b.n >= DAY_BUDGET || (!important && b.n >= DAY_BUDGET - RESERVE)) return false;
  b.n++; LS.set('dt-budget', b);
  return true;
}
async function post(url, body) {
  const r = await fetch(url, {method: 'POST', body});
  if (r.status === 429) { hit429(); return null; }
  if (!r.ok) return false;
  okResponse();
  try { const j = await r.json(); if (j && j.time) DT.clock.sync(j.time * 1000 + 500); } catch (e) {}
  return true;
}
// important : défi, échange… (ils puisent dans la réserve quand le quota du jour est presque atteint).
// Renvoie true (publié), false (erreur réseau) ou null (pas publié : pause ou quota).
async function publish(stats, save, em, dl, important) {
  if (!me) return false;
  if (paused()) return null;
  if (!spend(important)) return null;
  const built = await build(stats, save, em, dl);
  if (!built) return false;
  const ok = await post(BASE, built.msg);
  if (ok && built.svMsg && spend(important)) await post(`${BASE_SV}?tags=sv-${me.key}`, built.svMsg).catch(() => {});
  return ok;
}
function beacon() {
  if (paused()) return;
  try {
    if (prepared && spend(true)) navigator.sendBeacon(BASE, prepared);
    if (preparedSv && spend(true)) navigator.sendBeacon(`${BASE_SV}?tags=sv-${me ? me.key : ''}`, preparedSv);
  } catch (e) {}
}

/* ---------- Lecture ---------- */
function num(x, max = 1e300) { x = +x; return Number.isFinite(x) && x >= 0 ? Math.min(x, max) : 0; }
const cardIds = new Set(DT.CARDS.map(c => c.id));
const KEY_RE = /^[a-z0-9]{3,16}$/;
const clanName = c => { c = String(c || '').replace(/\s+/g, ' ').trim().slice(0, 20); return c.length >= 3 && /^[\p{L}\p{N} ._'-]+$/u.test(c) ? c : ''; };

/* Lit un relevé ntfy. Pour tenir avec des milliers de joueurs (ou un petit malin qui inonde le topic),
 * on ne vérifie la signature (l'étape coûteuse) que du dernier message de chaque joueur, et des messages
 * qui nous concernent (défi, échange, ajout en ami). onlyKey : tous les messages d'un seul compte (connexion). */
const MAX_VERIFY = 4000;
async function parseLines(txt, trackCursor, onlyKey) {
  const recs = [], last = new Map(), myKey = me && me.key;
  let newest = 0;
  for (const line of txt.split('\n')) {
    if (line.length < 20 || line.length > 6000) continue;
    let ev; try { ev = JSON.parse(line); } catch (e) { continue; }
    if (!ev || ev.event !== 'message' || typeof ev.message !== 'string') continue;
    if (trackCursor) lastId = ev.id;
    if (+ev.time > newest) newest = +ev.time;
    let env, b;
    try { env = JSON.parse(ev.message); b = JSON.parse(env.b); } catch (e) { continue; }
    if (!b || b.v !== 2 || typeof b.pk !== 'string' || b.pk.length > 120 || typeof env.s !== 'string' || env.s.length > 200) continue;
    const name = cleanName(b.n), key = nameKey(name);
    if (!key || checkName(name)) continue;
    if (onlyKey && key !== onlyKey) continue;
    const mine = !!myKey && ((b.dl && b.dl.to === myKey) || (Array.isArray(b.tx) && b.tx.some(x => x && x.to === myKey)));
    recs.push({ev, env, b, name, key, mine});
    last.set(key, recs.length - 1);
  }
  if (newest) DT.clock.atLeast(newest * 1000);
  // Ordre de vérification : les joueurs déjà connus et les messages qui nous concernent d'abord, puis les nouveaux.
  // Ainsi une inondation de faux comptes (plafonnée à MAX_VERIFY) ne cache jamais les scores des joueurs connus.
  const idx = [];
  for (let i = 0; i < recs.length; i++) if (onlyKey || recs[i].mine || last.get(recs[i].key) === i) idx.push(i);
  const pri = i => (recs[i].mine || known[recs[i].key] ? 0 : 1);
  idx.sort((a, b) => pri(a) - pri(b) || a - b);
  const out = [];
  let verified = 0;
  for (const i of idx) {
    const {ev, env, b, name, key} = recs[i];
    // Pseudo déjà connu avec une autre clé : c'est un imposteur, inutile de vérifier quoi que ce soit.
    if (known[key] && known[key] !== b.pk) { out.push({key, name, pk: b.pk, impostor: true, t: (+ev.time || 0) * 1000, _i: i}); continue; }
    if (++verified > MAX_VERIFY) break;
    try {
      const ok = await crypto.subtle.verify(SIGN, await importPub(b.pk), unb64(env.s), enc.encode(env.b));
      if (!ok) continue;
    } catch (e) { continue; }
    const st = b.st || {};
    out.push({
      key, name, pk: b.pk, salt: b.salt, vault: b.vault, sv: b.sv, t: (+ev.time || 0) * 1000, _i: i,
      st: {life: num(st.life), run: num(st.run), dps: num(st.dps), ser: num(st.ser), resets: num(st.resets, 1e6),
           era: Math.min(DT.ERAS.length - 1, Math.floor(num(st.era))), ach: num(st.ach, 1e4), top: String(st.top || '').slice(0, 30),
           paused: !!st.paused, combo: num(st.combo), lvl: Math.max(1, num(st.lvl, 1e6)), cards: num(st.cards, 1e4),
           bosses: num(st.bosses), fevers: num(st.fevers), jackpots: num(st.jackpots), slotJackpots: num(st.slotJackpots), duelsWon: num(st.duelsWon), bigWins: num(st.bigWins),
           dup: Array.isArray(st.dup) ? st.dup.filter(id => cardIds.has(id)).slice(0, 40) : [],
           fr: Array.isArray(st.fr) ? st.fr.filter(k => typeof k === 'string' && KEY_RE.test(k)).slice(0, 60) : [],
           dif: Math.min(3, Math.floor(num(st.dif === undefined ? 1 : st.dif, 3))),
           // saison, défi du jour, boss du week-end, clan, médailles (social.js)
           ss: Math.floor(num(st.ss, 1e6)), sp: num(st.sp, 1e12), dd: Math.floor(num(st.dd, 1e7)), dv: num(st.dv, 1e9),
           wi: Math.floor(num(st.wi, 1e6)), wd: num(st.wd, 1e9), cn: clanName(st.cn),
           md: Array.isArray(st.md) ? [0, 1, 2].map(i => Math.floor(num(st.md[i], 999))) : [0, 0, 0],
           ver: /^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(String(st.ver)) ? String(st.ver) : ''},
      dl: b.dl && /^[0-9a-f]{12}$/.test(String(b.dl.id)) && typeof b.dl.to === 'string' && (b.dl.k === 'c' || b.dl.k === 'r')
        ? {id: b.dl.id, to: b.dl.to.slice(0, 32), k: b.dl.k, s: Math.min(999, num(b.dl.s)), w: Math.min(2, num(b.dl.w))} : null,
      tx: Array.isArray(b.tx) ? b.tx.slice(0, 8).filter(x => x && /^[0-9a-f]{12}$/.test(String(x.id)) && typeof x.to === 'string' && 'oanx'.includes(x.k) && String(x.k).length === 1 && cardIds.has(x.g) && cardIds.has(x.w))
        .map(x => ({id: x.id, to: x.to.slice(0, 32), k: x.k, g: x.g, w: x.w, t: Math.min(num(x.t), DT.now())})) : [],
      em: b.em && typeof b.em.id === 'string' && b.em.id.length < 20 ? {id: b.em.id, t: num(b.em.t)} : null,
    });
  }
  out.sort((a, b) => a.t - b.t || a._i - b._i);  // ordre chronologique (les défis et échanges en dépendent)
  return out;
}

/* Renvoie les messages vérifiés depuis le dernier relevé. Les imposteurs sont écartés.
 * Premier relevé : 12 h d'historique, sauf s'il dépasse 4 Mo (beaucoup de joueurs) : alors la dernière heure. */
let lastPollBytes = 0, lastPollMs = 0, lastPollCount = 0;
async function poll() {
  const t0 = performance.now();
  let txt;
  if (lastId) txt = await get(`since=${lastId}`, 12e6);
  else txt = await get('since=12h', FIRST_CAP) || await get('since=1h', 12e6);
  if (txt === null) { lastId = null; throw new Error('trop'); }
  const list = await parseLines(txt, true);
  const fresh = [], impostors = [];
  for (const m of list) {
    if (m.impostor || (known[m.key] && known[m.key] !== m.pk)) { impostors.push(m.name); continue; }
    if (!known[m.key]) { known[m.key] = m.pk; knownDirty = true; }
    directory[m.key] = m;
    fresh.push(m);
  }
  if (knownDirty) { knownDirty = false; LS.set('dt-known', known); }
  lastPollBytes = txt.length; lastPollMs = performance.now() - t0; lastPollCount = list.length;
  return {fresh, impostors};
}
let knownDirty = false;

DT.net = {
  TOPIC, nameKey, cleanName, checkName, register, login, resume, logout, publish, build, beacon, poll, exportCode, importCode,
  get paused() { return paused(); },
  get stats() { return {bytes: lastPollBytes, ms: lastPollMs, count: lastPollCount, budget: budget().n, pauseUntil}; },
  get me() { return me; },
  lastAccount() { const s = LS.get('dt-session'); return s && accounts()[s.key] ? accounts()[s.key].name : null; },
};

})(window.DT);
