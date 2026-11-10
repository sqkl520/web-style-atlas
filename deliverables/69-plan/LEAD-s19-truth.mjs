// 核实 S19 提示词声称值 vs 原型实际 CSS 值
import { Browser } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = 'D:/Web/style';
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const p = join(ROOT, u);
  if (!existsSync(p)) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise(r => server.listen(8512, '127.0.0.1', r));
const browser = await Browser.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, mobile: false });
await page.goto('http://127.0.0.1:8512/prototypes/S19-copperplate-herbarium-cabinet/index.html', { settleMs: 2500 });

const o = await page.eval(`(() => {
  const h1 = document.querySelector('h1');
  const body = document.body;
  const cs = h1 ? getComputedStyle(h1) : null;
  const bcs = getComputedStyle(body);
  // 收集所有 border-width 实际值
  const widths = new Set();
  for (const el of document.querySelectorAll('*')) {
    const s = getComputedStyle(el);
    for (const k of ['borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth']) {
      const v = s[k];
      if (v && v !== '0px') widths.add(v);
    }
    if (s.outlineWidth && s.outlineStyle !== 'none') widths.add('outline:' + s.outlineWidth);
  }
  // border-radius 实际值
  const radii = new Set();
  for (const el of document.querySelectorAll('*')) {
    const s = getComputedStyle(el);
    if (s.borderTopLeftRadius && s.borderTopLeftRadius !== '0px') radii.add(s.borderTopLeftRadius);
  }
  // box-shadow
  const shadows = new Set();
  for (const el of document.querySelectorAll('*')) {
    const v = getComputedStyle(el).boxShadow;
    if (v && v !== 'none') shadows.add(v.slice(0, 60));
  }
  // 实际渲染的字体族（前 3 个不同元素）
  const fams = new Set();
  for (const el of document.querySelectorAll('h1,h2,p,dd,dt,span')) {
    const f = getComputedStyle(el).fontFamily.split(',')[0].replace(/["']/g,'').trim();
    if (f) fams.add(f);
  }
  return {
    h1Text: h1 ? h1.textContent.trim().slice(0, 40) : null,
    h1Font: cs ? cs.fontFamily : null,
    h1Size: cs ? cs.fontSize : null,
    bodyFont: bcs.fontFamily,
    bodyBg: bcs.backgroundColor,
    borderWidths: [...widths].sort(),
    radii: [...radii],
    shadowCount: shadows.size,
    shadowSamples: [...shadows].slice(0, 4),
    fontFamilies: [...fams],
    fontsLoaded: [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replace(/["']/g,'')),
  };
})()`);

console.log('=== S19 原型实际渲染 ===');
console.log(JSON.stringify(o, null, 1));

console.log('\n=== 提示词声称 vs 实际 ===');
const prompt = readFileSync('deliverables/69-plan/dump/S19.txt', 'utf8');
const claims = {
  '标题字体链 Noto Serif SC → Georgia': /标题按这个顺序取第一个可用的：Noto Serif SC → Georgia/.test(prompt),
  '线宽 0.4/0.8/1/3': /0.4px、0.8px、1px、3px/.test(prompt),
  '圆角全站 0': /全站一律 0/.test(prompt),
  '阴影只用 inset': /只用 inset/.test(prompt),
};
for (const [k, v] of Object.entries(claims)) console.log(`  提示词声称「${k}」: ${v}`);

console.log('\n=== 逐项对账 ===');
const actualFams = o.fontFamilies.join(' | ');
console.log(`  [字体] 提示词: Noto Serif SC → Georgia`);
console.log(`         实际 h1: ${o.h1Font}`);
console.log(`         实际用到的族: ${actualFams}`);
console.log(`         → 有 Spectral 吗? ${/Spectral/i.test(actualFams + ' ' + o.h1Font)}`);
console.log(`  [线宽] 提示词: 0.4, 0.8, 1, 3 px`);
console.log(`         实际: ${JSON.stringify(o.borderWidths)}`);
console.log(`  [圆角] 提示词: 全站 0`);
console.log(`         实际非零: ${JSON.stringify(o.radii)}`);
console.log(`  [阴影] 提示词: 只用 inset`);
console.log(`         实际 ${o.shadowCount} 种: ${JSON.stringify(o.shadowSamples)}`);
console.log(`         → 有外投影吗? ${o.shadowSamples.some(s => !s.includes('inset'))}`);
console.log(`  [底色] 提示词: #E4DECD`);
console.log(`         实际 body bg: ${o.bodyBg}`);

await browser.close();
server.close();
