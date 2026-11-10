import fs from 'node:fs';

const reports = JSON.parse(fs.readFileSync('D:/Web/style/deliverables/64-scheme-quality/reports.json', 'utf8'));

const hex2rgb = (h) => {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};
const lum = ([r, g, b]) => {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => {
  const [l1, l2] = [lum(hex2rgb(a)), lum(hex2rgb(b))].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

const rows = [];
for (const r of reports) {
  if (r.missing) continue;
  const v = r.vps[1440];
  if (!v) continue;
  const bgs = [v.bodyBg, ...(v.sectionBgs || []).map(s => s.color)];
  const uniqBgs = [...new Set(bgs)];
  const texts = (v.textColors || []).filter(t => t.share >= 0.01);
  const pairs = [];
  for (const t of texts) {
    let best = null;
    for (const bg of uniqBgs) {
      const c = ratio(t.color, bg);
      if (!best || c > best.ratio) best = { bg, ratio: c };
    }
    // worst case: min over backgrounds that actually carry text (use bodyBg and the bg closest in luminance)
    const worst = uniqBgs.map(bg => ({ bg, ratio: ratio(t.color, bg) })).sort((a, b) => a.ratio - b.ratio)[0];
    pairs.push({ fg: t.color, share: t.share, best, worst });
  }
  rows.push({ dir: r.dir, bodyBg: v.bodyBg, bgs: uniqBgs, pairs });
}
fs.writeFileSync('D:/Web/style/deliverables/64-scheme-quality/contrast.json', JSON.stringify(rows, null, 1));

const p = (s, n) => String(s).padEnd(n);
console.log(p('scheme', 37) + p('fg', 9) + p('share', 7) + p('vs bodyBg', 11) + p('worst bg', 10) + 'worst');
for (const r of rows) {
  for (const q of r.pairs) {
    console.log(p(r.dir.slice(0, 36), 37) + p(q.fg, 9) + p(q.share, 7) + p(ratio(q.fg, r.bodyBg).toFixed(2), 11) + p(q.worst.bg, 10) + q.worst.ratio.toFixed(2));
  }
}
