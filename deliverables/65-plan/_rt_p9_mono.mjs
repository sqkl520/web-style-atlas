// 探针 9：闸门 FAIL 里的 mono 规则 vs 规格的强制要求 —— 是否自相矛盾。
// 若规格逐案要求"数字用等宽"，而闸门把等宽判 FAIL，那这 3 条 FAIL 不是缺陷，是判据冲突。
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PROTO } from './_rt_lib.mjs';

const SPECS = join(PROTO, '_specs');
const ids = readdirSync(PROTO, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name.slice(0, 3)).sort();

const MONO_NAME = /(Mono|VT323|Redaction|Overprint|Numerals|Departure|Typewriter|Fragment|Cascadia|Consolas|JetBrains|Martian|IBM Plex Mono|DM Mono|Space Mono|Sometype)/i;

console.log('=== 逐案：规格字段 4「字体策略」是否把等宽字派给了数字/编号/日期 ===');
let prescribe = 0;
const rows = [];
for (const id of ids) {
  const t = readFileSync(join(SPECS, id + '.md'), 'utf8');
  // 抓字段 4 一段
  const m = /(?:\*\*)?4[.．]\s*(?:\*\*)?字体策略(?:\*\*)?[：:]\s*([\s\S]*?)(?=\n\s*(?:\*\*)?5[.．])/.exec(t);
  const seg = m ? m[1] : '';
  const hits = [...seg.matchAll(new RegExp('(' + MONO_NAME.source + ')', 'gi'))].map((x) => x[1]);
  // 是否明确把等宽派给"数字/编号/时刻/价格"
  const assigned = /(数字|编号|时刻|价格|金额|日期|序号|读数|检索号|票号|价目)[^。；]{0,30}(等宽|Mono|Mono)|(等宽|Mono)[^。；]{0,30}(数字|编号|时刻|价格|金额|日期|序号|读数|检索号|票号|价目)/i.test(seg);
  if (assigned) prescribe++;
  rows.push({ id, assigned, fonts: [...new Set(hits)].join('/'), head: seg.replace(/\s+/g, ' ').slice(0, 90) });
}
for (const r of rows) console.log(`  ${r.id}  ${r.assigned ? '✔ 明示等宽用于数字' : '· 未见明示'}   ${r.fonts}`);
console.log(`\n  合计明示「等宽用于数字/编号」：${prescribe}/30`);

console.log('');
console.log('=== 02-anti-ai-rules.md 对等宽的态度 ===');
const t2 = readFileSync('D:/Web/style/deliverables/02-anti-ai-rules.md', 'utf8');
for (const line of t2.split(/\r?\n/)) {
  if (/IBM Plex Mono|等宽/.test(line) && /示例|数字|辅助/.test(line)) console.log('  ' + line.replace(/\s+/g, ' ').slice(0, 220));
}

console.log('');
console.log('=== rules.mjs 的 mono 判据 ===');
const t3 = readFileSync('D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/rules.mjs', 'utf8');
const lines = t3.split(/\r?\n/);
lines.forEach((l, i) => { if (/monoProseShare|monoFamilies|monoSamples/.test(l)) console.log(`  L${i + 1}: ${l.trim()}`); });

console.log('');
console.log('=== probe.mjs 里 monoProseShare 怎么算 ===');
const t4 = readFileSync('D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/probe.mjs', 'utf8');
t4.split(/\r?\n/).forEach((l, i) => {
  if (/monoProseShare|monoFamilies|monoSamples/.test(l)) console.log(`  L${i + 1}: ${l.trim().slice(0, 200)}`);
});
