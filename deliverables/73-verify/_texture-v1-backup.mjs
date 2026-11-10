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

/* 抽某个选择器（精确匹配，不含伪元素后代）的声明块。
 * `body` / `body,` / `html, body` 都要认；`body::before` 不算。 */
function bodyBlocks(css) {
  const out = [];
  const re = /(^|\})\s*([^{}]+?)\s*\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    const sel = m[2].trim();
    /* 选择器组里只要有裸 `body` 就算（`html, body {…}`）。
     * 但要排除 `body::before` / `body.xxx` / `.body` 这类。 */
    const parts = sel.split(',').map((s) => s.trim());
    const isBareBody = parts.some((s) => s === 'body' || s === 'html');
    if (isBareBody) out.push({ sel, decls: m[3] });
  }
  return out;
}

const findings = [];
const add = (level, scope, rule, msg) => findings.push({ level, scope, rule, msg });

const cases = readdirSync(P, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name))
  .map((d) => d.name)
  .sort();

/* 产品入口也要查：_selection 是用户直接看到的那一页 */
const targets = cases.map((dir) => ({ id: dir.slice(0, 3), dir, cssPath: join(P, dir, 'style.css') }));
const selCss = join(PRODUCTS, 'style.css');
if (existsSync(selCss)) targets.push({ id: '_selection', dir: '_selection', cssPath: selCss });

const stats = { checked: 0, noCss: 0, bodyRules: 0, fail: 0, warn: 0 };

for (const t of targets) {
  if (!existsSync(t.cssPath)) { stats.noCss++; continue; }
  stats.checked++;
  const css = stripComments(readFileSync(t.cssPath, 'utf8'));
  const blocks = bodyBlocks(css);
  stats.bodyRules += blocks.length;

  for (const b of blocks) {
    /* T1/T3：background-image 属性 */
    const biM = b.decls.match(/background-image\s*:\s*([^;}]+)/i);
    if (biM) {
      const v = biM[1].trim();
      if (v !== 'none' && /url\(|gradient\(/i.test(v)) {
        add('FAIL', t.id, 'T1-body-background-image',
          `\`${b.sel}\` 上有 \`background-image: ${v.slice(0, 60)}\` —— ` +
          `§9.2 明令纹理必须挂伪元素。后果：contrast 与 empty-screens 会静默通过，` +
          `本仓库其余闸门的数据全部失真。`);
      }
    }
    /* T2：background 简写里带 url()/gradient() */
    const bgM = b.decls.match(/(?:^|;)\s*background\s*:\s*([^;}]+)/i);
    if (bgM) {
      const v = bgM[1].trim();
      if (/url\(|gradient\(/i.test(v)) {
        add('FAIL', t.id, 'T2-body-background-shorthand',
          `\`${b.sel}\` 的 \`background: ${v.slice(0, 60)}\` 里含图 —— 同上，纹理必须挂伪元素。`);
      }
    }
  }
}

if (!stats.checked) {
  add('FAIL', '*', 'T0-no-css',
    '一个 style.css 都没读到 —— 闸门无法判定。「无法判定」不等于「成立」。');
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
