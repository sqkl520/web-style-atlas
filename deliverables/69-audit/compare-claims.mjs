// 探针 4（纯文本）：把提示词声称的 M 类值 vs measured.json 的实测值逐案比对。
// 不做任何"看起来差不多"的宽容：比对结果分 PASS / FAIL / 需人判(N/A)。
import { readFileSync, writeFileSync } from 'node:fs';

const DIR = 'D:/Web/style/deliverables/69-audit';
const con = JSON.parse(readFileSync(DIR + '/constraints.json', 'utf8'));
const mea = JSON.parse(readFileSync(DIR + '/measured.json', 'utf8'));
const ids = Object.keys(con.per);

/* ── 工具 ─────────────────────────────────────────────────────────── */
const rgb2hsl = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  const d = mx - mn;
  if (!d) return { h: 0, s: 0, l };
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h;
  if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0));
  else if (mx === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: h * 60, s, l };
};
const hexOf = (rgbStr) => {
  const m = String(rgbStr).match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
  return '#' + p.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
};
const near = (a, b) => {  // 颜色"接近"：每通道 ≤2（仅用于字体/线的容差说明，色板比对不用）
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  return [16, 8, 0].every((s) => Math.abs(((pa >> s) & 255) - ((pb >> s) & 255)) <= 2);
};
const isGray = (hex) => { const { s } = rgb2hsl(hex); return s < 0.08; };

/* 真实渲染首族：优先用 CSS.getPlatformFontsForNode（谁在画字），退回 computed 首项 */
function realFont(caseData, key) {
  const pf = caseData.platformFonts && caseData.platformFonts[key];
  const declared = key === 'h1' ? (caseData.h1 && caseData.h1.fontFamily)
    : key === 'p' ? (caseData.body && caseData.body.fontFamily) : null;
  return { platform: pf ? pf.map((f) => f.family) : null, declared };
}

const rows = [];
function check(id, kind, claim, actual, pass, detail) {
  rows.push({ id, kind, claim, actual, pass, detail: detail || '' });
}

