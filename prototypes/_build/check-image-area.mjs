#!/usr/bin/env node
/* 图片位面积闸门：产物里图占的版面份额，比原型差多少。
 *
 * 【为什么需要 —— 这是所有源码判据都看不见的一层】
 *
 * `score.mjs` 的 ④ 图片判据数的是 `<img>` 标签个数。实测：
 *
 *   S21  6 个 <img>，判据报「图片 6/5 达标 ✓」
 *        但渲染出来那 6 个盒子是 120×100 / 96×100 / 142×100 …
 *        原型同位置是 909×342 的通栏大图 —— **面积差 19 倍**
 *
 * 【判据：归一化份额，不是绝对面积】
 *
 * 绝对面积比会被页高差污染：产物按 have=5 排、原型按完整文案排，
 * 页高比 0.10–0.58。初测「绝对面积不到原型 25% 的 15 案」里，
 * 有 9 案的面积小**完全由页高差解释**，不是缺陷（§三十八）。
 *
 * 所以判据用「图片面积 / (视口宽 × 页高)」这个**份额**，再比产物与原型：
 *
 *   share = imgsArea / (1440 × docHeight)
 *   ratio = share_artifact / share_proto
 *
 * ratio < 0.4 判 FAIL —— 即"图在这个页面里的重要性"不到原型的 40%。
 *
 * 【正对照】
 *
 * 拿 35 个原型自比：同一份 HTML 跑两次，ratio 必须是 1.00。
 * 这不是形式主义 —— 它验证"测量本身不带系统性偏差"（页面高度抖动、
 * 字体加载时序、viewport 差异都会破坏 1.00）。
 *
 * 【成本】
 *
 * 每案约 0.4 秒（真 Chrome headless）。35 案自比 + 20 案对照 ≈ 22 秒。
 * 阻断 fonts.googleapis.com（本机不可达，否则每个 @import 要等 25 秒导航超时）。
 *
 * 用法：
 *   node prototypes/_build/check-image-area.mjs              # 产物 vs 原型
 *   node prototypes/_build/check-image-area.mjs --baseline   # 只跑正对照
 *   node prototypes/_build/check-image-area.mjs --selftest
 */
import { readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { Browser } from './vendor/cdp.mjs';

const ROOT = resolve(fileURLToPath(import.meta.url), '../..');
/* ⚠️ 注意：`resolve(file, '../..')` 得到的是 **prototypes/**，不是仓库根。
 * 本文件在 `prototypes/_build/` 下，退两级 = `prototypes/`。
 * 仓库根要退三级。这个坑 check-docs 的注释里记过（probe-ui.mjs 也踩过）。 */
const REPO = resolve(ROOT, '..');
const BT = join(REPO, 'deliverables/78-northstar/_blindtest');

/* 份额比值阈值。0.4 是保守值：低于它意味着"图在这个页面里的分量"
 * 不到原型的四成，人眼看得出差别。 */
const SHARE_MIN = 0.4;

const MIME = {
  '.html': 'text/html;charset=utf-8', '.css': 'text/css;charset=utf-8',
  '.js': 'text/javascript;charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon',
};

/* ── 判据本体（纯函数，可被 --selftest 直接打）──────────────────────── */
/* ratio = 产物份额 / 原型份额。返回 {ratio, hit}。
 * 非数字/零原型份额 → ratio 为 null（判不了，不是通过）。 */
function judgeShare(artArea, artH, protoArea, protoH, vw = 1440) {
  if (!protoArea || !protoH || !artH) return { ratio: null, hit: null };
  const a = artArea / (vw * artH);
  const p = protoArea / (vw * protoH);
  if (!p) return { ratio: null, hit: null };
  const ratio = Math.round((a / p) * 100) / 100;
  return { ratio, hit: ratio >= SHARE_MIN, artShare: Math.round(a * 1e4) / 1e4, protoShare: Math.round(p * 1e4) / 1e4 };
}

function selfTest() {
  const S = [];
  const eq = (n, g, w) => S.push([n, JSON.stringify(g) === JSON.stringify(w), g, w]);
  /* 份额相等 → 1.00，过 */
  eq('份额相同 → 1.00', judgeShare(1440 * 100, 1000, 1440 * 100, 1000).ratio, 1);
  eq('份额相同 → 通过', judgeShare(1440 * 100, 1000, 1440 * 100, 1000).hit, true);
  /* 份额只有 1/4 → 0.25，红 */
  eq('份额四分之一 → 0.25', judgeShare(1440 * 25, 1000, 1440 * 100, 1000).ratio, 0.25);
  eq('份额四分之一 → 不通过', judgeShare(1440 * 25, 1000, 1440 * 100, 1000).hit, false);
  /* 边界：0.4 恰好过（>=），0.39 红 */
  eq('边界 0.4 恰好过', judgeShare(1440 * 40, 1000, 1440 * 100, 1000).hit, true);
  eq('边界 0.39 红', judgeShare(1440 * 39, 1000, 1440 * 100, 1000).hit, false);
  /* 页高不同但份额相同 → 仍 1.00（这正是不用绝对面积的理由） */
  eq('页高不同份额相同 → 1.00', judgeShare(1440 * 50, 500, 1440 * 100, 1000).ratio, 1);
  /* 绝对面积相同但页高不同 → 份额不同 */
  const r = judgeShare(1440 * 100, 500, 1440 * 100, 1000);
  eq('绝对面积同、页高不同 → 2.00', r.ratio, 2);
  /* 原型没有图 → 判不了 */
  eq('原型无图 → null', judgeShare(1000, 800, 0, 800).ratio, null);
  eq('原型无图 → hit 也是 null', judgeShare(1000, 800, 0, 800).hit, null);
  /* 变异：判据非恒真非恒假 */
  const a = judgeShare(1440 * 100, 1000, 1440 * 100, 1000).hit;
  const b = judgeShare(1440 * 10, 1000, 1440 * 100, 1000).hit;
  S.push(['变异/非恒真非恒假', a !== b, { a, b }, '两者不同']);

  const bad = S.filter(([, ok]) => !ok);
  for (const [n, ok, g, w] of S) {
    console.log(`  ${ok ? '✓' : '✗'} ${n}`);
    if (!ok) console.log(`      实得 ${JSON.stringify(g)}，期望 ${JSON.stringify(w)}`);
  }
  console.log(`\n自测：${S.length - bad.length}/${S.length} 通过`);
  return bad.length === 0;
}

if (process.argv.includes('--selftest')) {
  console.log('=== 图片面积闸门自测 ===');
  process.exit(selfTest() ? 0 : 1);
}

/* ── 渲染测量 ──────────────────────────────────────────────────────── */
function serve(root) {
  return new Promise((res) => {
    const s = createServer(async (req, rq) => {
      try {
        const p = join(root, decodeURIComponent(req.url.split('?')[0]));
        const buf = await readFile(p);
        rq.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
        rq.end(buf);
      } catch { rq.writeHead(404); rq.end(); }
    });
    s.listen(0, '127.0.0.1', () => res({ s, port: s.address().port }));
  });
}

async function measure(browser, url) {
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1440, height: 900 });
    /* 阻断外网字体 —— 本机 fonts.googleapis.com 不可达，
     * 不阻断时每个 @import 要等 25 秒导航超时（实测 25.4s → 0.4s）。 */
    await page.send('Network.enable', {});
    await page.send('Network.setBlockedURLs', { urls: ['*fonts.googleapis.com*', '*fonts.gstatic.com*'] }).catch(() => {});
    await page.goto(url, { timeout: 20000 });
    await new Promise((r) => setTimeout(r, 600));
    return await page.eval(`(() => {
      const imgs = [...document.querySelectorAll('img')];
      let area = 0;
      for (const i of imgs) { const b = i.getBoundingClientRect(); area += Math.max(0, b.width) * Math.max(0, b.height); }
      return { n: imgs.length, area: Math.round(area), docH: document.documentElement.scrollHeight };
    })()`);
  } finally { await page.close().catch(() => {}); }
}

const W = {};
new Function('window', readFileSync(join(ROOT, '_selection/data.js'), 'utf8'))(W);

