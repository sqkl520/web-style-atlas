import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:/Web/style';

console.log('=== 1. 复核规划 Agent 的"脏字体名"指控 ===\n');
const DIRS = ['S07-slate-ink-contents', 'S13-blind-debossed-dispatch', 'S21-interlocking-release-book'];
for (const d of DIRS) {
  const css = readFileSync(join(ROOT, 'prototypes', d, 'style.css'), 'utf8');
  // 复现 extract-dna.mjs:55 的正则（不剥注释）
  const families = new Set();
  for (const m of css.matchAll(/font-family\s*:\s*([^;}]+)/g)) {
    const first = m[1].split(',')[0].trim().replace(/^["']|["']$/g, '');
    if (first && !/^(serif|sans-serif|monospace|system-ui|ui-|cursive|fantasy|inherit|initial)$/i.test(first)) {
      families.add(first);
    }
  }
  const dirty = [...families].filter((f) => /[一-龥]|deliverables|\.md|实测|见|§|（|）/.test(f));
  console.log(`${d.slice(0, 3)}  抽到 ${families.size} 个字族，其中脏值 ${dirty.length} 个:`);
  for (const f of dirty) console.log(`    ⚠ ${JSON.stringify(f.slice(0, 120))}`);
}

console.log('\n=== 2. 检查这些脏值是否真的进了 dna-raw.json ===\n');
const raw = JSON.parse(readFileSync(join(ROOT, 'prototypes/_prompts/dna-raw.json'), 'utf8'));
const rows = raw.rows || raw;
for (const id of ['S07', 'S13', 'S21']) {
  const r = rows.find((x) => x.id === id);
  if (!r) { console.log(`${id} 不在 dna-raw.json`); continue; }
  console.log(`${id}  families: ${JSON.stringify(r.families)}`);
}

console.log('\n=== 3. 复核"7 案 11 色"这个数字 ===\n');
// 读规划 Agent 的探针结论（如果有对应 JSON）
const probeFiles = readdirSync(join(ROOT, 'deliverables/70-plan/probes')).filter((f) => f.endsWith('.mjs'));
console.log('规划 Agent 的探针: ' + probeFiles.join(' '));
