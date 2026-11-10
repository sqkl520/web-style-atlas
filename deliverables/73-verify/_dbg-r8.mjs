import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const DATA = 'D:/Web/style/prototypes/_selection/data.js';
const orig = readFileSync(DATA, 'utf8');

const run = () => {
  try { return { code: 0, out: execSync('node prototypes/_build/check-twolines.mjs', { cwd: 'D:/Web/style', encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }; }
  catch (e) { return { code: e.status, out: String(e.stdout || '') }; }
};

const cases = [
  ['M3 空串', orig.replace(/"fontsSpec": "([^"]{20,})"/, '"fontsSpec": ""')],
  ['M4 改内容保键名', orig.replace(/"fontsSpec": "([^"]{20,})"/, '"fontsSpec": "$1（变异）"')],
];

for (const [name, next] of cases) {
  if (next === orig) { console.log(name, ': 替换失败'); continue; }
  writeFileSync(DATA, next, 'utf8');
  const r = run();
  console.log(`\n=== ${name} → exit=${r.code} ===`);
  console.log(r.out.split('\n').filter((l) => /R8|R1 |合计|R8-fonts/.test(l)).join('\n') || '(无匹配行)');
  writeFileSync(DATA, orig, 'utf8');
}

const r = run();
console.log(`\n恢复后 exit=${r.code}`);
