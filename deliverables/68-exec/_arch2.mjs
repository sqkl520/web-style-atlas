// 深挖：L7-11 那段自述是在哪个提交写进去的？每条的"改前"值在历史里存在过吗？
import { execFileSync } from 'node:child_process';

const git = (args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/^\uFEFF/, '');
const CSS = 'prototypes/_selection/style.css';
const revs = git(['log', '--format=%h', '--', CSS]).trim().split(/\r?\n/);
const show = (rev, f = CSS) => { try { return git(['show', `${rev}:${f}`]); } catch { return null; } };

console.log('=== 每提交里 style.css 开头 12 行（自述段）===');
for (const rev of revs) {
  const s = show(rev);
  const head = s.split(/\r?\n/).slice(0, 12);
  const has = head.join('\n').includes('过闸门时改掉');
  console.log(`\n--- ${rev}  自述段存在=${has} ---`);
  if (has) head.forEach((l, i) => console.log(`  ${i + 1}: ${l}`));
  else console.log('  ' + head.slice(0, 6).map((l) => l.slice(0, 100)).join('\n  '));
}

console.log('\n\n=== 3.8vw 到底出现在哪一行 ===');
for (const rev of revs) {
  const s = show(rev);
  s.split(/\r?\n/).forEach((l, i) => { if (/3\.8vw|4vw|5\.2vw/.test(l)) console.log(`  ${rev} L${i + 1}: ${l.trim().slice(0, 120)}`); });
}

console.log('\n=== 全仓库历史是否有 #6f6c64 / text-transform: uppercase 与 kicker 同块 ===');
try {
  console.log('  git log -S "#6f6c64" style.css:');
  console.log('   ', git(['log', '--format=%h %s', '-S', '#6f6c64', '--', CSS]).trim() || '(空)');
} catch (e) { console.log('  err', e.message.slice(0, 120)); }
for (const rev of revs) {
  const s = show(rev);
  const i = s.indexOf('.mast-kicker');
  const blk = i >= 0 ? s.slice(i, s.indexOf('}', i) + 1) : '';
  if (/uppercase|letter-spacing|text-transform/.test(blk)) console.log(`  ${rev}  kicker 块含 uppercase/ls: ${blk.replace(/\s+/g, ' ')}`);
}
console.log('  (上面无输出 = 任何提交里 .mast-kicker 都没有 uppercase/letter-spacing)');

console.log('\n=== 历史里 sticky 出现的位置（每提交）===');
for (const rev of revs) {
  const s = show(rev);
  const rows = [];
  s.split(/\r?\n/).forEach((l, i) => { if (/position:\s*sticky/.test(l)) {
    let sel = '';
    for (let j = i; j >= 0 && j > i - 6; j--) { if (s.split(/\r?\n/)[j].includes('{')) { sel = s.split(/\r?\n/)[j].split('{')[0].trim(); break; } }
    rows.push(`${sel}@L${i + 1}`);
  } });
  console.log(`  ${rev}  ${rows.join('  ')}`);
}

console.log('\n=== .mast-kicker 在 index.html / wizard.html 的类名与所在元素（历史）===');
for (const rev of revs) {
  for (const f of ['prototypes/_selection/index.html', 'prototypes/_selection/wizard.html']) {
    const s = show(rev, f);
    if (!s) continue;
    const m = s.match(/<p class="mast-kicker"[^>]*>([^<]*)/);
    if (m) console.log(`  ${rev} ${f.split('/').pop()}: "${m[1]}"`);
  }
}
