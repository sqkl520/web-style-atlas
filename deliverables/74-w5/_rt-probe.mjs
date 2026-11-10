// RED TEAM probe for W5. Measures the real DOM state of the selection console.
// Not product code. node deliverables/74-w5/_rt-probe.mjs
import { Browser, sleep } from '../../prototypes/_build/vendor/cdp.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../..');
const MIME = { '.html': 'text/html;charset=utf-8', '.js': 'text/javascript;charset=utf-8', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.md': 'text/plain;charset=utf-8', '.json': 'application/json' };

const srv = createServer(async (req, res) => {
  try {
    const p = join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    const b = await readFile(p);
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(b);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const port = srv.address().port;
const t0 = Date.now();
const b = await Browser.launch({ width: 1440, height: 900 });
console.log('chrome launch ms', Date.now() - t0);
const pg = await b.newPage();
await pg.setViewport({ width: 1440, height: 900 });
const nav = await pg.goto(`http://127.0.0.1:${port}/prototypes/_selection/index.html`, { settleMs: 1200 });
console.log('goto', nav, 'total ms', Date.now() - t0);

const snap = () => pg.eval(`(() => {
  const q = (s) => document.querySelectorAll(s);
  const d = (el) => el ? (getComputedStyle(el).display) : null;
  const near = document.querySelector('.scene-more button');
  const direct = document.querySelector('#flt-scene button.is-direct');
  const cs = (el) => { if (!el) return null; const s = getComputedStyle(el); return { font: s.fontSize, border: s.borderTopWidth+' '+s.borderTopStyle, pad: s.paddingTop, bg: s.backgroundColor }; };
  const imgs = [...document.querySelectorAll('#ledger .row img')];
  const hidden = imgs.filter(i => { const p = i.closest('figure')||i.parentElement; let n=i; while(n && n!==document.body){ const s=getComputedStyle(n); if(s.display==='none'||s.visibility==='hidden') return true; n=n.parentElement;} return false; });
  return {
    derived: [...q('[data-derived]')].map(n => ({ k: n.getAttribute('data-derived'), v: n.textContent })),
    summaryText: (document.querySelector('.rail-fold-sum')||{}).textContent,
    chipGroups: q('.rail-block .chips').length,
    chipsFltScene: q('#flt-scene button').length,
    chipsSceneMore: q('.scene-more button').length,
    chipsAll: q('#flt-scene button, .scene-more button, .rail-block .chips button').length,
    nearVisible: near ? d(near.closest('.scene-more')) : null,
    nearStyle: cs(near), directStyle: cs(direct),
    ariaLiveCount: document.querySelectorAll('[aria-live]').length,
    countAttrs: (()=>{const c=document.getElementById('count'); return c?{live:c.getAttribute('aria-live'),role:c.getAttribute('role'),atomic:c.getAttribute('aria-atomic')}:null})(),
    imgTotal: imgs.length,
    imgHidden: hidden.length,
    imgWithSrc: imgs.filter(i=>i.getAttribute('src')).length,
    jpgResources: performance.getEntriesByType('resource').filter(e=>/\\.(jpg|jpeg|png|webp)(\\?|$)/i.test(e.name)).length,
    jpgBytes: Math.round(performance.getEntriesByType('resource').filter(e=>/\\.(jpg|jpeg|png|webp)(\\?|$)/i.test(e.name)).reduce((a,e)=>a+(e.transferSize||e.encodedBodySize||0),0)),
    bodyClass: document.body.className,
    active: document.activeElement ? document.activeElement.tagName + '.' + (document.activeElement.className||'') : null,
    hash: location.hash,
    scrollY: Math.round(scrollY),
    detailHidden: document.getElementById('detail').hidden,
    fields: document.querySelectorAll('#d-body .fields > div').length,
    fieldsNotOut: document.querySelectorAll('#d-body .fields .field:not(.field-out)').length,
    fieldsOut: document.querySelectorAll('#d-body .fields .field-out').length,
    scenesNoShown: (document.getElementById('d-body')||{textContent:''}).textContent.includes('不适合：'),
    ctxErr: (window.__err||[]).slice(0,3)
  };
})()`);

await pg.eval(`window.__err=[]; window.addEventListener('error',e=>window.__err.push(String(e.message)));`);
const before = await snap();
console.log('--- BEFORE ---');
console.log(JSON.stringify(before, null, 1));

// force a fillDerived recompute if exposed, to see whether values change
const refill = await pg.eval(`(() => { if(!window.benchFillDerived) return 'no-hook'; window.benchFillDerived(); return {derived:[...document.querySelectorAll('[data-derived]')].map(n=>({k:n.getAttribute('data-derived'),v:n.textContent}))}; })()`);
console.log('--- after explicit benchFillDerived() ---');
console.log(JSON.stringify(refill));

// open S01 detail: click the row
const clicked = await pg.eval(`(() => { const r=document.querySelector('.row[data-id="S01"]'); if(!r) return 'no-row'; r.click(); return 'ok'; })()`);
await sleep(700);
const afterOpen = await snap();
console.log('--- AFTER OPEN S01 (' + clicked + ') ---');
console.log(JSON.stringify({ derived: afterOpen.derived, fields: afterOpen.fields, fieldsNotOut: afterOpen.fieldsNotOut, scenesNoShown: afterOpen.scenesNoShown, active: afterOpen.active, hash: afterOpen.hash, detailHidden: afterOpen.detailHidden }, null, 1));
// refill after detail open — does field-count update?
const refill2 = await pg.eval(`(() => { window.benchFillDerived && window.benchFillDerived(); return [...document.querySelectorAll('[data-derived]')].map(n=>({k:n.getAttribute('data-derived'),v:n.textContent})); })()`);
console.log('--- after fillDerived with detail open ---');
console.log(JSON.stringify(refill2));

// copy focus test: real mouse click on .prompt-copy
const box = await pg.eval(`(() => { const b=document.querySelector('.prompt-copy'); if(!b) return null; const r=b.getBoundingClientRect(); return {x:Math.round(r.x+r.width/2), y:Math.round(r.y+r.height/2), text:b.textContent}; })()`);
console.log('copy button box', JSON.stringify(box));
if (box) {
  await pg.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  await pg.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  await sleep(120);
  const immediate = await pg.eval(`({active: document.activeElement ? document.activeElement.tagName+'.'+(document.activeElement.className||'') : null, btnText: (document.querySelector('.prompt-copy')||{}).textContent})`);
  await sleep(600);
  const settled = await pg.eval(`({active: document.activeElement ? document.activeElement.tagName+'.'+(document.activeElement.className||'') : null, btnText: (document.querySelector('.prompt-copy')||{}).textContent, liveNodes: document.querySelectorAll('[role=status]').length, manualBox: !!document.querySelector('[aria-label="手动复制提示词"]')})`);
  console.log('copy immediate', JSON.stringify(immediate), 'settled', JSON.stringify(settled));
}

// clipboard availability under headless + no user gesture
const clip = await pg.eval(`(async () => {
  const out = { isSecure: window.isSecureContext, hasApi: !!(navigator.clipboard && navigator.clipboard.writeText), perm: null, write: null };
  try { perm = await navigator.permissions.query({name:'clipboard-write'}); out.perm = perm.state; } catch(e){ out.perm = 'query-failed:'+e.name; }
  try { await navigator.clipboard.writeText('rt-probe'); out.write = 'ok'; } catch(e){ out.write = e.name; }
  return out;
})()`);
console.log('clipboard (no gesture, after a real click happened)', JSON.stringify(clip));

// arrow key test from body
await pg.eval(`document.body.focus(); window.scrollTo(0,0); document.getElementById('d-close') && document.getElementById('d-close').click();`);
await sleep(500);
const y0 = await pg.eval(`({y:Math.round(scrollY), hash:location.hash, hidden:document.getElementById('detail').hidden})`);
await pg.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40, nativeVirtualKeyCode: 40 });
await pg.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40, nativeVirtualKeyCode: 40 });
await sleep(500);
const y1 = await pg.eval(`({y:Math.round(scrollY), hash:location.hash, hidden:document.getElementById('detail').hidden})`);
console.log('arrow from body', JSON.stringify({ y0, y1 }));

// arrow key while a row (role=button <li>) has focus
await pg.eval(`(() => { const r=document.querySelector('.row[data-id="S03"]'); if(!r) return; r.setAttribute('tabindex','0'); r.focus(); })()`);
const r0 = await pg.eval(`({y:Math.round(scrollY), hash:location.hash})`);
await pg.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40, nativeVirtualKeyCode: 40 });
await pg.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40, nativeVirtualKeyCode: 40 });
await sleep(500);
const r1 = await pg.eval(`({y:Math.round(scrollY), hash:location.hash, hidden:document.getElementById('detail').hidden})`);
console.log('arrow from row', JSON.stringify({ r0, r1 }));

console.log('consoleErrors', JSON.stringify(await b ? [] : []));
await b.close(); srv.close();
