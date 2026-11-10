// 共享测量库：所有判据的测量原语都在页面里跑，返回可复算的原始数据。
// 设计原则：原始数据先落盘（raw json），判定在 Node 侧按预先登记的阈值做 ——
// 这样「测什么」与「判多少算过」分离，避免测量时无意识地朝 PASS 调。

export const IN_PAGE = `(() => {
  const HEX = (c) => {
    if (!c) return null;
    c = String(c).trim();
    if (c === 'transparent' || c === 'none' || c === '') return null;
    if (/^url\\(/.test(c)) return null;
    if (/^rgba?\\(/.test(c)) {
      const m = c.match(/rgba?\\(([^)]+)\\)/);
      if (!m) return null;
      const p = m[1].split(',').map(s => parseFloat(s.trim()));
      if (p.length > 3 && p[3] === 0) return null;
      const [r,g,b] = p;
      return '#' + [r,g,b].map(v => Math.round(v).toString(16).padStart(2,'0')).join('').toUpperCase();
    }
    if (c[0] === '#') {
      let h = c.slice(1);
      if (h.length === 3) h = h.split('').map(x => x + x).join('');
      return '#' + h.toUpperCase();
    }
    return c.toUpperCase();
  };

  const all = [...document.querySelectorAll('*')];
  const inViewportish = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  const colors = [];
  const pushColor = (el, where, val) => {
    const h = HEX(val);
    if (h === null) return;
    if (h === 'TRANSPARENT') return;
    colors.push({ el: tagPath(el), where, raw: String(val), hex: h });
  };

  const tagPath = (el) => {
    let p = el.tagName.toLowerCase();
    if (el.id) p += '#' + el.id;
    if (el.classList && el.classList.length) p += '.' + [...el.classList].slice(0,2).join('.');
    return p;
  };

  const fontSets = [];
  const radii = [];
  const shadows = [];
  const borderW = [];
  const filters = [];
  const fontStacks = [];

  for (const el of all) {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    /* 只收「会绘制」的元素：head 内的 meta/title/style/script 不渲染，但它们的
     * computed color 仍是 UA 默认黑 —— 第一版把它们算进色板，产生 6 个假 #000000。
     * 这是测量仪器 bug（归因 d），不是页面用了黑色。 */
    const isHead = !!el.closest('head');
    const renders = !isHead && r.width > 0 && r.height > 0;

    // ── 颜色 ──
    /* 只收「真的会画出一个颜色」的元素：
     *   (a) 自己有直接文本节点 → 它的 color 会画出来；
     *   (b) 背景非透明；
     *   (c) border/outline 宽度 > 0 且 style 不是 none；
     *   (d) SVG 且**显式**写了 fill/stroke。
     * 前两版没有这层过滤，把 html/meta/style 的 UA 默认 rgb(0,0,0) 当成页面用色，
     * 产生 164 / 6 / 1 个假 #000000。这是测量仪器 bug（归因 d），不是页面用了黑色。
     * 判据 M2 的阈值一个字没改，只修仪器。 */
    const hasOwnText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
    if (renders && hasOwnText) pushColor(el, 'color', cs.color);
    if (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)') pushColor(el, 'bg', cs.backgroundColor);
    for (const side of ['Top','Right','Bottom','Left']) {
      const w = parseFloat(cs['border' + side + 'Width']) || 0;
      const st = cs['border' + side + 'Style'];
      if (w > 0 && st !== 'none' && st !== 'hidden') pushColor(el, 'border' + side, cs['border' + side + 'Color']);
    }
    if (cs.outlineStyle !== 'none' && (parseFloat(cs.outlineWidth) || 0) > 0) pushColor(el, 'outline', cs.outlineColor);
    /* fill/stroke 只对 SVG 且**显式设置过**的元素收 —— HTML 元素上 cs.fill 默认是
     * rgb(0,0,0)（UA 默认值），它并不绘制任何东西。第一版没排掉，产生 164 个假 #000000。
     * 这是测量仪器的 bug，属归因 (d)，不改判据阈值，只在 REPORT 里记明。 */
    if (el instanceof SVGElement) {
      const explicitFill = el.getAttribute('fill') || (el.style && el.style.fill) || '';
      const explicitStroke = el.getAttribute('stroke') || (el.style && el.style.stroke) || '';
      if (explicitFill && explicitFill !== 'none') pushColor(el, 'fill', cs.fill);
      if (explicitStroke && explicitStroke !== 'none') pushColor(el, 'stroke', cs.stroke);
    }

    // ── 圆角 ──
    const rr = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius]
      .map(v => parseFloat(v) || 0);
    if (rr.some(v => v !== 0)) radii.push({ el: tagPath(el), radii: rr });

    // ── 阴影 ──
    if (cs.boxShadow && cs.boxShadow !== 'none') {
      const insetCount = (cs.boxShadow.match(/inset/g) || []).length;
      shadows.push({ kind: 'box', el: tagPath(el), value: cs.boxShadow, insets: insetCount });
    }
    if (cs.textShadow && cs.textShadow !== 'none') {
      shadows.push({ kind: 'text', el: tagPath(el), value: cs.textShadow });
    }
    if (cs.filter && cs.filter !== 'none') {
      filters.push({ el: tagPath(el), value: cs.filter });
      if (/drop-shadow/.test(cs.filter)) shadows.push({ kind: 'drop', el: tagPath(el), value: cs.filter });
    }

    // ── 线宽 ──
    for (const side of ['Top','Right','Bottom','Left']) {
      const w = parseFloat(cs['border' + side + 'Width']) || 0;
      if (w > 0) borderW.push({ el: tagPath(el), side, w });
    }
    if (cs.outlineStyle !== 'none') {
      const w = parseFloat(cs.outlineWidth) || 0;
      if (w > 0) borderW.push({ el: tagPath(el), side: 'outline', w });
    }
    // SVG stroke-width
    if (el instanceof SVGElement) {
      const sw = el.getAttribute('stroke-width');
      const csw = cs.strokeWidth;
      if (sw !== null || (csw && csw !== 'none')) {
        const v = parseFloat(sw !== null ? sw : csw);
        if (!isNaN(v) && v > 0) borderW.push({ el: tagPath(el), side: 'stroke', w: v, attr: sw });
      }
    }

    // ── 字体 ──
    if (r.width > 0 && r.height > 0 && el.childNodes.length) {
      const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 0);
      if (hasText) {
        fontStacks.push({ el: tagPath(el), family: cs.fontFamily, size: cs.fontSize, numeric: cs.fontVariantNumeric });
      }
    }
  }

  // 颜色去重统计
  const colorCount = {};
  for (const c of colors) colorCount[c.hex] = (colorCount[c.hex] || 0) + 1;

  // 线宽集合（按 1/64 归一，去浮点噪声）
  const round64 = (v) => Math.round(v * 64) / 64;
  const bwSet = [...new Set(borderW.map(b => round64(b.w)))].sort((a,b) => a-b);

  // ── 图片 ──
  const imgs = [...document.querySelectorAll('img')].map(img => {
    const r = img.getBoundingClientRect();
    return {
      src: img.getAttribute('src'),
      w: +r.width.toFixed(2), h: +r.height.toFixed(2),
      natW: img.naturalWidth, natH: img.naturalHeight,
      attrW: img.getAttribute('width'), attrH: img.getAttribute('height'),
      alt: img.getAttribute('alt') || '',
      complete: img.complete,
    };
  });

  // ── 关键元素的 computed ──
  const pick = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      sel,
      family: cs.fontFamily, size: cs.fontSize, weight: cs.fontWeight,
      bg: cs.backgroundColor, color: cs.color,
      radius: cs.borderRadius, shadow: cs.boxShadow, filter: cs.filter,
      padding: cs.padding, gap: cs.columnGap, display: cs.display,
      gridCols: cs.gridTemplateColumns, gridRows: cs.gridTemplateRows,
      w: +r.width.toFixed(2), h: +r.height.toFixed(2),
      x: +r.x.toFixed(2), y: +r.y.toFixed(2),
    };
  };

  // ── 重复单元计数（由选择器指定）──
  const count = (sel) => document.querySelectorAll(sel).length;

  // ── 横向并排检测（移动端单列判据）──
  const rowClusters = (rootSel) => {
    const root = document.querySelector(rootSel);
    if (!root) return null;
    const kids = [...root.children].filter(k => {
      const r = k.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    const rows = {};
    for (const k of kids) {
      const r = k.getBoundingClientRect();
      const key = Math.round(r.y / 4) * 4;
      (rows[key] = rows[key] || []).push({ y: +r.y.toFixed(1), h: +r.height.toFixed(1), w: +r.width.toFixed(1), x: +r.x.toFixed(1) });
    }
    const maxPerRow = Math.max(1, ...Object.values(rows).map(v => v.length));
    return { kids: kids.length, maxPerRow, rows: Object.values(rows) };
  };

  // ── SVG 内所有 stroke-width ──
  const svgStrokes = [...document.querySelectorAll('svg *')].map(el => {
    const v = el.getAttribute('stroke-width');
    return v === null ? null : parseFloat(v);
  }).filter(v => v !== null && !isNaN(v) && v > 0);

  // ── repeating pattern 周期 ──
  const patterns = [...document.querySelectorAll('pattern')].map(p => ({
    id: p.id, w: p.getAttribute('width'), h: p.getAttribute('height'),
    units: p.getAttribute('patternUnits'),
    strokes: [...p.querySelectorAll('path,line,rect')].map(x => x.getAttribute('stroke-width')),
  }));

  // ── 横向并排检测（「移动端单列」判据）──
  /* 严格按 JUDGE-S20 M20 预登记的措辞实现：
   *   「同一水平线上有 ≥2 个块级兄弟且各占 >30% 视口宽」
   * 做法：对每个父元素，把直接子元素按 y 聚成行，行内统计 width > 0.3*innerWidth 的个数，
   * 取全文档最大值。maxSideBySide >= 2 即判为「并排」= 违反单列。
   * 第一版 judge.mjs 用了 perRow >= 1（恒真），是判据实现写松了，不是阈值改了。 */
  const sideBySide = (() => {
    const vw = innerWidth;
    let worst = { count: 0, parent: null, widths: [] };
    for (const el of all) {
      const kids = [...el.children].filter((k) => {
        /* 排除 SVG 内部元素（rect/path…）：它们不是「块级兄弟」，
         * 而且多个 rect 常常叠在同一 y 上，会被误判成并排。
         * 第一版没排掉，S20 的 .canvas 里两个 276 宽的 rect 被算成 2 个并排块。 */
        if (k instanceof SVGElement || k.closest('svg')) return false;
        const st = getComputedStyle(k);
        const r = k.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && st.position !== 'absolute' && st.position !== 'fixed';
      });
      if (kids.length < 2) continue;
      const rows = {};
      for (const k of kids) {
        const r = k.getBoundingClientRect();
        const key = Math.round(r.y / 4) * 4;
        (rows[key] = rows[key] || []).push(r.width);
      }
      for (const key of Object.keys(rows)) {
        const wide = rows[key].filter((w) => w > vw * 0.3);
        if (wide.length > worst.count) {
          worst = { count: wide.length, parent: tagPath(el), widths: wide.map((w) => +w.toFixed(1)) };
        }
      }
    }
    return worst;
  })();

  const bgImages = all.map(el => ({ el: tagPath(el), bg: getComputedStyle(el).backgroundImage }))
    .filter(x => x.bg && x.bg !== 'none');

  return {
    url: location.href,
    viewport: { w: innerWidth, h: innerHeight, dpr: devicePixelRatio },
    docH: document.documentElement.scrollHeight,
    utf8: document.characterSet,
    bodyBg: getComputedStyle(document.body).backgroundColor,
    htmlBg: getComputedStyle(document.documentElement).backgroundColor,
    colorCount,
    colorSamples: colors.slice(0, 400),
    radii,
    shadows,
    filters,
    bwSet,
    bwDetail: borderW.slice(0, 300),
    svgStrokes: [...new Set(svgStrokes)].sort((a,b)=>a-b),
    patterns,
    bgImages: bgImages.slice(0, 40),
    imgs,
    sideBySide,
    fontStacks: [...new Map(fontStacks.map(f => [f.family + '|' + f.size, f])).values()],
    h1: pick('h1'), body: pick('body'),
    table: pick('table'),
    fontsReady: document.fonts ? document.fonts.status : 'n/a',
    loadedFonts: document.fonts ? [...document.fonts].map(f => f.family + ' ' + f.weight + ' ' + f.status) : [],
  };
})()`;

// 段落/结构几何：按选择器批量取 boundingBox
export const GEO = `((sels) => {
  const out = {};
  for (const s of sels) {
    out[s] = [...document.querySelectorAll(s)].map(el => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        w: +r.width.toFixed(2), h: +r.height.toFixed(2),
        x: +r.x.toFixed(2), y: +r.y.toFixed(2),
        cs: {
          clip: cs.clipPath, transform: cs.transform, padding: cs.padding,
          margin: cs.margin, gridCols: cs.gridTemplateColumns,
          gridColumn: cs.gridColumn, gap: cs.columnGap,
          writingMode: cs.writingMode, filter: cs.filter,
          bg: cs.backgroundColor, family: cs.fontFamily,
        },
      };
    });
  }
  return out;
})`;
