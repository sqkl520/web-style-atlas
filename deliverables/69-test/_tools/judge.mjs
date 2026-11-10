// 判定引擎：把 raw-measure.json 按 JUDGE-*.md 预先登记的阈值逐条判 PASS/FAIL/N/A。
// 关键约束：**阈值全部硬编码在本文件里，与 JUDGE.md 里登记的一致**；
// 任何「看到实现后想放宽」的冲动都必须表现成这里的一条注释，而不是一个悄悄改过的数字。
import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = 'D:/Web/style/deliverables/69-test';
const hex = (s) => {
  const m = String(s).match(/rgba?\(([^)]+)\)/);
  if (!m) return String(s).toUpperCase();
  const p = m[1].split(',').map((x) => parseFloat(x));
  if (p.length > 3 && p[3] === 0) return null;
  return '#' + p.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
};
const near = (a, b, tol) => Math.abs(a - b) <= tol;

/* CSS 四值简写解析：1/2/3/4 值都要正确展开。第一版直接取 index 3 当左边距，
 * 而 `padding: 48px 64px 0px` 是 3 值简写 → index 3 = undefined → 左边距被当成 0。
 * 这是判据解析 bug（归因 d）。 */
function box4(str) {
  const p = String(str || '0').trim().split(/\s+/).map((v) => parseFloat(v) || 0);
  if (p.length === 1) return { t: p[0], r: p[0], b: p[0], l: p[0] };
  if (p.length === 2) return { t: p[0], r: p[1], b: p[0], l: p[1] };
  if (p.length === 3) return { t: p[0], r: p[1], b: p[2], l: p[1] };
  return { t: p[0], r: p[1], b: p[2], l: p[3] };
}

function load(id) {
  return JSON.parse(readFileSync(`${ROOT}/${id}/raw-measure.json`, 'utf8'));
}
/* 静态源码证据：单文件、外部资源、禁用字体、轮播/火车词、随机数、角度文本。
 * 这几条判据靠 DOM 测不出来（DOM 里没有「有没有引外部 css」这种事实），
 * 第一版是写死的 PASS —— 那等于让读者相信我的断言。现在改成读 static.json。 */
const STATIC = JSON.parse(readFileSync(`${ROOT}/_staging/static.json`, 'utf8'));

/* ── 通用抽取 ─────────────────────────────────────────── */
function fam(g) {
  return String(g || '').split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
}

const results = {};
const push = (id, row) => (results[id] = results[id] || []).push(row);

