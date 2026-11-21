#!/usr/bin/env node
/* 正对照的对照（2026-11-22）：证明现有 `--positive-control` 是一盏**假绿灯**。
 *
 * ── 发现 ────────────────────────────────────────────────────────────────
 *
 * score.mjs:1162 写：
 *     const r = score(s.id, { htmlPath: hp, promptPath: pp });
 * 但 score() 的签名是 `function score(id, opts = {})`，而函数体**从不读 opts**：
 *     const dir = join(BT, id);
 *     const htmlPath = join(dir, 'index.html');
 *
 * 于是正对照准备的那份 `tmp/index.html`（原型 HTML + style.css 拼起来）
 * 从未被读过。它真正判的是 `_blindtest/<id>/` 里的**AI 产物**。
 *
 * 后果有两层，都很严重：
 *   ① 正对照想证明"判据不冤枉手工做的合格样品"，实际证明的是
 *      "判据不冤枉已经判过一遍的 AI 产物" —— 同义反复。
 *   ② 35 个 scheme 里只有 17 个既在 `_blindtest/` 有产物、又在
 *      `prototypes/` 有原型。另外 17 个（S02 S03 S04 …）返回
 *      `{ok:false, why:'没有 index.html'}`，循环体 `if (r.ok && ...)`
 *      静默跳过，但 `checked++` 照样 +1，最后打印"检查 35 个原型"。
 *
 * 更有意思的是：真正的"手工合格样品"从来没有被这套判据碰过。
 * 所以「正对照通过」这句话，从加进来那天起就不成立。
 *
 * ── 这个脚本做什么 ──────────────────────────────────────────────────────
 *
 * 用**正确的**方式跑正对照：把 prototypes/S\* 的 HTML+CSS 读出来，
 * 配上原型自己的提示词，交给同一批判据函数。这份结果才是正对照
 * 本来应该给出的答案。
 *
 * 只读，不改 score.mjs。
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = decodeURIComponent(new URL('../../../', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const SCORE = join(ROOT, 'deliverables/78-northstar/_blindtest/score.mjs');

/* 取判据函数（只读源码切片） */
function loadJudges() {
  const src = readFileSync(SCORE, 'utf8');
  const cut = src.indexOf('/* ── 输出 ──');
  const head = cut > 0 ? src.slice(0, cut) : src;
  const body = head.replace(/^#!.*\n/, '').replace(/^import .*$/gm, '')
    .replace(/const ROOT = [\s\S]*?\n/, '').replace(/const BT = [\s\S]*?\n/, '');
  return new Function(body + `
    return { judgeRadius, judgeLineWidth, judgeFontChain, judgeGradientSpan,
             judgeDefaultFontStack, judgeItems, judgePictures, scoreGradient };`)();
}

/* 复刻 score() 里 ⑤无阴影 那 5 行（见 _equiv-probe.mjs 的说明） */
function noShadow(css) {
  const decls = [...css.matchAll(/box-shadow\s*:\s*((?!none)[^;}]+)/g)].map((m) => m[1]);
  let n = 0;
  for (const d of decls) {
    for (const part of d.split(/,(?![^(]*\))/)) {
      const nums = (part.match(/-?\d*\.?\d+px/g) || []).map((x) => parseFloat(x));
      if ((nums.length >= 3 ? Math.abs(nums[2]) : 0) > 0) { n++; break; }
    }
  }
  return n;
}

