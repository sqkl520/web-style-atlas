import { execSync } from 'node:child_process';
const ROOT = 'D:/Web/style';
const run = (c) => { try { return execSync(c, { cwd: ROOT, encoding: 'utf8' }).trim(); } catch (e) { return '(err) ' + (e.stdout || ''); } };

const FILES = [
  'prototypes/S13-blind-debossed-dispatch/style.css',
  'prototypes/S07-slate-ink-contents/style.css',
  'prototypes/S21-interlocking-release-book/style.css',
  'prototypes/_prompts/dna-raw.json',
  'prototypes/_prompts/dna-clean.json',
  'prototypes/_selection/prompts.js',
];

console.log('=== 各文件最后一次提交 ===\n');
for (const f of FILES) {
  const log = run(`git log -1 --format="%h %ad %s" --date=format:"%Y-%m-%d %H:%M" -- "${f}"`);
  console.log(`${f.padEnd(52)} ${log.slice(0, 90)}`);
}

console.log('\n=== 关键判定：dna-raw.json 是否比 S13 的 css 旧？===\n');
const cssTime = run(`git log -1 --format="%ct" -- "prototypes/S13-blind-debossed-dispatch/style.css"`);
const rawTime = run(`git log -1 --format="%ct" -- "prototypes/_prompts/dna-raw.json"`);
console.log(`S13 style.css 最后提交时间戳: ${cssTime}`);
console.log(`dna-raw.json  最后提交时间戳: ${rawTime}`);
console.log(`差值: ${Math.round((rawTime - cssTime) / 60)} 分钟`);
console.log(rawTime < cssTime ? '→ dna-raw.json 更旧！数据陈旧' : '→ dna-raw.json 更新');

console.log('\n=== 所有 30 案的 style.css 与 dna-raw.json 的时间对比 ===\n');
const dirs = run('git ls-files "prototypes/S*"').split('\n').filter((f) => f.endsWith('style.css'));
let stale = 0;
const staleList = [];
for (const f of dirs) {
  const t = run(`git log -1 --format="%ct" -- "${f}"`);
  if (+t > +rawTime) { stale++; staleList.push(`${f.split('/')[1].slice(0, 3)}(${Math.round((t - rawTime) / 86400)}d)`); }
}
console.log(`style.css 比 dna-raw.json 新的案: ${stale}/30`);
console.log(staleList.join(' '));
