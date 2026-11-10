// In-page probes. Each export is a self-contained function (serialised by CDP Runtime.evaluate),
// so it must not close over anything outside its own body.

// Measures the detail panel the way a user experiences it.
export function probePanel() {
  const detail = document.getElementById('detail');
  const head = document.querySelector('.detail-head');
  const dRect = detail.getBoundingClientRect();
  const st = detail.scrollTop;
  const headH = head ? head.getBoundingClientRect().height : 0;
  const clientH = detail.clientHeight;
  const clientW = detail.clientWidth;
  const contentH = detail.scrollHeight;

  const box = (el) => {
    const r = el.getBoundingClientRect();
    return {
      top: +(r.top - dRect.top + st).toFixed(1),
      bottom: +(r.bottom - dRect.top + st).toFixed(1),
      h: +r.height.toFixed(1),
    };
  };

  // counts non-space glyphs whose boxes intersect the band [bandTop, bandBottom] of the panel viewport
  function charsIn(el, bandTop, bandBottom) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let total = 0, inBand = 0;
    const range = document.createRange();
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const text = node.nodeValue || '';
      for (let i = 0; i < text.length; i++) {
        if (!/\S/.test(text[i])) continue;
        total++;
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        const r = range.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue; // not rendered (hidden ancestor)
        const top = r.top - dRect.top, bottom = r.bottom - dRect.top;
        if (bottom > bandTop && top < bandBottom) inBand++;
      }
    }
    return { total, inBand };
  }

  const fields = [...document.querySelectorAll('#d-body .field')].map((el, i) => {
    const b = box(el);
    const dt = el.querySelector('dt'), dd = el.querySelector('dd');
    const cs = dd ? getComputedStyle(dd) : null;
    const lh = cs ? parseFloat(cs.lineHeight) || 0 : 0;
    const ddH = dd ? dd.getBoundingClientRect().height : 0;
    const c = charsIn(dd || el, 0, 1e9);
    const rendered = b.h > 0;
    const overlap = Math.max(0, Math.min(b.bottom, clientH) - Math.max(b.top, headH));
    return {
      i,
      label: dt ? dt.textContent.trim() : '',
      rendered,
      top: b.top, bottom: b.bottom, height: b.h,
      ddHeight: +ddH.toFixed(1),
      lineHeight: +lh.toFixed(1),
      lines: lh && ddH ? Math.round(ddH / lh) : null,
      chars: c.total,
      charsInFirstScreen: charsIn(dd || el, headH, clientH).inBand,
      visibleInFirstScreen: +overlap.toFixed(1),
      visibility: !rendered ? 'hidden'
        : b.top >= headH && b.bottom <= clientH ? 'full'
          : (b.bottom > headH && b.top < clientH ? 'partial' : 'none'),
      inOpenGroup: !el.closest('details') || !!el.closest('details').open,
    };
  });

  // every block that occupies vertical space in the panel, in document order
  const blocks = [...document.querySelectorAll('#d-body > *, #d-body .lab-groups > *, #d-body .lab-d > .lab-pane')]
    .filter((el) => el.offsetHeight > 0)
    .map((el) => {
      const b = box(el);
      return {
        cls: (el.className || el.tagName).toString().split(' ').slice(0, 2).join('.'),
        tag: el.tagName.toLowerCase(), top: b.top, bottom: b.bottom, h: b.h,
      };
    });

  // ── what a user can *name* while sitting on the first screen ──
  const nameEls = [
    ...document.querySelectorAll('#d-body .field > dt'),
    ...document.querySelectorAll('#d-body summary .lab-grp-t'),
    ...document.querySelectorAll('#d-body summary .lab-grp-l'),
    ...document.querySelectorAll('#d-body .lab-nav button'),
    ...document.querySelectorAll('#d-body .lab-tabs button'),
  ];
  const namesInFirstScreen = nameEls.filter((el) => {
    const r = el.getBoundingClientRect();
    if (r.height === 0) return false;
    const top = r.top - dRect.top, bottom = r.bottom - dRect.top;
    return bottom > headH && top < clientH;
  }).map((el) => el.textContent.trim().replace(/\s+/g, ' ').slice(0, 80));

  // ── affordances that already exist in the panel (before any variant patch) ──
  const q = (s) => [...detail.querySelectorAll(s)];
  const affordances = {
    details: q('details').length,
    detailsOpen: q('details[open]').length,
    summary: q('summary').length,
    ariaExpanded: q('[aria-expanded]').length,
    ariaControls: q('[aria-controls]').length,
    roleTab: q('[role="tab"]').length,
    anchorLinks: q('a[href^="#"]').length,
    navs: q('nav').length,
    headed: q('h3,h4,h5').length,
  };

  const last = fields.filter((f) => f.rendered).slice(-1)[0] || fields[fields.length - 1];
  const step = clientH - headH;
  const bottomMost = Math.max(...fields.filter((f) => f.rendered).map((f) => f.bottom), 0);

  return {
    viewport: { w: innerWidth, h: innerHeight, dpr: devicePixelRatio },
    panel: {
      rect: { x: +dRect.x.toFixed(1), w: +dRect.width.toFixed(1), h: +dRect.height.toFixed(1) },
      clientW, clientH, contentH, headH: +headH.toFixed(1),
      overflowY: getComputedStyle(detail).overflowY,
      panelOverflowX: detail.scrollWidth - detail.clientWidth,
      docOverflowX: document.documentElement.scrollWidth - innerWidth,
      bodyOverflowX: document.body.scrollWidth - innerWidth,
    },
    bands: { firstScreen: [0, clientH], underHead: [headH, clientH] },
    blocks,
    fields,
    namesInFirstScreen,
    affordances,
    scroll: {
      maxScroll: contentH - clientH,
      screens: +(contentH / clientH).toFixed(2),
      stepsToLastField: Math.max(0, Math.ceil((bottomMost - clientH) / step)),
      wheelNotches100: Math.ceil((contentH - clientH) / 100),
      bottomMostField: +bottomMost.toFixed(1),
      lastRenderedField: last ? last.label : null,
    },
    totals: {
      fieldChars: fields.reduce((a, f) => a + f.chars, 0),
      charsInFirstScreen: fields.reduce((a, f) => a + f.charsInFirstScreen, 0),
      fieldHeight: +fields.reduce((a, f) => a + f.height, 0).toFixed(1),
      renderedFields: fields.filter((f) => f.rendered).length,
      fullInFirstScreen: fields.filter((f) => f.visibility === 'full').length,
      partialInFirstScreen: fields.filter((f) => f.visibility === 'partial').length,
    },
  };
}

