import { statSync, utimesSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { readdirSync } from 'node:fs';
const P = 'D:/Web/style/prototypes';

const caseDirs = () => readdirSync(P, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name);

function check(label, product, inputs) {
  const prod = join(P, product);
  if (!existsSync(prod)) { console.log(`${label}: 产物不存在`); return; }
  const prodM = statSync(prod).mtimeMs;
  let newest = 0, which = '';
  for (const f of inputs) {
    if (!existsSync(f)) { console.log(`  (缺输入 ${f})`); continue; }
    const m = statSync(f).mtimeMs;
    if (m > newest) { newest = m; which = f; }
  }
  const gap = (newest - prodM) / 60000;
  console.log(`${label}: 产物=${new Date(prodM).toISOString()}  最新输入=${new Date(newest).toISOString()} (${which.replace(/\\/g, '/').split('/prototypes/')[1]})  gap=${gap.toFixed(1)}分钟  ${gap > 1 ? '→ 应报陈旧' : '→ 不陈旧'}`);
}

const p = `${P}/_prompts/dna-raw.json`;
const st = statSync(p);
const at = st.atimeMs / 1000, mt = st.mtimeMs / 1000;
console.log('=== 调新 dna-raw.json 前 ===');
check('dna-raw   ', '_prompts/dna-raw.json', caseDirs().map((n) => join(P, n, 'style.css')));
check('dna-clean ', '_prompts/dna-clean.json', [join(P, '_prompts/dna-raw.json'), join(P, '_prompts/clean-dna.mjs')]);
check('prompts.js', '_selection/prompts.js', [join(P, '_prompts/dna-clean.json'), join(P, '_prompts/build-prompts.mjs')]);

try {
  utimesSync(p, at, Date.now() / 1000 + 300);
  console.log('\n=== 调新 dna-raw.json 到 +5 分钟后 ===');
  console.log('  新 dna-raw mtime: ' + statSync(p).mtime.toISOString());
  check('dna-raw   ', '_prompts/dna-raw.json', caseDirs().map((n) => join(P, n, 'style.css')));
  check('dna-clean ', '_prompts/dna-clean.json', [join(P, '_prompts/dna-raw.json'), join(P, '_prompts/clean-dna.mjs')]);
  check('prompts.js', '_selection/prompts.js', [join(P, '_prompts/dna-clean.json'), join(P, '_prompts/build-prompts.mjs')]);
} finally {
  utimesSync(p, at, mt);
}
