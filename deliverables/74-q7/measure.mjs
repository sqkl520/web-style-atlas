#!/usr/bin/env node
/* Q7 复刻验货的度量器：给一个 HTML 文件，量 6 个可判定量。
 *
 * 为什么是这 6 个：它们**不会被浏览器量化抹平、且能被一句提示词决定**。
 * 刻意不比截图相似度、不做审美评分 —— 本仓库已经证明"0.490 相似度"这种数字
 * 出来之后没人再测第二次。
 *
 * 用法：
 *   node deliverables/74-q7/measure.mjs prototypes/S07-slate-ink-contents/index.html
 *   node deliverables/74-q7/measure.mjs --debug prototypes/S01-red-wedge-broadsheet/index.html
 *
 * 输出 JSON，便于对账脚本消费。`--debug` 额外打印轨道判据的自检表。
 *
 * ⚠️ 写这个文件的人请注意：`pg.eval` 的那一段整体是一个**模板字符串**。
 *    它里面不能出现反引号（哪怕是注释里的行内代码），正则里的 `\s` 也必须写成 `\\s`。
 *    本仓库已经在这个转义层上栽过四次，最后一次就是给 ① 写注释时把一个
 *    `.columns` 的行内反引号塞进了模板字符串，整个文件语法错误。
 *    因此：**长的理由写在模板字符串外面**，里面只留一两行指针。
 */

