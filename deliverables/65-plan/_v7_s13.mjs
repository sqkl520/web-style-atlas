// 裁决 2 的 S13 污染：473 字评审清单能不能无损剥离（只读 md，不改仓库）
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const SPECS = resolve('prototypes/_specs');
const md = readFileSync(join(SPECS, 'S13.md'), 'utf8');
const lines = md.split(/\r?\n/);

// 找字段 8 → 字段 9 之间的原始行
let a = -1, b = -1, sub = -1;
lines.forEach((ln, i) => {
  if (a < 0 && /\*\*8[.．]\s*去\s*AI\s*味\s*审查点/.test(ln)) a = i;
  if (a >= 0 && /\*\*9[.．]\s*反\s*AI\s*味风险|反\s*AI\s*味风险与规避/.test(ln) && b < 0 && i > a) b = i;
  if (a >= 0 && sub < 0 && /反套路改造三指标/.test(ln)) sub = i;
});
console.log('S13.md 字段8 起=', a + 1, '行  子块「反套路改造三指标」=', sub + 1, '行  字段9 起=', b + 1, '行');
const seg = lines.slice(a, sub).join('\n');
const seg2 = lines.slice(sub, b).join('\n');
console.log('\n--- 字段 8 本体（' + seg.length + ' 字符）---');
console.log(seg);
console.log('\n--- 3-附 评审清单（' + seg2.length + ' 字符）---');
console.log(seg2);

// 全库扫描：还有没有别的案有无编号加粗小节
import { readdirSync } from 'node:fs';
console.log('\n=== 全库：字段区间内的「无编号加粗独占一行」小节 ===');
for (const f of readdirSync(SPECS).filter((x) => /^S\d{2}\.md$/.test(x)).sort()) {
  const t = readFileSync(join(SPECS, f), 'utf8');
  const ls = t.split(/\r?\n/);
  const hits = [];
  ls.forEach((ln, i) => {
    const s = ln.trim();
    if (/^\*\*[^*]{2,60}\*\*$/.test(s) && !/^\*\*\d/.test(s)) hits.push({ line: i + 1, txt: s });
  });
  if (hits.length) console.log(`  ${f}: ` + hits.map((h) => `L${h.line} ${h.txt}`).join(' | '));
}