const BASELINE = process.argv.includes('--baseline');
const browser = await Browser.launch({ width: 1440, height: 900 });
const rows = [];
let srvA, srvP;
try {
  srvP = await serve(REPO);
  srvA = await serve(BT);

  if (BASELINE) {
    /* 正对照：原型自比。同一份 HTML 量两次，ratio 必须 1.00。
     * 不是形式主义 —— 它验证测量本身不带系统性偏差。 */
    console.log('正对照：35 个原型自比（ratio 必须 1.00）\n');
    let okN = 0, badN = 0, naN = 0;
    for (const s of W.SCHEMES) {
      const p = join(REPO, 'prototypes', s.dir, 'index.html');
      if (!existsSync(p)) continue;
      const url = `http://127.0.0.1:${srvP.port}/prototypes/${s.dir}/index.html`;
      let a, b;
      try { a = await measure(browser, url); b = await measure(browser, url); }
      catch (e) { console.log(`  ✗ ${s.id} 渲染失败`); badN++; continue; }
      const r = judgeShare(a.area, a.docH, b.area, b.docH);
      /* ratio 为 null = 这一案本来就没有图（S34 是零图设计）。
       * 那不是"偏差"，是"不涉及"—— 正对照里必须分开计，否则会误报。 */
      if (r.ratio === null) { naN++; continue; }
      if (r.ratio === 1) okN++;
      else { badN++; console.log(`  ✗ ${s.id} 自比 ${r.ratio}（面积 ${a.area}/${b.area}，页高 ${a.docH}/${b.docH}）`); }
    }
    console.log(`\n正对照：${okN} 案 1.00，${badN} 案偏差，${naN} 案无图不涉及`);
    console.log(badN === 0 ? '✓ 测量不带系统性偏差' : '✗ 测量本身不稳定，闸门结论不可信');
  } else {
    console.log(`图片位面积：产物 vs 原型（份额比，阈值 ${SHARE_MIN}）\n`);
    console.log('案     产物 n/面积/页高      原型 n/面积/页高      份额比');
    for (const s of W.SCHEMES) {
      const aPath = join(BT, s.id, 'index.html');
      if (!existsSync(aPath)) continue;
      const pPath = join(REPO, 'prototypes', s.dir, 'index.html');
      if (!existsSync(pPath)) continue;
      let a, p;
      try { a = await measure(browser, `http://127.0.0.1:${srvA.port}/${s.id}/index.html`); }
      catch { a = null; }
      try { p = await measure(browser, `http://127.0.0.1:${srvP.port}/prototypes/${s.dir}/index.html`); }
      catch { p = null; }
      if (!a || !p) { console.log(`${s.id.padEnd(6)} 渲染失败`); continue; }
      const r = judgeShare(a.area, a.docH, p.area, p.docH);
      rows.push({ id: s.id, ...r, a, p });
      const mark = r.hit === null ? '  -  ' : r.hit ? '✓' : '✗';
      console.log(
        `${s.id.padEnd(6)}${String(a.n).padStart(2)}/${String(a.area).padEnd(8)}/${String(a.docH).padEnd(6)}` +
        `${String(p.n).padStart(2)}/${String(p.area).padEnd(8)}/${String(p.docH).padEnd(6)}` +
        `${r.ratio === null ? ' - ' : r.ratio.toFixed(2) + '×'} ${mark}`
      );
    }
    const fails = rows.filter((x) => x.hit === false);
    const na = rows.filter((x) => x.hit === null);
    console.log(`\n${rows.length} 案可量：${rows.length - fails.length - na.length} 通过，${fails.length} 不过，${na.length} 判不了`);
    if (fails.length) console.log(`  不过的：${fails.map((x) => x.id + '(' + x.ratio + '×)').join(' ')}`);
    if (na.length) console.log(`  判不了的：${na.map((x) => x.id).join(' ')}（无图，这一类本来就不涉及）`);
    process.exitCode = fails.length ? 1 : 0;
  }
} finally {
  await browser.close().catch(() => {});
  if (srvA) await new Promise((r) => srvA.s.close(r));
  if (srvP) await new Promise((r) => srvP.s.close(r));
}
