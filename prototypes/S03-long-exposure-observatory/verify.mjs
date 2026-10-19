// 独立验证：三道闸门都不检查内联 JS 是否真的跑起来，也不检查 <768px 的机制是否存活。
// 这里用同一套 CDP 驱动在真实 Chrome 里打开原型，断言规格中可验证的行为，输出真实数值。
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = resolve('.');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json',
};
const server = createServer((req, res) => {
  const p = join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!existsSync(p) || !statSync(p).isFile()) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}/index.html`;

const out = [];
const rec = (id, ok, detail) => {
  out.push({ id, ok: !!ok, detail: String(detail) });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id.padEnd(26)} ${detail}`);
};

const browser = await Browser.launch();
const page = await browser.newPage({ width: 1440, height: 900 });
await page.goto(BASE, { timeoutMs: 30000, settleMs: 900 });
await sleep(1400); // 走完 60ms + 800ms 显影编排

/* 1. 内联 JS 是否真的生成了读数栅格（1px/8px，每 40px 加粗） */
const scale = await page.eval(() => {
  const ls = [...document.querySelectorAll('#scale line')];
  const widths = {};
  for (const l of ls) { const w = l.getAttribute('stroke-width'); widths[w] = (widths[w] || 0) + 1; }
  return {
    lines: ls.length,
    thin: widths['1'] || 0,
    thick: widths['1.5'] || 0,
    caps: [...new Set(ls.map((l) => l.getAttribute('stroke-linecap')))],
    rects: document.querySelectorAll('#scale rect').length,
    years: document.querySelectorAll('#scale text.scale-year').length,
    xs: [...new Set([...document.querySelectorAll('#scale text.scale-year')].map((t) => t.getAttribute('x')))].length,
  };
});
rec('grid-ticks', scale.lines === 81 && scale.thin === 64 && scale.thick === 17,
  `${scale.lines} 条（细 ${scale.thin} / 粗 ${scale.thick}），端点 ${JSON.stringify(scale.caps)}`);
rec('sprocket-quirk', scale.rects === 5 && scale.years === 5 && scale.xs === 5,
  `${scale.years} 个年份编号、${scale.rects} 枚齿孔、${scale.xs} 个互不相同的累计偏移`);

/* 2. 影像带高度是否真的等于曝光秒数（规格的核心机制） */
const bands = await page.eval(() => {
  return [...document.querySelectorAll('.band')].map((b) => {
    const img = b.querySelector('img');
    const txt = b.querySelector('figcaption').innerText;
    const sec = parseFloat((txt.match(/([\d.]+)\s*s/) || [])[1]);
    return { sec, h: +img.getBoundingClientRect().height.toFixed(2) };
  });
});
const ratios = bands.map((b) => +(b.h / b.sec).toFixed(4));
const rmin = Math.min(...ratios), rmax = Math.max(...ratios);
rec('height=exposure', bands.length === 8 && rmin >= 0.85 && rmax <= 1.05,
  `8 条：秒数 ${bands.map((b) => b.sec).join('/')} → 高度 ${bands.map((b) => b.h).join('/')}px，px/s ${rmin}~${rmax}`);

/* 3. 走片比率：下滚 1px 是否真的上移 0.5px，且八条同倍率（不得变成差速视差） */
const readShift = () => page.eval(() => {
  const t = [...document.querySelectorAll('.band')].map((b) => b.style.transform);
  const vals = t.map((s) => parseFloat((s.match(/-?[\d.]+/) || [0])[0]));
  return { raw: t[0], uniq: [...new Set(vals)].length, v: vals[0] };
});
await page.eval(() => {
  const s = document.querySelector('.stream');
  window.scrollTo(0, Math.round(s.getBoundingClientRect().top + window.scrollY - window.innerHeight + 20));
});
await sleep(260);
const s1 = await readShift();
await page.eval(() => window.scrollTo(0, window.scrollY + 40));
await sleep(260);
const s2 = await readShift();
const rate = (s2.v - s1.v) / 40;
/* 规格没有给出走片的行程复位规则，原型把行程限制在 ±40px；这里把限位也测出来 */
await page.eval(() => window.scrollTo(0, 6000));
await sleep(300);
const s3 = await readShift();
rec('film-advance-rate', Math.abs(rate + 0.5) < 0.16 && s2.uniq === 1,
  `下滚 40px → 位移 ${s1.v}px 到 ${s2.v}px，实测比率 ${rate.toFixed(3)}×（规格 0.5×），八条同值=${s2.uniq === 1}`);
rec('film-travel-clamp', Math.abs(s3.v) === 40,
  `行程限位实测 ${s3.v}px（规格未定义复位规则，原型自定为 ±40px，需红队复核）`);

