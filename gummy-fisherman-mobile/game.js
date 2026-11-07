// Gummy the Fisherman — the phone game for solo students (2026-11-07). Foxino is the fisherman.
// A game = 3 rounds at one place (Day → Sunset → Night). Every round: 4 gap-fill questions first (learning first: each
// answer visibly grows the fish and widens the net), then ONE try on the catch bar, then the catch. At the end the three
// catches go on the scale and the points are the ONE score. Places, fish, junk, catch bar, kilos and points follow
// Production (gummy-fisherman-copy/index.html). No shop, no money, no multiplayer, no video.
(() => {
'use strict';
const $ = (id) => document.getElementById(id);
const R = Math.random, clamp = (v, a, b) => (v < a ? a : v > b ? b : v), pick = (a) => a[(R() * a.length) | 0];
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = (R() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const fmt = (n) => Math.round(n).toLocaleString('en-US');
const fmtKg = (kg) => (kg < 10 ? kg.toFixed(2) : kg.toFixed(1)) + ' kg';
const now = () => performance.now();
const app = $('app'), scene = $('scene'), panel = $('panel');
const LAND = matchMedia('(min-aspect-ratio: 1/1)');

/* ================= save (own key: the old client keeps its own "m.*" keys) ================= */
const SAVE_KEY = 'gummy-phone-v2';
const save = {place: 'lake', best: {lake: 0, mountain: 0, sea: 0}, open: {lake: true}, index: {}, packs: [], sound: true, music: true, calm: false, time: 12, games: 0};
try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}'); Object.assign(save, s); save.best = Object.assign({lake: 0, mountain: 0, sea: 0}, s.best); save.open = Object.assign({lake: true}, s.open); } catch (e) {}
const store = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} };

/* ================= the places, rounds and rules (numbers from Production) ================= */
const D = window.GF_DATA || {fish: {lake: [], mountain: [], sea: []}, junk: {lake: [], mountain: [], sea: []}, desc: {}};
// need = the best score at the place before that opens this one (picked from test runs: about what a decent player scores)
const PLACES = [
  {id: 'lake', art: 'lake', name: 'Glimmerwater Lake', short: 'Glimmerwater', sub: 'The big lake by the old dock', menu: 'art2/menu.webp'},
  {id: 'mountain', art: 'frost', name: 'Frostfall Lake', short: 'Frostfall', sub: 'High up under the snowy peaks', need: {from: 'lake', score: 1200}},
  {id: 'sea', art: 'sea', name: 'Sapphire Sea', short: 'Sapphire', sub: 'Sandy beach and the open sea', need: {from: 'mountain', score: 1500}},
];
PLACES.forEach((p) => { p.title = `art2/title-${p.art}.webp`; p.scale = `art2/scale-${p.art}.webp`; p.scenes = ['day', 'sunset', 'night'].map((t) => `art2/${p.art}-${t}.webp`); p.menu = p.menu || p.scenes[0]; });
const placeOf = (id) => PLACES.find((p) => p.id === id) || PLACES[0];
const isOpen = (p) => !p.need || !!save.open[p.id] || (save.best[p.need.from] || 0) >= p.need.score;
const ROUNDS = [
  {name: 'Day', sub: 'Easy sentences', mult: 1, c: '#ffe066'},
  {name: 'Sunset', sub: 'Harder sentences', mult: 1.5, c: '#ffb070'},
  {name: 'Night', sub: 'Hardest sentences', mult: 2, c: '#a9c8ff'},
];
const Q_PER_ROUND = 4;
// catch bar (Production MG): net width from the round's answers, crossing time per round, 10 s to tap, 0.7 s wait, 1.2 % grace
const MG = {NET: [.09, .34], CROSS: [1.35, 1.2, 1.05], TIME: 10, GRACE: .012, READY: 700};
// kilos (Production): a right answer = (0.3 + 0.7 × speed) kg × the player's own streak bonus (×1, ×1.25 … up to ×3.5)
const KG = [.3, 1];
const streakMult = (run) => 1 + .25 * clamp(run - 1, 0, 10);
const answerKg = (ok, speed, run) => (ok ? (KG[0] + (KG[1] - KG[0]) * speed) * streakMult(run) : 0);
// points (Production PTS): fish = 100 × kg (junk 0), speed = up to 50 per right answer; here × the round's multiplier
const PTS = {KG: 100, SPEED: 50};
const FAST = .65; // answered with this share of the time still left = FAST!
// the round score out of 10 (Production roundScore: each answer worth 5 = 3 for right + up to 2 for speed) over the round's 4 questions
const roundScore = (ans) => Math.round(ans.reduce((a, x) => a + (x.ok ? 3 + 2 * x.speed : 0), 0) / (Q_PER_ROUND * 5) * 10);
const netFor = (ans) => MG.NET[0] + (MG.NET[1] - MG.NET[0]) * roundScore(ans) / 10;
const netWord = (s) => (s >= 9 ? 'huge' : s >= 6 ? 'big' : s >= 3 ? 'small' : 'tiny');

/* ================= sound: small WebAudio synth, no files ================= */
let AC = null, master = null, musicBus = null;
function ac() {
  if (!AC) {
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      master = AC.createGain(); master.gain.value = .6; master.connect(AC.destination);
      musicBus = AC.createGain(); musicBus.gain.value = .5; musicBus.connect(master);
    } catch (e) { AC = null; }
  }
  if (AC && AC.state === 'suspended') AC.resume().catch(() => {});
  return AC;
}
function tone(f, d = .3, type = 'sine', vol = .08, slide = 0, delay = 0, bus) {
  if (!save.sound) return; const a = ac(); if (!a) return;
  const t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + d);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + d);
  o.connect(g).connect(bus || master); o.start(t); o.stop(t + d + .05);
}
let noiseBuf = null;
function noise(d = .3, vol = .1, freq = 1200, delay = 0, type = 'bandpass') {
  if (!save.sound) return; const a = ac(); if (!a) return;
  if (!noiseBuf) { noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate); const c = noiseBuf.getChannelData(0); for (let i = 0; i < c.length; i++) c[i] = R() * 2 - 1; }
  const t = a.currentTime + delay, s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  s.buffer = noiseBuf; f.type = type; f.frequency.value = freq;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
  s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + d + .05);
}
const PENTA = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760, 2093, 2349, 2637];
const sfx = {
  click: () => tone(880, .07, 'sine', .05),
  right: (n) => { const k = clamp(n - 1, 0, 8); [0, 2, 4].forEach((s, i) => tone(PENTA[k + s] * .5, .4, 'triangle', .06, 0, i * .06)); tone(PENTA[k + 4], .5, 'sine', .04, 0, .18); },
  puff: () => { noise(.35, .12, 650); tone(220, .3, 'sine', .07, .7); },
  tick: () => tone(1500, .035, 'square', .02),
  combo: () => { [0, 2, 4, 5, 7, 9].forEach((k, i) => tone(PENTA[k], .32, 'triangle', .05, 0, i * .05)); noise(.4, .04, 6000, .1); },
  whoosh: () => { noise(.35, .12, 1800); tone(300, .3, 'sine', .03, 2.2); },
  ready: () => tone(660, .12, 'sine', .06),
  go: () => { tone(880, .14, 'triangle', .07); tone(1320, .2, 'sine', .04, 0, .05); },
  hit: () => { noise(.18, .25, 2400); tone(196, .25, 'sine', .14, .5); [0, 2, 4, 7].forEach((k, i) => tone(PENTA[k + 2], .5, 'triangle', .06, 0, .06 + i * .06)); },
  miss: () => { tone(392, .26, 'triangle', .07, .85); tone(294, .45, 'triangle', .07, .75, .2); },
  splash: () => { noise(.55, .2, 700, 0, 'lowpass'); noise(.35, .08, 3200, .06); },
  coin: (i) => { const f = PENTA[Math.min(i, PENTA.length - 1)] * (1 + (R() - .5) * .02); tone(f, .16, 'triangle', .045); tone(f * 2, .12, 'sine', .015); },
  thud: () => { tone(120, .2, 'sine', .16, .6); noise(.14, .12, 380); },
  count: () => tone(1200, .03, 'triangle', .02),
  fanfare: () => { [0, 2, 4, 7, 9, 12].forEach((k, i) => tone(PENTA[Math.min(k, 12)], .45, 'triangle', .06, 0, i * .08)); [0, 4].forEach((k) => tone(PENTA[k] / 2, 1.2, 'sine', .05, 0, .5)); },
  nope: () => tone(180, .2, 'triangle', .06, .8),
};
// soft background music: a pentatonic pluck tune over a slow bass, a different scale for day / sunset / night
const MUSIC = {timer: 0, t: 0, step: 0, mood: 0};
const TUNES = [
  {root: 262, bpm: 100, notes: [0, 4, 7, 9, 12, 9, 7, 4, 2, 4, 7, 12, 14, 12, 9, 7]},
  {root: 220, bpm: 92, notes: [0, 3, 7, 10, 12, 10, 7, 3, 5, 7, 10, 12, 15, 12, 10, 7]},
  {root: 196, bpm: 80, notes: [0, 7, 12, 7, 3, 7, 10, 7, 0, 5, 12, 10, 7, 3, 5, 7]},
];
const semi = (r, n) => r * Math.pow(2, n / 12);
function musicTick() {
  if (!AC || !save.music || !save.sound || document.hidden) return;
  const T = TUNES[MUSIC.mood], sp = 60 / T.bpm / 2;
  if (MUSIC.t < AC.currentTime) MUSIC.t = AC.currentTime + .05;
  while (MUSIC.t < AC.currentTime + .3) {
    const s = MUSIC.step++ % 32, d = MUSIC.t - AC.currentTime;
    if (s % 2 === 0 || R() < .3) tone(semi(T.root, T.notes[(s >> 1) % 16]), .5, 'triangle', .022, 0, d, musicBus);
    if (s % 8 === 0) tone(semi(T.root / 2, [0, 5, 7, 3][(s >> 3) % 4]), 1.4, 'sine', .035, 0, d, musicBus);
    MUSIC.t += sp;
  }
}
function musicOn() { if (MUSIC.timer || !save.music) return; if (!ac()) return; MUSIC.timer = setInterval(musicTick, 120); }
function musicOff() { clearInterval(MUSIC.timer); MUSIC.timer = 0; }
// haptics: Android only (iOS has no navigator.vibrate); never in calm mode
const buzz = (p) => { if (save.calm) return; try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} };

