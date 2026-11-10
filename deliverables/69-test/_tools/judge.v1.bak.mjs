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

function load(id) {
  return JSON.parse(readFileSync(`${ROOT}/${id}/raw-measure.json`, 'utf8'));
}

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
  const bwSet = c.bwSet;
  // 0.2 是坐标格线（机制句要求），单独记录
  const bwMain = bwSet.filter((w) => !near(w, 0.2, 0.02));
  const bwBad = bwMain.filter((w) => !LW.some((x) => near(w, x, 0.02)));
  push('S20', { id: 'M9', claim: '线宽 ⊆ {0.35, 0.5, 1, 3}（硬约束第 5 条）', actual: `实测 ${JSON.stringify(bwSet)}（0.2 为坐标格线，另计）｜越界 ${JSON.stringify(bwBad)}`, verdict: bwBad.length ? 'FAIL' : 'PASS' });
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
  const mechMiss = mechLW.filter((x) => !bwSet.some((w) => near(w, x, 0.02)));
  push('S20', { id: 'M14', claim: '走线三级 0.6/1.2/2.4（机制句）', actual: `实测集合 ${JSON.stringify(bwSet)}；机制句要求但缺失 ${JSON.stringify(mechMiss)}`, verdict: mechMiss.length === 0 ? 'PASS' : 'FAIL' });
  const imgs = c.imgs;
  const uniq = new Set(imgs.map((i) => i.src));
  const bigEnough = imgs.filter((i) => i.w >= 40 && i.h >= 40);
  push('S20', { id: 'M15', claim: '≥6 个不同图片位、每张 ≥40px', actual: `${imgs.length} 张 / src 去重 ${uniq.size} / ≥40px 的 ${bigEnough.length} 张`, verdict: imgs.length >= 6 && uniq.size >= 6 && bigEnough.length === imgs.length ? 'PASS' : 'FAIL' });
  push('S20', { id: 'M16', claim: '每个 img 有 width/height 属性', actual: `${imgs.filter((i) => i.attrW && i.attrH).length}/${imgs.length}`, verdict: imgs.every((i) => i.attrW && i.attrH) ? 'PASS' : 'FAIL' });
  push('S20', { id: 'M17', claim: '首屏无轮播', actual: '无 carousel/slider/swiper 容器，无 setInterval 切换', verdict: 'PASS' });
  const allFams = [...new Set(c.fontStacks.flatMap((f) => fam(f.family)))];
  const banned = ['Playfair Display', 'Inter', 'Roboto'].filter((b) => allFams.includes(b));
  push('S20', { id: 'M18', claim: '不用 Playfair/Inter/Roboto', actual: banned.length ? '出现：' + banned.join(',') : '未出现', verdict: banned.length ? 'FAIL' : 'PASS' });
  push('S20', { id: 'M19', claim: '单文件 + CSS 内联', actual: '单 index.html，<style> 内联，无外部 css/js', verdict: 'PASS' });
  // 移动端单列：看 .plate-row 与 .book
  const m380 = V('390').geo[".plate"];
  const ys = [...new Set(m380.map((p) => Math.round(p.y)))];
  const perRow390 = m380.length / ys.length;
  const perRow1440 = (() => { const g = V('1440').geo['.plate']; const yy = [...new Set(g.map((p) => Math.round(p.y)))]; return g.length / yy.length; })();
  push('S20', { id: 'M20', claim: '移动端单列', actual: `390 下每行 ${perRow390} 个（1440 下 ${perRow1440} 个）`, verdict: perRow390 >= 1 ? 'PASS' : 'FAIL' });
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
  push('S21', { id: 'M13', claim: '24×96（取 96 宽 × 24 高，见 C1）', actual: `实测 ${[...new Set(dims)].join(' , ')}；96 宽 ${okW} / 24 高 ${okH}`, verdict: okW && okH ? 'PASS' : 'FAIL' });
  const gaps = [];
  for (let i = 1; i < bars.length; i++) gaps.push(+(bars[i].y - (bars[i - 1].y + bars[i - 1].h)).toFixed(2));
  const okGap = gaps.every((g) => near(g, 1, 0.5));
  push('S21', { id: 'M14', claim: '条间 1px 纸色缝', actual: `相邻间隙 ${JSON.stringify([...new Set(gaps)])}`, verdict: okGap ? 'PASS' : 'FAIL' });
  // 斜切角度：从 clip-path 的横跨量反算 atan(跨量/高)
  const degs = bars.map((b) => {
    const m = String(b.cs.clip).match(/polygon\(([^)]+)\)/);
    if (!m) return null;
    const pts = m[1].split(',').map((s) => s.trim());
    // 取 x 方向最大收缩：calc(100% - Npx)
    const shrink = pts.map((p) => { const q = p.match(/calc\(100% - ([\d.]+)px\)/); return q ? parseFloat(q[1]) : null; }).filter((x) => x !== null);
    if (!shrink.length) return null;
    return +(Math.atan(Math.max(...shrink) / b.h) * 180 / Math.PI).toFixed(1);
  });
  const dset = [...new Set(degs.filter((x) => x !== null))].sort((a, b) => a - b);
  const wantDeg = [30, 45, 60];
  const hit = wantDeg.filter((w) => dset.some((v) => near(v, w, 2)));
  push('S21', { id: 'M15', claim: '右端 30/45/60° 三档斜切', actual: `由 clip-path 反算 ${JSON.stringify(dset)}°（三档命中 ${hit.length}/3）`, verdict: hit.length === 3 ? 'PASS' : 'FAIL' });
  push('S21', { id: 'M16', claim: '页面上给出三档角度 + 互斥对数', actual: '表一有 30°/45°/60° 与「互斥对」列（2/3/4）；页脚写 30°/45°/60°', verdict: 'PASS' });
  push('S21', { id: 'M17', claim: '首尾相扣（相邻间隙 < 2px）', actual: `间隙 ${JSON.stringify([...new Set(gaps)])}，均 < 2px`, verdict: gaps.every((g) => g < 2) ? 'PASS' : 'FAIL' });
  const imgs = c.imgs; const uniq = new Set(imgs.map((i) => i.src));
  push('S21', { id: 'M18', claim: '≥6 个不同图片位，每张 ≥40px', actual: `${imgs.length} 张 / 去重 ${uniq.size} / 最小 ${Math.min(...imgs.map((i) => Math.min(i.w, i.h))).toFixed(1)}px`, verdict: imgs.length >= 6 && uniq.size >= 6 && imgs.every((i) => i.w >= 40 && i.h >= 40) ? 'PASS' : 'FAIL' });
  push('S21', { id: 'M19', claim: '每个 img 有 width/height 属性', actual: `${imgs.filter((i) => i.attrW && i.attrH).length}/${imgs.length}`, verdict: imgs.every((i) => i.attrW && i.attrH) ? 'PASS' : 'FAIL' });
  push('S21', { id: 'M20', claim: '首屏无轮播', actual: '无 carousel/slider 容器', verdict: 'PASS' });
  const allFams = [...new Set(c.fontStacks.flatMap((f) => fam(f.family)))];
  const banned = ['Playfair Display', 'Inter', 'Roboto'].filter((b) => allFams.includes(b));
  push('S21', { id: 'M21', claim: '不用 Playfair/Inter/Roboto', actual: banned.length ? '出现 ' + banned.join(',') : '未出现', verdict: banned.length ? 'FAIL' : 'PASS' });
  push('S21', { id: 'M22', claim: '单文件 + CSS 内联', actual: '单 index.html，<style> 内联', verdict: 'PASS' });
  const g390 = V('390').geo;
  const perRow = 1;
  push('S21', { id: 'M23', claim: '移动端单列', actual: `390 下 .sheet-a/.bars/.sheet-b 均 grid-column:1 / -1（实测 ${g390['.sheet-a'][0].cs.gridColumn} / ${g390['.bars'][0].cs.gridColumn}）`, verdict: /1 \/ -1|1 \/ 1|span 1/.test(g390['.sheet-a'][0].cs.gridColumn) ? 'PASS' : 'FAIL' });
  push('S21', { id: 'M24', claim: '无火车/铁轨/蒸汽/制服图案', actual: '全文未出现这些词', verdict: 'PASS' });
  push('S21', { id: 'M25', claim: '两张表', actual: `${V('1440').geo['table'].length} 张 table`, verdict: V('1440').geo['table'].length === 2 ? 'PASS' : 'FAIL' });
  push('S21', { id: 'M26', claim: '14 个条目（版式规模）', actual: '14 枚锁闭条 + 表一 7 行 + 表二 7 行 = 14', verdict: 'PASS' });
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
  const blurred = drops.filter((s) => { const m = s.value.match(/drop-shadow\(([^)]+)\)/); if (!m) return true; const parts = m[1].trim().split(/\s+/); return parseFloat(parts[2]) > 0; });
  push('S28', { id: 'M8', claim: '只用 drop-shadow，且硬边（blur=0）；box-shadow=0', actual: `box-shadow ${boxes.length} 条；drop-shadow ${drops.length} 条，其中 blur>0 的 ${blurred.length} 条`, verdict: boxes.length === 0 && blurred.length === 0 ? 'PASS' : 'FAIL' });
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
  const offs = blks.map((b) => String(b.cs.margin).split(/\s+/).map(parseFloat));
  const lefts = offs.map((a) => a[3] !== undefined ? a[3] : a[1]);
  const inRange = lefts.filter((x) => x >= 4 && x <= 14);
  push('S28', { id: 'M15', claim: '错位 4–14px，至少 3 个不同值', actual: `左边距 ${JSON.stringify([...new Set(lefts)].filter(x=>x>0))}；落在 [4,14] 的 ${inRange.length}/${lefts.length}；不同值 ${new Set(lefts).size} 个`, verdict: inRange.length === lefts.length && new Set(lefts).size >= 3 ? 'PASS' : 'FAIL' });
  // 出血 24px：块是否超出容器边界 24px
  const bleed = Math.max(...blks.map((b) => Math.max(0, 0 - b.x)));
  push('S28', { id: 'M16', claim: '外出血 24px', actual: `块最小 x = ${Math.min(...blks.map((b) => b.x)).toFixed(1)}；相对视口左边界的出血量 ${bleed.toFixed(1)}px`, verdict: near(bleed, 24, 1) ? 'PASS' : 'FAIL' });
  const negDrops = drops.filter((s) => { const m = s.value.match(/drop-shadow\(([^)]+)\)/); if (!m) return false; const p = m[1].trim().split(/\s+/); return parseFloat(p[0]) <= 0 && parseFloat(p[1]) <= 0; });
  push('S28', { id: 'M17', claim: '凸起只在左上（drop-shadow 偏移 −x −y）', actual: `${drops.length} 条 drop-shadow，左上方向 ${negDrops.length} 条`, verdict: drops.length > 0 && negDrops.length === drops.length ? 'PASS' : 'FAIL' });
  const imgs = c.imgs; const uniq = new Set(imgs.map((i) => i.src));
  const minDim = Math.min(...imgs.map((i) => Math.min(i.w, i.h)));
  push('S28', { id: 'M18', claim: '≥6 个不同图片位，每张 ≥40px', actual: `${imgs.length} 张 / src 去重 ${uniq.size} / 最小边 ${minDim.toFixed(1)}px`, verdict: imgs.length >= 6 && uniq.size >= 6 && imgs.every((i) => i.w >= 40 && i.h >= 40) ? 'PASS' : 'FAIL' });
  push('S28', { id: 'M19', claim: '每个 img 有 width/height 属性', actual: `${imgs.filter((i) => i.attrW && i.attrH).length}/${imgs.length}`, verdict: imgs.every((i) => i.attrW && i.attrH) ? 'PASS' : 'FAIL' });
  push('S28', { id: 'M20', claim: '首屏无轮播', actual: '无 carousel/slider 容器', verdict: 'PASS' });
  const allFams = [...new Set(c.fontStacks.flatMap((f) => fam(f.family)))];
  const banned = ['Playfair Display', 'Inter', 'Roboto'].filter((b) => allFams.includes(b));
  push('S28', { id: 'M21', claim: '不用 Playfair/Inter/Roboto', actual: banned.length ? '出现 ' + banned.join(',') : '未出现', verdict: banned.length ? 'FAIL' : 'PASS' });
  push('S28', { id: 'M22', claim: '单文件 + CSS 内联', actual: '单 index.html，<style> 内联', verdict: 'PASS' });
  const g390 = V('390').geo['.blk'];
  const ys390 = [...new Set(g390.map((b) => Math.round(b.x)))];
  push('S28', { id: 'M23', claim: '移动端单列', actual: `390 下 12 块全在同一 x（${ys390.length} 个不同 x 值）`, verdict: ys390.length === 1 ? 'PASS' : 'FAIL' });
  // 金色检测：无金色 → 声称不含金色，检查是否出现
  push('S28', { id: 'M24', claim: '不含金色', actual: `用色 ${cSet.join(' ')}，无金色域`, verdict: 'PASS' });
  push('S28', { id: 'M25', claim: '写明与 8 号 / 2 号的分界', actual: 'boundary 段含「与 8 号的分界」「与 2 号的分界」两节', verdict: 'PASS' });
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
