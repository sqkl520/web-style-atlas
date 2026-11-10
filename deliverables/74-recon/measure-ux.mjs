/* 74-recon UX/a11y measurement. Static server + CDP. */
import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style';
const PORT = 9761;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2', '.woff': 'font/woff', '.md': 'text/markdown; charset=utf-8' };

const served = [];
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/prototypes/_selection/index.html';
  const f = normalize(join(ROOT, p));
  if (!f.startsWith(normalize(ROOT)) || !existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end('no'); return; }
  const body = readFileSync(f);
  served.push({ url: req.url, bytes: body.length });
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' });
  res.end(body);
});
await new Promise(r => server.listen(PORT, r));
const BASE = `http://127.0.0.1:${PORT}`;
const URL_MAIN = `${BASE}/prototypes/_selection/index.html`;

const out = {};

// ---------- A. 1440 load: network + images ----------
{
  const b = await Browser.launch({ width: 1440, height: 900 });
  const p = await b.newPage({ width: 1440, height: 900 });
  served.length = 0;
  await p.goto(URL_MAIN, { settleMs: 3500 });

  // network: use performance API for transfer sizes
  const net = await p.eval(`(() => {
    const rs = performance.getEntriesByType('resource');
    const by = {};
    let total = 0, encoded = 0;
    rs.forEach(r => {
      const ext = (r.name.split('.').pop() || '').split('?')[0].slice(0,5);
      by[ext] = by[ext] || { n: 0, transfer: 0, decoded: 0 };
      by[ext].n++;
      by[ext].transfer += r.encodedBodySize || 0;
      by[ext].decoded += r.decodedBodySize || 0;
      total += r.encodedBodySize || 0;
      encoded += r.transferSize || 0;
    });
    const nav = performance.getEntriesByType('navigation')[0];
    return { resourceCount: rs.length, byExt: by, resourceEncodedTotal: total,
      navEncoded: nav ? nav.encodedBodySize : null,
      navTransfer: nav ? nav.transferSize : null,
      domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
      loadEvent: nav ? Math.round(nav.loadEventEnd) : null };
  })()`);
  out.network1440 = net;

  const imgs = await p.eval(`(() => {
    const all = [...document.images];
    const detail = all.map(i => {
      const cs = getComputedStyle(i);
      const r = i.getBoundingClientRect();
      return { src: i.currentSrc ? i.currentSrc.split('/').pop() : i.src.split('/').pop(), complete: i.complete,
        naturalW: i.naturalWidth, naturalH: i.naturalHeight,
        w: Math.round(r.width), h: Math.round(r.height), display: cs.display, visibility: cs.visibility,
        loading: i.getAttribute('loading'), alt: i.getAttribute('alt') };
    });
    const zero = detail.filter(d => d.w === 0 || d.h === 0 || d.display === 'none' || d.visibility === 'hidden');
    const lazy = detail.filter(d => d.loading === 'lazy');
    return { total: detail.length, zeroArea: zero.length, lazy: lazy.length,
      noAlt: detail.filter(d => d.alt === null).length, emptyAlt: detail.filter(d => d.alt === '').length,
      loaded: detail.filter(d => d.naturalW > 0).length,
      byArea: { inViewport: detail.filter(d => d.h > 0).length },
      sample: detail.slice(0, 6) };
  })()`);
  out.images1440 = imgs;

  const rows = await p.eval(`(() => {
    const rows = [...document.querySelectorAll('.row')];
    const r0 = rows[0];
    const imgsPerRow = r0 ? r0.querySelectorAll('img').length : null;
    // hidden by CSS: .shots img on narrow? check each viewport class
    const shotBoxes = r0 ? [...r0.querySelectorAll('.shot')].map(f => {
      const cs = getComputedStyle(f); const rect = f.getBoundingClientRect();
      return { display: cs.display, w: Math.round(rect.width), h: Math.round(rect.height), figcap: f.querySelector('figcaption') ? f.querySelector('figcaption').textContent : null };
    }) : [];
    return { rowCount: rows.length, imgsPerRow, shotBoxes,
      rowHeight: r0 ? Math.round(r0.getBoundingClientRect().height) : null,
      totalRowImgs: document.querySelectorAll('.row img').length };
  })()`);
  out.rows1440 = rows;

  // semantics
  const sem = await p.eval(`(() => {
    const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(h => ({ lvl: +h.tagName[1], text: (h.textContent||'').trim().slice(0,40), hidden: !!(h.closest('[hidden]')||h.offsetParent===null) }));
    const levels = {};
    hs.forEach(h => levels[h.lvl] = (levels[h.lvl]||0)+1);
    const landmarks = [...document.querySelectorAll('header,nav,main,aside,footer,[role=banner],[role=main],[role=navigation],[role=complementary],[role=search]')].map(e => ({ tag: e.tagName.toLowerCase(), role: e.getAttribute('role'), label: e.getAttribute('aria-label'), cls: e.className && e.className.toString().slice(0,40) }));
    const rowLi = [...document.querySelectorAll('.row')].map(li => ({ tag: li.tagName, role: li.getAttribute('role'), tabindex: li.getAttribute('tabindex'), h3: !!li.querySelector('h3'), children: [...li.children].map(c=>c.tagName.toLowerCase()+'.'+(c.className||'')) }));
    const count = document.getElementById('count');
    return { headingLevels: levels, headings: hs.slice(0, 12), landmarks, rowSample: rowLi[0],
      roleButtonCount: document.querySelectorAll('.row[role=button]').length,
      countAria: { live: count.getAttribute('aria-live'), atomic: count.getAttribute('aria-atomic'), role: count.getAttribute('role'), tag: count.tagName },
      olChildren: [...document.getElementById('ledger').children].map(c=>c.tagName),
      orderedList: document.getElementById('ledger').tagName,
      langAttr: document.documentElement.lang,
      titleAttrCount: document.querySelectorAll('[title]').length
    };
  })()`);
  out.semantics1440 = sem;

  // detail panel open: focus, aria-live, field counts, chars before disclosure
  const det = await p.eval(`(() => {
    const row = document.querySelector('.row');
    row.click();
    return new Promise(res => setTimeout(() => {
      const d = document.getElementById('detail');
      const body = document.getElementById('d-body');
      const fields = [...body.querySelectorAll('.fields .field')];
      const fieldKinds = fields.map(f => ({ cls: f.className, fold: !!f.querySelector('details'),
        lab: (f.querySelector('dt')||f.querySelector('summary .fl-lab')||f.querySelector('summary')||{}).textContent }));
      const firstField = body.querySelector('.field');
      const dRect = d.getBoundingClientRect();
      return res({
        detailHidden: d.hidden,
        activeEl: document.activeElement ? document.activeElement.className + '|' + document.activeElement.tagName + '|' + (document.activeElement.id||'') : null,
        detailRole: d.tagName + '/' + d.getAttribute('role'),
        detailAriaLabel: d.getAttribute('aria-label'),
        detailTabindex: d.getAttribute('tabindex'),
        bodyDetailOpen: document.body.className,
        fieldCount: fields.length,
        inlineFields: fieldKinds.filter(f => !f.fold).length,
        foldedFields: fieldKinds.filter(f => f.fold).length,
        fieldKinds,
        firstFieldTopDoc: firstField ? Math.round(firstField.getBoundingClientRect().top + window.scrollY) : null,
        detailScrollH: body.scrollHeight,
        copyBtn: !!document.querySelector('.prompt-copy'),
        copyBtnText: (document.querySelector('.prompt-copy')||{}).textContent,
        detailsCount: body.querySelectorAll('details').length,
        headingsInDetail: [...d.querySelectorAll('h1,h2,h3')].map(h=>h.tagName+':'+h.textContent.trim().slice(0,20)),
        dlChildren: [...body.querySelectorAll('.fields > *')].map(e=>e.tagName),
        detailHeight: Math.round(dRect.height)
      });
    }, 900));
  })()`);
  out.detail1440 = det;

  // focus close restoration
  const focusClose = await p.eval(`(() => {
    const btn = document.getElementById('d-close');
    btn.focus(); btn.click();
    return new Promise(res => setTimeout(() => res({
      activeEl: document.activeElement ? document.activeElement.tagName + '.' + (document.activeElement.className||'') + '#' + (document.activeElement.id||'') : null,
      detailHidden: document.getElementById('detail').hidden,
      hash: location.hash
    }), 400));
  })()`);
  out.focusClose = focusClose;

  // keyboard: ArrowDown from body, from a link
  const kb = await p.eval(`(() => {
    document.body.focus();
    const before = location.hash;
    const ev = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
    document.body.dispatchEvent(ev);
    const after = location.hash;
    const prevented = ev.defaultPrevented;
    return { before, after, prevented, activeTag: document.activeElement.tagName, detailHidden: document.getElementById('detail').hidden };
  })()`);
  out.keyboardArrowFromBody = kb;

  const kb2 = await p.eval(`(() => {
    const link = document.querySelector('.mast-exit a') || document.querySelector('a[href]');
    link.focus();
    const before = location.hash;
    const ev = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
    link.dispatchEvent(ev);
    return { linkText: link.textContent.slice(0,20), before, after: location.hash, prevented: ev.defaultPrevented };
  })()`);
  out.keyboardArrowFromLink = kb2;

  // scroll height + first card position
  const layout = await p.eval(`(() => {
    const mast = document.querySelector('.mast');
    const rail = document.querySelector('.rail');
    const bar = document.querySelector('.bar');
    const first = document.querySelector('.row');
    const railBody = document.querySelector('.rail-fold-body');
    return {
      docScrollH: document.documentElement.scrollHeight,
      mastH: Math.round(mast.getBoundingClientRect().height),
      railH: Math.round(rail.getBoundingClientRect().height),
      railScrollH: rail.scrollHeight,
      railClientH: rail.clientHeight,
      barH: Math.round(bar.getBoundingClientRect().height),
      firstCardTop: Math.round(first.getBoundingClientRect().top + window.scrollY),
      hOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      railFoldOpen: document.querySelector('.rail-fold').open,
      mastFoldOpen: document.querySelector('.mast-fold').open,
      railFoldBodyChildren: railBody ? railBody.children.length : 0,
      chipCountTotal: document.querySelectorAll('.chips button').length,
      sceneChipCount: document.querySelectorAll('.scene-chip').length,
      sceneMoreVisible: (() => { const m = document.querySelector('.scene-more'); return m ? getComputedStyle(m).display : null; })(),
      nearChipsParentClass: (() => { const b = document.querySelector('.scene-chip.is-near'); return b ? (b.parentElement.className + ' | parentOfParent=' + b.parentElement.parentElement.className) : null; })(),
      nearChipComputed: (() => { const b = document.querySelector('.scene-chip.is-near'); if (!b) return null; const cs = getComputedStyle(b); return { border: cs.border, borderStyle: cs.borderStyle, padding: cs.padding, fontSize: cs.fontSize, background: cs.backgroundColor, color: cs.color }; })(),
      directChipComputed: (() => { const b = document.querySelector('.scene-chip.is-direct'); if (!b) return null; const cs = getComputedStyle(b); return { border: cs.border, borderStyle: cs.borderStyle, padding: cs.padding, fontSize: cs.fontSize, background: cs.backgroundColor }; })(),
      chipRuleMatched: (() => { const b = document.querySelector('.scene-chip.is-direct'); if (!b || !b.matches) return null; return { directMatchesChipsBtn: b.matches('.chips button'), nearMatchesChipsBtn: (document.querySelector('.scene-chip.is-near')||{matches:()=>null}).matches ? document.querySelector('.scene-chip.is-near').matches('.chips button') : null }; })(),
      kbdInNote: [...document.querySelectorAll('kbd')].map(k=>k.textContent)
    };
  })()`);
  out.layout1440 = layout;

  // screen reader style: accessibility snapshot
  const ax = await p.eval(`(() => {
    const rows = [...document.querySelectorAll('.row')].slice(0,3).map(r => ({
      role: r.getAttribute('role'), label: r.getAttribute('aria-label'),
      innerText: (r.innerText||'').slice(0,60), headingText: (r.querySelector('h3')||{}).textContent
    }));
    return { rows };
  })()`);
  out.rowsAx = ax;

  await b.close();
}