/* ================= English: the A0–A2 gap-fill packages (same as the other Fugio games) ================= */
const FALLBACK = [{id: 'basic', level: 'A1', kind: 'Grammar', n: 1, title: 'Basic grammar', subtitle: '', count: 18, rounds: [
  ['She [has|have|having] a big dog.', 'I [am|is|are] ten years old.', 'They [are|is|am] my friends.', 'He [likes|like|liking] pizza.', 'We [have|has|having] a cat.', 'It [is|are|am] cold today.'],
  ['I [went|go|goes] to school yesterday.', 'She [was|were|be] at home.', 'They [played|play|plays] football last week.', 'He [didn\'t|don\'t|doesn\'t] see me.', 'We [saw|see|seen] a film.', 'Did you [like|liked|likes] it?'],
  ['I have [never|ever|yet] been to London.', 'If it rains, we [will|would|were] stay home.', 'She is [taller|tall|tallest] than me.', 'He [has|have|had] already eaten.', 'I [used|use|using] to live here.', 'This is [the best|better|good] day ever.']]}];
const PACKS = (() => { const all = window.GUMMY_PACKAGES && window.GUMMY_PACKAGES.length ? window.GUMMY_PACKAGES : FALLBACK; return window.FugioPacks ? FugioPacks.sort(all) : all; })();
save.packs = (save.packs || []).filter((id) => PACKS.some((p) => p.id === id));
if (!save.packs.length && PACKS.length) save.packs = [PACKS[0].id];
const packNow = () => (window.FugioPacks ? FugioPacks.merge(PACKS, save.packs) : PACKS[0]) || PACKS[0];
// the three options always keep the same order for the same words (so "a" / "an" never swap sides)
const SLOT = new Set(['do', 'does', "don't", "doesn't", 'did', "didn't", 'was', 'were', "wasn't", "weren't", 'is', 'are', 'am',
  "isn't", "aren't", 'a', 'an', 'the', 'more', 'most', 'less', 'least', 'because', 'so', 'and', 'but', 'or', 'have', 'has', 'not']);
const slotKey = (t) => t.toLowerCase().replace(/[^a-z' ]/g, '').split(/\s+/).filter(Boolean).map((w) => (SLOT.has(w) ? w : '_')).join(' ');
function mixComparisons(q) {
  const m = q.match(/^(.*)\[([^|\]]+)\|(the [^|\]]+)\]( \([^)]*\)) than [^.?!]*([.?!])$/);
  return m && R() < .5 ? `${m[1]}[${m[3]}|${m[2]}]${m[4]} of all${m[5]}` : q;
}
function fillChoices(q) {
  const m = q.match(/\[([^\]]+)\]/);
  if (!m) return null;
  const [right, ...wrong] = m[1].split('|');
  const words = [{text: right, ok: true}, ...shuffle(wrong).slice(0, 2).map((t) => ({text: t, ok: false}))];
  words.sort((x, y) => slotKey(x.text).localeCompare(slotKey(y.text)) || x.text.localeCompare(y.text));
  words.before = q.slice(0, m.index); words.after = q.slice(m.index + m[0].length); words.right = right;
  return words;
}
const usedQ = new Set();
// Day asks the package's easy third, Sunset the middle third, Night the hardest
function pickSentence(r) {
  const pk = packNow(); if (!pk) return null;
  const mine = pk.rounds[clamp(r, 0, 2)] || [], rest = pk.rounds.filter((_, i) => i !== r).flat();
  const free = (l) => l.filter((q) => !usedQ.has(q) && /\[[^\]]+\|[^\]]+\]/.test(q));
  let pool = free(mine); if (!pool.length) pool = free(rest);
  if (!pool.length) { usedQ.clear(); pool = free(mine).length ? free(mine) : free(rest); }
  const q = pick(pool); usedQ.add(q); return mixComparisons(q);
}
const hints = (t) => esc(t).replace(/\(([^)]*)\)/g, '<i>($1)</i>');
const fullSentence = (w) => `${hints(w.before)}<b>${esc(w.right)}</b>${hints(w.after)}`;

/* ================= pictures ================= */
const imgCache = new Map();
function loadImg(src) {
  if (!imgCache.has(src)) imgCache.set(src, new Promise((res) => { const im = new Image(); im.decoding = 'async'; im.onload = () => (im.decode ? im.decode().catch(() => {}) : Promise.resolve()).then(() => res(im)); im.onerror = () => res(null); im.src = src; }));
  return imgCache.get(src);
}
const timeout = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(r, ms))]);
const fishSrc = (f) => `fish2/${f.file}.webp`;
const CB_PARTS = ['bar', 'post', 'net', 'fish', 'button', 'deco'];
function placeAssets(p) { return [...p.scenes, p.scale, p.title, 'art2/foxino-catch.webp', 'art2/foxino-miss.webp', ...CB_PARTS.map((x) => `art2/catchbar/${p.art}-${x}.webp`)]; }
function themeBar(p) {
  for (const el of [$('mg'), $('pBar'), $('netP')]) {
    el.dataset.mgloc = p.art;
    CB_PARTS.forEach((x) => el.style.setProperty('--mg-' + x, `url(art2/catchbar/${p.art}-${x}.webp)`));
  }
}

