// _selection 的 report.json 陈旧度：是我的改动造成的，还是本来就陈旧？
import { readFileSync, statSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const rep = 'prototypes/_selection/.inspect/report.json';
const at = new Date(JSON.parse(readFileSync(rep, 'utf8').replace(/^\uFEFF/, '')).at);
console.log('report.at =', at.toISOString(), ' (', at.toString().slice(0, 24), ')');

const srcs = ['index.html', 'style.css', 'app.js', 'prompt-copy.js', 'data.js', 'prompts.js', 'wizard.html', 'wizard.css', 'wizard.js'];
console.log('\n源文件 mtime 与 report.at 的差（正数 = 比报告新）:');
let newest = 0, newestName = '';
for (const f of srcs) {
  const p = 'prototypes/_selection/' + f;
  if (!existsSync(p)) { console.log(`  ${f.padEnd(16)} (缺失)`); continue; }
  const m = statSync(p).mtime;
  const gapMin = Math.round((m.getTime() - at.getTime()) / 60000);
  if (m.getTime() > newest) { newest = m.getTime(); newestName = f; }
  console.log(`  ${f.padEnd(16)} ${m.toISOString()}  落后 ${gapMin} 分钟`);
}
console.log(`\n最新源文件 = ${newestName}`);

// 我的三次编辑发生在什么时候？用 git diff 无法给时间，改看文件 mtime 与我的备份
console.log('\n我改过的三个文件（style.css / index.html / wizard.html）的 mtime:');
for (const f of ['style.css', 'index.html', 'wizard.html']) {
  const m = statSync('prototypes/_selection/' + f).mtime;
  console.log(`  ${f.padEnd(14)} ${m.toISOString()}  (我本轮编辑)`);
}
console.log('\n未被我改过的源文件里，有没有本来就比 report.at 新的？');
const untouched = ['app.js', 'prompt-copy.js', 'data.js', 'prompts.js', 'wizard.css', 'wizard.js'];
let anyUntouchedNewer = false;
for (const f of untouched) {
  const m = statSync('prototypes/_selection/' + f).mtime;
  const gapMin = Math.round((m.getTime() - at.getTime()) / 60000);
  if (gapMin > 1) { anyUntouchedNewer = true; console.log(`  ⚠ ${f} 比我到来之前就比报告新 ${gapMin} 分钟`); }
}
console.log(anyUntouchedNewer
  ? '\n结论：**我的编辑之前就已陈旧**（未被本轮触碰的源文件也比报告新）'
  : '\n结论：只有我改过的文件比报告新 —— 陈旧是本轮造成的');

// HEAD 提交时间 vs report.at
const headDate = execFileSync('git', ['log', '-1', '--format=%ci', 'HEAD'], { encoding: 'utf8' }).trim();
console.log('\nHEAD 提交时间 =', headDate);
const styleAtHead = execFileSync('git', ['log', '-1', '--format=%ci', '--', 'prototypes/_selection/style.css'], { encoding: 'utf8' }).trim();
console.log('style.css 最后一次提交时间 =', styleAtHead, '（早于我的工作区改动）');