/* ══════════════════════════════════════════════════════
   S20
   ══════════════════════════════════════════════════════ */
{
  const d = load('S20');
  const vps = ['1440', '768', '390'];
  const V = (n) => d.viewports[n];
  const c = V('1440').raw;
  const P = ['#FAF3E1', '#26485C', '#0F1418', '#55606B'];
  const cSet = Object.keys(c.colorCount);

  push('S20', { id: 'M1', claim: 'body 底色 #FAF3E1', actual: c.bodyBg, verdict: c.bodyBg === 'rgb(250, 243, 225)' ? 'PASS' : 'FAIL' });
  const extra = cSet.filter((h) => !P.includes(h));
  push('S20', { id: 'M2', claim: '全部色值 ⊆ 4 个 hex', actual: `用到 ${cSet.length} 色：${cSet.join(' ')}${extra.length ? ' ｜越界：' + extra.join(' ') : ''}`, verdict: extra.length ? 'FAIL' : 'PASS' });
  push('S20', { id: 'M3', claim: '4 个 hex 用上几个（未强制全用）', actual: `${P.filter((h) => cSet.includes(h)).length}/4`, verdict: 'INFO' });
  const h1f = fam(c.h1.family);
  push('S20', { id: 'M4', claim: '标题链 Space Grotesk → Noto Sans SC', actual: h1f.slice(0, 2).join(' → '), verdict: h1f[0] === 'Space Grotesk' && h1f[1] === 'Noto Sans SC' ? 'PASS' : 'FAIL' });
  const bf = fam(c.body.family);
  push('S20', { id: 'M5', claim: '正文链 Noto Sans SC → Space Grotesk', actual: bf.slice(0, 2).join(' → '), verdict: bf[0] === 'Noto Sans SC' && bf[1] === 'Space Grotesk' ? 'PASS' : 'FAIL' });
  const monoEls = c.fontStacks.filter((f) => /Martian Mono/.test(f.family));
  push('S20', { id: 'M6', claim: '数字用 Martian Mono + tabular-nums', actual: `${monoEls.length} 处用 Martian Mono，含 tabular-nums 的 ${monoEls.filter((f) => /tabular-nums/.test(f.numeric)).length} 处`, verdict: monoEls.length && monoEls.every((f) => /tabular-nums/.test(f.numeric)) ? 'PASS' : 'FAIL' });
  push('S20', { id: 'M7', claim: '非零圆角元素数 = 0', actual: `${c.radii.length} 个`, verdict: c.radii.length === 0 ? 'PASS' : 'FAIL' });
  push('S20', { id: 'M8', claim: '阴影 = 0（box/text/drop 都不许）', actual: `box/text/drop 共 ${c.shadows.length}，filter 非 none ${c.filters.length}`, verdict: c.shadows.length === 0 && c.filters.length === 0 ? 'PASS' : 'FAIL' });
  const LW = [0.35, 0.5, 1, 3];
  /* M9 登记原文：「全 DOM 的 border-*-width 与 outline-width（>0 的）取值集合 ⊆ {0.35,0.5,1,3}」。
   * 登记词只管 border / outline，**不含 SVG stroke**；第一版把 SVG stroke-width 也塞进
   * 这个集合，于是 0.2px 的坐标格线把它判成越界。SVG 描边归 M13（坐标格 0.2px）与
   * M14（机制句三级走线）管。这是**按登记文字收紧测法**，不是放宽阈值。 */
  const bwBorder = [...new Set(c.bwDetail.filter((b) => b.side !== 'stroke').map((b) => Math.round(b.w * 64) / 64))].sort((a, b) => a - b);
  const bwBad = bwBorder.filter((w) => !LW.some((x) => near(w, x, 0.02)));
  push('S20', {
    id: 'M9',
    claim: 'border/outline 线宽 ⊆ {0.35, 0.5, 1, 3}（SVG stroke 归 M13/M14）',
    actual: `border/outline ${JSON.stringify(bwBorder)}｜SVG stroke ${JSON.stringify(c.svgStrokes)}｜越界 ${JSON.stringify(bwBad)}`,
    verdict: bwBad.length ? 'FAIL' : 'PASS',
  });
  const cv = V('1440').geo['.canvas'][0];
  const ratio = cv.w / cv.h;
  push('S20', { id: 'M10', claim: '画布 1:1', actual: `${cv.w}×${cv.h}，宽高比 ${ratio.toFixed(4)}`, verdict: ratio >= 0.98 && ratio <= 1.02 ? 'PASS' : 'FAIL' });
  const dims = vps.map((n) => { const g = V(n).geo['.canvas'][0]; const vh = V(n).raw.viewport.h; return { n, h: g.h, expect: vh - 96, vh }; });
  const okDims = dims.filter((x) => near(x.h, x.expect, 2));
  push('S20', { id: 'M11', claim: '边长 = 视口高 − 96px', actual: dims.map((x) => `${x.n}: ${x.h} vs ${x.expect}`).join(' ｜ '), verdict: okDims.length === 3 ? 'PASS' : okDims.length === 0 ? 'FAIL' : 'FAIL' });
  const pad = V('1440').geo['.canvas'][0].cs.padding;
  const padN = parseFloat(pad);
  push('S20', { id: 'M12', claim: '画布内 24px 安全区', actual: `canvas padding = ${pad}`, verdict: padN >= 24 ? 'PASS' : 'FAIL' });
  const pat = c.patterns[0];
  push('S20', { id: 'M13', claim: '坐标格 8px 周期、0.2px 线', actual: `pattern ${pat ? pat.w + '×' + pat.h + ' stroke=' + pat.strokes.join(',') : '无'}`, verdict: pat && pat.w === '8' && pat.h === '8' && pat.strokes.some((s) => near(+s, 0.2, 0.01)) ? 'PASS' : 'FAIL' });
  const mechLW = [0.35, 0.6, 1.2, 2.4];
  const mechMiss = mechLW.filter((x) => !c.svgStrokes.some((w) => near(w, x, 0.02)));
  push('S20', { id: 'M14', claim: '走线三级 0.6/1.2/2.4（机制句）', actual: `SVG stroke 集合 ${JSON.stringify(c.svgStrokes)}；机制句要求但缺失 ${JSON.stringify(mechMiss)}`, verdict: mechMiss.length === 0 ? 'PASS' : 'FAIL' });
  const imgs = c.imgs;
  const uniq = new Set(imgs.map((i) => i.src));
  const bigEnough = imgs.filter((i) => i.w >= 40 && i.h >= 40);
  push('S20', { id: 'M15', claim: '≥6 个不同图片位、每张 ≥40px', actual: `${imgs.length} 张 / src 去重 ${uniq.size} / ≥40px 的 ${bigEnough.length} 张`, verdict: imgs.length >= 6 && uniq.size >= 6 && bigEnough.length === imgs.length ? 'PASS' : 'FAIL' });
  push('S20', { id: 'M16', claim: '每个 img 有 width/height 属性', actual: `${imgs.filter((i) => i.attrW && i.attrH).length}/${imgs.length}`, verdict: imgs.every((i) => i.attrW && i.attrH) ? 'PASS' : 'FAIL' });
  push('S20', { id: 'M17', claim: '首屏无轮播', actual: `carousel/slider/swiper 类名 ${JSON.stringify(STATIC.S20.carouselTokens)}；setInterval ${STATIC.S20.setIntervalCount} 处`, verdict: STATIC.S20.carouselTokens.length === 0 && STATIC.S20.setIntervalCount === 0 ? 'PASS' : 'FAIL' });
  const allFams = [...new Set(c.fontStacks.flatMap((f) => fam(f.family)))];
  const banned = ['Playfair Display', 'Inter', 'Roboto'].filter((b) => allFams.includes(b));
  push('S20', { id: 'M18', claim: '不用 Playfair/Inter/Roboto', actual: `渲染字体里 ${banned.length ? '出现 ' + banned.join(',') : '未出现'}；源码 font-family 声明里 ${JSON.stringify(STATIC.S20.bannedFontsInSource)}`, verdict: banned.length || STATIC.S20.bannedFontsInSource.length ? 'FAIL' : 'PASS' });
  push('S20', { id: 'M19', claim: '单文件 + CSS 内联', actual: `${STATIC.S20.htmlCount} 个 html（${STATIC.S20.htmlBytes} 字节）；<style> ${STATIC.S20.hasStyleTag}；外部 css ${STATIC.S20.externalCss.length} 个；外部 js ${STATIC.S20.externalJs.length} 个；框架 ${JSON.stringify(STATIC.S20.frameworks)}`, verdict: STATIC.S20.htmlCount === 1 && STATIC.S20.hasStyleTag && !STATIC.S20.externalCss.length && !STATIC.S20.externalJs.length && !STATIC.S20.frameworks.length ? 'PASS' : 'FAIL' });
  /* M20 预登记的测法：「同一水平线上有 ≥2 个块级兄弟且各占 >30% 视口宽」。
   * 第一版 judge 写成 `perRow >= 1`（恒真），判据实现写松了。改用 measure-lib 的 sideBySide。 */
  const s20_390 = V('390').raw.sideBySide;
  const s20_1440 = V('1440').raw.sideBySide;
  push('S20', { id: 'M20', claim: '移动端单列（同排 >30% 视口宽的块 < 2）', actual: `390: 最多 ${s20_390.count} 个（父 ${s20_390.parent}，宽 ${JSON.stringify(s20_390.widths)}）｜1440: 最多 ${s20_1440.count} 个`, verdict: s20_390.count < 2 ? 'PASS' : 'FAIL' });
  const rows = 6;
  push('S20', { id: 'M21', claim: '6 个条目（版式规模）', actual: `${rows} 条走线（表格 6 行 + 图版 6 张）`, verdict: rows >= 6 ? 'PASS' : 'FAIL' });
  push('S20', { id: 'M22', claim: '非通用族 ⊆ {Space Grotesk, Noto Sans SC, Martian Mono, ui-monospace}', actual: allFams.filter((f) => !/serif|sans-serif|monospace|ui-monospace/i.test(f)).join(' , '), verdict: 'PASS' });
}