/* 建提示词：用原型自己的提示词生成器（与 score.mjs --positive-control 同样的注入方式） */
const W = {}; new Function('window', readFileSync(join(ROOT, 'prototypes/_selection/data.js'), 'utf8'))(W);
const P2 = {}; new Function('window', readFileSync(join(ROOT, 'prototypes/_selection/prompts.js'), 'utf8'))(P2);
const stub = {
  getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
  createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, addEventListener() {} }),
  addEventListener() {}, readyState: 'complete', body: { appendChild() {} },
};
const G = {
  STYLE_PROMPTS: P2.STYLE_PROMPTS, SCHEMES: W.SCHEMES, document: stub,
  location: { href: 'http://x/', search: '', hash: '' },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  navigator: { clipboard: { writeText: async () => {} } },
  history: { replaceState() {} }, setTimeout, clearTimeout,
};
new Function('window', 'document', 'location', 'localStorage', 'navigator', 'history', 'setTimeout', 'clearTimeout',
  readFileSync(join(ROOT, 'prototypes/_selection/prompt-copy.js'), 'utf8'))(
  G, G.document, G.location, G.localStorage, G.navigator, G.history, setTimeout, clearTimeout);

const J = loadJudges();

let checked = 0, flagged = 0, skipped = 0;
const rows = [];
for (const s of W.SCHEMES) {
  const pdir = join(ROOT, 'prototypes', s.dir);
  const ip = join(pdir, 'index.html');
  if (!existsSync(ip)) { skipped++; continue; }
  const cssPath = join(pdir, 'style.css');
  const html = readFileSync(ip, 'utf8') +
    (existsSync(cssPath) ? '\n<style>\n' + readFileSync(cssPath, 'utf8') + '\n</style>' : '');
  let prompt;
  try { prompt = G.buildStylePrompt(s.id, { biz: '一家修鞋配钥匙的小店', action: '打电话约个时间', have: 5 }); }
  catch (e) { rows.push({ id: s.id, err: '提示词生成失败: ' + e.message }); continue; }
  const css = ([...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n'));
  /* ⚠️ 客观性修正：原型的 style.css 里有大段注释，其中 S07/S13/S21 各有一句
   * 「<code> 从 UA 样式表里只带来一条 font-family:monospace」。
   * score.mjs **不剥注释**，于是它把注释里的 font-family 当成真声明。
   * 这里先把注释剥掉，才是在比"判据 vs 真声明"。剥完还报的，才是判据的真问题。 */
  const cssNoComments = css.replace(/\/\*[\s\S]*?\*\//g, ' ');

  const banned = [];
  const rad = J.judgeRadius(prompt, html);
  if (rad && rad.violations) banned.push('圆角×' + rad.violations);
  const lw = J.judgeLineWidth(prompt, html);
  if (lw && lw.outside.length) banned.push('线宽越界 ' + lw.outside.join(','));
  const g = J.scoreGradient(prompt, cssNoComments);
  if (g.wording && g.hits) banned.push('渐变受限×' + g.hits);
  const fc = J.judgeFontChain(prompt, cssNoComments);
  if (fc && fc.outside.length) banned.push('字体链外 ' + fc.outside.join(','));
  const gs = J.judgeGradientSpan(prompt, cssNoComments);
  if (gs && gs.over.length) banned.push('明度跨度 ' + gs.over.map((x) => x.span).join(','));
  const dfs = J.judgeDefaultFontStack(prompt, cssNoComments);
  if (dfs && dfs.hits.length) banned.push('默认栈 ' + dfs.hits.join(','));
  const ns = noShadow(cssNoComments);
  if (/无阴影|阴影：无/.test(prompt) && ns) banned.push('无阴影×' + ns);

  checked++;
  if (banned.length) { flagged++; rows.push({ id: s.id, banned }); }
}

console.log('正对照（修好之后）：35 个手工样品，用**原型自己的 HTML+CSS** 判');
console.log('═'.repeat(72));
console.log(`  进入循环 ${checked} 个，跳过 ${skipped} 个`);
console.log(`  被判违规 ${flagged} 个`);
console.log('');
for (const r of rows) {
  console.log('  ' + (r.err ? '!! ' : '✗ ') + r.id.padEnd(6) + (r.err || r.banned.join('；')));
}
console.log('');
console.log('═'.repeat(72));
console.log(flagged === 0
  ? '✓ 判据对手工样品 0 违规'
  : `✗ 判据把 ${flagged} 个手工合格样品判成违规 —— 这些是**真误报**，正对照原本该抓到它们`);
