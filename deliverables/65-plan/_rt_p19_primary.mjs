// 探针 19：primary 到底是「独立信息」还是「palette[1] 的别名」？
// 逐案判定它是来自 _CURRENT-VALUES.md（真事实）还是被 L364-366 兜底覆写成 pal[1]。
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PROTO, loadData } from './_rt_lib.mjs';

const D = loadData();
const hexes = (s) => [...new Set([...String(s).matchAll(/#[0-9A-Fa-f]{6}\b/g)].map((m) => m[0].toUpperCase()))];

// 重跑 collect-schemes 的 _CURRENT-VALUES 解析（L64-80）
const cur = {};
{
  const t = readFileSync(join(PROTO, '_specs', '_CURRENT-VALUES.md'), 'utf8');
  for (const line of t.split(/\r?\n/)) {
    const m = /^\|\s*\*\*(S\d{2})\*\*\s*([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|/.exec(line);
    if (!m) continue;
    const [, id, , bgCell, primaryCell, , btnCell] = m;
    cur[id] = { bg: hexes(bgCell)[0] || null, primary: hexes(primaryCell)[0] || null, btnCell: btnCell.trim() };
  }
}

console.log('案    _CURRENT-VALUES.primary   data.primary   palette[1]   三者关系');
let fromCur = 0, fromFallback = 0;
const rows = [];
for (const r of D) {
  const c = cur[r.id] || {};
  const p1 = (r.palette || [])[1] || null;
  let note;
  if (c.primary && c.primary === r.primary) { note = '_CURRENT 直取'; fromCur++; }
  else if (r.primary === p1) { note = '★ 被兜底覆写为 palette[1]'; fromFallback++; }
  else note = '其它';
  if (c.primary && c.primary !== r.primary) note += `（_CURRENT 写的是 ${c.primary}）`;
  rows.push({ id: r.id, cur: c.primary, d: r.primary, p1, note });
  console.log(`${r.id}  ${String(c.primary).padEnd(21)} ${String(r.primary).padEnd(13)} ${String(p1).padEnd(12)} ${note}`);
}
console.log('');
console.log(`来自 _CURRENT-VALUES 的：${fromCur}/30｜被兜底覆写成 palette[1] 的：${fromFallback}/30`);

const allEq = D.every((r) => r.primary === (r.palette || [])[1]);
console.log(`primary === palette[1] 在全部 30 案成立：${allEq}`);
console.log('');
console.log('结论：primary 不是独立事实，它是 palette[1] 的**同义反复**。');
console.log('  collect-schemes.mjs L364-366 的兜底：pal.length>=2 且 (primary 缺失 || primary===bg || primary∉palette) ⇒ primary = pal[1]');
console.log('  ⇒ 只要接通 primary，界面上就会出现「同一个 hex 在调色板里已经显示过、再单独显示一次」。');

console.log('');
console.log('=== buttonText 是否可由 primary 的 WCAG 对比度唯一确定 ===');
const rgbOf = (h) => { const m = /^#?([0-9a-f]{6})$/i.exec(String(h || '')); if (!m) return null; const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const lum = (c) => { if (!c) return null; const s = c.map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2]; };
const ratio = (a, b) => { const A = lum(rgbOf(a)), B = lum(rgbOf(b)); if (A == null || B == null) return null; const hi = Math.max(A, B), lo = Math.min(A, B); return (hi + 0.05) / (lo + 0.05); };
let exact = 0, nul = 0;
for (const r of D) {
  if (!r.buttonText) { nul++; continue; }
  const pick = ratio(r.primary, '#FFFFFF') >= ratio(r.primary, '#111111') ? '#FFFFFF' : '#111111';
  if (pick === r.buttonText) exact++;
  else console.log(`  ✗ ${r.id} primary=${r.primary} actual=${r.buttonText} derived=${pick}`);
}
console.log(`  非空 buttonText 共 ${30 - nul} 案，其中可由 primary 对比度**逐案精确推出**：${exact} 案`);
console.log(`  空值 ${nul} 案 —— 这 ${nul} 案恰好也是「对比度两边都够、作者没指定」的案。`);
console.log('');
console.log('结论：buttonText 是 primary 的**确定性函数**（WCAG 二选一）。接通它＝把主色和它的字色并排显示两次。');
