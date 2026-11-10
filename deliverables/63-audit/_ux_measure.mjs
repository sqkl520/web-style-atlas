import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style';
const PORT = 9611;
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
const BASE = `http://127.0.0.1:${PORT}`;
const SEL = BASE + '/prototypes/_selection/index.html';
const WIZ = BASE + '/prototypes/_selection/wizard.html';

const b = await Browser.launch({ width: 1440, height: 900 });
const out = {};

async function measure(width, height, label) {
  const p = await b.newPage({ width, height });
  await p.goto(SEL, { settleMs: 2600 });
  const r = await p.eval(`(() => {
    const q = s => document.querySelector(s);
    const qa = s => [...document.querySelectorAll(s)];
    const rect = el => { if(!el) return null; const r = el.getBoundingClientRect(); return {top:+r.top.toFixed(1),left:+r.left.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),bottom:+r.bottom.toFixed(1)}; };
    const vh = innerHeight, vw = innerWidth;
    const firstRow = q('.row');
    const rows = qa('.row');
    const visibleRows = rows.filter(el => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= vh; }).length;
    const partialRows = rows.filter(el => { const r = el.getBoundingClientRect(); return r.top < vh && r.bottom > 0; }).length;
    // scroll position of first field in detail
    return {
      vw, vh,
      docH: document.documentElement.scrollHeight,
      docW: document.documentElement.scrollWidth,
      hOverflow: document.documentElement.scrollWidth - innerWidth,
      mast: rect(q('.mast')),
      rail: rect(q('.rail')),
      bar: rect(q('.bar')),
      ledger: rect(q('#ledger')),
      firstRow: rect(firstRow),
      firstRowH: firstRow ? +firstRow.getBoundingClientRect().height.toFixed(1) : null,
      rowsTotal: rows.length,
      visibleRows, partialRows,
      firstShot: rect(q('.row .shot img')),
      firstShotNatural: (()=>{const im=q('.row .shot img');return im?{nw:im.naturalWidth,nh:im.naturalHeight,cw:+im.getBoundingClientRect().width.toFixed(1)}:null;})(),
      countText: (q('#count')||{}).textContent,
      countAriaLive: q('#count') ? q('#count').getAttribute('aria-live') : null,
      h1: (q('h1')||{}).textContent,
      headingOrder: qa('h1,h2,h3,h4,h5,h6').slice(0,40).map(h=>h.tagName+':'+(h.textContent||'').trim().slice(0,18)),
      landmarks: qa('header,main,aside,nav,footer,section[aria-label]').map(e=>e.tagName.toLowerCase()+(e.className?'.'+String(e.className).split(' ')[0]:'')+(e.getAttribute('aria-label')?'['+e.getAttribute('aria-label')+']':'')),
      imgsNoAlt: qa('img').filter(i=>!i.hasAttribute('alt')).length,
      imgsEmptyAlt: qa('img').filter(i=>i.getAttribute('alt')==='').length,
      imgCount: qa('img').length,
      imgsHiddenButLoaded: qa('.shots img').filter(i=>getComputedStyle(i.parentElement.parentElement).display==='none'||getComputedStyle(i.closest('.shot')).display==='none').length,
      buttons: qa('button').length,
      focusables: qa('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])').length,
      skipLink: !!q('.skip'),
      skipTarget: (q('.skip')||{}).getAttribute && q('.skip').getAttribute('href'),
      skipTargetExists: (()=>{const h=q('.skip')&&q('.skip').getAttribute('href');return h?!!document.querySelector(h):null;})(),
      details: qa('details').map(d=>({id:d.id||d.className,open:d.open,sum:(d.querySelector('summary')||{}).textContent && d.querySelector('summary').textContent.trim().slice(0,40)})),
      emptyHidden: q('#empty') ? q('#empty').hidden : null,
      chipCount: qa('#flt-scene button').length,
      sceneMoreVisible: (()=>{const m=q('.scene-more');return m?getComputedStyle(m).display:null;})(),
      chipSizes: (()=>{const c=qa('.chips button'); if(!c.length) return null; const hs=c.map(b=>+b.getBoundingClientRect().height.toFixed(1)); const ws=c.map(b=>+b.getBoundingClientRect().width.toFixed(1)); return {minH:Math.min(...hs),maxH:Math.max(...hs),minW:Math.min(...ws),count:c.length,under24:hs.filter(x=>x<24).length};})(),
      tapTargets: (()=>{const els=qa('button,a[href],input,select,summary'); let small=[]; els.forEach(e=>{const r=e.getBoundingClientRect(); if(r.width>0&&r.height>0&&(r.height<24||r.width<24)) small.push({t:(e.textContent||e.tagName).trim().slice(0,20),w:+r.width.toFixed(1),h:+r.height.toFixed(1)});}); return {total:els.length,smallCount:small.length,examples:small.slice(0,12)};})(),
      reducedMotionBlocks: (()=>{let n=0;for(const ss of document.styleSheets){try{for(const r of ss.cssRules){if(r.conditionText&&/reduced-motion/.test(r.conditionText))n++;}}catch(e){}}return n;})(),
      fontPreload: qa('link[rel=preload]').length,
    };
  })()`);
  // now open first detail and measure
  const d = await p.eval(`(() => {
    const q=s=>document.querySelector(s);
    const qa=s=>[...document.querySelectorAll(s)];
    document.querySelector('.row').click();
    return true;
  })()`);
  await sleep(700);
  const det = await p.eval(`(() => {
    const q=s=>document.querySelector(s);
    const qa=s=>[...document.querySelectorAll(s)];
    const rect=el=>{if(!el)return null;const r=el.getBoundingClientRect();return{top:+r.top.toFixed(1),left:+r.left.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),bottom:+r.bottom.toFixed(1)};};
    const detail=q('#detail');
    const body=q('#d-body');
    const firstField=q('#d-body .field, #d-body .field-fold');
    const firstFieldDD=q('#d-body .field dd');
    const promptBtn=q('.prompt-copy');
    const folds=qa('#d-body details').map(d=>({lab:(d.querySelector('summary')||{}).textContent&&d.querySelector('summary').textContent.trim().slice(0,30),open:d.open,h:+d.getBoundingClientRect().height.toFixed(1)}));
    return {
      detailHidden: detail.hidden,
      detailRect: rect(detail),
      detailScrollH: detail.scrollHeight,
      detailClientH: detail.clientHeight,
      bodyScrollH: body.scrollHeight,
      promptBtnRect: rect(promptBtn),
      promptBtnText: promptBtn?promptBtn.textContent:null,
      promptInputs: qa('.prompt-f-input').length,
      promptHint: (q('.prompt-hint')||{}).textContent,
      firstFieldRect: rect(firstField),
      firstFieldTopInPanel: firstField?+(firstField.getBoundingClientRect().top - detail.getBoundingClientRect().top).toFixed(1):null,
      firstFieldTag: firstField?firstField.tagName+'.'+firstField.className:null,
      fieldCount: qa('#d-body .field, #d-body .field-fold').length,
      foldCount: folds.length,
      folds,
      viewerOpen: (q('.fold-view details, details.fold-view')||{}).open,
      activeEl: document.activeElement ? document.activeElement.tagName+'.'+String(document.activeElement.className).split(' ')[0] : null,
      activeIsDetail: document.activeElement ? detail.contains(document.activeElement) : null,
      detailAriaLabel: detail.getAttribute('aria-label'),
      detailRole: detail.getAttribute('role'),
      detailAriaModal: detail.getAttribute('aria-modal'),
      bodyClass: document.body.className,
      hash: location.hash,
      tabbableInsideDetail: qa('#detail a[href], #detail button, #detail input, #detail summary').length,
      viewerTabs: qa('.viewer-tabs button').map(b=>({t:b.textContent,pressed:b.getAttribute('aria-pressed')})),
      copyBtnAriaLive: promptBtn?promptBtn.getAttribute('aria-live'):null,
      anyAriaLive: qa('[aria-live]').map(e=>e.id||e.className),
      fieldsOrder: qa('#d-body .field').map(f=>{const dt=f.querySelector('dt');const s=f.querySelector('summary');return (dt?dt.textContent:(s?s.textContent.trim().slice(0,20):'?'));}).slice(0,16),
    };
  })()`);
  out[label] = { list: r, detail: det };
  await p.close();
}

await measure(1440, 900, '1440x900');
await measure(390, 844, '390x844');
await measure(768, 1024, '768x1024');

console.log(JSON.stringify(out, null, 2));
await b.close();
server.close();
