function () {
  const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const all = Array.from(document.querySelectorAll('*'));

  /* ---------- colors actually painted ---------- */
  const colors = new Map();
  const add = (val, where) => {
    if (!val) return;
    const m = val.match(/rgba?\(([^)]+)\)/g);
    if (!m) {
      if (val !== 'transparent' && val !== 'none' && /^#|^[a-z]+$/.test(val)) {
        if (!colors.has(val)) colors.set(val, new Set());
        colors.get(val).add(where);
      }
      return;
    }
    for (const one of m) {
      const p = one.match(/rgba?\(([^)]+)\)/)[1].split(',').map((x) => parseFloat(x));
      const a = p.length > 3 ? p[3] : 1;
      if (!a) continue;
      const hx = '#' + p.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
      const k = a < 1 ? hx + '@' + a.toFixed(2) : hx;
      if (!colors.has(k)) colors.set(k, new Set());
      colors.get(k).add(where);
    }
  };
  for (const el of all) {
    const cs = getComputedStyle(el);
    const tag = el.tagName.toLowerCase();
    add(cs.color, tag + '.color');
    add(cs.backgroundColor, tag + '.bg');
    for (const s of ['Top', 'Right', 'Bottom', 'Left']) {
      if (parseFloat(cs['border' + s + 'Width']) > 0) add(cs['border' + s + 'Color'], tag + '.border');
    }
    if (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) add(cs.outlineColor, tag + '.outline');
    if (cs.textDecorationLine !== 'none') add(cs.textDecorationColor, tag + '.deco');
    const bi = cs.backgroundImage;
    if (bi && bi !== 'none') add(bi.replace(/\s+/g, ' ').slice(0, 120), tag + '.bgImage');
  }
  const svgPaint = Array.from(document.querySelectorAll('svg *')).map((n) => {
    const cs = getComputedStyle(n);
    return [cs.fill, cs.stroke].filter((v) => v && v !== 'none');
  }).flat();

  /* ---------- fonts: declared + real availability ---------- */
  const famOf = (el) => (el ? getComputedStyle(el).fontFamily : null);
  function measure(family) {
    const s = document.createElement('span');
    s.style.cssText = 'position:absolute;visibility:hidden;font-size:100px;white-space:nowrap;font-family:' + family;
    s.textContent = 'MMMMmmmm 0123456789 存目修复';
    document.body.appendChild(s);
    const w = s.getBoundingClientRect().width;
    s.remove();
    return w;
  }
  const avail = {};
  const w = (fam) => {
    const s = document.createElement('span');
    s.style.cssText = 'position:absolute;visibility:hidden;font-size:100px;white-space:nowrap;font-family:' + fam;
    s.textContent = 'MMMMmmmm 0123456789 存目修复';
    document.body.appendChild(s);
    const r = s.getBoundingClientRect().width;
    s.remove();
    return Math.round(r * 10) / 10;
  };
  // baseline: a family that certainly does not exist, so we can tell "loaded" from "fell back"
  const noSuchSerif = w('"__no_such_family_zz__", serif');
  const noSuchMono = w('"__no_such_family_zz__", monospace');
  for (const [f, generic] of [['Newsreader', 'serif'], ['Libre Franklin', 'serif'], ['IBM Plex Mono', 'monospace'], ['Anton', 'sans-serif'], ['Zhuque Fangsong', 'serif'], ['Noto Serif SC', 'serif'], ['JetBrains Mono', 'monospace'], ['FangSong', 'serif']]) {
    const stack = w('"' + f + '", ' + generic);
    const base = generic === 'monospace' ? noSuchMono : noSuchSerif;
    avail[f] = { stackWidth: stack, fallbackWidth: base, distinct: Math.abs(stack - base) > 0.5 };
  }
  // which stack actually wins for a given rendered element
  const winnerOf = (familyStr) => {
    const first = (familyStr || '').split(',')[0].replace(/["']/g, '').trim();
    const generic = /mono/.test(familyStr) ? 'monospace' : 'serif';
    const a = w(first ? '"' + first + '", ' + generic : generic);
    const base = generic === 'monospace' ? noSuchMono : noSuchSerif;
    return { first, widthWithFirst: a, widthWithout: base, likelyReal: Math.abs(a - base) > 0.5 };
  };
  avail._baselines = { serif: noSuchSerif, mono: noSuchMono, loadedFaces: [] };
  try {
    avail._baselines.loadedFaces = Array.from(document.fonts).filter((f) => f.status === 'loaded').map((f) => f.family + ' ' + f.weight + ' ' + f.style);
  } catch (e) {}
  const h1 = document.querySelector('h1');
  const body = document.body;
  const numEl = document.querySelector('.no, .n, .yr, .price, .dim, .cnt, .folio');
  const fonts = {
    h1: { family: famOf(h1), size: h1 ? getComputedStyle(h1).fontSize : null, weight: h1 ? getComputedStyle(h1).fontWeight : null, winner: winnerOf(famOf(h1)) },
    body: { family: famOf(body), size: getComputedStyle(body).fontSize, winner: winnerOf(famOf(body)) },
    num: numEl ? { text: norm(numEl.textContent).slice(0, 10), family: famOf(numEl), tnum: getComputedStyle(numEl).fontVariantNumeric, align: getComputedStyle(numEl).textAlign, winner: winnerOf(famOf(numEl)) } : null,
    numSample: Array.from(document.querySelectorAll('.no,.n,.yr,.price,.dim,.cnt,.folio,.meta strong,.index b')).slice(0, 5).map((el) => ({ t: norm(el.textContent).slice(0, 8), f: getComputedStyle(el).fontFamily, tnum: getComputedStyle(el).fontVariantNumeric, align: getComputedStyle(el).textAlign })),
    avail,
  };

  /* ---------- radius ---------- */
  const radius = { elements: all.length, nonZero: [] };
  for (const el of all) {
    const cs = getComputedStyle(el);
    const v = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius];
    if (v.some((x) => parseFloat(x) > 0)) {
      radius.nonZero.push({ tag: el.tagName.toLowerCase(), cls: (el.className || '').toString().slice(0, 30), v: v.join(' ') });
    }
  }

  /* ---------- shadows ---------- */
  const shadows = { total: 0, outer: [], inset: [] };
  for (const el of all) {
    const cs = getComputedStyle(el);
    if (cs.boxShadow && cs.boxShadow !== 'none') {
      for (const part of cs.boxShadow.split(/,(?![^(]*\))/)) {
        shadows.total++;
        const rec = { tag: el.tagName.toLowerCase(), cls: (el.className || '').toString().slice(0, 28), v: norm(part) };
        if (/inset/.test(part)) shadows.inset.push(rec); else shadows.outer.push(rec);
      }
    }
  }
  const filters = {};
  for (const el of all) {
    const f = getComputedStyle(el).filter;
    if (f && f !== 'none') filters[f] = (filters[f] || 0) + 1;
  }

  /* ---------- images ---------- */
  const imgs = Array.from(document.images).map((im) => {
    const r = im.getBoundingClientRect();
    const cs = getComputedStyle(im);
    return {
      src: im.getAttribute('src'),
      box: Math.round(r.width) + 'x' + Math.round(r.height),
      attr: im.getAttribute('width') + 'x' + im.getAttribute('height'),
      natural: im.naturalWidth + 'x' + im.naturalHeight,
      loaded: im.complete && im.naturalWidth > 0,
      visible: r.width > 1 && r.height > 1 && cs.display !== 'none' && cs.visibility !== 'hidden',
      inAriaHidden: !!im.closest('[aria-hidden="true"]'),
    };
  });

  /* ---------- borders / strokes ---------- */
  const borderWidths = {};
  for (const el of all) {
    const cs = getComputedStyle(el);
    for (const s of ['Top', 'Right', 'Bottom', 'Left', 'Width']) {
      const key = s === 'Width' ? 'outlineWidth' : 'border' + s + 'Width';
      const styleKey = s === 'Width' ? 'outlineStyle' : 'border' + s + 'Style';
      if (getComputedStyle(el)[styleKey] === 'none') continue; // computed width defaults to medium(3px) even when there is no border
      const wv = parseFloat(getComputedStyle(el)[key]);
      if (wv > 0) borderWidths[getComputedStyle(el)[key]] = (borderWidths[getComputedStyle(el)[key]] || 0) + 1;
    }
    const crule = getComputedStyle(el).columnRuleWidth;
    if (crule && getComputedStyle(el).columnRuleStyle !== 'none' && parseFloat(crule) > 0) borderWidths['column-rule:' + crule] = (borderWidths['column-rule:' + crule] || 0) + 1;
  }
  const strokeWidths = {};
  for (const n of document.querySelectorAll('svg *')) {
    const cs = getComputedStyle(n);
    if (cs.stroke && cs.stroke !== 'none') strokeWidths[cs.strokeWidth] = (strokeWidths[cs.strokeWidth] || 0) + 1;
  }
  const pseudo = [];
  for (const el of all) {
    for (const pe of ['::before', '::after']) {
      const cs = getComputedStyle(el, pe);
      if (cs.content && cs.content !== 'none' && cs.content !== 'normal') {
        pseudo.push({ tag: el.tagName.toLowerCase(), cls: (el.className || '').toString().slice(0, 20), pe, h: cs.height, w: cs.width, border: cs.borderTopWidth, bg: cs.backgroundColor });
      }
    }
  }

  /* ---------- structure / counts ---------- */
  const counts = {};
  for (const sel of ['.entry', '.item', '.cut', '.row', '.plate', 'figure', 'article', 'section', 'li', 'img']) counts[sel] = document.querySelectorAll(sel).length;
  counts['front-only entries'] = document.querySelectorAll('.right .entry, .item, .cut').length;
  counts['aria-hidden text clones'] = document.querySelectorAll('[aria-hidden="true"] .entry').length;
  const labels = Array.from(document.querySelectorAll('.entry .no, .item .n, .cut .hd .no, .index b')).map((el) => norm(el.textContent));
  const nums = labels.map((s) => parseInt((s.match(/\d+/) || [])[0], 10)).filter((n) => !isNaN(n));

  /* ---------- degeneracy checks ---------- */
  const txt = document.body.innerText;
  const emoji = txt.match(/[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/gu) || [];
  const textShadow = [];
  for (const el of all) {
    const cs = getComputedStyle(el);
    if (cs.textShadow && cs.textShadow !== 'none') textShadow.push({ tag: el.tagName.toLowerCase(), v: norm(cs.textShadow).slice(0, 60) });
  }
  const glass = [];
  for (const el of all) {
    const cs = getComputedStyle(el);
    const bf = cs.backdropFilter || cs.webkitBackdropFilter;
    if (bf && bf !== 'none') glass.push({ tag: el.tagName.toLowerCase(), v: bf });
    const m = (cs.backgroundColor || '').match(/rgba\(([^)]+)\)/);
    if (m) {
      const a = parseFloat(m[1].split(',')[3]);
      if (a > 0 && a < 1) glass.push({ tag: el.tagName.toLowerCase(), translucentBg: cs.backgroundColor });
    }
  }
  const anims = document.getAnimations ? document.getAnimations().map((a) => (a.animationName || 'anim') + '@' + a.playState) : [];
  const cssAnimNamed = Array.from(document.styleSheets).flatMap((sh) => { try { return Array.from(sh.cssRules).map((r) => r.cssText).filter((t) => /@keyframes|animation:|transform:|transition:/.test(t)); } catch (e) { return []; } });
  const transitions = [];
  for (const el of all) {
    const cs = getComputedStyle(el);
    if (cs.transition && cs.transition !== 'all 0s ease 0s' && cs.transitionProperty !== 'none') transitions.push(cs.transition.split(',')[0].slice(0, 40));
  }
  const ctaButtons = Array.from(document.querySelectorAll('a,button')).filter((el) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return cs.display !== 'none' && r.width > 50 && r.height > 24;
  }).map((el) => ({ text: norm(el.textContent).slice(0, 16), w: Math.round(el.getBoundingClientRect().width), top: Math.round(el.getBoundingClientRect().top + window.scrollY), bg: getComputedStyle(el).backgroundColor }));

  /* ---------- layout metrics ---------- */
  const layout = {
    docHeight: document.documentElement.scrollHeight,
    docWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    columnsOfCatalog: (() => { const c = document.querySelector('.right, .catalog, #catalog'); return c ? getComputedStyle(c).columnCount : null; })(),
    resentable: null,
  };
  const h1r = h1 ? h1.getBoundingClientRect() : null;
  layout.h1 = h1r ? { x: Math.round(h1r.x), w: Math.round(h1r.width), align: getComputedStyle(h1).textAlign } : null;

  /* ---------- signature-action measurements ---------- */
  const sig = {};
  const cs1 = (sel, prop) => { const el = document.querySelector(sel); return el ? getComputedStyle(el)[prop] : null; };
  const rect1 = (sel) => { const el = document.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y + window.scrollY), w: Math.round(r.width), h: Math.round(r.height) }; };
  sig.verso = { cols: cs1('.verso', 'columnCount'), ruleW: cs1('.verso', 'columnRuleWidth'), opacity: cs1('.verso', 'opacity'), transform: cs1('.verso', 'transform'), fontSize: cs1('.verso', 'fontSize') };
  sig.catalog = { cols: cs1('.right', 'columnCount'), ruleW: cs1('.right', 'columnRuleWidth') };
  sig.folio = Array.from(document.querySelectorAll('.folio')).map((el) => { const c = getComputedStyle(el); const r = el.getBoundingClientRect(); return { writingMode: c.writingMode, lineHeight: c.lineHeight, w: Math.round(r.width), h: Math.round(r.height), text: norm(el.textContent) }; });
  sig.band = rect1('.band');
  sig.bandClip = cs1('.band', 'clipPath');
  sig.lowerTransform = cs1('.lower', 'transform');
  sig.h1Skew = Array.from(document.querySelectorAll('h1 .cut')).map((el) => getComputedStyle(el).transform);
  sig.topAfter = (() => { const el = document.querySelector('.top'); if (!el) return null; const c = getComputedStyle(el, '::after'); return { h: c.height, opacity: c.opacity, transform: c.transform, bg: c.backgroundColor }; })();
  sig.notch = Array.from(document.querySelectorAll('.notch')).map((el) => { const r = el.getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); });
  sig.index = { rect: rect1('.index'), width: cs1('.index', 'width'), firstCutY: rect1('.cut'), position: cs1('.index', 'position') };
  sig.scratches = Array.from(document.querySelectorAll('.scratch i')).slice(0, 5).map((el) => { const c = getComputedStyle(el); return { w: c.width, transform: c.transform }; });
  sig.layerBorders = Array.from(document.querySelectorAll('.layer')).slice(0, 3).map((el) => getComputedStyle(el).borderBottomWidth + ' ' + getComputedStyle(el).borderBottomColor);
  sig.layerCounts = Array.from(document.querySelectorAll('.cut')).map((el) => el.querySelectorAll('.layer').length);
  sig.rowSizes = Array.from(document.querySelectorAll('.row')).map((el) => el.querySelectorAll('.cut').length);
  const headings = Array.from(document.querySelectorAll('h1,h2,h3')).slice(0, 4).map((el) => norm(el.textContent).slice(0, 40));

  return {
    title: document.title,
    colors: Array.from(colors.entries()).map(([k, v]) => ({ hex: k, on: Array.from(v).slice(0, 4) })),
    svgPaint, fonts, radius, shadows, filters, imgs,
    borderWidths, strokeWidths, pseudo: pseudo.slice(0, 12),
    counts, labels, nums, emoji, textShadow, glass, anims, transitions: Array.from(new Set(transitions)).slice(0, 6),
    ctaButtons, layout, headings, sig,
    bodyTextLen: txt.length,
  };
}