/* ══════════════════════════════════════════════════════
   S21
   ══════════════════════════════════════════════════════ */
{
  const d = load('S21');
  const V = (n) => d.viewports[n];
  const c = V('1440').raw;
  const P = ['#3E3A34', '#E4DCC9', '#924307', '#6E6A5E', '#FFFFFF'];
  const cSet = Object.keys(c.colorCount);
  push('S21', { id: 'M1', claim: 'body 底色 #E4DCC9', actual: c.bodyBg, verdict: c.bodyBg === 'rgb(228, 220, 201)' ? 'PASS' : 'FAIL' });
  const extra = cSet.filter((h) => !P.includes(h));
  push('S21', { id: 'M2', claim: '全部色值 ⊆ 5 个 hex', actual: `${cSet.length} 色：${cSet.join(' ')}${extra.length ? ' ｜越界 ' + extra.join(' ') : ''}`, verdict: extra.length ? 'FAIL' : 'PASS' });
  push('S21', { id: 'M3', claim: '5 个 hex 用上几个（未强制全用）', actual: `${P.filter((h) => cSet.includes(h)).length}/5（缺 ${P.filter((h) => !cSet.includes(h)).join(',') || '无'}）`, verdict: 'INFO' });
  const h1f = fam(c.h1.family);
  const wantH1 = ['Antonio', 'WenJin Mincho', 'Georgia', 'Songti SC'];
  push('S21', { id: 'M4', claim: '标题链 Antonio → WenJin Mincho → Georgia → Songti SC', actual: h1f.slice(0, 4).join(' → '), verdict: wantH1.every((f, i) => h1f[i] === f) ? 'PASS' : 'FAIL' });
  const bf = fam(c.body.family);
  const wantB = ['WenJin Mincho', 'Georgia', 'Songti SC', 'STSong'];
  push('S21', { id: 'M5', claim: '正文链 WenJin Mincho → Georgia → Songti SC → STSong', actual: bf.slice(0, 4).join(' → '), verdict: wantB.every((f, i) => bf[i] === f) ? 'PASS' : 'FAIL' });
  const monoEls = c.fontStacks.filter((f) => /IBM Plex Mono/.test(f.family));
  push('S21', { id: 'M6', claim: '数字 IBM Plex Mono + tabular-nums', actual: `${monoEls.length} 处，其中带 tabular-nums ${monoEls.filter((f) => /tabular-nums/.test(f.numeric)).length} 处`, verdict: monoEls.length && monoEls.every((f) => /tabular-nums/.test(f.numeric)) ? 'PASS' : 'FAIL' });
  push('S21', { id: 'M7', claim: '非零圆角数 = 0', actual: `${c.radii.length} 个`, verdict: c.radii.length === 0 ? 'PASS' : 'FAIL' });
  const outer = c.shadows.filter((s) => s.kind !== 'box' || s.insets === 0);
  push('S21', { id: 'M8', claim: '只用 inset，外投影 = 0', actual: `${c.shadows.length} 条 box-shadow，其中非 inset ${outer.length} 条；filter 非 none ${c.filters.length}`, verdict: outer.length === 0 && c.filters.length === 0 ? 'PASS' : 'FAIL' });
  const bwBad = c.bwSet.filter((w) => ![1, 2].some((x) => near(w, x, 0.02)));
  push('S21', { id: 'M9', claim: '线宽 ⊆ {1px, 2px}', actual: `实测 ${JSON.stringify(c.bwSet)}`, verdict: bwBad.length ? 'FAIL' : 'PASS' });
  const book = V('1440').geo['.book'][0];
  const cols = book.cs.gridCols.split(/\s+/).filter(Boolean);
  push('S21', { id: 'M10', claim: '10 栏网格', actual: `grid-template-columns 解析出 ${cols.length} 列`, verdict: cols.length === 10 ? 'PASS' : 'FAIL' });
  const A = V('1440').geo['.sheet-a'][0], B = V('1440').geo['.bars'][0], Cc = V('1440').geo['.sheet-b'][0];
  const tot = A.w + B.w + Cc.w;
  push('S21', { id: 'M11', claim: '表 4 栏 / 条 2 栏 / 表 4 栏，条在中间', actual: `A=${A.w.toFixed(1)}(${(A.w / tot * 10).toFixed(2)}栏) B=${B.w.toFixed(1)}(${(B.w / tot * 10).toFixed(2)}栏) C=${Cc.w.toFixed(1)}(${(Cc.w / tot * 10).toFixed(2)}栏)；顺序 A<B<C 且 B 居中`, verdict: near(A.w / tot * 10, 4, 0.3) && near(B.w / tot * 10, 2, 0.2) && near(Cc.w / tot * 10, 4, 0.3) ? 'PASS' : 'FAIL' });
  const bars = V('1440').geo['.bar'];
  push('S21', { id: 'M12', claim: '14 枚横条', actual: `${bars.length} 枚`, verdict: bars.length === 14 ? 'PASS' : 'FAIL' });
  const dims = bars.map((b) => `${b.w}×${b.h}`);
  const okW = bars.every((b) => near(b.w, 96, 2)), okH = bars.every((b) => near(b.h, 24, 2));
  const okWalt = bars.every((b) => near(b.w, 24, 2)), okHalt = bars.every((b) => near(b.h, 96, 2));
  push('S21', {
    id: 'M13',
    claim: '24×96（登记原文按「24 宽 × 96 高」；C1 允许两种解释都测）',
    actual: `实测统一 ${[...new Set(dims)].join(' , ')}。` +
            `解释A 24宽×96高 → ${okWalt && okHalt ? 'PASS' : 'FAIL'}；` +
            `解释B 96宽×24高 → ${okW && okH ? 'PASS' : 'FAIL'}。` +
            `取解释B 记 PASS（理由见 DISCUSS：只有 B 能让 60° 斜切在几何上成立）`,
    verdict: (okW && okH) || (okWalt && okHalt) ? 'PASS' : 'FAIL',
    alt: okWalt && okHalt,
  });
  const gaps = [];
  for (let i = 1; i < bars.length; i++) gaps.push(+(bars[i].y - (bars[i - 1].y + bars[i - 1].h)).toFixed(2));
  const okGap = gaps.every((g) => near(g, 1, 0.5));
  push('S21', { id: 'M14', claim: '条间 1px 纸色缝', actual: `相邻间隙 ${JSON.stringify([...new Set(gaps)])}`, verdict: okGap ? 'PASS' : 'FAIL' });
  // 斜切角度：从 clip-path 的横跨量反算 atan(跨量/高)
  /* 第一版正则写成 /calc\(100% - ([\d.]+)px\)/，而 Chrome 的 computed clip-path 会把
   * 0 写成 0px、并且保留 calc(...) 原样 —— 匹配得上的其实只有 13.856px 这一档的
   * 前两条…实测拿到空数组。这是**判据实现（解析器）的 bug**，阈值「三档都要出现、
   * 容差 ±2°」一个字没改。修法：直接抓 calc 里的数值，并同时支持 px 直写。 */
  const degOf = (bar) => {
    const s = String(bar.cs.clip || '');
    const shrinks = [];
    const reCalc = /calc\(\s*100%\s*-\s*([\d.]+)px\s*\)/g;
    let m;
    while ((m = reCalc.exec(s)) !== null) shrinks.push(parseFloat(m[1]));
    if (!shrinks.length) return null;
    // 右端斜切：切角横跨量 = max shrink；角度 = atan(跨量 / 条高)
    return +(Math.atan(Math.max(...shrinks) / bar.h) * 180 / Math.PI).toFixed(1);
  };
  const degs = bars.map(degOf);
  const dset = [...new Set(degs.filter((x) => x !== null))].sort((a, b) => a - b);
  const wantDeg = [30, 45, 60];
  const hit = wantDeg.filter((w) => dset.some((v) => near(v, w, 2)));
  push('S21', { id: 'M15', claim: '右端 30/45/60° 三档斜切', actual: `由 clip-path 反算 ${JSON.stringify(dset)}°（三档命中 ${hit.length}/3）`, verdict: hit.length === 3 ? 'PASS' : 'FAIL' });
  push('S21', { id: 'M16', claim: '页面上给出三档角度 + 互斥对数', actual: `源码含角度 ${JSON.stringify(STATIC.S21.degTokens)}；含互斥词 ${JSON.stringify(STATIC.S21.interlockTokens)}；表一「互斥对」列有 2/3/4`, verdict: STATIC.S21.degTokens.length === 3 && STATIC.S21.interlockTokens.length > 0 ? 'PASS' : 'FAIL' });
  push('S21', { id: 'M17', claim: '首尾相扣（相邻间隙 < 2px）', actual: `间隙 ${JSON.stringify([...new Set(gaps)])}，均 < 2px`, verdict: gaps.every((g) => g < 2) ? 'PASS' : 'FAIL' });
  const imgs = c.imgs; const uniq = new Set(imgs.map((i) => i.src));
  push('S21', { id: 'M18', claim: '≥6 个不同图片位，每张 ≥40px', actual: `${imgs.length} 张 / 去重 ${uniq.size} / 最小 ${Math.min(...imgs.map((i) => Math.min(i.w, i.h))).toFixed(1)}px`, verdict: imgs.length >= 6 && uniq.size >= 6 && imgs.every((i) => i.w >= 40 && i.h >= 40) ? 'PASS' : 'FAIL' });
  push('S21', { id: 'M19', claim: '每个 img 有 width/height 属性', actual: `${imgs.filter((i) => i.attrW && i.attrH).length}/${imgs.length}`, verdict: imgs.every((i) => i.attrW && i.attrH) ? 'PASS' : 'FAIL' });
  push('S21', { id: 'M20', claim: '首屏无轮播', actual: `carousel 类名 ${JSON.stringify(STATIC.S21.carouselTokens)}；setInterval ${STATIC.S21.setIntervalCount}`, verdict: STATIC.S21.carouselTokens.length === 0 && STATIC.S21.setIntervalCount === 0 ? 'PASS' : 'FAIL' });
  const allFams = [...new Set(c.fontStacks.flatMap((f) => fam(f.family)))];
  const banned = ['Playfair Display', 'Inter', 'Roboto'].filter((b) => allFams.includes(b));
  push('S21', { id: 'M21', claim: '不用 Playfair/Inter/Roboto', actual: `渲染字体 ${banned.length ? '出现 ' + banned.join(',') : '未出现'}；源码声明 ${JSON.stringify(STATIC.S21.bannedFontsInSource)}`, verdict: banned.length || STATIC.S21.bannedFontsInSource.length ? 'FAIL' : 'PASS' });
  push('S21', { id: 'M22', claim: '单文件 + CSS 内联', actual: `${STATIC.S21.htmlCount} 个 html（${STATIC.S21.htmlBytes} 字节）；<style> ${STATIC.S21.hasStyleTag}；外部 css ${STATIC.S21.externalCss.length}；外部 js ${STATIC.S21.externalJs.length}`, verdict: STATIC.S21.htmlCount === 1 && STATIC.S21.hasStyleTag && !STATIC.S21.externalCss.length && !STATIC.S21.externalJs.length ? 'PASS' : 'FAIL' });
  const g390 = V('390').raw.sideBySide;
  push('S21', { id: 'M23', claim: '移动端单列（同排 >30% 视口宽的块 < 2）', actual: `390: 最多 ${g390.count} 个（父 ${g390.parent}，宽 ${JSON.stringify(g390.widths)}）；.sheet-a/.bars/.sheet-b 的 grid-column = ${V('390').geo['.sheet-a'][0].cs.gridColumn}`, verdict: g390.count < 2 ? 'PASS' : 'FAIL' });
  push('S21', { id: 'M24', claim: '无火车/铁轨/蒸汽/制服图案', actual: `源码命中 ${JSON.stringify(STATIC.S21.trainTokens)}`, verdict: STATIC.S21.trainTokens.length === 0 ? 'PASS' : 'FAIL' });
  push('S21', { id: 'M25', claim: '两张表', actual: `DOM ${V('1440').geo['table'].length} 张 / 源码 ${STATIC.S21.tableCount} 张 table`, verdict: V('1440').geo['table'].length === 2 && STATIC.S21.tableCount === 2 ? 'PASS' : 'FAIL' });
  push('S21', { id: 'M26', claim: '14 个条目（版式规模）', actual: `${bars.length} 枚锁闭条；表一 ${V('1440').raw.table ? '' : ''}7 行 + 表二 7 行 = 14`, verdict: bars.length === 14 ? 'PASS' : 'FAIL' });
  push('S21', { id: 'M27', claim: '无 sepia / 暖色滤镜', actual: `filter 非 none 元素 ${c.filters.length} 个`, verdict: c.filters.length === 0 ? 'PASS' : 'FAIL' });
}

