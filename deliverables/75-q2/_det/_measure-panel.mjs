// 量详情面板：打开一个案子，首屏（900px 面板视口）能看到哪几段？
// 判据：每个 .field 的顶部相对面板滚动容器的位置。
import { Browser } from '../../../prototypes/_build/vendor/cdp.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
const ROOT = decodeURIComponent(new URL('../../..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  try { let rel = decodeURIComponent(req.url.split('?')[0]); if (rel.endsWith('/')) rel += 'index.html';
    const p = join(ROOT, rel); const buf = await readFile(p);
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(buf);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await Browser.launch(); const pg = await browser.newPage();
await pg.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }).catch(()=>{});
await pg.goto(`http://127.0.0.1:${server.address().port}/prototypes/_selection/#S17`, { settleMs: 2500 });

const r = await pg.eval(`(function(){
  var body = document.getElementById('d-body');
  if (!body) return JSON.stringify({ err: 'no #d-body' });
  var scr = body.closest('[class*=scroll]') || body.parentElement;
  var vh = window.innerHeight;
  var out = [];
  var fields = document.querySelectorAll('#d-body .fields > .field, #d-body .fields > .field-out, #d-body .folds > details');
  var all = document.querySelectorAll('#d-body .fields > *');
  for (var i=0;i<all.length;i++){
    var el = all[i];
    var rc = el.getBoundingClientRect();
    var label = (el.querySelector('dt,summary b,.field-lab')||{}).textContent || el.tagName;
    out.push({ i: i, label: String(label).trim().slice(0,18), top: Math.round(rc.top), h: Math.round(rc.height),
               visible: rc.top < vh });
  }
  return JSON.stringify({ vh: vh, panelTop: Math.round(body.getBoundingClientRect().top), count: all.length, items: out });
})()`);
const d = JSON.parse(r);
console.log('面板视口高:', d.vh, ' #d-body 顶部:', d.panelTop, ' 子元素数:', d.count);
console.log('');
console.log('序 段名                顶部px  高度px  首屏可见');
(d.items||[]).forEach(x => console.log(String(x.i+1).padStart(2), (x.label||'').padEnd(18), String(x.top).padStart(6), String(x.h).padStart(6), '  ', x.visible ? '✓' : '✗'));
await browser.close(); server.close();
