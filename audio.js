/* Dopamine Tycoon : bruitages et musique synthétisés en direct (Web Audio, aucun fichier). */
window.DT = window.DT || {};
(function (DT) {
'use strict';

let ctx = null, master = null, sfx = null, music = null, padFilter = null, noiseBuf = null;
let opts = {sfx: true, music: true, vol: 0.7};
let era = 0, intensity = 0, chordIdx = 0, voices = [], padTimer = null;

const midi = n => 440 * Math.pow(2, (n - 69) / 12);

function init() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 4;
  master = ctx.createGain(); master.gain.value = opts.vol;
  master.connect(comp); comp.connect(ctx.destination);
  sfx = ctx.createGain(); sfx.gain.value = opts.sfx ? 1 : 0; sfx.connect(master);
  music = ctx.createGain(); music.gain.value = opts.music ? 0.32 : 0; music.connect(master);
  padFilter = ctx.createBiquadFilter(); padFilter.type = 'lowpass'; padFilter.frequency.value = 700; padFilter.Q.value = 0.7;
  padFilter.connect(music);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  nextChord();
  padTimer = setInterval(nextChord, 8000);
}

function tone({f, type = 'sine', t0 = 0, dur = 0.15, g = 0.2, attack = 0.005, to = null, dest = null, detune = 0}) {
  if (!ctx) return;
  const t = ctx.currentTime + t0;
  const o = ctx.createOscillator(), gn = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  gn.gain.setValueAtTime(0.0001, t);
  gn.gain.exponentialRampToValueAtTime(g, t + attack);
  gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(gn); gn.connect(dest || sfx);
  o.start(t); o.stop(t + dur + 0.05);
}
function noise({t0 = 0, dur = 0.2, g = 0.2, freq = 1200, q = 1, type = 'bandpass'}) {
  if (!ctx) return;
  const t = ctx.currentTime + t0;
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const gn = ctx.createGain();
  gn.gain.setValueAtTime(g, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(gn); gn.connect(sfx);
  s.start(t); s.stop(t + dur + 0.05);
}

/* Sons fréquents pré-enregistrés : les fabriquer à chaque tap coûtait trop cher (une dizaine de nœuds audio par tap).
 * On rejoue le même recette dans un OfflineAudioContext au chargement, puis on relit simplement le tampon. */
const baked = {};
function bake(name, dur, recipe) {
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!OAC) return Promise.resolve();
  const off = new OAC(1, Math.ceil(dur * 44100), 44100);
  const keep = [ctx, sfx, noiseBuf];
  ctx = off; sfx = off.destination;
  noiseBuf = off.createBuffer(1, off.sampleRate, off.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  try { recipe(); } finally { [ctx, sfx, noiseBuf] = keep; }
  return off.startRendering().then(buf => { baked[name] = buf; }).catch(() => {});
}
function play(name, rate = 1) {
  const buf = baked[name];
  if (!ctx || !buf) return false;
  const s = ctx.createBufferSource();
  s.buffer = buf; s.playbackRate.value = rate;
  s.connect(sfx); s.start();
  return true;
}
const TAP_F = 392, SLAM_F = 160, POP_F = 800;
let prepared = null;
function prepare() {
  if (prepared) return prepared;
  prepared = Promise.all([
    bake('tap', 0.16, () => { tone({f: TAP_F, type: 'triangle', dur: 0.09, g: 0.11}); tone({f: TAP_F * 2, type: 'sine', dur: 0.05, g: 0.03}); }),
    bake('slam', 0.22, () => { tone({f: SLAM_F, to: 48, dur: 0.13, g: 0.32}); noise({dur: 0.06, g: 0.12, freq: 900, type: 'lowpass'}); }),
    bake('pop', 0.14, () => { tone({f: POP_F, to: POP_F * 0.35, dur: 0.07, g: 0.22}); noise({dur: 0.025, g: 0.05, freq: 5000, type: 'highpass'}); }),
    bake('crunch', 0.45, () => { noise({dur: 0.28, g: 0.35, freq: 1700, q: 0.8}); noise({dur: 0.35, g: 0.25, freq: 380, type: 'lowpass'}); tone({f: 95, to: 38, dur: 0.32, g: 0.42}); }),
    bake('squeak', 0.34, () => { tone({f: 1100, to: 1750, type: 'triangle', dur: 0.12, g: 0.12}); tone({f: 1750, to: 900, type: 'triangle', dur: 0.16, g: 0.1, t0: 0.11}); noise({dur: 0.2, g: 0.12, freq: 1200, q: 0.7}); }),
    bake('wheelTick', 0.08, () => tone({f: 1800, type: 'square', dur: 0.02, g: 0.04})),
    bake('click', 0.08, () => tone({f: 2200, dur: 0.03, g: 0.025})),
    bake('scratch', 0.1, () => noise({dur: 0.06, g: 0.07, freq: 3800, q: 2})),
  ]);
  return prepared;
}

/* Nappe d'ambiance : quatre accords par chapitre, transposés, filtrés selon l'intensité du jeu. */
const PROG = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
const TRANSPOSE = [0, 2, -3, 5, -2, 3, 7];
function nextChord() {
  if (!ctx) return;
  const t = ctx.currentTime;
  for (const v of voices) { v.g.gain.cancelScheduledValues(t); v.g.gain.setValueAtTime(v.g.gain.value, t); v.g.gain.linearRampToValueAtTime(0.0001, t + 3); v.o.stop(t + 3.2); }
  voices = [];
  const chord = PROG[chordIdx++ % PROG.length];
  for (const n of chord) for (const det of [-7, 7]) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = midi(n + TRANSPOSE[era] - 12); o.detune.value = det;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.028, t + 2.5);
    o.connect(g); g.connect(padFilter); o.start(t);
    voices.push({o, g});
  }
  // basse douce
  const b = ctx.createOscillator(), bg = ctx.createGain();
  b.type = 'sine'; b.frequency.value = midi(chord[0] + TRANSPOSE[era] - 24);
  bg.gain.setValueAtTime(0.0001, t); bg.gain.linearRampToValueAtTime(0.09, t + 1.5);
  b.connect(bg); bg.connect(music); b.start(t);
  voices.push({o: b, g: bg});
}

