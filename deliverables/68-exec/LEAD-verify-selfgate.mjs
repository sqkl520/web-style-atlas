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
await new Promise(r => server.listen(8420, '127.0.0.1', r));
const browser = await Browser.launch({ headless: true });
const page = await browser.newPage();

const SORTS = ['n', 'fr', 'thr', 'gate', 'built'];
for (const [vw, vh] of [[1440, 900], [390, 844], [768, 1024]]) {
  await page.setViewport({ width: vw, height: vh, mobile: vw < 500 });
  await page.goto('http://127.0.0.1:8420/prototypes/_selection/index.html', { settleMs: 1500 });

  const head = await page.eval(`(() => {
    const g = id => { const e=document.getElementById(id); return e? e.textContent.trim() : '(缺)'; };
    const sg = document.getElementById('self-gate');
    const dts=[...document.querySelectorAll('.mast-facts dt')].map(d=>d.textContent.trim());
    return {
      total: g('f-total'), built: g('f-built'), clean: g('f-clean'), shots: g('f-shots'),
      selfGate: sg? sg.textContent.trim() : '(缺 #self-gate)',
      selfLevel: sg? sg.getAttribute('data-level') : null,
      selfGateColor: sg? getComputedStyle(sg).color : null,
      dtLabels: dts,
      mastH: Math.round(document.querySelector('.mast').getBoundingClientRect().height),
      hasErrors: window.__err ? 1 : 0,
    };
  })()`);
  console.log(`\n=== ${vw}x${vh} ===`);
  console.log(`  方案总数=${head.total}  已建=${head.built}  闸门FAIL0=${head.clean}  截图=${head.shots}`);
  console.log(`  dt 标签: ${JSON.stringify(head.dtLabels)}`);
  console.log(`  self-gate: ${head.selfGate}`);
  console.log(`  颜色=${head.selfGateColor}  data-level=${head.selfLevel}`);
  console.log(`  .mast 高=${head.mastH}px`);

  // 五种排序的首屏完整卡
  const rows = [];
  for (const s of SORTS) {
    await page.eval(`(() => { const el=document.getElementById('sort'); if(!el)return; el.value=${JSON.stringify(s)}; el.dispatchEvent(new Event('change',{bubbles:true})); })()`);
    await new Promise(r => setTimeout(r, 250));
    const r = await page.eval(`(() => {
      const cards=[...document.querySelectorAll('li.row')]; let full=0;
      for(const c of cards){const b=c.getBoundingClientRect(); if(b.top>=0&&b.bottom<=window.innerHeight) full++;}
      const f=cards[0];
      return { id:(f?.querySelector('.no')?.textContent||'').trim(), top:+f.getBoundingClientRect().top.toFixed(1), h:+f.getBoundingClientRect().height.toFixed(1), full };
    })()`);
    rows.push(`${s}:${r.id} top=${r.top} h=${r.h} 完整=${r.full}`);
  }
  console.log(`  排序首屏完整卡 → ${rows.join(' | ')}`);

  const ov = await page.eval(`({ x: document.documentElement.scrollWidth > window.innerWidth + 2, docH: document.documentElement.scrollHeight })`);
  console.log(`  横向溢出=${ov.x ? '有' : '无'}  docH=${ov.docH}`);
}
await browser.close();
server.close();
