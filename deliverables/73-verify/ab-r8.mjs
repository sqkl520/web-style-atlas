/* R8 变异测试 v2：修 v1 的变异构造错误。
 *
 * v1 的 M3/M4 用正则改 data.js 文本，`"fontsSpec": ""` 这个替换把
 * 后续字符串的引号配错了 → data.js 变成非法 JSON → 闸门报
 * 「✗ 无法读取 data.js 的 window.SCHEMES」并 exit 1。
 * 那看起来像"闸门抓到了"，实际是**测试脚本把文件弄坏了**。
 *
 * v2 改为：解析 → 改对象 → 重新序列化，保证 JSON 合法。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const DATA = 'D:/Web/style/prototypes/_selection/data.js';
const orig = readFileSync(DATA, 'utf8');

/* 从 data.js 剥出 SCHEMES 数组，改完再拼回去。
 * 注意 data.js 开头有一段块注释，所以不能用 `^` 锚定到文件首。 */
const parse = (src) => {
  const i = src.indexOf('window.SCHEMES');
  if (i < 0) throw new Error('找不到 window.SCHEMES');
  const j = src.indexOf('[', i);
  const tail = src.lastIndexOf(']');
  if (j < 0 || tail < j) throw new Error('找不到 SCHEMES 数组边界');
  return {
    pre: src.slice(0, j),
    arr: JSON.parse(src.slice(j, tail + 1)),
    post: src.slice(tail + 1),
  };
};
const build = ({ pre, arr, post }) => pre + JSON.stringify(arr, null, 1) + post;

const run = () => {
  try { return { code: 0, out: execSync('node prototypes/_build/check-twolines.mjs', { cwd: 'D:/Web/style', encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }; }
  catch (e) { return { code: e.status, out: String(e.stdout || '') + String(e.stderr || '') }; }
};

const restore = () => writeFileSync(DATA, orig, 'utf8');

console.log('═══ 基线 ═══');
restore();
let r = run();
console.log(`  exit=${r.code}  R8=${(r.out.match(/R8 data\.js 的 fontsSpec 非空\s+(\d+\/\d+)/) || [])[1]}`);
if (r.code !== 0) { console.log('  ⚠ 基线不绿，终止'); process.exit(1); }

const results = [];
const T = (name, mutate, expectRed) => {
  restore();
  const p = parse(orig);
  mutate(p.arr);
  writeFileSync(DATA, build(p), 'utf8');
  const res = run();
  const r8 = (res.out.match(/R8 data\.js 的 fontsSpec 非空\s+(\d+\/\d+)/) || [])[1];
  const ok = expectRed ? (res.code === 1 && /R8-fontsSpec-missing/.test(res.out)) : res.code === 0;
  results.push({ name, ok, code: res.code, r8 });
  restore();
};

/* M1：全部 30 处退回 fonts（锐评 Agent 做过的负向测试） */
T('M1 全部 30 处 fontsSpec 退回 fonts（改名没做完）→ 必须红', (arr) => {
  for (const rec of arr) { rec.fonts = rec.fontsSpec; delete rec.fontsSpec; }
}, true);

/* M2：只把 S01 一处退回 */
T('M2 只把 S01 一处退回 fonts → 必须红（逐案判定）', (arr) => {
  const rec = arr.find((x) => x.id === 'S01');
  rec.fonts = rec.fontsSpec; delete rec.fontsSpec;
}, true);

/* M3：某案 fontsSpec 改成空串 */
T('M3 把 S01 的 fontsSpec 改成空串 → 必须红', (arr) => {
  arr.find((x) => x.id === 'S01').fontsSpec = '';
}, true);

/* M4（反向）：只改内容、保留键名 → 必须仍绿 */
T('M4（反向）改动 fontsSpec 内容但保留键名 → 必须绿', (arr) => {
  const rec = arr.find((x) => x.id === 'S01');
  rec.fontsSpec = rec.fontsSpec + '（变异）';
}, false);

restore();
console.log('');
for (const x of results) console.log(`${x.ok === true ? '✓' : x.ok === false ? '✗' : '?'}  ${x.name}   （exit=${x.code}  R8=${x.r8}）`);
const passed = results.filter((x) => x.ok === true).length;
console.log(`\n═══ R8 变异测试: ${passed}/${results.length} ═══`);

r = run();
console.log(`恢复后: exit=${r.code}  R8=${(r.out.match(/R8 data\.js 的 fontsSpec 非空\s+(\d+\/\d+)/) || [])[1]}`);
