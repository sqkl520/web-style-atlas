import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
const ROOT = 'D:/Web/style'; const PORT = 9774;
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
const kk = async (p, k, code, vk) => {
  await p.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
  await new Promise(r => setTimeout(r, 300));
};

const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900 });
await p.goto(`${BASE}/prototypes/_selection/`, { settleMs: 3000 });

// open detail with mouse
await p.eval(`document.querySelector('.row[data-id=S01]').click()`);
await new Promise(r => setTimeout(r, 900));
print('afterClickOpen', await p.eval(`({open:!document.getElementById('detail').hidden, f:document.activeElement.tagName+'.'+(document.activeElement.className||'').slice(0,24)})`));

// count tabs from detail-head to prompt-copy
let tabs = 0, found = false;
const path = [];
for (let i = 0; i < 25; i++) {
  await p.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
  tabs++;
  const hit = await p.eval(`(() => { const a=document.activeElement; return { cls:(a.className||'').toString().slice(0,30), tag:a.tagName, isCopy:(a.className||'').toString().includes('prompt-copy'), txt:(a.textContent||a.value||'').trim().slice(0,16) }; })()`);
  path.push(hit.tag + '.' + hit.cls);
  if (hit.isCopy) { found = true; break; }
}
print('tabsToCopyFromDetailHead', { tabs, found, path });

// keyboard: arrow keys while detail open — do they switch cases while reading?
await p.eval(`document.querySelector('#detail .fold > summary').focus()`);
await kk(p, 'ArrowDown', 'ArrowDown', 40);
print('arrowWhileFocusInDetail', await p.eval(`({dNo:document.getElementById('d-no').textContent, f:document.activeElement.tagName+'.'+(document.activeElement.className||'').slice(0,20), y:Math.round(scrollY), hash:location.hash})`));

// Space/Enter on a <summary> inside detail — confirm native toggle still works
await p.eval(`document.querySelector('#detail .fold > summary').focus()`);
const openBefore = await p.eval(`document.querySelector('#detail .fold').open`);
await kk(p, 'Enter', 'Enter', 13);
const openAfter = await p.eval(`document.querySelector('#detail .fold').open`);
print('enterOnSummary', { openBefore, openAfter });

// 1/2/3 while focus in search
await p.eval(`document.getElementById('q').focus()`);
await kk(p, '1', 'Digit1', 49);
print('digitInSearch', await p.eval(`({qVal:document.getElementById('q').value, focus:document.activeElement.id, hash:location.hash})`));

// Shift+Tab from copy button back
print('mobileRailAfterChipTap', 'n/a');

await b.close();

// 390: chip tap collapses rail then where does user land
{
  const b2 = await Browser.launch({ width: 390, height: 844 });
  const p2 = await b2.newPage({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true });
  await p2.goto(`${BASE}/prototypes/_selection/`, { settleMs: 3000 });
  await p2.eval(`document.getElementById('rail-fold').open = true; window.scrollTo(0,0)`);
  await new Promise(r => setTimeout(r, 400));
  print('390beforeChip', await p2.eval(`({railOpen:document.getElementById('rail-fold').open, y:Math.round(scrollY), count:document.getElementById('count').textContent})`));
  await p2.eval(`document.querySelector('#flt-scene .scene-chip').click()`);
  await new Promise(r => setTimeout(r, 700));
  print('390afterChip', await p2.eval(`(() => {
    const first = document.querySelector('.row');
    return { railOpen:document.getElementById('rail-fold').open, y:Math.round(scrollY),
      count:document.getElementById('count').textContent, rows:document.querySelectorAll('.row').length,
      firstCardTop:Math.round(first.getBoundingClientRect().top),
      focus:document.activeElement.tagName+'.'+(document.activeElement.className||'').slice(0,20),
      inViewport: first.getBoundingClientRect().top >= 0 && first.getBoundingClientRect().top < innerHeight };
  })()`));
  await b2.close();
}

// wizard mobile 390 fieldset/tap/heading + result scroll
{
  const b3 = await Browser.launch({ width: 390, height: 844 });
  const p3 = await b3.newPage({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true });
  await p3.goto(`${BASE}/prototypes/_selection/wizard.html`, { settleMs: 2000 });
  print('wizard390', await p3.eval(`(() => {
    const btns = [...document.querySelectorAll('.wz-opts button')].filter(b=>b.offsetParent!==null);
    const rects = btns.map(b=>{const r=b.getBoundingClientRect();return Math.round(r.height)});
    return { hOverflow: document.documentElement.scrollWidth-document.documentElement.clientWidth,
      docScrollH: document.documentElement.scrollHeight, screens:+(document.documentElement.scrollHeight/innerHeight).toFixed(2),
      optHeights: rects, minOptH: Math.min(...rects),
      mastH: Math.round(document.querySelector('.mast').getBoundingClientRect().height),
      q1Top: Math.round(document.querySelector('.wz-q').getBoundingClientRect().top + scrollY) };
  })()`));
  await b3.close();
}
server.close();
