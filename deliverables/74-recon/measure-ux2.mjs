/* 74-recon pass 2: a11y tree, copy focus, wizard flow, chip counts, empty state. */
import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style';
const PORT = 9762;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2', '.woff': 'font/woff' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/prototypes/_selection/index.html';
  const f = normalize(join(ROOT, p));
  if (!f.startsWith(normalize(ROOT)) || !existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise(r => server.listen(PORT, r));
const BASE = `http://127.0.0.1:${PORT}`;
const out = {};

const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900 });
await p.goto(`${BASE}/prototypes/_selection/index.html`, { settleMs: 3500 });

out.chipCounts = await p.eval(`(() => {
  const sum = document.querySelector('.rail-fold-sum');
  const chipsBoxes = [...document.querySelectorAll('.chips')].map(c => ({ id: c.id, n: c.querySelectorAll('button').length }));
  const more = document.querySelector('.scene-more');
  return {
    summaryText: sum ? sum.textContent.trim() : null,
    chipsBoxes, chipsTotal: document.querySelectorAll('.chips button').length,
    sceneDirect: document.querySelectorAll('#flt-scene .scene-chip').length,
    sceneNear: more ? more.querySelectorAll('.scene-chip').length : 0,
    sceneNearButtons: more ? more.querySelectorAll('button').length : 0,
    sceneMoreInChips: more ? more.closest('.chips') !== null : null,
    sceneMoreParent: more ? more.parentElement.className : null,
    chipsParent: document.querySelector('#flt-scene').parentElement.className,
    toggleText: (document.querySelector('.scene-toggle')||{}).textContent,
    totalIfExpanded: document.querySelectorAll('.chips button, .scene-more button').length,
    railBlocks: document.querySelectorAll('.rail-block').length,
    railH2: [...document.querySelectorAll('.rail-block h2')].map(h=>h.textContent),
    unsupportedCount: (()=>{const n=document.querySelector('.scene-unsupported');return n?n.textContent.slice(0,20):null})()
  };
})()`);

// expand near chips and re-measure styles
out.nearChipAfterExpand = await p.eval(`(() => {
  const t = document.querySelector('.scene-toggle');
  t.click();
  const near = [...document.querySelectorAll('.scene-more .scene-chip')].slice(0,3).map(b => {
    const cs = getComputedStyle(b); const r = b.getBoundingClientRect();
    return { txt: b.textContent.slice(0,12), cls: b.className, border: cs.border, font: cs.fontSize, pad: cs.padding, bg: cs.backgroundColor, h: Math.round(r.height), w: Math.round(r.width), matchesChipsBtn: b.matches('.chips button') };
  });
  const direct = [...document.querySelectorAll('#flt-scene .scene-chip')].slice(0,2).map(b => {
    const cs = getComputedStyle(b); const r = b.getBoundingClientRect();
    return { txt: b.textContent.slice(0,12), h: Math.round(r.height), w: Math.round(r.width), font: cs.fontSize };
  });
  return { near, direct };
})()`);

// Copy button focus behaviour
out.copyFocus = await p.eval(`(() => {
  const row = document.querySelector('.row'); row.click();
  return new Promise(res => setTimeout(() => {
    const btn = document.querySelector('.prompt-copy');
    btn.focus();
    const before = document.activeElement === btn;
    let copied = null;
    const origWrite = navigator.clipboard && navigator.clipboard.writeText;
    btn.click();
    setTimeout(() => {
      res({ focusBefore: before, activeAfter: document.activeElement ? document.activeElement.tagName + '.' + (document.activeElement.className||'').slice(0,30)+'#'+(document.activeElement.id||'') : null,
        btnText: btn.textContent, hasLiveRegion: !!document.querySelector('[aria-live]'),
        liveRegions: [...document.querySelectorAll('[aria-live]')].map(e=>e.id+'|'+e.getAttribute('aria-live')) });
    }, 250);
  }, 800));
})()`);

// a11y tree: are h3 in rows exposed?
const axTree = await p.send('Accessibility.getFullAXTree', {});
out.axHeadings = (axTree.nodes || []).filter(n => n.role && n.role.value === 'heading').map(n => ({ level: (n.properties||[]).find(p=>p.name==='level')?.value?.value, name: (n.name||{}).value }));
out.axButtonCount = (axTree.nodes || []).filter(n => n.role && n.role.value === 'button').length;
out.axListCount = (axTree.nodes || []).filter(n => n.role && n.role.value === 'list').length;
out.axListItemCount = (axTree.nodes || []).filter(n => n.role && n.role.value === 'listitem').length;
out.axLandmarks = (axTree.nodes || []).filter(n => n.role && ['banner','main','complementary','navigation','contentinfo','search','region'].includes(n.role.value)).map(n => ({ role: n.role.value, name: (n.name||{}).value }));

// field count per scheme (static from data via page)
out.fieldCounts = await p.eval(`(() => {
  const S = window.SCHEMES;
  const F = ['def','family','fontsSpec','layout','landing','visuals','motion','audit','risk','scenes','quirk'];
  return S.map(r => ({ id: r.id, n: F.filter(k => r[k]).length + 1, missing: F.filter(k => !r[k]) }));
})()`);

