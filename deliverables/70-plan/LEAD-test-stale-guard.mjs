// 验证 check-stale 新增的「提示词链」守卫真的能抓到陈旧
// 手段：把 dna-clean.json 的 mtime 往回调 2 小时，再跑 check-stale，应当报陈旧
// 跑完立即恢复 mtime
import { statSync, utimesSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
const ROOT = 'D:/Web/style';

const targets = [
  { file: 'prototypes/_prompts/dna-raw.json', label: 'dna-raw' },
  { file: 'prototypes/_prompts/dna-clean.json', label: 'dna-clean' },
  { file: 'prototypes/_selection/prompts.js', label: 'prompts.js' },
];

console.log('=== 1. 基线（应当全绿）===');
try {
  const out = execSync('node prototypes/_build/check-stale.mjs', { cwd: ROOT, encoding: 'utf8' });
  console.log(out.trim());
} catch (e) {
  console.log('[exit ' + e.status + '] ' + (e.stdout || '').slice(0, 400));
}

console.log('\n=== 2. 逐个把产物 mtime 调早 2 小时，看守卫是否报 ===\n');
for (const t of targets) {
  const p = `${ROOT}/${t.file}`;
  const st = statSync(p);
  const oldAtime = st.atimeMs / 1000;
  const oldMtime = st.mtimeMs / 1000;
  const back = oldMtime - 7200;
  try {
    utimesSync(p, oldAtime, back);
    let reported = false;
    let msg = '';
    try {
      execSync('node prototypes/_build/check-stale.mjs', { cwd: ROOT, encoding: 'utf8' });
    } catch (e) {
      const out = (e.stdout || '') + (e.stderr || '');
      reported = out.includes(t.label) || out.includes(t.file.split('/').pop());
      const hit = out.split('\n').find((l) => l.includes(t.label) || l.includes(t.file.split('/').pop()));
      msg = hit ? hit.trim() : '(未在输出里找到)';
    }
    console.log(`  ${t.label.padEnd(12)} ${reported ? '✓ 守卫抓到' : '✗ 守卫没报'}   ${msg.slice(0, 110)}`);
  } finally {
    utimesSync(p, oldAtime, oldMtime);   // 恢复
  }
}

console.log('\n=== 3. 恢复后应当全绿 ===');
try {
  const out = execSync('node prototypes/_build/check-stale.mjs', { cwd: ROOT, encoding: 'utf8' });
  console.log(out.trim());
} catch (e) {
  console.log('[exit ' + e.status + '] ' + (e.stdout || '').slice(0, 300));
}

console.log('\n=== 4. 确认 mtime 已复原 ===');
for (const t of targets) {
  const st = statSync(`${ROOT}/${t.file}`);
  console.log(`  ${t.label.padEnd(12)} ${st.mtime.toISOString()}`);
}