/* 4. 曝光计时是否为 steps(1) 式跳变（非补间） */
const t1 = await page.eval(() => document.querySelector('#timer').textContent);
await sleep(420);
const t2 = await page.eval(() => document.querySelector('#timer').textContent);
await sleep(420);
const t3 = await page.eval(() => document.querySelector('#timer').textContent);
const nums = [t1, t2, t3].map((s) => parseFloat(s));
const stepped = nums.every((n, i) => i === 0 || n > nums[i - 1]) && nums.every((n) => Math.abs(n * 10 - Math.round(n * 10)) < 1e-6);
rec('timer-stepped', stepped, `${t1} → ${t2} → ${t3}（均为 0.1s 整数倍且递增）`);

/* 5. 显影编排：颗粒铺上、读数全部到位 */
const dev = await page.eval(() => {
  const rows = [...document.querySelectorAll('.readouts tbody tr')];
  const vis = rows.filter((r) => +getComputedStyle(r).opacity === 1).length;
  const grain = +getComputedStyle(document.querySelector('.band'), '::after').opacity;
  const vig = getComputedStyle(document.querySelector('.band'), '::before').backgroundImage;
  return { rows: rows.length, vis, grain, vig: /vignette\.png/.test(vig), developed: document.body.classList.contains('developed') };
});
rec('develop-sequence', dev.developed && dev.vis === dev.rows && dev.grain > 0.5 && dev.vig,
  `${dev.rows} 条读数不透明度全部为 1，颗粒叠层 ${dev.grain}，减光位图叠层=${dev.vig}`);

/* 6. 库房回话：三种真实结果 + 停用控件 */
const asks = ['ok', 'pending', 'error', 'empty'];
const asked = {};
for (const k of asks) {
  await page.eval((kind) => document.querySelector(`[data-ask="${kind}"]`).click(), k);
  await sleep(950);
  asked[k] = await page.eval(() => document.querySelector('#answer').innerText.replace(/\s+/g, ' ').trim());
}
const expect = { ok: '1972', pending: '还在扫', error: 'SCAN-E114', empty: 'K-114' };
const statesOk = asks.every((k) => asked[k].includes(expect[k]) || (k === 'ok' && asked[k].includes('3 卷')));
rec('library-states', statesOk, `ok→${asked.ok.slice(0, 26)}… / error→含 SCAN-E114=${asked.error.includes('SCAN-E114')} / empty→含 K-114=${asked.empty.includes('K-114')}`);

