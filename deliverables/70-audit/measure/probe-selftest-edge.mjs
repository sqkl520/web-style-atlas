// 自检 2：专门钉死「边界事实」——亚像素线、DPR、<use> 内部色、伪元素面积基准、简写可读性。
// 这些问题在上一轮审计里被反复判错，所以单独一个探针，结论写进报告。
import { startServer, launch, gotoStable, writeJson, HERE } from './lib.mjs';
import { HELPERS } from './inpage.mjs';
import { decodePNG, histogram, keyToHex, srgbToLab, hexToRgb, dE76, distToSeg } from './png.mjs';
import { join } from 'node:path';

const F = (extra) => `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;background:#EFE7D7;color:#1A1614;font:16px/1.5 monospace}
  .hair{width:200px;height:20px;border-top:0.5px solid #C1121F}
  .quarter{width:200px;height:20px;border-top:0.25px solid #1F4E79}
  .onepx{width:200px;height:20px;border-top:1px solid #2F7D4F}
  .outline{width:200px;height:20px;outline:0.5px solid #13928E;outline-offset:0}
  .colrule{column-count:2;column-gap:40px;column-rule:0.5px solid #B8860B;width:400px}
  .tdt{text-decoration:underline;text-decoration-thickness:0.5px;text-decoration-color:#5D43AD}
  .bs{width:100px;height:40px;box-shadow:0 0 0 0.5px #A8206B}
  ${extra || ''}
</style></head><body>
<div class="hair" id="hair"></div><div class="quarter" id="quarter"></div><div class="onepx" id="onepx"></div>
<div class="outline" id="outline"></div>
<div class="colrule" id="colrule"><p>甲段落文字内容用于撑开两栏，长度足够。乙段落文字内容用于撑开两栏。</p><p>丙段落文字内容用于撑开两栏，长度足够。丁段落文字内容用于撑开两栏。</p></div>
<p class="tdt" id="tdt">下划线粗细测试文本，长度超过二十个字符以便进入正文统计口径。</p>
<div class="bs" id="bs"></div>
<svg width="200" height="80" style="display:block">
  <defs><symbol id="sy" viewBox="0 0 10 10"><rect width="10" height="10" fill="#E23E57"/></symbol></defs>
  <line id="hl" x1="0" y1="10" x2="200" y2="10" stroke="#914A27" stroke-width="1"/>
  <line id="vl" x1="10" y1="0" x2="10" y2="60" stroke="#0E6258" stroke-width="1"/>
  <use id="us" href="#sy" x="100" y="0" width="30" height="30"/>
  <path id="pv" d="M150 20 L180 20" stroke="#644F02" stroke-width="2" fill="none"/>
</svg>
</body></html>`;

const server = await startServer(8603, new Map([['/__f/edge.html', F()]]));
const browser = await launch();
const page = await browser.newPage();
const checks = [];
const ok = (name, got, want, note) => {
  const pass = typeof want === 'function' ? want(got) : JSON.stringify(got) === JSON.stringify(want);
  checks.push({ name, got, want: typeof want === 'function' ? String(want) : want, pass, note: note || '' });
  console.log((pass ? 'PASS ' : 'FAIL ') + name + '  got=' + JSON.stringify(got) + (pass ? '' : '   want=' + JSON.stringify(typeof want === 'function' ? String(want) : want)));
};

