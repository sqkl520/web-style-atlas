/* 负向测试：模拟「改名没做完」——data.js 里 fontsSpec 全部退回旧键名 fonts，
 * 而 app.js 仍是新写法。看六个闸门里有没有任何一个会红。
 * 用 node 读写，避免 PowerShell Set-Content 改编码。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const ROOT = 'D:/Web/style';
const DATA = ROOT + '/prototypes/_selection/data.js';
const orig = readFileSync(DATA, 'utf8');
const broken = orig.replace(/"fontsSpec":/g, '"fonts":');
if (broken === orig) { console.error('替换没生效，中止'); process.exit(1); }
console.log('  fontsSpec → fonts 替换处数:', [...orig.matchAll(/"fontsSpec":/g)].length);
writeFileSync(DATA, broken, 'utf8');
console.log('  已写破损版 data.js，大小', broken.length, '(原', orig.length, ')');
try {
  for (const s of ['check-prompts.mjs', 'check-twolines.mjs', 'check-contract.mjs', 'check-docs.mjs', 'check-anchors.mjs', 'check-stale.mjs']) {
    let out = '', code = 0;
    try {
      out = execSync(`node ${s}`, { cwd: ROOT + '/prototypes/_build', encoding: 'utf8', maxBuffer: 1 << 26, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) {
      code = e.status; out = String(e.stdout || '') + String(e.stderr || '');
    }
    const tail = out.trim().split('\n').filter((l) => /合计|✓|✗|FAIL|无法|Error|错误/i.test(l)).slice(-3).join(' || ');
    console.log(`  ${code === 0 ? '绿' : '红'} ${s}  exit=${code}  ${tail.slice(0, 150)}`);
  }
} finally {
  writeFileSync(DATA, orig, 'utf8');
  console.log('  已恢复 data.js');
}
