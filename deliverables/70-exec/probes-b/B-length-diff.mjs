#!/usr/bin/env node
/* EXEC-B：30 条提示词的改前/改后长度对比 + 逐案负向指令对比。
 * 数据源：prompts-b/before/prompts-all.json（改前快照） vs prompts-b/prompts-all.json（改后）。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const B = 'D:/Web/style/deliverables/70-exec/probes-b';
const before = JSON.parse(readFileSync(join(B, 'before/prompts-all.json'), 'utf8'));
const after = JSON.parse(readFileSync(join(B, 'prompts-all.json'), 'utf8'));

const NEG = [/不要/g, /不许/g, /不能/g, /不得/g, /禁止/g, /避免/g, /避开/g, /切勿/g,
  /别用/g, /不准/g, /勿/g, /杜绝/g, /拒绝/g, /反的是/g, /不建议/g, /少用/g];
const NAMED = [/#[0-9A-Fa-f]{3,8}\b/,
  /(Playfair|Inter|Roboto|Helvetica|Arial|Montserrat|Poppins|Lato|Open Sans)/,
  /[0-9.]+\s*(?:px|em|rem|%|deg|ms)\b/,
  /(轮播|emoji|玻璃拟态|毛玻璃|扫描线|视差|霓虹|发光|烫金|暗角|水彩)/i];

const cnt = (t, res) => res.reduce((s, re) => s + ((t.match(re) || []).length), 0);

const rows = [];
for (const id of Object.keys(before).sort()) {
  const b = before[id].text, a = after[id].text;
  rows.push({
    id,
    lenB: [...b].length, lenA: [...a].length,
    negB: cnt(b, NEG), negA: cnt(a, NEG),
    namedB: cnt(b, NAMED), namedA: cnt(a, NAMED),
  });
}

const avg = (k) => Math.round(rows.reduce((s, r) => s + r[k], 0) / rows.length);
const med = (k) => { const v = rows.map((r) => r[k]).sort((x, y) => x - y); return v[Math.floor(v.length / 2)]; };

console.log('=== 30 条提示词：改前 / 改后 ===');
console.log('案     改前字数  改后字数   Δ字数    负向 改前→改后   点名 改前→改后');
for (const r of rows) {
  const d = r.lenA - r.lenB;
  console.log(
    r.id + '  ' + String(r.lenB).padStart(7) + String(r.lenA).padStart(9) + String(d >= 0 ? '+' + d : d).padStart(8) +
    '   ' + String(r.negB).padStart(4) + ' → ' + String(r.negA).padEnd(4) +
    '   ' + String(r.namedB).padStart(4) + ' → ' + String(r.namedA).padEnd(4)
  );
}
console.log('\n=== 汇总 ===');
console.log(`  字数  改前 ${Math.min(...rows.map(r => r.lenB))}–${Math.max(...rows.map(r => r.lenB))}（中位 ${med('lenB')}，均值 ${avg('lenB')}）`);
console.log(`        改后 ${Math.min(...rows.map(r => r.lenA))}–${Math.max(...rows.map(r => r.lenA))}（中位 ${med('lenA')}，均值 ${avg('lenA')}）`);
console.log(`  负向  改前 ${rows.reduce((s, r) => s + r.negB, 0)} 条（均值 ${avg('negB')}/案）→ 改后 ${rows.reduce((s, r) => s + r.negA, 0)} 条（均值 ${avg('negA')}/案）`);
console.log(`  点名  改前 ${rows.reduce((s, r) => s + r.namedB, 0)} 处（均值 ${avg('namedB')}/案）→ 改后 ${rows.reduce((s, r) => s + r.namedA, 0)} 处（均值 ${avg('namedA')}/案）`);
console.log(`  各案 Δ字数区间：${Math.min(...rows.map(r => r.lenA - r.lenB))} … +${Math.max(...rows.map(r => r.lenA - r.lenB))}`);
writeFileSync(join(B, 'length-diff.json'), JSON.stringify(rows, null, 1));
console.log('\n已写 length-diff.json');
