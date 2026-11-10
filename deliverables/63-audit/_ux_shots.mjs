import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style';
const PORT = 9618;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/prototypes/_selection/index.html';
  const f = normalize(join(ROOT, p));
  if (!f.startsWith(normalize(ROOT)) || !existsSync(f)) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise(r => server.listen(PORT, r));
const SEL = `http://127.0.0.1:${PORT}/prototypes/_selection/index.html`;
const out = 'D:/Web/style/deliverables/63-audit/shots/';
import { mkdirSync } from 'node:fs';
mkdirSync(out, { recursive: true });

const b = await Browser.launch({ width: 1440, height: 900 });

// 1) rail expanded, scene chips + more toggle open
const p = await b.newPage({ width: 1440, height: 900 });
await p.goto(SEL, { settleMs: 2600 });
await p.eval(`(()=>{const all=[...document.querySelectorAll('button')].filter(x=>/还有 28/.test(x.textContent)); if(all[0]) all[0].click(); document.querySelector('.rail').scrollTop=0; return true;})()`);
await sleep(600);
await p.screenshot({ path: out + 'ux-rail-direct-near-1440.jpg', quality: 78 });
await p.close();

// 2) empty state 1440
const p2 = await b.newPage({ width: 1440, height: 900 });
await p2.goto(SEL, { settleMs: 2600 });
await p2.eval(`(()=>{const q=document.getElementById('q');q.value='餐厅';q.dispatchEvent(new Event('input',{bubbles:true}));return true})()`);
await sleep(800);
await p2.screenshot({ path: out + 'ux-empty-1440.jpg', quality: 78 });
await p2.close();

// 3) 390 detail top (what a user sees on open)
const p3 = await b.newPage({ width: 390, height: 844 });
await p3.goto(SEL, { settleMs: 2600 });
await p3.eval(`document.querySelector('.row').click()`);
await sleep(700);
await p3.screenshot({ path: out + 'ux-detail-390.jpg', quality: 80 });
// 4) 390 first screen of list
await p3.eval(`document.getElementById('d-close').click(); window.scrollTo(0,0)`);
await sleep(500);
await p3.screenshot({ path: out + 'ux-list-390.jpg', quality: 80 });
await p3.close();

// 5) 1440 first screen
const p4 = await b.newPage({ width: 1440, height: 900 });
await p4.goto(SEL, { settleMs: 2600 });
await p4.screenshot({ path: out + 'ux-list-1440.jpg', quality: 78 });
await p4.eval(`document.querySelector('.row').click()`);
await sleep(600);
await p4.screenshot({ path: out + 'ux-detail-1440.jpg', quality: 78 });
await p4.close();

// 6) wizard 1440 result
const p5 = await b.newPage({ width: 1440, height: 900 });
await p5.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/wizard.html?load=1&img=2&loud=2&guide=0&fear=2`, { settleMs: 2200 });
await p5.screenshot({ path: out + 'ux-wizard-result-1440.jpg', quality: 78 });
await p5.close();

console.log('shots written');
await b.close();
server.close();
