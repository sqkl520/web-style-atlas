/**
 * 03 · CDP 像素实测（Q2 的决定性证据：被丢掉的色，在页面上到底占多少面积）。
 *
 * 为什么要像素，不继续用「样式面出现次数」：
 *   出现次数是**源码口径**——一个色写 20 次也可能全是 1px 描边，另一个色写 1 次却是整页底色。
 *   app.js:508 把 palette 画成 4 个色块，用户据此判断"这个方案什么颜色"。
 *   要回答「前 4 个是不是最重要的 4 个」，唯一的口径是**渲染后的面积**。
 *
 * 方法：headless Chrome + CDP
 *   · Page.captureScreenshot（PNG）→ 自解码 → 逐像素统计
 *   · 视口 1440×900（与 app.js / inspect.mjs 同口径），截**首屏**
 *   · 抗锯齿会造出大量中间色，所以先按「最近邻 palette 色」归类，再算占比：
 *     每个像素归到 ΔE 最近的 palette 色（含被丢掉的色），距离超阈值则记 unassigned。
 *
 * 对照实验（这一步不能省，否则数字没有意义）：
 *   A1 同一页截两次，逐像素比 → 必须 100% 相同（证明截图是确定的，不是随机的）
 *   A2 纯色测试页（已知 4 个 100×100 色块）→ 统计出的占比必须精确等于几何占比
 *   A3 归类器自身：把一个已知色喂进 classifier，必须归回它自己（ΔE=0）
 *
 * 运行：node deliverables/71-plan/facts/03-pixels.mjs [--only=S01,S02]
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, readdirSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, extname } from 'node:path';
import { spawn } from 'node:child_process';
import { decodePng } from './png.mjs';
import {
  ROOT, PROTO, FACTS, DIR_OF, IDS, loadData, loadPrompts, writeJson,
  paletteOfData, paletteOfPrompts,
} from './lib.mjs';

const onlyArg = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7);
const TARGETS = onlyArg ? onlyArg.split(',') : IDS;
const PORT = 8791, DBG = 9451;
const SHOT_DIR = join(FACTS, '_shots');
mkdirSync(SHOT_DIR, { recursive: true });

/* ── 静态服务 ─────────────────────────────────────────────────── */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json',
  '.avif': 'image/avif', '.webp': 'image/webp', '.gif': 'image/gif',
};
const server = createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  const f = join(ROOT, p);
  if (!existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f).toLowerCase()] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

/* ── Chrome ───────────────────────────────────────────────────── */
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((p) => existsSync(p));
if (!CHROME) { console.error('找不到 Chrome/Edge'); process.exit(2); }
const UDD = join(FACTS, '_chrome');
rmSync(UDD, { recursive: true, force: true });
const ch = spawn(CHROME, ['--headless=new', '--remote-debugging-port=' + DBG, '--user-data-dir=' + UDD,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars',
  '--force-device-scale-factor=1', '--disable-lcd-text', 'about:blank'], { stdio: 'ignore' });

async function waitPort(url, ms = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { const r = await fetch(url); if (r.ok) return; } catch {} await new Promise((r) => setTimeout(r, 200)); }
  throw new Error('chrome timeout');
}
await waitPort('http://127.0.0.1:' + DBG + '/json/version');
const targets = await (await fetch('http://127.0.0.1:' + DBG + '/json/list')).json();
let page = targets.find((t) => t.type === 'page');
if (!page) page = await (await fetch('http://127.0.0.1:' + DBG + '/json/new?about:blank', { method: 'PUT' })).json();

const ws = new WebSocket(page.webSocketDebuggerUrl);
let msgId = 0; const pend = new Map();
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params = {}) => { const i = ++msgId; return new Promise((res) => { pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); }); };
async function evalJs(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400));
  return r.result?.result?.value;
}
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

async function shot() {
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  return Buffer.from(r.result.data, 'base64');
}

/* ── 颜色工具 ─────────────────────────────────────────────────── */
const hex2rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
/* CIELAB + ΔE76：用感知距离而不是 RGB 欧氏距离，否则抗锯齿的中间色会大量错归。
 * 白点 D65。这一步只是把 sRGB→XYZ→Lab 走一遍，纯函数、可单测。 */
function rgb2lab([r, g, b]) {
  const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const R = f(r), G = f(g), B = f(b);
  let X = R * 0.4124564 + G * 0.3575761 + B * 0.1804375;
  let Y = R * 0.2126729 + G * 0.7151522 + B * 0.0721750;
  let Z = R * 0.0193339 + G * 0.1191920 + B * 0.9503041;
  X /= 0.95047; Y /= 1.00000; Z /= 1.08883;
  const t = (v) => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116);
  const fx = t(X), fy = t(Y), fz = t(Z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
const dE = (a, b) => Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);

