/* 定位 M2 到底被哪一节触发。
 * 复核 Agent 说是第③节（dna-raw 比 css 旧 4.7 分钟）。
 * 我已经 liftDna 把它抬到 css 之后，为什么还红？
 */
import { writeFileSync, utimesSync, statSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const ROOT = 'D:/Web/style';
const CASE = join(ROOT, 'prototypes/S12-lime-knockout-wall');
const CSS = join(CASE, 'style.css');
const REP = join(CASE, '.inspect/report.json');
const DNA = join(ROOT, 'prototypes/_prompts/dna-raw.json');

const cssOrig = readFileSync(CSS, 'utf8');
const cssStat = statSync(CSS);
const dnaStat = statSync(DNA);
const repAt = new Date(JSON.parse(readFileSync(REP, 'utf8')).at).getTime();

const run = () => {
  try { return { code: 0, out: execSync('node prototypes/_build/check-stale.mjs', { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }; }
  catch (e) { return { code: e.status, out: String(e.stdout || '') }; }
};

const t = repAt + 120000;   // at + 2 分钟
console.log(`变异: css mtime = at + 2min = ${new Date(t).toISOString()}`);
console.log(`      dna-raw mtime 同时抬到 ${new Date(t + 1).toISOString()}`);
utimesSync(CSS, new Date(t), new Date(t));
utimesSync(DNA, new Date(t + 1), new Date(t + 1));

const res = run();
console.log(`\nexit=${res.code}`);
console.log('完整输出:');
console.log(res.out);

/* 用 DEBUG 环境变量看第③节的内部计算 */
try {
  const dbg = execSync('node prototypes/_build/check-stale.mjs', { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, DEBUG_STALE_CHAIN: '1' } });
  console.log('\n[DEBUG_STALE_CHAIN] stdout:', dbg);
} catch (e) {
  console.log('\n[DEBUG_STALE_CHAIN] stderr:', String(e.stderr || ''));
}

writeFileSync(CSS, cssOrig, 'utf8');
utimesSync(CSS, cssStat.atime, cssStat.mtime);
utimesSync(DNA, dnaStat.atime, dnaStat.mtime);
console.log('\n已复原');