// Costs that only exist once a variant is on the page: how many clicks/scrolls to actually
// reach the deepest text, and whether folding survives 390px.
export function probeVariantExtra() {
  const detail = document.getElementById('detail');
  const closed = [...detail.querySelectorAll('details')].filter((d) => !d.open);
  const tabs = [...detail.querySelectorAll('.lab-tabs button')];
  const nav = detail.querySelector('.lab-nav');
  const navRect = nav ? nav.getBoundingClientRect() : null;

  const before = detail.scrollHeight;

  // fully expand, then measure the same panel again — proves folding hides nothing
  const opened = [];
  closed.forEach((d) => { opened.push(d); d.open = true; });
  const allOpenH = detail.scrollHeight;
  opened.forEach((d) => { d.open = false; });

  // horizontal overflow introduced by the variant chrome at narrow widths
  const wideEls = [...detail.querySelectorAll('.lab-nav, .lab-tabs, .lab-grp > summary, .lab-brief dl > div')]
    .map((el) => ({ cls: (el.className || '').toString(), sw: el.scrollWidth, cw: el.clientWidth }))
    .filter((x) => x.sw > x.cw + 1);

  return {
    collapsedCount: closed.filter((d) => d.querySelector('.field')).length,
    collapsedViewers: closed.filter((d) => d.querySelector('.viewer')).length,
    tabs: tabs.length,
    tabsWrapped: navRect ? navRect.height : 0,
    clicksToRevealAllFields: closed.filter((d) => d.querySelector('.field')).length + Math.max(0, tabs.length - 1),
    panelHeightClosed: before,
    panelHeightAllOpen: allOpenH,
    foldedFieldNames: closed.filter((d) => d.querySelector('.field'))
      .map((d) => [...d.querySelectorAll('.field > dt')].map((x) => x.textContent.trim())),
    overflowingChrome: wideEls,
  };
}