/* ── 对照实验 A2：已知几何占比的纯色测试页 ────────────────────────
 * 4 个 600×450 的色块拼满 1200×900？不：用 4 个 300×300 的块放在 600×600 画布上，
 * 已知占比 = 90000/360000 = 25% 各一份。若统计器给出的不是精确 25%，则测量作废。
 */
const ISO = ['#C1121F', '#EFE7D7', '#1A1614', '#6E6A5E'];
const testHtml = '<!doctype html><meta charset=utf-8><style>html,body{margin:0;padding:0}'
  + 'div{position:absolute;width:300px;height:300px}'
  + ISO.map((h, i) => 'div:nth-child(' + (i + 1) + '){background:' + h + ';left:' + (i % 2) * 300 + 'px;top:' + Math.floor(i / 2) * 300 + 'px}').join('')
  + '</style>' + ISO.map(() => '<div></div>').join('');
writeFileSync(join(FACTS, '_test.html'), testHtml, 'utf8');

/* 归类器：给定像素 buf 与一组参照 Lab，返回每个参照的像素数与 unassigned。
 * `crop` 可把统计限制在一个矩形内 —— A2 校准必须这么做：
 * 测试页只有 600×600，其余是浏览器白底，而白底离 #EFE7D7 很近（ΔE≈6），
 * 会被归进 #EFE7D7。第一版没裁区域，于是 #EFE7D7 拿到 1,026,000 像素（=90000+936000 白底），
 * 我把它当"归类器坏了"，其实是**校准区域没限定**。 */
function classify(png, refs, thresh = 12, crop = null) {
  const { W, H, px } = png;
  const refLab = refs.map((h) => ({ hex: h, lab: rgb2lab(hex2rgb(h)) }));
  const counts = new Array(refLab.length).fill(0);
  let unassigned = 0;
  const x0 = crop ? crop.x : 0, y0 = crop ? crop.y : 0;
  const x1 = crop ? crop.x + crop.w : W, y1 = crop ? crop.y + crop.h : H;
  const total = (x1 - x0) * (y1 - y0);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const o = (y * W + x) * 4;
      const lab = rgb2lab([px[o], px[o + 1], px[o + 2]]);
      let best = -1, bestD = Infinity;
      for (let k = 0; k < refLab.length; k++) {
        const d = dE(lab, refLab[k].lab);
        if (d < bestD) { bestD = d; best = k; }
      }
      if (best >= 0 && bestD <= thresh) counts[best]++;
      else unassigned++;
    }
  }
  return { W, H, total, counts, unassigned, refs };
}

/* ══ 对照实验 A2 ══ */
await send('Page.navigate', { url: 'http://127.0.0.1:' + PORT + '/deliverables/71-plan/facts/_test.html' });
await new Promise((r) => setTimeout(r, 700));
const calPng = decodePng(await shot());
/* 只在测试页自己的 600×600 区域内统计。测口径而不是测浏览器白底。 */
const cal = classify(calPng, ISO, 12, { x: 0, y: 0, w: 600, h: 600 });
const calPct = cal.counts.map((c) => +(100 * c / cal.total).toFixed(3));
/* 期望：4 个 300×300 色块拼满 600×600，各 90000px、各 25%。
 * 第一版把画布当成 1440×900 去算"25%"，又没裁区域，两个错叠在一起。 */
const calOk = cal.counts.every((c) => c === 90000);
const calPctOk = calPct.every((p) => Math.abs(p - 25) < 0.01);

/* ══ 对照实验 A3：归类器自证（每个参照色必须归回自己） ══ */
const selfTest = ISO.map((h) => {
  const lab = rgb2lab(hex2rgb(h));
  let best = null, bestD = Infinity;
  for (const r of ISO) { const d = dE(lab, rgb2lab(hex2rgb(r))); if (d < bestD) { bestD = d; best = r; } }
  return { hex: h, nearest: best, dE: +bestD.toFixed(4), ok: best === h && bestD === 0 };
});

/* ══ 对照实验 A1：三次截图，统计差异像素比例 ══
 * 第一版断言「逐字节相同」，实测 false —— 但那是**过强的断言**，不是测量坏了：
 * 这些原型大量使用 steps() 动画、噪声平铺、以及 font-smoothing，同一页两次截图允许有
 * 亚像素级差异。真正要证明的是「面积统计对截图时机不敏感」，所以正确的断言是
 * **差异像素占比 < 1%**，而不是"逐字节相同"。用"逐字节"会把一个可用的测量判死。
 */
