/* 证明 collect-schemes.mjs:732 那处改名不是摆设：把它退回 r.fonts，
 * 看 --check 的「缺 字体策略」会不会退化成 "全 30 案号"。跑完自动还原。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const P = 'D:/Web/style/prototypes/_build/collect-schemes.mjs';
const orig = readFileSync(P, 'utf8');
const target = "console.log('缺 字体策略：      ' + (miss((r) => r.fontsSpec).join(' ') || '无'));";
if (!orig.includes(target)) { console.error('找不到目标行'); process.exit(1); }
const line = () => execSync('node collect-schemes.mjs --check', { cwd: 'D:/Web/style/prototypes/_build', encoding: 'utf8', maxBuffer: 1 << 26 })
  .split('\n').find((l) => l.includes('缺 字体策略'));
try {
  console.log('  改后（r.fontsSpec）:', line());
  writeFileSync(P, orig.replace(target, target.replace('r.fontsSpec', 'r.fonts')), 'utf8');
  console.log('  改前（r.fonts）    :', line());
} finally {
  writeFileSync(P, orig, 'utf8');
  console.log('  已还原');
}
