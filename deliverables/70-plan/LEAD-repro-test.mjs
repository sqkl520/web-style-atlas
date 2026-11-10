// Lead v27：实际重跑生成链三次，检验"不可复现"指控
// 严格只读：先备份三个产物，跑完后比对，再恢复
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';

const ROOT = 'D:/Web/style';
const FILES = [
  'prototypes/_prompts/dna-raw.json',
  'prototypes/_prompts/dna-clean.json',
  'prototypes/_selection/prompts.js',
];
const hash = (p) => createHash('sha256').update(readFileSync(p)).digest('hex').slice(0, 16);

console.log('=== 1. 备份 + 记录 HEAD 态 hash ===\n');
const before = {};
for (const f of FILES) {
  before[f] = hash(`${ROOT}/${f}`);
  copyFileSync(`${ROOT}/${f}`, `${ROOT}/deliverables/70-plan/_backup-${f.replace(/\//g, '_')}`);
  console.log(`  ${f.padEnd(38)} ${before[f]}`);
}

console.log('\n=== 2. 重跑生成链 ===\n');
function run(script) {
  try {
    const out = execSync(`node ${script}`, { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
    return { ok: true, out: out.slice(-400) };
  } catch (e) {
    return { ok: false, out: (e.stdout || '') + (e.stderr || '') };
  }
}
for (const s of ['prototypes/_prompts/extract-dna.mjs', 'prototypes/_prompts/clean-dna.mjs', 'prototypes/_prompts/build-prompts.mjs']) {
  const r = run(s);
  console.log(`  ${s}  → ${r.ok ? 'exit 0' : 'FAILED'}`);
  if (!r.ok) console.log(r.out.slice(0, 500));
}

console.log('\n=== 3. 重跑后 hash 对比 ===\n');
let diffCount = 0;
for (const f of FILES) {
  const after = hash(`${ROOT}/${f}`);
  const same = after === before[f];
  if (!same) diffCount++;
  console.log(`  ${f.padEnd(38)} ${before[f]} → ${after}  ${same ? '✓ 一致' : '✗ 不一致'}`);
}

console.log('\n=== 4. 若不一致，看具体差在哪 ===\n');
for (const f of FILES) {
  const after = hash(`${ROOT}/${f}`);
  if (after === before[f]) continue;
  console.log(`--- ${f} ---`);
  if (f.endsWith('.json')) {
    const a = JSON.parse(readFileSync(`${ROOT}/deliverables/70-plan/_backup-${f.replace(/\//g, '_')}`, 'utf8'));
    const b = JSON.parse(readFileSync(`${ROOT}/${f}`, 'utf8'));
    const ar = a.rows || a, br = b.rows || b;
    for (let i = 0; i < Math.min(ar.length, br.length); i++) {
      const ka = JSON.stringify(ar[i]), kb = JSON.stringify(br[i]);
      if (ka === kb) continue;
      // 找具体字段
      const keys = new Set([...Object.keys(ar[i]), ...Object.keys(br[i])]);
      for (const k of keys) {
        const va = JSON.stringify(ar[i][k]), vb = JSON.stringify(br[i][k]);
        if (va !== vb) console.log(`  ${ar[i].id || i}.${k}:`);
        if (va !== vb) console.log(`     HEAD: ${String(va).slice(0, 200)}`);
        if (va !== vb) console.log(`     重跑: ${String(vb).slice(0, 200)}`);
      }
    }
  } else {
    const a = readFileSync(`${ROOT}/deliverables/70-plan/_backup-${f.replace(/\//g, '_')}`, 'utf8');
    const b = readFileSync(`${ROOT}/${f}`, 'utf8');
    console.log(`  长度 ${a.length} → ${b.length}`);
    // 找第一个不同位置
    let i = 0;
    while (i < Math.min(a.length, b.length) && a[i] === b[i]) i++;
    console.log(`  首个差异位置 ${i}:`);
    console.log(`     HEAD: ${JSON.stringify(a.slice(Math.max(0, i - 60), i + 120))}`);
    console.log(`     重跑: ${JSON.stringify(b.slice(Math.max(0, i - 60), i + 120))}`);
  }
}

console.log('\n=== 5. 恢复备份 ===\n');
for (const f of FILES) {
  copyFileSync(`${ROOT}/deliverables/70-plan/_backup-${f.replace(/\//g, '_')}`, `${ROOT}/${f}`);
  const h = hash(`${ROOT}/${f}`);
  console.log(`  ${f.padEnd(38)} 恢复为 ${h}  ${h === before[f] ? '✓' : '✗'}`);
}
console.log(`\n结论：${diffCount === 0 ? '三个产物全部可复现' : diffCount + ' 个产物不可复现'}`);
