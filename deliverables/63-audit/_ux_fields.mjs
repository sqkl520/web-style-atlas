import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style';
const PORT = 9627;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/prototypes/_selection/index.html';
  const f = normalize(join(ROOT, p));
  if (!f.startsWith(normalize(ROOT)) || !existsSync(f)) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise(r => server.listen(PORT, r));
const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900 });
await p.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/index.html`, { settleMs: 3000 });
await p.eval(`document.querySelector('.row').click()`);
await sleep(700);

const struct = await p.eval(`(()=>{
  const body=document.getElementById('d-body');
  const dl=body.querySelector('dl.fields');
  const fields=[...dl.children];
  return {dlTag:dl.tagName, fieldCount:fields.length,
    perField:fields.map(f=>{
      const det=f.querySelector('details'); const dt=f.querySelector('dt'); const dd=f.querySelector('dd');
      return {cls:f.className, hasDetails:!!det, open:det?det.open:null, dtInSummary: dt? !!dt.closest('summary') : null,
        dtText: dt?dt.textContent:null, hasDt:!!dt, hasDd:!!dd,
        summaryText: det?det.querySelector('summary').textContent.trim().slice(0,24):null};
    }),
    // any heading elements in the panel?
    headingsInPanel:[...body.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(h=>h.tagName+':'+h.textContent.trim().slice(0,20)),
    dtCount:body.querySelectorAll('dt').length, ddCount:body.querySelectorAll('dd').length,
    detailsCount:body.querySelectorAll('details').length};
})()`);

// AX: are dt's exposed? and is the panel a dialog?
await p.send('Accessibility.enable', {});
await p.send('Accessibility.getFullAXTree', {});
const ax = await p.send('Accessibility.getFullAXTree', {});
const nodes = ax.nodes || [];
const role = n => n.role && n.role.value;
const name = n => n.name && n.name.value;
const termRoles = nodes.filter(n => role(n) === 'term' || role(n) === 'definition').length;
const headingsPanel = nodes.filter(n => role(n) === 'heading').map(n => name(n));
const dialogish = nodes.filter(n => ['dialog', 'complementary', 'region'].includes(role(n))).map(n => role(n) + ':' + name(n));
const listNodes = nodes.filter(n => role(n) === 'list').length;
const liNodes = nodes.filter(n => role(n) === 'listitem').length;

// 390: is scroll locked behind the overlay?
const p3 = await b.newPage({ width: 390, height: 844 });
await p3.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/index.html`, { settleMs: 2600 });
const pre = await p3.eval(`({bodyOverflow:getComputedStyle(document.body).overflow, htmlOverflow:getComputedStyle(document.documentElement).overflow, y:window.scrollY})`);
await p3.eval(`document.querySelector('.row').click()`);
await sleep(500);
await p3.wheel(900);
await sleep(400);
const post = await p3.eval(`({y:window.scrollY, detailScrollTop:document.getElementById('detail').scrollTop, bodyUnder:document.body.scrollHeight})`);
await p3.close();

console.log(JSON.stringify({ struct, axInfo: { termRoles, headingsPanel: headingsPanel.slice(0, 6), headingsCount: headingsPanel.length, dialogish, listNodes, liNodes }, scrollLock: { pre, post } }, null, 2));
await b.close(); server.close();
