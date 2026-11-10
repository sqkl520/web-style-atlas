import { readFileSync } from 'node:fs';

// 1) 线上提示词的 palette 是从哪来的？prompts.js 的 dna.palette
const prompts = readFileSync('prototypes/_selection/prompts.js', 'utf8');
const j = JSON.parse(prompts.replace(/^\uFEFF/, '').replace(/^[\s\S]*?window\.STYLE_PROMPTS\s*=\s*/, '').replace(/;\s*$/, ''));
const S = j.schemes || j;
const ids = Object.keys(S);

console.log('=== prompts.js 里每案 dna.palette 的项数 ===');
const counts = {};
for (const id of ids) {
  const p = (S[id].dna && S[id].dna.palette) || '';
  // palette 是字符串（"#A（name）、#B（name）"）还是数组？
  let n = 0;
  if (Array.isArray(p)) n = p.length;
  else n = (String(p).match(/#[0-9a-fA-F]{6}/g) || []).length;
  counts[n] = (counts[n] || 0) + 1;
}
console.log('  分布（项数 → 案数）:', JSON.stringify(counts));

console.log('\n=== data.js 里的 palette 数组长度 ===');
const data = readFileSync('prototypes/_selection/data.js', 'utf8');
const m = data.match(/window\.SCHEMES\s*=\s*(\[[\s\S]*\]);?\s*$/);
if (m) {
  const arr = JSON.parse(m[1]);
  const cnt = {};
  for (const r of arr) { const n = (r.palette || []).length; cnt[n] = (cnt[n] || 0) + 1; }
  console.log('  分布:', JSON.stringify(cnt));
  console.log('  样例 S19:', JSON.stringify(arr.find(r => r.id === 'S19')?.palette));
  console.log('  样例 S24:', JSON.stringify(arr.find(r => r.id === 'S24')?.palette));
} else {
  console.log('  解析失败，直接用正则统计');
}

console.log('\n=== 提示词里实际列出的色值数（我 dump 的）===');
import { existsSync } from 'node:fs';
const dumpDir = 'deliverables/69-plan/dump';
let tot = 0;
for (const id of ids) {
  const f = `${dumpDir}/${id}.txt`;
  if (!existsSync(f)) continue;
  const t = readFileSync(f, 'utf8');
  // 只数「视觉硬约束」第 1 条（配色行）里的 hex，不含防退化段的否定示例
  const seg = /视觉硬约束[\s\S]*?(?=2\.\s*字体|$)/.exec(t);
  const n = seg ? [...new Set((seg[0].match(/#[0-9a-fA-F]{6}/g) || []))].length : 0;
  tot += n;
  if (['S08', 'S15', 'S19', 'S24', 'S09'].includes(id)) console.log(`  ${id}: 配色行 ${n} 个色`);
}
console.log('  30 案配色行合计:', tot, '均', (tot / ids.length).toFixed(1));