/* ── ①「选哪个 grid 容器当主版式」的判据（2026-11 重写） ────────────────
 *
 * 旧判据是「2–4 轨 + 面积最大」。它在三个案上给出与 CSS 真值不符的数，
 * 每一个都能在原型文件里核到：
 *
 *   · S01（真值四栏）：`.columns` 求值后是 **7 条轨道** —— 4 条正文栏 +
 *     3 条 24px 铅条（prototypes/S01-red-wedge-broadsheet/style.css:195）。
 *     被 `tracks > 4` 排除，度量器退而选中 `.plate-grid`（图片格，2 轨，
 *     面积 3922613 比版心大）⇒ **报 2 轨**。数字本身完全合法，错的是量的元素。
 *   · S33（真值三轨）：选中 `LI.row`，那只是镜像版式的**一行**，不是版心。
 *   · S09（真值三栏）：选中 `.plate-grid`（图片格）；真值的 3 栏在
 *     `.rows { column-count: 3 }`（S09-batik-price-board/style.css:276），
 *     而 `.rows` 是 `display: block` —— 旧判据根本不看 column-count 容器。
 *
 * 根本原因：**「栏数」不等于「grid 轨道数」**，两者在两个方向上都会背离：
 *
 *   A. 栏沟本身是独立轨道。S01 的 `var(--bar)`=24px 铅条；S07 的 1px 中缝
 *      （S07-slate-ink-contents/style.css:74）；S33 的 1px 中缝
 *      （S33-teal-mirror-ledger/style.css:112）。直接数轨道会把 4 栏数成 7 栏、
 *      2 栏数成 3 栏。
 *   B. 图片格 / 卡片网格不是正文栏。S01 的 `.plate-grid`（7 图）、
 *      S17 的 `.plates`（5 图，S17-revenue-stamp-stub/style.css:224）、
 *      S09 的 `.plate-grid`（6 图）。
 *
 * 六条判据。前四条搬自 prototypes/_build/vendor/probe.mjs 的 metrics.structure
 * （那一套已经在 30 个原型上跑过）：
 *
 *   1. **括号感知切分** —— `minmax(0, 1fr)` 内部有空格，按空白硬切会切碎它。
 *   2. **剔掉窄轨道当栏沟**，但只在它**反复出现**时剔（见下面「接缝 vs 栏沟」）。
 *      本仓库 30 案栏沟实测 16–26px，正文栏最窄也在 100px 以上。
 *   3. **排除图片网格**：子元素过半带图 **且** 每子平均不到 120 字 ⇒ 判为画廊。
 *      ⚠️ 只数 `img / picture / canvas / video`，**不数 `svg`**。本仓库的 svg 大量
 *      用于画线而不是画图：S09 的价格下划线是 118×44 的 `svg.trace`
 *      （S09-batik-price-board/index.html:2 附近的 `.row-price`）、S17 的齿孔线是
 *      `div.perf` 里的 svg。按 `probe.mjs` 原先「img/picture/svg/canvas 都算图」
 *      的口径，S09 的版心 `.rows`（10 个子元素全带价格 svg）会被判成画廊 ——
 *      实测踩到，所以这里收窄。
 *      ⚠️ 也**不能只看 img 占比**：S17 的 `.sheet` 3 个子元素里有 2 个含 svg，
 *      但它承载 937 字正文、真值 3 轨。加上「每子平均字数」这一条才分得开。
 *   4. **按容器里的文字量排序取第一**，不是面积最大。S07 的 `header.bar`
 *      4 轨 53 字 vs `.pages` 2 轨 1574 字，取面积最大会选中页头。
 *
 * 关于「接缝 vs 栏沟」（第 2 条的细则，6 个案的真值逼出来的）：
 *
 *   把宽度 < 32px 的轨道一律剔掉，会让 **S17 和 S33 各少一栏**：
 *     · S17 `.sheet` 是 `minmax(210px,3fr) 16px 9fr`（style.css:134），16px 是
 *       齿孔线；规格原文「两联之间是齿孔线而不是边框」，真值 **3 轨**。
 *     · S33 `.row` 是 `1fr 1px 1fr`（style.css:112），1px 是 `.row-tick`
 *       实色块；规格原文「每一行是 … <左> 1px <右>」，真值 **3 轨**。
 *   而 S01 必须剔：`5fr 24px 4fr 24px 4fr 24px 3fr`（style.css:195）里
 *   **3 条** 24px 铅条，规格原文「四栏」「栏沟 24px 为铅条空隙」，真值 **4 栏**。
 *
 *   区别是可判的：栏沟**成组**出现在每两栏之间（S01 是 3 条），接缝只有**一条**、
 *   把版心切成两个不对称的联。所以规则是：**窄轨道 ≥ 2 条才当栏沟剔掉；
 *   只有 1 条时留着，它是接缝**。
 *   ⇒ S01 = 4、S17 = 3、S33 = 3。
 *   ⚠️ S07 因此报 3 轨（`5fr 1px 7fr`，style.css:74），而规格原文说
 *   「正页 2 栏、背页 3 栏」。两种读法都能自圆其说（3 = 两页 + 中缝；2 = 两页），
 *   这条判据给出的是前者 —— 已写进 78-northstar/_probe/01-measure-fix.md，
 *   **不当作对错，只报不判**。
 *
 *   已知代价：一个两栏之间只有一条窄栏沟的版心（`1fr 24px 1fr`）会被数成 3 轨。
 *   本仓库 30 案里没有这种写法（S01 的铅条是 3 条，其余用 gap 而非轨道），
 *   但换成别人的产物就会撞上。这是本判据最大的已知假阳性。
 *
 * 后两条是这次新增的，`probe.mjs` 没有（它的 `columns` 因此在 S17/S33 上
 * 分别选中了 `div.foot-grid` 和 `footer` 这两个页脚——它要的是「这一页最多几栏」，
 * 我这里要的是「版心几栏」）。
 *
 *   5. **排除页头 / 页脚 / 侧栏里的候选**：版心不会长在 `footer` 里。
 *   6. **同构兄弟聚组**：S33 的版心不是一个包裹容器 —— `.rows`（style.css:103）
 *      本身是 `display: block`，排布在 9 个 `.row` 上，每个 `.row` 才是
 *      `grid-template-columns: 1fr 1px 1fr`（style.css:112）。按单容器排序时
 *      最大的单行只有 81 字；聚组成「`ul.rows > li`」后合计 546 字，稳居第一。
 *      ⚠️ 聚组必须排除「页面区块序列」：S03 的 `.wrap > div` 也有 3 个同构兄弟、
 *      合计 926 字（比真值容器 `.chrono` 的 579 字还多），但那三个 div 是
 *      三**个板块**（各自带 h2），不是一个版心的三**行**。判据：**组内任一成员
 *      自带 h1–h6 就不聚组** —— 版心的重复行不会各自带标题，同级板块才会。
 *      实测：S33 的 8 个 li.row 带标题 0/8（聚组）；S03 的 3 个 div 带标题 1/3、
 *      S28 的 7 个拼贴块带标题 7/7（都不聚组）。
 *
 * 判据仍是启发式，所以 compare.mjs 把这一条降级为「只报不判」。
 * 想复核它为什么选了某个元素：加 `--debug`，候选表会把每个候选的
 * 轨道数 / 文字量 / img 占比 / 被判为什么全部打出来。
 * ──────────────────────────────────────────────────────────────────── */

