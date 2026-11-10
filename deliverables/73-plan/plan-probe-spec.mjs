/* plan-probe-spec.mjs — 只读探针（P3 可行性实测）
 *
 * 目的：证明「规格字段 3/5 能不能被机械核」这件事，不是靠猜。
 * 对 30 案同时算两遍：
 *   A 面（规格）：从 `_specs/Sxx.md` 字段 3 抽 4 色＋面积和；从字段 5 抽栏数／栏沟／基线。
 *   B 面（CSS）： 从 `Sxx/style.css` 抽 grid-template-columns 的 N、gap、font-size/line-height。
 * 然后报告：可解析率、以及可解析的案里对得上的比例。
 *
 * 这一步的输出直接决定 P3 的判据该怎么写：
 *   若可解析率 < 60%，则「机械可核」只对某几个子集成立，检查器必须**跳过解析失败的案并计数**，
 *   否则它会把"我没解析出来"伪装成"案子合规"（本仓库最怕的假绿）。
 *
 * 只读，不写任何被跟踪文件。
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const P = join(ROOT, 'prototypes');
const cases = readdirSync(P, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name))
  .map((d) => d.name).sort();

/* ── 规格字段切分 ────────────────────────────────────────────────────────
 *
 * ⚠️ 第一版这里自己写了一条正则 `^(\d{1,2})(?:-附)?[.．]?\s*(名称)`，
 * 结果把 S11/S12/S15/S19/S20 的字段 5 切成了 12 字节 —— 因为
 * `12 栏，基线 8px，栏间距 24px…` 这一整行被读成了「字段 12，名字=栏，基线…」。
 * **这正是 `collect-schemes.mjs:220-246` 记录过并已修掉的那个 bug**，
 * 修法是「分隔符必需」：`-附` 或 `.`／`．` 至少出现一个。
 *
 * 结论（已写进 PLAN 的风险清单）：P3 的探针**不得自写字段解析器**，
 * 必须复用 collect-schemes.mjs 的三条正则（A/B/C 三种书写惯例）。
 * 下面是它的逐字复制，仅为让本探针的数字可信；产品化时必须 import 而不是抄。
 */
function specStarts(text) {
  const NAME = '([^\\n：*\\d][^\\n：*]{0,38}?)';
  const starts = [];
  for (const m of text.matchAll(new RegExp('^(\\d{1,2})(-附|[.．])\\s*' + NAME + '：', 'gm'))) {
    starts.push({ i: m.index, end: m.index + m[0].length, key: m[3] });
  }
  for (const m of text.matchAll(new RegExp('^\\*\\*(\\d{1,2})(-附)?[.．]?\\s*' + NAME + '\\*\\*\\s*$', 'gm'))) {
    starts.push({ i: m.index, end: m.index + m[0].length, key: m[3] });
  }
  for (const m of text.matchAll(new RegExp('^(\\d{1,2})(-附)?[.．]?\\s*\\*\\*' + NAME + '\\*\\*\\s*[：:]', 'gm'))) {
    starts.push({ i: m.index, end: m.index + m[0].length, key: m[3] });
  }
  starts.sort((a, b) => a.i - b.i);
  return starts;
}

function specFields(text) {
  const starts = specStarts(text);
  const tailRe = /^\s*(?:\*\*)?(?:真实上站文案|自评|版本|校验|审查)(?:\*\*)?\s*[：:]/m;
  const tailM = tailRe.exec(text.slice(starts.length ? starts[0].i : 0));
  const tailAbs = tailM && starts.length ? starts[0].i + tailM.index : text.length;
  const out = {};
  for (let i = 0; i < starts.length; i++) {
    const key = starts[i].key.replace(/（[^）]*）/g, '').trim();
    let to = i + 1 < starts.length ? starts[i + 1].i : tailAbs;
    if (to > tailAbs) to = tailAbs;
    const seg = text.slice(starts[i].end, to);
    if (key && !out[key]) out[key] = seg;
  }
  return out;
}

const cores = ['一句话视觉定义', '机制', '美学家族与参考', '配色系统', '字体策略', '布局与网格',
  '关键视觉要素', '关键视觉元素', '动效与交互', '去AI味审查点', '去 AI 味审查点',
  '反AI味风险与规避', '反 AI 味风险与规避', '适用场景', '可落地要点', '设计师签名式怪癖'];

function pick(fields, names) {
  for (const n of names) if (fields[n]) return fields[n];
  return '';
}

/* ── 规格侧抽取 ── */
const CN = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 十一: 11, 十二: 12, 十六: 16, 三十六: 36 };

function specCols(t) {
  let m;
  if ((m = t.match(/(?:列数|基础|采用|细分)\s*(\d{1,2})\s*栏/))) return { n: +m[1], how: '列数/基础/细分+N栏' };
  if ((m = t.match(/(\d{1,2})\s*栏(?:细分)?(?:栅格|网格)/))) return { n: +m[1], how: 'N栏栅格' };
  if ((m = t.match(/([一二两三四五六七八九十]+)\s*栏[，,、]/))) return { n: CN[m[1]], how: '中文栏' };
  if ((m = t.match(/basis[^;]*?(\d{1,2})\s*栏/))) return { n: +m[1], how: 'basis' };
  return null;
}
function specNum(t, re) { const m = t.match(re); return m ? Number(m[1]) : null; }

