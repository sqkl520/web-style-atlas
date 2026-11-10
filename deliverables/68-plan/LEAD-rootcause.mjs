import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const GIT = 'D:\\Git\\cmd\\git.exe';
const git = (...a) => execFileSync(GIT, a, { encoding: 'utf8', maxBuffer: 64 << 20 });

// eed3587 完整 diff 中 .mast h1 那一段
console.log('=== eed3587 (2026-10-25 首屏瘦身) 对 .mast h1 的改动 + 上下文 ===');
const d = git('show', 'eed3587', '--', 'prototypes/_selection/style.css');
const lines = d.split('\n');
const idx = lines.findIndex(l => l.includes('--s-h1') || (l.includes('clamp(30px, 4vw, 56px)')));
for (let k = Math.max(0, idx - 18); k < Math.min(lines.length, idx + 18); k++) {
  if (lines[k] !== undefined) console.log('  ' + lines[k].slice(0, 135));
}

console.log('\n\n=== 这个 commit 的完整信息 ===');
console.log(git('show', '-s', '--format=%h %ai%n%s%n%n%b', 'eed3587'));

console.log('\n=== eed3587 的 diffstat ===');
const ds = git('show', '--stat', '--format=', 'eed3587');
console.log(ds.split('\n').filter(l => l.includes('_selection') || /files? changed/.test(l)).join('\n'));
