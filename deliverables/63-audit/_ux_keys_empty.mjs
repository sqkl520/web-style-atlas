import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style';
const PORT = 9631;
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

async function press(p, key, code, kc) {
  await p.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key, code, windowsVirtualKeyCode: kc });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: kc });
}

// A) ArrowDown on body: does it open a scheme instead of scrolling?
const p = await b.newPage({ width: 1440, height: 900 });
await p.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/index.html`, { settleMs: 2600 });
await p.eval(`document.body.setAttribute('tabindex','-1');document.body.focus();`);
const pre = await p.eval(`({y:window.scrollY, hidden:document.getElementById('detail').hidden})`);
await press(p, 'ArrowDown', 'ArrowDown', 40);
await sleep(400);
const arrowBody = await p.eval(`({y:window.scrollY, hidden:document.getElementById('detail').hidden, no:document.getElementById('d-no').textContent})`);
// B) focus an <a> and ArrowDown
await p.eval(`document.getElementById('d-close').click();document.querySelector('.mast-wizard a').focus();`);
await sleep(200);
const preA = await p.eval(`({hidden:document.getElementById('detail').hidden, active:document.activeElement.tagName})`);
await press(p, 'ArrowDown', 'ArrowDown', 40);
await sleep(400);
const arrowA = await p.eval(`({hidden:document.getElementById('detail').hidden, no:document.getElementById('d-no').textContent, active:document.activeElement.tagName})`);
// C) focus a summary inside a closed rail fold and press ArrowDown
await p.eval(`document.getElementById('d-close').click();document.querySelector('#rail-fold summary').focus();`);
await sleep(200);
const preSum = await p.eval(`({hidden:document.getElementById('detail').hidden, railOpen:document.getElementById('rail-fold').open})`);
await press(p, 'ArrowDown', 'ArrowDown', 40);
await sleep(400);
const arrowSum = await p.eval(`({hidden:document.getElementById('detail').hidden, no:document.getElementById('d-no').textContent, railOpen:document.getElementById('rail-fold').open})`);
await p.close();

// D) empty state at 390: where is it, is the actionable button visible?
const p2 = await b.newPage({ width: 390, height: 844 });
await p2.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/index.html`, { settleMs: 2600 });
await p2.eval(`(()=>{const q=document.getElementById('q');q.value='餐厅';q.dispatchEvent(new Event('input',{bubbles:true}));return true})()`);
await sleep(700);
const empty390 = await p2.eval(`(()=>{
  const R=e=>{if(!e)return null;const r=e.getBoundingClientRect();return{t:+r.top.toFixed(0),b:+r.bottom.toFixed(0),h:+r.height.toFixed(0)}};
  const e=document.getElementById('empty');
  return {vh:innerHeight, empty:R(e), inViewport:R(e).t < innerHeight,
    firstActionBtn: (()=>{const b=document.querySelector('#e-next .e-act'); return b?{...R(b), txt:b.textContent}:null})(),
    tplEmpty:R(document.getElementById('empty-tpl')), tplEmptyHidden:document.getElementById('empty-tpl').hidden,
    docH:document.documentElement.scrollHeight};
})()`);
// click the action button
const act = await p2.eval(`(()=>{const b=document.querySelector('#e-next .e-act'); if(!b)return null; b.click(); return {txt:b.textContent};})()`);
await sleep(500);
const afterAct = await p2.eval(`({count:document.getElementById('count').textContent, emptyHidden:document.getElementById('empty').hidden, rows:document.querySelectorAll('.row').length, firstRowTop:+((document.querySelector('.row')||{getBoundingClientRect:()=>({top:-1})}).getBoundingClientRect().top||-1).toFixed(0)})`);
await p2.close();

// E) 390 detail: how many disclosures must be opened to read all 12 fields; measure scroll to reach last
const p3 = await b.newPage({ width: 390, height: 844 });
await p3.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/index.html`, { settleMs: 2600 });
await p3.eval(`document.querySelector('.row').click()`);
await sleep(500);
const panel = await p3.eval(`(()=>{
  const d=document.getElementById('detail');
  const det=[...d.querySelectorAll('details')];
  const closedFields=det.filter(x=>x.closest('.field')&&!x.open).length;
  const chromeFolds=det.filter(x=>!x.closest('.field')&&!x.open).length;
  return {screens:+(d.scrollHeight/d.clientHeight).toFixed(2), scrollH:d.scrollHeight, clientH:d.clientHeight,
    closedFieldFolds:closedFields, closedChromeFolds:chromeFolds, totalFolds:det.length,
    inlineFieldPairs:d.querySelectorAll('.field dt').length};
})()`);
await p3.close();

console.log(JSON.stringify({ pre, arrowBody, preA, arrowA, preSum, arrowSum, empty390, act, afterAct, panel }, null, 2));
await b.close(); server.close();
