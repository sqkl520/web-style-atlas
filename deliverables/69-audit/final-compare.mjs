// 探针 12（终局比对）：把 constraints.json（声称）+ measured-v2.json（实测）+ color-origins-v2.json（溯源）
// 合成一张权威判定表。所有 FAIL 都带"证据等级"：硬证据 / 口径依赖 / 量法局限。
import { readFileSync, writeFileSync } from 'node:fs';

const DIR = 'D:/Web/style/deliverables/69-audit';
const con = JSON.parse(readFileSync(DIR + '/constraints.json', 'utf8'));
const mea = JSON.parse(readFileSync(DIR + '/measured-v2.json', 'utf8'));
const col = JSON.parse(readFileSync(DIR + '/color-origins-v2.json', 'utf8'));
const ids = Object.keys(con.per);

const hsl = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return { h: 0, s: 0, l };
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h;
  if (mx === r) h = (g - b) / d + (g < b ? 6 : 0); else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
  return { h: h * 60, s, l };
};
const isGray = (hex) => hsl(hex).s < 0.10;
const isNearWhiteOrBlack = (hex) => { const { l } = hsl(hex); return l > 0.96 || l < 0.045; };

const rows = [];
const R = (id, kind, cat, claim, actual, verdict, evidence, note) =>
  rows.push({ id, kind, cat, claim, actual, verdict, evidence, note: note || '' });

