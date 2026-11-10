import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const ROOT = 'D:/Web/style';
const CON = `${ROOT}/prototypes/_CONTRACT.md`;
const orig = readFileSync(CON, 'utf8');
const S = '`S13` 的 17 处 `shadow` 属真未修——该规则从未被任何断言检测到已清。';

writeFileSync(CON, orig.replace('## 10 ', S + '\n\n## 10 '), 'utf8');

/* 跑闸门并打印所有 C4 相关输出 */
let out = '';
try { out = execSync('node prototypes/_build/check-contract.mjs', { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
catch (e) { out = String(e.stdout || ''); }

console.log('=== 完整输出 ===');
console.log(out);

writeFileSync(CON, orig, 'utf8');
console.log('已恢复');
