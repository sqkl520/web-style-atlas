// 裁决 1 的最后一问：audit 里有没有「提示词没有、且可执行」的具体数值？
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const t = readFileSync(resolve('prototypes/_selection/data.js'), 'utf8');
const rows = JSON.parse(t.slice(t.indexOf('= ') + 2).replace(/;\s*$/, ''));
const PL = JSON.parse(readFileSync(resolve('deliverables/65-plan/_v_out/promptlen.json'), 'utf8'));

const nums = (s) => [...String(s).matchAll(/(\d+(?:\.\d+)?)\s*(px|°|%|mm|ms|em|栏|级|倍)?/g)]
  .map((m) => m[0].replace(/\s+/g, ''));
console.log('=== audit 里的数值，提示词里有没有 ===');
let tot = 0, missing = 0;
const missList = [];
for (const r of rows) {
  const p = PL.prompts[r.id];
  const an = nums(r.audit || '');
  const uniq = [...new Set(an)];
  const miss = uniq.filter((x) => !p.includes(x));
  tot += uniq.length; missing += miss.length;
  if (miss.length) missList.push({ id: r.id, miss, n: uniq.length });
}
console.log(`audit 去重数值总数 ${tot}；提示词里找不到的 ${missing}（${(missing/tot*100).toFixed(1)}%）`);
for (const m of missList.slice(0, 12)) console.log(`  ${m.id}: 缺 ${m.miss.slice(0, 8).join(' ')}${m.miss.length>8?' …':''} (共${m.n}个)`);

// 「跳脱之处」句里含数值的比例
const getTiao = (a) => { const m = a.match(/跳脱之处(?:是|在于)?[：:]?\s*([^。]{4,60}?)。/); return m ? m[1].trim() : ''; };
let withNum = 0, n = 0;
for (const r of rows) {
  const s = getTiao(r.audit || '');
  if (!s) continue;
  n++;
  if (/\d/.test(s)) withNum++;
}
console.log(`\n「跳脱之处」句含数值的: ${withNum}/${n} ← 不含数值 = 不可执行，只是判断语`);

// audit 全文中「可执行级别」的句子（含数值+单位）占比
let execChars = 0, allChars = 0;
for (const r of rows) {
  allChars += (r.audit || '').length;
  for (const seg of String(r.audit || '').split(/[。；]/)) {
    if (/\d/.test(seg) && /(px|°|%|mm|ms|em|栏|级)/.test(seg)) execChars += seg.length;
  }
}
console.log(`audit 里含「数值+单位」的句段合计 ${execChars} / ${allChars} 字（${(execChars/allChars*100).toFixed(1)}%）`);
