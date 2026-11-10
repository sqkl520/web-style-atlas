/* 侦察：四个候选方向的真实数据。
 *
 *   A) 选型台色块数 vs 提示词要求的色数（用户看到的 ≠ 拿到的？）
 *   B) data.js 与 prompts.js 的 fonts 字段：同名不同形状，有没有真实后果
 *   C) S08 是唯一不达标的案 —— 它到底是缺陷还是豁免
 *   D) UI 上有没有「共 N 色」这种披露
 */
import { readFileSync, existsSync } from 'node:fs';

const R = new URL('../../prototypes/', import.meta.url);
const dataSrc = readFileSync(new URL('_selection/data.js', R), 'utf8');
const data = JSON.parse(dataSrc.match(/window\.SCHEMES\s*=\s*(\[[\s\S]*\])\s*;/)[1]);
const app = readFileSync(new URL('_selection/app.js', R), 'utf8');
const ps = readFileSync(new URL('_selection/prompts.js', R), 'utf8');
const sp = JSON.parse(ps.slice(ps.indexOf('{', ps.indexOf('window.STYLE_PROMPTS'))).replace(/;\s*$/, ''));
const pM = new Map(sp.schemes.map((s) => [s.id, s]));

console.log('═══ A) 选型台色块数 vs 提示词色数 ═══\n');
console.log('案     data.js  提示词  差');
console.log('─'.repeat(40));
let gapTotal = 0, gapCases = 0;
for (const r of data) {
  const d = (r.palette || []).length;
  const p = String(pM.get(r.id).dna.palette).split(/[、,，]/).filter(Boolean).length;
  const gap = p - d;
  if (gap > 0) { gapCases++; gapTotal += gap; }
  console.log(`${r.id}  ${String(d).padStart(6)}  ${String(p).padStart(6)}  ${gap > 0 ? '+' + gap : ''}`);
}
console.log(`\n提示词比 UI 多的案: ${gapCases}/30，合计少显示 ${gapTotal} 个色`);

console.log('\n═══ D) UI 是否披露「共 N 色」 ═══');
console.log('  app.js 里 slice(0,4) 命中:', [...app.matchAll(/slice\(0,\s*4\)/g)].length);
console.log('  app.js 里「共」+「色」:', /共[^。\n]{0,6}色/.test(app));
console.log('  app.js 里 paletteVisible / 展开 相关:',
  ['paletteVisible', '展开全部', '还有', '其余'].filter((k) => app.includes(k)).join(', ') || '（无）');

console.log('\n═══ B) fonts 字段：两条链同名不同形状 ═══');
console.log('  data.js   fonts 示例:', JSON.stringify(data[0].fonts)?.slice(0, 120));
console.log('  prompts   dna.fonts:', JSON.stringify(sp.schemes[0].dna.fonts)?.slice(0, 160));
const dLen = data.filter((r) => typeof r.fonts === 'string').length;
const pObj = sp.schemes.filter((s) => s.dna.fonts && typeof s.dna.fonts === 'object').length;
console.log(`  data.js fonts 是字符串: ${dLen}/30；prompts dna.fonts 是对象: ${pObj}/30`);

console.log('\n═══ C) S08 为什么不达标 ═══');
const s8 = data.find((r) => r.id === 'S08');
console.log('  gate:', JSON.stringify(s8.gate));
const rep = new URL('S08-amber-overprint-lightbox/.inspect/report.json', R);
if (existsSync(rep)) {
  const j = JSON.parse(readFileSync(rep, 'utf8'));
  const fails = (j.findings || j.checks || []).filter?.((f) => f.level === 'FAIL') || [];
  console.log('  report.json FAIL:', fails.length);
  for (const f of fails.slice(0, 6)) console.log('    -', f.id || f.rule || '', String(f.msg || f.message || '').slice(0, 110));
}
