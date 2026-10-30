// 纹理载体闸门：`body` 必须保持纯色，纹理只能挂伪元素
//
// 为什么需要它 —— 这是本仓库唯一一条「一条违规会让所有其它闸门数据变成假的」的规则，
// 而且 _build/ 下**从来没有任何脚本检查过它**（2026-10-31 锐评指出）。
//
// `_CONTRACT.md` §9.2 原话：
//
//     9.2 整页纹理必须挂伪元素，不能挂 `body`。
//     这是**会伪造通过**的一条：探测器 `bgBehind()` 会在祖先链上找到
//     `background-image` 就整条跳过对比度检查。纹理挂 `body` 会有两个后果——
//     ① 所有对比度问题**静默通过**；② `filled`／空屏判定被刷成假的满分，
//     `empty-screens` 规则失去意义。
//
// §9.16 又强调一遍：「凡是要交出去的原型，纹理一律挂伪元素」。
//
// 后果的量级：本仓库所有其它闸门（contrast / empty-screens / 像素统计）
// 的输入都依赖这条成立。它一旦破了，其余检查器的绿都是假的 —— 包括
// check-contract 自己的输入（那些 report.json）。
//
// 判据（只认能证伪的事实，不做风格判断）：
//   T1  所有 `body` 规则里**不得**出现 `background-image`
//   T2  所有 `body` 规则里 `background` 不得含 `url(` / `gradient(`
//   T3  若 body 用了 `background: <图>` 简写（含 url/gradient），同样算违规
//
// 刻意**不查**的：
//   · `html` 上挂纹理 —— 契约只点名 body（`bgBehind` 从元素往祖先找，
//     html 是最后一层祖先，理论上也会命中。但本仓库实测 0 例，先不扩大范围，
//     免得报出无人认领的 WARN）
//   · `body::before` 等伪元素 —— 那是契约**推荐**的做法
//
// 用法：
//   node prototypes/_build/check-texture.mjs [--json] [--quiet]
//   退出码 0 = 全部合规；1 = 有案把纹理挂在 body 上

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const P = join(ROOT, 'prototypes');
const PRODUCTS = join(P, '_selection');

const QUIET = process.argv.includes('--quiet');
const JSON_OUT = process.argv.includes('--json');

/* 剥注释：CSS 注释里的 `background-image` 不算。
 * 这个坑本仓库踩过多次（静态计数把注释算进去 → 假阳性）。 */
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');

/* 花括号状态机：返回所有「选择器 { 声明 }」块，**含 @media 内嵌套的**。
 *
 * ⚠️ 2026-10-31 第三版。两版前科：
 *
 * 第一版用正则 `/(^|\})\s*([^{}]+?)\s*\{([^{}]*)\}/g`，
 * `}` 被匹配消耗后下一个模式要求 `^` 或 `}`，于是**相邻规则只看到隔一条**。
 * 实测 S02 的 `body { … background-image: url(...) }` 落在被跳过的一半里，
 * 闸门报「违规 0」。ab-texture 的 6 个变异全是「追加到末尾」，那个位置恰有
 * 未消耗的 `}` 作锚点，所以 6/6 全过 —— 测试盲区保护了缺陷。
 *
 * 第二版改成状态机，但只记录**深度 0 进入的块**，于是 `@media (...) { body { … } }`
 * 里的 body 规则 decls 永远是 null、被 `if (!r.decls) continue` 跳过。
 * 实测漏了 22 条（S16 有 5 个 body token 只命中 3 个、S24 同样）。
 *
 * 第三版：对**每个 `{`** 都记录一个块，然后从 `{` 往后做深度扫描找到配对的 `}`，
 * 取中间的声明。这样嵌套规则也能拿到自己的 decls。
 * 选择器 = 从上一个 `}` 或 `;` 或 `{` 之后到本 `{` 之前的文本，再按 `{`/`}`/`,` 切 token，
 * 所以 `@media (...) { body` 里的 ` body` 会被正确识别。 */
function parseRules(css) {
  const out = [];
  /* 先标出每个 { 与它配对的 } */
  const pairs = new Map();
  const stack = [];
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === '{') stack.push(i);
    else if (ch === '}') {
      const o = stack.pop();
      if (o !== undefined) pairs.set(o, i);
    }
  }
  /* 每个 { 都是一个块。选择器取「上一个定界符之后」到 `{` 之前。 */
  for (let i = 0; i < css.length; i++) {
    if (css[i] !== '{') continue;
    const close = pairs.get(i);
    if (close === undefined) continue;
    /* 往回找选择器起点：上一个 `}` 或 `;` 或 `{` */
    let s = i - 1;
    while (s >= 0 && css[s] !== '}' && css[s] !== ';' && css[s] !== '{') s--;
    const sel = css.slice(s + 1, i);
    out.push({ sel, decls: css.slice(i + 1, close) });
  }
  return out;
}

/* 从选择器串里抽「裸 body / 裸 html」。
 *
 * `@media (...) { body { … } }` 这种嵌套：本函数拿到的 sel 是 `body`（因为往回
 * 找到的定界符是外层 `{`），所以能正确识别。
 *
 * 按 `{`/`}`/`,` 切 token 并判断**完全等于** body / html —— 这样
 * `body::before`、`body.x`、`.body`、`#body`、`body.is-running` 都不会被误认。 */
