/* 一致性验证：`_css-fonts.mjs` 的正确性证据。
 *
 * ── 2026-11-23 A3 审计后的结论先说 ────────────────────────────────
 *
 * **与共享盲区的实现一致，不构成等价证明。**
 *
 * 原版这个脚本只做一件事：拿新实现的「首族集合」去比 `_repeatability.mjs`
 * 的「首族集合」，73 份全同 → 报「等价」。这是假绿，理由有三条，每条都可实测：
 *
 *   ① 参照实现**只取首族**（`split(',')[0]`），所以整条回退链对不对，
 *      这个比对从结构上就看不见。把 `chainOf` 改成只返回首族，
 *      73 份**依然全绿**（本脚本 Part 3 的负对照会把这件事跑出来）。
 *   ② 参照实现有和旧实现**完全相同的盲区**：不排除 `@font-face`、
 *      不认 `font:` 简写。两份共享盲区的实现互相同意，说明不了任何一方对。
 *   ③ 参照不是从源文件里切出来的，而是**手抄**了一份（原版 `refRepeatability`
 *      注释里自己写着「照它的写法重建一份」）。手抄件与原件是否同步，
 *      原版没有任何机制保证 —— 本版改成带字符串/正则感知的切片器，
 *      直接从 `_repeatability.mjs` 切出真实 `features()`。
 *
 * 所以本脚本的定位改了：
 *   · Part 1 是**单元断言** —— 每条修正都有反例输入与期望输出。这才是证据。
 *   · Part 2 是**回归比对** —— 只在两边都有能力回答的问题上比（font-family
 *     的**首族集合**），用来保证新实现没有把旧行为改坏。它不证明等价。
 *   · Part 3 是**负对照** —— 证明这个比对器**能红**。没有这一节，
 *     Part 2 的绿灯不构成信息。
 *
 * 用法：node deliverables/78-northstar/_blindtest/_css-fonts-selftest.mjs
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  fontChains, fontDeclarations, shorthandDeclarations, chainOf, firstFamilies,
  cssVariables, cssText, expandVars, splitFamilies, shorthandFamilies,
  stripFontFaceRules, varConflicts, hasFallback, keywordDeclarations,
} from './_css-fonts.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const BT = HERE;

let pass = 0, fail = 0;
const rows = [];
function eq(name, got, want) {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  const ok = g === w;
  rows.push([ok, name, g, w]);
  ok ? pass++ : fail++;
}
function ok(name, cond, detail) {
  rows.push([!!cond, name, detail ?? String(cond), 'true']);
  cond ? pass++ : fail++;
}

/* ══════════════════════════════════════════════════════════════════════
 * Part 0 — 判据本身：先证明「等价」这个说法站不住
 * ══════════════════════════════════════════════════════════════════════ */
console.log('════ Part 0：为什么「73/73 等价」不是等价证明 ════\n');
console.log('  参照实现 _repeatability.mjs:70-76 只取 `split(",")[0]` —— 它回答的是');
console.log('  「用了哪些首族」，不是「回退链是什么」。而 _font-fallback-chain');
console.log('  消费的恰恰是**整条链**。首族集合一致，对链长/链尾一无所知。');
console.log('  两份实现还共享同一个盲区（不排除 @font-face、不认 font: 简写）。');
console.log('  ⇒ 「与共享盲区的实现一致，不构成等价证明。」\n');

/* ══════════════════════════════════════════════════════════════════════
 * Part 1 — 单元断言（每条修正一个反例）
 * ══════════════════════════════════════════════════════════════════════ */
console.log('════ Part 1：单元断言 ════\n');

/* ── 1.1 @font-face 是定义，不是使用 ─────────────────────────────── */
eq('@font-face/定义不算使用（审计指控 1 前半）',
  fontChains('@font-face{font-family:"Barlow"} .x{font-family:"Barlow",sans-serif}'),
  [['Barlow', 'sans-serif']]);
eq('@font-face/只有定义、没有使用 → 空',
  fontChains('@font-face{font-family:"Unused";src:url(x)}'),
  []);