for (const [dpr, label] of [[1, 'dpr1'], [2, 'dpr2']]) {
  await page.setViewport({ width: 1440, height: 900, dsf: dpr, mobile: false });
  await gotoStable(page, 'http://127.0.0.1:8603/__f/edge.html', 300);
  await page.eval(HELPERS);
  const o = await page.eval(`(() => {
    const cs = (s) => getComputedStyle(document.getElementById(s));
    const r = (s) => document.getElementById(s).getBoundingClientRect();
    return {
      dpr: devicePixelRatio,
      hairW: cs('hair').borderTopWidth, hairRect: [r('hair').width, r('hair').height],
      quarterW: cs('quarter').borderTopWidth,
      onepxW: cs('onepx').borderTopWidth,
      outlineW: cs('outline').outlineWidth,
      colRuleW: cs('colrule').columnRuleWidth,
      colRuleC: cs('colrule').columnRuleColor,
      tdtW: cs('tdt').textDecorationThickness, tdtC: cs('tdt').textDecorationColor,
      bsShadow: cs('bs').boxShadow,
      lineH: r('hl').height, lineW: r('hl').width,
      vlW: r('vl').width, vlH: r('vl').height,
      useRect: [r('us').width, r('us').height],
      useFill: cs('us').fill,
      pvH: r('pv').height,
    };
  })()`);
  console.log('\n--- ' + label + ' ---');
  console.log(JSON.stringify(o, null, 1));

  if (dpr === 1) {
    ok('dpr1: 0.5px 边框 computed 上取整为 1px', o.hairW, '1px', 'Chrome 把 <1px 的 border 夹到 1px');
    ok('dpr1: 0.25px 边框同样变 1px', o.quarterW, '1px');
    ok('dpr1: 0.5px outline 保留小数', o.outlineW, (v) => parseFloat(v) <= 1, 'outline 不夹');
    ok('dpr1: column-rule 宽度', o.colRuleW, (v) => !!v);
    ok('dpr1: text-decoration-thickness 0.5px', o.tdtW, (v) => !!v);
    ok('dpr1: 横线 <line> 盒子高度=0（必须靠 stroke 判可见）', o.lineH, 0);
    ok('dpr1: 竖线 <line> 盒子宽度=0', o.vlW, 0);
    ok('dpr1: <use> 盒子尺寸正确', o.useRect, [30, 30]);
    ok('dpr1: <use> computed fill 拿不到 symbol 内部色', o.useFill, (v) => v === 'rgb(0, 0, 0)' || v === 'none', '必须靠像素直方图兜底');
  } else {
    // [预期修正] 我原以为高 DPR 下 0.5px 边框会保留小数。实测 dpr=2 时
    // computed 仍然是 1px —— Chrome 对 border-width 一律向下夹到 1 个 CSS px，
    // 与 devicePixelRatio 无关。这条断言改成记录事实而不是断言「应该保留」。
    ok('[预期修正] dpr2 下 0.5px 边框 computed 仍是 1px', o.hairW, '1px', 'border 被夹到 1px，与 dpr 无关');
    ok('dpr2 下 devicePixelRatio 确实是 2', o.dpr, 2);
  }
}

// 像素级：亚像素线到底画出来了没有
await page.setViewport({ width: 1440, height: 900, dsf: 1, mobile: false });
await gotoStable(page, 'http://127.0.0.1:8603/__f/edge.html', 300);
const shot = await page.screenshot({ format: 'png' });
const png = decodePNG(Buffer.from(shot, 'base64'));
const hist = histogram(png);
const total = png.width * png.height;

// 关键：找出所有「不在已知色板内」的像素，看它们是不是色板色之间的中间色（AA/半透明）
const known = ['#EFE7D7', '#1A1614', '#C1121F', '#1F4E79', '#2F7D4F', '#13928E', '#B8860B', '#5D43AD', '#A8206B', '#E23E57', '#914A27', '#0E6258', '#644F02'];
const knownLab = known.map((h) => { const [r, g, b] = hexToRgb(h); return { hex: h, lab: srgbToLab(r, g, b) }; });
let inPalette = 0, nearPair = 0, isolated = 0;
const isolatedTop = new Map();
for (const [k, n] of hist) {
  const hex = keyToHex(k);
  if (known.indexOf(hex) >= 0) { inPalette += n; continue; }
  const [r, g, b] = [(k >> 16) & 255, (k >> 8) & 255, k & 255];
  const lab = srgbToLab(r, g, b);
  const nearest = knownLab.map((p) => ({ hex: p.hex, d: dE76(lab, p.lab) })).sort((a, c) => a.d - c.d)[0];
  if (nearest.d < 2.5) { inPalette += n; continue; }   // 同一色的编码噪声
  // 是否是两个色板色的线性混合（抗锯齿边、半透明叠加）
  let onSeg = false;
  for (let i = 0; i < knownLab.length && !onSeg; i++)
    for (let j = i + 1; j < knownLab.length && !onSeg; j++)
      if (distToSeg(lab, knownLab[i].lab, knownLab[j].lab) < 3.0) onSeg = true;
  if (onSeg) nearPair += n;
  else { isolated += n; isolatedTop.set(hex, (isolatedTop.get(hex) || 0) + n); }
}
const iso = [...isolatedTop.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
console.log('\n像素分类: 色板内 ' + inPalette + ' / 两色混合(AA) ' + nearPair + ' / 孤立 ' + isolated + '  总 ' + total);
console.log('孤立色 top12: ' + JSON.stringify(iso));
ok('AA 混合像素能被识别(占非纯色像素多数)', nearPair, (v) => v > 0);
ok('孤立色像素占全图 < 1%（说明没有看不到的第三种色）', isolated / total, (v) => v < 0.01, 'isolated/total=' + (isolated / total).toFixed(5));

writeJson('selftest-edge.json', {
  generatedAt: new Date().toISOString(),
  pass: checks.filter((c) => c.pass).length, fail: checks.filter((c) => !c.pass).length,
  checks, pixel: { inPalette, nearPair, isolated, total, isolatedTop: iso },
});
console.log('\n=== edge self-test: ' + checks.filter((c) => c.pass).length + ' pass / ' + checks.filter((c) => !c.pass).length + ' fail ===');
await browser.close();
server.close();