// ---------- B. 390 mobile ----------
{
  const b = await Browser.launch({ width: 390, height: 844 });
  const p = await b.newPage({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true });
  await p.goto(URL_MAIN, { settleMs: 3000 });
  await p.eval(`window.scrollTo(0,0)`);

  const m = await p.eval(`(() => {
    const first = document.querySelector('.row');
    const bar = document.querySelector('.bar');
    const mast = document.querySelector('.mast');
    const rail = document.querySelector('.rail');
    const folds = ['mast-fold','rail-fold','bar-fold','tpl-strip'].map(id => { const e=document.getElementById(id); return { id, exists: !!e, open: e ? e.open : null }; });
    // tap targets: all interactive, measured
    const inter = [...document.querySelectorAll('a[href],button,input,select,summary,[tabindex="0"],[role=button]')].filter(e => {
      const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
    });
    const small = inter.map(e => { const r = e.getBoundingClientRect(); return { tag: e.tagName.toLowerCase(), cls: (e.className||'').toString().slice(0,32), txt: (e.innerText||e.value||'').trim().slice(0,18), w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top + window.scrollY) }; })
      .filter(x => x.h < 24 || x.w < 24).sort((a,b)=>a.h-b.h);
    const under44 = inter.filter(e => { const r = e.getBoundingClientRect(); return r.height < 44 || r.width < 44; }).length;
    return {
      viewport: { w: innerWidth, h: innerHeight },
      hOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      docScrollH: document.documentElement.scrollHeight,
      screens: +(document.documentElement.scrollHeight / innerHeight).toFixed(2),
      mastH: Math.round(mast.getBoundingClientRect().height),
      barH: Math.round(bar.getBoundingClientRect().height),
      railH: Math.round(rail.getBoundingClientRect().height),
      firstCardTop: Math.round(first.getBoundingClientRect().top + window.scrollY),
      folds,
      interactiveTotal: inter.length,
      under24: small.filter(x => x.h < 24 || x.w < 24),
      under24Count: small.filter(x => x.h < 24 || x.w < 24).length,
      under44Count: under44,
      railScrollable: (() => { const cs=getComputedStyle(rail); return { overflowY: cs.overflowY, maxHeight: cs.maxHeight, scrollH: rail.scrollHeight, clientH: rail.clientHeight }; })(),
      bodyScrollH: document.documentElement.scrollHeight,
      nestedScrollers: [...document.querySelectorAll('*')].filter(e => {
        const cs = getComputedStyle(e);
        return (cs.overflowY === 'auto' || cs.overflowY === 'scroll') && e.scrollHeight > e.clientHeight + 4 && e.clientHeight > 0;
      }).map(e => ({ tag: e.tagName.toLowerCase(), id: e.id, cls: (e.className||'').toString().slice(0,30), scrollH: e.scrollHeight, clientH: e.clientHeight })),
      fontSizesUnder13: [...document.querySelectorAll('body *')].filter(e => {
        if (!e.offsetParent && getComputedStyle(e).position !== 'fixed') return false;
        if (!(e.innerText||'').trim()) return false;
        const fs = parseFloat(getComputedStyle(e).fontSize);
        return fs < 13;
      }).length
    };
  })()`);
  out.mobile390 = m;

  // open detail on mobile: full screen layer? focus?
  const md = await p.eval(`(() => {
    const row = document.querySelector('.row');
    row.scrollIntoView(); row.click();
    return new Promise(res => setTimeout(() => {
      const d = document.getElementById('detail');
      const cs = getComputedStyle(d);
      const r = d.getBoundingClientRect();
      return res({
        hidden: d.hidden, position: cs.position, inset: cs.inset, zIndex: cs.zIndex,
        rect: { top: Math.round(r.top), left: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height) },
        activeEl: document.activeElement ? document.activeElement.tagName + '.' + (document.activeElement.className||'').slice(0,30) : null,
        overflowY: cs.overflowY,
        docScrollH: document.documentElement.scrollHeight,
        nested: (() => { const body = document.getElementById('d-body'); return { scrollH: body.scrollHeight, clientH: body.clientHeight, overflowY: getComputedStyle(body).overflowY }; })()
      });
    }, 1200));
  })()`);
  out.mobileDetail = md;

  await b.close();
}