eq('@font-face/带 src 的多行块整块排除',
  fontChains('@font-face {\n  font-family: "A";\n  src: local("A");\n}\n.b{font-family:var(--f)}\n:root{--f:"A", serif}'),
  [['A', 'serif']]);
eq('@font-face/大小写混写也排除',
  fontChains('<style>@FONT-FACE{font-family:"X"}.a{font-family:"Y"}</style>'),
  [['Y']]);
ok('@font-face/stripFontFaceRules 单测',
  stripFontFaceRules('@font-face{font-family:"A";src:local("A")}x').trim() === 'x',
  stripFontFaceRules('@font-face{font-family:"A";src:local("A")}x'));

/* ── 1.2 font: 简写 ──────────────────────────────────────────────── */
eq('font:简写/基本形态（审计指控 1 后半）',
  fontChains('.y{font:12px/1 "A", monospace}'),
  [['A', 'monospace']]);
eq('font:简写/带 weight 与 size/line-height',
  fontChains('.a{font:500 23px/1.1 "IBM Plex Mono",Consolas,serif}'),
  [['IBM Plex Mono', 'Consolas', 'serif']]);
eq('font:简写/size 与 line-height 分开写',
  fontChains('.a{font:12px / 1.5 "A", serif}'),
  [['A', 'serif']]);
eq('font:简写/italic small-caps 不被当族名',
  fontChains('.a{font:italic small-caps 700 16px "A", serif}'),
  [['A', 'serif']]);
eq('font:简写/inherit 不是字族声明（审计验收要求）',
  fontChains('.a{font:inherit}'),
  []);
eq('font:简写/系统关键字 menu 不是字族声明',
  fontChains('.a{font:menu}'),
  []);
eq('font:简写/size 是 var() 也能定位',
  fontChains('.a{font:var(--sz) "A", serif}'),
  [['A', 'serif']]);
eq('font:简写/不误伤 font-family（负向前瞻）',
  fontDeclarations('.a{font-family:"A",serif}'),
  ['"A",serif']);
eq('font:简写/极值关键字 xx-large 认作 size',
  fontChains('.a{font:xx-large "A", serif}'),
  [['A', 'serif']]);
eq('font:简写/数值 weight 后没有 size → 判不出，返回空（宁可漏）',
  fontChains('.a{font:700 bolder}'),
  []);

/* ── 1.3 inherit / 关键字 ────────────────────────────────────────── */
eq('inherit/font-family:inherit → 不产出条目（审计验收要求）',
  fontChains('.z{font-family:inherit}'),
  []);
eq('inherit/font-family:inherit 被识别为关键字声明',
  keywordDeclarations('.z{font-family:inherit}'),
  ['inherit']);
eq('inherit/只有关键字的声明不产出条目（同一份里的普通声明照常产出）',
  fontChains('.a{font-family:inherit}.b{font-family:"A",serif}'),
  [['A', 'serif']]);
eq('inherit/关键字被 chainOf 滤掉',
  chainOf('inherit'),
  []);
eq('inherit/链里夹关键字只滤那一个',
  chainOf('"A", inherit, serif'),
  ['A', 'serif']);
eq('inherit/revert-layer 也滤',
  chainOf('"A", revert-layer'),
  ['A']);

/* ── 1.4 引号内逗号 / !important ─────────────────────────────────── */
eq('切分/引号内逗号不是分隔符',
  splitFamilies('"Foo, Bar", serif'),
  ['"Foo, Bar"', 'serif']);
eq('切分/单引号同样处理',
  chainOf("'Foo, Bar', serif"),
  ['Foo, Bar', 'serif']);
eq('切分/!important 不进族名',
  chainOf('"A", serif !important'),
  ['A', 'serif']);
eq('切分/! important 带空格也认',
  chainOf('"A", serif ! important'),
  ['A', 'serif']);

/* ── 1.5 var 展开 ────────────────────────────────────────────────── */
const varsNested = cssVariables('--a: var(--b, var(--c)); --c: Georgia;');
eq('var/嵌套 fallback（原实现就会，保留为回归）',
  expandVars('var(--a), serif', varsNested).trim(),
  'Georgia, serif');
eq('var/未定义且无 fallback → 空',
  expandVars('var(--nope), serif', varsNested).trim(),
  ', serif');