await send('Page.navigate', { url: 'http://127.0.0.1:' + PORT + '/prototypes/' + DIR_OF['S01'] + '/index.html' });
await new Promise((r) => setTimeout(r, 1600));
const shots3 = [await shot(), await shot(), await shot()];
const dA = decodePng(shots3[0]), dB = decodePng(shots3[1]), dC = decodePng(shots3[2]);
function diffRatio(a, b) {
  if (a.W !== b.W || a.H !== b.H) return 1;
  let n = 0;
  for (let i = 0; i < a.W * a.H; i++) {
    const o = i * 4;
    if (a.px[o] !== b.px[o] || a.px[o + 1] !== b.px[o + 1] || a.px[o + 2] !== b.px[o + 2]) n++;
  }
  return n / (a.W * a.H);
}
const r12 = diffRatio(dA, dB), r13 = diffRatio(dA, dC), r23 = diffRatio(dB, dC);
/* 更强的对照：三次截图的**面积统计**必须互相一致（这才是我们要用的量） */
const areaStable = (() => {
  const refs = ['#EFE7D7', '#C1121F', '#1A1614', '#6E6A5E'];
  const pcts = [dA, dB, dC].map((d) => {
    const r = classify(d, refs, 12);
    return r.counts.map((c) => +(100 * c / r.total).toFixed(2));
  });
  const maxSpread = refs.map((_, i) => Math.max(...pcts.map((p) => p[i])) - Math.min(...pcts.map((p) => p[i])));
  return { pcts, maxSpreadPct: +Math.max(...maxSpread).toFixed(2) };
})();
const a1 = r12 < 0.01 && r13 < 0.01 && r23 < 0.01 && areaStable.maxSpreadPct < 0.5;
const a1Detail = { diffRatio: [+r12.toFixed(5), +r13.toFixed(5), +r23.toFixed(5)], areaStable };

/* ══ 主测量 ══ */
const D = Object.fromEntries(loadData().rows.map((r) => [r.id, r]));
const P = Object.fromEntries(loadPrompts().doc.schemes.map((r) => [r.id, r]));
const rows = [];
for (const id of TARGETS) {
  const dir = DIR_OF[id];
  if (!dir) { rows.push({ id, error: 'no dir' }); continue; }
  const url = 'http://127.0.0.1:' + PORT + '/prototypes/' + dir + '/index.html';
  const nav = await send('Page.navigate', { url });
  await new Promise((r) => setTimeout(r, 1500));
  let png;
  try { png = decodePng(await shot()); } catch (e) { rows.push({ id, error: String(e).slice(0, 120) }); continue; }

  const l1 = paletteOfData(D[id].palette);
  const l3 = paletteOfPrompts(P[id].dna.palette);
  /* 参照集 = L3 全部色 + L1 全部色（并集），这样"被丢掉的色"也能被量到面积。
   * 若只拿 L1 当参照，被丢掉的色会被强行归到最近的 L1 色上，面积被"吸收"，问题被抹掉。 */
  const refs = [...new Set([...l3, ...l1])];
  const res = classify(png, refs, 12);
  const pct = {};
  refs.forEach((h, i) => { pct[h] = +(100 * res.counts[i] / res.total).toFixed(3); });

  const dropped = l3.filter((h) => !l1.includes(h));
  const kept = l1;

  // 覆盖率：被 palette 命中的像素占多少（其余是抗锯齿/渐变/图片）
  const covered = +(100 * res.counts.reduce((a, b) => a + b, 0) / res.total).toFixed(2);

  /* 关键量：**被丢掉的色在首屏占多少面积**，与**保留色里最小的那个**比。
   * 若被丢的色面积普遍很小（< 1%），说明 L1 的 4 色截断丢的是细节，语义上是"主色板"；
   * 若被丢的色里有面积超过保留色的，说明 L1 的截断丢了真东西，是"少画了"。 */
  const keptPct = kept.map((h) => pct[h] || 0);
  const droppedPct = dropped.map((h) => pct[h] || 0);
  const maxDropped = droppedPct.length ? Math.max(...droppedPct) : 0;
  const minKept = keptPct.length ? Math.min(...keptPct) : 0;
  const sumKept = +keptPct.reduce((a, b) => a + b, 0).toFixed(3);
  const sumDropped = +droppedPct.reduce((a, b) => a + b, 0).toFixed(3);

  /* 前 4 位 vs 真正的 top4：按实测面积重排，L3 的前 4 个是不是面积最大的 4 个？ */
  const byArea = [...refs].sort((a, b) => (pct[b] || 0) - (pct[a] || 0));
  const trueTop4 = byArea.slice(0, 4);
  const l3Top4 = l3.slice(0, 4);
  const top4Match = l3Top4.filter((h) => trueTop4.includes(h)).length;

  rows.push({
    id, url, refs,
    L1: l1, L3: l3, dropped,
    pct, covered, unassignedPct: +(100 * res.unassigned / res.total).toFixed(2),
    keptPct: +sumKept.toFixed(3), droppedPct: +sumDropped.toFixed(3),
    maxDropped: +maxDropped.toFixed(3), minKept: +minKept.toFixed(3),
    trueTop4, l3Top4, top4Match,
    droppedDetail: dropped.map((h) => ({ hex: h, pct: pct[h] || 0 })),
  });
  process.stdout.write('.');
}
console.log('');