const SCALE = [0, 2, 4, 7, 9];
const A = {
  init, prepare,
  get ready() { return !!ctx; },
  set(o) {
    Object.assign(opts, o);
    if (!ctx) return;
    const t = ctx.currentTime;
    master.gain.setTargetAtTime(opts.vol, t, 0.05);
    sfx.gain.setTargetAtTime(opts.sfx ? 1 : 0, t, 0.05);
    music.gain.setTargetAtTime(opts.music ? 0.32 : 0, t, 0.3);
  },
  setEra(i) { era = Math.max(0, Math.min(TRANSPOSE.length - 1, i)); },
  setIntensity(x) {
    intensity = Math.max(0, Math.min(1, x));
    if (padFilter) padFilter.frequency.setTargetAtTime(500 + intensity * 1600, ctx.currentTime, 1.5);
  },
  tap(combo) {
    const c = Math.min(combo, 19);
    const f = midi(67 + SCALE[c % 5] + 12 * Math.floor(c / 5) / 1.5 + TRANSPOSE[era]);
    if (play('tap', f / TAP_F)) return;
    tone({f, type: 'triangle', dur: 0.09, g: 0.11});
    tone({f: f * 2, type: 'sine', dur: 0.05, g: 0.03});
  },
  crit() {
    tone({f: 190, to: 55, type: 'sine', dur: 0.4, g: 0.5});
    noise({dur: 0.25, g: 0.18, freq: 3000});
    tone({f: 1568, type: 'square', dur: 0.12, g: 0.04, t0: 0.02});
    tone({f: 2093, type: 'square', dur: 0.16, g: 0.035, t0: 0.08});
  },
  buy() { tone({f: 988, type: 'square', dur: 0.06, g: 0.04}); tone({f: 1319, type: 'square', dur: 0.12, g: 0.04, t0: 0.055}); },
  denied() { tone({f: 150, type: 'sawtooth', dur: 0.12, g: 0.05}); },
  upgrade() { [523, 659, 784, 1047].forEach((f, i) => tone({f, type: 'triangle', dur: 0.2, g: 0.08, t0: i * 0.05})); },
  goldenSpawn() { tone({f: 1760, dur: 0.18, g: 0.06}); tone({f: 2349, dur: 0.3, g: 0.05, t0: 0.09}); },
  golden() {
    [1319, 1568, 2093, 2637].forEach((f, i) => tone({f, dur: 0.3, g: 0.1, t0: i * 0.08}));
    noise({dur: 0.6, g: 0.05, freq: 8000, type: 'highpass', t0: 0.1});
  },
  achievement() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone({f, type: 'triangle', dur: 0.35, g: 0.09, t0: i * 0.07}));
    [2093, 2637, 3136].forEach((f, i) => tone({f, dur: 0.5, g: 0.03, t0: 0.35 + i * 0.06}));
  },
  event() { tone({f: 660, type: 'square', dur: 0.12, g: 0.05}); tone({f: 880, type: 'square', dur: 0.2, g: 0.05, t0: 0.14}); },
  era() {
    if (!ctx) return;
    tone({f: 55, to: 110, type: 'sawtooth', dur: 3.2, g: 0.18, attack: 1.2});
    noise({dur: 3, g: 0.06, freq: 400, q: 0.5, type: 'lowpass'});
    [0, 4, 7, 12].forEach((s, i) => tone({f: midi(57 + s + TRANSPOSE[era]), type: 'triangle', dur: 3, g: 0.07, attack: 0.8, t0: 0.9 + i * 0.12}));
  },
  detox() {
    [1, 2.76, 5.4, 8.93].forEach((m, i) => tone({f: 98 * m, dur: 4.5 - i, g: 0.25 / (i + 1), attack: 0.01}));
  },
  click() { if (!play('click')) tone({f: 2200, dur: 0.03, g: 0.025}); },
  colDone(c = 0) { [0, 4, 7, 12].forEach((s, i) => tone({f: midi(72 + c + s), type: 'triangle', dur: 0.14, g: 0.08, t0: i * 0.04})); },
  chestGet() { [523, 784, 1047].forEach((f, i) => tone({f, type: 'square', dur: 0.1, g: 0.05, t0: i * 0.06})); },
  chestShake() { for (let i = 0; i < 6; i++) tone({f: 120 + i * 20, type: 'square', dur: 0.05, g: 0.06, t0: i * 0.09}); },
  chestOpen() { noise({dur: 0.5, g: 0.2, freq: 3000, q: 0.5}); tone({f: 200, to: 1200, type: 'sawtooth', dur: 0.45, g: 0.08}); [784, 988, 1175, 1568].forEach((f, i) => tone({f, type: 'triangle', dur: 0.4, g: 0.08, t0: 0.3 + i * 0.06})); },
  card(r) {
    const k = ['common', 'rare', 'epic', 'legendary', 'champion'].indexOf(r);
    tone({f: 600, to: 300, dur: 0.12, g: 0.1}); noise({dur: 0.15, g: 0.08, freq: 4000, type: 'highpass'});
    const base = [523, 587, 659, 784, 880][k];
    [0, 4, 7, 12, 16, 19].slice(0, 3 + k).forEach((s, i) => tone({f: base * Math.pow(2, s / 12), type: 'triangle', dur: 0.3 + k * 0.15, g: 0.07 + k * 0.012, t0: 0.08 + i * 0.07}));
    if (k >= 3) { tone({f: 55, to: 110, type: 'sawtooth', dur: 1.6, g: 0.15, attack: 0.3}); noise({dur: 1.5, g: 0.05, freq: 8000, type: 'highpass', t0: 0.3}); }
  },
  levelUp() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone({f, type: 'square', dur: 0.14, g: 0.05, t0: i * 0.07})); tone({f: 1568, type: 'triangle', dur: 0.8, g: 0.08, t0: 0.5}); },
  fever() {
    for (let i = 0; i < 12; i++) tone({f: 220 * Math.pow(2, i / 4), type: 'sawtooth', dur: 0.12, g: 0.05, t0: i * 0.04});
    noise({dur: 1.2, g: 0.08, freq: 2500, q: 0.4, t0: 0.2}); tone({f: 55, to: 220, type: 'sawtooth', dur: 1, g: 0.14, attack: 0.2});
  },
  wheelTick() { if (!play('wheelTick')) tone({f: 1800, type: 'square', dur: 0.02, g: 0.04}); },
  jackpot() {
    [523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) => tone({f, type: 'square', dur: 0.18, g: 0.05, t0: i * 0.06}));
    for (let i = 0; i < 14; i++) tone({f: 2000 + Math.random() * 2500, dur: 0.06, g: 0.04, t0: 0.4 + i * 0.07});
    tone({f: 1047, type: 'triangle', dur: 1.2, g: 0.08, t0: 0.45}); tone({f: 1319, type: 'triangle', dur: 1.2, g: 0.06, t0: 0.45});
  },
  megaReady() { [659, 988, 1319, 1976].forEach((f, i) => tone({f, type: 'square', dur: 0.12, g: 0.05, t0: i * 0.06})); tone({f: 55, to: 165, type: 'sawtooth', dur: 0.5, g: 0.1, attack: 0.05}); },
  questDone() { [784, 988, 1175].forEach((f, i) => tone({f, type: 'triangle', dur: 0.16, g: 0.08, t0: i * 0.06})); },
  boss() { for (let i = 0; i < 3; i++) { tone({f: 440, type: 'sawtooth', dur: 0.18, g: 0.07, t0: i * 0.4}); tone({f: 330, type: 'sawtooth', dur: 0.18, g: 0.07, t0: i * 0.4 + 0.2}); } },
  bossKill() {
    noise({dur: 0.6, g: 0.4, freq: 900, q: 0.5}); tone({f: 80, to: 30, dur: 0.7, g: 0.5});
    [392, 523, 659, 784, 1047].forEach((f, i) => tone({f, type: 'square', dur: 0.25, g: 0.06, t0: 0.3 + i * 0.09}));
  },
  daily() { [1047, 1319, 1568, 2093].forEach((f, i) => tone({f, dur: 0.5, g: 0.06, t0: i * 0.12})); },
  scratch() { if (!play('scratch', 0.85 + Math.random() * 0.4)) noise({dur: 0.06, g: 0.07, freq: 3200 + Math.random() * 1500, q: 2}); },
  emote() { tone({f: 300, to: 900, type: 'triangle', dur: 0.12, g: 0.12}); tone({f: 900, to: 500, type: 'triangle', dur: 0.18, g: 0.1, t0: 0.11}); },
  scream() { tone({f: 220, to: 160, type: 'sawtooth', dur: 1.1, g: 0.12, attack: 0.05}); tone({f: 331, to: 240, type: 'sawtooth', dur: 1.1, g: 0.07, attack: 0.05}); noise({dur: 1, g: 0.08, freq: 900, q: 0.6}); },
  rain() { noise({dur: 5, g: 0.06, freq: 5000, type: 'highpass'}); [392, 370, 330, 294].forEach((f, i) => tone({f, type: 'triangle', dur: 0.9, g: 0.06, t0: i * 0.5})); },
  slam(combo = 0) {
    if (play('slam', (SLAM_F + Math.min(combo, 20) * 4) / SLAM_F)) return;
    tone({f: 160 + Math.min(combo, 20) * 4, to: 48, dur: 0.13, g: 0.32});
    noise({dur: 0.06, g: 0.12, freq: 900, type: 'lowpass'});
  },
  pop() {
    const f = 620 + Math.random() * 380;
    if (play('pop', f / POP_F)) return;
    tone({f, to: f * 0.35, dur: 0.07, g: 0.22});
    noise({dur: 0.025, g: 0.05, freq: 5000, type: 'highpass'});
  },
  crunch() {
    if (play('crunch', 0.9 + Math.random() * 0.2)) return;
    noise({dur: 0.28, g: 0.35, freq: 1700, q: 0.8});
    noise({dur: 0.35, g: 0.25, freq: 380, type: 'lowpass'});
    tone({f: 95, to: 38, dur: 0.32, g: 0.42});
  },
  squeak() {
    if (play('squeak', 0.95 + Math.random() * 0.1)) return;
    tone({f: 1100, to: 1750, type: 'triangle', dur: 0.12, g: 0.12});
    tone({f: 1750, to: 900, type: 'triangle', dur: 0.16, g: 0.1, t0: 0.11});
    noise({dur: 0.2, g: 0.12, freq: 1200, q: 0.7});
  },
  popComplete() {
    for (let i = 0; i < 8; i++) { const f = 500 * Math.pow(2, i / 6); tone({f, to: f * 0.4, dur: 0.08, g: 0.16, t0: i * 0.045}); }
    [1047, 1319, 1568].forEach((f, i) => tone({f, type: 'triangle', dur: 0.4, g: 0.07, t0: 0.38 + i * 0.05}));
  },
  comboBreak() { tone({f: 440, to: 110, type: 'sawtooth', dur: 0.35, g: 0.06}); },
};
DT.audio = A;

})(window.DT);
