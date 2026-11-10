import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style';
const PORT = 9613;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2', '.woff': 'font/woff' };
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
const p = await b.newPage({ width: 1440, height: 900 });

// Enable network + performance
await p.send('Network.enable', {});
const reqs = new Map();
b.on(p.sessionId,'Network.requestWillBeSent', (e) => reqs.set(e.requestId, { url: e.request.url, type: e.type, t: e.timestamp, ts: e.type }));
b.on(p.sessionId,'Network.responseReceived', (e) => {
  const r = reqs.get(e.requestId); if (r) { r.status = e.response.status; r.mime = e.response.mimeType; r.len = e.response.encodedDataLength; r.fromCache = e.response.fromDiskCache; }
});
b.on(p.sessionId,'Network.loadingFinished', (e) => {
  const r = reqs.get(e.requestId); if (r) r.finished = e.encodedDataLength;
});

await p.goto(SEL, { settleMs: 4000 });

const nav = await p.eval(`(()=>{const n=performance.getEntriesByType('navigation')[0]||{};const res=performance.getEntriesByType('resource');
  const byType={}; let bytes=0;
  res.forEach(r=>{const k=r.initiatorType||'other';byType[k]=(byType[k]||0)+1;});
  const fonts=res.filter(r=>/woff2?/.test(r.name)); const imgs=res.filter(r=>/\\.(jpg|png|svg|webp)/i.test(r.name));
  const js=res.filter(r=>/\\.js(\\?|$)/.test(r.name)); const css=res.filter(r=>/\\.css(\\?|$)/.test(r.name));
  const sum=a=>a.reduce((x,r)=>x+(r.transferSize||r.encodedBodySize||0),0);
  return {
    dcl: n.domContentLoadedEventEnd, load: n.loadEventEnd, ttfb: n.responseStart,
    domInteractive: n.domInteractive,
    paint: performance.getEntriesByType('paint').map(x=>({n:x.name,t:Math.round(x.startTime)})),
    resourceCount: res.length,
    byType,
    fontCount: fonts.length, fontBytes: sum(fonts),
    imgCount: imgs.length, imgBytes: sum(imgs),
    jsCount: js.length, jsBytes: sum(js),
    cssCount: css.length, cssBytes: sum(css),
    totalBytes: sum(res),
    imgTop: imgs.slice(0,6).map(r=>({n:r.name.split('/').pop().slice(0,40),b:r.transferSize||r.encodedBodySize})),
    imgSample: imgs.filter(r=>/desktop-fold/.test(r.name)).length,
    fontSample: fonts.slice(0,5).map(r=>({n:r.name.split('/').pop().slice(0,24),b:r.transferSize||r.encodedBodySize})),
    longtasks: (performance.getEntriesByType('longtask')||[]).length,
  };})()`);

// accessibility tree for headings and rows
await p.send('Accessibility.enable', {});
const ax = await p.send('Accessibility.getFullAXTree', {});
const nodes = ax.nodes || [];
const roleOf = n => n.role && n.role.value;
const nameOf = n => n.name && n.name.value;
const headings = nodes.filter(n => roleOf(n) === 'heading').map(n => ({ lvl: n.properties && (n.properties.find(x=>x.name==='level')||{}).value && (n.properties.find(x=>x.name==='level').value.value), t: nameOf(n) }));
const buttons = nodes.filter(n => roleOf(n) === 'button');
const rowButtons = buttons.filter(n => /^展开 S/.test(nameOf(n) || ''));
const liveNodes = nodes.filter(n => n.properties && n.properties.some(x => x.name === 'live'));
const regionNodes = nodes.filter(n => ['complementary','main','banner','navigation','region'].includes(roleOf(n))).map(n => ({ role: roleOf(n), name: nameOf(n) }));
const detailsNodes = nodes.filter(n => roleOf(n)==='group' || roleOf(n)==='DisclosureTriangle');
const textboxes = nodes.filter(n => roleOf(n)==='textbox' || roleOf(n)==='searchbox').map(n=>({role:roleOf(n),name:nameOf(n)}));

