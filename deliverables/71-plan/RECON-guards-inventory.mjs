// 侦察 3：全局「生成物 → 守卫」清单
// 假设：核心问题是「生成物没有守卫」，已连续两轮踩到。
// 盘点：一共多少生成物？多少个有守卫？守卫覆盖到哪一层？
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const ROOT = 'D:/Web/style';
const P = ROOT + '/prototypes';

console.log('════ 1. 生成物清单（谁由谁生成）════\n');

const GENERATED = [
  { file: 'prototypes/_prompts/dna-raw.json', by: '_prompts/extract-dna.mjs', from: 'Sxx/style.css + index.html' },
  { file: 'prototypes/_prompts/dna-clean.json', by: '_prompts/clean-dna.mjs', from: 'dna-raw.json' },
  { file: 'prototypes/_selection/prompts.js', by: '_prompts/build-prompts.mjs', from: 'dna-clean.json' },
  { file: 'prototypes/_selection/data.js', by: '_build/collect-schemes.mjs', from: '_specs/*.md + Sxx/.inspect/report.json' },
  { file: 'prototypes/_selection/.inspect/report.json', by: 'inspect.mjs / render-scheme.mjs', from: '_selection/*.html+css+js' },
  { file: 'prototypes/_selection/self-gate.js', by: '_build/render-scheme.mjs', from: '_selection/.inspect/report.json' },
  { file: 'prototypes/Sxx/.inspect/report.json (×30)', by: 'inspect.mjs / render-scheme.mjs', from: 'Sxx/*.html+css' },
  { file: 'prototypes/Sxx/assets/credits.json (×30)', by: 'assign-assets / fetch-scheme-assets', from: '素材元数据' },
  { file: 'prototypes/Sxx/assets/CREDITS.md (×30)', by: 'write-credits / backfill-credits', from: 'credits.json' },
  { file: 'prototypes/_specs/Sxx.md (×30)', by: '_build/extract-specs.mjs', from: 'deliverables/05-schemes-*.md' },
];
for (const g of GENERATED) {
  const exists = existsSync(join(ROOT, g.file.replace(' (×30)', '').replace('Sxx', 'S19-copperplate-herbarium-cabinet')));
  console.log(`  ${exists ? '✓' : '✗'} ${g.file.padEnd(42)} ← ${g.by}`);
  console.log(`    ${''.padEnd(44)} from ${g.from}`);
}

console.log('\n════ 2. 守卫覆盖：每个检查器管什么 ════\n');

const guards = {
  'check-stale.mjs': [],
  'check-docs.mjs': [],
  'check-anchors.mjs': [],
  'check-prompts.mjs': [],
  'verify-prototype.mjs': [],
};
for (const g of Object.keys(guards)) {
  const p = join(P, '_build', g);
  if (!existsSync(p)) continue;
  const src = readFileSync(p, 'utf8');
  // 抽产物路径字符串
  const hits = [...src.matchAll(/["']([\w./-]*(?:\.json|\.js|\.md|report)[\w./-]*)["']/g)].map((m) => m[1]);
  const uniq = [...new Set(hits)].filter((h) => !h.includes('package') && h.length < 70);
  guards[g] = uniq.slice(0, 12);
}
for (const [g, list] of Object.entries(guards)) {
  console.log(`  ${g}`);
  console.log(`    引用产物: ${list.length ? list.join(' | ') : '（无直接路径，靠变量）'}`);
}

console.log('\n════ 3. coverage 矩阵：每个生成物被哪些检查器看见 ════\n');

const MATRIX = [
  { product: 'dna-raw.json', guards: ['check-stale(链③)'] },
  { product: 'dna-clean.json', guards: ['check-stale(链③)'] },
  { product: 'prompts.js', guards: ['check-stale(链③)', 'check-prompts', 'check-stale(选型台 source)'] },
  { product: 'data.js', guards: ['check-docs(部分)'] },
  { product: '_selection/.inspect/report.json', guards: ['check-stale(产品入口)'] },
  { product: 'self-gate.js', guards: ['check-stale(链③ 的 prompts.js 输入侧)'] },
  { product: 'Sxx/.inspect/report.json ×30', guards: ['check-stale(①)', 'check-docs', 'verify-prototype'] },
  { product: 'Sxx/assets/credits.json ×30', guards: ['check-docs(部分)'] },
  { product: 'Sxx/assets/CREDITS.md ×30', guards: ['check-docs(部分)'] },
  { product: '_specs/Sxx.md ×30', guards: [] },
];
console.log('生成物                              守卫');
console.log('-'.repeat(96));
for (const m of MATRIX) {
  const mark = m.guards.length ? '✓' : '✗ 无守卫';
  console.log(`${m.product.padEnd(36)} ${mark.padEnd(10)} ${m.guards.join(', ')}`);
}

console.log('\n════ 4. 关键缺口 ════\n');
const gaps = MATRIX.filter((m) => !m.guards.length);
console.log(`完全无守卫的生成物: ${gaps.length} 个`);
gaps.forEach((g) => console.log(`  · ${g.product}`));
console.log('\n只有弱守卫（check-docs「部分」）的:');
MATRIX.filter((m) => m.guards.some((g) => g.includes('部分'))).forEach((m) => console.log(`  · ${m.product}  → ${m.guards.join(', ')}`));

console.log('\n════ 5. data.js 到底有几处「独立算一遍」？════\n');
const collectSrc = readFileSync(join(P, '_build/collect-schemes.mjs'), 'utf8');
const dnaSrc = readFileSync(join(P, '_prompts/clean-dna.mjs'), 'utf8');
const FIELDS = ['palette', 'primary', 'bg', 'fonts', 'minItems', 'radius', 'shadow', 'lineWidths'];
console.log('字段         collect-schemes(→data.js)   clean-dna(→prompts.js)   两处各算一遍?');
console.log('-'.repeat(96));
for (const f of FIELDS) {
  const inC = new RegExp('\\b' + f + '\\b').test(collectSrc);
  const inD = new RegExp('\\b' + f + '\\b').test(dnaSrc);
  console.log(`${f.padEnd(12)} ${(inC ? '✓ 有' : '✗ 无').padEnd(26)} ${(inD ? '✓ 有' : '✗ 无').padEnd(24)} ${inC && inD ? '★ 是' : ''}`);
}
