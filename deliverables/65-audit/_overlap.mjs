import { readFileSync, writeFileSync } from 'node:fs';
const rows = JSON.parse(readFileSync('D:/Web/style/deliverables/65-audit/_raw.json', 'utf8'));
// data.js 里"已被用户看见"的字段（app.js:437-456 的字段表）
const src = readFileSync('D:/Web/style/prototypes/_selection/data.js', 'utf8');
const D = JSON.parse(src.replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/, '').replace(/;\s*$/, ''));
const SHOWN = ['def', 'family', 'fonts', 'layout', 'landing', 'visuals', 'motion', 'risk', 'scenes', 'quirk', 'palette', 'copy'];
const MAP = { f8: null };

const norm = (s) => String(s || '').replace(/[`*#]|\s/g, '');
function grams(s, n = 7) {
  const t = norm(s); const set = new Set();
  for (let i = 0; i + n <= t.length; i++) set.add(t.slice(i, i + n));
  return set;
}
function jac(a, b) {
  if (!a.size || !b.size) return 0;
  let hit = 0; for (const g of a) if (b.has(g)) hit++;
  return hit / (a.size + b.size - hit);
}
// 某段文字在 target 里的最大 7-gram 覆盖率（"这段有多少能在 target 里找到"）
function cover(seg, targetSet) {
  const g = grams(seg);
  if (!g.size) return 0;
  let hit = 0; for (const x of g) if (targetSet.has(x)) hit++;
  return hit / g.size;
}

function itemsOf(s) {
  const marks = [...s.matchAll(/[①②③④⑤⑥⑦⑧⑨]|[（(]\d+[）)]|第[一二三四五六七八九]，/g)];
  if (!marks.length) return [s];
  return marks.map((m, i) => s.slice(m.index, i + 1 < marks.length ? marks[i + 1].index : s.length).trim());
}
const ch = (s) => s.replace(/\s/g, '').length;

const out = [];
console.log('id\tf8字数\tf9字数\tf9覆盖f8\tf11覆盖f8\t已展示字段合计覆盖f8\t仅f8独有字数\t独有%');
for (const r of rows) {
  const d = D.find((x) => x.id === r.id);
  const shownText = SHOWN.map((k) => (k === 'palette' ? (d.palette || []).join(' ') : d[k] || '')).join('\n');
  const shownSet = grams(shownText);
  const f9set = grams(r.f9);
  const f11set = grams(r.f11);
  const items = itemsOf(r.f8);
  let only = 0, tot = 0;
  const onlyItems = [];
  for (const it of items) {
    // 每条按句子级再切，便于定位"哪句是独有的"
    const sents = it.split(/(?<=[。；])/).filter((x) => ch(x) > 4);
    for (const s of sents) {
      const c = cover(s, shownSet);
      tot += ch(s);
      if (c < 0.28) { only += ch(s); onlyItems.push({ s, c: +c.toFixed(2) }); }
    }
  }
  out.push({ id: r.id, items: items.length, f8: ch(r.f8), f9: ch(r.f9), f11: ch(r.f11),
    f9cov: +cover(r.f8, f9set).toFixed(2), f11cov: +cover(r.f8, f11set).toFixed(2),
    shown: +cover(r.f8, shownSet).toFixed(2), only, onlyPct: +(only / tot * 100).toFixed(1), onlyItems });
  console.log([r.id, ch(r.f8), ch(r.f9), (cover(r.f8, f9set) * 100).toFixed(0) + '%',
    (cover(r.f8, f11set) * 100).toFixed(0) + '%', (cover(r.f8, shownSet) * 100).toFixed(0) + '%',
    only, (only / tot * 100).toFixed(0) + '%'].join('\t'));
}
writeFileSync('D:/Web/style/deliverables/65-audit/_overlap.json', JSON.stringify(out, null, 1), 'utf8');
const T = out.reduce((a, o) => ({ f8: a.f8 + o.f8, only: a.only + o.only }), { f8: 0, only: 0 });
console.log('\n合计：字段8 ' + T.f8 + ' 字，其中在已展示字段里找不到对应的 ' + T.only + ' 字 = ' + (T.only / T.f8 * 100).toFixed(1) + '%');
