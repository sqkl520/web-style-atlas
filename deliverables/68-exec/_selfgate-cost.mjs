// 归因：#self-gate 到底吃了多少高度？逐档拆 1440 / 390 页头的构成。
// 用运行时移除 #self-gate 的方式做 A/B（只读 DOM，不写文件）。
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { resolve, join, extname, sep } from 'node:path';

const ROOT = resolve('.');
const server = createServer((req, res) => {
  try {
    let f = resolve(join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
    if (f !== ROOT && !f.startsWith(ROOT + sep)) { res.writeHead(403); return res.end(); }
    if (statSync(f).isDirectory()) f = join(f, 'index.html');
    res.writeHead(200, { 'content-type': extname(f) === '.css' ? 'text/css; charset=utf-8' : extname(f) === '.js' ? 'text/javascript; charset=utf-8' : 'text/html; charset=utf-8', 'content-length': statSync(f).size });
    createReadStream(f).pipe(res);
  } catch { res.writeHead(404); res.end('x'); }
});
await new Promise((r) => server.listen(8244, '127.0.0.1', r));

const SNAP = () => {
  const rc = (e) => { const b = e.getBoundingClientRect(); return { top: +b.top.toFixed(1), h: +b.height.toFixed(1), bottom: +b.bottom.toFixed(1) }; };
  const q = (s) => document.querySelector(s);
  const rows = [...document.querySelectorAll('.ledger .row')];
  const vh = innerHeight;
  const boxes = rows.map((r) => r.getBoundingClientRect());
  const h1 = q('h1');
  const h1cs = getComputedStyle(h1);
  return {
    mast: rc(q('.mast')),
    mastId: q('.mast-id') ? rc(q('.mast-id')) : null,
    facts: q('.mast-facts') ? rc(q('.mast-facts')) : null,
    selfGate: q('#self-gate') ? rc(q('#self-gate')) : null,
    h1: { ...rc(h1), px: +parseFloat(h1cs.fontSize).toFixed(1), lines: Math.round(h1.getBoundingClientRect().height / parseFloat(h1cs.lineHeight)) },
    firstTop: +boxes[0].top.toFixed(1),
    firstH: +boxes[0].height.toFixed(1),
    firstBottom: +boxes[0].bottom.toFixed(1),
    complete: boxes.filter((b) => b.top >= -0.5 && b.bottom <= vh + 0.5).length,
    vh,
    mastChildren: [...q('.mast').children].map((c) => ({ el: c.tagName.toLowerCase() + '.' + (typeof c.className === 'string' ? c.className.trim().split(/\s+/).join('.') : '') + (c.id ? '#' + c.id : ''), ...rc(c), display: getComputedStyle(c).display, gridCol: getComputedStyle(c).gridColumn })),
  };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
for (const vp of [{ k: '1440', w: 1440, h: 900, mobile: false }, { k: '390', w: 390, h: 844, mobile: true }]) {
  const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: 1, mobile: vp.mobile });
  await p.goto('http://127.0.0.1:8244/prototypes/_selection/', { settleMs: 1600 });
  const withSG = await p.eval(SNAP);
  // 移除 #self-gate 再做一次
  const withoutSG = await p.eval(() => {
    const el = document.querySelector('#self-gate');
    if (el) el.remove();
    const rc = (e) => { const b = e.getBoundingClientRect(); return { top: +b.top.toFixed(1), h: +b.height.toFixed(1), bottom: +b.bottom.toFixed(1) }; };
    const q = (s) => document.querySelector(s);
    const rows = [...document.querySelectorAll('.ledger .row')];
    const vh = innerHeight;
    const boxes = rows.map((r) => r.getBoundingClientRect());
    const h1 = q('h1'); const cs = getComputedStyle(h1);
    return {
      mast: rc(q('.mast')),
      h1: { ...rc(h1), lines: Math.round(h1.getBoundingClientRect().height / parseFloat(cs.lineHeight)) },
      firstTop: +boxes[0].top.toFixed(1), firstH: +boxes[0].height.toFixed(1), firstBottom: +boxes[0].bottom.toFixed(1),
      complete: boxes.filter((b) => b.top >= -0.5 && b.bottom <= vh + 0.5).length, vh,
    };
  });
  console.log(`\n===== ${vp.k} =====`);
  console.log(`  有 #self-gate : mast=${withSG.mast.h}  h1=${withSG.h1.lines} 行  ${withSG.h1.px}px  首卡 top=${withSG.firstTop} bottom=${withSG.firstBottom} 完整=${withSG.complete}`);
  console.log(`  移除 #self-gate: mast=${withoutSG.mast.h}  h1=${withoutSG.h1.lines} 行               首卡 top=${withoutSG.firstTop} bottom=${withoutSG.firstBottom} 完整=${withoutSG.complete}`);
  console.log(`  ⇒ #self-gate 自身高 = ${withSG.selfGate ? withSG.selfGate.h : '—'}，造成的页头净增 = ${(withSG.mast.h - withoutSG.mast.h).toFixed(1)}`);
  console.log('  .mast 的直接子项:');
  for (const c of withSG.mastChildren) console.log(`    ${String(c.top).padStart(7)} h=${String(c.h).padStart(6)} gridCol=${c.gridCol.padEnd(10)} display=${c.display.padEnd(7)} ${c.el}`);
  await p.close();
}
await browser.close(); server.close();
