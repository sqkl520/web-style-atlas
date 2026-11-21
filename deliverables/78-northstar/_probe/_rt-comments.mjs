#!/usr/bin/env node
/* 攻击 L：CSS 注释被当成声明解析。
 *
 * 判据全部用 /font-family\s*:\s*([^;}]+)/ 之类的正则直接扫 HTML/字符串，
 * **不剥 CSS 注释**。于是注释里出现的 `font-family:monospace（Chrome 实测…`
 * 会被当成一条真实声明。
 *
 * 证据源：prototypes/S07-slate-ink-contents/style.css:213-216 是一段解释性注释，
 * 第 215 行字面是 `font-family:monospace（Chrome 实测，见 …）`。
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { judgeFontChain, judgeRadius, judgeLineWidth, score } from './_rt-scorelib.mjs';

const ROOT = 'D:/Web/style';
const BT = join(ROOT, 'deliverables/78-northstar/_blindtest');
const W = {};
new Function('window', readFileSync(join(ROOT, 'prototypes/_selection/data.js'), 'utf8'))(W);
const P2 = {};
new Function('window', readFileSync(join(ROOT, 'prototypes/_selection/prompts.js'), 'utf8'))(P2);
const stub = {
  getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
  createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, addEventListener() {} }),
  addEventListener: () => {}, readyState: 'complete', body: { appendChild() {} },
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

const css = readFileSync(join(ROOT, 'prototypes/S07-slate-ink-contents/style.css'), 'utf8');
const prompt = G.buildStylePrompt('S07', { biz: '一家修鞋配钥匙的小店', action: '打电话约个时间', have: 5 });

console.log('══ L1 判据在 S07 的 style.css 里抓到的 font-family 声明 ══\n');
const decls = [...css.matchAll(/font-family\s*:\s*([^;}]+)/g)].map(m => m[1].trim());
for (const d of decls) {
  const inComment = /Chrome 实测|见 deliverables|其余 26 案/.test(d);
  console.log(`  ${inComment ? '【注释】' : '（声明）'} ${JSON.stringify(d.slice(0, 72))}`);
}

console.log('\n══ L2 这条注释导致的"链外"判定 ══\n');
const fc = judgeFontChain(prompt, '<style>\n' + css + '\n</style>');
console.log(`  allowed = ${JSON.stringify(fc.allowed)}`);
console.log(`  outside = ${JSON.stringify(fc.outside)}`);
console.log(`  → monospace 是 GENERIC_FAMILIES 里的通用回退，本来就不该报；`);
console.log(`    它被报的原因是它根本不是一个声明，而是注释里的一句话。`);

console.log('\n══ L3 最小复现：注释里的任意违规写法都会被当真 ══\n');
const cases = [
  ['注释里写 border-radius:8px（实际声明是 0）',
    '<style>/* 旧版试过 border-radius:8px，后来改回方角 */\n.a{border-radius:0}</style>',
    (h) => judgeRadius('圆角：全站一律 0', h).violations],
  ['注释里写 border-bottom:6px（实际声明是 1px）',
    '<style>/* 不要写成 border-bottom:6px */\n.a{border-bottom:1px solid #000}</style>',
    (h) => judgeLineWidth('线宽只用这几级：1px、3px', h).outside.length],
  ['注释里写 font-family:Arial（实际用 Noto Sans SC）',
    '<style>/* 别用 font-family:Arial */\n.a{font-family:"Noto Sans SC"}</style>',
    (h) => judgeFontChain('2. 字体：标题按这个顺序取第一个可用的：Noto Sans SC。', h).outside.length],
];
for (const [name, h, f] of cases) {
  const n = f(h);
  console.log(`  ${n > 0 ? '误报' : '不报'}  ${name}  → 命中 ${n}`);
}