#!/usr/bin/env node
/* Q7 复刻验货的度量器：给一个 HTML 文件，量 6 个可判定量。
 *
 * 为什么是这 6 个：它们**不会被浏览器量化抹平、且能被一句提示词决定**。
 * 刻意不比截图相似度、不做审美评分 —— 本仓库已经证明"0.490 相似度"这种数字
 * 出来之后没人再测第二次。
 *
 * 用法：
 *   node deliverables/74-q7/measure.mjs prototypes/S07-slate-ink-contents/index.html
 *   node deliverables/74-q7/measure.mjs deliverables/74-q7/out-S07.html
 *
 * 输出 JSON，便于对账脚本消费。
 */
import { Browser } from '../../prototypes/_build/vendor/cdp.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../..');
const MIME = {
  '.html': 'text/html;charset=utf-8', '.js': 'text/javascript;charset=utf-8',
  '.css': 'text/css;charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.avif': 'image/avif',
};

export async function measure(file, { viewport = { width: 1440, height: 900 } } = {}) {
  const abs = resolve(ROOT, file);
  const dir = dirname(abs);
  const server = createServer(async (req, res) => {
    try {
      const rel = decodeURIComponent(req.url.split('?')[0]);
      /* 以 HTML 所在目录为站点根，这样原型自己的 assets/ 能取到 */
      const p = join(dir, rel);
      const buf = await readFile(p);
      res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
      res.end(buf);
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;

  const browser = await Browser.launch(viewport);
  const pg = await browser.newPage();
  await pg.setViewport(viewport);
  try {
    await pg.goto(`http://127.0.0.1:${port}/${basename(abs)}`, { settleMs: 1500 });

    const m = await pg.eval(`(() => {
      const de = document.documentElement;
      const bodyCS = getComputedStyle(document.body);
      const px = (v) => parseFloat(v) || 0;

      /* ① 主体栏数：取**最宽**的那个 grid（主版式），而不是轨道最多的。
       *
       * 为什么不能用「轨道最多」：实测原型 S03 的主版式是 .chrono 三轨
       * （264px 轴 / 524px 内容 / 540px 读数），而生成物里有一个 .cards 十二轨
       * 的卡片网格 —— 按「最多」会拿 12 去比 3，两边测的都不是同一件事。
       * 主版式的定义：宽度最接近视口宽度的那个 grid 容器。 */
      /* ① 主体栏数：取 **2–4 轨** 的 grid 里面积最大的那个。
       *
       * 为什么限定 2–4 轨：一个版式的"骨架"通常是 2–4 栏（轴+内容、左右两页、主+副）。
       * 5 轨以上几乎都是卡片列表/图片网格（S07 的 repeat(7) 是图片墙，
       * S03 的 12 轨是卡片容器），拿它们判「栏数」会把结构性错误和内容多少混为一谈。
       *
       * 为什么不能只取"面积最大"：实测同一个 S03 页面两次测量，.chrono 与 .cards
       * 面积接近，选中的元素会抖（一次 3 轨一次 12 轨）。加轨道数上限后，
       * 候选集稳定，测量才能重复。
       * 判据仍是启发式，所以 compare.mjs 把这条降级为「只报不判」。 */
      let gridTracks = 0, gridSel = '', bestArea = -1;
      document.querySelectorAll('*').forEach((el) => {
        const cs = getComputedStyle(el);
        if (!cs.display.includes('grid') || !cs.gridTemplateColumns || cs.gridTemplateColumns === 'none') return;
        const tracks = cs.gridTemplateColumns.split(/\\s+/).filter(Boolean).length;
        if (tracks < 2 || tracks > 4) return;
        const r = el.getBoundingClientRect();
        const area = r.width * r.height;
        if (area > bestArea) {
          bestArea = area;
          gridTracks = tracks;
          gridSel = el.tagName + '.' + (el.className || '').toString().slice(0, 24);
        }
      });
      let maxColCount = 1;
      document.querySelectorAll('*').forEach((el) => {
        const c = parseInt(getComputedStyle(el).columnCount, 10);
        if (Number.isFinite(c) && c > maxColCount) maxColCount = c;
      });

      /* ② 主轴宽度比例：取**最宽**的那个 grid 的轨道像素宽度。
       * 判据必须与 ① 一致（同样按元素宽度选），否则两处会指向不同的元素 ——
       * 实测踩过：① 选 .chrono（三轨，宽 1368），② 因为 sum 差 4px 选了 .split（两等分），
       * 于是栏数报 3、比例报 [0.5, 0.5]，自相矛盾。 */
      /* ② 主轴宽度比例：**必须与 ① 用完全相同的选择判据**（2–4 轨 + 面积最大），
       * 否则两处指向不同元素 —— 实测踩过：① 选 .chrono（3 轨），② 因面积差 4px 选了
       * .split（2 轨等分），于是栏数报 3、比例报 [0.5, 0.5]，自相矛盾且看起来像模型做错了。 */
      let widest = null, widestElW = -1;
      document.querySelectorAll('*').forEach((el) => {
        const cs = getComputedStyle(el);
        if (!cs.display.includes('grid') || !cs.gridTemplateColumns || cs.gridTemplateColumns === 'none') return;
        const tracks = cs.gridTemplateColumns.split(/\\s+/).filter(Boolean).length;
        if (tracks < 2 || tracks > 4) return;
        const rect = el.getBoundingClientRect();
        const area = rect.width * rect.height;
        if (area <= widestElW) return;
        const parts = cs.gridTemplateColumns.split(/\\s+/).filter(Boolean).map(px);
        const sum = parts.reduce((a, b) => a + b, 0);
        if (sum > 0) { widest = { parts, sum }; widestElW = area; }
      });
      const mainRatio = widest ? widest.parts.map((v) => +(v / widest.sum).toFixed(3)) : [];

      /* ③ 最大标题 / 正文字号比 */
      let maxHead = 0;
      document.querySelectorAll('h1,h2,h3').forEach((h) => {
        const f = px(getComputedStyle(h).fontSize);
        if (f > maxHead) maxHead = f;
      });
      const bodySize = px(bodyCS.fontSize);
      const headBodyRatio = bodySize > 0 ? +(maxHead / bodySize).toFixed(2) : null;

      /* ④ 线宽集合（去重、排序；只收非零，且排除 outline-offset 之类） */
      const widths = new Set();
      document.querySelectorAll('*').forEach((el) => {
        const cs = getComputedStyle(el);
        ['borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth'].forEach((k) => {
          const v = px(cs[k]);
          if (v > 0) widths.add(v.toFixed(2));
        });
        const sw = px(cs.strokeWidth);
        if (sw > 0 && el.tagName.toLowerCase() === 'svg') widths.add(sw.toFixed(2));
      });
      /* SVG stroke 线宽：**必须同时收根元素与后代**，且必须排掉 stroke:none 的元素。
       * 两个坑都是实测踩到的：
       *   · 只扫 svg 的后代元素会漏掉 stroke 设在 svg 根上的情况；
       *   · getComputedStyle 的 strokeWidth 在 stroke:none 时仍返回默认的 1px ——
       *     不排掉的话，任何有 SVG 但没画线的页面都会被判成「用了 1px 线」。 */
      const strokes = new Set();
      document.querySelectorAll('svg, svg *').forEach((el) => {
        const cs = getComputedStyle(el);
        if (cs.stroke === 'none' || cs.strokeWidth === '' ) return;
        const v = px(cs.strokeWidth);
        /* 只有真的会画出来的元素才算：必须设了 stroke 色且不是 transparent */
        if (v > 0 && cs.stroke !== 'rgba(0, 0, 0, 0)') strokes.add(v.toFixed(2));
      });

      /* ⑤ 主色：全页 CSS 里出现的 hex 去重（不是"用了几个"，是"用了哪些"）
       *
       * 扫描全站 CSS。**必须递归进 @media / @supports 等嵌套规则** ——
       * 第一版只遍历顶层 rules，结果 S14（它的颜色大多写在媒体查询里）
       * 读出来是空数组，而它其实是 9 色的案子。这种「读不到就当没有」的假阴性
       * 会让「主色覆盖」判据对整案失效。 */
      const hexes = new Set();
      const walkRules = (rules) => {
        for (const r of Array.from(rules || [])) {
          const txt = r.cssText || '';
          for (const h of txt.matchAll(/#([0-9a-fA-F]{6})\\b/g)) hexes.add('#' + h[1].toUpperCase());
          /* CSSStyleRule 的 cssText 已含其声明；只有分组规则（@media 等）才有子 rules */
          if (r.style === undefined && r.cssRules) walkRules(r.cssRules);
        }
      };
      for (const sheet of Array.from(document.styleSheets)) {
        let rules; try { rules = sheet.cssRules; } catch { continue; }
        walkRules(rules);
      }
      /* 补一路：从**计算样式**收集实际渲染出的颜色，转成 hex。
       * 为什么需要：Chrome 在 cssText 里会把 background:#12181D 规范化成
       * rgb(18, 24, 29)，正则抓不到 hex。S14 整个案子因此读出 0 个色 ——
       * 而它其实是 9 色的案子，只是颜色全被规范化了。
       * 这一路保证「页面上真的显示出来的颜色」一定被算进去。 */
      /* 把 rgb()/rgba() 转成 hex。
       * ⚠️ 刻意**不用正则**：这段代码整体在模板字符串里，正则里的 \d \s 必须双写，
       * 而本文件已经因为这个坑坏过三次（split(/\s+/)、split(/\s+/)、rgbToHex）。
       * 用字符串切割彻底绕开转义层数问题 —— 代价是可读性略差，收益是它不会再坏。 */
      const rgbToHex = (s) => {
        const str = String(s);
        if (str.indexOf('rgb') !== 0) return null;
        const open = str.indexOf('(');
        const close = str.indexOf(')');
        if (open < 0 || close < 0) return null;
        const nums = str.slice(open + 1, close).split(',').map((x) => parseInt(x.trim(), 10));
        if (nums.length < 3 || nums.slice(0, 3).some((n) => !Number.isFinite(n))) return null;
        return '#' + nums.slice(0, 3).map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0')).join('').toUpperCase();
      };
      document.querySelectorAll('body, body *').forEach((el) => {
        const cs = getComputedStyle(el);
        for (const prop of ['color', 'backgroundColor', 'borderTopColor', 'borderBottomColor', 'outlineColor', 'fill', 'stroke']) {
          const h = rgbToHex(cs[prop]);
          if (h && h !== '#000000' || (h === '#000000' && cs[prop] === 'rgb(0, 0, 0)')) {
            if (h) hexes.add(h);
          }
        }
      });

      /* ⑥ 图片位：数量与"可见面积 > 0"的张数 */
      const imgs = Array.from(document.querySelectorAll('img'));
      const visible = imgs.filter((i) => {
        const r = i.getBoundingClientRect();
        const cs = getComputedStyle(i);
        return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden';
      }).length;

      return {
        gridTracks, gridSel, maxColCount, mainRatio,
        maxHeadPx: maxHead, bodySizePx: bodySize, headBodyRatio,
        borderWidths: Array.from(widths).sort((a, b) => a - b),
        svgStrokeWidths: Array.from(strokes).sort((a, b) => a - b),
        hexCount: hexes.size, hexes: Array.from(hexes).sort(),
        imgCount: imgs.length, imgVisible: visible,
        pageHeight: de.scrollHeight,
        consoleErrors: (window.__errs || []).length,
      };
    })()`);

    /* 记控制台错误（提示词产物常带 JS 错误，那会污染"看起来对不对"的判断） */
    m.consoleErrors = (pg.consoleErrors || []).length;
    m.consoleErrorSample = (pg.consoleErrors || []).slice(0, 3);
    return m;
  } finally {
    await browser.close();
    server.close();
  }
}

/* CLI */
if (process.argv[1] && process.argv[1].endsWith('measure.mjs')) {
  const file = process.argv[2];
  if (!file) { console.error('用法: node measure.mjs <html 文件>'); process.exit(2); }
  measure(file).then((m) => console.log(JSON.stringify(m, null, 2)))
    .catch((e) => { console.error(e); process.exit(1); });
}
