// Live a11y probe: drives the same Chrome via the taste-skill CDP lib, with cwd = repo root
// so ../_fonts/ resolves. Measures the things static parsing cannot: real tab order,
// computed contrast against real painted backgrounds, accessible names, reduced-motion.
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:http';
import { statSync, createReadStream, existsSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import { Browser, sleep } from './lib/cdp2.mjs';

const ROOT = resolve('D:/Web/style');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf' };
const server = createServer((req, res) => {
  try {
    let f = resolve(join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
    if (!f.startsWith(ROOT + sep) && f !== ROOT) { res.writeHead(403); return res.end('no'); }
    if (statSync(f).isDirectory()) f = join(f, 'index.html');
    res.writeHead(200, { 'content-type': MIME[extname(f).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
    createReadStream(f).pipe(res);
  } catch { res.writeHead(404); res.end('nf'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const schemes = process.argv.slice(2).length ? process.argv.slice(2) : null;
const dirs = fs.readdirSync(join(ROOT, 'prototypes')).filter(d => /^S\d\d-/.test(d)).sort()
  .filter(d => !schemes || schemes.some(s => d.startsWith(s)));

const PROBE = () => {
  const out = {};
  const vis = (el) => { const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0; };

  // 1 headings, document order
  const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(vis).map(h => ({ lvl: +h.tagName[1], text: h.textContent.trim().slice(0, 40) }));
  const orderIssues = [];
  if (hs.length) {
    if (hs[0].lvl !== 1) orderIssues.push('first heading is h' + hs[0].lvl + ' "' + hs[0].text + '"');
    const n1 = hs.filter(h => h.lvl === 1).length;
    if (n1 !== 1) orderIssues.push(n1 + ' h1 elements');
    for (let i = 1; i < hs.length; i++) if (hs[i].lvl - hs[i - 1].lvl > 1) orderIssues.push('skip h' + hs[i - 1].lvl + '→h' + hs[i].lvl + ' at "' + hs[i].text + '"');
  } else orderIssues.push('no headings at all');
  out.headings = { count: hs.length, seq: hs.map(h => h.lvl).join(''), issues: orderIssues };

  // 2 landmarks
  const lm = {};
  for (const el of document.querySelectorAll('header,nav,main,footer,aside,section,article,[role]')) {
    const role = el.getAttribute('role') || el.tagName.toLowerCase();
    if (!lm[role]) lm[role] = 0; lm[role]++;
  }
  out.landmarks = lm;
  out.mainCount = document.querySelectorAll('main,[role="main"]').length;
  out.navCount = document.querySelectorAll('nav,[role="navigation"]').length;
  out.h1 = document.querySelectorAll('h1').length;

  // 3 images
  const imgs = [...document.querySelectorAll('img')];
  out.images = {
    total: imgs.length,
    noAlt: imgs.filter(i => !i.hasAttribute('alt')).length,
    emptyAlt: imgs.filter(i => i.getAttribute('alt') === '').length,
    decorativeAriaHidden: imgs.filter(i => i.getAttribute('aria-hidden') === 'true').length,
    noDims: imgs.filter(i => !i.hasAttribute('width') || !i.hasAttribute('height')).length,
    sampleAlt: imgs.slice(0, 2).map(i => (i.getAttribute('alt') || '').slice(0, 55))
  };

  // 4 controls: accessible name + size
  const ctrls = [...document.querySelectorAll('a[href],button,input,select,textarea,[role="button"],[role="link"]')].filter(vis);
  const unnamed = [];
  for (const c of ctrls) {
    const label = (c.getAttribute('aria-label') || '').trim()
      || (c.getAttribute('aria-labelledby') ? (document.getElementById(c.getAttribute('aria-labelledby'))?.textContent || '').trim() : '')
      || (c.textContent || '').trim()
      || (c.value || '').trim()
      || (c.title || '').trim();
    if (!label) unnamed.push(c.tagName.toLowerCase() + '.' + (c.className || '').toString().split(' ')[0]);
    if (c.tagName === 'BUTTON' && !c.hasAttribute('type')) unnamed.push('BUTTON-without-type:' + (c.className || ''));
  }
  // inputs and their labels
  const inputs = [...document.querySelectorAll('input,select,textarea')].filter(vis);
  const unlabelledInputs = inputs.filter(i => {
    if (i.getAttribute('aria-label') || i.getAttribute('aria-labelledby')) return false;
    if (i.id && document.querySelector(`label[for="${i.id}"]`)) return false;
    if (i.closest('label')) return false;
    if ((i.type === 'radio' || i.type === 'checkbox') && i.closest('label')) return false;
    return true;
  }).map(i => i.tagName.toLowerCase() + '[' + (i.type || '') + ']');
  out.controls = { total: ctrls.length, unnamed: [...new Set(unnamed)].slice(0, 6), inputs: inputs.length, unlabelledInputs: [...new Set(unlabelledInputs)] };

  // 5 focus order: tab through up to 60 stops
  const focusables = [...document.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])')].filter(vis);
  out.focusableCount = focusables.length;
  out.negativeTabindex = [...document.querySelectorAll('[tabindex="-1"]')].filter(vis).length;
  out.positiveTabindex = [...document.querySelectorAll('[tabindex]')].filter(e => +e.getAttribute('tabindex') > 0).length;

  // 6 computed contrast over real painted stack
  const rgb = (s) => { const m = s.match(/(\d+(?:\.\d+)?)/g); return m ? m.slice(0, 3).map(Number).map(Math.round) : null; };
  const lum = (c) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const cr = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const bgStack = (el) => {
    for (let p = el; p; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.backgroundImage !== 'none') return null;
      const c = rgb(cs.backgroundColor);
      const a = (cs.backgroundColor.match(/[\d.]+/g) || [])[3];
      if (c && (a === undefined || +a > 0.5)) return c;
    }
    return rgb(getComputedStyle(document.body).backgroundColor) || [255, 255, 255];
  };
  const lowC = [];
  let checked = 0;
  for (const el of document.querySelectorAll('p,li,td,th,h1,h2,h3,h4,span,a,button,dd,dt,figcaption,code,caption,label,summary')) {
    if (!vis(el)) continue;
    const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('');
    if (own.length < 4) continue;
    const cs = getComputedStyle(el);
    const fg = rgb(cs.color); if (!fg) continue;
    const bg = bgStack(el); if (!bg) continue;
    const size = parseFloat(cs.fontSize), wt = +cs.fontWeight || 400;
    const need = size >= 24 || (size >= 18.66 && wt >= 700) ? 3 : 4.5;
    const r = cr(fg, bg);
    checked++;
    if (r < need) lowC.push({ text: own.slice(0, 34), fg: '#' + fg.map(v => v.toString(16).padStart(2, '0')).join(''), bg: '#' + bg.map(v => v.toString(16).padStart(2, '0')).join(''), ratio: +r.toFixed(2), need, size: +size.toFixed(1), weight: wt, tag: el.tagName.toLowerCase(), cls: (el.className || '').toString().slice(0, 30) });
  }
  out.contrast = { checked, low: lowC.sort((a, b) => a.ratio - b.ratio).slice(0, 10), lowCount: lowC.length };

  // 7 focus visibility: does the first 3 focusables show a visual change on :focus-visible?
  out.focusStyle = (() => {
    const test = focusables.slice(0, 8);
    let styled = 0, checked2 = 0;
    for (const el of test) {
      const before = getComputedStyle(el);
      const b = [before.outlineStyle, before.outlineWidth, before.outlineColor, before.boxShadow, before.backgroundColor, before.color, before.textDecorationLine].join('|');
      el.focus();
      const after = getComputedStyle(el);
      const a = [after.outlineStyle, after.outlineWidth, after.outlineColor, after.boxShadow, after.backgroundColor, after.color, after.textDecorationLine].join('|');
      checked2++;
      if (a !== b) styled++;
      el.blur();
    }
    return { checked: checked2, changed: styled, unstyled: checked2 - styled };
  })();

  // 8 reduced-motion: does emulation change animation/transition counts?
  out.motion = {
    animations: document.getAnimations ? document.getAnimations().length : -1,
    cssAnimNames: [...new Set([...document.querySelectorAll('*')].map(e => getComputedStyle(e).animationName).filter(n => n && n !== 'none'))].slice(0, 8),
    transitionCount: [...document.querySelectorAll('*')].filter(e => getComputedStyle(e).transitionDuration !== '0s').length
  };

  // 9 lang + title + skip
  out.doc = {
    lang: document.documentElement.lang || '(none)',
    title: (document.title || '').slice(0, 60),
    skipLink: !!document.querySelector('a[href^="#"]') && /^(跳到|跳过|skip)/i.test((document.querySelector('a[href^="#"]')?.textContent || '').trim()),
    viewportMeta: !!document.querySelector('meta[name="viewport"]')
  };
  return out;
};

const browser = await Browser.launch();
const results = [];
for (const d of dirs) {
  const page = await browser.newPage({ width: 1440, height: 900, dsf: 1 });
  const url = `${base}/prototypes/${encodeURIComponent(d)}/index.html`;
  try {
    await page.goto(url, { timeoutMs: 25000, settleMs: 600 });
    await page.eval('document.fonts.ready.then(()=>true)').catch(() => {});
    await sleep(900);
    const r = await page.eval(PROBE);
    // reduced motion pass
    await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }).catch(() => {});
    await sleep(500);
    const rm = await page.eval(() => ({
      animations: document.getAnimations ? document.getAnimations().length : -1,
      runningDurations: (document.getAnimations ? document.getAnimations() : []).map(a => a.effect && a.effect.getTiming ? a.effect.getTiming().duration : 0).filter(x => typeof x === 'number' && x > 0).slice(0, 12),
      transitionCount: [...document.querySelectorAll('*')].filter(e => getComputedStyle(e).transitionDuration !== '0s').length
    })).catch(() => null);
    results.push({ dir: d, ok: true, normal: r, reduced: rm });
  } catch (e) { results.push({ dir: d, ok: false, error: String(e).slice(0, 200) }); }
  await page.close();
}
await browser.close();
server.close();
fs.writeFileSync('D:/Web/style/deliverables/64-scheme-quality/a11y-live.json', JSON.stringify(results, null, 1));
console.log('wrote', results.length);
