// 68-exec 归因（EXEC-selfclaim 专用）：把并发 Agent 的 .self-gate 与我的改动分开计量。
// 只读 DOM / 注入覆盖样式，不写源文件。
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
await new Promise((r) => server.listen(8246, '127.0.0.1', r));

const SNAP = (hideGate) => {
  if (hideGate) { const s = document.createElement('style'); s.textContent = '.self-gate{display:none!important}'; document.head.appendChild(s); }
  const rc = (e) => { const b = e.getBoundingClientRect(); return { top: +b.top.toFixed(1), h: +b.height.toFixed(1), bottom: +b.bottom.toFixed(1) }; };
  const q = (s) => document.querySelector(s);
  const rows = [...document.querySelectorAll('.ledger .row')];
  const vh = innerHeight;
  const boxes = rows.map((r) => r.getBoundingClientRect());
  const h1 = q('h1'); const cs = getComputedStyle(h1);
  const h1r = h1.getBoundingClientRect();
  const sg = q('#self-gate');
  return {
    mast: rc(q('.mast')).h,
    mastId: q('.mast-id') ? rc(q('.mast-id')).h : null,
    fold: q('.mast-fold') ? rc(q('.mast-fold')).h : null,
    foldOpen: q('.mast-fold') ? q('.mast-fold').open : null,
    sgDisplay: sg ? getComputedStyle(sg).display : 'absent',
    sgH: sg ? rc(sg).h : 0,
    facts: q('.mast-facts') ? rc(q('.mast-facts')).h : null,
    h1: { w: +h1r.width.toFixed(1), px: +parseFloat(cs.fontSize).toFixed(1), lines: Math.round(h1r.height / parseFloat(cs.lineHeight)) },
    firstTop: +boxes[0].top.toFixed(1),
    firstH: +boxes[0].height.toFixed(1),
    firstBottom: +boxes[0].bottom.toFixed(1),
    complete: boxes.filter((b) => b.top >= -0.5 && b.bottom <= vh + 0.5).length,
    vh,
    mastKids: [...q('.mast').children].map((c) => c.tagName.toLowerCase() + (c.id ? '#' + c.id : '') + (typeof c.className === 'string' && c.className.trim() ? '.' + c.className.trim().split(/\s+/).join('.') : '')),
  };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
for (const vp of [{ k: '1440', w: 1440, h: 900, mobile: false }, { k: '768', w: 768, h: 1024, mobile: false }, { k: '390', w: 390, h: 844, mobile: true }]) {
  const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: 1, mobile: vp.mobile });
  await p.goto('http://127.0.0.1:8246/prototypes/_selection/', { settleMs: 1600 });
  const live = await p.eval(SNAP, false);
  const hidden = await p.eval(SNAP, true);
  console.log(`\n===== ${vp.k} =====`);
  console.log(`  现状        mast=${live.mast}  h1 ${live.h1.w}px/${live.h1.lines}行  首卡 top=${live.firstTop} bottom=${live.firstBottom} 完整=${live.complete}`);
  console.log(`  隐藏 self-gate mast=${hidden.mast}  h1 ${hidden.h1.w}px/${hidden.h1.lines}行  首卡 top=${hidden.firstTop} bottom=${hidden.firstBottom} 完整=${hidden.complete}`);
  console.log(`  ⇒ .self-gate 显示=${live.sgDisplay} 自身高=${live.sgH}  页头净增=${(live.mast - hidden.mast).toFixed(1)}`);
  console.log(`  .mast-fold open=${live.foldOpen} 高=${live.fold}  .mast-id 高=${live.mastId}  .mast-facts 高=${live.facts}`);
  console.log(`  .mast 子项: ${live.mastKids.join(' | ')}`);
  await p.close();
}
await browser.close(); server.close();
