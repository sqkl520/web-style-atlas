import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
const ROOT = 'D:/Web/style'; const PORT = 9775;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2', '.woff': 'font/woff' };
const server = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/') u = '/prototypes/_selection/index.html';
  let f = normalize(join(ROOT, u));
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!f.startsWith(normalize(ROOT)) || !existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise(r => server.listen(PORT, r));
const BASE = `http://127.0.0.1:${PORT}`;
const print = (k, v) => console.log('### ' + k + '\n' + JSON.stringify(v, null, 1));

{
  const b2 = await Browser.launch({ width: 390, height: 844 });
  const p2 = await b2.newPage({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true });
  await p2.goto(`${BASE}/prototypes/_selection/`, { settleMs: 3500 });
  await p2.eval(`document.getElementById('rail-fold').open = true; window.scrollTo(0,0)`);
  await new Promise(r => setTimeout(r, 500));
  print('390beforeChip', await p2.eval(`({railOpen:document.getElementById('rail-fold').open, y:Math.round(scrollY), count:document.getElementById('count').textContent, railH: Math.round(document.querySelector('.rail').getBoundingClientRect().height)})`));
  await p2.eval(`document.querySelector('#flt-scene .scene-chip').click()`);
  await new Promise(r => setTimeout(r, 900));
  print('390afterChip', await p2.eval(`(() => {
    const first = document.querySelector('.row');
    return { railOpen:document.getElementById('rail-fold').open, y:Math.round(scrollY),
      count:document.getElementById('count').textContent, rows:document.querySelectorAll('.row').length,
      firstCardTop:Math.round(first.getBoundingClientRect().top), firstCardBottom:Math.round(first.getBoundingClientRect().bottom),
      viewportH: innerHeight,
      focus:document.activeElement.tagName+'.'+(document.activeElement.className||'').slice(0,20),
      inViewport: first.getBoundingClientRect().top < innerHeight && first.getBoundingClientRect().bottom > 0 };
  })()`));
  // now open a row on mobile
  await p2.eval(`document.querySelector('.row').click()`);
  await new Promise(r => setTimeout(r, 900));
  print('390detail', await p2.eval(`(() => {
    const d=document.getElementById('detail'); const h=document.querySelector('.detail-head');
    const st=document.querySelector('.prompt-cta');
    return { open:!d.hidden, detailScrollTop: Math.round(d.scrollTop),
      headH: Math.round(h.getBoundingClientRect().height),
      ctaTop: st?Math.round(st.getBoundingClientRect().top):null,
      ctaVisible: st? (st.getBoundingClientRect().top < innerHeight):null,
      copyBtnTop: (()=>{const c=document.querySelector('.prompt-copy');return c?Math.round(c.getBoundingClientRect().top):null})(),
      focus:document.activeElement.tagName+'.'+(document.activeElement.className||'').slice(0,20),
      bodyOverflow: getComputedStyle(document.body).overflow };
  })()`));
  await b2.close();
}

{
  const b3 = await Browser.launch({ width: 390, height: 844 });
  const p3 = await b3.newPage({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true });
  await p3.goto(`${BASE}/prototypes/_selection/wizard.html`, { settleMs: 2500 });
  print('wizard390', await p3.eval(`(() => {
    const btns = [...document.querySelectorAll('.wz-opts button')].filter(b=>b.offsetParent!==null);
    const rects = btns.map(b=>{const r=b.getBoundingClientRect();return Math.round(r.height)});
    return { hOverflow: document.documentElement.scrollWidth-document.documentElement.clientWidth,
      docScrollH: document.documentElement.scrollHeight, screens:+(document.documentElement.scrollHeight/innerHeight).toFixed(2),
      optHeights: rects, minOptH: Math.min(...rects),
      mastH: Math.round(document.querySelector('.mast').getBoundingClientRect().height),
      q1Top: Math.round(document.querySelector('.wz-q').getBoundingClientRect().top + scrollY),
      resetH: Math.round(document.getElementById('wz-reset').getBoundingClientRect().height) };
  })()`));
  await b3.close();
}
server.close();