function bareTagsOf(sel) {
  return String(sel)
    .split(/[{},]/)
    .map((s) => s.trim())
    .filter((t) => t === 'body' || t === 'html');
}

const findings = [];
const add = (level, scope, rule, msg) => findings.push({ level, scope, rule, msg });

const cases = readdirSync(P, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name))
  .map((d) => d.name)
  .sort();

/* 产品入口也要查：_selection 是用户直接看到的那一页 */
const targets = cases.map((dir) => ({ id: dir.slice(0, 3), dir, cssPath: join(P, dir, 'style.css') }));
const selCss = join(P, '_selection', 'style.css');
if (existsSync(selCss)) targets.push({ id: '_selection', dir: '_selection', cssPath: selCss });

const stats = { checked: 0, noCss: 0, allRules: 0, bodyRules: 0, fail: 0, warn: 0 };

for (const t of targets) {
  if (!existsSync(t.cssPath)) { stats.noCss++; continue; }
  stats.checked++;
  const css = stripComments(readFileSync(t.cssPath, 'utf8'));
  const rules = parseRules(css);
  stats.allRules += rules.length;

  for (const r of rules) {
    const tags = bareTagsOf(r.sel);
    if (!tags.length) continue;
    if (!r.decls) continue;
    stats.bodyRules++;
    const where = tags.join('+');

    /* T1：background-image 属性 */
    const biM = r.decls.match(/background-image\s*:\s*([^;}]+)/i);
    if (biM) {
      const v = biM[1].trim();
      if (v !== 'none' && /url\(|gradient\(/i.test(v)) {
        add('FAIL', t.id, 'T1-body-background-image',
          `\`${where}\` 上有 \`background-image: ${v.slice(0, 70)}\` —— ` +
          `§9.2 明令纹理必须挂伪元素。后果：probe.mjs 的 \`bgBehind()\` 会在祖先链` +
          `找到背景图就整条跳过对比度检查，该案的 contrast 与 empty-screens 静默通过。`);
      }
    }
    /* T2：background 简写里带 url()/gradient() */
    const bgM = r.decls.match(/(?:^|;)\s*background\s*:\s*([^;}]+)/i);
    if (bgM) {
      const v = bgM[1].trim();
      if (/url\(|gradient\(/i.test(v)) {
        add('FAIL', t.id, 'T2-body-background-shorthand',
          `\`${where}\` 的 \`background: ${v.slice(0, 70)}\` 里含图 —— 同上，纹理必须挂伪元素。`);
      }
    }
  }
}

if (!stats.checked) {
  add('FAIL', '*', 'T0-no-css',
    '一个 style.css 都没读到 —— 闸门无法判定。「无法判定」不等于「成立」。');
}

/* 自检：解析到的规则总数不该少得离谱。
 * 第一版因为正则吃掉 `}` 只看到 34 条 body 规则、漏掉 51 条，
 * 而它没有任何自检 —— 于是"闸门静默通过"这件事本身也静默通过了。
 * 这个 WARN 就是防止同类：如果解析器再坏一次，规则数会先掉下来。 */
if (stats.checked && stats.allRules < stats.checked * 20) {
  add('WARN', '*', 'T0-too-few-rules',
    `只解析到 ${stats.allRules} 条 CSS 规则（${stats.checked} 个文件，平均 ` +
    `${(stats.allRules / stats.checked).toFixed(1)} 条/文件）—— 数量异常偏少，解析器可能有缺陷。` +
    `第一版就因为这个征兆（当时只看到 34 条 body 规则、真实 85 条）漏报了 S02 的真实违规。`);
}

const FAILS = findings.filter((f) => f.level === 'FAIL');
const WARNS = findings.filter((f) => f.level === 'WARN');
stats.fail = FAILS.length;
stats.warn = WARNS.length;

if (JSON_OUT) {
  console.log(JSON.stringify({ stats, findings }, null, 2));
} else {
  console.log(`纹理载体闸门：${stats.checked} 个 style.css（30 案 + 产品入口）`);
  console.log('  查的是 `_CONTRACT.md` §9.2/§9.16：body 必须是纯色，纹理只能挂伪元素');
  console.log('  为什么它比别的闸门重要：这条一破，contrast 与 empty-screens 会静默通过，');
  console.log('  其余所有检查器的绿都变成假的。');
  console.log('');
  console.log(`  已检查 style.css        ${stats.checked}`);
  console.log(`  body/html 规则数        ${stats.bodyRules}`);
  console.log(`  违规                     ${FAILS.length}`);
  console.log('');
  if (!QUIET || FAILS.length) {
    for (const f of findings) {
      const mark = f.level === 'FAIL' ? '✗' : f.level === 'WARN' ? '~' : '·';
      console.log(`${mark} [${f.rule}] ${f.scope}`);
      console.log(`    ${f.msg}`);
    }
    console.log('');
  }
  console.log(`合计 FAIL ${stats.fail} / WARN ${stats.warn}`);
}

process.exit(FAILS.length ? 1 : 0);
