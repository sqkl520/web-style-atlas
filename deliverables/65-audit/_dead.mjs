import { readFileSync } from 'node:fs';
const src = readFileSync('D:/Web/style/prototypes/_selection/data.js', 'utf8');
const D = JSON.parse(src.replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/, '').replace(/;\s*$/, ''));

console.log('=== primary vs palette ===');
let inPal = 0, at0 = 0, at1 = 0, atOther = 0, eqBg = 0;
for (const r of D) {
  const p = (r.palette || []);
  if (p.includes(r.primary)) { inPal++; const i = p.indexOf(r.primary); if (i === 0) at0++; else if (i === 1) at1++; else atOther++; }
  if (r.primary === r.bg) eqBg++;
}
console.log('primary ∈ palette: ' + inPal + '/30（=palette[0] 的 ' + at0 + '，=palette[1] 的 ' + at1 + '，更后 ' + atOther + '）');
console.log('primary === bg: ' + eqBg + '/30');
console.log('⇒ 配色行已经展示 palette 全数组，primary 是其成员之一 ⇒ 展示 primary 是纯重复');

console.log('\n=== primary 是否曾是"主色"语义？抽 5 案对照规格字段 3 ===');
const specs = {};
for (const id of ['S01', 'S04', 'S15', 'S18', 'S27']) {
  const md = readFileSync('D:/Web/style/prototypes/_specs/' + id + '.md', 'utf8');
  const m = md.match(/3\.[^\n]*配色系统[^\n]*\n?([\s\S]{0,400})/);
  specs[id] = (m ? m[1] : '').replace(/\s+/g, ' ').slice(0, 200);
}
for (const r of D.filter((x) => specs[x.id])) {
  console.log('\n' + r.id + '  primary=' + r.primary + '  bg=' + r.bg + '  palette=' + JSON.stringify(r.palette));
  console.log('  规格字段3 开头：' + specs[r.id].slice(0, 120));
}

console.log('\n=== buttonText ===');
const bt = {};
for (const r of D) { const k = r.buttonText || '(null)'; bt[k] = (bt[k] || 0) + 1; }
console.log(JSON.stringify(bt));
const rgbOf = (h) => { const m = /^#?([0-9a-f]{6})$/i.exec(String(h || '')); if (!m) return null; const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const lum = (c) => { const s = c.map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2]; };
const ratio = (a, b) => { const A = lum(rgbOf(a)), B = lum(rgbOf(b)); const hi = Math.max(A, B), lo = Math.min(A, B); return (hi + 0.05) / (lo + 0.05); };
let agree = 0, dis = 0;
const disList = [];
for (const r of D) {
  if (!r.buttonText) continue;
  const cw = ratio(r.primary, '#FFFFFF'), cb = ratio(r.primary, '#111111');
  const pick = cw >= cb ? '#FFFFFF' : '#111111';
  if (pick === r.buttonText) agree++; else { dis++; disList.push(r.id + ' primary=' + r.primary + ' 实际=' + r.buttonText + ' 算得=' + pick + ' (白' + cw.toFixed(2) + ' 黑' + cb.toFixed(2) + ')'); }
}
console.log('有值的 17 案里，可由主色亮度二选一推出的：' + agree + '；推不出的：' + dis);
disList.forEach((d) => console.log('  ✗ ' + d));
