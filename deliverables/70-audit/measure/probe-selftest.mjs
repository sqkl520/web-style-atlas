// 自检 1：把每个测量原语放在「已知答案」的 fixture 上验证。
// 每个断言都写了期望值，失败即说明测量手段不可信 —— 这一步先于任何 30 案测量。
//
// 第 2 版修正：第一版有 13 个 FAIL，逐个人工复核后分成两类：
//   (a) 测量真的错了 → 改 inpage.mjs（见该文件顶部 R1–R4 注释）
//   (b) 我的**期望值**写错了 → 修断言。这类尤其重要，因为它们正是
//       「凭直觉以为浏览器会怎样」造成的误判，必须留证据。
//   下面凡属 (b) 的断言都加了 [预期修正] 标记并写明真实行为。
import { startServer, launch, gotoStable, writeJson, inject, HERE } from './lib.mjs';
import { HELPERS } from './inpage.mjs';
import { COLLECT } from './collect.mjs';
import { decodePNG, histogram, keyToHex, hexToRgb, srgbToLab } from './png.mjs';
import { analyzePixels, rasterMask } from './classify.mjs';
import { join } from 'node:path';

const FIXTURE = `<!doctype html><html><head><meta charset="utf-8"><style>
  :root { --known: #C1121F; --known2: rgb(18, 52, 86); --bord: 1px solid #123456;
          --shadowc: rgba(200, 30, 40, .5); }
  html, body { margin: 0; background: #EFE7D7; color: #1A1614; font: 16px/1.5 monospace; }
  #a { color: #C1121F; }
  /* 注意：#b 的背景色必须与 #c 的边框色不同，否则「边框面积」断言会被背景面积污染
     —— 第一版就是这么误报的，记在报告自我纠错里。 */
  #b { background-color: rgb(47, 125, 79); width: 200px; height: 100px; }
  #c { border: var(--bord); width: 100px; height: 50px; }
  #wrap { width: 180px; font-size: 13px; line-height: 2.4; color: #7B612C; }
  #d { border-top: 0.5px solid #6E6A5E; width: 100px; height: 40px; }
  #e { box-shadow: 0 0 0 4px rgba(200, 30, 40, .5), 0 2px 8px #0B0B0F; width: 60px; height: 30px; }
  #f::before { content: "\\2713"; color: #2FA84F; }
  #g::after  { content: ""; position: absolute; width: 24px; height: 24px; background: #A8206B; }
  #g { position: relative; }
  #h { color: var(--known); }
  #i { color: var(--nope-undefined); }
  #j { background: linear-gradient(90deg, #B5D626 0 50%, #0E100D 50% 100%); width: 80px; height: 40px; }
  #k { color: oklch(0.62 0.19 25); }
  #l { color: color-mix(in srgb, #C1121F 50%, #EFE7D7); }
  #m { opacity: 0; }
  #n { display: none; color: #00E676; }
  #o { width: 0; height: 0; background: #FF00FF; }
  #p { color: transparent; background: rgba(0,0,0,0); width: 10px; height: 10px; }
  #q { border-left: 3px solid #914A27; width: 50px; height: 50px; }
  .txt { font-size: 13px; }
  svg { display: block; }
  #big { position: absolute; left: 0; top: 300px; width: 1px; height: 1px; }
</style></head><body>
<p id="a">红色文字样本，长度超过二十个字符以便被判定为正文文本，用来验证文字色归属。</p>
<div id="b"></div><div id="c"></div><div id="d"></div><div id="e"></div>
<span id="f">勾</span><span id="g">块</span>
<p id="h">变量色文字，长度也超过二十个字符以进入正文统计，验证 var 展开后 computed 是否可读。</p>
<p id="i">未定义变量文字，长度也超过二十个字符，验证回落行为而非空串。</p>
<div id="j"></div><div id="k">oklch 文字</div><div id="l">color-mix 文字</div>
<div id="m" style="width:20px;height:20px;background:#FF0000"></div>
<div id="n">hidden</div><div id="o"></div><div id="p"></div><div id="q"></div>
<svg width="120" height="60" viewBox="0 0 120 60">
  <defs><linearGradient id="grad1"><stop offset="0" stop-color="#5D43AD"/><stop offset="1" stop-color="#E6EDF2"/></linearGradient></defs>
  <rect id="s1" x="0" y="0" width="40" height="30" fill="#D32029"/>
  <rect id="s2" x="40" y="0" width="40" height="30" fill="url(#grad1)"/>
  <path id="s3" d="M0 40 L60 40" stroke="#3E3A34" stroke-width="2" fill="none"/>
  <circle id="s4" cx="90" cy="45" r="10" fill="#00E676" stroke="#12181D" stroke-width="1"/>
  <g id="s5" fill="#FDEE00"><rect x="0" y="50" width="20" height="8"/></g>
</svg>
<svg width="40" height="40"><symbol id="sym1" viewBox="0 0 10 10"><rect width="10" height="10" fill="#2E6B5E"/></symbol>
  <use id="s6" href="#sym1" x="0" y="0" width="20" height="20"/></svg>
<!-- 回归用例：<symbol> 里带一个面积巨大、颜色醒目的模板色，它一个像素都不该算进来。
     第一版把 symbol 子元素当可见（checkVisibility 对它返回 true），S19 因此把 #000000
     算成 58.69% 面积占比。 -->
<svg class="sprite" width="0" height="0" style="position:absolute;overflow:hidden">
  <symbol id="sym2" viewBox="0 0 10 10"><rect id="tplrect" width="10" height="10" fill="#7C3AED"/></symbol>
  <defs><g id="tplg"><rect width="10" height="10" fill="#0891B2"/></g></defs>
</svg>
<span class="txt" id="t1">十三像素文字一段，用来量字号与墨迹面积，字数够二十个字符。</span>
<p id="wrap">这个段落用 2.4 倍行高，盒子高度会明显大于文字墨迹高度，用来验证文字色面积取的是墨迹而非盒子。</p>
</body></html>`;