// ---------- C. wizard ----------
{
  const b = await Browser.launch({ width: 1440, height: 900 });
  const p = await b.newPage({ width: 1440, height: 900 });
  await p.goto(`${BASE}/prototypes/_selection/wizard.html`, { settleMs: 2000 });
  const w1 = await p.eval(`(() => {
    const q = [...document.querySelectorAll('fieldset, legend, h1,h2,h3, input, button, [role]')].map(e => ({
      tag: e.tagName.toLowerCase(), type: e.getAttribute('type'), role: e.getAttribute('role'), name: e.getAttribute('name'),
      txt: (e.innerText||e.value||'').trim().slice(0,40), cls: (e.className||'').toString().slice(0,30)
    }));
    return {
      title: document.title,
      h: [...document.querySelectorAll('h1,h2,h3')].map(e=>e.tagName+':'+e.textContent.trim().slice(0,40)),
      fieldsets: document.querySelectorAll('fieldset').length,
      legends: [...document.querySelectorAll('legend')].map(l=>l.textContent.trim().slice(0,40)),
      radiogroups: document.querySelectorAll('[role=radiogroup]').length,
      radios: document.querySelectorAll('input[type=radio]').length,
      radioNameAttr: [...new Set([...document.querySelectorAll('input[type=radio]')].map(r=>r.name))],
      ariaLive: [...document.querySelectorAll('[aria-live]')].map(e=>e.getAttribute('aria-live')+'|'+e.id+'|'+e.className),
      visibleText: (document.body.innerText||'').slice(0,1200),
      elements: q
    };
  })()`);
  out.wizard1 = w1;
  await b.close();
}

