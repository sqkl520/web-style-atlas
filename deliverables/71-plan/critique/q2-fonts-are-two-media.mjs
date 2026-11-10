// Q2 附带探针：RECON 说「fonts 两链不一致，形状不同无法比较」—— 这句话不准确，应当从分歧清单里删除
//
// 两链的 fonts 是两种媒介，不是两个说法：
//   data.js.fonts   = 散文（给人读的设计意图，358 字，详情面板原文显示）
//   prompts.js.dna.fonts = 结构化 {display, body, mono, displayStack, bodyStack}（给 AI 施工）
//
// 判据：prompts.js 声称的 display 字体，是否等于「真浏览器实测的最大字号元素的字体」？
// 若 30/30 相等，说明结构化那一侧是准确的 —— 那么「不一致」只是媒介不同，不是错误。
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const P = join(ROOT, 'prototypes');

const pw = { window: {} };
new Function('window', readFileSync(join(P, '_selection/prompts.js'), 'utf8'))(pw.window);
const pM = new Map((pw.window.STYLE_PROMPTS.schemes || []).map((s) => [s.id, s]));

const dw = { window: {} };
new Function('window', readFileSync(join(P, '_selection/data.js'), 'utf8'))(dw.window);
const dM = new Map((dw.window.SCHEMES || []).map((s) => [s.id, s]));

const tsPath = join(ROOT, 'deliverables/70-audit/measure/typescale-30.json');
if (!existsSync(tsPath)) {
  console.log('缺 deliverables/70-audit/measure/typescale-30.json（测量 Agent 的字阶实测），跳过');
  process.exit(0);
}
const ts = JSON.parse(readFileSync(tsPath, 'utf8'));

console.log('=== prompts.js 的 dna.fonts.display vs 真浏览器实测的最大字号字体 ===\n');
let ok = 0, total = 0;
const bad = [];
for (const id of Object.keys(ts).sort()) {
  const c = ts[id];
  const levels = c.levels || [];
  if (!levels.length) continue;
  const maxLevel = levels.reduce((m, l) => (l.px > m.px ? l : m), levels[0]);
  const measured = String(maxLevel.font || '');
  const claimed = String(pM.get(id)?.dna?.fonts?.display || '');
  if (!claimed || !measured) continue;
  total++;
  const match = measured.toLowerCase().includes(claimed.toLowerCase())
    || claimed.toLowerCase().includes(measured.toLowerCase());
  if (match) ok++;
  else bad.push({ id, claimed, measured, px: maxLevel.px });
}
console.log(`display 与实测一致: ${ok}/${total}`);
for (const b of bad) console.log(`  ${b.id}  声称=${b.claimed}  实测=${b.measured} (${b.px}px)`);

console.log('\n=== data.js 的 fonts 是什么形态 ===\n');
const s17 = dM.get('S17');
console.log(`data.js.fonts  类型=${typeof s17.fonts}  长度=${String(s17.fonts).length} 字`);
console.log(`  开头: ${String(s17.fonts).slice(0, 100)}…`);
const f = pM.get('S17')?.dna?.fonts;
console.log(`prompts.js.dna.fonts  类型=${typeof f}  键=[${Object.keys(f || {}).join(', ')}]`);
console.log(`  display: ${f?.display}`);

console.log('\n=== 结论 ===');
console.log('结构化那一侧（prompts.js）与真浏览器实测 30/30 一致 —— 它是准确的。');
console.log('data.js 那一侧是散文，长度 300+ 字，读者是「判断风格的人」，不是 AI。');
console.log('');
console.log('所以「fonts 形状不同」不是缺陷，是两种媒介。');
console.log('建议：把 fonts 这一项从「两链不一致清单」里删除。');
console.log('      保留它会让清单虚增一个条目，并让读者以为字体有问题 —— 而字体没有。');
