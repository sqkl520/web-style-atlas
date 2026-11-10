/* check-stale 的变异测试（v4 —— 用沙箱隔离被测对象）。
 *
 * 三版的教训，每一版都被独立证据打穿：
 *
 *   v1 用 `report.mtime` 当基准 → 但 check-stale:69 比的是 report 里的 `at`
 *      （两者差 11967 分钟）→ M2 永远红。我把它归因成"提示词链触发"，错。
 *   v2 改用 `at` 当基准 → M2 仍红。终验也误判成基准问题。
 *   v3 抬 dna-raw.mtime 想隔离第③节 → M2 仍红，而且**这次的输出证明了真因**：
 *        提示词链·dna-clean  _prompts/dna-raw.json 落后 5 分钟
 *      抬 dna-raw 会让它**下游的 dna-clean** 变陈旧。四环串联（css → dna-raw
 *      → dna-clean → prompts.js），抬任何一环都必然让下一环红。
 *
 *      ⇒ **在任何真实时间戳上做这个实验都不可能隔离第③节。**
 *
 * v4 的做法：M2 不再试图"让整体变绿"，而是**只断言第①节不再报 S12**。
 * 第③节报别的环节是链式推理的必然结果，与被测的 3 分钟阈值无关。
 *
 * 这是从"用 exit code 判定"改成"用输出内容判定"——因为 exit code 混合了
 * 三个独立检查源的结论。
 */
import { writeFileSync, utimesSync, statSync, readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const ROOT = 'D:/Web/style';
const CASE = join(ROOT, 'prototypes/S12-lime-knockout-wall');
const CSS = join(CASE, 'style.css');
const REP = join(CASE, '.inspect/report.json');
const JPG = join(CASE, '.inspect/desktop-fold.jpg');
const DNA = join(ROOT, 'prototypes/_prompts/dna-raw.json');

const cssOrig = readFileSync(CSS, 'utf8');
const repOrig = readFileSync(REP, 'utf8');
const cssStat = statSync(CSS);
const jpgStat = statSync(JPG);
const dnaStat = existsSync(DNA) ? statSync(DNA) : null;
const repAt = new Date(JSON.parse(repOrig).at).getTime();

const run = () => {
  try { return { code: 0, out: execSync('node prototypes/_build/check-stale.mjs', { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }; }
  catch (e) { return { code: e.status, out: String(e.stdout || '') }; }
};

const restore = () => {
  writeFileSync(CSS, cssOrig, 'utf8');
  writeFileSync(REP, repOrig, 'utf8');
  utimesSync(CSS, cssStat.atime, cssStat.mtime);
  utimesSync(JPG, jpgStat.atime, jpgStat.mtime);
  if (dnaStat) utimesSync(DNA, dnaStat.atime, dnaStat.mtime);
};

/* 判定辅助：输出里是否有一段专门讲 S12 的第①节陈旧。
 * 第①节的输出形状：`S12  style.css 落后 N 分钟  →  render-scheme.mjs S12-...`
 * 第③节的形状：`提示词链·xxx(...)  ...  →  clean-dna.mjs` 等
 * 所以用「S12 + render-scheme」这个组合精确定位第①节。 */
const section1Red = (out) => /S12\s+style\.css[^\n]*render-scheme\.mjs\s+S12/.test(out);
const jpgRed = (out) => /截图与报告不同步/.test(out);
const chainRed = (out) => /提示词链·/.test(out);

console.log(`[基准] report.at     = ${new Date(repAt).toISOString()}`);
console.log(`[基准] report.mtime  = ${new Date(statSync(REP).mtimeMs).toISOString()}`);
console.log(`[基准] dna-raw.mtime = ${dnaStat ? new Date(dnaStat.mtimeMs).toISOString() : '(无)'}\n`);

console.log('═══ 基线 ═══');
restore();
let r = run();
console.log(`  exit=${r.code}  ${(r.out.match(/全部新鲜|项陈旧/) || [''])[0]}`);
if (r.code !== 0) { console.log('  ⚠ 基线不绿，先重渲染再跑'); process.exit(1); }

const results = [];

/* M1：css 比 at 新 10 分钟 → 第①节必须红 */
{
  restore();
  const t = repAt + 600000;
  utimesSync(CSS, new Date(t), new Date(t));
  const res = run();
  results.push({ name: 'M1 css 比 at 新 10 分钟 → 第①节红', ok: section1Red(res.out), code: res.code });
  restore();
}

/* M2（反向）：css 只比 at 新 2 分钟 → **第①节**必须绿（阈值 3 分钟）
 * 不断言整体 exit：第③节可能因链式推理报别的环节，那与被测阈值无关。 */
{
  restore();
  const t = repAt + 120000;
  utimesSync(CSS, new Date(t), new Date(t));
  const res = run();
  results.push({
    name: 'M2（反向）css 只比 at 新 2 分钟 → 第①节绿（阈值 3 分钟）',
    ok: !section1Red(res.out),
    code: res.code,
    note: chainRed(res.out) ? '第③节另有报告（链式推理的必然，不计入本项）' : '',
  });
  restore();
}

/* M2b：css 比 at 新 3 分 1 秒 → 第①节必须红（阈值边界） */
{
  restore();
  const t = repAt + 181000;
  utimesSync(CSS, new Date(t), new Date(t));
  const res = run();
  results.push({ name: 'M2b css 比 at 新 3 分 1 秒 → 第①节红（边界）', ok: section1Red(res.out), code: res.code });
  restore();
}

/* M3：jpg 比 report.mtime 新 10 分钟 → jpg 判据必须红 */
{
  restore();
  const repM = statSync(REP).mtimeMs;
  utimesSync(JPG, new Date(repM + 600000), new Date(repM + 600000));
  const res = run();
  results.push({ name: 'M3 jpg 比 report.mtime 新 10 分钟 → 红', ok: jpgRed(res.out), code: res.code });
  restore();
}

/* M4（反向）：jpg 只新 1 秒 → 5 秒容差应放过 */
{
  restore();
  const repM = statSync(REP).mtimeMs;
  utimesSync(JPG, new Date(repM + 1000), new Date(repM + 1000));
  const res = run();
  results.push({ name: 'M4（反向）jpg 只新 1 秒 → 绿（5 秒容差）', ok: !jpgRed(res.out), code: res.code });
  restore();
}

/* M5：抬高 dna-raw → 第③节必须报（补齐复核指出的"第③节零覆盖"） */
{
  restore();
  if (dnaStat) {
    const t = Date.now() + 3600000;
    utimesSync(DNA, new Date(t), new Date(t));
    const res = run();
    results.push({ name: 'M5 抬高 dna-raw.mtime → 第③节报陈旧', ok: chainRed(res.out), code: res.code });
  } else results.push({ name: 'M5 抬高 dna-raw.mtime → 第③节报陈旧', ok: null, code: -1 });
  restore();
}

/* M6（反向）：全部复原 → 必须绿 */
{
  restore();
  const res = run();
  results.push({ name: 'M6（反向）全部复原后必须绿', ok: res.code === 0, code: res.code });
}

restore();
console.log('');
for (const x of results) {
  console.log(`${x.ok === true ? '✓' : x.ok === false ? '✗' : '?'}  ${x.name}   （exit=${x.code}）`);
  if (x.note) console.log(`     ${x.note}`);
}
const passed = results.filter((x) => x.ok === true).length;
console.log(`\n═══ check-stale 变异测试 v4: ${passed}/${results.length} ═══`);

r = run();
console.log(`恢复后: exit=${r.code}  ${(r.out.match(/全部新鲜|项陈旧/) || [''])[0]}`);
