import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style';
const PORT = 9616;
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

const b = await Browser.launch({ width: 1440, height: 900 });

// A) list semantics via AX tree
const p = await b.newPage({ width: 1440, height: 900 });
await p.goto(SEL, { settleMs: 2600 });
await p.send('Accessibility.enable', {});
const ax = await p.send('Accessibility.getFullAXTree', {});
const nodes = ax.nodes || [];
const role = n => n.role && n.role.value;
const counts = {};
nodes.forEach(n => { counts[role(n)] = (counts[role(n)] || 0) + 1; });
const listRoles = Object.keys(counts).filter(k => /list|listitem/i.test(k)).map(k => k + '=' + counts[k]);
// find the ledger ol node
const ledgerAx = nodes.filter(n => role(n) === 'list' || role(n) === 'listitem');

// B) focus loss after keyboard copy (trusted gesture simulation)
const p2 = await b.newPage({ width: 1440, height: 900 });
await p2.goto(SEL, { settleMs: 2600 });
await p2.eval(`document.querySelector('.row').click()`);
await sleep(400);
await p2.eval(`document.querySelector('.prompt-copy').focus()`);
const beforeCopy = await p2.eval(`({active:document.activeElement.tagName+'.'+String(document.activeElement.className).split(' ')[0], inDetail:document.getElementById('detail').contains(document.activeElement)})`);
// Use a real mouse click on the button coordinates (trusted gesture)
const rect = await p2.eval(`(()=>{const r=document.querySelector('.prompt-copy').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
await p2.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: rect.x, y: rect.y, button: 'left', clickCount: 1 });
await p2.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: rect.x, y: rect.y, button: 'left', clickCount: 1 });
await sleep(900);
const afterCopy = await p2.eval(`({active:document.activeElement.tagName+'.'+String(document.activeElement.className).split(' ')[0], inDetail:document.getElementById('detail').contains(document.activeElement), btnTxt:document.querySelector('.prompt-copy').textContent, liveRegions:[...document.querySelectorAll('[aria-live],[role=status],[role=alert]')].length})`);
// keyboard Enter on the copy button
await p2.eval(`document.querySelector('.prompt-copy').focus()`);
await p2.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
await p2.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
await sleep(900);
const afterCopyKey = await p2.eval(`({active:document.activeElement.tagName+'.'+String(document.activeElement.className).split(' ')[0], inDetail:document.getElementById('detail').contains(document.activeElement), btnTxt:document.querySelector('.prompt-copy').textContent})`);
await p2.close();

// C) do the detail rows expose aria-expanded / aria-controls?
const wire = await p.eval(`(()=>{
  const r=document.querySelector('.row');
  return {rowAttrs:[...r.attributes].map(a=>a.name+'='+a.value.slice(0,30)),
    ariaExpanded:r.getAttribute('aria-expanded'), ariaControls:r.getAttribute('aria-controls'),
    olRole:document.getElementById('ledger').getAttribute('role'),
    olTag:document.getElementById('ledger').tagName,
    liRole:r.getAttribute('role'),
    detailId:document.getElementById('detail').hidden};
})()`);

// D) 390 detail overlay: are elements behind obscured while tabbing?
const p3 = await b.newPage({ width: 390, height: 844 });
await p3.goto(SEL, { settleMs: 2600 });
await p3.eval(`document.querySelector('.row').click()`);
await sleep(400);
const obstruct = await p3.eval(`(()=>{
  const d=document.getElementById('detail');const dr=d.getBoundingClientRect();
  const els=[...document.querySelectorAll('a[href],button,input,select,summary')].filter(e=>!d.contains(e)&&e.offsetParent!==null);
  let covered=0;
  els.forEach(e=>{const r=e.getBoundingClientRect(); if(r.width&&r.height){ const cx=Math.min(Math.max(r.left+r.width/2,dr.left),dr.right-1); const cy=Math.min(Math.max(r.top+r.height/2,dr.top),dr.bottom-1); const top=document.elementFromPoint(cx,cy); if(top&&d.contains(top)) covered++; }});
  return {detail:{l:+dr.left.toFixed(0),t:+dr.top.toFixed(0),w:+dr.width.toFixed(0),h:+dr.height.toFixed(0)}, outsideTabbable:els.length, coveredByOverlay:covered, bodyOverflow:getComputedStyle(document.body).overflow, bodyScrollLocked: getComputedStyle(document.body).overflowY};
})()`);
// tab to first non-detail focusable and confirm it is obscured
let obscuredFocus = null;
for (let i=0;i<16;i++){
  await p3.send('Input.dispatchKeyEvent',{type:'rawKeyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  await p3.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  await sleep(40);
  const st = await p3.eval(`(()=>{const d=document.getElementById('detail');const a=document.activeElement;const r=a.getBoundingClientRect();const inD=d.contains(a);const dr=d.getBoundingClientRect();const cx=r.left+r.width/2, cy=r.top+r.height/2; const top=document.elementFromPoint(cx,cy); return {t:a.tagName,cls:String(a.className).split(' ')[0],inD, obscured: !inD && top ? d.contains(top) : false, y:+r.top.toFixed(0)};})()`);
  if (!st.inD) { obscuredFocus = st; break; }
}
await p3.close();

// E) font-display / FOUT: measure h1 metric shift? check font-display values
const fontCss = await p.eval(`(()=>{const out=[];for(const ss of document.styleSheets){try{for(const r of ss.cssRules){if(r.type===5){out.push({fam:r.style.fontFamily,fd:r.style.fontDisplay,ur:(r.style.unicodeRange||'').slice(0,20)});}}}catch(e){}}return {faces:out.length,sample:out.slice(0,3)};})()`);

console.log(JSON.stringify({ listRoles, ledgerAxCount: ledgerAx.length, beforeCopy, afterCopy, afterCopyKey, wire, obstruct, obscuredFocus, fontCss }, null, 2));
await b.close();
server.close();