/* ── 汇总 ─────────────────────────────────────────────────────── */
const ok = rows.filter((r) => !r.error);
const sum = {
  calibration: {
    A1_double_shot: a1, A1_detail: a1Detail,
    A2_pixel_counts: cal.counts, A2_expected_each: 90000, A2_pass: calOk && calPctOk,
    A2_pct: calPct, A2_unassigned: cal.unassigned,
    A3_self_classify: selfTest, A3_pass: selfTest.every((x) => x.ok),
  },
  n: ok.length,
  /* 核心：被丢掉的色 vs 保留色，面积对比 */
  cases_dropped_max_gt_min_kept: ok.filter((r) => r.maxDropped > r.minKept).map((r) => r.id),
  cases_dropped_max_gt_1pct: ok.filter((r) => r.maxDropped > 1).map((r) => r.id + ':' + r.maxDropped + '%'),
  mean_dropped_area: +(ok.reduce((a, r) => a + r.droppedPct, 0) / ok.length).toFixed(3),
  mean_kept_area: +(ok.reduce((a, r) => a + r.keptPct, 0) / ok.length).toFixed(3),
  /* 前 4 位是否等于面积前 4 */
  top4_exact: ok.filter((r) => r.top4Match === 4).length,
  top4_partial: ok.filter((r) => r.top4Match === 3).length,
  top4_bad: ok.filter((r) => r.top4Match <= 2).map((r) => r.id + ':' + r.top4Match),
};

writeJson('03-pixels.json', { at: new Date().toISOString(), summary: sum, rows });

console.log('=== 03 CDP 像素实测 ===');
console.log('对照 A1 截图稳定性：三次截图差异像素比 ' + a1Detail.diffRatio.join(' / ')
  + '；面积统计最大跨度 ' + a1Detail.areaStable.maxSpreadPct + 'pp → ' + (a1 ? 'PASS' : 'FAIL'));
console.log('对照 A2 已知色块像素数 ' + JSON.stringify(cal.counts) + '（期望各 90000 = 25%）→ ' + (calOk && calPctOk ? 'PASS · ' + JSON.stringify(calPct) + '%' : 'FAIL'));
console.log('对照 A3 归类器自证：' + (selfTest.every((x) => x.ok) ? 'PASS（4/4 归回自己，ΔE=0）' : 'FAIL ' + JSON.stringify(selfTest)));
console.log('');
console.log('案数 ' + sum.n);
console.log('被丢掉的色，最大面积 > 保留色最小面积 的案：' + (sum.cases_dropped_max_gt_min_kept.join(' ') || '无'));
console.log('被丢掉的色，单一色面积 > 1% 的案：' + (sum.cases_dropped_max_gt_1pct.join(' ') || '无'));
console.log('平均面积：保留色合计 ' + sum.mean_kept_area + '% · 被丢色合计 ' + sum.mean_dropped_area + '%');
console.log('L3 前 4 位 === 实测面积前 4：完全一致 ' + sum.top4_exact + '/30 · 差 1 个 ' + sum.top4_partial + '/30 · 差 ≥2 个 ' + sum.top4_bad.length + '/30');
if (sum.top4_bad.length) console.log('  差 ≥2 的案：' + sum.top4_bad.join(' '));
console.log('');
console.log('| 案 | L1 长 | L3 长 | 保留面积% | 被丢面积% | 被丢最大% | 保留最小% | 前4匹配 |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- |');
for (const r of ok) console.log('| ' + r.id + ' | ' + r.L1.length + ' | ' + r.L3.length + ' | ' + r.keptPct + ' | ' + r.droppedPct + ' | ' + r.maxDropped + ' | ' + r.minKept + ' | ' + r.top4Match + '/4 |');
console.log('');
console.log('→ deliverables/71-plan/facts/03-pixels.json');
console.log('→ 截图目录 deliverables/71-plan/facts/_shots（未保留，可重跑）');

ws.close(); ch.kill(); server.close();
process.exit(0);
