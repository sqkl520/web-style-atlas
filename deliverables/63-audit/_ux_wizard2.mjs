import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style';
const PORT = 9632;
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
const WIZ = `http://127.0.0.1:${PORT}/prototypes/_selection/wizard.html`;
const b = await Browser.launch({ width: 1440, height: 900 });

const p = await b.newPage({ width: 1440, height: 900 });
await p.goto(WIZ, { settleMs: 2000 });
// answer properly via the app's own flow: click option, next question appears
const steps = [];
for (let i = 0; i < 5; i++) {
  const st = await p.eval(`(()=>{
    const q=[...document.querySelectorAll('.wz-q')].find(x=>!x.hidden && !x.dataset.done);
    if(!q) return {err:'no visible unanswered'};
    q.dataset.done='1';
    const btn=q.querySelector('.wz-opts button');
    btn.click();
    return {q:q.dataset.q, v:btn.getAttribute('data-v')};
  })()`);
  steps.push(st);
  await sleep(300);
}
const done = await p.eval(`({outHidden:document.getElementById('wz-out').hidden, shareHidden:document.getElementById('wz-share').hidden, picks:document.querySelectorAll('#wz-pick .wz-card').length})`);
// now click share
await p.eval(`document.getElementById('wz-share').click()`);
await sleep(500);
const share = await p.eval(`({url:location.search, btn:document.getElementById('wz-share').textContent, live:document.getElementById('wz-share').getAttribute('aria-live')})`);
// reset then check URL cleared?
await p.eval(`document.getElementById('wz-reset').click()`);
await sleep(400);
const afterReset = await p.eval(`({url:location.search, outHidden:document.getElementById('wz-out').hidden, visibleQs:[...document.querySelectorAll('.wz-q')].filter(x=>!x.hidden).length, ariaPressedTrue:[...document.querySelectorAll('.wz-opts button[aria-pressed="true"]')].length})`);
// reload with that URL: does it replay?
await p.goto(WIZ + share.url, { settleMs: 2000 });
const replay = await p.eval(`({outHidden:document.getElementById('wz-out').hidden, picks:document.querySelectorAll('#wz-pick .wz-card').length, visibleQs:[...document.querySelectorAll('.wz-q')].filter(x=>!x.hidden).length})`);
await p.close();

// wizard: check result page semantics + link behaviour (does ./#S07 land on detail?)
const p2 = await b.newPage({ width: 1440, height: 900 });
await p2.goto(WIZ + '?load=1&img=2&loud=2&guide=0&fear=2', { settleMs: 2200 });
const result = await p2.eval(`(()=>{
  const q=s=>document.querySelector(s);const qa=s=>[...document.querySelectorAll(s)];
  return {picks:qa('#wz-pick .wz-card').map(c=>({no:c.querySelector('.no').textContent, h3:c.querySelector('h3').textContent.trim().slice(0,16), gate:!!c.querySelector('.wz-gate')})),
    avoids:qa('#wz-avoid .wz-card').length,
    links:qa('#wz-pick a, #wz-avoid a').map(a=>a.getAttribute('href')).slice(0,4),
    headings:qa('#wz-out h2').map(h=>h.textContent),
    outLive:q('#wz-out').getAttribute('aria-live'), role:q('#wz-out').getAttribute('role'),
    active:document.activeElement.tagName+'.'+String(document.activeElement.className).split(' ')[0],
    scrollY:window.scrollY,
    // is the results section visible above the fold?
    outTop:+q('#wz-out').getBoundingClientRect().top.toFixed(0),
    methodChars:q('#wz-method').textContent.length,
    cardHasHeadingH3:qa('#wz-pick .wz-card h3').length};
})()`);
// click a result link -> on the bench, does detail open?
const p3 = await b.newPage({ width: 1440, height: 900 });
await p3.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/index.html#S07`, { settleMs: 3000 });
const land = await p3.eval(`({hidden:document.getElementById('detail').hidden, no:document.getElementById('d-no').textContent, hash:location.hash, active:document.activeElement.tagName})`);
await p3.close();
await p2.close();

console.log(JSON.stringify({ steps, done, share, afterReset, replay, result, land }, null, 2));
await b.close(); server.close();
