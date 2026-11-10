// 探针 17（终审）：合并所有实测产物，给出最终判定 + **每条的置信度**。
// 这个审计的核心不是"提示词对不对"，而是"能不能验"——所以每一条 FAIL 都标注它的证据等级：
//   HARD  = 换任何量法结论都一样（提示词写的字在页面上根本不存在）
//   SOFT  = 结论依赖口径（"新增彩色"算不算灰阶、"全站 0 圆角"算不算圆形徽标）
//   OPEN  = 我的量法还不足以下结论（明确标出来，不硬判）
import { readFileSync, writeFileSync } from 'node:fs';

const DIR = 'D:/Web/style/deliverables/69-audit';
const con = JSON.parse(readFileSync(DIR + '/constraints.json', 'utf8'));
const mea = JSON.parse(readFileSync(DIR + '/measured-v2.json', 'utf8'));
const col = JSON.parse(readFileSync(DIR + '/color-origins-v2.json', 'utf8'));
const lw = JSON.parse(readFileSync(DIR + '/linewidths-v2.json', 'utf8'));
const monoRes = JSON.parse(readFileSync(DIR + '/mono-fonts.json', 'utf8'));
const ids = Object.keys(con.per);

const hsl = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return { h: 0, s: 0, l };
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h; if (mx === r) h = (g - b) / d + (g < b ? 6 : 0); else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
  return { h: h * 60, s, l };
};
const sat = (hex) => hsl(hex).s;
const lum = (hex) => hsl(hex).l;

const rows = [];
const R = (o) => rows.push(o);
const push = (id, kind, cat, verdict, conf, claim, actual, note) =>
  R({ id, kind, cat, verdict, conf, claim, actual, note: note || '' });

