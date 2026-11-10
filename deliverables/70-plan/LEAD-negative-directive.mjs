#!/usr/bin/env node
// Lead v23：负向指令的仓内实证
// 检索 Agent 引用 arXiv 2601.08070：87.5% 违规发生在"明确点名被禁词"时。
// 沏里能不能找到内部证据？方法：
//   统计 30 案原型页面上，"被提示词点名为禁止"的颜色是否真的出现了
//   如果被点名的色反而出现率高，就是内部证据
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:/Web/style';

// 提示词里常见的负向点名词（从 prompt-copy.js 和 specs 里收集）
const BANNED = ['#6366F1', '#3B82F6', '#8B5CF6', '#22D3EE', '#10B981', '#A855F7', '#EC4899'];

const rendered = JSON.parse(readFileSync(ROOT + '/deliverables/70-plan/rendered-colors-30.json', 'utf8'));
const pixel = JSON.parse(readFileSync(ROOT + '/deliverables/70-plan/pixel-ratio-30.json', 'utf8'));
const dna = JSON.parse(readFileSync(ROOT + '/prototypes/_prompts/dna-clean.json', 'utf8'));
const arr = Array.isArray(dna) ? dna : Object.values(dna);
const byId = new Map(arr.map((e) => [e.id, e]));

const HEXT = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-fA-F])/g;
const norm = (h) => { h = h.toLowerCase(); return h.length === 4 ? '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3] : h; };
const hexes = (s) => [...new Set([...String(s).matchAll(HEXT)].map((m) => norm(m[0])))];

const DIRS = readdirSync(join(ROOT, 'prototypes'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name).sort();

console.log('=== 1. 30 条提示词里，被点名的禁色有哪些、各被点名几次 ===\n');
// 读线上提示词模板
const pc = readFileSync(ROOT + '/prototypes/_selection/prompt-copy.js', 'utf8');
const pr = readFileSync(ROOT + '/prototypes/_selection/prompts.js', 'utf8');
const combined = pc + pr;
for (const b of BANNED) {
  const nPc = (pc.toLowerCase().match(new RegExp(b.toLowerCase().replace('#', '#'), 'g')) || []).length;
  const nPr = (pr.toLowerCase().match(new RegExp(b.toLowerCase().replace('#', '#'), 'g')) || []).length;
  if (nPc + nPr) console.log(`  ${b}  prompt-copy.js ${nPc} 次  prompts.js ${nPr} 次`);
}

console.log('\n=== 2. 这些禁色是否真的出现在 30 个原型页面上？===\n');
let anyHit = false;
for (const d of DIRS) {
  const id = d.slice(0, 3);
  const rend = rendered[id] || [];
  const pix = pixel[id]?.top || [];
  const hits = [];
  for (const b of BANNED) {
    const bLow = b.toLowerCase();
    const r = rend.find((x) => x.hex === bLow);
    const p = pix.find((x) => x.hex === bLow);
    if (r) hits.push(`${b} 元素${r.n}个`);
    if (p) hits.push(`${b} 像素${p.pct}%`);
  }
  if (hits.length) { console.log(`  ${id}: ${hits.join(', ')}`); anyHit = true; }
}
if (!anyHit) console.log('  ✓ 没有任何禁色出现在原型页面上（禁色只存在于规格的"反的是"段和提示词的否定句里）');

console.log('\n=== 3. 提示词里"不要/反的是"句式的数量 ===\n');
// 从实际生成的提示词里数（用 prompts.js 的结构）
const negWords = ['不要', '禁止', '反的是', '避免', '不得', '不用', '别用', '不采用', '拒绝'];
let totalNeg = 0, totalChars = 0;
const perCase = {};
for (const e of arr) {
  const id = e.id;
  // 从 prompts.js 里抽该案的文本块
  const marker = `"${id}"`;
  const i = pr.indexOf(marker);
  if (i < 0) continue;
  const seg = pr.slice(i, i + 6000);
  let n = 0;
  for (const w of negWords) n += (seg.match(new RegExp(w, 'g')) || []).length;
  perCase[id] = n; totalNeg += n;
}
const vals = Object.values(perCase);
console.log(`  30 案合计负向句式: ${totalNeg} 次（平均 ${(totalNeg / vals.length).toFixed(1)} 次/案）`);
console.log(`  min=${Math.min(...vals)} max=${Math.max(...vals)}`);
console.log(`  逐案: ${Object.entries(perCase).map(([k, v]) => k + ':' + v).join(' ')}`);

console.log('\n=== 4. 关键判定 ===\n');
console.log('如果禁色在30个原型页面上"0次出现"，说明禁色确实被遵守了 —— 但这不能证明否定句有效，');
console.log('因为原型是人手写的，不是 AI 生成的。真正的证据只能来自端到端实验。');
console.log('\n仓内可以做到的最强证据：');
console.log('  对比「提示词里点名了禁色」的案 vs「没点名」的案，看端到端复刻的违规率差异。');
console.log('  但 n=3 太小，做不了这个对比。');
