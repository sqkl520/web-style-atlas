/* REVIEW-GATE2：ab-stale 的可复现诊断
 *
 * 目的：不依赖 ab-stale.mjs 自己的 ok/✗ 归纳，而是**把每个变异后 check-stale
 * 的完整输出抓下来**，看清到底是哪个 item 触发、gapMin 是多少。
 * 这样才能区分「阈值不对」与「测试脚本基准写错」。
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

/* check-stale 的完整输出 */
const runFull = () => {
  try { return { code: 0, out: execSync('node prototypes/_build/check-stale.mjs', { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }; }
  catch (e) { return { code: e.status, out: String(e.stdout || '') }; }
};

/* 与 ab-stale.mjs 完全一致的 restore() */
const restore = () => {
  writeFileSync(CSS, cssOrig, 'utf8');
  writeFileSync(REP, repOrig, 'utf8');
  utimesSync(CSS, cssStat.atime, cssStat.mtime);
  utimesSync(JPG, jpgStat.atime, jpgStat.mtime);
};

const iso = (ms) => new Date(ms).toISOString();

/* ⚠️ 关键：ab-stale.mjs 在**第 34 行**就把 repMtime 定死了，
 * 之后每次 restore() 都 writeFileSync(REP) —— 会把 report.json 的 mtime 刷新成"现在"。 */
const repMtimeAtStart = statSync(REP).mtimeMs;
const repAt = new Date(JSON.parse(repOrig).at).getTime();

console.log('═══ 基准常量（脚本启动时）═══');
console.log(`  report.at      = ${iso(repAt)}`);
console.log(`  report.mtime   = ${iso(repMtimeAtStart)}   ← ab-stale M3 用的基准`);
console.log(`  二者差         = ${((repMtimeAtStart - repAt) / 60000).toFixed(0)} 分钟`);
console.log('');

const show = (label, expect) => {
  const r = runFull();
  const body = r.out.split(/\r?\n/).filter((l) => /⚠️|←|✓ 全部新鲜/.test(l)).join('\n');
  console.log(`── ${label}`);
  console.log(`   期望 exit=${expect}  实得 exit=${r.code}`);
  console.log(body.split('\n').map((l) => '   ' + l).join('\n'));
  console.log(`   check-stale 实际看到的 report.mtime = ${iso(statSync(REP).mtimeMs)}`);
  console.log('');
  return r.code;
};

restore();
show('基线（无变异）', 0);

/* M1 */
restore();
utimesSync(CSS, new Date(repAt + 600000), new Date(repAt + 600000));
show('M1  css = at + 10min', 1);

/* M2：css = at + 2min，应当绿（阈值 3） */
restore();
utimesSync(CSS, new Date(repAt + 120000), new Date(repAt + 120000));
show('M2  css = at + 2min  （阈值 3 分钟 → 应绿）', 0);

/* M3：jpg = repMtimeAtStart + 10min
 * 但 restore() 已把 report.json 的 mtime 推到现在，所以真实比较基准变了 */
restore();
const repMnow = statSync(REP).mtimeMs;
utimesSync(JPG, new Date(repMtimeAtStart + 600000), new Date(repMtimeAtStart + 600000));
console.log('── M3  jpg = repMtimeAtStart + 10min');
console.log(`   ab-stale 设的 jpg      = ${iso(repMtimeAtStart + 600000)}`);
console.log(`   但 restore() 之后 report.mtime = ${iso(repMnow)}`);
console.log(`   实际差值（jpg − report）= ${((repMtimeAtStart + 600000 - repMnow) / 1000).toFixed(1)} 秒`);
console.log(`   触发条件 newestJpg > report.mtime + 5s → ${(repMtimeAtStart + 600000) > repMnow + 5000}`);
const m3code = runFull().code;
console.log(`   期望 exit=1  实得 exit=${m3code}`);
console.log('');

/* M4 */
restore();
utimesSync(JPG, new Date(statSync(REP).mtimeMs + 1000), new Date(statSync(REP).mtimeMs + 1000));
show('M4  jpg = report.mtime(当前) + 1s', 0);

restore();
console.log(`═══ 收尾基线 exit=${runFull().code} ═══`);
