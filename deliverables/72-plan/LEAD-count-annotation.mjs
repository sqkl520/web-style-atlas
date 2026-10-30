/* 「×N」这种计数注解有没有漏进提示词给用户看？ */
import { readFileSync } from 'node:fs';

const R = new URL('../../prototypes/', import.meta.url);
const ps = readFileSync(new URL('_selection/prompts.js', R), 'utf8');
const sp = JSON.parse(ps.slice(ps.indexOf('{', ps.indexOf('window.STYLE_PROMPTS'))).replace(/;\s*$/, ''));

console.log('═══ 调色板条目里带「×N」计数注解的案 ═══\n');
let bad = 0;
for (const s of sp.schemes) {
  const pal = String(s.dna.palette);
  if (/×\d+/.test(pal)) {
    bad++;
    console.log(`${s.id}  ${pal}`);
  }
}
console.log(`\n合计 ${bad}/30 案的调色板里含计数注解`);

console.log('\n═══ 提示词原文第 1 条（配色）在这些案上长什么样 ═══\n');
for (const s of sp.schemes) {
  if (!/×\d+/.test(String(s.dna.palette))) continue;
  const line = String(s.dna.palette);
  console.log(`${s.id}  配色只用这几个值：${line}。不新增更多彩色。\n`);
}

/* 对照：S14 的规格声明顺序 vs 实际 palette 顺序 */
console.log('═══ S14 规格声明 vs 实际 palette ═══');
console.log('  规格: #12181D 62%(背景)  #E4572E 18%(主色)  #D8D2C4 15%(辅助)  #8A3320 5%(压痕暗侧)');
const s14 = sp.schemes.find((s) => s.id === 'S14');
console.log('  实际:', String(s14.dna.palette));