for (const id of ids) {
  const c = mea.cases[id];
  const items = con.per[id].items;

  /* ---------- 1. 色板 ---------- */
  const claimed = [...new Set(items.filter((i) => i.kind === 'palette').map((i) => i.params.hex))];
  const claimedSet = new Set(claimed);
  const paintedSolid = c.painted.filter((p) => p.hex !== 'GRADIENT' && p.hex !== 'URL' && p.a === 1).map((p) => p.hex);
  const paintedAlpha = c.painted.filter((p) => p.hex !== 'GRADIENT' && p.hex !== 'URL' && p.a < 1);
  const unclaimed = [...new Set(paintedSolid)].filter((h) => !claimedSet.has(h));
  const unclaimedChromatic = unclaimed.filter((h) => !isGray(h));
  // 未用到的声称色（声称了但一次都没画出来）
  const unusedClaimed = claimed.filter((h) => !paintedSolid.includes(h) && !paintedAlpha.some((p) => p.hex === h));
  check(id, 'palette-extra', claimed.join(' '),
    'solid-not-claimed=' + unclaimed.length + ' [' + unclaimed.join(' ') + ']' +
    ' ; chromatic-not-claimed=' + unclaimedChromatic.length + ' [' + unclaimedChromatic.join(' ') + ']',
    unclaimedChromatic.length === 0,
    unclaimedChromatic.length ? '有非灰的未声称色上屏' : '未声称的上屏色全为灰阶（黑/白/灰），语义上不算"新增彩色"');
  check(id, 'palette-unused', claimed.length + ' 个声称色', '从未上屏=' + unusedClaimed.length + ' [' + unusedClaimed.join(' ') + ']',
    true, '声称了但没用到不算谎报，只是冗余；单列以便判"配色行是否真的驱动了实现"');

  /* ---------- 2. 字体 ---------- */
  const fdisp = items.find((i) => i.kind === 'font-display' || i.kind === 'font-single');
  const fbody = items.find((i) => i.kind === 'font-body' || i.kind === 'font-single');
  const fmono = items.find((i) => i.kind === 'font-mono');
  const h1r = realFont(c, 'h1');
  const pr = realFont(c, 'p');
  if (fdisp) {
    const stack = fdisp.params.stack || [fdisp.params.face];
    const declaredFirst = (h1r.declared || '').split(',')[0].replace(/["']/g, '').trim();
    // 判定：computed 首项必须在声称链里（链就是"按序取第一个可用"的授权序列）
    const inChain = stack.some((s) => s === declaredFirst);
    const painted = h1r.platform ? h1r.platform[0] : null;
    check(id, 'font-display', '链[' + stack.join(' → ') + ']', 'h1 computed 首项="' + declaredFirst + '" ; 实际画字=' + (painted || 'n/a'),
      inChain, inChain ? '' : 'h1 用的族不在提示词的授权链里');
  }
  if (fbody) {
    const stack = fbody.params.stack || [fbody.params.face];
    const declaredFirst = (pr.declared || '').split(',')[0].replace(/["']/g, '').trim();
    const inChain = stack.some((s) => s === declaredFirst);
    check(id, 'font-body', '链[' + stack.join(' → ') + ']', 'body computed 首项="' + declaredFirst + '"',
      inChain, inChain ? '' : 'body 用的族不在授权链里');
  }
  if (fmono) {
    const codeEl = c.monoUses && c.monoUses[0];
    const mFam = codeEl ? (codeEl.fam || '').split(',')[0].replace(/["']/g, '').trim() : null;
    const ok = mFam === fmono.params.face;
    const pf = c.platformFonts && c.platformFonts.code;
    check(id, 'font-mono', fmono.params.face,
      (mFam || 'no-code-el') + ' ; 画字=' + (pf ? pf.map((x) => x.family).join('/') : 'n/a') +
      ' ; tabular-nums=' + (codeEl ? codeEl.fvn : 'n/a'),
      ok, ok ? '' : (mFam ? 'code 元素首族不是声明的等宽体' : '页面里没有 code/.mono/.num 元素可测'));
  }
  // 字体禁令
  const ban = items.find((i) => i.kind === 'font-ban');
  if (ban) {
    const usedFams = (c.fontFamilies || []).filter((f) => !f.generic).map((f) => f.f);
    const violations = ban.params.bans.filter((b) => usedFams.some((u) => u.toLowerCase() === b.toLowerCase()));
    check(id, 'font-ban', '禁 ' + ban.params.bans.join('/'), violations.length ? '违规: ' + violations.join('/') : '无',
      violations.length === 0);
  }

  /* ---------- 3. 圆角 ---------- */
  const rad = items.find((i) => i.kind === 'radius');
  if (rad) {
    const r = c.radiiNonZero || [];
    const allCircle = r.every((x) => /50%|9999|100%/.test(x.r));
    const ok = rad.params.allZero ? r.length === 0 : true;
    check(id, 'radius', rad.params.allZero ? '全站 0' : '非全零',
      '非零圆角元素=' + r.length + (r.length ? ' [' + r.slice(0, 3).map((x) => x.sel + ':' + x.r).join(' | ') + ']' : '') +
      (r.length ? ' ; 全为圆形(50%)=' + allCircle : ''), ok);
  }

  /* ---------- 4. 阴影 ---------- */
  const sh = items.find((i) => i.kind === 'shadow');
  if (sh) {
    const k = sh.params.kind;
    const m = c.shadows;
    let ok, actual;
    if (k === 'none') { ok = m.inset === 0 && m.outset === 0 && m.dropFilter === 0; actual = 'inset=' + m.inset + ' outset=' + m.outset + ' drop-shadow=' + m.dropFilter; }
    else if (k === 'inset-only') { ok = m.outset === 0 && m.dropFilter === 0; actual = 'inset=' + m.inset + ' outset=' + m.outset + ' drop=' + m.dropFilter; }
    else if (k === 'drop-only') { ok = m.outset === 0; actual = 'drop-shadow=' + m.dropFilter + ' outset-boxshadow=' + m.outset + ' inset=' + m.inset; }
    else { ok = null; actual = JSON.stringify(m); }
    check(id, 'shadow', k, actual, ok);
  }

  /* ---------- 5. 线宽 ---------- */
  const lw = items.find((i) => i.kind === 'line-widths');
  if (lw) {
    const claim = lw.params.widths.slice().sort((a, b) => a - b);
    const gotBorder = (c.borderWidths || []).map((x) => x.w);
    const gotOutline = (c.outlineWidths || []).map((x) => x.w);
    const got = [...new Set([...gotBorder, ...gotOutline])].sort((a, b) => a - b);
    const extra = got.filter((g) => !claim.some((v) => Math.abs(v - g) < 0.01));
    check(id, 'line-widths', claim.map((v) => v + 'px').join('/'),
      '实测 border/outline 宽度=' + (got.length ? got.map((v) => v + 'px').join('/') : '（无任何 border/outline）') +
      (extra.length ? ' ; 超纲=' + extra.map((v) => v + 'px').join('/') : ''),
      extra.length === 0,
      '注意口径：只量 border/outline 实算宽度；SVG stroke、伪元素、background 线不在内 → 实测值是**下界**');
  }

  /* ---------- 6. 图片位 ---------- */
  const im = items.find((i) => i.kind === 'image-slots');
  if (im) {
    const need = im.params.n;
    check(id, 'image-slots', '≥' + need + ' 个可见图片位',
      'img 标签=' + c.imgs.n + ' 可见(>4px)=' + c.imgs.visible, c.imgs.visible >= need,
      c.imgs.visible < need ? '可见图片位不足（但原型用 SVG/CSS 画图时会被误判，需人核）' : '');
  }

  /* ---------- 7. 首屏轮播 ---------- */
  if (items.some((i) => i.kind === 'no-carousel')) {
    const t = c.carouselTraces;
    const ok = t.autoplayAttr === 0 && t.swiperLike === 0;
    check(id, 'no-carousel', '无轮播', 'autoplay=' + t.autoplayAttr + ' swiper类名=' + t.swiperLike +
      ' aria-live=polite:' + t.ariaLive + ' setInterval=' + t.setIntervalScripts + ' rAF=' + t.requestAnimationFrame, ok);
  }

  /* ---------- 8. 防退化里可机械判的部分 ---------- */
  if (items.some((i) => i.kind === 'no-gradient')) {
    check(id, 'no-gradient', '无紫蓝渐变/#6366F1/光斑', 'linear|radial gradient 元素=' + c.gradCount +
      ' ; #6366F1 出现=' + (c.painted.some((p) => p.hex === '#6366F1') ? '是' : '否'),
      c.gradCount === 0);
  }
  if (items.some((i) => i.kind === 'no-glassmorphism')) {
    check(id, 'no-glassmorphism', '无 backdrop-filter/半透明浮层', 'backdrop-filter 元素=' + c.backdropCount,
      c.backdropCount === 0);
  }
  if (items.some((i) => i.kind === 'no-emoji-iconfont')) {
    const ok = (!c.emoji || c.emoji.length === 0) && (!c.iconFonts || c.iconFonts.length === 0);
    check(id, 'no-emoji-iconfont', '无 emoji/彩色 iconfont',
      'emoji=' + (c.emoji.length ? c.emoji[0].n + ' 个 ' + c.emoji[0].sample : 0) +
      ' ; iconfont 命中=' + (c.iconFonts ? c.iconFonts.length : 0), ok);
  }
  if (items.some((i) => i.kind === 'no-round-softshadow')) {
    const ok = (c.radiiCount === 0) && (c.shadows.outset === 0);
    check(id, 'no-round-softshadow', '无"圆角+柔和外投影"组合', '圆角=' + c.radiiCount + ' 外投影=' + c.shadows.outset, ok);
  }

  /* ---------- 9. 单文件 / 无框架（原型侧恒真，仅记录） ---------- */
  const wr = c.consoleErrors || [];
  if (wr.length) rows.push({ id, kind: 'console-error', claim: '无运行时异常', actual: wr.slice(0, 2).join(' | '), pass: false });
}

/* ── 汇总 ─────────────────────────────────────────────────────────── */
const byKind = {};
for (const r of rows) {
  const k = r.kind;
  byKind[k] = byKind[k] || { pass: 0, fail: 0, na: 0, fails: [] };
  if (r.pass === true) byKind[k].pass++;
  else if (r.pass === false) { byKind[k].fail++; byKind[k].fails.push(r); }
  else byKind[k].na++;
}
writeFileSync(DIR + '/compare.json', JSON.stringify({ rows, byKind }, null, 1), 'utf8');

console.log('kind'.padEnd(22), 'pass fail  na');
let tp = 0, tf = 0, tn = 0;
for (const [k, v] of Object.entries(byKind).sort((a, b) => (b[1].fail + b[1].pass) - (a[1].fail + a[1].pass))) {
  console.log(k.padEnd(22), String(v.pass).padStart(4), String(v.fail).padStart(4), String(v.na).padStart(3));
  tp += v.pass; tf += v.fail; tn += v.na;
}
console.log(''.padEnd(22), String(tp).padStart(4), String(tf).padStart(4), String(tn).padStart(3));
console.log('\n===== 全部 FAIL 明细 =====');
for (const [k, v] of Object.entries(byKind)) {
  for (const f of v.fails) console.log(f.id, '|', k, '| 声称:', f.claim, '| 实测:', f.actual, f.detail ? '| ' + f.detail : '');
}