for (const id of ids) {
  const c = mea.cases[id];
  const co = col[id];
  const L = lw[id];
  const items = con.per[id].items;
  const claimed = [...new Set(items.filter((i) => i.kind === 'palette').map((i) => i.params.hex))];

  /* ══════ 配色 ══════ */
  const textExtra = co.textArr.filter((x) => x.src !== 'claimed');
  // 分级：真正"新增彩色"= 有饱和度且不是声称色
  const chromaticText = textExtra.filter((x) => sat(x.hex) >= 0.10);
  const strongText = chromaticText.filter((x) => x.n >= 5);
  const surfExtra = co.surfArr.filter((x) => x.src !== 'claimed' && x.a === 1 && sat(x.hex) >= 0.10 && x.areaPct >= 0.5);
  const unused = claimed.filter((h) => { const u = co.claimedUse.find((x) => x.hex === h); return u && !u.asText && !u.asSurface; });

  const palVerdict = (strongText.length || surfExtra.length) ? 'FAIL' : 'PASS';
  push(id, 'palette-closed', 'M', palVerdict, palVerdict === 'PASS' ? 'HARD' : 'SOFT',
    '只用 ' + claimed.length + ' 个声称色，不新增更多彩色',
    '越界：文字色 ' + strongText.map((x) => x.hex + '×' + x.n).join(',') +
    (strongText.length ? '' : '无') + ' ; 面 ' + surfExtra.map((x) => x.hex + '@' + x.areaPct + '%').join(',') +
    (surfExtra.length ? '' : '无') + ' ; 灰阶越界 ' + (textExtra.length - chromaticText.length) + ' 处（不计）',
    '口径：饱和度 ≥0.10 且非声称色；文字要求 ≥5 处、面要求 ≥0.5% 面积才算"新增彩色"' +
    (strongText.length ? '。越界例：' + strongText[0].sample.join('/') : ''));

  push(id, 'palette-used', 'M', unused.length === 0 ? 'PASS' : 'WARN', 'HARD',
    claimed.length + ' 个声称色', '从未上屏 ' + unused.length + ' 个' + (unused.length ? '：' + unused.join(' ') : ''),
    '冗余不是谎报，但说明配色行不是逐值驱动实现');

  /* ══════ 字体 ══════ */
  const fdisp = items.find((i) => i.kind === 'font-display' || i.kind === 'font-single');
  const fbody = items.find((i) => i.kind === 'font-body' || i.kind === 'font-single');
  const fmono = items.find((i) => i.kind === 'font-mono');
  const firstOf = (s) => (s || '').split(',')[0].replace(/["']/g, '').trim();
  const h1F = c.h1 ? firstOf(c.h1.fam) : null;
  const bodyF = c.bodyText ? firstOf(c.bodyText.fam) : null;
  const pfH1 = c.platform.h1 ? c.platform.h1.fonts.map((f) => f.family) : null;
  const pfP = c.platform.p ? c.platform.p.fonts.map((f) => f.family) : null;

  if (fdisp) {
    const stack = fdisp.params.stack || [fdisp.params.face];
    const ok = stack.includes(h1F);
    push(id, 'font-display', 'M', ok ? 'PASS' : 'FAIL', 'HARD', stack.join(' → '),
      'h1 首族=' + h1F + ' ; 实际画字=' + (pfH1 ? pfH1.join('+') : 'n/a'), ok ? '' : '首族不在授权链');
  }
  if (fbody) {
    const stack = fbody.params.stack || [fbody.params.face];
    const ok = stack.includes(bodyF);
    push(id, 'font-body', 'M', ok ? 'PASS' : 'FAIL', 'HARD', stack.join(' → '),
      'body 首族=' + bodyF + ' ; 画字=' + (pfP ? pfP.join('+') : 'n/a'), ok ? '' : '首族不在授权链');
  }
  if (fmono) {
    const face = fmono.params.face;
    // 用 probe-mono-fonts.mjs 的权威结果（见 §2.4C：前三版都因为"只挑一个元素"而误判）
    const mono = monoRes[id] || {};
    const v = mono.verdict || 'OPEN';
    push(id, 'font-mono', 'M',
      v === 'PASS' ? 'PASS' : (v === 'PASS*' ? 'PASS' : v),
      v === 'PASS*' ? 'SOFT' : 'HARD',
      '等宽 ' + face,
      'computed font-family 声明 ' + (mono.usage ? mono.usage.declared : '?') + ' 次 ; ' + (mono.why || ''),
      v === 'PASS*' ? '@font-face 本地别名（不是假声称）：' + (mono.aliasOf ? mono.aliasOf.src.slice(0, 60) : '') : '');
  }
  const ban = items.find((i) => i.kind === 'font-ban');
  if (ban) {
    const used = (c.famCount || []).filter((f) => !f.generic).map((f) => f.f.toLowerCase());
    const v = ban.params.bans.filter((b) => used.includes(b.toLowerCase()));
    push(id, 'font-ban', 'M', v.length ? 'FAIL' : 'PASS', 'HARD', '禁 ' + ban.params.bans.join('/'),
      v.length ? '出现：' + v.join('/') : '未出现');
  }

  /* ══════ 圆角 ══════ */
  const rad = items.find((i) => i.kind === 'radius');
  if (rad) {
    const rr = c.radii || [];
    const nonCircle = rr.filter((x) => !/50%|9999|100%/.test(x.r));
    const circle = rr.filter((x) => /50%|9999|100%/.test(x.r));
    const circleForm = circle.filter((x) => /^(INPUT|BUTTON|SELECT|TEXTAREA)$/i.test(x.tag));
    const circleOther = circle.filter((x) => !/^(INPUT|BUTTON|SELECT|TEXTAREA)$/i.test(x.tag));
    let v, note;
    if (rad.params.allZero) {
      if (nonCircle.length) { v = 'FAIL'; note = '非圆形圆角：' + nonCircle.slice(0, 4).map((x) => x.sel + '=' + x.r).join(' '); }
      else if (circleForm.length && !circleOther.length) { v = 'PASS'; note = '仅 ' + circleForm.length + ' 个圆形表单控件为 50%，无其它圆角'; }
      else if (circle.length) { v = 'FAIL'; note = '有 ' + circleOther.length + ' 个非表单元素为圆形（' + circleOther.slice(0, 3).map((x) => x.sel).join(',') + '）'; }
      else { v = 'PASS'; note = '全站无任何非零圆角'; }
    } else { v = 'N/A'; note = '本案不声称全零'; }
    push(id, 'radius', 'M', v, v === 'FAIL' ? 'HARD' : 'SOFT', rad.params.allZero ? '全站一律 0' : '—',
      '非零圆角 ' + rr.length + ' 处' + (rr.length ? '：' + rr.slice(0, 3).map((x) => x.sel + '=' + x.r).join(' ') : ''), note);
  }

  /* ══════ 阴影 ══════ */
  const sh = items.find((i) => i.kind === 'shadow');
  if (sh) {
    const m = c.shadows, k = sh.params.kind;
    let ok, act;
    if (k === 'none') { ok = m.inset === 0 && m.outset === 0 && m.dropFilter === 0; act = 'inset=' + m.inset + ' 外投影=' + m.outset + ' drop=' + m.dropFilter; }
    else if (k === 'inset-only') { ok = m.outset === 0 && m.dropFilter === 0; act = 'inset=' + m.inset + ' 外投影=' + m.outset + ' drop=' + m.dropFilter; }
    else if (k === 'drop-only') { ok = m.outset === 0; act = 'drop=' + m.dropFilter + ' 外投影=' + m.outset + ' inset=' + m.inset; }
    else { ok = null; act = JSON.stringify(m); }
    push(id, 'shadow', 'M', ok === null ? 'N/A' : ok ? 'PASS' : 'FAIL', 'HARD', k, act);
  }

  /* ══════ 线宽（四路：边框/outline 声明 / non-scaling stroke / 带单位 stroke / SVG 用户单位） ══════ */
  const lwc = items.find((i) => i.kind === 'line-widths');
  if (lwc) {
    const claim = lwc.params.widths.slice().sort((a, b) => a - b);
    const inClaim = (v) => claim.some((x) => Math.abs(x - v) < 0.011);
    const fromText = L ? L.decl.map((x) => x.w) : [];
    const fromNonScaling = L ? L.nonScaling : [];
    const fromStrokeDecl = L ? (L.strokeDecl || []).map((x) => x.w) : [];
    const eff = [...new Set([...fromText, ...fromNonScaling, ...(L ? L.strokeDecl.filter((x) => x.px).map((x) => x.w) : [])])]
      .filter((v) => v > 0).sort((a, b) => a - b);
    const extra = eff.filter((v) => !inClaim(v));
    const allSeen = [...new Set([...eff, ...fromStrokeDecl])];
    const missing = claim.filter((v) => !allSeen.some((s) => Math.abs(s - v) < 0.011));
    let v2, note;
    if (extra.length && missing.length) { v2 = 'FAIL'; note = '超纲 ' + extra.map((v) => v + 'px').join('/') + '，且声称值 ' + missing.map((v) => v + 'px').join('/') + ' 从未落地'; }
    else if (missing.length) { v2 = 'FAIL'; note = '声称值 ' + missing.map((v) => v + 'px').join('/') + ' 在原型里一次都没出现'; }
    else if (extra.length) { v2 = 'FAIL'; note = '超纲 ' + extra.map((v) => v + 'px').join('/'); }
    else { v2 = 'PASS'; note = '声称值全部落地，无超纲'; }
    push(id, 'line-widths', 'M', v2, 'HARD', claim.map((v) => v + 'px').join('/'),
      '边框/outline=' + (eff.length ? eff.map((v) => v + 'px').join('/') : '无') +
      ' ; stroke 声明=' + (fromStrokeDecl.length ? [...new Set(fromStrokeDecl)].map((v) => v + 'px').join('/') : '—'),
      note);
  }

  /* ══════ 图片位 ══════ */
  const im = items.find((i) => i.kind === 'image-slots');
  if (im) push(id, 'image-slots', 'M', c.imgVisible >= im.params.n ? 'PASS' : 'FAIL', 'SOFT',
    '≥' + im.params.n + ' 个图片位', '可见 img=' + c.imgVisible + ' 标签=' + c.imgN,
    c.imgVisible < im.params.n ? '若用 SVG/CSS 造图则是假阴性' : '');

  /* ══════ 防退化（可机械判的 4 条） ══════ */
  if (items.some((i) => i.kind === 'no-carousel')) {
    const t = c.carousel;
    push(id, 'no-carousel', 'M', (t.autoplay === 0 && t.swiperLike === 0) ? 'PASS' : 'FAIL', 'SOFT', '首屏不轮播',
      'autoplay=' + t.autoplay + ' 轮播类名=' + t.swiperLike + ' aria-live=' + t.ariaLive + ' setInterval=' + t.setInterval,
      t.swiperLike ? '命中类名：可能是静态轮播区（非自动播放），需人核' : '');
  }
  if (items.some((i) => i.kind === 'no-gradient')) {
    push(id, 'no-gradient', 'M', c.gradN === 0 ? 'PASS' : 'FAIL', 'HARD', '无渐变',
      '渐变元素=' + c.gradN + ' #6366F1=' + ([...co.surfArr, ...co.textArr].some((x) => x.hex === '#6366F1') ? '有' : '无'));
  }
  if (items.some((i) => i.kind === 'no-glassmorphism')) {
    push(id, 'no-glassmorphism', 'M', c.backdropN === 0 ? 'PASS' : 'FAIL', 'HARD', '无毛玻璃', 'backdrop-filter=' + c.backdropN);
  }
  if (items.some((i) => i.kind === 'no-emoji-iconfont')) {
    push(id, 'no-emoji-iconfont', 'M', (c.emoji === 0 && (c.iconFonts || []).length === 0) ? 'PASS' : 'FAIL', 'HARD',
      '无 emoji/iconfont', 'emoji=' + c.emoji + ' iconfont=' + (c.iconFonts || []).length);
  }
  if (items.some((i) => i.kind === 'no-round-softshadow')) {
    push(id, 'no-round-softshadow', 'M', (c.radiiN === 0 && c.shadows.outset === 0) ? 'PASS' : 'FAIL', 'SOFT',
      '无"圆角+外投影"组合', '圆角=' + c.radiiN + ' 外投影=' + c.shadows.outset,
      c.radiiN && !c.shadows.outset ? '"组合"字面未破（无外投影），但通用禁令③④要的是"不要圆角卡片"' : '');
  }
}

const kinds = {};
for (const r of rows) {
  kinds[r.kind] = kinds[r.kind] || { PASS: 0, FAIL: 0, WARN: 0, 'N/A': 0, fails: [] };
  kinds[r.kind][r.verdict] = (kinds[r.kind][r.verdict] || 0) + 1;
  if (r.verdict === 'FAIL') kinds[r.kind].fails.push(r);
}
writeFileSync(DIR + '/verdict-final.json', JSON.stringify({ rows, kinds }, null, 1), 'utf8');

console.log('kind'.padEnd(22), 'PASS FAIL WARN  NA');
let t = { PASS: 0, FAIL: 0, WARN: 0, 'N/A': 0 };
for (const [k, v] of Object.entries(kinds).sort((a, b) => (b[1].PASS + b[1].FAIL) - (a[1].PASS + a[1].FAIL))) {
  console.log(k.padEnd(22), String(v.PASS).padStart(4), String(v.FAIL).padStart(4), String(v.WARN).padStart(4), String(v['N/A']).padStart(3));
  for (const kk of Object.keys(t)) t[kk] += v[kk];
}
console.log(''.padEnd(22), String(t.PASS).padStart(4), String(t.FAIL).padStart(4), String(t.WARN).padStart(4), String(t['N/A']).padStart(3));
console.log('\n=== FAIL ===');
for (const [k, v] of Object.entries(kinds)) for (const f of v.fails)
  console.log(f.id, '|', k.padEnd(20), '|', f.conf, '|', f.claim.slice(0, 46), '||', f.actual.slice(0, 110), '||', (f.note || '').slice(0, 90));