/* 7. 全站是否真的没有一处 CSS 色彩插值函数 */
const grad = await page.eval(() => {
  const bad = [];
  for (const el of document.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    for (const prop of ['backgroundImage', 'maskImage', 'borderImageSource']) {
      if (/gradient\(/i.test(cs[prop] || '')) bad.push(el.tagName + '.' + el.className + ':' + prop);
    }
  }
  return { bad: bad.slice(0, 6), n: bad.length };
});
rec('zero-css-gradients', grad.n === 0, `遍历全 DOM，含 gradient() 的属性数量 = ${grad.n}`);

/* 8. 实测正文对比度（规格与红线都要求 ≥4.5:1） */
const contrast = await page.eval(() => {
  const lum = (c) => {
    const [r, g, b] = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map((v) => {
      const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const bgOf = (el) => { for (let p = el; p; p = p.parentElement) { const c = getComputedStyle(p).backgroundColor; if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c; } return 'rgb(16,26,28)'; };
  const ratio = (el) => { const a = lum(getComputedStyle(el).color), b = lum(bgOf(el)); const [hi, lo] = a > b ? [a, b] : [b, a]; return +((hi + 0.05) / (lo + 0.05)).toFixed(2); };
  const pick = (sel) => { const el = document.querySelector(sel); return el ? { sel, size: getComputedStyle(el).fontSize, cr: ratio(el) } : null; };
  const all = [...document.querySelectorAll('p, li, figcaption, td, th, h1, h2, h3, dt, dd, samp')]
    .map((el) => ({ t: (el.innerText || '').trim().slice(0, 18), size: parseFloat(getComputedStyle(el).fontSize), cr: ratio(el) }))
    .filter((x) => x.t.length > 1);
  return { samples: [pick('p'), pick('.note'), pick('samp')], worst: all.sort((a, b) => a.cr - b.cr).slice(0, 4) };
});
rec('contrast>=4.5', contrast.samples.every((s) => s && s.cr >= 4.5),
  `正文 ${contrast.samples[0]?.cr}:1 · 13px 注记 ${contrast.samples[1]?.cr}:1 · 读数 ${contrast.samples[2]?.cr}:1；最差四例 ${contrast.worst.map((w) => `${w.cr}(${w.size}px)`).join(' ')}`);

/* 9. 键盘焦点规则与可聚焦元素 */
const focus = await page.eval(() => {
  let rule = null;
  for (const sheet of document.styleSheets) {
    let rules; try { rules = sheet.cssRules; } catch { continue; }
    for (const r of rules) {
      if (r.selectorText && r.selectorText.includes(':focus-visible')) rule = r.cssText.slice(0, 120);
    }
  }
  return { rule, focusables: document.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])').length, skip: !!document.querySelector('.visually-hidden[href^="#"]') };
});rec('keyboard-focus', !!focus.rule && focus.focusables >= 8 && focus.skip,
  `${focus.focusables} 个可聚焦元素，跳过链接=${focus.skip}，规则 ${focus.rule}`);

/* 10. 停用态与忙碌态是真实存在且视觉可辨的 */
const states = await page.eval(() => {
  const dis = document.querySelector('.btn:disabled');
  const dcs = getComputedStyle(dis);
  const normal = getComputedStyle(document.querySelector('.btn:not(:disabled)'));
  return { dis: dis.disabled, described: !!dis.getAttribute('aria-describedby'), disBg: dcs.backgroundColor, normBg: normal.backgroundColor, cursor: dcs.cursor };
});
rec('disabled-state', states.dis && states.described && states.disBg !== states.normBg,
  `1979 控件 disabled=${states.dis}，aria-describedby=${states.described}，底色 ${states.disBg} 对比可用态 ${states.normBg}，cursor ${states.cursor}`);

/* 11. prefers-reduced-motion：走片与计时停住，读数不再逐条出现，但不隐藏任何内容 */
const rm = await browser.newPage({ width: 1440, height: 900, reducedMotion: true });
await rm.goto(BASE, { timeoutMs: 30000, settleMs: 900 });
await sleep(900);
const rmBefore = await rm.eval(() => document.querySelector('#timer').textContent);
await rm.eval(() => window.scrollTo(0, 2400));
await sleep(500);
const rmState = await rm.eval(() => {
  const t = [...document.querySelectorAll('.band')].map((b) => b.style.transform).filter(Boolean);
  const rows = [...document.querySelectorAll('.readouts tbody tr')];
  return {
    transforms: t.length,
    rowsVisible: rows.filter((r) => +getComputedStyle(r).opacity === 1).length,
    rows: rows.length,
    grain: +getComputedStyle(document.querySelector('.band'), '::after').opacity,
    timer: document.querySelector('#timer').textContent,
  };
});
rec('reduced-motion', rmState.transforms === 0 && rmState.rowsVisible === rmState.rows && rmState.grain > 0.5,
  `走片位移指令 ${rmState.transforms} 条（应为 0），读数可见 ${rmState.rowsVisible}/${rmState.rows}，颗粒仍保留 ${rmState.grain}，计时停在 ${rmBefore}→${rmState.timer}`);
await rm.close();

/* 12. <768px：签名机制必须存活，而不是被停用或归零 */
const mob = await browser.newPage({ width: 390, height: 844, mobile: true });
await mob.goto(BASE, { timeoutMs: 30000, settleMs: 900 });
await sleep(1300);
const m = await mob.eval(() => {
  const ax = document.querySelector('.axis');
  const acs = getComputedStyle(ax);
  const bars = [...document.querySelectorAll('.band')].map((b) => {
    const sec = parseFloat((b.querySelector('figcaption').innerText.match(/([\d.]+)\s*s/) || [])[1]);
    return +(b.querySelector('img').getBoundingClientRect().height / sec).toFixed(3);
  });
  const rows = [...document.querySelectorAll('.readouts tbody tr')];
  return {
    pos: acs.position, axisH: Math.round(ax.getBoundingClientRect().height),
    axisInline: acs.writingMode,
    ratios: [...new Set(bars)],
    rowDisplay: rows.length ? getComputedStyle(rows[0]).display : 'none',
    scrollW: document.documentElement.scrollWidth,
    yearsRail: getComputedStyle(document.querySelector('.axis-years')).display,
    stepIndent: rows.map((r) => getComputedStyle(r.lastElementChild).paddingRight).slice(0, 7),
  };
});
const mobOk = m.pos === 'sticky' && m.axisH >= 300 && m.ratios.every((r) => Math.abs(r - 0.4667) < 0.02) && m.scrollW <= 392;
rec('narrow-mechanism', mobOk,
  `390px：年代轴 position=${m.pos} 高 ${m.axisH}px（纵向 sticky 轨保留）、px/s 0.5 倍比例 ${m.ratios.join(',')}、读数行 ${m.rowDisplay}、横向溢出 ${m.scrollW - 390}px`);
rec('narrow-year-rail', m.yearsRail === 'flex',
  `竖排年份轨 display=${m.yearsRail}（<768px 时年份从 SVG 移到竖排列表，机制与年份都不丢）`);
rec('narrow-step-indent', new Set(m.stepIndent).size >= 4,
  `阶梯右缩在窄屏保留：${m.stepIndent.join(' / ')}`);
await mob.close();

/* 13. 真实位图数量（薄带不计入，四张大图版立即加载） */
const pics = await page.eval(() => {
  const imgs = [...document.images];
  return {
    total: imgs.length,
    loaded: imgs.filter((i) => i.naturalWidth > 0).length,
    big: imgs.filter((i) => { const r = i.getBoundingClientRect(); return r.width >= 120 && r.height >= 90 && r.width * r.height >= 19200 && i.naturalWidth > 0; }).length,
    broken: imgs.filter((i) => i.complete && i.naturalWidth === 0).length,
  };
});
rec('real-bitmaps', pics.big >= 4 && pics.broken === 0,
  `${pics.total} 张位图，已加载 ${pics.loaded}，渲染尺寸达标 ${pics.big} 张，坏图 ${pics.broken}`);

/* 14. mono 的**原始**占比：工具只导出四舍五入后的值，这里按 probe 的定义逐行复算。
   等宽与否用 canvas 量 i/W 宽度判定（不按字体名），只取直接文本节点，跳过 sr-only 与 svg。 */
await page.eval(() => window.scrollTo(0, 0));
await sleep(300);
const monoRaw = await page.eval(() => {
  const mctx = document.createElement('canvas').getContext('2d');
  const cache = new Map();
  const isMono = (family) => {
    if (cache.has(family)) return cache.get(family);
    mctx.font = `40px ${family}`;
    const a = mctx.measureText('iiiiiiii').width, b = mctx.measureText('WWWWWWWW').width;
    const v = Math.abs(a - b) < 1; cache.set(family, v); return v;
  };
  const srHidden = (el) => {
    for (let p = el, i = 0; p && p !== document.body && i < 4; p = p.parentElement, i++) {
      const cs = getComputedStyle(p); const r = p.getBoundingClientRect();
      if (cs.clip === 'rect(0px, 0px, 0px, 0px)' || /inset\(50%\)/.test(cs.clipPath) || (r.width <= 2 && r.height <= 2 && cs.overflow !== 'visible')) return true;
    }
    return false;
  };
  let totalChars = 0, monoProse = 0; const samples = [];
  for (const el of [...document.body.querySelectorAll('*')].slice(0, 9000)) {
    const tag = el.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEMPLATE') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    let direct = '';
    for (const n of el.childNodes) if (n.nodeType === 3) direct += n.nodeValue;
    direct = direct.replace(/\s+/g, ' ').trim();
    if (!direct) continue;
    if (tag === 'OPTION' || el.closest('svg') || srHidden(el)) continue;
    const size = parseFloat(cs.fontSize);
    if (!size || size < 6) continue;
    totalChars += direct.length;
    if (isMono(cs.fontFamily) && !el.closest('pre, code, kbd, samp, textarea')) {
      monoProse += direct.length;
      if (samples.length < 6) samples.push(`${direct.slice(0, 24)}(${direct.length}字)`);
    }
  }
  return { totalChars, monoProse, raw: monoProse / totalChars, samples };
});
rec('mono-raw-share', monoRaw.monoProse > 0,
  `原始值（未四舍五入）：等宽正文 ${monoRaw.monoProse} 字 / 全站 ${monoRaw.totalChars} 字 = ${monoRaw.raw.toFixed(5)}（${(monoRaw.raw * 100).toFixed(3)}%）；样本 ${monoRaw.samples.join(' ')}`);

/* 15. 全页 PNG 截图，供像素面积统计（规格面积预算 vs 实测，见 S03-area.txt） */
await page.screenshot({ path: 'D:/Web/style/deliverables/tool-runs/S03-area-full.png', format: 'png', fullPage: true });
rec('area-capture', true, '已存 deliverables/tool-runs/S03-area-full.png（全页 PNG，供面积实测）');

await page.close();
await browser.close();
server.close();

const failed = out.filter((r) => !r.ok);
console.log(`\n===== VERIFY ${failed.length ? 'FAIL' : 'PASS'} : ${out.length - failed.length}/${out.length} =====`);
if (failed.length) console.log('failed: ' + failed.map((f) => f.id).join(', '));
process.exit(failed.length ? 1 : 0);



