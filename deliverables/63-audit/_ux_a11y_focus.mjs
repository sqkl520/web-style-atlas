import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style';
const PORT = 9614;
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

// Tab into page: does skip link become visible and where does focus go after activating?
const skip = await p.eval(`(()=>{
  const a=document.querySelector('.skip');
  a.focus();
  const r=a.getBoundingClientRect();
  const cs=getComputedStyle(a);
  return {vis:{left:cs.left,top:cs.top,w:+r.width.toFixed(0),h:+r.height.toFixed(0)}, text:a.textContent, href:a.getAttribute('href'), targetTabindex:(document.querySelector('#ledger')||{}).tabIndex, targetOutline:null};
})()`);
// activate skip via Enter
await p.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
await sleep(300);
const afterSkip = await p.eval(`({hash:location.hash, active:document.activeElement.tagName+'.'+String(document.activeElement.className).split(' ')[0], scrollY:window.scrollY})`);

// focus outline on chip (keyboard)
const chipOutline = await p.eval(`(()=>{
  const c=document.querySelector('.chips button');
  c.focus();
  const cs=getComputedStyle(c);
  return {outlineStyle:cs.outlineStyle,outlineWidth:cs.outlineWidth,outlineColor:cs.outlineColor,matchFocusVisible:c.matches(':focus-visible')};
})()`);
const tplOutline = await p.eval(`(()=>{
  const c=document.querySelector('.tpl-open');
  if(!c) return null;
  const s=document.createElement('style'); s.textContent='#tpl-strip{display:block!important}';
  document.head.appendChild(s);
  const strip=document.getElementById('tpl-strip'); strip.hidden=false; strip.open=true;
  c.focus(); const cs=getComputedStyle(c);
  return {outlineStyle:cs.outlineStyle,outlineWidth:cs.outlineWidth,color:cs.outlineColor,fv:c.matches(':focus-visible')};
})()`);
const openProtoOutline = await p.eval(`(()=>{
  document.querySelector('.row').click();
  const a=document.querySelector('.open-proto');
  a.focus(); const cs=getComputedStyle(a);
  return {outlineStyle:cs.outlineStyle,outlineWidth:cs.outlineWidth,color:cs.outlineColor,fv:a.matches(':focus-visible')};
})()`);
// copy button focus ring + announcement live region
const copyLive = await p.eval(`(()=>{
  const b=document.querySelector('.prompt-copy');
  b.focus();
  const cs=getComputedStyle(b);
  return {outlineWidth:cs.outlineWidth,outlineColor:cs.outlineColor,ariaLive:b.getAttribute('aria-live'),ariaPressed:null,
  parentChain:[b.parentElement.className,b.parentElement.parentElement.className],
  liveRegionsInDoc:[...document.querySelectorAll('[aria-live],[role=status],[role=alert]')].map(e=>({t:e.id||String(e.className).split(' ')[0],attr:e.getAttribute('aria-live')||e.getAttribute('role'),txt:(e.textContent||'').slice(0,20)}))};
})()`);
// screenshot of copy state
await p.eval(`document.querySelector('.prompt-copy').click()`);
await sleep(350);
const copyState = await p.eval(`(()=>{const b=document.querySelector('.prompt-copy');const fb=document.getElementById('prompt-fallback');
 return {txt:b.textContent, live:b.getAttribute('aria-live'), role:b.getAttribute('role'), fb:!!fb,
   fbFocus: document.activeElement.tagName+'.'+String(document.activeElement.className).split(' ')[0],
   fbInert: fb?getComputedStyle(fb).position:null,
   behindTabbable: fb? [...document.querySelectorAll('a[href],button,input')].filter(e=>!fb.contains(e)&&e.offsetParent).length : null,
   title:b.getAttribute('title')};})()`);
