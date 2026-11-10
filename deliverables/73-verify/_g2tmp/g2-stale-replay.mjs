/* REVIEW-GATE2：在**不污染** S12 的前提下，逐条重放 ab-stale 的四个变异。
 *
 * 与我的上一版诊断的关键区别：不 import check-stale.mjs（它会 process.exit），
 * 而是子进程调用 + 每次之后**显式**恢复 css/report/jpg 的 mtime。
 * 另外把 check-stale 的文本输出里的 "落后 N 分钟" 行抓全，定位触发项。
 */
import { readFileSync, writeFileSync, statSync, utimesSync } from 'node:fs';
import { execSync } from 'node:child_process';

const ROOT = 'D:/Web/style';
const CASE = `${ROOT}/prototypes/S12-lime-knockout-wall`;
const CSS = `${CASE}/style.css`;
const REP = `${CASE}/.inspect/report.json`;
const JPG = `${CASE}/.inspect/desktop-fold.jpg`;

const cssOrig = readFileSync(CSS, 'utf8');
const repOrig = readFileSync(REP, 'utf8');
const cssStat = statSync(CSS);
const jpgStat = statSync(JPG);
const repAt = new Date(JSON.parse(repOrig).at).getTime();

const restore = () => {
  writeFileSync(CSS, cssOrig, 'utf8');
  writeFileSync(REP, repOrig, 'utf8');
  utimesSync(CSS, cssStat.atime, cssStat.mtime);
  utimesSync(JPG, jpgStat.atime, jpgStat.mtime);
};

const run = () => {
  try { return { code: 0, out: execSync('node prototypes/_build/check-stale.mjs', { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }; }
  catch (e) { return { code: e.status, out: String(e.stdout || '') }; }
};

const items = (out) => out.split(/\r?\n/).filter((l) => /落后/.test(l)).map((l) => l.trim());

console.log('═══ 常量 ═══');
console.log(`  report.at   = ${new Date(repAt).toISOString()}`);
console.log(`  css 原始 mtime = ${cssStat.mtime.toISOString()}`);
console.log(`  report 原始 mtime = ${new Date(statSync(REP).mtimeMs).toISOString()}`);
console.log(`  jpg 原始 mtime = ${jpgStat.mtime.toISOString()}`);
console.log('');

const cases = [
  ['基线', () => {}, 0],
  ['M1 css = at + 10min', () => utimesSync(CSS, new Date(repAt + 600000), new Date(repAt + 600000)), 1],
  ['M2 css = at + 2min', () => utimesSync(CSS, new Date(repAt + 120000), new Date(repAt + 120000)), 0],
  ['M3 jpg = report.mtime(启动时) + 10min', () => {
    const base = statSync(REP).mtimeMs;
    utimesSync(JPG, new Date(base + 600000), new Date(base + 600000));
  }, 1],
  ['M4 jpg = report.mtime + 1s', () => {
    const base = statSync(REP).mtimeMs;
    utimesSync(JPG, new Date(base + 1000), new Date(base + 1000));
  }, 0],
];

for (const [name, mutate, expect] of cases) {
  restore();
  mutate();
  const r = run();
  const it = items(r.out);
  console.log(`── ${name}   期望=${expect} 实得=${r.code} ${r.code === expect ? '✓' : '✗'}`);
  for (const l of it) console.log(`     ${l}`);
  if (!it.length) console.log('     （无陈旧项）');
}
restore();
const fin = run();
console.log(`\n恢复后 exit=${fin.code}`);