const server = await startServer(8601, new Map([['/__fixture/selftest.html', FIXTURE]]));
const browser = await launch();
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, mobile: false });
await gotoStable(page, 'http://127.0.0.1:8601/__fixture/selftest.html', 300);

const checks = [];
function ok(name, got, want, note) {
  const pass = typeof want === 'function' ? want(got) : JSON.stringify(got) === JSON.stringify(want);
  checks.push({ name, got, want: typeof want === 'function' ? String(want) : want, pass, note: note || '' });
  console.log((pass ? 'PASS ' : 'FAIL ') + name + '  got=' + JSON.stringify(got) + (pass ? '' : '   want=' + JSON.stringify(typeof want === 'function' ? String(want) : want)));
}

await page.eval(HELPERS);
const prim = await page.eval(`(() => {
  const M = window.__M;
  const cs = (id) => getComputedStyle(document.getElementById(id));
  const out = {};
  out.a_color = cs('a').color;
  out.c_borderSides = [cs('c').borderTopWidth, cs('c').borderTopColor, cs('c').borderTopStyle];
  out.c_borderShorthandValue = cs('c').border;
  out.d_topW = cs('d').borderTopWidth;
  out.d_topC = cs('d').borderTopColor;
  out.d_rectH = document.getElementById('d').getBoundingClientRect().height;
  out.d_computedBorder = cs('d').borderTop;
  out.e_shadow = cs('e').boxShadow;
  out.f_before_content = getComputedStyle(document.getElementById('f'), '::before').content;
  out.f_before_color = getComputedStyle(document.getElementById('f'), '::before').color;
  out.g_after_bg = getComputedStyle(document.getElementById('g'), '::after').backgroundColor;
  out.g_after_w = getComputedStyle(document.getElementById('g'), '::after').width;
  out.g_after_h = getComputedStyle(document.getElementById('g'), '::after').height;
  out.h_color = cs('h').color;
  out.i_color = cs('i').color;
  out.i_varRaw = cs('i').getPropertyValue('--nope-undefined');
  out.j_bgImage = cs('j').backgroundImage;
  out.k_color = cs('k').color;
  out.l_color = cs('l').color;
  out.s1_fill = cs('s1').fill;
  out.s2_fill = cs('s2').fill;
  out.s3_stroke = cs('s3').stroke;
  out.s3_strokeWidth = cs('s3').strokeWidth;
  out.s3_vis = M.vis(document.getElementById('s3'));
  out.s3_boxH = document.getElementById('s3').getBoundingClientRect().height;
  out.s3_ink = M.svgInk(document.getElementById('s3'), 2, false);
  out.s4_stroke = cs('s4').stroke;
  out.s5_childComputed = getComputedStyle(document.querySelector('#s5 rect')).fill;
  out.s6_useFill = cs('s6').fill;
  out.n1 = M.norm('#C1121F');
  out.n2 = M.norm('oklch(0.62 0.19 25)');
  out.n3 = M.norm('rgba(0,0,0,0)');
  out.n4 = M.norm('transparent');
  out.n5 = M.norm('currentColor');
  out.n6 = M.norm('url(#grad1)');
  out.n7 = M.norm('rgba(200, 30, 40, 0.5)');
  out.t1_ink = M.textRects(document.getElementById('t1')).reduce((s,r)=>s+r.w*r.h,0);
  out.t1_rect = M.rect(document.getElementById('t1')).area;
  out.t1_font = cs('t1').fontSize;
  out.wrap_ink = M.textRects(document.getElementById('wrap')).reduce((s,r)=>s+r.w*r.h,0);
  out.wrap_rect = M.rect(document.getElementById('wrap')).area;
  out.shadowParts = M.parseShadows(cs('e').boxShadow);
  out.isRasterImg = M.rasterKind(document.createElement('img'));
  return out;
})()`);

