// 验证 check-stale 的「提示词链」守卫真的能抓到陈旧
// 正确方法：把**输入**的 mtime 调新（而不是把产物调旧）
//   - dna-raw 的输入是 30 个 style.css       → 把 S19 的 style.css 调新
//   - dna-clean 的输入是 dna-raw.json         → 把 dna-raw.json 调新
//   - prompts.js 的输入是 dna-clean.json      → 把 dna-clean.json 调新
import { statSync, utimesSync } from 'node:fs';
import { execSync } from 'node:child_process';
const ROOT = 'D:/Web/style';

const tests = [
  {
    label: 'dna-raw',
    touch: 'prototypes/S19-copperplate-herbarium-cabinet/style.css',
    expect: 'dna-raw',
  },
  {
    label: 'dna-clean',
    touch: 'prototypes/_prompts/dna-raw.json',
    expect: 'dna-clean',
  },
  {
    label: 'prompts.js',
    touch: 'prototypes/_prompts/dna-clean.json',
    expect: 'prompts.js',
  },
];

function runStale() {
  try {
    return { code: 0, out: execSync('node prototypes/_build/check-stale.mjs', { cwd: ROOT, encoding: 'utf8' }) };
  } catch (e) {
    return { code: e.status, out: (e.stdout || '') + (e.stderr || '') };
  }
}

console.log('=== 1. 基线 ===');
const base = runStale();
console.log(`exit=${base.code}  ${base.out.trim().split('\n').slice(-1)[0]}`);

console.log('\n=== 2. 逐个把输入调新，看守卫是否报 ===\n');
let pass = 0;
for (const t of tests) {
  const p = `${ROOT}/${t.touch}`;
  const st = statSync(p);
  const at = st.atimeMs / 1000;
  const mt = st.mtimeMs / 1000;
  const forward = Date.now() / 1000 + 30;   // 调到 30 秒后
  try {
    utimesSync(p, at, forward);
    const r = runStale();
    const hitLine = r.out.split('\n').find((l) => /落后/.test(l) && l.includes(t.expect));
    const ok = !!hitLine;
    if (ok) pass++;
    console.log(`  调新 ${t.touch.split('/').pop().padEnd(22)} → ${ok ? '✓ 守卫抓到' : '✗ 守卫没报'}`);
    if (hitLine) console.log(`     ${hitLine.trim().slice(0, 130)}`);
  } finally {
    utimesSync(p, at, mt);
  }
}

console.log(`\n守卫有效性: ${pass}/${tests.length}`);
console.log('\n=== 3. 恢复后 ===');
const after = runStale();
console.log(`exit=${after.code}  ${after.out.trim().split('\n').slice(-1)[0]}`);

console.log('\n=== 4. mtime 已复原 ===');
for (const t of tests) {
  console.log(`  ${t.touch.split('/').pop().padEnd(22)} ${statSync(`${ROOT}/${t.touch}`).mtime.toISOString()}`);
}