import { Browser } from '../../prototypes/_build/vendor/cdp.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../..');
/* Chrome 拒绝导航的端口（net::ERR_UNSAFE_PORT）。列的是常见的低位段，
   本机实测撞到过 6000 段；宁可多列几个，也不要让批量回归随机红一次。 */
const BAD_PORTS = new Set([
  1, 7, 9, 11, 13, 15, 17, 19, 20, 21, 22, 23, 25, 37, 42, 43, 53, 69, 77, 79, 87, 95,
  101, 102, 103, 104, 109, 110, 111, 113, 115, 117, 119, 123, 135, 137, 139, 143, 161,
  179, 389, 427, 465, 512, 513, 514, 515, 526, 530, 531, 532, 540, 548, 554, 556, 563,
  587, 601, 636, 989, 990, 993, 995, 1719, 1720, 1723, 2049, 3659, 4045, 5060, 5061,
  6000, 6566, 6665, 6666, 6667, 6668, 6669, 6697, 10080,
]);
const MIME = {
  '.html': 'text/html;charset=utf-8', '.js': 'text/javascript;charset=utf-8',
  '.css': 'text/css;charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.avif': 'image/avif',
};

export async function measure(file, { viewport = { width: 1440, height: 900 } } = {}) {
  const abs = resolve(ROOT, file);
  const dir = dirname(abs);
  const server = createServer(async (req, res) => {
    const DBG = process.env.MEASURE_DEBUG;
    if (DBG) console.error('[req]', req.url);
    try {
      const rel = decodeURIComponent(req.url.split('?')[0]);
      /* 站点根是**仓库根**，HTML 用相对仓库根的路径访问。
       *
       * 为什么不能像早期那样「以 HTML 所在目录为站点根」：原型要引 `../_fonts/`
       * 共享字体缓存（render-scheme.mjs 的注释里写明了同一件事，它是靠 cwd=仓库根
       * 解决的）。把根设在 HTML 目录，任何 `../` 都会越出根变成 404，而 404 的字体
       * **不报错**，只是回退成系统字体 ⇒ 字号/字距量出来全是错的。这条属于本仓库
       * 「闸门读不到数据也不报错、照样打印一个漂亮数字」的老病。
       * 判据：路径逃出仓库根就 404，绝不顺着 `..` 去读盘上别处。 */
      const p = resolve(ROOT, '.' + rel);
      if (!p.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
      const buf = await readFile(p);
      res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
      res.end(buf);
    } catch {
      /* favicon 一律 204，不发 404。
       * 为什么：`Page.navigate` 的 errorText 会被**任何一个失败子资源**触发
       * （实测 ERR_HTTP_RESPONSE_CODE_FAILURE 来自唯一的 /favicon.ico 404），
       * 而 goto() 见到 errorText 就抛 —— 一次缺图标能把整页测量打成异常。
       * 204 是「有响应、无内容」，Chrome 视为成功。 */
      if (/\/favicon\.ico$/.test(req.url.split('?')[0])) {
        if (DBG) console.error('[favicon→204]');
        res.writeHead(204); res.end(); return;
      }
      if (DBG) console.error('[404]', req.url);
      res.writeHead(404); res.end();
    }
  });
  /* ⚠️ 不能直接 `listen(0)`：操作系统可能分到浏览器黑名单里的端口，
     Chrome 会拒绝导航并抛 net::ERR_UNSAFE_PORT（实测在批量回归里撞到，
     大约每 30 次里 1 次）。按端口号重试，撞黑名单就换一个。 */
  const startServer = async () => {
    for (let attempt = 0; attempt < 40; attempt++) {
      try { await new Promise((r, j) => { server.once('error', j); server.listen(0, '127.0.0.1', r); }); }
      catch { continue; }
      const p = server.address().port;
      if (!BAD_PORTS.has(p)) return p;
      await new Promise((r) => server.close(r));
    }
    throw new Error('起不来静态服务器：连试 40 次都落在浏览器黑名单端口上');
  };
  const port = await startServer();

  const browser = await Browser.launch(viewport);
  const pg = await browser.newPage();
  await pg.setViewport(viewport);
  try {
    /* URL 用**相对仓库根**的路径（站点根已改成仓库根，见上面 createServer 的注释）。
     * 仍然走 http:// 而不是 file:// —— clipboard 与部分 API 在 file:// 下行为不同。 */
    const relUrl = abs.slice(ROOT.length).replace(/\\/g, '/');
    if (process.env.MEASURE_DEBUG) console.error('[nav] ROOT=', ROOT, 'abs=', abs, 'relUrl=', relUrl);
    await pg.goto(`http://127.0.0.1:${port}${relUrl}`, { settleMs: 1500 });

    const m = await pg.eval(`(() => {
      const de = document.documentElement;
      const bodyCS = getComputedStyle(document.body);
      const px = (v) => parseFloat(v) || 0;

      /* ①② 主体栏数 / 主轴比例。判据的完整理由与六个反例见本文件顶部的大段注释，
         这里只留实现。要点：括号感知切分 → 剔 <32px 栏沟 → 排除图片网格与页头页脚
         → 同构兄弟聚组 → 按文字量取第一；①② 消费**同一个** pick。 */

      /* 括号感知切分。⚠️ 刻意不用正则：本段在模板字符串里，正则里的反斜杠要双写，
         而本文件已经因为转义层坏过。用 charCode 判断，彻底绕开。 */
      const splitTracks = (v) => {
        const out = []; let cur = ''; let depth = 0;
        for (let i = 0; i < v.length; i++) {
          const c = v.charAt(i);
          if (c === '(') depth++;
          else if (c === ')') { depth--; if (depth < 0) depth = 0; }
          if (depth === 0 && c.charCodeAt(0) <= 32) { if (cur) { out.push(cur); cur = ''; } continue; }
          cur += c;
        }
        if (cur) out.push(cur);
        return out;
      };
      /* 文字量：只数非空白字符。同样不用正则。 */
      const textLen = (el) => {
        const t = el.innerText || '';
        let n = 0;
        for (let i = 0; i < t.length; i++) if (t.charCodeAt(i) > 32) n++;
        return n;
      };
      const selName = (el) => {
        const c = typeof el.className === 'string' ? el.className.trim().split(' ').slice(0, 2).join('.') : '';
        return (el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (c ? '.' + c : '')).slice(0, 60);
      };
      /* 该元素（含自身）落在哪个 landmark 里（页头/页脚/侧栏），用来把版心候选剔出去。
         ⚠️ 必须从元素自身开始查：S34 的主版式确实是 footer 这个元素**本身**是 grid，
         只查祖先会把它当成「正文」。实测踩到，它当时报 4 轨。 */
      const landOf = (el) => {
        for (let p = el; p && p !== de; p = p.parentElement) {
          const t = p.tagName.toLowerCase();
          if (t === 'footer' || t === 'header' || t === 'nav' || t === 'aside') return t;
          const role = typeof p.getAttribute === 'function' ? p.getAttribute('role') : null;
          if (role === 'contentinfo' || role === 'banner' || role === 'navigation' || role === 'complementary') return 'role:' + role;
        }
        return '';
      };
      const shown = (el) => {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') return false;
        const r = el.getBoundingClientRect();
        return r.width >= 1 && r.height >= 1;
      };

      const GUTTER = 32;     /* 宽 < 32px 的轨道当窄轨道（30 案实测栏沟 16–26px） */
      const GAL_CHARS = 120; /* 画廊的每个子元素平均带不到 120 字（实测 S01 43 / S09 14） */
      const MIN_TEXT = 40;   /* 不带 40 字的容器不是正文栏（S01 的空占位 div 是 0 字） */
      /* 图片判据只认这些，**不认 svg** —— 本仓库的 svg 大多是画线的
         （S09 的价格下划线、S17 的齿孔线），算进来会把版心判成画廊。 */
      const PIC_SEL = 'img, picture, canvas, video';
      /* 窄轨道 → 栏数。≥2 条窄轨道 = 成组栏沟，剔掉；只有 1 条 = 接缝，留着。
         完整理由见文件顶部「接缝 vs 栏沟」。
         ⚠️ 返回值是**计作栏的轨道数**，不叫「宽轨道数」：S17 的 16px 接缝
         是窄的，但它算一栏（真值 3 轨 = 334 + 16 + 1002）。 */
      const colCount = (nums) => {
        const wide = nums.filter((n) => n >= GUTTER).length;
        const narrow = nums.length - wide;
        return narrow >= 2 ? wide : nums.length;
      };
      const cands = [];

      /* ── 候选一：单个容器（grid 或 column-count） ── */
      document.querySelectorAll('*').forEach((el) => {
        if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'NOSCRIPT' || el.tagName === 'TEMPLATE') return;
        if (!shown(el)) return;
        const cs = getComputedStyle(el);
        const gtc = cs.gridTemplateColumns;
        const isGrid = cs.display.indexOf('grid') >= 0 && !!gtc && gtc !== 'none';
        const cc = parseInt(cs.columnCount, 10);
        const isCols = !isGrid && Number.isFinite(cc) && cc > 1;
        if (!isGrid && !isCols) return;

        const kids = Array.from(el.children);
        const imgKids = kids.filter((k) => k.querySelector(PIC_SEL)).length;
        const chars = textLen(el);
        const c = {
          el, kind: isGrid ? 'grid' : 'column', chars, kids: kids.length, imgKids,
          imgShare: kids.length ? +(imgKids / kids.length).toFixed(2) : 0,
          avgKid: kids.length ? Math.round(chars / kids.length) : 0,
          raw: 0, wide: 0, gutters: 0, parts: [], why: '', label: selName(el),
        };
        if (isGrid) {
          const tracks = splitTracks(gtc);
          const nums = tracks.map((t) => parseFloat(t));
          const allNum = tracks.length > 0 && nums.every((n) => Number.isFinite(n));
          c.raw = tracks.length;
          /* 切出来若是像素值，就剔栏沟；否则（auto / min-content 之类）判不了宽窄，
             按轨道数计，并把 parts 留空 —— 不编造一个比例出来。 */
          if (allNum) {
            c.wide = colCount(nums);
            c.gutters = nums.length - nums.filter((n) => n >= GUTTER).length;
            /* 比例只取留下来的那些轨道。窄轨道既是接缝（S17 的 16px、S33 的 1px）
               就也该进比例里，否则 0.25/0.75 会漏掉那 1.2% 的中缝。 */
            c.parts = (c.gutters >= 2 ? nums.filter((n) => n >= GUTTER) : nums);
          } else { c.wide = tracks.length; }
        } else {
          c.raw = cc; c.wide = cc;
        }

        if (chars < MIN_TEXT) c.why = 'text<40';
        else if (c.wide < 2) c.why = 'cols<2';
        else if (kids.length >= 3 && c.imgShare >= 0.5 && c.avgKid < GAL_CHARS) c.why = 'gallery';
        else { const lm = landOf(el); if (lm) c.why = 'landmark:' + lm; }
        cands.push(c);
      });

      /* ── 候选二：同构兄弟聚组（同父 + 同标签 + 都是 grid，≥3 个） ──
         为什么需要：S33 的版心是 9 个 li.row，不是包裹容器。见文件顶部第 6 条。 */
      const groups = new Map();
      document.querySelectorAll('*').forEach((el) => {
        if (!shown(el)) return;
        const cs = getComputedStyle(el);
        const gtc = cs.gridTemplateColumns;
        if (cs.display.indexOf('grid') < 0 || !gtc || gtc === 'none') return;
        const p = el.parentElement;
        if (!p) return;
        const key = selName(p) + '>' + el.tagName.toLowerCase();
        let g = groups.get(key);
        if (!g) { g = { parent: p, n: 0, chars: 0, kids: 0, imgKids: 0, withHead: 0, gtcs: new Map() }; groups.set(key, g); }
        g.n++;
        g.chars += textLen(el);
        g.kids += el.children.length;
        g.imgKids += Array.from(el.children).filter((k) => k.querySelector(PIC_SEL)).length;
        /* 成员自带标题 ⇒ 这一组是页面板块序列，不是版心的重复行。见顶部第 6 条。 */
        if (el.querySelector('h1, h2, h3, h4, h5, h6')) g.withHead++;
        g.gtcs.set(gtc, (g.gtcs.get(gtc) || 0) + 1);
      });
      groups.forEach((g, key) => {
        if (g.n < 3 || g.chars < MIN_TEXT) return;
        if (g.withHead > 0) return;
        /* 组内取众数轨道声明，避免一个特例把整组带偏（S33 有 w1/w2/w3 三档比例）。 */
        let mode = '', modeN = -1;
        g.gtcs.forEach((n, k) => { if (n > modeN) { modeN = n; mode = k; } });
        const tracks = splitTracks(mode);
        const nums = tracks.map((t) => parseFloat(t));
        const allNum = tracks.length > 0 && nums.every((n) => Number.isFinite(n));
        const narrow = allNum ? nums.filter((n) => n < GUTTER).length : 0;
        const c = {
          el: g.parent, kind: 'group', chars: g.chars, kids: g.kids, imgKids: g.imgKids,
          imgShare: g.kids ? +(g.imgKids / g.kids).toFixed(2) : 0,
          avgKid: g.n ? Math.round(g.chars / g.n) : 0,
          raw: tracks.length, gutters: narrow,
          wide: allNum ? colCount(nums) : tracks.length,
          parts: allNum ? (narrow >= 2 ? nums.filter((n) => n >= GUTTER) : nums) : [],
          why: '', label: key.slice(0, 52),
        };
        if (c.wide < 2) c.why = 'cols<2';
        else { const lm = landOf(g.parent); if (lm) c.why = 'landmark:' + lm; }
        cands.push(c);
      });

      /* ── 取第一：文字量为主，轨道数为次 ── */
      cands.sort((a, b) => b.chars - a.chars || b.wide - a.wide);
      const pool = cands.filter((c) => !c.why);
      const pick = pool.length ? pool[0] : null;

      /* gridTracks = 0 有歧义，必须分开写：
           · 页面上**确实有**多于一个板块（cands 非空）但没一个合格
             ⇒ 这一页没有多栏版心（S14「不使用固定栏数」、S16「不使用正交栏」、
                S34 七块缩进序列）。0 是正确的测量结果，不是失败。
           · 整个页面一个候选都没有 ⇒ 真的没测到。
         compare.mjs 只看数字，所以另给一个 gridFrom 说明口径。 */
      const gridTracks = pick ? pick.wide : 0;
      const gridSel = pick ? pick.label : '';
      const gridFrom = pick ? pick.kind
        : (cands.length ? 'no-column-layout' : 'nothing-measured');
      const partsSum = pick ? pick.parts.reduce((a, b) => a + b, 0) : 0;
      /* ② 主轴比例与 ① 用**同一个** pick，所以不可能出现「栏数报 3、比例报 [0.5,0.5]」
         那种自相矛盾（旧代码两段各自扫一遍 DOM，面积差 4px 就会指向不同元素）。
         column-count 的容器没有轨道像素值，这里返回空数组 —— 不编造等分比例。 */
      const mainRatio = partsSum > 0 ? pick.parts.map((v) => +(v / partsSum).toFixed(3)) : [];

      /* maxColCount：column-count 口径，同样排除页头/页脚/侧栏
         （S09 的页脚 3 列会把 3 这个数蒙对，但它和版心的 3 栏不是同一件事）。 */
      let maxColCount = 1;
      document.querySelectorAll('*').forEach((el) => {
        const c = parseInt(getComputedStyle(el).columnCount, 10);
        if (!Number.isFinite(c) || c <= maxColCount) return;
        if (landOf(el)) return;
        maxColCount = c;
      });

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
        /* 只有真的会画出来的元素才算：必须设了 stroke 色且不是 transparent */
        const v = px(cs.strokeWidth);
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
       * ⚠️ 刻意**不用正则**：这段代码整体在模板字符串里，正则里的反斜杠必须双写，
       * 而本文件已经因为这个坑坏过多次（split(/\\s+/)、rgbToHex）。
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

      /* 自检表：每个候选的轨道数 / 文字量 / img 占比 / 被判为什么。
         为什么要留这一路：「度量器选错了元素」这种故障，光看最终那个数字看不出来 ——
         S01 报「2 轨」在数值上完全正常，只有把候选集摊开才看得出它选的是图片格。
         下一个人再改判据时，先看这张表，再决定要不要动。 */
      const gridCandidates = cands.slice(0, 24).map((c) => ({
        sel: c.label, kind: c.kind, rawTracks: c.raw, cols: c.wide, gutters: c.gutters,
        chars: c.chars, kids: c.kids, imgKids: c.imgKids, imgShare: c.imgShare, avgKid: c.avgKid,
        verdict: c === pick ? 'PICK' : (c.why || 'ok-not-max'),
      }));

      return {
        gridTracks, gridSel, gridFrom, maxColCount, mainRatio,
        maxHeadPx: maxHead, bodySizePx: bodySize, headBodyRatio,
        borderWidths: Array.from(widths).sort((a, b) => a - b),
        svgStrokeWidths: Array.from(strokes).sort((a, b) => a - b),
        hexCount: hexes.size, hexes: Array.from(hexes).sort(),
        imgCount: imgs.length, imgVisible: visible,
        pageHeight: de.scrollHeight,
        consoleErrors: (window.__errs || []).length,
        gridCandidates,
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

/* CLI
 *
 *   node deliverables/74-q7/measure.mjs <html 文件>
 *   node deliverables/74-q7/measure.mjs --debug <html 文件>
 *
 * `--debug` 打印候选表。调判据时**先看这张表**：度量器选错元素的时候，
 * 最终那个数字往往看起来完全正常（S01 报「2 轨」就是个合法数字，错的是它量的元素）。
 * 不加 --debug 时 gridCandidates 字段被剥掉，输出与旧版逐字节可比。 */
/* ⚠️ 判断「是不是直接运行本文件」不能用 `process.argv[1].endsWith('measure.mjs')`。
 * 实测踩过：任何以 measure.mjs 结尾的脚本（例如 `_live-measure.mjs`）import 本模块时，
 * 那个 endsWith 也为真 ⇒ CLI 分支被误触发 ⇒ argv 里的 `S01` 被当成文件名，
 * 在 import 方还没开始跑之前就多跑一次 measure，并把错误抛到 import 方的堆栈上
 * （现象是同一个函数打印两次 [nav]，一次路径对一次路径错）。
 * 正确做法是比对**解析后的绝对路径**。 */
const SELF = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === SELF) {
  const args = process.argv.slice(2);
  const debug = args.includes('--debug');
  const file = args.find((a) => !a.startsWith('--'));
  if (!file) { console.error('用法: node measure.mjs [--debug] <html 文件>'); process.exit(2); }
  measure(file).then((m) => {
    if (!debug) {
      const { gridCandidates, ...rest } = m;
      console.log(JSON.stringify(rest, null, 2));
      return;
    }
    const rows = m.gridCandidates || [];
    console.log('轨道判据自检（按文字量降序，前 24 个候选）');
    console.log('  verdict          raw cols gutter  chars  kids img  share avgKid  sel');
    for (const r of rows) {
      const v = (r.verdict === 'PICK' ? '★ PICK          ' : '  ' + r.verdict).padEnd(16);
      console.log(`  ${v} ${String(r.rawTracks).padStart(3)} ${String(r.cols).padStart(4)} ${String(r.gutters).padStart(6)} ${String(r.chars).padStart(6)} ${String(r.kids).padStart(5)} ${String(r.imgKids).padStart(3)} ${String(r.imgShare).padStart(6)} ${String(r.avgKid).padStart(6)}  ${r.sel}`);
    }
    const picked = rows.find((r) => r.verdict === 'PICK');
    console.log(`\n选中：${picked ? picked.sel : '(无)'}`);
    console.log(`  gridTracks=${m.gridTracks}  gridFrom=${m.gridFrom}  mainRatio=${JSON.stringify(m.mainRatio)}  maxColCount=${m.maxColCount}`);
  }).catch((e) => { console.error(e); process.exit(1); });
}