/* ── CSS 侧抽取 ── */
function cssCols(css) {
  const all = [...css.matchAll(/grid-template-columns\s*:\s*([^;}]+)/g)].map((m) => m[1].trim());
  const reps = all.map((v) => { const m = v.match(/repeat\(\s*(\d+)/); return m ? Number(m[1]) : null; }).filter((x) => x != null);
  return { decls: all.length, repeats: reps };
}

/* ── 字段 3：四色 + 面积和 ── */
function specPalette(t) {
  const hexes = [...t.matchAll(/#([0-9A-Fa-f]{6})(?![0-9A-Fa-f])/g)].map((m) => '#' + m[1].toUpperCase());
  const uniq = [...new Set(hexes)];
  const pcts = [...t.matchAll(/(\d{1,3})\s*%/g)].map((m) => Number(m[1]));
  const sum100 = /面积和\s*100/.test(t);
  return { uniq: uniq.length, hexes: uniq, pcts, sum100 };
}

const rows = [];
for (const dir of cases) {
  const id = dir.slice(0, 3);
  const specPath = join(P, '_specs', id + '.md');
  const cssPath = join(P, dir, 'style.css');
  if (!existsSync(specPath) || !existsSync(cssPath)) { rows.push({ id, dir, skip: true }); continue; }
  const f = specFields(readFileSync(specPath, 'utf8'));
  const f3 = pick(f, ['配色系统']);
  const f5 = pick(f, ['布局与网格']);
  const css = readFileSync(cssPath, 'utf8');

  const pal = f3 ? specPalette(f3) : null;
  const cols = f5 ? specCols(f5) : null;
  const gutter = f5 ? (specNum(f5, /栏[沟距][^\d]{0,6}(\d{1,3})\s*px/) ?? specNum(f5, /栅格间距[^\d]{0,6}(\d{1,3})\s*px/)) : null;
  const base = f5 ? specNum(f5, /基线\s*(\d{1,2})\s*px/) : null;
  const cc = cssCols(css);
  const cssGaps = [...css.matchAll(/(?:column-)?gap\s*:\s*([^;}]+)/g)].map((m) => m[1].trim());

  rows.push({
    id, dir,
    f3Len: f3.length, f5Len: f5.length,
    palUniq: pal ? pal.uniq : null, palSum100: pal ? pal.sum100 : null,
    specCols: cols ? cols.n : null, specColsHow: cols ? cols.how : '',
    specGutter: gutter, specBase: base,
    cssRepeat: cc.repeats, cssDecls: cc.decls,
    cssGapSamples: cssGaps.slice(0, 3),
    fieldsFound: Object.keys(f).length,
  });
}

/* ── 报告 ── */
console.log('═══ P3 · 规格字段 3／5 的机械可核性实测（30 案）═══\n');
console.log('  案    f3字  f5字  规格栏数  CSS repeat     栏沟(规格)  基线   f3唯一hex 面积和100');
for (const r of rows) {
  if (r.skip) { console.log(`  ${r.id}  （缺规格或 CSS）`); continue; }
  console.log(
    `  ${r.id} ${String(r.f3Len).padStart(6)} ${String(r.f5Len).padStart(6)} ` +
    `${String(r.specCols ?? '—').padStart(8)}  ${String('[' + r.cssRepeat.join(',') + ']').padEnd(14)} ` +
    `${String(r.specGutter ?? '—').padStart(10)} ${String(r.specBase ?? '—').padStart(5)} ` +
    `${String(r.palUniq ?? '—').padStart(10)} ${String(r.palSum100 ? 'Y' : 'N').padStart(6)}`
  );
}

const ok = rows.filter((r) => !r.skip);
const colParsed = ok.filter((r) => r.specCols != null);
console.log('\n  ── 可解析率 ──');
console.log(`  字段 5 能抽出「栏数」的案：${colParsed.length}/${ok.length}  (${Math.round(colParsed.length / ok.length * 100)}%)`);
console.log(`  CSS 里有 repeat(N) 的案：  ${ok.filter((r) => r.cssRepeat.length).length}/${ok.length}`);
console.log(`  两边都有 ⇒ 可机械比的案： ${ok.filter((r) => r.specCols != null && r.cssRepeat.length).length}/${ok.length}`);
console.log(`  字段 3 声明「面积和 100」： ${ok.filter((r) => r.palSum100).length}/${ok.length}`);
console.log(`  字段 3 唯一 hex 恰为 4 个： ${ok.filter((r) => r.palUniq === 4).length}/${ok.length}`);

/* 真正可比的那批：规格栏数 ∈ CSS repeat 集合 */
const both = ok.filter((r) => r.specCols != null && r.cssRepeat.length);
console.log('\n  ── 可比案里「规格栏数 ∈ CSS repeat 集合」的命中情况 ──');
for (const r of both) {
  const hit = r.cssRepeat.includes(r.specCols);
  console.log(`     ${r.id}  规格 ${String(r.specCols).padStart(2)}  vs CSS [${r.cssRepeat.join(',')}]  ${hit ? '✓' : '✗ 不一致'}`);
}
const hitN = both.filter((r) => r.cssRepeat.includes(r.specCols)).length;
console.log(`     命中 ${hitN}/${both.length}`);

console.log('\n  ── 结论对 P3 判据的含义 ──');
console.log(`  「栏数」这条若写成硬 FAIL，会立刻在 ${both.length - hitN} 个案上红；`);
console.log(`  而解析不出来的 ${ok.length - colParsed.length} 个案，检查器**必须显式计数并跳过** ——`);
console.log('  否则「我没解析出来」会被读成「合规」（假绿，本仓库 §9.19 已踩过同类）。');
