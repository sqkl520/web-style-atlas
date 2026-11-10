/* REVIEW-GATE2：把 M2 的「本案阈值」与「提示词链」两个触发源彻底分开
 *
 * 假设：M2 之所以红，不是因为 §①（30 案阈值）判错，而是因为
 *       css 被设成 at+2min 后，**同时也比 _prompts/dna-raw.json 新**，
 *       于是第③节（提示词链，阈值 > 3 分钟，比的是「输入 vs 产物 mtime」）
 *       独立触发。这与前置条件 5 的「阈值 1→3」完全无关。
 *
 * 验证：
 *   A. 临时把 dna-raw.json 的 mtime 抬到 at+30min（让它比 css 新），再跑 M2
 *      → 若 exit 0，则证明本案 §① 的阈值是对的，红是第③节带来的。
 *   B. 复原 dna-raw 的 mtime。
 */
import { readFileSync, statSync, utimesSync } from 'node:fs';
import { execSync } from 'node:child_process';

const ROOT = 'D:/Web/style';
const CASE = `${ROOT}/prototypes/S12-lime-knockout-wall`;
const CSS = `${CASE}/style.css`;
const REP = `${CASE}/.inspect/report.json`;
const JPG = `${CASE}/.inspect/desktop-fold.jpg`;
const DNA = `${ROOT}/prototypes/_prompts/dna-raw.json`;

const cssStat = statSync(CSS);
const repOrig = readFileSync(REP, 'utf8');
const jpgStat = statSync(JPG);
const dnaStat = statSync(DNA);
const repAt = new Date(JSON.parse(repOrig).at).getTime();

const run = () => {
  try { return { code: 0, out: execSync('node prototypes/_build/check-stale.mjs', { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }; }
  catch (e) { return { code: e.status, out: String(e.stdout || '') }; }
};
const items = (o) => o.split(/\r?\n/).filter((l) => /落后/.test(l)).map((l) => l.trim());
const clean = () => {
  utimesSync(CSS, cssStat.atime, cssStat.mtime);
  utimesSync(REP, new Date(repAt + 1e3), new Date(repAt + 1e3)); // ← 故意远早于 dna-raw
  utimesSync(JPG, jpgStat.atime, jpgStat.mtime);
};

console.log('═══ A: 只跑 §①（让 dna-raw 比 css 新，隔离提示词链）═══');
clean();
utimesSync(DNA, new Date(repAt + 1800000), new Date(repAt + 1800000)); // dna-raw = at+30min
utimesSync(CSS, new Date(repAt + 120000), new Date(repAt + 120000));    // css = at+2min
let r = run();
console.log(`  css = at+2min, dna-raw = at+30min → exit=${r.code}（期望 0）`);
items(r.out).forEach((l) => console.log('    ' + l));

console.log('\n═══ B: 同一设置但 css = at+10min（应红，证明 §① 不是恒绿）═══');
clean();
utimesSync(DNA, new Date(repAt + 1800000), new Date(repAt + 1800000));
utimesSync(CSS, new Date(repAt + 600000), new Date(repAt + 600000));
r = run();
console.log(`  css = at+10min, dna-raw = at+30min → exit=${r.code}（期望 1）`);
items(r.out).forEach((l) => console.log('    ' + l));

console.log('\n═══ C: 边界 3 分钟（gapMin 恰好 3.0 → 判据是 >3，应绿）═══');
clean();
utimesSync(DNA, new Date(repAt + 1800000), new Date(repAt + 1800000));
utimesSync(CSS, new Date(repAt + 180000), new Date(repAt + 180000));
r = run();
console.log(`  css = at+3min → exit=${r.code}（期望 0，因为条件是 >3）`);
items(r.out).forEach((l) => console.log('    ' + l));

console.log('\n═══ D: 边界 3 分钟 + 1 秒（应红）═══');
clean();
utimesSync(DNA, new Date(repAt + 1800000), new Date(repAt + 1800000));
utimesSync(CSS, new Date(repAt + 181000), new Date(repAt + 181000));
r = run();
console.log(`  css = at+3min1s → exit=${r.code}（期望 1）`);
items(r.out).forEach((l) => console.log('    ' + l));

/* 收尾：恢复全部 mtime */
utimesSync(CSS, cssStat.atime, cssStat.mtime);
utimesSync(JPG, jpgStat.atime, jpgStat.mtime);
utimesSync(DNA, dnaStat.atime, dnaStat.mtime);
utimesSync(REP, new Date(repAt + 60000), new Date(repAt + 60000));
const fin = run();
console.log(`\n恢复后 exit=${fin.code}（期望 0）`);
