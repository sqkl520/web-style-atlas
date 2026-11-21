#!/usr/bin/env node
/* 攻击 M：真原型被判违规的 8 个，逐个判定是「判据误报」还是「原型真不合规」。
 *
 * 用 buildStylePrompt 生成每个案的真实提示词，再用 judgeFontChain / scoreGradient
 * 对 prototypes/<dir>/index.html + style.css 打分，把命中点打出来供人判读。
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { judgeFontChain, scoreGradient } from './_rt-scorelib.mjs';

const ROOT = 'D:/Web/style';
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

const BAD = ['S03', 'S04', 'S07', 'S13', 'S16', 'S19', 'S21', 'S23'];
for (const id of BAD) {
  const s = W.SCHEMES.find(x => x.id === id);
  const pdir = join(ROOT, 'prototypes', s.dir);
  const css = readFileSync(join(pdir, 'style.css'), 'utf8');
  const html = '<style>\n' + css + '\n</style>';
  const prompt = G.buildStylePrompt(id, { biz: '一家修鞋配钥匙的小店', action: '打电话约个时间', have: 5 });
  const fc = judgeFontChain(prompt, html);
  const gs = scoreGradient(prompt, html);
  console.log(`\n══ ${id} ${s.cn || ''} ══`);
  if (fc && fc.outside.length) {
    console.log(`  字体链 outside (${fc.outside.length}):`);
    for (const o of fc.outside) console.log(`    ${JSON.stringify(o.slice(0, 90))}`);
    console.log(`  allowed: ${JSON.stringify(fc.allowed)}`);
  }
  if (gs && gs.hits) {
    console.log(`  渐变受限 hits=${gs.hits}（decorative 剔除 ${gs.decorative}）`);
    const bodies = [];
    const re = /(?:linear|radial|conic)-gradient\s*\(/g;
    let m;
    while ((m = re.exec(css))) {
      let depth = 1, i = re.lastIndex; const start = i;
      while (i < css.length && depth > 0) { if (css[i] === '(') depth++; else if (css[i] === ')') depth--; i++; }
      bodies.push(css.slice(start, i - 1));
    }
    for (const b of bodies) console.log(`    ${JSON.stringify(b.replace(/\s+/g, ' ').slice(0, 110))}`);
  }
}