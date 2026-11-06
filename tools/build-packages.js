// Turns the gap-fill content JSON into the question packages for Gummy the Fisherman – Production.
// Usage: node build-packages.js en-grammar-gap-fill-sample.json ../../fugio-site/gummy-fisherman-copy/packages.js
//
// Game format per question: "text before [right|wrong1|wrong2…] text after". The game shows the right
// answer plus up to two of the wrong ones. Word hints (e.g. "be") are shown in brackets after the gap.
// A dialogue with several gaps becomes one question per gap; the other gaps are filled in correctly.
// The questions are split over the three rounds, but the game mixes all of a package's questions at random
// over the rounds afresh every game (no round gets only the short or only the long ones).
const fs = require('fs');
const [, , src, out] = process.argv;
const data = JSON.parse(fs.readFileSync(src, 'utf8'));
const clean = (t) => String(t).replace(/[\[\]|]/g, '').trim();

const packages = data.map((p) => {
  const qs = [];
  for (const g of p.gap_fills) {
    const doc = g.document;
    const lines = doc.content.map((c) => c.template);
    for (const it of doc.items) {
      const right = (it.correct_options || [])[0];
      const wrong = (it.incorrect_options || []).filter((w) => w && w !== right);
      if (!right || !wrong.length) continue;
      const text = lines.map((line) => line.replace(/<(\d+)>/g, (_, n) => {
        const k = +n;
        if (k === it.index) return `[${[right, ...wrong].map(clean).join('|')}]` + (it.hints && it.hints.length ? ` (${it.hints.join(', ')})` : '');
        const other = doc.items.find((x) => x.index === k);
        return other ? clean(other.correct_options[0]) : '___';
      })).join(' — ');
      qs.push({len: text.replace(/\[[^\]]*\]/, '___').length, text});
    }
  }
  qs.sort((a, b) => a.len - b.len || (Math.random() - .5));
  const n = qs.length, cut = [0, Math.round(n / 3), Math.round(2 * n / 3), n];
  return {
    id: p.lf_id, level: p.level, title: p.title, subtitle: p.subtitle, count: n,
    rounds: [0, 1, 2].map((r) => qs.slice(cut[r], cut[r + 1]).map((q) => q.text)),
  };
});

// easiest English level first (A0, A1, A2 …)
packages.sort((a, b) => String(a.level).localeCompare(String(b.level)));

fs.writeFileSync(out, '// Question packages for Gummy the Fisherman (built by content/build-packages.js — do not edit by hand)\n' +
  'window.GUMMY_PACKAGES = ' + JSON.stringify(packages) + ';\n');
for (const p of packages) console.log(`${p.level} ${p.title} – ${p.subtitle}: ${p.count} questions, rounds ${p.rounds.map((r) => r.length).join('/')}`);
console.log('example:', packages[0].rounds[0][0], '|', packages[3].rounds[1][0]);