// second: J from body fresh
const p2 = await b.newPage({ width: 1440, height: 900 });
await p2.goto(SEL, { settleMs: 2600 });
await p2.eval(`document.body.setAttribute('tabindex','-1'); document.body.focus();`);
await p2.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'j', code: 'KeyJ', windowsVirtualKeyCode: 74 });
await p2.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'j', code: 'KeyJ', windowsVirtualKeyCode: 74 });
await sleep(500);
const jFresh = await p2.eval(`({no:document.getElementById('d-no').textContent, hash:location.hash, hidden:document.getElementById('detail').hidden})`);
// second J
await p2.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'j', code: 'KeyJ', windowsVirtualKeyCode: 74 });
await p2.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'j', code: 'KeyJ', windowsVirtualKeyCode: 74 });
await sleep(400);
const jSecond = await p2.eval(`({no:document.getElementById('d-no').textContent, hash:location.hash})`);
// K
await p2.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'k', code: 'KeyK', windowsVirtualKeyCode: 75 });
await p2.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'k', code: 'KeyK', windowsVirtualKeyCode: 75 });
await sleep(400);
const kBack = await p2.eval(`({no:document.getElementById('d-no').textContent, hash:location.hash})`);
// 1/2/3 viewport
await p2.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: '3', code: 'Digit3', windowsVirtualKeyCode: 51, text: '3' });
await p2.send('Input.dispatchKeyEvent', { type: 'keyUp', key: '3', code: 'Digit3', windowsVirtualKeyCode: 51 });
await sleep(400);
const vp3 = await p2.eval(`({vp:[...document.querySelectorAll('.viewer-tabs button')].map(b=>b.textContent+':'+b.getAttribute('aria-pressed')), note:document.getElementById('vnote').textContent, viewerOpen:document.querySelector('.fold-view').open})`);
await p2.close();

// wizard proper: click each question's first option in sequence
const p3 = await b.newPage({ width: 1440, height: 900 });
await p3.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/wizard.html`, { settleMs: 2200 });
const steps = [];
for (let i = 0; i < 5; i++) {
  const st = await p3.eval(`(()=>{const q=[...document.querySelectorAll('.wz-q')].find(x=>!x.hidden && !x.dataset.done); if(!q) return {err:'none'}; q.dataset.done='1'; const b=q.querySelector('.wz-opts button'); b.click(); return {q:q.dataset.q, clicked:b.querySelector('b').textContent};})()`);
  await sleep(300);
  steps.push(st);
}
const wizDone = await p3.eval(`(()=>{const q=s=>document.querySelector(s);const qa=s=>[...document.querySelectorAll(s)];
  return {outHidden:q('#wz-out').hidden, pick:qa('#wz-pick .wz-card').length, avoid:qa('#wz-avoid .wz-card').length,
  pickIds:qa('#wz-pick .no').map(e=>e.textContent), avoidIds:qa('#wz-avoid .no').map(e=>e.textContent),
  visibleQs:qa('.wz-q:not([hidden])').length, shareHidden:q('#wz-share').hidden,
  focus:document.activeElement.tagName, outTop:+q('#wz-out').getBoundingClientRect().top.toFixed(0),
  links:qa('#wz-pick a').map(a=>a.getAttribute('href')).slice(0,3),
  live:qa('[aria-live]').length,
  ariaPressed:qa('.wz-opts button').map(b=>b.getAttribute('aria-pressed')).slice(0,6)};})()`);
await p3.close();

// contrast: computed colors of key elements + tap sizes of detail controls at 390
const p4 = await b.newPage({ width: 390, height: 844 });
await p4.goto(SEL, { settleMs: 2600 });
await p4.eval(`document.querySelector('.row').click()`);
await sleep(500);
const small390 = await p4.eval(`(()=>{const qa=s=>[...document.querySelectorAll(s)];const out=[];
  qa('#detail button, #detail summary, #detail a[href], #detail input').forEach(e=>{const r=e.getBoundingClientRect(); if(r.width&&r.height&&(r.height<24||r.width<24)) out.push({t:(e.textContent||e.tagName).trim().slice(0,24),w:+r.width.toFixed(1),h:+r.height.toFixed(1),cls:String(e.className).split(' ')[0]});});

  return {small:out, total:qa('#detail button, #detail summary, #detail a[href], #detail input').length};})()`);
const styles = await p4.eval(`(()=>{const q=s=>document.querySelector(s);const g=e=>{if(!e)return null;const c=getComputedStyle(e);return{color:c.color,bg:c.backgroundColor,fs:c.fontSize,lh:c.lineHeight}};
  return {chip:g(q('.chips button')), chipPressed:(()=>{const b=q('.chips button');b.setAttribute('aria-pressed','true');const s=getComputedStyle(b);const o={color:s.color,bg:s.backgroundColor};b.setAttribute('aria-pressed','false');return o;})(), sceneTpl:g(q('.scene-tpl')), railHint:g(q('.rail-hint')), rowFamily:g(q('.row-family')), rowFoot:g(q('.row-foot')), cap:g(q('.cap')), count:g(q('#count')), detailDt:g(q('#detail .field dt')), foldSub:g(q('#detail .fold-sub')), promptHint:g(q('.prompt-hint'))};})()`);
await p4.close();

console.log(JSON.stringify({ nav, ax: { headings, rowButtons: rowButtons.length, buttons: buttons.length, liveNodes: liveNodes.map(n=>({role:roleOf(n),name:nameOf(n)})), regions: regionNodes, textboxes, disclosure: detailsNodes.length }, jFresh, jSecond, kBack, vp3, steps, wizDone, small390, styles }, null, 2));

await b.close();
server.close();
