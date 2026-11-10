import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
const ROOT = 'D:/Web/style'; const PORT = 9766;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2', '.woff': 'font/woff' };
const server = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/prototypes/_selection/index.html'; const f = normalize(join(ROOT, p)); if (!f.startsWith(normalize(ROOT)) || !existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end('no'); return; } res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' }); res.end(readFileSync(f)); });
await new Promise(r => server.listen(PORT, r));
const BASE = `http://127.0.0.1:${PORT}`;
const out = {};

// A. row AX subtree: is card content exposed?
{
  const b = await Browser.launch({ width: 1440, height: 900 });
  const p = await b.newPage({ width: 1440, height: 900 });
  await p.goto(`${BASE}/prototypes/_selection/index.html`, { settleMs: 3000 });
  const full = await p.send('Accessibility.getFullAXTree', {});
  const nodes = full.nodes || [];
  const byId = new Map(nodes.map(n => [n.nodeId, n]));
  // find the row button whose name starts with 展开 S01
  const rowBtn = nodes.find(n => n.role && n.role.value === 'button' && /^展开 S01/.test((n.name||{}).value || ''));
  const childIds = rowBtn ? (rowBtn.childIds || []) : [];
  out.rowButton = { name: (rowBtn.name||{}).value, childCount: childIds.length,
    children: childIds.map(id => { const c = byId.get(id); return c ? (c.role.value + ':' + ((c.name||{}).value||'').slice(0,30)) : 'missing'; }) };
  // does the family text exist anywhere?
  const fam = nodes.filter(n => (n.name||{}).value && /把它从屏幕上的软挤出拉回日本凸版/.test(n.name.value));
  out.familyTextNodes = fam.map(n => ({ role: n.role.value, parentIsRowButton: rowBtn ? (rowBtn.childIds||[]).includes(n.nodeId) : null }));
  // lists
  out.listRoles = nodes.filter(n => n.role && ['list','listitem','ListMarker'].includes(n.role.value)).map(n => n.role.value);
  await b.close();
}

// B. real keyboard: wizard focus + bench tab order with real events
{
  const b = await Browser.launch({ width: 1440, height: 900 });
  const p = await b.newPage({ width: 1440, height: 900 });
  await p.goto(`${BASE}/prototypes/_selection/wizard.html`, { settleMs: 2000 });
  // real click on Q1 option 1
  const box = await p.eval(`(() => { const r = document.querySelector('.wz-q[data-q=load] .wz-opts button').getBoundingClientRect(); return {x: r.left + r.width/2, y: r.top + r.height/2}; })()`);
  await p.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  await p.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  await new Promise(r => setTimeout(r, 400));
  out.wizardFocusAfterClick = await p.eval(`(() => {
    const a = document.activeElement;
    return { tag: a.tagName, cls: (a.className||'').toString().slice(0,30), text: (a.textContent||'').trim().slice(0,20),
      inViewport: a.getBoundingClientRect ? (a.getBoundingClientRect().top >= 0 && a.getBoundingClientRect().top < innerHeight) : null,
      scrollY: Math.round(scrollY), qVisible: [...document.querySelectorAll('.wz-q')].filter(e=>!e.hidden).length };
  })()`);
  // Tab from body: where does focus go first
  await p.eval(`document.body.focus()`);
  const tabs = [];
  for (let i = 0; i < 8; i++) {
    await p.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
    await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
    tabs.push(await p.eval(`(() => { const a=document.activeElement; return a.tagName+'.'+(a.className||'').toString().slice(0,22)+'|'+(a.textContent||a.value||'').trim().slice(0,18); })()`));
  }
  out.wizardTabOrder = tabs;
  await b.close();
}

// C. bench: tab order + focus visible ring + real Esc behaviour
{
  const b = await Browser.launch({ width: 1440, height: 900 });
  const p = await b.newPage({ width: 1440, height: 900 });
  await p.goto(`${BASE}/prototypes/_selection/index.html`, { settleMs: 3000 });
  await p.eval(`document.body.focus()`);
  const tabs = [];
  for (let i = 0; i < 22; i++) {
    await p.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
    await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
    tabs.push(await p.eval(`(() => { const a=document.activeElement; const cs=getComputedStyle(a); return { t: a.tagName+'.'+(a.className||'').toString().slice(0,26), txt: (a.textContent||a.value||'').trim().slice(0,18), outline: cs.outlineWidth+' '+cs.outlineStyle+' '+cs.outlineColor, shadow: cs.boxShadow.slice(0,40) }; })()`));
  }
  out.benchTabOrder = tabs;
  await b.close();
}

