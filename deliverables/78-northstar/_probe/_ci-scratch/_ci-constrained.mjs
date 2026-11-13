/* 严格核对：提示词**明确约束**的结构项，在两次产物里是否都成立。
 * 只查提示词原文写了的东西；页高 / max-width / DOM 嵌套方式都不是提示词约束项，不算。
 */
import { Browser } from '../../../../prototypes/_build/vendor/cdp.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const MIME = { '.html': 'text/html;charset=utf-8', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const FILES = ['S04-a', 'S04-b', 'S13-a', 'S13-b', 'S29-a', 'S29-b'];

const server = createServer(async (req, res) => {
  try {
    const p = join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    const buf = readFileSync(p);
    res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(buf);
  } catch { try { res.writeHead(404); res.end(); } catch {} }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const browser = await Browser.launch({ width: 1440, height: 900 });

const out = {};
for (const f of FILES) {
  const pg = await browser.newPage({ width: 1440, height: 900 });
  await pg.goto(`http://127.0.0.1:${port}/deliverables/78-northstar/_probe/_ci-scratch/${f}.html`, { settleMs: 700 });
  out[f] = await pg.eval(`(() => {
    const de = document.documentElement;
    const fold = 900; // 首屏高
    /* 首屏内所有可见内容是否同时可见（结构约束 5）：
       首屏内的元素不能有超出视口的、不能有需要滚动才出现的 */
    let overflowing = 0;
    for (const el of document.body.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.top < fold && r.bottom > fold + 2 && r.height > 20 && r.width > 100) overflowing++;
    }
    /* 主行动（防退化③：全屏只留一个主行动）：统计「看起来是 CTA」的元素 */
    const ctas = [...document.body.querySelectorAll('a,button')].filter(el => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (r.width < 40 || r.height < 18 || r.top + scrollY > fold * 1.2) return false;
      const bg = cs.backgroundColor;
      const op = parseFloat(cs.opacity);
      if (op < 0.5) return false;
      return bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent';
    });
    /* 并列条目栏宽是否不等（防退化④）：取所有「同构兄弟」容器，看其宽度集合 */
    const evens = [];
    for (const p of document.body.querySelectorAll('*')) {
      const kids = [...p.children].filter(k => {
        const cs = getComputedStyle(k);
        return cs.display !== 'none' && k.getBoundingClientRect().width > 50;
      });
      if (kids.length < 2 || kids.length > 8) continue;
      const ws = kids.map(k => Math.round(k.getBoundingClientRect().width));
      if (new Set(ws).size > 1 && (Math.max(...ws) - Math.min(...ws)) > 8) evens.push(kids.length + ':' + ws.join('/'));
    }
    /* 透明度用了几处（防退化⑥：所有底色不透明） */
    let translucentBg = 0;
    for (const el of document.body.querySelectorAll('*')) {
      const b = getComputedStyle(el).backgroundColor;
      const m = b.match(/rgba?\\(([^)]+)\\)/);
      if (m) { const parts = m[1].split(',').map(x => x.trim()); if (parts.length === 4 && parseFloat(parts[3]) < 1 && parseFloat(parts[3]) > 0) translucentBg++; }
    }
    /* 动效种类（防退化⑧：只有机制句里的那一个动作） */
    const animNames = new Set();
    for (const sheet of document.styleSheets) { try { for (const r of sheet.cssRules) { if (r.type === CSSRule.KEYFRAMES_RULE) animNames.add(r.name); } } catch {} }
    /* 图片位（结构约束 4） */
    const imgs = [...document.body.querySelectorAll('img')];
    const visibleImgs = imgs.filter(i => { const r = i.getBoundingClientRect(); return r.width > 20 && r.height > 20; }).length;
    return {
      foldOverflow: overflowing,
      ctaInFold: ctas.length,
      unevenSiblingGroups: evens.length,
      unevenSamples: evens.slice(0, 3),
      translucentBg,
      animCount: animNames.size,
      anims: [...animNames].slice(0, 5),
      imgTotal: imgs.length, imgVisible: visibleImgs,
    };
  })()`);
  await pg.close?.();
}
await browser.close(); server.close();
console.log(JSON.stringify(out, null, 1));