/* ================= layout: where the picture sits ================= */
let ptop = innerHeight;
const hudBottom = () => { const r = $('hud').getBoundingClientRect(); return r.bottom; };
// mode 'cover' = fill the picture area (Foxino a little left of the middle); 'scale' = the weigh-in, the tray in view above the cards
function fitBg(el) {
  if (!el.naturalWidth) return;
  const W = scene.clientWidth, H = scene.clientHeight, land = LAND.matches, ar = el.naturalWidth / el.naturalHeight;
  const mode = el.dataset.mode || 'cover', visH = land ? H : Math.max(120, ptop);
  const ih = Math.max(W / ar, H), iw = ih * ar;
  let top = 0;
  const fx = mode === 'menu' ? .5 : mode === 'scale' ? .5 : .42;
  if (!land) {
    if (mode === 'scale') top = clamp(visH * .64 - .39 * ih, -.3 * ih, 0);
    else if (mode === 'cover') top = clamp(visH - .5 * ih, -.12 * ih, 0); // a tall card area: lift the picture so Foxino stays in view
  }
  const left = clamp(W / 2 - fx * iw, W - iw, 0);
  el.style.width = iw.toFixed(1) + 'px'; el.style.height = ih.toFixed(1) + 'px'; el.style.transform = `translate(${left.toFixed(1)}px,${top.toFixed(1)}px)`;
  el.classList.toggle('nofade', ih + top >= H - 1);
  el._fit = {left, top, iw, ih};
}
function fitAll() {
  const r = panel.getBoundingClientRect(), a = app.getBoundingClientRect();
  const sec = panel.querySelector('.sec.on');
  ptop = LAND.matches ? a.height : (sec ? sec.getBoundingClientRect().top - a.top - 10 : a.height);
  app.style.setProperty('--ptop', Math.round(ptop) + 'px');
  fitBg($('bgA')); fitBg($('bgB'));
  placeTray();
}
let fitRaf = 0;
const fitSoon = () => { cancelAnimationFrame(fitRaf); fitRaf = requestAnimationFrame(fitAll); };
new ResizeObserver(fitSoon).observe(panel);
addEventListener('resize', fitSoon);
LAND.addEventListener?.('change', fitSoon);

let bgCur = $('bgA'), bgSrc = '';
async function setBg(src, mode = 'cover') {
  if (src === bgSrc) { bgCur.dataset.mode = mode; fitBg(bgCur); return; }
  bgSrc = src;
  const im = await timeout(loadImg(src), 4000);
  if (bgSrc !== src) return;
  const next = bgCur.id === 'bgA' ? $('bgB') : $('bgA');
  next.dataset.mode = mode; next.src = src;
  if (!next.complete) await new Promise((r) => { next.onload = next.onerror = r; setTimeout(r, 1500); });
  fitBg(next);
  next.classList.add('on'); bgCur.classList.remove('on'); bgCur = next;
  $('panelBg').style.backgroundImage = `url(${src})`;
  if (im) sampleWater(im);
}
// the colour under the picture (a short phone shows a band of it below the picture): the average of its bottom edge
function sampleWater(im) {
  try {
    const c = document.createElement('canvas'); c.width = 8; c.height = 2; const x = c.getContext('2d', {willReadFrequently: true});
    x.drawImage(im, 0, im.naturalHeight * .94, im.naturalWidth, im.naturalHeight * .06, 0, 0, 8, 2);
    const d = x.getImageData(0, 0, 8, 2).data; let r = 0, g = 0, b = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
    const n = d.length / 4, k = .78;
    app.style.setProperty('--water', `rgb(${(r / n * k) | 0},${(g / n * k) | 0},${(b / n * k) | 0})`);
  } catch (e) {}
}
// little lights drifting over the water (fireflies at night)
function specks(night) {
  const box = $('specks'); box.classList.toggle('night', night);
  if (!box.children.length) for (let i = 0; i < 9; i++) { const s = document.createElement('i'); box.appendChild(s); }
  [...box.children].forEach((s) => {
    s.style.left = (6 + R() * 88) + '%'; s.style.top = (night ? 18 + R() * 36 : 32 + R() * 22) + '%';
    s.style.setProperty('--dx', ((R() - .5) * 60) + 'px'); s.style.setProperty('--dy', (-20 - R() * 50) + 'px');
    s.style.animationDelay = (R() * 6).toFixed(2) + 's'; s.style.animationDuration = (5 + R() * 4).toFixed(2) + 's';
  });
}

