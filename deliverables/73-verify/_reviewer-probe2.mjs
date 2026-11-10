/* 锐评 Agent 探针 2：核对新增注释里的数字，以及"改了生成器还没重跑"的中间态。
 * 交付方在 collect-schemes.mjs:354 与 app.js:236 的注释里都写了「约 775 字的字符串」。
 * 这个仓库的规矩是注释里的数字必须当场能量出来（check-docs 就是干这个的）。
 */
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const ROOT = 'D:/Web/style';
const SEL = ROOT + '/prototypes/_selection';
const parse = (src) => JSON.parse(src.match(/window\.SCHEMES\s*=\s*(\[[\s\S]*\])\s*;/)[1]);
const now = parse(readFileSync(SEL + '/data.js', 'utf8'));
const head = parse(execSync('git show HEAD:prototypes/_selection/data.js', { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 }));

const stats = (key) => {
  const lens = head.length && key === 'fontSpecHead' ? [] : [];
  return lens;
};

console.log('═══ E) fontsSpec 的真实长度分布（核对注释里的「约 775 字」）═══');
const nowLens = now.map((r) => String(r.fontsSpec || '').length);
const headLens = head.map((r) => String(r.fonts || '').length);
const agg = (a) => ({
  n: a.length, sum: a.reduce((x, y) => x + y, 0),
  min: Math.min(...a), max: Math.max(...a),
  avg: (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1),
  med: [...a].sort((x, y) => x - y)[a.length >> 1],
});
console.log('  NOW  fontsSpec:', JSON.stringify(agg(nowLens)));
console.log('  HEAD fonts    :', JSON.stringify(agg(headLens)));
console.log('  ⇒ 注释声称「约 775 字」，实测均值', agg(nowLens).avg, '字，最长', agg(nowLens).max, '字');
console.log('  ⇒ 775 与实测均值之比:', (775 / Number(agg(nowLens).avg)).toFixed(2), '倍');

/* 交付方脚本报 11,192；73-plan 的探针报 11,232。差异来源：JSON 转义后的源文件长度 vs 解析后的值。 */
const rawSrc = readFileSync(SEL + '/data.js', 'utf8');
const escapedLens = [...rawSrc.matchAll(/"fontsSpec": "((?:[^"\\]|\\.)*)"/g)].map((m) => m[1].length);
console.log('\n  解析后字符合计（verify 脚本口径）:', agg(nowLens).sum);
console.log('  源文件转义后长度合计（73-plan 口径）:', escapedLens.reduce((a, b) => a + b, 0));
console.log('  两者差值:', escapedLens.reduce((a, b) => a + b, 0) - agg(nowLens).sum, '（\\" 等转义符）');

console.log('\n═══ F) 「改了生成器、data.js 没重跑」的中间态是否真的存在 ═══');
const csPath = ROOT + '/prototypes/_build/collect-schemes.mjs';
const cs = readFileSync(csPath, 'utf8');
const writeAt = cs.split('\n').findIndex((l) => l.includes("writeFileSync(join(OUTDIR, 'data.js')"));
console.log('  写盘语句 collect-schemes.mjs:' + (writeAt + 1), '→ writeFileSync 一次性写整串');
console.log('  写盘方式: writeFileSync(路径, 完整 js 字符串) —— 单次调用、非流式、无临时文件+rename');
const idx = cs.indexOf('const js =');
console.log('  内容先在整个进程里拼完（' + (cs.slice(0, idx).split('\n').length) + ' 行之后）再一次性落盘 ⇒ 不存在"写一半就被读到"');
console.log('  ⇒ 中间态不是"进程内"竞态，而是**仓库状态**：生成器已改、data.js 未重生成（或重生成后未提交）');
const tracked = execSync('git ls-files prototypes/_build/collect-schemes.mjs prototypes/_selection/data.js', { cwd: ROOT, encoding: 'utf8' });
console.log('  两者都在版本控制内:', tracked.trim().split('\n').length === 2 ? '是' : '否');
console.log('  ⇒ 中间态可以被 commit（生成器与 data.js 是两个文件，git 不保证同步）');

console.log('\n═══ G) 兜底在「真实空值」下的行为 ═══');
/* 造一个 fontsSpec 为空串的案，走一遍 app.js:1357 的 field() 语义 */
const fake = { id: 'SXX', fontsSpec: '', fonts: undefined };
const expr = fake.fontsSpec || fake.fonts;
console.log('  fontsSpec="" → 表达式:', JSON.stringify(expr), '(undefined 而非 "")');
console.log('  field(标题, undefined) 的行为要去看 app.js 里 field() 的实现 —— 见下');
const app = readFileSync(SEL + '/app.js', 'utf8');
const fIdx = app.split('\n').findIndex((l) => l.trim().startsWith('function field('));
console.log('  field() 定义在 app.js:' + (fIdx + 1));
console.log('  ⇒ 空串与 undefined 在 field() 里是否走同一分支，决定兜底是"等价"还是"掩盖"');
for (let i = fIdx; i < fIdx + 14 && i < app.split('\n').length; i++) {
  console.log('    ' + (i + 1) + ': ' + app.split('\n')[i]);
}
