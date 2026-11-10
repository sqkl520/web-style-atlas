const fs = require('fs');
const root = 'D:/Web/style/prototypes';
const dirs = fs.readdirSync(root).filter(d => /^S\d\d-/.test(d)).sort();
const psrc = fs.readFileSync('D:/Web/style/prototypes/_selection/prompts.js', 'utf8');
const marker = 'window.STYLE_PROMPTS = ';
const P = JSON.parse(psrc.slice(psrc.indexOf(marker) + marker.length).replace(/;\s*$/, ''));
const cap = new Map(P.schemes.map(s => [s.id, s.capacity]));
const hard = new Set(P.hardIds);
const CN = { 1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '七', 8: '八', 9: '九', 10: '十', 11: '十一', 12: '十二', 13: '十三', 14: '十四', 16: '十六', 20: '二十', 23: '二十三' };
const rows = [];
for (const d of dirs) {
  const id = d.slice(0, 3);
  const html = fs.readFileSync(root + '/' + d + '/index.html', 'utf8')
    .replace(/<!--[\s\S]*?-->/g, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const n = cap.get(id).minItems;
  const cn = CN[n] || String(n);
  const pats = [String(n), cn];
  const hits = pats.map(p => ({ p, count: (html.match(new RegExp(p + '\\s*(家|枚|块|件|条|行|处|格|层|条|份|个|张|页|段|栏|洞|盏|处)', 'g')) || []).length }));
  const total = hits.reduce((a, b) => a + b.count, 0);
  rows.push({ id, hard: hard.has(id), n, total, detail: hits.map(h => h.p + '×' + h.count).join(' ') });
}
console.log('id  hard min  count-assertions  detail');
for (const r of rows) console.log([r.id, r.hard ? 'H' : '.', String(r.n).padEnd(3), String(r.total).padEnd(4), r.detail].join('  '));
const pos = rows.filter(r => r.total > 0);
console.log('\ncases asserting their design count in visible copy: ' + pos.length + '/30');
console.log('of which hard: ' + pos.filter(r => r.hard).length + '/9 ; non-hard: ' + pos.filter(r => !r.hard).length + '/21');
