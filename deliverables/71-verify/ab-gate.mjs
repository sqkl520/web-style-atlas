// 闸门自查：故意制造分歧，check-twolines 必须报出来
// 这是「闸门是有效守卫还是摆设」的验收标准。
// 70 轮我踩过这个坑：check-stale 的链式守卫因为路径写错，静默失效，看起来像通过。
import { readFileSync, writeFileSync, copyFileSync, unlinkSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
const ROOT = 'D:/Web/style';
const DATA = 'prototypes/_selection/data.js';
const BAK = 'deliverables/71-plan/_data.js.bak';

function runGate() {
  try {
    return { code: 0, out: execSync('node prototypes/_build/check-twolines.mjs --quiet', { cwd: ROOT, encoding: 'utf8' }) };
  } catch (e) {
    return { code: e.status, out: (e.stdout || '') + (e.stderr || '') };
  }
}

copyFileSync(`${ROOT}/${DATA}`, `${ROOT}/${BAK}`);
const orig = readFileSync(`${ROOT}/${DATA}`, 'utf8');

const TESTS = [
  {
    name: 'R1 破坏：给 data.js 塞一个 prompts.js 没有的色',
    apply: (s) => s.replace(/"palette": \[\n   "#EFE7D7"/, '"palette": [\n   "#ABCDEF",\n   "#EFE7D7"'),
    expectRule: 'R1-not-subset',
  },
  {
    name: 'R2 破坏：把 palette[0] 改成非底色',
    apply: (s) => s.replace(/"palette": \[\n   "#EFE7D7"/, '"palette": [\n   "#000001",\n   "#EFE7D7"'),
    // 改 palette[0] 会同时触发 R1（新色不在 prompts 里）和 R2（不是 bg），任一即可
    expectRule: null,
  },
  {
    name: 'R4 破坏：从 palette 里删掉底色',
    apply: (s) => s.replace(/"palette": \[\n   "#EFE7D7",\n/, '"palette": [\n'),
    // 删掉底色会触发 R2（palette[0] 变成了别的色）与 R4（底色不在 palette 里）
    expectRule: null,
  },
];

console.log('=== 基线 ===');
const base = runGate();
console.log(`exit=${base.code}  ${base.out.trim().split('\n').slice(-1)[0]}`);

let pass = 0;
console.log('\n=== 逐个破坏，看闸门是否报警 ===\n');
for (const t of TESTS) {
  const mutated = t.apply(orig);
  if (mutated === orig) {
    console.log(`  ${t.name}\n    ⚠ 替换未生效（正则没匹配上），跳过`);
    continue;
  }
  try {
    writeFileSync(`${ROOT}/${DATA}`, mutated, 'utf8');
    const r = runGate();
    // 判据：exit 1 即算抓到（规则名可能不同，因为一个破坏会同时触发多条断言）
    const caught = r.code === 1;
    const ruleOk = t.expectRule ? r.out.includes(t.expectRule) : true;
    const hit = caught && ruleOk;
    if (hit) pass++;
    const ruleHits = [...r.out.matchAll(/✗ \[([\w-]+)\]/g)].map((m) => m[1]);
    console.log(`  ${t.name}`);
    console.log(`    ${hit ? '✓ 闸门抓到' : '✗ 闸门没报'}  exit=${r.code}  触发规则: ${ruleHits.join(', ') || '(无)'}`);
    if (!hit) console.log(`    实际输出: ${r.out.slice(0, 300)}`);
  } finally {
    writeFileSync(`${ROOT}/${DATA}`, orig, 'utf8');
  }
}

console.log(`\n闸门有效性: ${pass}/${TESTS.length}`);

console.log('\n=== 恢复后 ===');
const after = runGate();
console.log(`exit=${after.code}  ${after.out.trim().split('\n').slice(-1)[0]}`);

// 清理
if (existsSync(`${ROOT}/${BAK}`)) unlinkSync(`${ROOT}/${BAK}`);
console.log('\ngit status（应当干净）:');
console.log(execSync('git status --porcelain -- prototypes/_selection/data.js', { cwd: ROOT, encoding: 'utf8' }).trim() || '  （干净）');
