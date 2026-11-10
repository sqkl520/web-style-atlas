// r19-lint-ab.mjs — 对比 lint.mjs 在「改前快照」与「当前工作区」上的 emoji / hairline 命中数
// 说明：lint.mjs 是**静态源码扫描**，与 inspect.mjs（运行时 innerText）是两个不同口径。
// lint.mjs:80 只跳过"以 // /* * import <!-- 开头"的行 —— 本仓库的块注释续行多以空格或
// 文字开头，所以注释里的 ⚠ 会被它数到。这一点必须如实报告。
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const runLint = (files) => {
  const r = spawnSync(process.execPath, [
    'tools/taste-skill/skills/taste-skill/scripts/lint.mjs', ...files, '--json',
  ], { encoding: 'utf8' });
  const j = JSON.parse(r.stdout);
  const byId = {};
  for (const f of j.findings) {
    const k = f.level + ' ' + f.id;
    byId[k] = byId[k] || [];
    byId[k].push(`${f.file}:${f.line}`);
  }
  return byId;
};

const BEFORE = ['deliverables/67-exec/_lab/before-src/style.css', 'deliverables/67-exec/_lab/before-src/app.js'];
const AFTER = ['prototypes/_selection/style.css', 'prototypes/_selection/app.js'];

const b = runLint(BEFORE);
const a = runLint(AFTER);

const ids = [...new Set([...Object.keys(b), ...Object.keys(a)])].sort();
console.log('规则                   改前  改后');
console.log('-'.repeat(46));
for (const id of ids) {
  const nb = (b[id] || []).length, na = (a[id] || []).length;
  const mark = na > nb ? ' ← 变多' : na < nb ? ' ← 变少' : '';
  console.log(id.padEnd(22), String(nb).padStart(4), String(na).padStart(5), mark);
}
console.log('\n=== emoji 明细（改后）===');
for (const loc of (a['FAIL emoji'] || [])) {
  const [file, line] = loc.split(':');
  const txt = readFileSync(file, 'utf8').split(/\r?\n/)[+line - 1];
  const inBlockComment = (() => {
    // 粗判：该行之前最后一个 /* 与 */ 的顺序
    const src = readFileSync(file, 'utf8').split(/\r?\n/).slice(0, +line).join('\n');
    return src.lastIndexOf('/*') > src.lastIndexOf('*/');
  })();
  console.log(`${loc}  ${inBlockComment ? '[注释内]' : '[代码!]'}  ${txt.trim().slice(0, 70)}`);
}
