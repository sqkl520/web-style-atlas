import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const DATA = 'D:/Web/style/prototypes/_selection/data.js';
const orig = readFileSync(DATA, 'utf8');

writeFileSync(DATA, orig.replace(/"fontsSpec": "([^"]{20,})"/, '"fontsSpec": ""'), 'utf8');
try {
  execSync('node prototypes/_build/check-twolines.mjs', { cwd: 'D:/Web/style', encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  console.log('exit 0');
} catch (e) {
  console.log('exit', e.status);
  console.log('--- stdout 前 20 行 ---');
  console.log(String(e.stdout || '').split('\n').slice(0, 20).join('\n'));
  console.log('--- stderr 前 20 行 ---');
  console.log(String(e.stderr || '').split('\n').slice(0, 20).join('\n'));
}
writeFileSync(DATA, orig, 'utf8');