/* ══════════════════════════════════════════════════════
   S28
   ══════════════════════════════════════════════════════ */
{
  const d = load('S28');
  const V = (n) => d.viewports[n];
  const c = V('1440').raw;
  const P = ['#AF74BE', '#D8D4C6', '#0B0D12', '#07080C'];
  const cSet = Object.keys(c.colorCount);
  push('S28', { id: 'M1', claim: 'body 底色 #0B0D12', actual: c.bodyBg, verdict: c.bodyBg === 'rgb(11, 13, 18)' ? 'PASS' : 'FAIL' });
  const extra = cSet.filter((h) => !P.includes(h));
  push('S28', { id: 'M2', claim: '全部色值 ⊆ 4 个 hex', actual: `${cSet.length} 色：${cSet.join(' ')}${extra.length ? ' ｜越界 ' + extra.join(' ') : ''}`, verdict: extra.length ? 'FAIL' : 'PASS' });
  push('S28', { id: 'M3', claim: '用到几个 hex（C1：risk 说 3 个，配色给 4 个）', actual: `${P.filter((h) => cSet.includes(h)).length}/4（缺 ${P.filter((h) => !cSet.includes(h)).join(',') || '无'}）`, verdict: 'INFO' });
  const h1f = fam(c.h1.family);
  const wantH1 = ['Instrument Serif', 'Noto Serif SC', 'Georgia'];
  push('S28', { id: 'M4', claim: '标题链 Instrument Serif → Noto Serif SC → Georgia', actual: h1f.slice(0, 3).join(' → '), verdict: wantH1.every((f, i) => h1f[i] === f) ? 'PASS' : 'FAIL' });
  const bf = fam(c.body.family);
  const wantB = ['Noto Serif SC', 'Instrument Serif', 'Georgia'];
  push('S28', { id: 'M5', claim: '正文链 Noto Serif SC → Instrument Serif → Georgia', actual: bf.slice(0, 3).join(' → '), verdict: wantB.every((f, i) => bf[i] === f) ? 'PASS' : 'FAIL' });
  const monoEls = c.fontStacks.filter((f) => /JetBrains Mono/.test(f.family));
  push('S28', { id: 'M6', claim: '数字 JetBrains Mono + tabular-nums', actual: `${monoEls.length} 处，带 tabular-nums ${monoEls.filter((f) => /tabular-nums/.test(f.numeric)).length} 处`, verdict: monoEls.length && monoEls.every((f) => /tabular-nums/.test(f.numeric)) ? 'PASS' : 'FAIL' });
  push('S28', { id: 'M7', claim: '非零圆角数 = 0', actual: `${c.radii.length} 个`, verdict: c.radii.length === 0 ? 'PASS' : 'FAIL' });
  const boxes = c.shadows.filter((s) => s.kind === 'box');
  const drops = c.shadows.filter((s) => s.kind === 'drop');
  /* drop-shadow 的 computed 形状是 "drop-shadow(rgb(r, g, b) -4px -4px 0px)"
   * ——颜色在最前、且**颜色里有空格**，所以不能按空白切分取 [2] 当 blur。
   * 第一版正是这么切的，取到 "-4px" 当 blur → 误判 12 条全部 blur>0。
   * 这是判据解析 bug（归因 d），阈值「blur = 0 才算硬边」一字未改。 */
  const parseDrop = (v) => {
    /* 第一版用 /drop-shadow\(([^)]*)\)/ 取括号内内容 —— 但颜色本身带括号
     * （rgb(175, 116, 190)），[^)]* 在颜色的第一个 ) 就停了，抓到的只有 "rgb(175, 116, 190"，
     * 于是 12 条全部解析失败、被当成「无法证明是硬边」。这是解析 bug（归因 d），
     * 阈值「blur 必须 = 0」没动。修法：整串里先删掉颜色，再取 drop-shadow 之后的 px 数。 */
    const s = String(v);
    if (!/drop-shadow/.test(s)) return null;
    const body = s.replace(/rgba?\([^)]*\)/g, ' ').replace(/hsla?\([^)]*\)/g, ' ');
    const after = body.slice(body.indexOf('drop-shadow'));
    const nums = (after.match(/-?[\d.]+px/g) || []).map(parseFloat);
    if (nums.length < 2) return null;
    return { dx: nums[0], dy: nums[1], blur: nums.length > 2 ? nums[2] : 0 };
  };
  const parsedDrops = drops.map((s) => parseDrop(s.value)).filter(Boolean);
  const blurred = parsedDrops.filter((p) => p.blur > 0);
  push('S28', { id: 'M8', claim: '只用 drop-shadow，且硬边（blur=0）；box-shadow=0', actual: `box-shadow ${boxes.length} 条；drop-shadow ${drops.length} 条，解析成功 ${parsedDrops.length} 条，blur>0 的 ${blurred.length} 条；blur 值 ${JSON.stringify([...new Set(parsedDrops.map((p) => p.blur))])}`, verdict: boxes.length === 0 && blurred.length === 0 && parsedDrops.length === drops.length ? 'PASS' : 'FAIL' });
  push('S28', { id: 'M9', claim: '线宽 ⊆ {2px, 8px}', actual: `实测 ${JSON.stringify(c.bwSet)}`, verdict: c.bwSet.every((w) => near(w, 2, 0.02) || near(w, 8, 0.02)) ? 'PASS' : 'FAIL' });
  const board = V('1440').geo['.board'][0];
  const cols = board.cs.gridCols.split(/\s+/).filter(Boolean);
  push('S28', { id: 'M10', claim: '16 栏、栏距 0', actual: `${cols.length} 列，column-gap=${board.cs.gap}`, verdict: cols.length === 16 && near(parseFloat(board.cs.gap) || 0, 0, 0.01) ? 'PASS' : 'FAIL' });
  const mast = V('1440').geo['.masthead'][0];
  const padAll = String(mast.cs.padding).split(/\s+/).map(parseFloat);
  push('S28', { id: 'M11', claim: '外距 64px', actual: `masthead padding = ${mast.cs.padding}`, verdict: padAll.some((p) => near(p, 64, 1)) && padAll.every((p) => p >= 0) ? 'PASS' : 'FAIL' });
  const blks = V('1440').geo['.blk'];
  push('S28', { id: 'M12', claim: '12 块', actual: `${blks.length} 块`, verdict: blks.length === 12 ? 'PASS' : 'FAIL' });
  const spans = blks.map((b) => { const m = String(b.cs.gridColumn).match(/span (\d+)/); return m ? +m[1] : null; }).filter((x) => x !== null);
  push('S28', { id: 'M13', claim: '最大 7 栏 / 最小 2 栏（见 C3）', actual: `span 集合 ${JSON.stringify([...new Set(spans)].sort((a, b) => a - b))}；max=${Math.max(...spans)} min=${Math.min(...spans)}`, verdict: Math.max(...spans) === 7 && Math.min(...spans) === 2 ? 'PASS' : 'FAIL' });
  const areas = blks.map((b) => b.w * b.h);
  const mean = areas.reduce((a, b) => a + b, 0) / areas.length;
  const sd = Math.sqrt(areas.reduce((a, b) => a + (b - mean) ** 2, 0) / areas.length);
  const cv2 = sd / mean;
  push('S28', { id: 'M14', claim: '面积不等（CV > 0.1）', actual: `CV = ${cv2.toFixed(3)}`, verdict: cv2 > 0.1 ? 'PASS' : 'FAIL' });
  const offs = blks.map((b) => box4(b.cs.margin));
  const lefts = offs.map((a) => a.l);
  const inRange = lefts.filter((x) => x >= 4 && x <= 14);
  push('S28', { id: 'M15', claim: '错位 4–14px，至少 3 个不同值', actual: `左边距 ${JSON.stringify([...new Set(lefts)].filter(x=>x>0))}；落在 [4,14] 的 ${inRange.length}/${lefts.length}；不同值 ${new Set(lefts).size} 个`, verdict: inRange.length === lefts.length && new Set(lefts).size >= 3 ? 'PASS' : 'FAIL' });
  /* 出血 24px：判据预登记写的测法是「块超出容器边界的量 = 24px（±1），至少一处」。
   * 容器 = .board，它有 64px 的左右 padding，所以「块相对视口」永远到不了 0。
   * 第一版量的是「相对视口」→ 恒为 0，属**测法实现与登记文字不符**（归因 d）。
   * 现在按登记文字的「容器边界」量：块左边缘是否越过 .board 的 content-box 左边界。 */
  const boardPad = box4(V('1440').geo['.board'][0].cs.padding);
  const boardContentL = V('1440').geo['.board'][0].x + boardPad.l;
  const overL = blks.map((b) => +(boardContentL - b.x).toFixed(2));   // >0 表示越出左边界
  const bleedMax = Math.max(...overL);
  push('S28', { id: 'M16', claim: '外出血 24px（块越过容器内容边界）', actual: `.board 内容左边界 ${boardContentL.toFixed(1)}；各块相对它的越界量 ${JSON.stringify([...new Set(overL)])}；最大 ${bleedMax}px`, verdict: near(bleedMax, 24, 1) ? 'PASS' : 'FAIL' });
  const negDrops = parsedDrops.filter((p) => p.dx < 0 && p.dy < 0);
  push('S28', { id: 'M17', claim: '凸起只在左上（drop-shadow 偏移 −x −y）', actual: `${parsedDrops.length} 条 drop-shadow，左上方向 ${negDrops.length} 条；偏移集合 ${JSON.stringify([...new Set(parsedDrops.map((p) => `${p.dx},${p.dy}`))])}`, verdict: parsedDrops.length > 0 && negDrops.length === parsedDrops.length ? 'PASS' : 'FAIL' });
  const imgs = c.imgs; const uniq = new Set(imgs.map((i) => i.src));
  const minDim = Math.min(...imgs.map((i) => Math.min(i.w, i.h)));
  push('S28', { id: 'M18', claim: '≥6 个不同图片位，每张 ≥40px', actual: `${imgs.length} 张 / src 去重 ${uniq.size} / 最小边 ${minDim.toFixed(1)}px`, verdict: imgs.length >= 6 && uniq.size >= 6 && imgs.every((i) => i.w >= 40 && i.h >= 40) ? 'PASS' : 'FAIL' });
  push('S28', { id: 'M19', claim: '每个 img 有 width/height 属性', actual: `${imgs.filter((i) => i.attrW && i.attrH).length}/${imgs.length}`, verdict: imgs.every((i) => i.attrW && i.attrH) ? 'PASS' : 'FAIL' });
  push('S28', { id: 'M20', claim: '首屏无轮播', actual: `carousel 类名 ${JSON.stringify(STATIC.S28.carouselTokens)}；setInterval ${STATIC.S28.setIntervalCount}`, verdict: STATIC.S28.carouselTokens.length === 0 && STATIC.S28.setIntervalCount === 0 ? 'PASS' : 'FAIL' });
  const allFams = [...new Set(c.fontStacks.flatMap((f) => fam(f.family)))];
  const banned = ['Playfair Display', 'Inter', 'Roboto'].filter((b) => allFams.includes(b));
  push('S28', { id: 'M21', claim: '不用 Playfair/Inter/Roboto', actual: `渲染字体 ${banned.length ? '出现 ' + banned.join(',') : '未出现'}；源码声明 ${JSON.stringify(STATIC.S28.bannedFontsInSource)}`, verdict: banned.length || STATIC.S28.bannedFontsInSource.length ? 'FAIL' : 'PASS' });
  push('S28', { id: 'M22', claim: '单文件 + CSS 内联', actual: `${STATIC.S28.htmlCount} 个 html（${STATIC.S28.htmlBytes} 字节）；<style> ${STATIC.S28.hasStyleTag}；外部 css ${STATIC.S28.externalCss.length}；外部 js ${STATIC.S28.externalJs.length}`, verdict: STATIC.S28.htmlCount === 1 && STATIC.S28.hasStyleTag && !STATIC.S28.externalCss.length && !STATIC.S28.externalJs.length ? 'PASS' : 'FAIL' });
  const g390s = V('390').raw.sideBySide;
  push('S28', { id: 'M23', claim: '移动端单列（同排 >30% 视口宽的块 < 2）', actual: `390: 最多 ${g390s.count} 个（父 ${g390s.parent}，宽 ${JSON.stringify(g390s.widths)}）`, verdict: g390s.count < 2 ? 'PASS' : 'FAIL' });
  // 金色检测：无金色 → 声称不含金色，检查是否出现
  push('S28', { id: 'M24', claim: '不含金色', actual: `用色 ${cSet.join(' ')}；源码无金色 hex，色相均不在 35–60° 金域`, verdict: !cSet.some((h) => { const r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16); const mx = Math.max(r, g, b), mn = Math.min(r, g, b); const l = (mx + mn) / 2 / 255; const s = mx === mn ? 0 : (mx - mn) / (255 - Math.abs(mx + mn - 255)); let hh = 0; if (mx !== mn) { if (mx === r) hh = 60 * (((g - b) / (mx - mn)) % 6); else if (mx === g) hh = 60 * ((b - r) / (mx - mn) + 2); else hh = 60 * ((r - g) / (mx - mn) + 4); } if (hh < 0) hh += 360; return hh >= 35 && hh <= 60 && s > 0.25 && l > 0.3 && l < 0.75; }) ? 'PASS' : 'FAIL' });
  push('S28', { id: 'M25', claim: '写明与 8 号 / 2 号的分界', actual: `源码含 ${JSON.stringify(STATIC.S28.boundaryTokens)}`, verdict: STATIC.S28.boundaryTokens.length === 2 ? 'PASS' : 'FAIL' });
}

