/* R7 变异测试：故意制造缺陷，看闸门是否真的会红。
 *
 * 上一轮的教训：R2/R3/R4 三条断言全是构造恒真式，30/30 全绿却测不出任何东西。
 * 所以每加一条断言，必须先证明它会红。
 */
import { readFileSync, writeFileSync, copyFileSync, unlinkSync } from 'node:fs';
import { execSync } from 'node:child_process';

const P = 'D:/Web/style/prototypes/_selection/prompts.js';
const BAK = 'D:/Web/style/deliverables/72-plan/_prompts.bak.js';

const run = () => {
  try { return { code: 0, out: execSync('node prototypes/_build/check-twolines.mjs', { cwd: 'D:/Web/style', encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }; }
  catch (e) { return { code: e.status, out: String(e.stdout || '') + String(e.stderr || '') }; }
};

console.log('═══ 基线 ═══');
let r = run();
console.log(`  exit=${r.code}  ${(r.out.match(/合计 FAIL \d+ \/ WARN \d+/) || [''])[0]}`);
if (r.code !== 0) { console.log('  ⚠ 基线不是绿的，先停下'); process.exit(1); }

copyFileSync(P, BAK);
const orig = readFileSync(P, 'utf8');

const mutations = [
  ['变异 A：把 S14 的调色板角色名全部剥掉（复现修复前的真实缺陷）', () => {
    // 找到 S14 的 dna.palette 字符串，把所有「（角色）」删掉
    const m = orig.match(/("id":\s*"S14"[\s\S]*?"palette":\s*")([^"]*)(")/);
    if (!m) return null;
    const stripped = m[2].replace(/（[^）]*）/g, '').replace(/\([^)]*\)/g, '');
    return orig.replace(m[0], m[1] + stripped + m[3]);
  }],
  ['变异 B：只删 S01 的一个角色名（最小破坏，看是否仍被抓）', () => {
    const m = orig.match(/("id":\s*"S01"[\s\S]*?"palette":\s*")([^"]*)(")/);
    if (!m) return null;
    const one = m[2].replace(/（([^）]*)）/, '');
    return orig.replace(m[0], m[1] + one + m[3]);
  }],
  ['变异 C：把某个 hex 后面塞一个空格和空括号「（ ）」', () => {
    const m = orig.match(/("id":\s*"S05"[\s\S]*?"palette":\s*")(#([0-9A-Fa-f]{6})[^、"]*)/);
    if (!m) return null;
    return orig.replace(m[0], m[1] + '#000000（ ）');
  }],
];

let caught = 0;
for (const [name, fn] of mutations) {
  const next = fn();
  if (!next) { console.log(`\n${name}\n  ✗ 变异构造失败（找不到目标），跳过`); continue; }
  writeFileSync(P, next, 'utf8');
  const res = run();
  const hit = res.code === 1 && /R7-palette-no-role/.test(res.out);
  if (hit) caught++;
  console.log(`\n${name}`);
  console.log(`  ${hit ? '✓ 闸门抓到' : '✗ 闸门没报'}   exit=${res.code}  触发规则: ${[...res.out.matchAll(/\[([\w-]+)\]/g)].map((x) => x[1]).join(', ') || '(无)'}`);
  if (hit) {
    const line = res.out.split('\n').find((l) => l.includes('调色板有'));
    if (line) console.log(`     ${line.trim()}`);
  }
  writeFileSync(P, orig, 'utf8');
}

writeFileSync(P, orig, 'utf8');
try { unlinkSync(BAK); } catch {}
console.log(`\n═══ R7 有效性: ${caught}/${mutations.length} ═══`);
r = run();
console.log(`恢复后: exit=${r.code}  ${(r.out.match(/合计 FAIL \d+ \/ WARN \d+/) || [''])[0]}`);