// D. 390 tap targets: enumerate the <44 offenders grouped
{
  const b = await Browser.launch({ width: 390, height: 844 });
  const p = await b.newPage({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true });
  await p.goto(`${BASE}/prototypes/_selection/index.html`, { settleMs: 3000 });
  // expand rail-fold to expose chips
  await p.eval(`document.getElementById('rail-fold').open = true`);
  await new Promise(r => setTimeout(r, 400));
  out.tap390 = await p.eval(`(() => {
    const inter = [...document.querySelectorAll('a[href],button,input,select,summary,[tabindex="0"],[role=button]')].filter(e => {
      const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
    });
    const g = {};
    inter.forEach(e => {
      const r = e.getBoundingClientRect();
      const key = e.tagName.toLowerCase() + '.' + (e.className||'').toString().split(' ')[0];
      g[key] = g[key] || { n: 0, minH: 999, minW: 999, sample: '' };
      g[key].n++; g[key].minH = Math.min(g[key].minH, Math.round(r.height)); g[key].minW = Math.min(g[key].minW, Math.round(r.width));
      if (!g[key].sample) g[key].sample = (e.textContent||e.value||'').trim().slice(0,14);
    });
    const below24 = inter.filter(e => { const r=e.getBoundingClientRect(); return r.height < 24 || r.width < 24; });
    const below44 = inter.filter(e => { const r=e.getBoundingClientRect(); return r.height < 44; }).length;
    const in44 = inter.filter(e => { const r=e.getBoundingClientRect(); return r.height >= 44; }).length;
    return { total: inter.length, below24: below24.length, below44, atLeast44: in44, byClass: g,
      docScrollH: document.documentElement.scrollHeight, screens: +(document.documentElement.scrollHeight/innerHeight).toFixed(2),
      hOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  })()`);
  // first screen content with rail open (worst case)
  out.firstScreen390 = await p.eval(`(() => {
    document.getElementById('rail-fold').open = true;
    window.scrollTo(0,0);
    const first = document.querySelector('.row');
    return { firstCardTop: Math.round(first.getBoundingClientRect().top), viewportH: innerHeight,
      railH: Math.round(document.querySelector('.rail').getBoundingClientRect().height),
      mastH: Math.round(document.querySelector('.mast').getBoundingClientRect().height),
      barH: Math.round(document.querySelector('.bar').getBoundingClientRect().height),
      docScrollH: document.documentElement.scrollHeight };
  })()`);
  await b.close();
}

// E. contrast of key small text (computed, not guessed)
{
  const b = await Browser.launch({ width: 1440, height: 900 });
  const p = await b.newPage({ width: 1440, height: 900 });
  await p.goto(`${BASE}/prototypes/_selection/index.html`, { settleMs: 3000 });
  out.contrast = await p.eval(`(() => {
    function lum(c){ const m=c.match(/\\d+(\\.\\d+)?/g); if(!m) return null; const [r,g,b]=m.slice(0,3).map(Number).map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)}); return 0.2126*r+0.7152*g+0.0722*b; }
    function bgOf(el){ let e=el; while(e && e!==document.documentElement){ const bg=getComputedStyle(e).backgroundColor; if(bg && bg!=='rgba(0, 0, 0, 0)' && bg!=='transparent') return bg; e=e.parentElement; } return getComputedStyle(document.body).backgroundColor || 'rgb(231,231,226)'; }
    function ratio(fg,bg){ const a=lum(fg), b=lum(bg); if(a==null||b==null) return null; const [x,y]=[Math.max(a,b),Math.min(a,b)]; return +(((x+0.05)/(y+0.05)).toFixed(2)); }
    const tests = ['.rail-hint','.row-def','.row-foot','.rail-lead','.mast-claim','.no','.tag','.row-family','.cap-ok','.cap-warn','.lane','.fold-sub','.fold-tags','.detail-no','.empty'];
    const r = {};
    tests.forEach(sel => { const e = document.querySelector(sel); if (!e) { r[sel]='no-el'; return; }
      const cs = getComputedStyle(e); r[sel] = { size: cs.fontSize, weight: cs.fontWeight, color: cs.color, bg: bgOf(e), ratio: ratio(cs.color, bgOf(e)), text: (e.textContent||'').trim().slice(0,16) }; });
    return r;
  })()`);
  await b.close();
}

console.log(JSON.stringify(out, null, 1));
server.close();