// while dialog open, Tab out
let fbEsc = null;
if (copyState.fb) {
  await p.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await sleep(120);
  fbEsc = await p.eval(`(()=>{const fb=document.getElementById('prompt-fallback');const a=document.activeElement;return {t:a.tagName,cls:String(a.className).split(' ')[0],inDialog:fb?fb.contains(a):null};})()`);
  // Escape closes but does focus return?
  await p.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await sleep(200);
  fbEsc.afterEsc = await p.eval(`({fb:!!document.getElementById('prompt-fallback'),active:document.activeElement.tagName+'.'+String(document.activeElement.className).split(' ')[0]})`);
}
// hidden detail landmark: when closed, is it exposed?
const landmark = await p.eval(`(()=>{const d=document.getElementById('detail'); d.querySelector('#d-close').click(); return {hidden:d.hidden, ariaHidden:d.getAttribute('aria-hidden'), role:d.getAttribute('role'), inert:d.hasAttribute('inert'), display:getComputedStyle(d).display};})()`);

// wizard: focus after answer + result, announcement
const w = await b.newPage({ width: 1440, height: 900 });
await w.goto(WIZ, { settleMs: 2000 });
const wFocusStart = await w.eval(`({active:document.activeElement.tagName+'.'+String(document.activeElement.className).split(' ')[0]})`);
const wOpt = await w.eval(`(()=>{
  const btn=document.querySelector('.wz-q:not([hidden]) .wz-opts button');
  btn.focus();
  const cs=getComputedStyle(btn);
  return {outline:cs.outlineWidth+' '+cs.outlineStyle+' '+cs.outlineColor, h:+btn.getBoundingClientRect().height.toFixed(0)};
})()`);
// click option 0 of Q1 via keyboard Enter and see focus after
await w.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
await w.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
await sleep(400);
const wAfterAnswer = await w.eval(`({active:document.activeElement.tagName+'.'+String(document.activeElement.className).split(' ')[0], scrollY:window.scrollY, visibleQ:[...document.querySelectorAll('.wz-q')].filter(x=>!x.hidden).length})`);
// finish all
for (let i=0;i<4;i++){ await w.eval(`(()=>{const q=[...document.querySelectorAll('.wz-q')].find(x=>!x.hidden && !x.dataset.d); if(!q)return; q.dataset.d='1'; q.querySelector('.wz-opts button').click();})()`); await sleep(250); }
const wResult = await w.eval(`({active:document.activeElement.tagName+'.'+String(document.activeElement.className).split(' ')[0], outTop:+document.getElementById('wz-out').getBoundingClientRect().top.toFixed(0), scrollY:window.scrollY, h1:document.querySelector('h1').getBoundingClientRect().top, live:[...document.querySelectorAll('[aria-live]')].length})`);
await w.close();

// reduced-motion: animations disabled?
const rm = await b.newPage({ width: 1440, height: 900, reducedMotion: true });
await rm.goto(SEL, { settleMs: 2200 });
const rmCheck = await rm.eval(`(()=>{const r=document.querySelector('.row');const cs=getComputedStyle(r);return {animDuration:cs.animationDuration, transitionDuration:cs.transitionDuration, isIn:r.classList.contains('is-in'), matches:matchMedia('(prefers-reduced-motion: reduce)').matches, rowOpacity:cs.opacity, rowTransform:cs.transform};})()`);
await rm.close();

// 320px narrow
const n = await b.newPage({ width: 320, height: 640 });
await n.goto(SEL, { settleMs: 2200 });
const n320 = await n.eval(`({docW:document.documentElement.scrollWidth, vw:innerWidth, overflow:document.documentElement.scrollWidth-innerWidth, firstRowTop:+document.querySelector('.row').getBoundingClientRect().top.toFixed(0), mastH:+document.querySelector('.mast').getBoundingClientRect().height.toFixed(0), h1:document.querySelector('h1').getBoundingClientRect().height})`);
await n.close();

console.log(JSON.stringify({ skip, afterSkip, chipOutline, tplOutline, openProtoOutline, copyLive, copyState, fbEsc, landmark, wFocusStart, wOpt, wAfterAnswer, wResult, rmCheck, n320 }, null, 2));
await b.close();
server.close();