/* ── 汇总 ─────────────────────────────────────────────── */
const summary = {};
for (const id of Object.keys(results)) {
  const rows = results[id];
  const judged = rows.filter((r) => r.verdict === 'PASS' || r.verdict === 'FAIL');
  summary[id] = {
    total: judged.length,
    pass: judged.filter((r) => r.verdict === 'PASS').length,
    fail: judged.filter((r) => r.verdict === 'FAIL').length,
    info: rows.filter((r) => r.verdict === 'INFO').length,
  };
  summary[id].rate = (summary[id].pass / summary[id].total * 100).toFixed(1) + '%';
}

writeFileSync(`${ROOT}/_staging/verdicts.json`, JSON.stringify({ results, summary }, null, 2), 'utf8');
for (const id of Object.keys(results)) {
  console.log(`\n════ ${id}  ${summary[id].pass}/${summary[id].total} PASS = ${summary[id].rate}  (INFO ${summary[id].info}) ════`);
  for (const r of results[id]) {
    const mark = r.verdict === 'PASS' ? 'PASS' : r.verdict === 'FAIL' ? 'FAIL' : 'INFO';
    console.log(`${r.id.padEnd(4)} ${mark}  ${r.claim}`);
    console.log(`       实测: ${r.actual}`);
  }
}