ok('computed color 可读', prim.a_color, 'rgb(193, 18, 31)');
ok('var() 简写 border 的分项可读', prim.c_borderSides, ['1px', 'rgb(18, 52, 86)', 'solid']);
// [预期修正] 第一版以为 cs.border 读不到。实测 Chrome 会给 "1px solid rgb(...)"。
// 但仍不能用它做测量：多值 color 简写、border-image 会让它变成空串 —— 所以代码里坚持读分项。
ok('[预期修正] cs.border 简写其实可读', prim.c_borderShorthandValue, '1px solid rgb(18, 52, 86)');
// [预期修正] 0.5px border 在 dpr1 下被 Chrome 夹成 1px（不是 0.5px）。
ok('[预期修正] 0.5px border 被夹到 1px', prim.d_topW, '1px');
ok('[预期修正] tape 高度因此是 41px 而非 40.5px', prim.d_rectH, 41);
ok('边框颜色可读', prim.d_topC, 'rgb(110, 106, 94)');
ok('多色 boxShadow 原文', prim.e_shadow, (v) => v.indexOf('rgba(200, 30, 40, 0.5)') >= 0 && v.indexOf('rgb(11, 11, 15)') >= 0);
ok('boxShadow 可拆成 2 段', prim.shadowParts.length, 2);
// [预期修正] content 返回的是已解码字符 "✓"，不是 CSS 转义原文 "\2713"。
ok('[预期修正] ::before content 已解码为字符', prim.f_before_content, '"✓"');
ok('::before color 可读', prim.f_before_color, 'rgb(47, 168, 79)');
ok('::after backgroundColor 可读', prim.g_after_bg, 'rgb(168, 32, 107)');
ok('::after 尺寸可读(used value)', [prim.g_after_w, prim.g_after_h], ['24px', '24px']);
ok('var(--known) 展开为颜色', prim.h_color, 'rgb(193, 18, 31)');
ok('未定义 var 回落 inherit 而非空串', prim.i_color, 'rgb(26, 22, 20)');
ok('未定义 var 取值本身为空', prim.i_varRaw, '');
ok('linear-gradient 文末可解析', prim.j_bgImage, (v) => /rgb\(181, 214, 38\)/.test(v) && /rgb\(14, 16, 13\)/.test(v));
ok('oklch computed 保持 oklch 形式', prim.k_color, (v) => v.indexOf('oklch') === 0);
ok('oklch 能被 norm 归一为 hex', prim.n2, (v) => v && /^#[0-9A-F]{6}$/.test(v.hex));
ok('color-mix computed 归一为 color(srgb ...)', prim.l_color, (v) => v.indexOf('color(srgb') === 0);
ok('color() 能被 norm 归一为 hex', await page.eval(`window.__M.norm(getComputedStyle(document.getElementById('l')).color).hex`), (v) => /^#[0-9A-F]{6}$/.test(v));
ok('SVG fill 可读', prim.s1_fill, 'rgb(211, 32, 41)');
ok('SVG fill=url(#grad) 保留 url 形式', prim.s2_fill, (v) => v.indexOf('url(') === 0);
ok('SVG stroke 可读', prim.s3_stroke, 'rgb(62, 58, 52)');
ok('SVG stroke-width 可读', prim.s3_strokeWidth, '2px');
// [关键] 水平 path 的盒子高度=0，但它是可见的。靠 stroke 判定。
ok('[关键] 水平 stroke 路径盒子高=0 却判为可见', [prim.s3_boxH, prim.s3_vis], [0, true]);
ok('svgInk 对开放路径按路径长估面积', prim.s3_ink.strokeArea, (v) => v > 0);
ok('SVG 圆的 stroke 可读', prim.s4_stroke, 'rgb(18, 24, 29)');
ok('<g> 的 fill 继承到子元素 computed', prim.s5_childComputed, 'rgb(253, 238, 0)');
ok('<use> 实例 computed fill 拿不到 symbol 内色(需像素兜底)', prim.s6_useFill, (v) => v === 'rgb(0, 0, 0)' || v === 'none');
ok('norm(#hex)', prim.n1, (v) => v && v.hex === '#C1121F' && v.a === 1);
ok('norm(rgba 全透明) alpha=0', prim.n3, (v) => v.a === 0 && v.hex === '#000000');
ok('norm(transparent) alpha=0', prim.n4, (v) => v && v.a === 0);
ok('norm(currentColor) 显式标记', prim.n5, (v) => v && v.currentColor === true);
ok('norm(url()) 标记 unparsed', prim.n6, (v) => v && v.unparsed === true);
ok('norm(rgba .5) 不丢色阶', prim.n7, (v) => v.r === 200 && v.g === 30 && v.b === 40 && v.a === 0.5, 'canvas 往返会读成 199');
ok('文字墨迹面积 < 元素盒子面积(2.4 行高)', [prim.wrap_ink, prim.wrap_rect], (v) => v[0] > 0 && v[0] < v[1] * 0.8);
ok('13px 字号可读', prim.t1_font, '13px');

// ---------- 收集器级 ----------
const out = await page.eval(HELPERS + COLLECT);
const byHex = new Map(out.colors.map((c) => [c.hex, c]));
const hexes = [...byHex.keys()];
const sumArea = (h) => (byHex.get(h) ? byHex.get(h).area : 0);

ok('收集到 #C1121F(文字色)', !!byHex.get('#C1121F'), true);
ok('#C1121F 标记为 color 属性', byHex.get('#C1121F').props.color >= 1, true);
ok('收集到 #123456(var 简写边框)', !!byHex.get('#123456'), true);
// #123456 只出现在 #c 的边框上（fixture 现已确保背景用别的色），所以它必须只拿到周长面积。
ok('#123456 面积按周长算(远小于盒子 100×50)', sumArea('#123456'), (v) => v > 0 && v < 100 * 50 * 0.2, '四边合计≈300px×1=300');
ok('收集到 0.5px 线色 #6E6A5E', !!byHex.get('#6E6A5E'), true);
ok('#6E6A5E 面积≈100px(细线不被放大成块)', sumArea('#6E6A5E'), (v) => v > 0 && v < 1000, '100×1=100');
ok('boxShadow 两色都收到', [!!byHex.get('#C81E28'), !!byHex.get('#0B0B0F')], (v) => v[0] && v[1]);
ok('::before 色 #2FA84F 收到', !!byHex.get('#2FA84F'), true);
ok('::after 色 #A8206B 收到', !!byHex.get('#A8206B'), true);
ok('gradient 两色都收到', [!!byHex.get('#B5D626'), !!byHex.get('#0E100D')], (v) => v[0] && v[1]);
ok('transparent 背景被过滤', (byHex.get('#000000') ? (byHex.get('#000000').props.backgroundColor || 0) : 0), 0);
ok('opacity:0 的红色被过滤', !byHex.get('#FF0000'), true);
ok('零尺寸元素被过滤(无 #FF00FF)', !byHex.get('#FF00FF'), true);
ok('SVG fill #D32029 收到', !!byHex.get('#D32029'), true);
ok('[关键] SVG stroke #3E3A34 收到(水平线)', !!byHex.get('#3E3A34'), true);
ok('SVG gradient stops 收到', [!!byHex.get('#5D43AD'), !!byHex.get('#E6EDF2')], (v) => v[0] && v[1]);
ok('SVG 圆 fill #00E676 收到', !!byHex.get('#00E676'), true);
ok('SVG 圆 stroke #12181D 收到', !!byHex.get('#12181D'), true);
// 回归：symbol/defs 里的模板色绝不能出现
ok('[回归] <symbol> 模板色 #7C3AED 未被计入', !byHex.get('#7C3AED'), true);
ok('[回归] <defs> 模板色 #0891B2 未被计入', !byHex.get('#0891B2'), true);
/* 回归：<svg> / <g> 根元素的 computed fill 是初始值 rgb(0,0,0)，
   但它们自己不画填充。第一版把它们的 bbox 当 fill 面积，
   S19 因此凭空多出占屏 58.69% 的 #000000（像素级是 0）。
   这个 fixture 里 <svg width=120 height=60> 的 fill 默认就是黑色，
   断言它带来的面积必须远小于它的 bbox 面积 7200。 */
ok('[回归] <svg> 根元素的默认黑 fill 不按 bbox 记面积', (byHex.get('#000000') ? byHex.get('#000000').area : 0), (v) => v < 7200 * 0.5, 'bbox=7200');
ok('正文文本标记生效', byHex.get('#C1121F').onBodyText >= 1, true);
ok('伪元素面积用 pseudo-box 而非宿主', byHex.get('#A8206B').areaBasis['pseudo-box'] >= 1, true);
ok('#A8206B 面积≈24×24=576', sumArea('#A8206B'), (v) => v >= 500 && v <= 700);

// ---------- 像素级交叉验证（声明 vs 实际绘制） ----------
const probeShot = await page.screenshot({ format: 'png' });
const png = decodePNG(Buffer.from(probeShot, 'base64'));
const hist = histogram(png);
const top = [...hist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, n]) => [keyToHex(k), n]);
console.log('像素 top12:', JSON.stringify(top));
const declared = hexes.concat(['#000000']);
const rasters = await page.eval(`(() => {
  const M = window.__M; const out = [];
  document.querySelectorAll('img,svg').forEach((el) => { if (el.tagName.toLowerCase() === 'img') { const r = el.getBoundingClientRect(); out.push({x:r.x,y:r.y,w:r.width,h:r.height}); } });
  return out;
})()`);
const px = analyzePixels(png, declared, rasterMask(png, rasters, 1));
console.log('像素分类:', JSON.stringify(px.kinds), ' 孤立:', JSON.stringify(px.isolated.slice(0, 8)));
ok('像素级能确认 #C1121F 真的画出来了', (px.perHex.get('#C1121F') || 0) > 0, true);
ok('像素级能确认 ::after 的 #A8206B 真的画出来了', (px.perHex.get('#A8206B') || 0) > 0, true);
ok('像素级能确认 SVG fill #D32029 真的画出来了', (px.perHex.get('#D32029') || 0) > 0, true);
// [预期修正] 这条断言原本写成「perHex 里有 #2E6B5E」，但那只有在 symbol 子元素
// 被错误当成可见元素收集时才成立 —— 也就是靠着 bug 才通过的。排除模板之后，
// #2E6B5E 不再出现在元素级声明里，于是它在像素级被判为「孤立色」。
// 这恰好证明像素轨抓得到元素轨抓不到的东西，所以正确的断言是「孤立色里有它」。
const isoMap = new Map(px.isolated);
ok('[预期修正] <use> 内部 symbol 色在像素级被抓到（元素级拿不到）', isoMap.get('#2E6B5E') || 0, (v) => v >= 380, '20×20=400 应几乎全中');
ok('孤立色占比 < 2%', px.kinds.isolated / px.counted, (v) => v < 0.02);

const report = {
  generatedAt: new Date().toISOString(),
  pass: checks.filter((c) => c.pass).length, fail: checks.filter((c) => !c.pass).length,
  checks, pixelTop: top, pixelKinds: px.kinds, isolated: px.isolated.slice(0, 20),
  collectorKeys: hexes.length,
};
writeJson('selftest.json', report);
console.log('\n=== self-test: ' + report.pass + ' pass / ' + report.fail + ' fail ===');
if (report.fail) console.log('FAILED: ' + checks.filter((c) => !c.pass).map((c) => c.name).join(' | '));

await browser.close();
server.close();
process.exit(report.fail ? 1 : 0);
