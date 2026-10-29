// R6 的变异测试：证明它真的会红（不是新的恒真式）
// 批判 Agent 指出我原来的 R2/R3/R4 是构造恒真式 —— 注入「一致的错」也全绿。
// 这里对 R6 做三个变异，每个都必须被抓到。
import { readFileSync, writeFileSync, copyFileSync, unlinkSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
const ROOT = 'D:/Web/style';
const DATA = 'prototypes/_selection/data.js';
const BAK = 'deliverables/71-verify/_data.js.bak';

function runGate() {
  try { return { code: 0, out: execSync('node prototypes/_build/check-twolines.mjs --quiet', { cwd: ROOT, encoding: 'utf8' }) }; }
  catch (e) { return { code: e.status, out: (e.stdout || '') + (e.stderr || '') }; }
}

copyFileSync(`${ROOT}/${DATA}`, `${ROOT}/${BAK}`);
const orig = readFileSync(`${ROOT}/${DATA}`, 'utf8');

console.log('=== 基线 ===');
const base = runGate();
console.log(`exit=${base.code}  ${base.out.trim().split('\n').slice(-1)[0]}`);

const TESTS = [
  {
    name: '变异 A：把 S05 的 primary 改成非主色（模拟旧 bug）',
    apply: (s) => s.replace(/"primary":\s*"#4FA83D"/, '"primary": "#BFB9A6"'),
    note: '这是修复前 S05 的真实错值（面板灰米）',
  },
  {
    name: '变异 B：把 S10 的 primary 改成面积最小的色',
    apply: (s) => s.replace(/"primary":\s*"#D32029"/, '"primary": "#6E7076"'),
    note: '这是修复前 S10 的真实错值（5% 面积色）',
  },
  {
    name: '变异 C：把 S01 的 primary 改成背景色',
    apply: (s) => s.replace(/"primary":\s*"#C1121F"/, '"primary": "#EFE7D7"'),
    note: '把主色换成底色 —— 最隐蔽的一种错',
  },
];

let pass = 0;
console.log('\n=== 变异测试 ===\n');
for (const t of TESTS) {
  const mutated = t.apply(orig);
  if (mutated === orig) {
    console.log(`  ${t.name}\n    ⚠ 替换未生效，跳过`);
    continue;
  }
  try {
    writeFileSync(`${ROOT}/${DATA}`, mutated, 'utf8');
    const r = runGate();
    const caught = r.code === 1 && /R6-primary-mismatch/.test(r.out);
    if (caught) pass++;
    console.log(`  ${t.name}`);
    console.log(`    ${caught ? '✓ R6 抓到' : '✗ R6 没报'}  exit=${r.code}   （${t.note}）`);
    if (caught) {
      const line = r.out.split('\n').find((l) => /R6-primary-mismatch/.test(l) && /S\d/.test(l));
      if (line) console.log(`    ${line.trim().slice(0, 130)}`);
    }
  } finally {
    writeFileSync(`${ROOT}/${DATA}`, orig, 'utf8');
  }
}

console.log(`\nR6 有效性: ${pass}/${TESTS.length}`);

console.log('\n=== 对照：注入「一致的错」—— R2/R3/R4 当年测不出这种 ===');
const CONSISTENT = orig.replace(/"primary":\s*"#C1121F"/, '"primary": "#123456"')
  .replace(/#C1121F/g, (m, off) => m);
// 只改 primary 字段，不动 palette —— 这是「一致」的反面（不一致）
// 真正的一致错需要同时改 primary 和 palette[1]，但 palette[1] 由 bg+primary 构造，
// 所以改 primary 就自动让 palette[1] 跟着变 —— 这正是 R2/R3 恒真的证明。
try {
  const marged = orig.replace(/"primary":\s*"#C1121F"/, '"primary": "#123456"');
  writeFileSync(`${ROOT}/${DATA}`, marged, 'utf8');
  const r = runGate();
  const caught = r.code === 1;
  console.log(`改 primary 为 #123456（palette[1] 也会跟着变，因为它是构造出来的）`);
  console.log(`  R6 ${caught ? '✓ 抓到（因为它比的是规格，不是 palette[1]）' : '✗ 没报'}`);
} finally {
  writeFileSync(`${ROOT}/${DATA}`, orig, 'utf8');
}

console.log('\n=== 恢复后 ===');
const after = runGate();
console.log(`exit=${after.code}  ${after.out.trim().split('\n').slice(-1)[0]}`);

if (existsSync(`${ROOT}/${BAK}`)) unlinkSync(`${ROOT}/${BAK}`);
console.log('\ngit status（应干净）:');
console.log(execSync('git status --porcelain -- prototypes/_selection/data.js', { cwd: ROOT, encoding: 'utf8' }).trim() || '  （干净）');
