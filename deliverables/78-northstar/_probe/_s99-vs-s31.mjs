/* S99 与 S31 产物的正面对账：同一套判据量两份产物，避免"对一边严、对一边松"。
 *
 * 为什么要写这个：负对照的结论只能是 A 或 B，而判 A/B 的关键不是"S99 好不好看"，
 * 是"S99 与 S31 的**命中质量**差多少"。如果只对 S99 做逐值核验、对 S31 只报那 6 个数，
 * 就是双重标准 —— 本仓库记录在案的老病（闸门只在自己方便的地方严）。
 *
 * 判据（两边都量）：
 *   1. 机制句的每一个可测值，在浏览器里实测（不是 grep CSS）
 *   2. 机制值之间是否互相自洽（读数 = 实测/单位）
 *   3. 结构骨架：主容器轨道数、轨道是否可复现（有明确 grid-template-columns）
 *   4. 内容量：CJK 字数、条目数
 *
 * 用法：node deliverables/78-northstar/_probe/_s99-vs-s31.mjs
 */
import { Browser } from '../../../prototypes/_build/vendor/cdp.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    const p = resolve(ROOT, '.' + decodeURIComponent(req.url.split('?')[0]));
    if (!p.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    const buf = await readFile(p);
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(buf);
  } catch { if (!res.headersSent) res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await Browser.launch({ width: 1440, height: 900 });

const PROBE = `(() => {
  const r1 = (n) => Math.round(n * 10) / 10;
  const cs = getComputedStyle(document.body);
  const h1 = document.querySelector('h1');
  const all = [...document.querySelectorAll('*')];
  const borderW = [...new Set(all.map((e) => {
    const s = getComputedStyle(e);
    return [s.borderTopWidth, s.borderRightWidth, s.borderBottomWidth, s.borderLeftWidth].filter((v) => v && v !== '0px');
  }).flat())].sort();
  const text = document.body.innerText || '';
  /* 主版式容器：轨道数最多的 grid（排除页头页脚） */
  let best = null;
  for (const el of all) {
    const s = getComputedStyle(el);
    if (s.display !== 'grid' && s.display !== 'inline-grid') continue;
    if (el.closest('footer,header,nav')) continue;
    const t = s.gridTemplateColumns.split(' ').filter(Boolean);
    if (t.length < 2) continue;
    const words = (el.innerText || '').replace(/\s/g, '').length;
    if (!best || words > best.words) best = { words, tracks: t.length, sel: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/)[0] : ''), tpl: s.gridTemplateColumns };
  }
  return {
    h1: h1 ? { px: r1(parseFloat(getComputedStyle(h1).fontSize)), family: getComputedStyle(h1).fontFamily } : null,
    body: { px: r1(parseFloat(cs.fontSize)), lh: cs.lineHeight, family: cs.fontFamily },
    ratio: h1 ? r1(parseFloat(getComputedStyle(h1).fontSize) / parseFloat(cs.fontSize)) : null,
    borderW,
    radii: [...new Set(all.map((e) => getComputedStyle(e).borderRadius))],
    shadows: [...new Set(all.map((e) => getComputedStyle(e).boxShadow))].filter((v) => v && v !== 'none').length,
    main: best,
    /* \u26a0\ufe0f \u8fd9\u4e00\u6bb5\u6574\u4f53\u662f\u6a21\u677f\u5b57\u7b26\u4e32\uff1a\u6b63\u5219\u91cc\u7684\u53cd\u659c\u6760\u5fc5\u987b\u53cc\u5199\uff0c\u5426\u5219\u5916\u5c42 JS \u5148\u628a
     * \u4e00 \u6536\u6389\uff0c\u5230\u4e86\u6d4f\u89c8\u5668\u91cc\u5c31\u6210\u4e86 [\u4e00-\u9fff] \u88ab\u622a\u65ad \u2014\u2014 \u5b9e\u6d4b\u62a5
     * "Invalid regular expression: missing /"\u3002\u7528 new RegExp \u7ed5\u8fc7\u8f6c\u4e49\u5c42\u3002 */
    cjk: (text.match(new RegExp('[\\u4e00-\\u9fff]', 'g')) || []).length,
    pageH: document.documentElement.scrollHeight,
    sections: document.querySelectorAll('section').length,
    imgs: [...document.querySelectorAll('img')].map((i) => ({ w: i.getAttribute('width'), h: i.getAttribute('height'), vis: i.getBoundingClientRect().width > 0 })),
    fillIns: (text.split(String.fromCharCode(10)).find((l) => l.indexOf('我经营') >= 0) || '').slice(0, 60),
  };
})()`;

const targets = [
  ['S31 产物', 'deliverables/78-northstar/_probe/_sandbox-S31-out.html'],
  ['S99 产物', 'deliverables/78-northstar/_probe/_S99-out.html'],
];
const res = {};
for (const [label, rel] of targets) {
  const pg = await browser.newPage({ width: 1440, height: 900 });
  await pg.goto(`http://127.0.0.1:${port}/${rel}`, { settleMs: 1500 });
  res[label] = await pg.eval(PROBE);
  await pg.close();
}
await browser.close();
server.close();

for (const [label] of targets) {
  const r = res[label];
  const src = readFileSync(join(ROOT, targets.find((t) => t[0] === label)[1]), 'utf8');
  console.log(`\n=== ${label} ===`);
  console.log(`  文件：${src.split('\n').length} 行 / ${src.length} 字节`);
  console.log(`  字体：h1 ${r.h1.px}px（${r.h1.family}）/ body ${r.body.px}px 行高 ${r.body.lh}`);
  console.log(`  字号比：${r.ratio}`);
  console.log(`  线宽集合：${r.borderW.join(' / ')}`);
  console.log(`  圆角集合：${r.radii.join(' / ')}；box-shadow 非 none：${r.shadows}`);
  console.log(`  主版式容器：${r.main ? r.main.sel + '  ' + r.main.tracks + ' 轨  [' + r.main.tpl + ']' : '无 grid 主容器'}`);
  console.log(`  内容：CJK ${r.cjk} 字 / ${r.sections} 个 section / ${r.imgs.length} 张图（可见 ${r.imgs.filter((i) => i.vis).length}）`);
  console.log(`  页面高：${r.pageH}px`);
  console.log(`  自填首行：${r.fillIns}`);
}
process.exit(0);
