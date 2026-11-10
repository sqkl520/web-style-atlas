// 任务 1 探针 B：判断「提示词的线宽行」到底由谁決定、是否 stale。
// 三个候选源：
//   1. prototypes/_prompts/dna-clean.json   （clean-dna.mjs 的产物，当前 CSS 的抽取结果）
//   2. prototypes/_selection/prompts.js     （build-prompts.mjs 的产物，tracked 构建物）
//   3. 运行时 dump30.json                    （浏览器真的吐出来的提示词）
// 若 (1) ≠ (3)，说明 prompts.js 是旧 CSS 时代构建的 —— 线宽缺陷有「构建滞后」成分。
import { readFileSync, writeFileSync } from 'node:fs';

const R = 'D:/Web/style';
const OUT = R + '/deliverables/69-audit';

const dna = JSON.parse(readFileSync(R + '/prototypes/_prompts/dna-clean.json', 'utf8'));
const pjs = readFileSync(R + '/prototypes/_selection/prompts.js', 'utf8');
const dump = JSON.parse(readFileSync(OUT + '/dump30.json', 'utf8'));

// prompts.js 里的 schemes 段：按 id 抓 lineWidths
const map = {};
const re = /"id":\s*"(S\d\d)"[\s\S]*?"lineWidths":\s*"([^"]*)"/g;
let m;
while ((m = re.exec(pjs))) map[m[1]] = m[2];

const rows = [];
let diffPJ = 0, diffDump = 0;
for (const x of dna) {
  const fromDump = (() => {
    const t = dump.prompts[x.id] || '';
    const lm = t.match(/5\. 线宽只用这几级：([^，]+)，/);
    return lm ? lm[1] : null;
  })();
  const pj = map[x.id] || null;
  const stale1 = pj !== x.lineWidths;
  const stale2 = fromDump !== x.lineWidths;
  if (stale1) diffPJ++;
  if (stale2) diffDump++;
  rows.push({ id: x.id, dnaClean: x.lineWidths, promptsJs: pj, runtime: fromDump, stale1, stale2 });
}
writeFileSync(OUT + '/t1-source.json', JSON.stringify({ rows, diffPJ, diffDump }, null, 1), 'utf8');

console.log('id   dna-clean.json        prompts.js            runtime(dump)         stale?');
for (const r of rows) {
  console.log(r.id.padEnd(4), String(r.dnaClean).padEnd(22), String(r.promptsJs).padEnd(21), String(r.runtime).padEnd(21),
    r.stale1 || r.stale2 ? '⚠' : '');
}
console.log('\nstale vs prompts.js :', diffPJ, '/30');
console.log('stale vs runtime    :', diffDump, '/30');

// 检查 dump 是否仍与磁盘 prompts.js 一致（并发改动检测）
const dumpHash = readFileSync(OUT + '/dump30.json');
console.log('\ndump30.json mtime check + prompts.js schemes count:',
  (pjs.match(/"lineWidths"/g) || []).length);