// empty state
out.emptyState = await p.eval(`(() => {
  const q = document.getElementById('q');
  q.value = '餐厅'; q.dispatchEvent(new Event('input', {bubbles:true}));
  return new Promise(res => setTimeout(() => {
    const e = document.getElementById('empty');
    const tpl = document.getElementById('empty-tpl');
    return res({ emptyHidden: e.hidden, rows: document.querySelectorAll('.row').length,
      count: document.getElementById('count').textContent,
      emptyText: (e.innerText||'').slice(0,600),
      eNext: (document.getElementById('e-next')||{}).innerHTML,
      tplHidden: tpl ? tpl.hidden : null, tplText: tpl ? (tpl.innerText||'').slice(0,300) : null,
      railFoldOpen: document.getElementById('rail-fold').open,
      activeEl: document.activeElement.tagName });
  }, 900));
})()`);

// keyboard: full list of shortcuts, and does ArrowDown fire from body
out.keyboardAudit = await p.eval(`(() => {
  const res = {};
  document.getElementById('reset').click();
  // from body
  document.body.focus();
  const fire = (k) => { const ev = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }); document.body.dispatchEvent(ev); return { prevented: ev.defaultPrevented, hash: location.hash }; };
  res.arrowDownFromBody = fire('ArrowDown');
  res.arrowUpFromBody = fire('ArrowUp');
  res.escape = fire('Escape');
  res.slash = (() => { const ev = new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true }); document.body.dispatchEvent(ev); return { prevented: ev.defaultPrevented, active: document.activeElement.id }; })();
  return res;
})()`);

// deep link
await p.goto(`${BASE}/prototypes/_selection/index.html#S07`, { settleMs: 2500 });
out.deepLink = await p.eval(`(() => ({
  hash: location.hash,
  detailHidden: document.getElementById('detail').hidden,
  dNo: document.getElementById('d-no').textContent,
  active: document.activeElement.tagName + '#' + (document.activeElement.id||''),
  activeIsDetailHead: document.activeElement.className.indexOf('detail-head') >= 0,
  scrollY: window.scrollY
}))()`);

await b.close();

// wizard full flow
{
  const b2 = await Browser.launch({ width: 1440, height: 900 });
  const p2 = await b2.newPage({ width: 1440, height: 900 });
  await p2.goto(`${BASE}/prototypes/_selection/wizard.html`, { settleMs: 2000 });
  out.wizardFlow = await p2.eval(`(() => {
    const log = [];
    function state() {
      const q = document.querySelector('.wz-step-num, [class*=step]');
      return {
        visibleH2: [...document.querySelectorAll('h2')].filter(h=>h.offsetParent!==null).map(h=>h.textContent.trim().slice(0,40)),
        buttonsEnabled: [...document.querySelectorAll('button')].filter(b=>b.offsetParent!==null).map(b=>b.textContent.trim().slice(0,18)),
        hash: location.hash,
        focus: document.activeElement.tagName + '.' + (document.activeElement.className||'').slice(0,24),
        liveRegions: [...document.querySelectorAll('[aria-live]')].length
      };
    }
    log.push({ step: 'initial', ...state() });
    return log;
  })()`);
  // click through 5 answers
  for (let i = 0; i < 5; i++) {
    const r = await p2.eval(`(() => {
      const btns = [...document.querySelectorAll('button')].filter(b => b.offsetParent !== null && !/重来|复制|回到选型台|跳到/.test(b.textContent));
      const target = btns.find(b => b.closest('.wz-opt, [class*=opt], li')) || btns[0];
      const label = target ? target.textContent.trim().slice(0,24) : null;
      if (target) target.click();
      return { clicked: label, btnCount: btns.length };
    })()`);
    await new Promise(r => setTimeout(r, 300));
    out.wizardFlow.push({ step: i + 1, ...r, ...(await p2.eval(`(() => ({
      visibleH2: [...document.querySelectorAll('h2')].filter(h=>h.offsetParent!==null).map(h=>h.textContent.trim().slice(0,40)),
      hash: location.hash,
      focus: document.activeElement.tagName + '.' + (document.activeElement.className||'').slice(0,24),
      liveRegions: [...document.querySelectorAll('[aria-live]')].length,
      bodyText: document.body.innerText.slice(-700)
    }))()`)) });
  }
  out.wizardFinal = await p2.eval(`(() => {
    const cards = [...document.querySelectorAll('.wz-rec, .wz-result, [class*=rec]')].map(e=>e.className);
    return {
      hash: location.hash,
      text: document.body.innerText.slice(-1400),
      headingCount: [...document.querySelectorAll('h2')].filter(h=>h.offsetParent!==null).length,
      focus: document.activeElement.tagName + '.' + (document.activeElement.className||'').slice(0,30),
      links: [...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')).slice(0,15),
      copyBtns: [...document.querySelectorAll('button')].filter(b=>b.offsetParent!==null).map(b=>b.textContent.trim().slice(0,24)),
      liveRegions: [...document.querySelectorAll('[aria-live]')].length
    };
  })()`);
  await b2.close();
}

console.log(JSON.stringify(out, null, 1));
server.close();
