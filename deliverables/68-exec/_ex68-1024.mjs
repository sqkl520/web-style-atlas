// 1024×900 档：HEAD 提交信息说「--s-h1 的一处真实回归：1024x900 首屏完整卡 1→0」。
// 核实该档现状，并确认我的改动没有让它更糟。
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
    res.writeHead(200, { 'content-type': extname(f) === '.css' ? 'text/css' : extname(f) === '.js' ? 'text/javascript' : 'text/html', 'content-length': statSync(f).size });
    createReadStream(f).pipe(res);
  } catch { res.writeHead(404); res.end('x'); }
});
await new Promise((r) => server.listen(8247, '127.0.0.1', r));

const M = (sortKey) => {
  const sel = document.querySelector('#sort');
  if (sortKey && sel.value !== sortKey) { sel.value = sortKey; sel.dispatchEvent(new Event('change', { bubbles: true })); }
  scrollTo(0, 0);
  const rows = [...document.querySelectorAll('.ledger .row')];
  const vh = innerHeight;
  const b = rows.map((r) => r.getBoundingClientRect());
  const h1 = document.querySelector('h1'); const cs = getComputedStyle(h1); const hr = h1.getBoundingClientRect();
  return {
    firstId: (rows[0].querySelector('.no') || {}).textContent,
    top: +b[0].top.toFixed(1), h: +b[0].height.toFixed(1), bottom: +b[0].bottom.toFixed(1),
    complete: b.filter((x) => x.top >= -0.5 && x.bottom <= vh + 0.5).length,
    mast: +document.querySelector('.mast').getBoundingClientRect().height.toFixed(1),
    h1: { px: +parseFloat(cs.fontSize).toFixed(1), lines: Math.round(hr.height / parseFloat(cs.lineHeight)), w: +hr.width.toFixed(0) },
    ovX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    vh,
  };
};

const browser = await Browser.launch({ width: 1024, height: 900 });
const p = await browser.newPage({ width: 1024, height: 900, dsf: 1, mobile: false });
await p.goto('http://127.0.0.1:8247/prototypes/_selection/', { settleMs: 1700 });
for (const s of ['n', 'gate']) {
  const m = await p.eval(M, s);
  console.log(`1024×900 sort=${s}: 首卡 ${String(m.firstId).trim()} top=${m.top} h=${m.h} bottom=${m.bottom} 完整=${m.complete} | mast=${m.mast} h1=${m.h1.px}px/${m.h1.lines}行 w=${m.h1.w} | ovX=${m.ovX}`);
}
// 隐藏 self-gate，归因
const m2 = await p.eval(() => { const s = document.createElement('style'); s.textContent = '.self-gate{display:none!important}'; document.head.appendChild(s); return true; });
const m3 = await p.eval(M, 'n');
console.log(`1024×900 隐藏 self-gate: 首卡 top=${m3.top} bottom=${m3.bottom} 完整=${m3.complete} | mast=${m3.mast}`);
await browser.close(); server.close();