/* ================= small effects ================= */
const fx = $('fx');
const center = (el) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
function confetti(x, y, n = 26, cols = ['#ffd23f', '#ff6fd0', '#7dffb0', '#6fe0ff', '#ffffff', '#ff9f1c']) {
  if (save.calm) n = Math.ceil(n / 3);
  for (let i = 0; i < n; i++) {
    const d = document.createElement('i'); d.className = 'conf';
    d.style.cssText = `left:${x}px;top:${y}px;background:${cols[i % cols.length]}`;
    fx.appendChild(d);
    const a = R() * Math.PI * 2, v = 60 + R() * 140, dx = Math.cos(a) * v, dy = Math.sin(a) * v - 90;
    d.animate([{transform: 'translate(-50%,-50%) rotate(0)', opacity: 1},
      {transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy + 170}px)) rotate(${(R() * 720 - 360) | 0}deg)`, opacity: 0}],
    {duration: 900 + R() * 500, easing: 'cubic-bezier(.2,.65,.4,1)'}).onfinish = () => d.remove();
  }
}
function sparks(x, y, n = 10, col = '#fff') {
  if (save.calm) n = Math.ceil(n / 2);
  for (let i = 0; i < n; i++) {
    const s = document.createElement('i'); s.className = 'spark'; s.style.left = x + 'px'; s.style.top = y + 'px'; s.style.background = col; fx.appendChild(s);
    const a = (i / n) * Math.PI * 2 + R() * .4, v = 34 + R() * 40;
    s.animate([{transform: 'scale(1)', opacity: 1}, {transform: `translate(${Math.cos(a) * v}px,${Math.sin(a) * v}px) scale(.2)`, opacity: 0}],
      {duration: 420 + R() * 200, easing: 'cubic-bezier(.2,.8,.4,1)'}).onfinish = () => s.remove();
  }
}
// a word that pops up and flies to a target (or just rises)
function floatText(html, x, y, cls = '', to = null, ms = 700) {
  const el = document.createElement('div'); el.className = 'float ' + cls; el.innerHTML = html; el.style.left = x + 'px'; el.style.top = y + 'px'; fx.appendChild(el);
  const frames = to ? [{transform: 'translate(-50%,-50%) scale(.4)', opacity: 0}, {transform: 'translate(-50%,-90%) scale(1.25)', opacity: 1, offset: .25},
    {transform: 'translate(-50%,-90%) scale(1)', opacity: 1, offset: .45}, {transform: `translate(calc(-50% + ${to[0] - x}px),calc(-50% + ${to[1] - y}px)) scale(.55)`, opacity: .9}]
    : [{transform: 'translate(-50%,-50%) scale(.4)', opacity: 0}, {transform: 'translate(-50%,-80%) scale(1.25)', opacity: 1, offset: .2},
      {transform: 'translate(-50%,-100%) scale(1)', opacity: 1, offset: .7}, {transform: 'translate(-50%,-160%) scale(1)', opacity: 0}];
  return new Promise((res) => { el.animate(frames, {duration: ms, easing: 'cubic-bezier(.3,.7,.4,1)'}).onfinish = () => { el.remove(); res(); }; });
}
function flash(strength = .8) {
  const f = $('flash'); const s = save.calm ? Math.min(.25, strength) : strength;
  f.animate([{opacity: s}, {opacity: s, offset: .3}, {opacity: 0}], {duration: 180, easing: 'ease-out'});
}
function shake() { if (save.calm) return; app.classList.remove('shake'); void app.offsetWidth; app.classList.add('shake'); }
function banner(text, green = false) {
  const b = $('banner'); b.textContent = text; b.classList.toggle('green', green); b.classList.remove('on'); void b.offsetWidth; b.classList.add('on');
}
let toastT = 0;
function toast(html) { const t = $('toast'); t.innerHTML = html; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600); }
const popEl = (el, cls = 'pop') => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
// numbers that count up
function countTo(el, from, to, ms, fmtFn = fmt, tick) {
  return new Promise((res) => {
    const t0 = now(); let last = -1;
    const step = () => {
      const k = clamp((now() - t0) / ms, 0, 1), e = 1 - Math.pow(1 - k, 3), v = from + (to - from) * e;
      el.textContent = fmtFn(v);
      if (tick) { const s = Math.floor(k * 14); if (s !== last) { last = s; tick(); } }
      if (k < 1) requestAnimationFrame(step); else res();
    };
    step();
  });
}

/* ================= game flow helpers ================= */
let G = null, SPEED = 1; // SPEED > 1 only in automatic tests (shorter waits)
// waits that stop while the game is paused, and end early when the game is left
function wait(ms) {
  const me = G;
  return new Promise((res) => {
    let left = ms / SPEED, last = now();
    const tick = () => {
      if (me && G !== me) return res();
      const t = now(); if (!(G && G.paused)) left -= t - last; last = t;
      if (left <= 0) res(); else setTimeout(tick, Math.min(left, 60));
    };
    setTimeout(tick, Math.min(left, 60));
  });
}
const alive = (me) => G === me && !me.over;
// resolves on a tap on one of the elements (or Space / Enter), or after ms
function tapOn(els, ms = 0, keys = true) {
  const me = G;
  return new Promise((res) => {
    let done = false; const fin = () => { if (done) return; done = true; els.forEach((e) => e.removeEventListener('pointerdown', fin)); removeEventListener('keydown', key); res(); };
    const key = (e) => { if (keys && (e.key === ' ' || e.key === 'Enter') && !e.repeat && $('ovPause').hidden) { e.preventDefault(); fin(); } };
    els.forEach((e) => e.addEventListener('pointerdown', fin)); addEventListener('keydown', key);
    if (ms) wait(ms).then(fin);
    const chk = setInterval(() => { if (me && G !== me) { clearInterval(chk); fin(); } if (done) clearInterval(chk); }, 200);
  });
}
function setScreen(s) { app.classList.remove('scr-menu', 'scr-game', 'scr-res'); app.classList.add('scr-' + s); }
function setPhase(p) { app.classList.remove('ph-intro', 'ph-quiz', 'ph-bar', 'ph-catch'); if (p) app.classList.add('ph-' + p); }
function showSec(id) {
  panel.querySelectorAll('.sec').forEach((s) => s.classList.toggle('on', s.id === id));
  fitSoon();
}
function setScore(v, pop = false) { $('scoreNum').textContent = fmt(v); if (pop) popEl($('scorePill')); }
function setRoundPill(r) {
  $('rpName').textContent = ROUNDS[r].name.toUpperCase();
  $('rpMult').textContent = '×' + ROUNDS[r].mult;
  [...$('roundPill').querySelectorAll('.dots i')].forEach((d, i) => { d.className = i < r ? 'done' : i === r ? 'on' : ''; });
}

/* ================= menu ================= */
const ICON_LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="rgba(0,0,0,.35)"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>';
const LVC = {A0: '#7fe0a0', A1: '#8cc8ff', A2: '#c9a3ff'};
function renderMenu(swapTitle = false) {
  const P = placeOf(save.place);
  $('places').innerHTML = PLACES.map((p) => {
    const open = isOpen(p), best = save.best[p.id] || 0;
    const sub = !open ? `${fmt(p.need.score)} at ${placeOf(p.need.from).short}` : best ? `Best ${fmt(best)}` : 'New!';
    return `<button class="place ${p.id === P.id ? 'on' : ''} ${open ? '' : 'locked'}" data-place="${p.id}" aria-label="${esc(p.name)}${open ? '' : ' (locked)'}">
      <span class="th"><img src="${p.scenes[0]}" alt="" loading="lazy">${open ? '' : `<span class="lock">${ICON_LOCK}</span>`}</span><b>${esc(p.short)}</b><small>${esc(sub)}</small></button>`;
  }).join('');
  const t = $('titleImg'); if (!t.src.endsWith(P.title)) { t.src = P.title; if (swapTitle) popEl(t, 'swap'); }
  $('bestNum').textContent = $('bestNum2').textContent = fmt(save.best[P.id] || 0);
  const sum = window.FugioPacks ? FugioPacks.summary(PACKS, save.packs) : {title: packNow().title, level: packNow().level};
  $('packLv').textContent = sum.level; $('packLv').style.setProperty('--c', LVC[sum.level] || '#ffc76b'); $('packTitle').textContent = sum.title;
  const all = Object.values(D.fish).flat().length, got = Object.values(D.fish).flat().filter((f) => save.index[f.name]).length;
  $('ixCount').textContent = `${got}/${all}`;
  renderSound();
}
function showMenu() {
  if (G) { G.over = true; G = null; }
  closeOv('ovPause');
  setScreen('menu'); setPhase(null); showSec('pMenu'); clearStage(); $('roundCard').hidden = true;
  MUSIC.mood = 0;
  renderMenu();
  const P = placeOf(save.place);
  setBg(P.menu, 'menu'); specks(false);
  placeAssets(P).forEach((s) => loadImg(s)); // ready before PLAY
}
$('places').addEventListener('click', (e) => {
  const b = e.target.closest('[data-place]'); if (!b) return;
  const p = placeOf(b.dataset.place); ac();
  if (!isOpen(p)) { sfx.nope(); popEl(b, 'nope'); toast(`Score <b>${fmt(p.need.score)}</b> at ${esc(placeOf(p.need.from).name)} to open ${esc(p.name)}.`); return; }
  if (save.place === p.id) return;
  sfx.click(); save.place = p.id; store(); renderMenu(true);
  setBg(p.menu, 'menu'); placeAssets(p).forEach((s) => loadImg(s));
});
$('packBtn').onclick = async () => {
  ac(); sfx.click(); if (!window.FugioPacks) { toast('Questions: ' + esc(packNow().title)); return; }
  const ids = await FugioPacks.open(PACKS, save.packs, {theme: 'gummy', kicker: 'CHOOSE THE WORDS'});
  if (ids && ids.length) { save.packs = ids; store(); usedQ.clear(); renderMenu(); }
};
$('playBtn').onclick = () => { ac(); musicOn(); sfx.go(); startGame(); };
$('ixBtn').onclick = () => { ac(); sfx.click(); openIndex(save.place); };
$('setBtn').onclick = () => { ac(); sfx.click(); openSettings(); };
$('joinBtn').onclick = () => { sfx.click(); location.href = 'client.html'; };
$('leaveBtn').onclick = () => { sfx.click(); if (window.parent !== window) window.parent.postMessage({fugio: 'leave'}, '*'); else location.href = 'https://www.fugio.co/'; };
const SOUND_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" fill-opacity=".25"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>';
const SOUND_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" fill-opacity=".25"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>';
function renderSound() { $('soundBtn').innerHTML = save.sound ? SOUND_ON : SOUND_OFF; }
$('soundBtn').onclick = () => { save.sound = !save.sound; store(); renderSound(); if (save.sound) { ac(); sfx.click(); musicOn(); } else musicOff(); };

/* ================= pop-up windows ================= */
function openOv(id) { const o = $(id); o.hidden = false; }
function closeOv(id) { $(id).hidden = true; }
document.querySelectorAll('.ov').forEach((o) => o.addEventListener('click', (e) => {
  if (e.target === o || e.target.closest('[data-close]')) { sfx.click(); o.hidden = true; if (o.id === 'ovSet' && G && G.paused && $('ovPause').hidden) openOv('ovPause'); }
}));
// settings
function openSettings() {
  document.querySelectorAll('[data-tog]').forEach((b) => b.classList.toggle('on', !!save[b.dataset.tog]));
  $('timeRange').value = save.time; $('timeOut').textContent = save.time + ' s';
  openOv('ovSet');
}
document.querySelectorAll('[data-tog]').forEach((b) => b.onclick = () => {
  const k = b.dataset.tog; save[k] = !save[k]; store(); b.classList.toggle('on', save[k]); ac(); sfx.click();
  if (k === 'music' || k === 'sound') { if (save.music && save.sound) musicOn(); else musicOff(); renderSound(); }
});
$('timeRange').oninput = () => { save.time = +$('timeRange').value; $('timeOut').textContent = save.time + ' s'; store(); };
// pause (a hidden tab pauses too)
function pause() { if (!G || G.paused || app.classList.contains('scr-res')) return; G.paused = true; G.pausedAt = now(); openOv('ovPause'); }
function resume() { if (!G) return; closeOv('ovPause'); closeOv('ovSet'); G.paused = false; }
$('pauseBtn').onclick = () => { sfx.click(); pause(); };
$('resumeBtn').onclick = () => { sfx.click(); resume(); };
$('pSetBtn').onclick = () => { sfx.click(); closeOv('ovPause'); openSettings(); };
$('quitBtn').onclick = () => { sfx.click(); showMenu(); };
document.addEventListener('visibilitychange', () => { if (document.hidden) { pause(); if (AC) AC.suspend().catch(() => {}); } else if (AC) AC.resume().catch(() => {}); });
addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (!$('ovIndex').hidden) closeOv('ovIndex'); else if (!$('ovSet').hidden) closeOv('ovSet'); else if (G && G.paused) resume(); else pause(); } });

/* ================= Fish Index ================= */
let ixPlace = 'lake';
function openIndex(placeId) { ixPlace = placeId; renderIndex(); openOv('ovIndex'); $('ovIndex').querySelector('.wb').scrollTop = 0; }
function renderIndex() {
  $('ixTabs').innerHTML = PLACES.map((p) => { const l = D.fish[p.id], got = l.filter((f) => save.index[f.name]).length;
    return `<button class="${p.id === ixPlace ? 'on' : ''}" data-ix="${p.id}">${esc(p.short)}<small>${got} / ${l.length}</small></button>`; }).join('');
  const list = D.fish[ixPlace], got = list.filter((f) => save.index[f.name]).length;
  $('ixFill').style.width = (got / list.length * 100).toFixed(1) + '%';
  // caught fish first (newest catches stay in their place), then the ones still to find
  const order = list.map((f, i) => i).sort((a, b) => (save.index[list[b].name] ? 1 : 0) - (save.index[list[a].name] ? 1 : 0) || a - b);
  $('ixGrid').innerHTML = order.map((i) => { const f = list[i], e = save.index[f.name];
    return `<button class="ixc ${e ? 'got' : 'no'}" data-fish="${i}">${e && !e.seen ? '<i class="nw"></i>' : ''}<span class="im"><img src="${fishSrc(f)}" alt="" loading="lazy"></span>
      <b>${e ? esc(f.name) : '???'}</b><small>${e ? `&times;${e.n} &middot; ${fmtKg(e.best)}` : '&nbsp;'}</small></button>`; }).join('');
}
$('ixTabs').addEventListener('click', (e) => { const b = e.target.closest('[data-ix]'); if (!b) return; sfx.click(); ixPlace = b.dataset.ix; renderIndex(); $('ovIndex').querySelector('.wb').scrollTop = 0; });
$('ixGrid').addEventListener('click', (e) => {
  const b = e.target.closest('[data-fish]'); if (!b) return; sfx.click();
  const f = D.fish[ixPlace][+b.dataset.fish], en = save.index[f.name], P = placeOf(ixPlace);
  if (en && !en.seen) { en.seen = true; store(); b.querySelector('.nw')?.remove(); }
  const d = document.createElement('div'); d.className = 'ixd' + (en ? '' : ' no');
  d.innerHTML = `<div class="in"><img src="${fishSrc(f)}" alt=""><h4>${en ? esc(f.name) : '???'}</h4>
    <div class="st">${en ? `Caught &times;${en.n} &middot; best ${fmtKg(en.best)}` : 'Not caught yet'}</div>
    <p>${en ? esc(D.desc[f.name] || '') : `This fish lives at ${esc(P.name)}. Answer well, catch it, and it joins your Fish Index!`}</p>
    <button class="big green" style="min-height:48px;font-size:22px">OK</button></div>`;
  d.addEventListener('click', (ev) => { if (ev.target === d || ev.target.closest('button')) { sfx.click(); d.remove(); } });
  $('ovIndex').querySelector('.win').appendChild(d);
});

/* ================= a game ================= */
async function startGame(quick = false) {
  const P = placeOf(save.place);
  if (!isOpen(P)) { save.place = 'lake'; store(); }
  if (G) G.over = true;
  const me = G = {place: placeOf(save.place), round: 0, streak: 0, score: 0, rounds: [], paused: false, over: false, quick};
  themeBar(me.place);
  setScreen('game'); setScore(0); clearStage();
  await timeout(Promise.all(placeAssets(me.place).map(loadImg)), 3000);
  for (let r = 0; r < 3; r++) {
    if (!alive(me)) return;
    await playRound(me, r);
  }
  if (alive(me)) await weighIn(me);
}

async function playRound(me, r) {
  const P = me.place, round = {r, answers: [], kg: 0, streakStart: me.streak};
  me.round = r; me.rounds.push(round); me.cur = round;
  MUSIC.mood = r;
  setRoundPill(r); setPhase('intro'); clearStage();
  // the questions' cards come up already, so the picture sits where it will stay
  resetQuiz(round); showSec('pQuiz');
  setBg(P.scenes[r], 'cover'); specks(r === 2);
  // round card
  const rc = $('roundCard');
  $('rcKick').textContent = `ROUND ${r + 1} OF 3 · ${P.name.toUpperCase()}`;
  $('rcName').textContent = ROUNDS[r].name.toUpperCase(); rc.style.setProperty('--c', ROUNDS[r].c);
  $('rcSub').innerHTML = `${ROUNDS[r].sub} &middot; points <em>&times;${ROUNDS[r].mult}</em>`;
  rc.classList.remove('out'); rc.hidden = false; sfx.whoosh();
  await tapOn([rc], r === 0 && me.quick ? 900 : 1500);
  rc.classList.add('out'); await wait(260); rc.hidden = true;
  if (!alive(me)) return;
  // 1) the questions
  setPhase('quiz');
  $('qHint').hidden = !(save.games < 2 && r === 0);
  for (let q = 0; q < Q_PER_ROUND; q++) { if (!alive(me)) return; await askQuestion(me, round, q); }
  if (!alive(me)) return;
  await wait(250);
  banner('CATCH TIME!', true); sfx.whoosh();
  await wait(700);
  if (!alive(me)) return;
  // 2) the catch bar
  const hit = await catchBar(me, round);
  if (!alive(me)) return;
  // 3) the catch
  await catchScene(me, round, hit);
}

/* ---------- 1) questions ---------- */
function resetQuiz(round) {
  $('mFill').style.width = '0%'; $('mKg').textContent = '0.00 kg'; $('mIco').style.transform = 'scale(.8)';
  $('nNet').style.width = (MG.NET[0] * 100) + '%'; $('nWord').textContent = netWord(0);
  renderStreak(G ? G.streak : 0, false);
  $('qNum').textContent = `1/${Q_PER_ROUND}`; $('qSent').innerHTML = '&nbsp;'; $('qOpts').innerHTML = ''; $('qMsg').innerHTML = ''; $('qOpts').className = 'opts';
  $('qTime').style.transform = 'scaleX(1)';
}
function renderStreak(n, pop) {
  const c = $('streakChip'); c.textContent = `×${streakMult(n + 1)}`; c.classList.toggle('on', n >= 1); if (pop && n >= 1) popEl(c, 'pop');
}
// the most kilos this round could still bring (every answer instant): the meter's full mark
const roundMaxKg = (round) => { let s = 0; for (let k = 1; k <= Q_PER_ROUND; k++) s += streakMult(round.streakStart + k) * KG[1]; return s; };
function renderMeter(round, pop) {
  const fill = clamp(round.kg / roundMaxKg(round), 0, 1);
  $('mFill').style.width = Math.max(round.kg > 0 ? 4 : 0, fill * 100).toFixed(1) + '%';
  $('mKg').textContent = fmtKg(round.kg);
  $('mIco').style.transform = `scale(${(.8 + fill * .55).toFixed(2)})`;
  $('nNet').style.width = (netFor(round.answers) * 100).toFixed(1) + '%';
  $('nWord').textContent = netWord(roundScore(round.answers));
  if (pop) { popEl($('mKg')); popEl($('netP')); popEl($('nWord')); }
}
function askQuestion(me, round, qi) {
  return new Promise((done) => {
    let text = pickSentence(me.round), words = text && fillChoices(text);
    if (!words) { text = FALLBACK[0].rounds[me.round][qi]; words = fillChoices(text); }
    $('qNum').textContent = `${qi + 1}/${Q_PER_ROUND}`;
    $('qMsg').innerHTML = '';
    $('qSent').innerHTML = `<span>${hints(words.before)}<span class="gap" id="qGap">&nbsp;</span>${hints(words.after)}</span>`;
    const box = $('qOpts'); box.className = 'opts';
    box.innerHTML = words.map((w, i) => `<button class="opt" data-i="${i}">${esc(w.text)}</button>`).join('');
    const tbar = $('qTime'), timer = $('qTimer'), limit = save.time * 1000;
    tbar.style.transform = 'scaleX(1)'; timer.className = 'timer fast'; $('qFast').classList.add('on');
    let start = 0, pausedFor = 0, pauseT = 0, raf = 0, finished = false, lastSec = 99;
    const elapsed = () => (start ? now() - start - pausedFor - (pauseT ? now() - pauseT : 0) : 0);
    const finish = (idx) => {
      if (finished || !start) return; finished = true; cancelAnimationFrame(raf);
      box.classList.add('done'); removeEventListener('keydown', keys);
      onAnswer(me, round, words, idx, Math.min(limit, elapsed()) / 1000, limit / 1000).then(done);
    };
    const frame = () => {
      if (finished) return;
      if (G !== me) { finished = true; return done(); }
      if (G.paused) { if (!pauseT) pauseT = now(); } else if (pauseT) { pausedFor += now() - pauseT; pauseT = 0; }
      const left = 1 - elapsed() / limit;
      tbar.style.transform = `scaleX(${clamp(left, 0, 1).toFixed(4)})`;
      timer.className = 'timer' + (left >= FAST ? ' fast' : left < .25 ? ' low' : '');
      $('qFast').classList.toggle('on', left >= FAST);
      const s = Math.ceil((limit - elapsed()) / 1000); if (s !== lastSec && s <= 3 && s > 0 && !G.paused) sfx.tick(); lastSec = s;
      if (left <= 0) return finish(-1);
      raf = requestAnimationFrame(frame);
    };
    box.onclick = (e) => { const b = e.target.closest('.opt'); if (!b || !G || G.paused) return; finish(+b.dataset.i); };
    const keys = (e) => { if (!G || G.paused || !start) return; const k = '123'.indexOf(e.key); if (k >= 0 && k < words.length) finish(k); };
    addEventListener('keydown', keys);
    me.answerNow = (kind) => { if (!start) return false; const i = kind === 'right' ? words.findIndex((w) => w.ok) : kind === 'wrong' ? words.findIndex((w) => !w.ok) : -2; if (i === -2) return false; finish(i); return true; };
    // the sentence first, the three words a moment later (time to read), then the clock starts
    wait(qi === 0 ? 500 : 420).then(() => {
      if (G !== me) return done();
      box.classList.add('show'); start = now(); raf = requestAnimationFrame(frame);
    });
  });
}
async function onAnswer(me, round, words, idx, secs, limitS) {
  const ok = idx >= 0 && words[idx].ok, speed = idx < 0 ? 0 : clamp(1 - secs / limitS, 0, 1);
  me.streak = ok ? me.streak + 1 : 0;
  const kg = answerKg(ok, speed, me.streak);
  const a = {words, pick: idx, ok, speed, secs, kg, speedPts: ok ? Math.round(PTS.SPEED * speed) : 0};
  round.answers.push(a); round.kg += kg;
  const btns = [...$('qOpts').children], ri = words.findIndex((w) => w.ok), gap = $('qGap');
  gap.textContent = words[ri].text;
  if (ok) {
    btns[idx].classList.add('ok'); btns.forEach((b, i) => { if (i !== idx) b.classList.add('dim'); });
    gap.classList.add('ok');
    sfx.right(me.streak); buzz(12);
    const [x, y] = center(btns[idx]); sparks(x, y, 12, '#a6ffc9');
    const fast = speed >= FAST, to = center($('mKg'));
    floatText(`+${kg.toFixed(2)} kg`, x, y - 10, '', to, 650).then(() => { if (G === me) renderMeter(round, true); });
    if (fast) setTimeout(() => floatText('FAST!', x + Math.min(120, btns[idx].offsetWidth * .3), y - 34, 'gold', null, 800), 90);
    renderStreak(me.streak, true);
    if (me.streak >= 3 && me.streak % 2 === 1) {
      setTimeout(() => { if (G !== me) return; banner(`${me.streak} IN A ROW!`); sfx.combo(); const [cx, cy] = center($('banner')); confetti(cx, cy + 20, 22); buzz([15, 30, 15]); }, 300);
    }
    $('qMsg').innerHTML = fast ? 'Fast and right!' : 'Right!';
    await wait(me.streak >= 3 && me.streak % 2 === 1 ? 1250 : 950);
  } else {
    if (idx >= 0) btns[idx].classList.add('no');
    btns[ri].classList.add('show'); btns.forEach((b, i) => { if (i !== ri && i !== idx) b.classList.add('dim'); });
    gap.classList.add('fix');
    sfx.puff();
    renderStreak(0, false); renderMeter(round, false);
    $('qMsg').innerHTML = `${idx < 0 ? "Time's up! " : ''}The right word is <b>${esc(words[ri].text)}</b>`;
    await wait(1600);
  }
}

/* ---------- 2) the catch bar: one try ---------- */
function catchBar(me, round) {
  return new Promise(async (done) => {
    setPhase('bar'); showSec('pBar');
    const net = netFor(round.answers), at = .03 + R() * (.94 - net), score = roundScore(round.answers);
    const netEl = $('mgNet'), fish = $('mgFish'), say = $('mgSay'), track = $('mgTrack'), btn = $('catchBtn'), tbar = $('mgTime');
    netEl.style.left = (at * 100).toFixed(2) + '%'; netEl.style.width = (net * 100).toFixed(2) + '%'; netEl.classList.remove('in');
    $('bKg').textContent = fmtKg(Math.max(.1, round.kg)); $('bNet').textContent = netWord(score);
    $('barTitle').textContent = 'Catch it!'; $('barHint').textContent = 'Tap CATCH! when the fish is in the net';
    track.classList.remove('shake'); fish.className = 'mg-fish'; say.className = 'mg-say on wait'; say.textContent = 'READY…';
    btn.className = 'wait'; btn.textContent = 'READY'; tbar.style.transform = 'scaleX(1)';
    const cross = MG.CROSS[me.round] * 1000, side = R() < .5 ? 0 : 1;
    const posAt = (ms) => { const u = (ms / cross + side) % 2; return [u < 1 ? u : 2 - u, u >= 1]; };
    const inNet = (x) => x >= at - MG.GRACE && x <= at + net + MG.GRACE;
    const draw = ([x, back]) => { fish.style.left = (x * 100).toFixed(3) + '%'; fish.classList.toggle('l', back); netEl.classList.toggle('in', inNet(x)); };
    draw(posAt(0));
    await wait(450); sfx.ready();
    if (!alive(me)) return done(false);
    let swim = 0, left = MG.TIME * 1000, prev = now(), raf = 0, over = false, lastSec = 99, readyAt = prev + MG.READY / SPEED, live = false;
    const end = async (ms, late) => {
      if (over) return; over = true; cancelAnimationFrame(raf); cleanup();
      const p = posAt(ms), hit = !late && inNet(p[0]);
      draw(p); netEl.classList.toggle('in', hit);
      btn.classList.remove('live'); btn.className = hit ? 'ok' : 'no'; btn.textContent = hit ? '✓' : '✗';
      if (hit) {
        // hit-stop: everything holds for a moment, a white flash, then the cheer
        fish.classList.add('got'); flash(.85); sfx.hit(); buzz([30, 40, 30]);
        await wait(120);
        say.textContent = 'CAUGHT!'; say.className = 'mg-say on ok';
        const [x, y] = center(fish); confetti(x, y, 18); sparks(x, y, 14, '#fff6a8');
      } else {
        fish.classList.add('flee'); track.classList.add('shake'); shake(); sfx.miss(); buzz(40);
        say.textContent = late ? "TIME'S UP!" : 'MISSED!'; say.className = 'mg-say on no';
      }
      round.hit = hit; round.net = net; round.netAt = at;
      await wait(1000);
      done(hit);
    };
    const frame = (t) => {
      if (over) return;
      if (G !== me) { over = true; cleanup(); return done(false); }
      const dt = Math.min(t - prev, 100); prev = t;
      if (G.paused) { readyAt += dt; }
      else if (t >= readyAt) {
        if (!live) { live = true; btn.className = 'live'; btn.textContent = 'CATCH!'; say.className = 'mg-say'; sfx.go(); }
        swim += dt * SPEED; left -= dt;
        tbar.style.transform = `scaleX(${Math.max(0, left / (MG.TIME * 1000)).toFixed(4)})`;
        const s = Math.ceil(left / 1000); if (s < lastSec && s <= 3 && s > 0) sfx.tick(); lastSec = s;
        if (left <= 0) return end(swim, true);
      }
      draw(posAt(swim));
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    // a tap counts where the fish was when the finger landed (at most 50 ms back), not at the next frame
    const tap = (e) => {
      const t = now();
      if (over || !live || G.paused || t < readyAt) return;
      if (e && e.preventDefault) e.preventDefault();
      const ts = e && e.timeStamp > 0 && Math.abs(e.timeStamp - t) < 300 ? e.timeStamp : t;
      btn.classList.add('press'); setTimeout(() => btn.classList.remove('press'), 120);
      end(Math.max(0, swim + clamp(ts - prev, -50, 50) * SPEED));
    };
    const onDown = (e) => { if (e.button > 0 || e.target.closest('#pauseBtn')) return; tap(e); };
    const onKey = (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); tap(e); } };
    const area = $('pBar');
    area.addEventListener('pointerdown', onDown); addEventListener('keydown', onKey);
    function cleanup() { area.removeEventListener('pointerdown', onDown); removeEventListener('keydown', onKey); me.barTap = null; me.barState = null; }
    me.barTap = tap; me.barState = () => ({live, over, x: posAt(swim)[0], inNet: inNet(posAt(swim)[0]), net, at});
  });
}

/* ---------- 3) the catch ---------- */
function clearStage() {
  $('stage').classList.remove('got');
  ['stFox', 'stFish', 'stNew', 'stSplash'].forEach((id) => { $(id).className = $(id).className.split(' ')[0]; });
  $('tray').innerHTML = '';
}
function rollCatch(me, round) {
  const P = me.place;
  if (!round.hit) { const j = pick(D.junk[P.id] || D.junk.lake); return {f: j, junk: true, kg: .1, isNew: false}; }
  const all = D.fish[P.id], fresh = all.filter((f) => !save.index[f.name]), f = pick(fresh.length ? fresh : all);
  const kg = Math.max(.1, Math.round(round.kg * 100) / 100);
  return {f, junk: false, kg, isNew: !save.index[f.name]};
}
async function catchScene(me, round, hit) {
  const c = rollCatch(me, round), mult = ROUNDS[round.r].mult;
  const fishPts = c.junk ? 0 : Math.round(c.kg * PTS.KG), speedPts = round.answers.reduce((s, a) => s + a.speedPts, 0);
  const total = Math.round((fishPts + speedPts) * mult);
  Object.assign(round, {catch: c, fishPts, speedPts, total});
  if (!c.junk) {
    const e = save.index[c.f.name] || (save.index[c.f.name] = {n: 0, best: 0, seen: false, place: me.place.id});
    e.n++; e.best = Math.max(e.best, c.kg); if (c.isNew) e.seen = false; store();
  }
  await timeout(loadImg(fishSrc(c.f)), 2500);
  if (!alive(me)) return;
  setPhase('catch');
  // the card
  const card = $('cCard'); card.classList.toggle('junk', c.junk);
  $('cKick').textContent = c.junk ? 'OH NO, ONLY JUNK!' : c.isNew ? 'A NEW FISH!' : 'YOU CAUGHT';
  $('cName').textContent = c.f.name; $('cKg').textContent = c.junk ? fmtKg(.1) : '0.00 kg';
  $('cDesc').textContent = D.desc[c.f.name] || '';
  $('cPts').innerHTML = '';
  const nb = $('nextBtn'); nb.textContent = round.r < 2 ? 'NEXT ROUND' : 'WEIGH-IN'; nb.style.visibility = 'hidden';
  showSec('pCatch');
  // the picture: Foxino cheers with the fish (or shrugs with the junk)
  const st = $('stage'), fox = $('stFox'), fw = $('stFish'), fi = $('stFishImg');
  fox.src = c.junk ? 'art2/foxino-miss.webp' : 'art2/foxino-catch.webp';
  fi.src = fishSrc(c.f);
  fw.className = 'st-fish' + (c.junk ? ' junk' : '');
  await wait(60);
  $('stSplash').className = 'st-splash go'; sfx.splash();
  fox.className = 'st-fox in' + (c.junk ? '' : ' hop');
  await wait(180);
  fw.classList.add('in'); st.classList.toggle('got', !c.junk);
  if (c.junk) sfx.miss(); else { setTimeout(() => sfx.fanfare(), 250); }
  if (c.isNew) {
    $('stNew').className = 'st-new h in';
    setTimeout(() => { if (G !== me) return; const [x, y] = center(fw); confetti(x, y, 40); buzz([20, 40, 60]); }, 500);
  }
  if (!c.junk) await countTo($('cKg'), 0, c.kg, 700, fmtKg, sfx.count); else await wait(500);
  if (!alive(me)) return;
  // the points: fish + speed, × the round, then they fly to the score
  const chips = [`<span>fish <b>+${fmt(fishPts)}</b></span>`, `<span>speed <b>+${fmt(speedPts)}</b></span>`];
  if (mult !== 1) chips.push(`<span>${esc(ROUNDS[round.r].name.toLowerCase())} <b>&times;${mult}</b></span>`);
  chips.push(`<span class="tot" id="cTot">+${fmt(total)}</span>`);
  for (const h of chips) { $('cPts').insertAdjacentHTML('beforeend', h); popEl($('cPts').lastElementChild, 'pop'); sfx.click(); await wait(170); }
  await flyCoins(me, $('cTot'), total);
  if (!alive(me)) return;
  nb.style.visibility = 'visible';
  await tapOn([nb], round.r < 2 ? 9000 : 12000);
  if (!alive(me)) return;
  sfx.click();
  clearStage();
}
// coins stream from the points to the score; every coin adds its share, with a rising chime
async function flyCoins(me, from, total) {
  if (!total) return;
  const n = clamp(Math.ceil(total / 80), 3, save.calm ? 6 : 14), [x0, y0] = center(from), [x1, y1] = center($('scoreNum'));
  const base = me.score; let landed = 0;
  await new Promise((res) => {
    for (let i = 0; i < n; i++) {
      setTimeout(() => {
        const c = document.createElement('i'); c.className = 'coin'; c.style.left = x0 + 'px'; c.style.top = y0 + 'px'; fx.appendChild(c);
        const mx = (x0 + x1) / 2 + (R() - .5) * 120, my = Math.min(y0, y1) - 40 - R() * 60;
        c.animate([{transform: 'translate(0,0) scale(.4)', opacity: 0}, {transform: `translate(${(R() - .5) * 50}px,${-30 - R() * 30}px) scale(1.1)`, opacity: 1, offset: .2},
          {transform: `translate(${mx - x0}px,${my - y0}px) scale(1)`, offset: .6}, {transform: `translate(${x1 - x0}px,${y1 - y0}px) scale(.6)`, opacity: .9}],
        {duration: 560, easing: 'cubic-bezier(.4,0,.6,1)'}).onfinish = () => {
          c.remove(); landed++;
          if (G === me) { me.score = base + Math.round(total * landed / n); setScore(me.score, true); }
          sfx.coin(landed);
          if (landed === n) res();
        };
      }, i * 45);
    }
    setTimeout(res, 2200);
  });
  if (G === me) { me.score = base + total; setScore(me.score); }
}

/* ---------- the weigh-in ---------- */
function placeTray() {
  const t = $('tray'), f = bgCur._fit;
  if (!app.classList.contains('scr-res') || !f || bgCur.dataset.mode !== 'scale') { t.style.display = 'none'; return; }
  const w = f.iw * .84, h = f.ih * .2;
  t.style.display = 'block'; t.style.left = (f.left + f.iw * .08) + 'px'; t.style.width = w + 'px';
  t.style.top = (f.top + f.ih * .386 - h) + 'px'; t.style.height = h + 'px';
}
async function weighIn(me) {
  const P = me.place, total = me.score, old = save.best[P.id] || 0, newBest = total > old;
  if (newBest) save.best[P.id] = total;
  const unlocked = PLACES.filter((p) => p.need && !save.open[p.id] && (save.best[p.need.from] || 0) >= p.need.score);
  unlocked.forEach((p) => (save.open[p.id] = true));
  save.games++; store();
  try { window.parent.postMessage({fugio: 'score', game: 'gummy-phone', score: total}, '*'); } catch (e) {}
  me.over = true; // nothing of the game runs any more (Play again starts a new one)
  setScreen('res'); setPhase(null); clearStage(); MUSIC.mood = 0;
  // the cards
  $('rKick').textContent = `WEIGH-IN · ${P.name.toUpperCase()}`;
  $('rScore').textContent = '0'; $('rNew').hidden = true;
  $('rBest').textContent = newBest ? (old ? `Old best: ${fmt(old)}` : 'Your first score here!') : `Best: ${fmt(old)}`;
  const u = $('rUnlock'); u.hidden = !unlocked.length;
  if (unlocked.length) { const p = unlocked[0]; u.innerHTML = `<img src="${p.scenes[0]}" alt=""><div><b>${esc(p.name)} is open!</b><span>New fish are waiting. Pick it in the menu.</span></div>`; }
  $('rList').innerHTML = me.rounds.map((rd) => { const c = rd.catch; return `<div class="rrow"><span class="rr">${ROUNDS[rd.r].name.toUpperCase()}<br>&times;${ROUNDS[rd.r].mult}</span>
    <img src="${fishSrc(c.f)}" alt=""><span class="nm">${esc(c.f.name)}${c.isNew ? '<em>NEW</em>' : ''}<small>${c.junk ? 'junk (missed the net)' : fmtKg(c.kg)}</small></span><span class="p">+${fmt(rd.total)}</span></div>`; }).join('');
  const fresh = me.rounds.filter((rd) => rd.catch.isNew).length;
  $('rFishNote').textContent = fresh ? `${fresh} new fish in your Fish Index!` : '';
  const all = me.rounds.flatMap((rd) => rd.answers), right = all.filter((a) => a.ok).length;
  $('rEng').innerHTML = `English: <span>${right} / ${all.length}</span> right`;
  const wrong = all.filter((a) => !a.ok);
  $('rLearn').innerHTML = wrong.length ? `<div style="background:none;padding:0 2px;opacity:.85">Learn these:</div>` + wrong.map((a) =>
    `<div>${fullSentence(a.words)}${a.pick >= 0 ? `<s>${esc(a.words[a.pick].text)}</s>` : '<s>no answer</s>'}</div>`).join('')
    : '<div>Perfect! Every answer was right.</div>';
  showSec('pRes'); $('pRes').querySelector('.rscroll').scrollTop = 0;
  await setBg(P.scale, 'scale');
  fitAll();
  // the catches drop onto the scale one by one, then the score counts up
  const tray = $('tray'); tray.innerHTML = '';
  const spots = [[.1, -6], [.54, 7], [.32, -2]];
  me.rounds.forEach((rd, i) => { const d = document.createElement('div'); d.className = 'tf'; d.style.left = (spots[i][0] * 100) + '%'; d.style.width = rd.catch.junk ? '26%' : '36%';
    d.style.setProperty('--r', spots[i][1] + 'deg'); d.style.zIndex = i === 2 ? 3 : 1; d.innerHTML = `<img src="${fishSrc(rd.catch.f)}" alt="">`; tray.appendChild(d); });
  for (const d of tray.children) { await sleep(260); if (!app.classList.contains('scr-res')) return; d.classList.add('in'); setTimeout(sfx.thud, 300); }
  await sleep(350);
  await countTo($('rScore'), 0, total, 1100, fmt, sfx.count);
  if (!app.classList.contains('scr-res')) return;
  popEl($('rScore'), 'pop');
  if (newBest && total > 0) {
    const nbEl = $('rNew'); nbEl.hidden = false; popEl(nbEl, 'in'); sfx.fanfare(); buzz([60, 50, 120]);
    const [x, y] = center($('rScore')); confetti(x, y, 50); setTimeout(() => confetti(innerWidth * .3, innerHeight * .3, 30), 250); setTimeout(() => confetti(innerWidth * .7, innerHeight * .3, 30), 450);
  }
  if (unlocked.length) setTimeout(() => { sfx.combo(); }, 600);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms / SPEED));
$('againBtn').onclick = () => { ac(); sfx.go(); startGame(true).catch(console.error); };
$('menuBtn').onclick = () => { sfx.click(); showMenu(); };

/* ================= start ================= */
async function boot() {
  GF_LOAD(65);
  renderMenu();
  const P = placeOf(save.place);
  await timeout(Promise.all([loadImg(P.menu), loadImg(P.title), document.fonts ? document.fonts.ready : null]), 8000);
  GF_LOAD(92);
  showMenu();
  await timeout(loadImg(P.menu), 2000);
  GF_LOAD(100);
  setTimeout(() => { $('loading').classList.add('done'); setTimeout(() => $('loading').remove(), 500); }, 150);
  // the first touch anywhere wakes the sound up (browsers need a tap first)
  const wake = () => { ac(); if (save.music && save.sound) musicOn(); removeEventListener('pointerdown', wake); };
  addEventListener('pointerdown', wake);
}

/* ================= test hooks (automatic tests drive the game through these) ================= */
window.GF = {
  get G() { return G; }, save, PLACES, D, MG, roundScore, netFor,
  speed(v) { SPEED = v; },
  phase() { return ['menu', 'game', 'res'].find((s) => app.classList.contains('scr-' + s)) + ':' + (['intro', 'quiz', 'bar', 'catch'].find((p) => app.classList.contains('ph-' + p)) || ''); },
  answer(kind) { return !!(G && G.answerNow && G.answerNow(kind)); },
  bar() { return G && G.barState ? G.barState() : null; },
  tap() { if (G && G.barTap) G.barTap({timeStamp: performance.now()}); },
  play() { $('playBtn').click(); },
  reset() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} },
  setBest(id, v) { save.best[id] = v; store(); renderMenu(); },
  menu: showMenu,
  score() { return G ? G.score : null; },
};
boot().catch((e) => { console.error(e); GF_LOAD(100); $('loading').classList.add('done'); });
})();