for (const id of ids) {
  const c = mea.cases[id];
  const co = col[id];
  const items = con.per[id].items;
  const claimed = [...new Set(items.filter((i) => i.kind === 'palette').map((i) => i.params.hex))];

  /* ═══ 1. 调色板：只算"真的承载内容"的颜色 ═══ */
  const textExtra = co.textArr.filter((x) => x.src !== 'claimed');
  const surfExtra = co.surfArr.filter((x) => x.src !== 'claimed' && x.a === 1);
  // 分类每一处越界
  const detail = [];
  let hardViolation = 0;
  for (const x of textExtra) {
    const cls = isGray(x.hex) ? 'gray' : 'chromatic';
    if (cls === 'chromatic' && x.n >= 3) { hardViolation++; detail.push('文字色 ' + x.hex + ' 用于 ' + x.n + ' 处文本（' + x.src + '）例：' + (x.sample[0] || '')); }
    else if (cls === 'chromatic') detail.push('文字色 ' + x.hex + ' 仅 ' + x.n + ' 处（弱）');
    else detail.push('文字色 ' + x.hex + ' 是灰阶（' + x.n + ' 处）');
  }
  for (const x of surfExtra) {
    const cls = isGray(x.hex) ? 'gray' : 'chromatic';
    if (cls === 'chromatic' && x.areaPct >= 0.5) { hardViolation++; detail.push('面 ' + x.hex + ' 占 ' + x.areaPct + '% 面积（' + x.src + '，' + x.kinds.join('/') + '）例：' + (x.sample[0] || '')); }
    else if (cls === 'chromatic') detail.push('面 ' + x.hex + ' 占 ' + x.areaPct + '%（零星）');
    else detail.push('面 ' + x.hex + ' 是灰阶，' + x.areaPct + '%');
  }
  R(id, 'palette-closed', 'M', '配色只用 ' + claimed.join(' ') + '，不新增更多彩色',
    '声称外上屏色 ' + (textExtra.length + surfExtra.length) + ' 个；其中构成"新增彩色"的 ' + hardViolation + ' 处',
    hardViolation === 0 ? 'PASS' : 'FAIL',
    hardViolation === 0 ? '越界色全为灰阶或零星' : '硬证据',
    detail.join(' ; ') || '无越界');

  /* 声称色是否真的被用上（反向） */
  const unused = claimed.filter((h) => {
    const u = co.claimedUse.find((x) => x.hex === h);
    return u && !u.asText && !u.asSurface;
  });
  R(id, 'palette-used', 'M', claimed.length + ' 个声称色', '从未上屏的声称色 ' + unused.length + ' 个' + (unused.length ? '：' + unused.join(' ') : ''),
    unused.length === 0 ? 'PASS' : 'WARN', '冗余非谎报', '声称了但没画出来 ≠ 谎；但它说明配色行不是逐值驱动的');

  /* ═══ 2. 字体 ═══ */
  const fdisp = items.find((i) => i.kind === 'font-display' || i.kind === 'font-single');
  const fbody = items.find((i) => i.kind === 'font-body' || i.kind === 'font-single');
  const fmono = items.find((i) => i.kind === 'font-mono');
  const declFirst = (s) => (s || '').split(',')[0].replace(/["']/g, '').trim();
  const h1First = c.h1 ? declFirst(c.h1.fam) : null;
  const bodyFirst = c.bodyText ? declFirst(c.bodyText.fam) : null;
  const pfH1 = c.platform.h1 ? c.platform.h1.fonts.map((f) => f.family) : null;
  const pfP = c.platform.p ? c.platform.p.fonts.map((f) => f.family) : null;

  if (fdisp) {
    const stack = fdisp.params.stack || [fdisp.params.face];
    const ok = stack.some((s) => s === h1First);
    R(id, 'font-display', 'M', stack.join(' → '),
      'h1 computed 首族=' + h1First + ' ; CSS.getPlatformFontsForNode 实际画字=' + (pfH1 ? pfH1.join('+') : 'n/a'),
      ok ? 'PASS' : 'FAIL', ok ? '' : '硬证据',
      ok ? '' : 'h1 首族不在授权链');
  }
  if (fbody) {
    const stack = fbody.params.stack || [fbody.params.face];
    const ok = stack.some((s) => s === bodyFirst);
    R(id, 'font-body', 'M', stack.join(' → '), 'body computed 首族=' + bodyFirst + ' ; 画字=' + (pfP ? pfP.join('+') : 'n/a'),
      ok ? 'PASS' : 'FAIL', ok ? '' : '硬证据', ok ? '' : 'body 首族不在授权链');
  }
  if (fmono) {
    const face = fmono.params.face;
    const inList = (c.famCount || []).some((f) => f.f === face);
    const pfM = c.platform.mono ? c.platform.mono.fonts.map((f) => f.family) : null;
    // 判定：声称的等宽族必须真的被某个元素声明且真的画到字
    const paintedByIt = pfM && pfM.some((f) => f.includes(face) || face.includes(f));
    const ok = inList && (paintedByIt || !c.platform.mono);
    R(id, 'font-mono', 'M', '等宽 ' + face,
      '声明链里出现=' + inList + ' ; 命中元素=' + (c.monoSel || 'none') + ' ; 画字=' + (pfM ? pfM.join('+') : 'n/a'),
      ok ? 'PASS' : 'FAIL', ok ? '' : (inList ? '口径依赖' : '硬证据'),
      !inList ? '声称的等宽族在整个页面里一次都没被声明——这条是纯粹的假声称' : '');
  }
  const ban = items.find((i) => i.kind === 'font-ban');
  if (ban) {
    const used = (c.famCount || []).filter((f) => !f.generic).map((f) => f.f.toLowerCase());
    const v = ban.params.bans.filter((b) => used.includes(b.toLowerCase()));
    R(id, 'font-ban', 'M', '禁用 ' + ban.params.bans.join('/'), v.length ? '违规：' + v.join('/') : '未出现', v.length ? 'FAIL' : 'PASS');
  }

  /* ═══ 3. 圆角 ═══ */
  const rad = items.find((i) => i.kind === 'radius');
  if (rad) {
    const rr = c.radii || [];
    const nonCircle = rr.filter((x) => !/50%|9999|100%/.test(x.r));
    // 表单控件（input/button）的 50% 是"圆形徽标"授权范围内的例外
    const circleForms = rr.filter((x) => /50%|9999|100%/.test(x.r) && /input|button/i.test(x.tag));
    const circleOther = rr.filter((x) => /50%|9999|100%/.test(x.r) && !/input|button/i.test(x.tag));
    let verdict, note;
    if (rad.params.allZero) {
      if (nonCircle.length) { verdict = 'FAIL'; note = '有非圆形圆角：' + nonCircle.slice(0, 4).map((x) => x.sel + ':' + x.r).join(' | '); }
      else if (rr.length) { verdict = 'PASS*'; note = '非零圆角 ' + rr.length + ' 处，全部是 50%/' + '（' + circleForms.length + ' 个表单控件、' + circleOther.length + ' 个其它）——「全站 0」在字面上不成立于这 ' + rr.length + ' 个元素'; }
      else { verdict = 'PASS'; note = '全站无任何非零圆角'; }
    } else { verdict = 'N/A'; note = '本案不声称全零'; }
    R(id, 'radius', 'M', rad.params.allZero ? '全站一律 0' : '（非全零，不逐值判）',
      '非零圆角 ' + rr.length + ' 处' + (rr.length ? '：' + rr.slice(0, 3).map((x) => x.sel + '=' + x.r).join(' ') : ''), verdict, verdict === 'FAIL' ? '硬证据' : '口径依赖', note);
  }

  /* ═══ 4. 阴影 ═══ */
  const sh = items.find((i) => i.kind === 'shadow');
  if (sh) {
    const m = c.shadows, k = sh.params.kind;
    let ok, actual;
    if (k === 'none') { ok = m.inset === 0 && m.outset === 0 && m.dropFilter === 0; actual = 'inset=' + m.inset + ' 外投影=' + m.outset + ' drop-shadow=' + m.dropFilter; }
    else if (k === 'inset-only') { ok = m.outset === 0 && m.dropFilter === 0; actual = 'inset=' + m.inset + ' 外投影=' + m.outset + ' drop-shadow=' + m.dropFilter; }
    else if (k === 'drop-only') { ok = m.outset === 0; actual = 'drop-shadow=' + m.dropFilter + ' 外投影=' + m.outset + ' inset=' + m.inset; }
    else { ok = null; actual = JSON.stringify(m); }
    R(id, 'shadow', 'M', k, actual, ok === null ? 'N/A' : (ok ? 'PASS' : 'FAIL'), ok ? '' : '硬证据', '');
  }

  /* ═══ 5. 线宽 ═══ */
  const lw = items.find((i) => i.kind === 'line-widths');
  if (lw) {
    const claim = lw.params.widths.slice().sort((a, b) => a - b);
    const inClaim = (v) => claim.some((x) => Math.abs(x - v) < 0.011);
    const declared = (c.declWidths || []).map((x) => parseFloat(x.w)).filter((v) => v > 0);
    const strokes = (c.svgStrokes || []).map((x) => parseFloat(x.w));
    const seen = [...new Set([...declared, ...strokes])].sort((a, b) => a - b);
    const extra = seen.filter((v) => !inClaim(v));
    R(id, 'line-widths', 'M', claim.map((v) => v + 'px').join('/'),
      'CSS 声明+SVG stroke 实测=' + (seen.length ? seen.map((v) => v + 'px').join('/') : '无'),
      extra.length === 0 ? 'PASS' : 'FAIL', extra.length ? '硬证据' : '',
      extra.length ? '超纲宽度：' + extra.map((v) => v + 'px').join('/') : '');
  }

  /* ═══ 6. 图片位 / 轮播 / 防退化 ═══ */
  const im = items.find((i) => i.kind === 'image-slots');
  if (im) R(id, 'image-slots', 'M', '≥' + im.params.n + ' 个不同图片位',
    '可见 img ' + c.imgVisible + ' / img 标签 ' + c.imgN, c.imgVisible >= im.params.n ? 'PASS' : 'FAIL',
    '', c.imgVisible < im.params.n ? '若用 SVG/CSS 造图则此处是假阴性' : '');

  if (items.some((i) => i.kind === 'no-carousel')) {
    const t = c.carousel;
    const ok = t.autoplay === 0 && t.swiperLike === 0;
    R(id, 'no-carousel', 'M', '首屏不轮播', 'autoplay属性=' + t.autoplay + ' 轮播类名=' + t.swiperLike + ' aria-live=polite:' + t.ariaLive + ' setInterval=' + t.setInterval + ' rAF=' + t.rAF,
      ok ? 'PASS' : 'FAIL', ok ? '' : '口径依赖', '');
  }
  if (items.some((i) => i.kind === 'no-gradient')) {
    R(id, 'no-gradient', 'M', '无渐变/#6366F1', '渐变元素=' + c.gradN + ' #6366F1=' + (co.surfArr.concat(co.textArr).some((x) => x.hex === '#6366F1') ? '有' : '无'),
      c.gradN === 0 ? 'PASS' : 'FAIL');
  }
  if (items.some((i) => i.kind === 'no-glassmorphism')) {
    R(id, 'no-glassmorphism', 'M', '无 backdrop-filter', 'backdrop-filter 元素=' + c.backdropN, c.backdropN === 0 ? 'PASS' : 'FAIL');
  }
  if (items.some((i) => i.kind === 'no-emoji-iconfont')) {
    R(id, 'no-emoji-iconfont', 'M', '无 emoji/iconfont', 'emoji=' + c.emoji + ' iconfont=' + (c.iconFonts || []).length,
      (c.emoji === 0 && (c.iconFonts || []).length === 0) ? 'PASS' : 'FAIL');
  }
  if (items.some((i) => i.kind === 'no-round-softshadow')) {
    const ok = (c.radiiN === 0) && (c.shadows.outset === 0);
    R(id, 'no-round-softshadow', 'M', '无"圆角+柔和外投影"组合',
      '非零圆角=' + c.radiiN + ' 外投影=' + c.shadows.outset, ok ? 'PASS' : 'FAIL', ok ? '' : '口径依赖',
      ok ? '' : '原型有' + c.radiiN + '处圆角但外投影为0，"组合禁令"字面未破；但通用禁令③④要求的是"不要圆角卡片"');
  }
}

/* ── 汇总 ── */
const kinds = {};
for (const r of rows) {
  kinds[r.kind] = kinds[r.kind] || { PASS: 0, FAIL: 0, 'PASS*': 0, WARN: 0, 'N/A': 0, fails: [] };
  kinds[r.kind][r.verdict] = (kinds[r.kind][r.verdict] || 0) + 1;
  if (r.verdict === 'FAIL') kinds[r.kind].fails.push(r);
}
writeFileSync(DIR + '/verdict.json', JSON.stringify({ rows, kinds }, null, 1), 'utf8');

console.log('kind'.padEnd(22), ' PASS FAIL PASS* WARN  N/A');
let t = { PASS: 0, FAIL: 0, 'PASS*': 0, WARN: 0, 'N/A': 0 };
for (const [k, v] of Object.entries(kinds).sort((a, b) => (b[1].PASS + b[1].FAIL) - (a[1].PASS + a[1].FAIL))) {
  console.log(k.padEnd(22), String(v.PASS).padStart(5), String(v.FAIL).padStart(4), String(v['PASS*']).padStart(6), String(v.WARN).padStart(5), String(v['N/A']).padStart(4));
  for (const kk of Object.keys(t)) t[kk] += v[kk];
}
console.log(''.padEnd(22), String(t.PASS).padStart(5), String(t.FAIL).padStart(4), String(t['PASS*']).padStart(6), String(t.WARN).padStart(5), String(t['N/A']).padStart(4));
console.log('\n=== FAIL 明细 ===');
for (const [k, v] of Object.entries(kinds)) for (const f of v.fails) console.log(f.id, '|', k.padEnd(20), '|', f.claim, '||', f.actual, '||', f.note);
console.log('\n=== PASS* 明细（字面不成立但有辩护）===');
for (const r of rows.filter((x) => x.verdict === 'PASS*')) console.log(r.id, '|', r.kind, '|', r.note);
