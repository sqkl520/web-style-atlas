import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
const ROOT = 'D:/Web/style'; const PORT = 9771;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2', '.woff': 'font/woff' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/prototypes/_selection/index.html';
  let f = normalize(join(ROOT, p));
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!f.startsWith(normalize(ROOT)) || !existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise(r => server.listen(PORT, r));
const BASE = `http://127.0.0.1:${PORT}`;
const print = (k, v) => console.log('### ' + k + '\n' + JSON.stringify(v, null, 1));

{
  const b = await Browser.launch({ width: 1440, height: 900 });
  const p = await b.newPage({ width: 1440, height: 900 });
  await p.goto(`${BASE}/prototypes/_selection/`, { settleMs: 3000 });
  print('chipStyleSettled', await p.eval(`(() => new Promise(res => {
    document.querySelector('.scene-toggle').click();
    const near = document.querySelector('.scene-more .scene-chip');
    const direct = document.querySelector('#flt-scene .scene-chip');
    const g = (e) => { const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); return { bg: cs.backgroundColor, color: cs.color, borderStyle: cs.borderStyle, borderWidth: cs.borderWidth, borderColor: cs.borderColor, font: cs.fontSize, pad: cs.padding, w: Math.round(r.width), h: Math.round(r.height) }; };
    near.click();
    setTimeout(() => {
      const nearPressed = g(near);
      direct.click();
      setTimeout(() => {
        const directPressed = g(direct);
        res({
          nearUnpressedDefaults: null, nearPressed,
          directPressed,
          nearMatchesChipsBtn: near.matches('.chips button'),
          directMatchesChipsBtn: direct.matches('.chips button'),
          nearRules: (() => { const out=[]; for (const ss of document.styleSheets) { try { for (const r of ss.cssRules) { if (r.selectorText && r.selectorText.includes('scene-chip')) out.push(r.selectorText); } } catch(e){} } return out; })(),
          isDirectRules: (() => { const out=[]; for (const ss of document.styleSheets) { try { for (const r of ss.cssRules) { if (r.selectorText && /is-direct|is-near/.test(r.selectorText)) out.push(r.selectorText); } } catch(e){} } return out; })()
        });
      }, 400);
    }, 400);
  }))()`));
  await b.close();
}

{
  const b = await Browser.launch({ width: 1440, height: 900 });
  const p = await b.newPage({ width: 1440, height: 900 });
  await p.goto(`${BASE}/prototypes/_selection/`, { settleMs: 6000 });
  print('imgLoadLongerWait', await p.eval(`(() => ({ total: document.images.length,
    loaded: [...document.images].filter(i=>i.naturalWidth>0).length,
    pending: [...document.images].filter(i=>!i.complete).length,
    hidden: [...document.images].filter(i=>i.getBoundingClientRect().width===0).length }))()`));
  await b.close();
}

{
  const b = await Browser.launch({ width: 768, height: 1024 });
  const p = await b.newPage({ width: 768, height: 1024 });
  await p.goto(`${BASE}/prototypes/_selection/`, { settleMs: 8000 });
  print('tablet768Images', await p.eval(`(() => ({ total: document.images.length,
    loaded: [...document.images].filter(i=>i.naturalWidth>0).length,
    hidden: [...document.images].filter(i=>i.getBoundingClientRect().width===0).length,
    visibleShots: [...document.querySelectorAll('.row .shot')].filter(f=>f.getBoundingClientRect().width>0).length }))()`));
  await b.close();
}

// heading hierarchy after open detail, and h2 duplication
{
  const b = await Browser.launch({ width: 1440, height: 900 });
  const p = await b.newPage({ width: 1440, height: 900 });
  await p.goto(`${BASE}/prototypes/_selection/`, { settleMs: 3000 });
  print('headingsAfterOpen', await p.eval(`(() => {
    document.querySelector('.row').click();
    return new Promise(res => setTimeout(() => {
      const hs = [...document.querySelectorAll('h1,h2,h3')].map(h=>({ lvl:+h.tagName[1], t:h.textContent.trim().slice(0,28), where: h.closest('#detail')?'detail':h.closest('.rail')?'rail':h.closest('.mast')?'mast':'main' }));
      return res({ count: hs.length, levels: hs.reduce((a,h)=>{a[h.lvl]=(a[h.lvl]||0)+1;return a},{}),
        inDetail: hs.filter(h=>h.where==='detail'),
        dupNames: hs.filter((h,i,arr)=>arr.findIndex(x=>x.t===h.t&&x.lvl===h.lvl)!==i).map(h=>h.t) });
    }, 800));
  })()`));
  await b.close();
}
server.close();
