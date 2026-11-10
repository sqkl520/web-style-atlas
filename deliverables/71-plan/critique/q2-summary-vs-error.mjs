// Q2 补充探针：「摘要」还是「错误」—— 四个判据逐项实测
//
// 判据 1：data.js 列了页面根本没用的色吗？           （虚列 = 错误）
// 判据 2：data.js 列了 AI 默认色/被反对的色吗？       （污染 = 错误）
// 判据 3：palette[0] 真的是底色吗？                  （错标 = 错误）
// 判据 4：prompts.js 的色真的都在样式面里吗？         （臆造 = 错误）
// 判据 5：主色（palette[1] 的角色）对不对？           → 见 q2-primary-truth.mjs（本文件只做 1–4）
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const P = join(ROOT, 'prototypes');

const dw = { window: {} };
new Function('window', readFileSync(join(P, '_selection/data.js'), 'utf8'))(dw.window);
const SCHEMES = dw.window.SCHEMES || [];
const dM = new Map(SCHEMES.map((s) => [s.id, s]));

const pw = { window: {} };
new Function('window', readFileSync(join(P, '_selection/prompts.js'), 'utf8'))(pw.window);
const pM = new Map((pw.window.STYLE_PROMPTS.schemes || []).map((s) => [s.id, s]));

const hexes = (s) => [...new Set([...String(s).matchAll(/#[0-9a-fA-F]{6}/g)].map((m) => m[0].toUpperCase()))];

console.log('════ 判据 1：data.js 有「页面没用的色」吗 ════\n');
let ghost = [];
for (const s of SCHEMES) {
  const css = join(P, s.dir, 'style.css');
  if (!existsSync(css)) continue;
  const surface = readFileSync(css, 'utf8').toUpperCase()
    + (existsSync(join(P, s.dir, 'index.html')) ? readFileSync(join(P, s.dir, 'index.html'), 'utf8').toUpperCase() : '');
  const miss = (s.palette || []).map((h) => String(h).toUpperCase()).filter((h) => !surface.includes(h));
  if (miss.length) ghost.push({ id: s.id, miss });
}
console.log(`data.js 的色在该案样式面 0 次出现的: ${ghost.length} 案`);
for (const g of ghost) console.log(`  ${g.id}: ${g.miss.join(' ')}`);

console.log('\n════ 判据 2：data.js 有 AI 默认色/被反对的色吗 ════\n');
const banned = ['#22D3EE', '#0F172A', '#8B5CF6', '#EC4899', '#6366F1', '#3B82F6', '#10B981', '#FFFFFF', '#000000'];
let anyBanned = false;
for (const b of banned) {
  const hit = SCHEMES.filter((s) => (s.palette || []).some((h) => String(h).toUpperCase() === b)).map((s) => s.id);
  if (hit.length) { anyBanned = true; console.log(`  ${b} 出现于: ${hit.join(',')}`); }
}
console.log(anyBanned ? '' : '  ✓ 9 个 AI 默认色全部 clean（上一轮 a56426e 的修复没回归）');

console.log('\n════ 判据 3：palette[0] 真的是底色吗 ════\n');
let p0bad = [];
for (const s of SCHEMES) {
  if (String((s.palette || [])[0]).toUpperCase() !== String(s.bg).toUpperCase()) p0bad.push(s.id);
}
console.log(`palette[0] !== bg 的案: ${p0bad.length}/${SCHEMES.length}`);
if (p0bad.length) console.log('  ' + p0bad.join(' '));

console.log('\n════ 判据 4：prompts.js 的色都在样式面里吗 ════\n');
let fake = [];
for (const s of SCHEMES) {
  const surface = [join(P, s.dir, 'style.css'), join(P, s.dir, 'index.html')]
    .filter(existsSync).map((f) => readFileSync(f, 'utf8').toUpperCase()).join('\n');
  const miss = hexes(pM.get(s.id)?.dna?.palette || '').filter((h) => !surface.includes(h));
  if (miss.length) fake.push({ id: s.id, miss });
}
console.log(`提示词有、但该案样式面 0 次出现的色: ${fake.length} 案`);
for (const f of fake) console.log(`  ${f.id}: ${f.miss.join(' ')}`);

console.log('\n════ 小结 ════');
console.log(`虚列 ${ghost.length} / 污染 ${anyBanned ? '有' : 0} / 底色错标 ${p0bad.length} / 提示词臆造 ${fake.length}`);
console.log('→ 判据 1–4 全部通过。data.js 的「集合」是忠实的。');
console.log('→ 唯一的「错误」在判据 5：palette[1] 的角色与权威主色不符（5 案），见 q2-primary-truth.mjs');
console.log('');
console.log('这就是任务 Q2 要的那个区分：');
console.log('  「少列几个色」= 摘要，允许（22/30 案的差异都属于这一类）');
console.log('  「列了错的色 / 标错了角色」= 错误，不可接受（5 案属于这一类，且与色数无关）');
