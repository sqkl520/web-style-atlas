// 页面内颜色收集器。作为字符串注入，依赖 inpage.mjs 的 window.__M 原语。
//
// 每条规则都对应一个已知误报来源（保留注释，因为「为什么这么写」才是可复核的部分）：
//  1) color 只归给「直系含文本节点」的元素 —— 否则继承色会被整页容器按整页面积重复计，
//     一次 body{color} 就能把墨色算成 100% 面积。
//  2) 文字色面积用 Range 逐文本节点取墨迹矩形，不用元素盒子。行高 1.75 会让盒子面积翻倍。
//  3) 边框/描边面积用「边长×线宽」，不用盒子面积 —— 否则 1px 细线会被算成整块。
//  4) 伪元素面积用 getComputedStyle(el,'::before').width/height（Chrome 给 used value）。
//  5) fill/stroke 可能是 url(#grad)：解析 stop-color；presentation attr 与 computed 都读。
//  6) <use> 实例树在 shadow 里选不到 —— 由像素直方图兜底，这里显式记 useInternalUnknown。
//  7) currentColor 解析成元素自身 color，不再当成 #000000。
//  8) 位图（img / background-image url）覆盖的矩形单独输出，供像素分析挖洞。
export const COLLECT = String.raw`
(function () {
  const M = window.__M;
  const rec = new Map();
  function add(hex, meta) {
    let e = rec.get(hex);
    if (!e) {
      e = { hex: hex, count: 0, area: 0, areaElement: 0, areaInk: 0, props: {}, tags: {},
            roles: {}, onBodyText: 0, samples: [], areaBasis: {} };
      rec.set(hex, e);
    }
    e.count++;
    e.area += meta.area || 0;
    if (meta.areaElement) e.areaElement += meta.areaElement;
    if (meta.areaInk) e.areaInk += meta.areaInk;
    e.props[meta.prop] = (e.props[meta.prop] || 0) + 1;
    const t = meta.tag || '?';
    e.tags[t] = (e.tags[t] || 0) + 1;
    e.roles[meta.role] = (e.roles[meta.role] || 0) + 1;
    e.areaBasis[meta.basis || 'rect'] = (e.areaBasis[meta.basis || 'rect'] || 0) + 1;
    if (meta.onBodyText) e.onBodyText++;
    if (e.samples.length < 4 && meta.sample) e.samples.push(meta.sample);
    return e;
  }
  function keep(c, ctxColor) {
    if (!c) return null;
    if (c.currentColor) return ctxColor ? keep(ctxColor) : null;
    if (c.unparsed) return null;
    if (c.none) return null;
    if (c.a === 0) return null;
    return c;
  }
  const PERIM = (r) => 2 * (r.w + r.h);
  const svgTags = { svg: 1, path: 1, rect: 1, circle: 1, line: 1, polygon: 1, polyline: 1, g: 1,
                    text: 1, use: 1, ellipse: 1, symbol: 1, defs: 1, tspan: 1 };

  const els = [document.documentElement, document.body].concat(Array.prototype.slice.call(document.querySelectorAll('*')));
  const seen = new Set();
  const rasterRects = [];
  const texelRects = [];
  let useInternalUnknown = 0;

  for (const el of els) {
    if (!el || seen.has(el)) continue;
    seen.add(el);
    const tag = el.tagName.toLowerCase();
    if (tag === 'symbol' || tag === 'defs' || tag === 'lineargradient' || tag === 'radialgradient' || tag === 'stop' || tag === 'clippath' || tag === 'mask' || tag === 'pattern' || tag === 'marker' || tag === 'filter') continue;
    if (M.rasterKind && el.closest && el.closest('symbol,defs,clipPath,mask,pattern,marker')) continue;
    if (!M.vis(el)) continue;
    const cs = getComputedStyle(el);
    const r = M.rect(el);
    const own = M.ownText(el);
    const isBodyText = own.chars >= 20;
    const role = isBodyText ? 'body-text' : (own.chars > 0 ? 'label-text' : 'graphic');
    const sample = (own.text || '').slice(0, 46);
    const dpath = M.path(el);
    const selfColor = keep(M.norm(cs.color));
    const ink = own.chars > 0 ? M.textRects(el) : [];
    const inkArea = ink.reduce(function (s, q) { return s + q.w * q.h; }, 0);
    const isSvg = (el.namespaceURI === M.SVGNS);

    const rk = M.rasterKind(el);
    if (rk === 'photo') rasterRects.push(r);
    if (rk === 'texel') texelRects.push(Object.assign({}, r, { tag: tag, cls: (el.getAttribute('class') || '').slice(0, 30) }));
    if (tag === 'use') { /* use 内部由像素级兜底，见 useInternalUnknown 统计 */ }

    // ---- 1. 文字色（只认直系含文本的元素）
    if (own.chars > 0 && selfColor && selfColor.hex) {
      add(selfColor.hex, { prop: 'color', tag: tag, role: role, area: inkArea || r.area,
        areaElement: r.area, areaInk: inkArea, basis: inkArea ? 'ink' : 'rect',
        onBodyText: isBodyText, sample: dpath + ' "' + sample + '"' });
    }
    // ---- 2. 背景色
    const bgc = keep(M.norm(cs.backgroundColor), selfColor);
    if (bgc && bgc.hex) add(bgc.hex, { prop: 'backgroundColor', tag: tag, role: 'graphic', area: r.area,
      areaElement: r.area, basis: 'rect', sample: dpath });
    // ---- 3. 四边边框
    const sides = [['borderTopColor', 'borderTopWidth', 'border-top'], ['borderRightColor', 'borderRightWidth', 'border-right'],
                   ['borderBottomColor', 'borderBottomWidth', 'border-bottom'], ['borderLeftColor', 'borderLeftWidth', 'border-left']];
    for (const s of sides) {
      const w = parseFloat(cs[s[1]] || '0');
      if (!(w > 0) || cs[s[1] + ''].indexOf('none') === 0) continue;
      const c = keep(M.norm(cs[s[0]]), selfColor);
      if (!c || !c.hex) continue;
      const edge = (s[2] === 'border-top' || s[2] === 'border-bottom') ? r.w : r.h;
      add(c.hex, { prop: s[0], tag: tag, role: 'graphic', area: edge * w, areaElement: 0,
        basis: 'perimeter', sample: dpath + ' ' + s[2] + ' ' + w + 'px' });
    }
    // ---- 4. 轮廓
    const ow = parseFloat(cs.outlineWidth || '0');
    if (ow > 0 && cs.outlineStyle !== 'none') {
      const c = keep(M.norm(cs.outlineColor), selfColor);
      if (c && c.hex) add(c.hex, { prop: 'outlineColor', tag: tag, role: 'graphic', area: PERIM(r) * ow,
        basis: 'perimeter', sample: dpath });
    }
    // ---- 5. 文本装饰
    if (cs.textDecorationLine && cs.textDecorationLine !== 'none') {
      const c = keep(M.norm(cs.textDecorationColor), selfColor);
      if (c && c.hex) add(c.hex, { prop: 'textDecorationColor', tag: tag, role: 'graphic',
        area: inkArea * 0.12 || r.area * 0.02, basis: 'ink', sample: dpath });
    }
    // ---- 6. caretColor（面积 0：静态渲染不可见，只作存在性记录）
    if (tag === 'input' || tag === 'textarea' || el.isContentEditable) {
      const c = keep(M.norm(cs.caretColor), selfColor);
      if (c && c.hex) add(c.hex, { prop: 'caretColor', tag: tag, role: 'graphic', area: 0, basis: 'none', sample: dpath });
    }
    // ---- 7. 渐变
    for (const gk of ['backgroundImage', 'maskImage', 'borderImageSource']) {
      const gi = cs[gk] || '';
      if (gi.indexOf('gradient') < 0) continue;
      const stops = [];
      const re = /(rgba?\([^)]*\)|#[0-9a-fA-F]{3,8}|(?:oklch|oklab|lab|lch|hsl|hsla|color)\([^)]*\))/g;
      let m;
      while ((m = re.exec(gi))) {
        const c = keep(M.norm(m[1]), selfColor);
        if (c && c.hex) stops.push(c.hex);
      }
      const uniq = stops.filter(function (v, i, a) { return a.indexOf(v) === i; });
      if (!uniq.length) continue;
      for (const hx of uniq) {
        add(hx, { prop: gk, tag: tag, role: 'graphic', area: r.area / uniq.length, areaElement: 0,
          basis: 'gradient-share', sample: dpath + ' gradient(' + uniq.length + ')' });
      }
    }
    // ---- 8. boxShadow
    const bs = cs.boxShadow;
    if (bs && bs !== 'none') {
      for (const one of M.parseShadows(bs)) {
        const cm = one.match(/(rgba?\([^)]*\)|#[0-9a-fA-F]{3,8}|oklch\([^)]*\)|color\([^)]*\))/);
        if (!cm) continue;
        const c = keep(M.norm(cm[1]), selfColor);
        if (c && c.hex) add(c.hex, { prop: 'boxShadow', tag: tag, role: 'graphic', area: 0, basis: 'shadow',
          sample: dpath + ' ' + one.slice(0, 40) });
      }
    }
    // ---- 9. SVG fill / stroke
    //
    // 关键：只有【叶子绘制形状】才有 fill。<svg> / <g> / <use> 的 computed fill
    // 是继承来的初始值 rgb(0,0,0)（CSS 里 fill 的 initial value 就是 black），
    // 但它们自己不画填充 —— 把它们的 bbox 当 fill 面积会凭空造出一个占屏 58% 的 #000000。
    // 实测（S19）：svg.etch 的 fill 面积被算成 58.69% 文档面积，而像素级 0 个。
    // 所以 fill 只算这些 tag；stroke 同宽（连 <line> 都算）。
    const FILL_SHAPES = { path: 1, rect: 1, circle: 1, ellipse: 1, polygon: 1, polyline: 1, line: 1, text: 1, tspan: 1, use: 1 };
    const STROKE_SHAPES = FILL_SHAPES;
    if (isSvg || svgTags[tag]) {
      for (const pk of ['fill', 'stroke']) {
        if (pk === 'fill' && !FILL_SHAPES[tag]) continue;
        if (pk === 'stroke' && !STROKE_SHAPES[tag]) continue;
        if (pk === 'fill' && tag === 'use') { useInternalUnknown++; continue; } // use 的填充由 symbol 内部决定，元素级拿不到
        const cv = cs[pk];
        const attr = el.getAttribute ? el.getAttribute(pk) : null;
        let paint = cv;
        if (paint && paint.indexOf('url(') === 0) {
          const idm = paint.match(/url\(\s*["']?#([^"')]+)/);
          if (idm) {
            const g = document.getElementById(idm[1]);
            let stopHexes = [];
            if (g) {
              const sw = g.querySelectorAll('stop');
              for (const st of sw) {
                const scc = keep(M.norm(getComputedStyle(st).stopColor || st.getAttribute('stop-color') || ''), selfColor);
                if (scc && scc.hex) stopHexes.push(scc.hex);
              }
            }
            stopHexes = stopHexes.filter(function (v, i, a) { return a.indexOf(v) === i; });
            if (stopHexes.length) {
              for (const hx of stopHexes) {
                add(hx, { prop: pk + ':gradient', tag: tag, role: 'graphic', area: r.area / stopHexes.length,
                  basis: 'gradient-share', sample: dpath + ' url(#' + idm[1] + ')' });
              }
              continue;
            }
            paint = null;
          }
        }
        if (paint && paint !== 'none') {
          const c = keep(M.norm(paint), selfColor);
          if (c && c.hex) {
            const sw = parseFloat(cs.strokeWidth || '1') || 1;
            const ink = M.svgInk(el, pk === 'stroke' ? sw : 0, pk === 'fill');
            const area = pk === 'fill' ? (ink.fillArea || r.area) : ink.strokeArea;
            add(c.hex, { prop: pk, tag: tag, role: 'graphic', area: area,
              areaElement: pk === 'fill' ? (ink.fillArea || r.area) : 0,
              basis: pk === 'fill' ? 'bbox' : 'stroke-length',
              sample: dpath + (attr ? ' [' + pk + '="' + String(attr).slice(0, 20) + '"]' : '') });
          }
        }
        if (attr && attr.indexOf('url(') < 0 && attr !== 'none') {
          const ca = keep(M.norm(attr), selfColor);
          const cp = keep(M.norm(paint), selfColor);
          if (ca && ca.hex && (!cp || cp.hex !== ca.hex)) {
            const sw2 = parseFloat(cs.strokeWidth || '1') || 1;
            const ink2 = M.svgInk(el, pk === 'stroke' ? sw2 : 0, pk === 'fill');
            add(ca.hex, { prop: pk + ':attr', tag: tag, role: 'graphic',
              area: pk === 'fill' ? ink2.fillArea * 0.5 : ink2.strokeArea * 0.5,
              basis: 'attr', sample: dpath + ' [attr ' + pk + '="' + String(attr).slice(0, 16) + '"]' });
          }
        }
      }
    }
    // ---- 10. 伪元素
    for (const pe of ['::before', '::after']) {
      const ps = getComputedStyle(el, pe);
      if (!ps) continue;
      const ct = ps.content;
      if (!ct || ct === 'none' || ct === 'normal') continue;
      let pw = parseFloat(ps.width), ph = parseFloat(ps.height);
      let pbasis = 'pseudo-box';
      if (!(pw > 0) || !(ph > 0) || ps.display === 'inline') { pw = r.w; ph = r.h; pbasis = 'host-rect'; }
      const parea = Math.max(0, pw) * Math.max(0, ph);
      const pdcs = ['color', 'backgroundColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor'];
      for (const pk of pdcs) {
        const c = keep(M.norm(ps[pk]), selfColor);
        if (!c || !c.hex) continue;
        let a2 = parea;
        if (pk.indexOf('border') === 0) {
          const wk = 'border' + pk.charAt(6).toUpperCase() + pk.slice(7).replace('Color', 'Width');
          const wv = parseFloat(ps[wk] || '0');
          if (!(wv > 0)) continue;
          a2 = (pk === 'borderTopColor' || pk === 'borderBottomColor') ? pw * wv : ph * wv;
          pbasis = 'perimeter';
        }
        add(c.hex, { prop: pk + pe, tag: tag, role: 'graphic', area: a2, basis: pbasis,
          sample: dpath + pe + ' "' + String(ct).slice(0, 18) + '"' });
      }
      if (ps.boxShadow && ps.boxShadow !== 'none') {
        for (const one of M.parseShadows(ps.boxShadow)) {
          const cm = one.match(/(rgba?\([^)]*\)|#[0-9a-fA-F]{3,8})/);
          if (!cm) continue;
          const c = keep(M.norm(cm[1]), selfColor);
          if (c && c.hex) add(c.hex, { prop: 'boxShadow' + pe, tag: tag, role: 'graphic', area: 0, basis: 'shadow',
            sample: dpath + pe + ' shadow' });
        }
      }
    }
  }

  const htmlBg = keep(M.norm(getComputedStyle(document.documentElement).backgroundColor));
  const bodyBg = keep(M.norm(getComputedStyle(document.body).backgroundColor));
  const list = [];
  rec.forEach(function (e) { list.push(e); });
  list.sort(function (a, b) { return b.area - a.area; });

  // 文字墨迹矩形（含 ±3px 膨胀），供像素分析区分「字体抗锯齿」与「真集合外色」
  const inkRects = [];
  (function () {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) {
      if (!n.nodeValue || !n.nodeValue.trim()) continue;
      const pe = n.parentElement;
      if (!pe || !M.vis(pe)) continue;
      const rg = document.createRange();
      rg.selectNodeContents(n);
      const rs = rg.getClientRects();
      for (const r of rs) if (r.width > 0 && r.height > 0) inkRects.push([r.x - 3, r.y - 3, r.x + r.width + 3, r.y + r.height + 3]);
    }
  })();
  return {
    url: location.pathname,
    viewport: { w: innerWidth, h: innerHeight, dpr: devicePixelRatio },
    docSize: { w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight },
    htmlBg: htmlBg && htmlBg.hex, bodyBg: bodyBg && bodyBg.hex,
    elementCount: els.length,
    useInternalUnknown: useInternalUnknown,
    rasterRects: rasterRects,
    texelRects: texelRects.slice(0, 40),
    inkRects: inkRects,
    colors: list,
    totalArea: document.documentElement.scrollWidth * document.documentElement.scrollHeight,
  };
})()
`;
