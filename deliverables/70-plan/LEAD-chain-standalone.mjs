import { statSync, utimesSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const P = 'D:/Web/style/prototypes';

const caseDirs = () => readdirSync(P, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name).sort();

const CHAIN = [
  { product: '_prompts/dna-raw.json', inputs: () => caseDirs().map((n) => join(P, n, 'style.css')), label: '提示词链·dna-raw' },
  { product: '_prompts/dna-clean.json', inputs: () => [join(P, '_prompts/dna-raw.json'), join(P, '_prompts/clean-dna.mjs')], label: '提示词链·dna-clean' },
  { product: '_selection/prompts.js', inputs: () => [join(P, '_prompts/dna-clean.json'), join(P, '_prompts/build-prompts.mjs')], label: '提示词链·prompts.js' },
];

function chainFindings() {
  const out = [];
  for (const link of CHAIN) {
    const prod = join(P, link.product);
    if (!existsSync(prod)) { out.push({ label: link.label, skip: '产物不存在' }); continue; }
    const prodM = statSync(prod).mtimeMs;
    let newest = 0, which = '';
    for (const f of link.inputs()) {
      if (!existsSync(f)) continue;
      const m = statSync(f).mtimeMs;
      if (m > newest) { newest = m; which = f; }
    }
    if (!which) { out.push({ label: link.label, skip: '无输入' }); continue; }
    const gapMin = (newest - prodM) / 60000;
    out.push({ label: link.label, gapMin: +gapMin.toFixed(1), which: which.replace(/\\/g, '/').split('/prototypes/')[1], stale: gapMin > 1 });
  }
  return out;
}

console.log('=== 基线 ===');
for (const x of chainFindings()) console.log('  ' + JSON.stringify(x));

const p = join(P, '_prompts/dna-raw.json');
const st = statSync(p); const at = st.atimeMs / 1000, mt = st.mtimeMs / 1000;
try {
  utimesSync(p, at, Date.now() / 1000 + 300);
  console.log('\n=== 调新 dna-raw.json +5min ===');
  for (const x of chainFindings()) console.log('  ' + JSON.stringify(x));
} finally {
  utimesSync(p, at, mt);
}
console.log('\n=== 恢复后 ===');
for (const x of chainFindings()) console.log('  ' + JSON.stringify(x));
