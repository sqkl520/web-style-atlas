import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style';
const PORT = 9615;
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
const WIZ = `http://127.0.0.1:${PORT}/prototypes/_selection/wizard.html`;

const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900 });
await p.goto(SEL, { settleMs: 2600 });

// 1) skip link: after activation, where does the NEXT Tab land?
const skipFlow = await p.eval(`(()=>{document.querySelector('.skip').focus();return true})()`);
await p.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
await sleep(250);
const afterSkipActive = await p.eval(`({active:document.activeElement.tagName, hash:location.hash, y:window.scrollY, firstRowY:+document.querySelector('.row').getBoundingClientRect().top.toFixed(0)})`);
await p.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
await sleep(150);
const afterSkipTab = await p.eval(`({active:document.activeElement.tagName+'.'+String(document.activeElement.className).split(' ')[0], txt:(document.activeElement.textContent||'').trim().slice(0,18)})`);

// 2) scene-more toggle text/behaviour
const more = await p.eval(`(()=>{
  const m=document.querySelector('.scene-more'); const host=document.getElementById('flt-scene');
  const tog=[...host.parentElement.children].find(e=>e!==host && /button/i.test(e.tagName) && /还有|更多|全部/.test(e.textContent));
  const all=[...host.parentElement.parentElement.querySelectorAll('button')].filter(b=>/还有|更多|全部/.test(b.textContent));
  return {moreExists:!!m, moreDisplay:m?getComputedStyle(m).display:null, moreChips:m?m.querySelectorAll('button').length:0,
    toggles:all.map(b=>({t:b.textContent.trim().slice(0,30), w:+b.getBoundingClientRect().width.toFixed(0), h:+b.getBoundingClientRect().height.toFixed(0)})),
    directChips:host.querySelectorAll('button').length};
})()`);
// click the toggle if present
const moreAfter = await p.eval(`(()=>{
  const all=[...document.querySelectorAll('button')].filter(b=>/还有|更多|全部/.test(b.textContent));
  if(!all.length) return null;
  all[0].click();
  const m=document.querySelector('.scene-more');
  return {display:m?getComputedStyle(m).display:null, chips:m?m.querySelectorAll('button').length:0, docH:document.documentElement.scrollHeight};
})()`);

// 3) is the h3 inside each row exposed as heading and is its parent a button?
const headingInButton = await p.eval(`(()=>{
  const row=document.querySelector('.row');
  const h3=row.querySelector('h3');
  return {rowRole:row.getAttribute('role'), rowTabindex:row.getAttribute('tabindex'), h3InButton:!!h3.closest('[role=button]'),
    rowAriaLabel:row.getAttribute('aria-label'), h3Text:h3.textContent,
    innerFocusable:row.querySelectorAll('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])').length};
})()`);

// 4) force manual-copy fallback: remove clipboard API
const p2 = await b.newPage({ width: 1440, height: 900 });
await p2.goto(SEL, { settleMs: 2400 });
await p2.eval(`(()=>{ try{Object.defineProperty(navigator,'clipboard',{value:undefined,configurable:true});}catch(e){} document.execCommand=()=>false; return !!navigator.clipboard;})()`);
await p2.eval(`document.querySelector('.row').click()`);
await sleep(400);
await p2.eval(`document.querySelector('.prompt-copy').click()`);
await sleep(700);
const dialog = await p2.eval(`(()=>{
  const fb=document.getElementById('prompt-fallback');
  if(!fb) return {fb:false, btn:document.querySelector('.prompt-copy').textContent};
  const panel=fb.firstElementChild;
  const focusables=[...fb.querySelectorAll('a[href],button,input,textarea,[tabindex]:not([tabindex="-1"])')];
  const outside=[...document.querySelectorAll('a[href],button,input')].filter(e=>!fb.contains(e)&&e.offsetParent!==null);
  return {fb:true, role:fb.getAttribute('role'), modal:fb.getAttribute('aria-modal'), label:fb.getAttribute('aria-label'),
    active:document.activeElement.tagName+'.'+String(document.activeElement.className).split(' ')[0],
    inFb:fb.contains(document.activeElement), focusablesInFb:focusables.length,
    outsideTabbable:outside.length,
    taReadonly:fb.querySelector('textarea').readOnly,
    taValueLen:fb.querySelector('textarea').value.length,
    headingTag:fb.querySelector('b')?fb.querySelector('b').tagName:null};
})()`);
// tab 3x inside dialog
const dlgTabs=[];
for(let i=0;i<4;i++){
  await p2.send('Input.dispatchKeyEvent',{type:'rawKeyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  await p2.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  await sleep(80);
  dlgTabs.push(await p2.eval(`(()=>{const fb=document.getElementById('prompt-fallback');const a=document.activeElement;return {t:a.tagName,cls:String(a.className).split(' ')[0],inFb:fb?fb.contains(a):null};})()`));
}
// escape -> focus return?
await p2.send('Input.dispatchKeyEvent',{type:'rawKeyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
await p2.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
await sleep(250);
const dlgClose = await p2.eval(`({fb:!!document.getElementById('prompt-fallback'), active:document.activeElement.tagName+'.'+String(document.activeElement.className).split(' ')[0]})`);
await p2.close();

// 5) wizard mobile overflow + step flow at 390
const wm = await b.newPage({ width: 390, height: 844 });
await wm.goto(WIZ, { settleMs: 2000 });
const wz390 = await wm.eval(`({docW:document.documentElement.scrollWidth, vw:innerWidth, overflow:document.documentElement.scrollWidth-innerWidth,
  optH:+document.querySelector('.wz-opts button').getBoundingClientRect().height.toFixed(0),
  optW:+document.querySelector('.wz-opts button').getBoundingClientRect().width.toFixed(0),
  resetH:+document.getElementById('wz-reset').getBoundingClientRect().height.toFixed(0),
  resetW:+document.getElementById('wz-reset').getBoundingClientRect().width.toFixed(0),
  mainTop:+document.querySelector('.wz-main').getBoundingClientRect().top.toFixed(0),
  h1H:+document.querySelector('h1').getBoundingClientRect().height.toFixed(0),
  mastH:+document.querySelector('.mast').getBoundingClientRect().height.toFixed(0)})`);
await wm.close();

// 6) wizard at step 5: how tall is the accumulated page before results
const ws = await b.newPage({ width: 1440, height: 900 });
await ws.goto(WIZ, { settleMs: 1800 });
const growth=[];
for(let i=0;i<5;i++){
  await ws.eval(`(()=>{const q=[...document.querySelectorAll('.wz-q')].find(x=>!x.hidden&&!x.dataset.d);if(!q)return;q.dataset.d='1';q.querySelector('.wz-opts button').click();})()`);
  await sleep(250);
  growth.push(await ws.eval(`({docH:document.documentElement.scrollHeight, visibleQs:[...document.querySelectorAll('.wz-q')].filter(x=>!x.hidden).length, outHidden:document.getElementById('wz-out').hidden})`));
}
const finalScroll = await ws.eval(`({scrollY:window.scrollY, outTop:+document.getElementById('wz-out').getBoundingClientRect().top.toFixed(0), docH:document.documentElement.scrollHeight, active:document.activeElement.tagName+'.'+String(document.activeElement.className).split(' ')[0], h1Top:+document.querySelector('h1').getBoundingClientRect().top.toFixed(0)})`);
await ws.close();

console.log(JSON.stringify({ skipFlow, afterSkipActive, afterSkipTab, more, moreAfter, headingInButton, dialog, dlgTabs, dlgClose, wz390, growth, finalScroll }, null, 2));
await b.close();
server.close();