// ---------- D. static byte math ----------
{
  const files = ['prototypes/_selection/index.html','prototypes/_selection/style.css','prototypes/_selection/data.js','prototypes/_selection/prompts.js','prototypes/_selection/prompt-copy.js','prototypes/_selection/app.js','prototypes/_selection/self-gate.js','prototypes/_selection/wizard.html','prototypes/_selection/wizard.js','prototypes/_selection/wizard.css'];
  const zlib = await import('node:zlib');
  const sizes = files.map(f => {
    const buf = readFileSync(join(ROOT, f));
    return { file: f.replace('prototypes/_selection/',''), raw: buf.length, gzip: zlib.gzipSync(buf, { level: 9 }).length };
  });
  out.bytes = sizes;
  out.bytesTotal = sizes.reduce((a, s) => ({ raw: a.raw + s.raw, gzip: a.gzip + s.gzip }), { raw: 0, gzip: 0 });
  // fonts referenced by index.html
  const fontFiles = ['prototypes/_fonts/css/archivo-vf__wdth-wght.css','prototypes/_fonts/css/noto-sans-sc__100..900.css','prototypes/_fonts/css/ibm-plex-mono__400-500.css'];
  out.fontCSS = fontFiles.map(f => { try { const buf = readFileSync(join(ROOT,f)); return { f: f.split('/').pop(), raw: buf.length, gzip: zlib.gzipSync(buf,{level:9}).length }; } catch(e) { return { f, err: String(e).slice(0,60) }; } });
  // screenshot jpg sizes
  const { execSync } = await import('node:child_process');
  const jpgList = execSync(`cd "${ROOT}/prototypes/_selection/.inspect" 2>/dev/null; find . -name "*.jpg" | head -5`, { shell: 'bash' }).toString().trim().split('\n').filter(Boolean);
  out.jpgSample = jpgList;
}

console.log(JSON.stringify(out, null, 1));
await new Promise(r => server.close(r));
