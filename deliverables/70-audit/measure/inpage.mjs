// 注入页面的测量原语。以字符串形式导出，探针用 eval 拼装后执行。
//
// 与第一版的差异（全部由 probe-selftest 逼出来的，见报告「自我纠错」）：
//  R1 norm(): 先按 rgb()/rgba()/#hex 文本解析，不走 canvas 往返 ——
//     canvas 对 alpha<1 的颜色做预乘再解预乘，rgba(200,30,40,.5) 会读成 199,30,40（丢 1 个色阶）。
//  R2 norm(currentColor) 显式识别，不再落到 canvas 兜底被当成 #000000。
//  R3 vis(): SVG 形状的 getBoundingClientRect 在横线/竖线上高度或宽度为 0，
//     一律按盒子过滤会把所有 1px 横线（包括 <line>、水平 path）判成不可见 —— 这是最大的一类误报源。
//  R4 svgInk(): SVG 的墨迹面积用 getBBox() + strokeWidth 估，闭合/开放路径分开处理。
export const HELPERS = String.raw`
window.__M = (function () {
  const SVGNS = 'http://www.w3.org/2000/svg';
  let cv = null, cx = null;
  function canvas() {
    if (cx) return cx;
    cv = document.createElement('canvas'); cv.width = 1; cv.height = 1;
    cx = cv.getContext('2d', { willReadFrequently: true });
    return cx;
  }
  const hx2 = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');

  // 任意 CSS 颜色 -> {hex,r,g,b,a,raw}  |  {unparsed}  |  {currentColor}
  function norm(str) {
    if (str == null) return null;
    const raw = String(str).trim();
    if (!raw) return null;
    const low = raw.toLowerCase();
    if (low === 'none') return { none: true, raw: raw };
    if (low === 'transparent') return { hex: '#000000', r: 0, g: 0, b: 0, a: 0, raw: raw, fmt: 'transparent' };
    if (low === 'currentcolor') return { currentColor: true, raw: raw };

    // R1: 文本解析 rgb/rgba（保精确通道）
    let m = raw.match(/^rgba?\(([^)]+)\)$/i);
    if (m) {
      const parts = m[1].split(/[,\/\s]+/).filter(function (s) { return s !== ''; });
      const num = (s) => (s.charAt(s.length - 1) === '%' ? parseFloat(s) * 2.55 : parseFloat(s));
      const r = num(parts[0]), g = num(parts[1]), b = num(parts[2]);
      let a = 1;
      if (parts.length >= 4) a = parts[3].charAt(parts[3].length - 1) === '%' ? parseFloat(parts[3]) / 100 : parseFloat(parts[3]);
      if ([r, g, b].some(isNaN)) return { unparsed: true, raw: raw };
      return { hex: ('#' + hx2(r) + hx2(g) + hx2(b)).toUpperCase(), r: Math.round(r), g: Math.round(g), b: Math.round(b), a: a, raw: raw, fmt: 'rgb' };
    }
    m = raw.match(/^#([0-9a-fA-F]{3,8})$/);
    if (m) {
      let h = m[1];
      if (h.length === 3 || h.length === 4) h = h.split('').map(function (c) { return c + c; }).join('');
      const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
      const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
      return { hex: ('#' + hx2(r) + hx2(g) + hx2(b)).toUpperCase(), r: r, g: g, b: b, a: a, raw: raw, fmt: 'hex' };
    }
    if (low.indexOf('url(') === 0) return { unparsed: true, raw: raw };

    // 其余（oklch / lab / color() / hsl / 命名色）交给 canvas
    const c = canvas();
    c.fillStyle = '#010203';
    c.fillStyle = raw;
    const applied = c.fillStyle;
    if (applied === '#010203' && low.indexOf('010203') < 0) return { unparsed: true, raw: raw };
    c.clearRect(0, 0, 1, 1);
    c.fillStyle = applied;
    c.fillRect(0, 0, 1, 1);
    const d = c.getImageData(0, 0, 1, 1).data;
    let a = 1;
    const am = raw.match(/\/\s*([0-9.]+)(%?)\s*\)/);
    if (am) a = parseFloat(am[1]) / (am[2] === '%' ? 100 : 1);
    else {
      const hm = raw.match(/^#([0-9a-fA-F]{4}|[0-9a-fA-F]{8})$/);
      if (hm) a = parseInt(hm[1].length === 4 ? hm[1][3] + hm[1][3] : hm[1].slice(6), 16) / 255;
    }
    return { hex: ('#' + hx2(d[0]) + hx2(d[1]) + hx2(d[2])).toUpperCase(), r: d[0], g: d[1], b: d[2], a: a, raw: raw, fmt: 'canvas:' + applied.slice(0, 18) };
  }

  function opacityChain(el) {
    let o = 1, p = el;
    while (p && p.nodeType === 1) { const v = parseFloat(getComputedStyle(p).opacity); if (!isNaN(v)) o *= v; p = p.parentElement; }
    return o;
  }
  const svgLeaf = { path: 1, rect: 1, circle: 1, line: 1, polygon: 1, polyline: 1, text: 1, ellipse: 1, use: 1, image: 1 };

  // <symbol>/<defs>/<clipPath>/<mask>/<pattern>/<marker> 里的内容**不是渲染出来的东西**，
  // 而是模板：只有被 <use href> 引用时才画，而且画在 shadow 树里。
  // 实测（probe-diag-sprite.mjs）：chrome 的 el.checkVisibility() 对这些模板子元素
  // 一律返回 true（S19/S24 的 <symbol><path> checkVis=true 但它们一个像素都不画），
  // 而 getBBox() 又会给出真实几何 —— 于是「fill 面积」被算成整页大小。
  // 这是把 #000000 抬到 58% 面积占比的直接原因。必须按祖先容器显式排除。
  const TEMPLATE = { symbol: 1, defs: 1, clippath: 1, mask: 1, pattern: 1, marker: 1, lineargradient: 1, radialgradient: 1, filter: 1 };
  function inTemplate(el) {
    let p = el;
    while (p && p.nodeType === 1) {
      if (TEMPLATE[p.tagName.toLowerCase()]) return true;
      p = p.parentElement;
    }
    return false;
  }

  function vis(el) {
    if (!el || el.nodeType !== 1) return false;
    if (inTemplate(el)) return false;
    const cs = getComputedStyle(el);
    if (cs.display === 'none') return false;
    if (cs.visibility === 'hidden' || cs.visibility === 'collapse') return false;
    if (opacityChain(el) < 0.02) return false;
    const r = el.getBoundingClientRect();
    const hasBox = r.width > 0.01 && r.height > 0.01;
    if (hasBox) return true;
    // R3: SVG 形状的退化盒子（横线/竖线/纯 stroke 路径）
    const tag = el.tagName.toLowerCase();
    if (el.namespaceURI === SVGNS && svgLeaf[tag]) {
      const sw = parseFloat(cs.strokeWidth || '0');
      if (cs.stroke && cs.stroke !== 'none' && sw > 0) return true;
      try { const b = el.getBBox(); if (b.width > 0.01 && b.height > 0.01 && cs.fill !== 'none') return true; } catch (e) {}
    }
    return false;
  }

  function rect(el) { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, area: Math.max(0, r.width) * Math.max(0, r.height) }; }

  // R4: SVG 墨迹面积
  function svgInk(el, strokeWidth, fillPainted) {
    let b = null;
    try { b = el.getBBox(); } catch (e) {}
    const r = el.getBoundingClientRect();
    const bw = b && b.width > 0 ? b.width : r.width;
    const bh = b && b.height > 0 ? b.height : r.height;
    const tag = el.tagName.toLowerCase();
    const closed = (tag === 'rect' || tag === 'circle' || tag === 'ellipse' || tag === 'polygon');
    const fillArea = fillPainted ? bw * bh : 0;
    // 闭合形状墨迹沿周长；开放路径（line/path/polyline）用 (bw+bh) 近似路径长度下界
    const perim = closed ? 2 * (bw + bh) : (bw + bh);
    const strokeArea = strokeWidth > 0 ? perim * strokeWidth : 0;
    return { fillArea: fillArea, strokeArea: strokeArea, closed: closed, bw: bw, bh: bh };
  }

  function path(el) {
    const bits = [];
    let p = el;
    while (p && p.nodeType === 1 && bits.length < 4) {
      let s = p.tagName.toLowerCase();
      if (p.id) s += '#' + p.id;
      const cls = (p.getAttribute && p.getAttribute('class') || '').trim();
      if (cls) s += '.' + cls.split(/\s+/).slice(0, 2).join('.');
      bits.unshift(s);
      p = p.parentElement;
    }
    return bits.join('>');
  }
  function ownText(el) {
    let n = 0, s = '';
    for (const c of el.childNodes) if (c.nodeType === 3) { const t = c.nodeValue.replace(/\s+/g, ' ').trim(); n += t.length; s += t; }
    return { chars: n, text: s };
  }
  function textRects(el) {
    const out = [];
    for (const c of el.childNodes) {
      if (c.nodeType !== 3 || !c.nodeValue.trim()) continue;
      const rg = document.createRange();
      rg.selectNodeContents(c);
      for (const r of rg.getClientRects()) if (r.width > 0 && r.height > 0) out.push({ x: r.x, y: r.y, w: r.width, h: r.height });
    }
    return out;
  }
  function parseShadows(str) {
    if (!str || str === 'none') return [];
    const out = [];
    let depth = 0, cur = '';
    for (const ch of str) {
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }
  // 该元素的「绘制底」是否被**照片类**图片覆盖（这些像素的颜色不由色板决定）。
  //
  // 两个必须区分的位图（这条区分是被 S02 / S16 / S24 教出来的）：
  //   photo  —— 真实照片（<img>、较大尺寸的一次性贴图）：颜色与色板无关，必须整块挖掉。
  //   texel  —— 平铺纹理（background-repeat: repeat，纸纹/扫描线/噪点）：它是
  //             某个声明色的**调制**，不是新色。整块挖掉会把 body 的整个矩形挖没
  //             （S02 就是这么变成 0 像素的）；不挖又会把 ±2 阶的颗粒算成孤立色
  //             （S16 是这么把 27% 屏算成孤立的）。正确做法：不挖，交给分类器的
  //             near 档吸收（见 classify.mjs 的 nearTol）。
  const RASTER_RE = /\.(png|jpe?g|webp|avif|gif|bmp|tiff?)(["')?#]|$)/i;
  function rasterKind(el) {
    const t = el.tagName.toLowerCase();
    if (t === 'img' || t === 'video' || t === 'canvas') return 'photo';
    const cs = getComputedStyle(el);
    const urls = [];
    for (const k of ['backgroundImage', 'borderImageSource']) {
      const v = cs[k] || '';
      const all = v.match(/url\(([^)]*)\)/g) || [];
      for (const u of all) if (RASTER_RE.test(u)) urls.push(u);
    }
    if (!urls.length) return null;
    const repeat = cs.backgroundRepeat || '';
    // 平铺 → 纹理。同时要求尺寸不大（大尺寸多半是照片贴图而非纹样）。
    const size = cs.backgroundSize || '';
    const smallTile = /repeat/.test(repeat);
    return smallTile ? 'texel' : 'photo';
  }
  return { norm: norm, vis: vis, rect: rect, path: path, ownText: ownText, textRects: textRects,
           parseShadows: parseShadows, svgInk: svgInk, rasterKind: rasterKind,
           opacityChain: opacityChain, SVGNS: SVGNS };
})();
`;
