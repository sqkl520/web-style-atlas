import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
const ROOT = 'D:/Web/style'; const PORT = 9770;
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
  print('chipClickDebug', await p.eval(`(() => {
    const log = [];
    window.addEventListener('error', e => log.push('ERR:' + e.message));
    document.querySelector('.scene-toggle').click();
    const near = document.querySelector('.scene-more .scene-chip');
    const before = { pressed: near.getAttribute('aria-pressed'), count: document.getElementById('count').textContent };
    try { near.click(); } catch (e) { log.push('throw:' + e.message); }
    const afterNear = { pressed: near.getAttribute('aria-pressed'), count: document.getElementById('count').textContent,
      bg: getComputedStyle(near).backgroundColor, cls: near.className,
      pressedAll: [...document.querySelectorAll('.scene-chip[aria-pressed=true]')].map(x=>x.textContent.slice(0,8)) };
    const direct = document.querySelector('#flt-scene .scene-chip');
    try { direct.click(); } catch (e) { log.push('throw2:' + e.message); }
    const afterDirect = { pressed: direct.getAttribute('aria-pressed'), count: document.getElementById('count').textContent,
      bg: getComputedStyle(direct).backgroundColor, color: getComputedStyle(direct).color,
      pressedAll: [...document.querySelectorAll('.scene-chip[aria-pressed=true]')].map(x=>x.textContent.slice(0,8)) };
    return { before, afterNear, afterDirect, log };
  })()`));
  await b.close();
}

{
  const b = await Browser.launch({ width: 1440, height: 900 });
  const p = await b.newPage({ width: 1440, height: 900 });
  await p.goto(`${BASE}/prototypes/_selection/#S26`, { settleMs: 2500 });
  print('wizardLink', await p.eval(`(() => {
    const d = document.getElementById('detail');
    return { url: location.href, hash: location.hash, detailExists: !!d, detailHidden: d ? d.hidden : null,
      dNo: document.getElementById('d-no') ? document.getElementById('d-no').textContent : null, scrollY: Math.round(scrollY) };
  })()`));
  await b.close();
}

{
  const b = await Browser.launch({ width: 1440, height: 900 });
  const p = await b.newPage({ width: 1440, height: 900 });
  await p.goto(`${BASE}/index.html#S07`, { settleMs: 3000 });
  print('rootHash', await p.eval(`(() => ({ url: location.href, hash: location.hash, title: document.title, bodyText: document.body.innerText.slice(0,150) }))()`));
  await b.close();
}

{
  const b = await Browser.launch({ width: 768, height: 1024 });
  const p = await b.newPage({ width: 768, height: 1024 });
  await p.goto(`${BASE}/prototypes/_selection/`, { settleMs: 3000 });
  print('tablet768', await p.eval(`(() => ({
    mastH: Math.round(document.querySelector('.mast').getBoundingClientRect().height),
    railH: Math.round(document.querySelector('.rail').getBoundingClientRect().height),
    barH: Math.round(document.querySelector('.bar').getBoundingClientRect().height),
    firstCardTop: Math.round(document.querySelector('.row').getBoundingClientRect().top + scrollY),
    hOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    docScrollH: document.documentElement.scrollHeight,
    visibleShots: [...document.querySelectorAll('.row .shot')].filter(f=>f.getBoundingClientRect().width>0).length,
    totalShots: document.querySelectorAll('.row .shot').length,
    folds: ['mast-fold','rail-fold','bar-fold'].map(id=>{const e=document.getElementById(id);return id+'='+e.open}),
    imgsLoaded: [...document.images].filter(i=>i.naturalWidth>0).length, imgsTotal: document.images.length
  }))()`));
  await b.close();
}

{
  const b = await Browser.launch({ width: 1440, height: 900 });
  const p = await b.newPage({ width: 1440, height: 900 });
  await p.goto('file:///D:/Web/style/prototypes/_selection/wizard.html', { settleMs: 2500 });
  for (let i = 0; i < 5; i++) {
    await p.eval(`(() => { const q = [...document.querySelectorAll('.wz-q')][${i}]; if (q && !q.hidden) { const b = q.querySelector('.wz-opts button'); if (b) b.click(); } })()`);
    await new Promise(r => setTimeout(r, 200));
  }
  print('fileWizardShare', await p.eval(`(() => {
    const s = document.getElementById('wz-share');
    s.click();
    return new Promise(res => setTimeout(() => res({ text: s.textContent, search: location.search, origin: location.origin, protocol: location.protocol, outHidden: document.getElementById('wz-out').hidden }), 600));
  })()`));
  await b.close();
}
server.close();