eq('var/没闭合的 var( 不吞掉后面的文本',
  /var\(--x/.test(expandVars('font-family: var(--x', {})),
  true);
eq('var/深度上限后原样返回',
  typeof expandVars('var(--a)', { '--a': 'var(--a)' }),
  'string');

/* ── 1.6 CSS 上下文切分（HTML 属性里的 --x: 不是变量）───────────── */
const htmlS16 = '<style>.w{transform:translateX(var(--d))}</style><div style="--d:4px" data-index="05">x</div>';
eq('cssText/只取 <style> 与 style=""',
  cssVariables(htmlS16)['--d'],
  '4px');
ok('cssText/纯 CSS 原样返回',
  cssText('.a{color:red}') === '.a{color:red}',
  cssText('.a{color:red}'));
/* ⚠️ 这条是修 cssText 时自己踩的：第一版用「含 style= 或 <style 就当 HTML」
 * 判上下文，于是纯 CSS 文件里只要出现 `content:'<style>'` 或注释里的示例，
 * 整份 CSS 就被切成 0 字符。实测 prototypes/_selection/style.css 69 KB → 0。 */
const cssWithStyleWord = '.a::after{content:\'style="x"\'}\n.b{font-family:"A",serif}';
ok('cssText/CSS 里出现 style= 字样不会被误判成 HTML',
  cssText(cssWithStyleWord) === cssWithStyleWord, cssText(cssWithStyleWord).slice(0, 40));
eq('cssText/上一条的族名照常读出',
  fontChains(cssWithStyleWord), [['A', 'serif']]);
eq('varConflicts/同名变量多值可见化',
  varConflicts('<style>:root{--f:"A"}.dark{--f:"B"}</style>'),
  { '--f': ['"A"', '"B"'] });

/* ── 1.6b CSS 大小写不敏感（`FONT-FAMILY` / `VAR()` / `Font:` 都合法）── */
eq('大小写/FONT-FAMILY 大写也读',
  fontChains('.a{FONT-FAMILY:"A",serif}'), [['A', 'serif']]);
eq('大小写/VAR() 大写也展开',
  fontChains(':root{--f:"A",serif}.a{font-family:VAR(--f)}'), [['A', 'serif']]);
eq('大小写/Font: 大写也当简写',
  fontChains('.a{Font:12px "A",serif}'), [['A', 'serif']]);

/* ── 1.7 hasFallback ─────────────────────────────────────────────── */
eq('hasFallback/长度 2 算有', hasFallback(['a', 'serif']), true);
eq('hasFallback/长度 1 算无', hasFallback(['a']), false);

/* ══════════════════════════════════════════════════════════════════════
 * Part 2 — 回归比对：与 _repeatability 的**真实** features() 对齐
 *
 * ⚠️ 这一节只比「font-family 声明的首族集合」。它不是等价证明，
 *    因为参照实现只取首族、且共享盲区。它的作用是「没把旧行为改坏」。
 * ══════════════════════════════════════════════════════════════════════ */
console.log('════ Part 2：回归比对（与真实 features() 的首族集合）════\n');

/* 从源文件里切出真实的 features()。
 * 不能用手抄 —— 手抄件会漂移，而且原版就是这么干的。切片器要能穿过
 * 字符串、正则体、行注释、块注释里的花括号。 */
function extractFn(src, header) {
  const start = src.indexOf(header);
  if (start < 0) return null;
  const i = src.indexOf('{', start);
  let depth = 0, j = i;
  let quote = null, inRegex = false, lineC = false, blockC = false;
  let prev = '';
  for (; j < src.length; j++) {
    const ch = src[j], nx = src[j + 1];
    if (lineC) { if (ch === '\n') lineC = false; continue; }
    if (blockC) { if (ch === '*' && nx === '/') { blockC = false; j++; } continue; }
    if (quote) { if (ch === '\\') { j++; continue; } if (ch === quote) quote = null; continue; }
    if (inRegex) { if (ch === '\\') { j++; continue; } if (ch === '/') inRegex = false; continue; }
    if (ch === '/' && nx === '/') { lineC = true; j++; continue; }
    if (ch === '/' && nx === '*') { blockC = true; j++; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '/' && /[(,=:[!&|?{};+\-*%<>~^]/.test(prev)) { inRegex = true; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return src.slice(start, j + 1); }
    if (!/\s/.test(ch)) prev = ch;
  }
  return null;
}

const REF_PATH = resolve(BT, '..', '_probe', '_repeatability.mjs');
let refFeatures = null;
if (existsSync(REF_PATH)) {
  const fnSrc = extractFn(readFileSync(REF_PATH, 'utf8'), 'function features(html)');
  if (fnSrc) refFeatures = new Function('return (' + fnSrc + ')')();
}
ok('Part2/能从 _repeatability.mjs 切出真实 features()（不是手抄）',
  typeof refFeatures === 'function', typeof refFeatures);

/* 取样：所有产物 + 所有原型 */
const samples = [];
const artDirs = readdirSync(BT, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}(-r\d+)?$/.test(d.name)).map((d) => d.name).sort();
for (const id of artDirs) {
  const p = join(BT, id, 'index.html');
  if (existsSync(p)) samples.push({ id, src: readFileSync(p, 'utf8') });
}
const protoBase = resolve(BT, '..', '..', '..', 'prototypes');
let protoN = 0;
if (existsSync(protoBase)) {
  for (const d of readdirSync(protoBase, { withFileTypes: true })) {
    if (!d.isDirectory() || !/^S\d{2}-/.test(d.name)) continue;
    const p = join(protoBase, d.name, 'style.css');
    if (existsSync(p)) { samples.push({ id: d.name.slice(0, 3) + '(原型)', src: readFileSync(p, 'utf8') }); protoN++; }
  }
}
console.log(`比对样本：${samples.length} 份（产物 ${artDirs.length} + 原型 ${protoN}）`);

/* ── 2.0 空样本必须红 ─────────────────────────────────────────────
 * 原版从别的目录跑时样本数=0、退出码 0、报「全绿」—— 这是本仓库记过的
 * 「闸门什么都没读到却报干净数」。 */
ok('Part2/样本数下限 ≥ 70（防 0 样本假绿）', samples.length >= 70, String(samples.length));

/* ── 2.1 正对照：原型是手工做的合格样品，不能让它们读出「0 族」链 ──
 *
 * 这条抓的是一个具体的假象：`font-family: inherit`（原型里 6 处）如果按
 * 「一条声明、0 个族名」计，就会把「继承」算成「无退路」，原型从 0/35
 * 变成 9/35 不合格 —— 判据把合格样品判违规，按正对照原则是判据错。
 * 只要这条红了，就不许再拿「无退路率」去说产物。 */
const protoSamples = samples.filter((s) => s.id.endsWith('(原型)'));
let protoZero = [];
for (const s of protoSamples) {
  const ch = fontChains(s.src);
  if (ch.length && Math.min(...ch.map((c) => c.length)) === 0) protoZero.push(s.id);
}
eq('Part2/正对照：原型 0 份被读成「0 族链」', protoZero.length, 0);
if (protoZero.length) console.log('   脏读的原型:', protoZero.join(', '));



if (refFeatures) {
  let diff = 0;
  const bad = [];
  for (const s of samples) {
    const mine = new Set();
    /* 只比参照实现有能力回答的那部分：font-family 的首族、去重 */
    for (const c of fontChains(s.src, { shorthand: false })) {
      if (c[0] && !/^var\(/i.test(c[0])) mine.add(c[0]);
    }
    const a = [...mine].sort().join('|');
    const b = refFeatures(s.src).fontSet;
    if (a !== b) { diff++; bad.push({ id: s.id, mine: a, ref: b }); }
  }
  eq('Part2/73 份首族集合与参照一致（回归，不是等价证明）', diff, 0);
  for (const b of bad.slice(0, 5)) console.log(`   ✗ ${b.id}\n     新: ${b.mine || '（空）'}\n     参照: ${b.ref || '（空）'}`);
}

/* 参照实现的盲区，逐条列出来 —— 这些**不在**上面的比对范围内，
 * 所以上面的绿灯不能延伸到它们。 */
if (refFeatures) {
  eq('Part2/参照看不见 @font-face 定义（盲区 1，故不能比）',
    refFeatures('<style>@font-face{font-family:"Unused"}</style>').fontSet, 'Unused');
  eq('Part2/参照看不见 font: 简写（盲区 2，故不能比）',
    refFeatures('<style>.a{font:12px "A",serif}</style>').fontSet, '');
  ok('Part2/新实现这两条都能答（这才是它多出来的能力）',
    JSON.stringify(fontChains('<style>@font-face{font-family:"Unused"}</style>')) === '[]'
    && JSON.stringify(fontChains('<style>.a{font:12px "A",serif}</style>')) === '[["A","serif"]]',
    'n/a');
}

/* ══════════════════════════════════════════════════════════════════════
 * Part 3 — 负对照：证明上面的比对器**能红**
 *
 * 一段永远绿的检查不是检查。这里造两个已知错误的实现，确认：
 *   ① 首族比对**抓不到**链被截断（⇒ 首族一致不能证明 chainOf 正确）
 *   ② 首族比对**抓得到**不展开 var（⇒ 它对它声称能测的东西是灵敏的）
 * ══════════════════════════════════════════════════════════════════════ */
console.log('\n════ Part 3：负对照（比对器能红吗）════\n');

/* 变异 1：只返回首族 —— 模拟「链被截断」这个真实故障。 */
const truncating = (src) => {
  const css = src.replace(/\/\*[\s\S]*?\*\//g, '');
  const vars = cssVariables(css);
  return fontDeclarations(css).map((v) => chainOf(v, vars).slice(0, 1));
};
/* 变异 2：完全不展开 var —— 模拟历史上的那个坑。 */
const noExpand = (src) => {
  const css = src.replace(/\/\*[\s\S]*?\*\//g, '');
  return fontDeclarations(css).map((v) => chainOf(v, null));
};

/* ① 链被截断时，首族比对必须**看不见**差异。 */
let chainDiff = 0;
for (const s of samples) {
  const good = fontChains(s.src, { shorthand: false }).map((c) => c.join('|')).join(' // ');
  const badC = truncating(s.src).map((c) => c.join('|')).join(' // ');
  if (good !== badC) chainDiff++;
}
ok('负对照/整链相比能抓到「只返回首族」的截断',
  chainDiff > 0, `${chainDiff}/${samples.length} 份有差异`);

/* ② 但把同一个截断实现塞进 Part 2 的**首族**比对里，它全绿。 */
let firstFamDiff = 0;
for (const s of samples) {
  const mine = new Set();
  for (const c of truncating(s.src)) if (c[0] && !/^var\(/i.test(c[0])) mine.add(c[0]);
  if ([...mine].sort().join('|') !== refFeatures(s.src).fontSet) firstFamDiff++;
}
eq('负对照/首族比对对「链被截断」是瞎的（这正是不该叫等价证明的原因）',
  firstFamDiff, 0);

/* ③ 首族比对对「不展开 var」是灵敏的 —— 说明它不是一段死检查。 */
let varDiff = 0;
for (const s of samples) {
  const mine = new Set();
  for (const c of noExpand(s.src)) if (c[0] && !/^var\(/i.test(c[0])) mine.add(c[0]);
  if ([...mine].sort().join('|') !== refFeatures(s.src).fontSet) varDiff++;
}
ok('负对照/首族比对能抓到「不展开 var」',
  varDiff > 0, `${varDiff}/${samples.length} 份有差异`);

/* ══════════════════════════════════════════════════════════════════════
 * Part 4 — 输出
 * ══════════════════════════════════════════════════════════════════════ */
console.log('');
for (const [good, name, got, want] of rows) {
  console.log(`  ${good ? '✓' : '✗'} ${name}`);
  if (!good) console.log(`      实得 ${got}，期望 ${want}`);
}
console.log(`\n断言：${pass}/${pass + fail} 通过`);
console.log('');
console.log('结论：73/73 首族一致是**回归比对**，不是等价证明 ——');
console.log('      与共享盲区的实现一致不构成等价证明。');
console.log('      正确性证据在 Part 1（每条修正都有反例）与 Part 3（比对器能红）。');
process.exit(fail ? 1 : 0);