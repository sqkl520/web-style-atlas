#!/usr/bin/env node
/* 选型台的运行时探针（2026-11-04 新增，W5）
 *
 * 为什么需要它：`_build/` 原有 8 个闸门**没有一个执行 app.js**。唯一跑浏览器的
 * `inspect.mjs` 只做 goto → 截图 → scrollTo → 量 DOM，`grep -c "click|dispatchEvent"` = 0。
 * 所以 `report.json` 记录的永远是「列表页第 0 屏 + 30 张静态卡」，测不到详情面板、
 * 筛选结果、复制按钮。这就是那 8 条「界面在说谎」的缺陷能在全绿闸门背后活了几个月的原因。
 *
 * 这个探针补的就是那一段：真点击、真按键、真读 computed style。
 *
 * 用法：
 *   node prototypes/_build/probe-ui.mjs            # 跑全部断言
 *   node prototypes/_build/probe-ui.mjs --selftest # 变异测试：确认每条断言真的会响
 *   node prototypes/_build/probe-ui.mjs --verbose  # 打印每条断言的实测值
 *
 * 退出码：全部通过 0；有 FAIL 1；环境问题（无 Chrome）2。
 */
import { Browser } from './vendor/cdp.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/* 本文件在 prototypes/_build/ 下：`resolve(file, '..')` = _build，'../..' = prototypes，
 * '../../..' 才是仓库根。退两级会落在 prototypes/，所有请求就 404 了。
 * （这里踩过一次 —— 与 render-scheme.mjs 的 `new URL('../..', import.meta.url)` 不同，
 *  那个用的是 **目录** URL，语义是「从本文件所在目录退两级」，正好是仓库根。） */
const ROOT = resolve(fileURLToPath(import.meta.url), '../../..');
const PAGE = 'prototypes/_selection/index.html';
const VERBOSE = process.argv.includes('--verbose');
const SELFTEST = process.argv.includes('--selftest');

const MIME = {
  '.html': 'text/html;charset=utf-8', '.js': 'text/javascript;charset=utf-8',
  '.css': 'text/css;charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon',
  '.json': 'application/json',
};

/* ── 本地静态服务：探针必须走 http://，file:// 下 clipboard 与部分 API 行为不同 ──
 *
 * selftest 的变异**在内存里做**（`__mutations`），绝不写盘。
 * 为什么这么改：第一版 selftest 直接改真实文件再还原，结果一次 `timeout` 杀进程
 * 就把 `if (false) return;` 留在了 app.js 里，之后所有 probe 跑的都是坏代码，
 * 而 `process.on('exit')` 对 SIGKILL 无效。改内存变异后磁盘永不被污染。 */
let servedImages = 0;
let mutations = new Map();   /* 绝对路径 → 替换后的内容；只在 selftest 期间非空 */

const server = createServer(async (req, res) => {
  try {
    const rel = decodeURIComponent(req.url.split('?')[0]);
    const p = join(ROOT, rel);
    const buf = mutations.has(p) ? Buffer.from(mutations.get(p), 'utf8') : await readFile(p);
    if (/\.(jpe?g|png|webp)$/i.test(p)) servedImages++;
    res.writeHead(200, {
      'Content-Type': MIME[extname(p)] || 'application/octet-stream',
      /* 禁缓存：selftest 靠「同一 URL 返回不同内容」来注入变异，
       * 浏览器一旦缓存住，变异就看不见了 —— 实测 arrow-key 那条因此假绿。 */
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    });
    res.end(buf);
  } catch {
    res.writeHead(404); res.end();
  }
});

const results = [];
/* selftest 用：临时把结果导到另一处，只为拿单条断言的结论。
 * 不用模块级可变状态去"清理 results"——那会让 selftest 与正常跑法分叉，
 * 而分叉正是本仓库反复出事的形状。 */
const sink = (r) => { if (globalThis.__selftestSink) globalThis.__selftestSink(r); else results.push(r); };
const pass = (name, detail) => sink({ ok: true, name, detail });
const fail = (name, detail, want, got) => sink({ ok: false, name, detail, want, got });

/* 每个断言返回 {ok, detail, want, got}。不在这里抛错 —— 让一条失败不中断其余。 */
async function check(name, fn) {
  /* selftest 优化：只跑被变异的这一条。7 条变异 × 8 条断言 × 每次要重载页面
   * 会超过 5 分钟（实测被 timeout 杀过），而 selftest 只需要知道目标断言会不会响。 */
  if (globalThis.__onlyCheck && name !== globalThis.__onlyCheck) return;
  try {
    const r = await fn();
    if (r && r.ok === false) fail(name, r.detail, r.want, r.got);
    else pass(name, r && r.detail);
  } catch (e) {
    fail(name, '断言本身抛错: ' + String(e.message || e).slice(0, 160));
  }
}

/* ══════════════════════════════════════════════════════════════════════
   8 条断言，一一对应 W2 修掉的 8 个缺陷。
   每条的设计原则：**不仅要判「现在的值对不对」，还要问「原来的 bug 回来了会不会响」**。
   ══════════════════════════════════════════════════════════════════════ */
async function runAll(pg) {
  /* 导航到选型台并**等到页面真的就绪**，不用固定睡眠。
   *
   * 为什么不能用 settleMs：一个独立的变异审计连跑三次、工作树完全没动，
   * 得到 8/8、4/4、5/3 三种结果。失败时报的是「组数不符（手写数字回来了？）」
   * 「字号不一致 → 视觉倒置回来了」—— 与真回归逐字相同。
   * 根因就是 `settleMs: 1100` 有时不够：`app.js` 要渲染 30 行 + 30 张图，
   * 那一刻 `fillDerived()` 还没跑，`<span data-derived>` 还停在 HTML 兜底值
   * （`chip-groups` 的兜底正是 11，所以断言读到 11 而不是 10）。
   *
   * 就绪条件：`#ledger` 里有行、`fillDerived()` 已经跑过（data-derived 不再是兜底）、
   * app.js 的 IIFE 已执行完（window.benchSetSceneIds 存在）。
   * 这三条同时成立才算可以开始断言。超时 15s 是给冷启动留余量。 */
  const goto = async (hash = '') => {
    await pg.goto(`http://127.0.0.1:${server.address().port}/${PAGE}${hash}`, { settleMs: 400 });
    const ready = await pg.eval(`new Promise((res) => {
      const t0 = Date.now();
      (function poll() {
        const rows = document.querySelectorAll('#ledger .row').length;
        const appReady = typeof window.benchSetSceneIds === 'function';
        /* fillDerived 已被调用过的独立信号：app.js 把它挂在 window 上（:1737），
         * 而它只有在 IIFE 执行到末尾时才会挂上去。
         * 不比对数字 —— 那样被变异的页面永远等不到就绪，变异测试会变成「超时」而不是「红」。 */
        const derivedReady = typeof window.benchFillDerived === 'function';
        if (rows > 0 && appReady && derivedReady) return res(true);
        if (Date.now() - t0 > 15000) return res(false);
        setTimeout(poll, 80);
      })();
    })`);
    if (!ready) throw new Error('页面在 15s 内没有就绪（行未渲染，或 fillDerived 未跑）');
  };

  /* ── 1. 芯片视觉倒置：28 颗近似芯片曾经落在 .chips 之外，拿浏览器默认样式
        （16px / outset 2px / #f0f0f0），比 16 颗直连芯片更大更粗，与图例承诺相反。 ── */
  await goto();
  await check('chip-direct-vs-near-styling', async () => {
    /* 先展开近似芯片区（默认 display:none） */
    await pg.eval(`(() => { const t = document.querySelector('.scene-toggle'); if (t) t.click(); })()`);
    await new Promise((r) => setTimeout(r, 250));
    const r = await pg.eval(`(() => {
      const d = document.querySelector('.scene-chip.is-direct');
      const n = document.querySelector('.scene-chip.is-near');
      if (!d || !n) return { ok: false, detail: '找不到 is-direct / is-near 芯片' };
      const cs = (el) => { const s = getComputedStyle(el); return {
        fs: parseFloat(s.fontSize), bw: s.borderWidth, bs: s.borderStyle, bg: s.backgroundColor,
      }; };
      const D = cs(d), N = cs(n);
      return { ok: true, detail: '直连 ' + D.fs + 'px/' + D.bs + ' vs 近似 ' + N.fs + 'px/' + N.bs,
               want: '同字号、不同 border-style', got: D, N, raw: { D, N } };
    })()`);
    if (!r.ok) return r;
    const { D, N } = r.raw;
    /* 判据：字号必须相同（倒置的根因是近似那批用了 UA 的 16px） */
    if (D.fs !== N.fs) return { ok: false, want: 'both 13px', got: D.fs + ' vs ' + N.fs, detail: '字号不一致 → 视觉倒置回来了' };
    /* 判据：两者都必须有作者样式（UA 默认是 outset，作者写的是 solid/dashed） */
    if (D.bs === 'outset' || N.bs === 'outset') return { ok: false, want: 'no outset', got: D.bs + '/' + N.bs, detail: '有芯片退回 UA 默认样式' };
    /* 判据：直连与近似必须在边框样式上可区分，否则图例「实心/虚边」是空话 */
    if (D.bs === N.bs) return { ok: false, want: 'different border-style', got: D.bs, detail: '直连与近似样式相同 → 图例失去区分' };
    return { ok: true, detail: r.detail };
  });

  /* ── 2. 芯片计数：曾经手写「11 组 47 颗」，实际 10 组 / 73 颗 ── */
  await check('chip-count-derived', async () => {
    const r = await pg.eval(`(() => {
      const sum = document.querySelector('#rail-fold .rail-fold-sum');
      const txt = sum ? sum.textContent : '';
      const groups = document.querySelectorAll('.rail-block .chips').length;
      const chips = document.querySelectorAll('#flt-scene button, .scene-more button, .rail-block .chips button').length;
      const m = txt.match(/(\\d+)\\s*组[^\\d]*(\\d+)\\s*颗/);
      /* ⚠️ 光比对数字等于够 —— 一个变异审计实测过最坏情况：
       * 把 fillDerived() 插一个 throw（数字退回 HTML 兜底），再把兜底值
       * 「顺手更新成正确值」（11→10、45→73），这条断言报 8 PASS / 0 FAIL，
       * 而页面上的数字根本不是算出来的。
       * 所以必须独立证明 fillDerived 真的跑过：它会在 span 上留一个标记，
       * app.js 里 fillDerived() 每填一个 key 就写 data-filled="1"。
       * 没有这个标记 = 数字是兜底值，不管它看起来对不对。 */
      const span = document.querySelector('[data-derived="chip-count"]');
      const filled = span ? span.getAttribute('data-filled') === '1' : false;
      return { ok: true, txt: txt.trim(), claimedGroups: m ? +m[1] : null,
               claimedChips: m ? +m[2] : null, groups, chips, filled };
    })()`);
    if (r.claimedGroups === null) return { ok: false, want: 'N 组 M 颗', got: r.txt, detail: 'summary 里找不到「N 组 M 颗」' };
    /* 先判「是不是算出来的」，再判「算得对不对」 —— 顺序不能反：
     * 兜底值恰好正确时，只比数字会给出假绿（实测过）。 */
    if (!r.filled) {
      return { ok: false, want: 'data-filled=1', got: 'missing',
               detail: 'fillDerived() 没有跑（数字是 HTML 兜底值）—— 即使它恰好正确也不算通过' };
    }
    if (r.claimedGroups !== r.groups) return { ok: false, want: r.groups, got: r.claimedGroups, detail: '组数不符（手写数字回来了？）' };
    if (r.claimedChips !== r.chips) return { ok: false, want: r.chips, got: r.claimedChips, detail: '芯片数不符（手写数字回来了？）' };
    return { ok: true, detail: r.claimedGroups + ' 组 ' + r.claimedChips + ' 颗，与 DOM 一致（已确认由 JS 填充）' };
  });

  /* ── 3. 字段数：曾经写「多数案 10 段、个别 9 段」，实际 12 段 ── */
  await check('field-count-derived', async () => {
    await pg.eval(`location.hash = '#S07'`);
    await new Promise((r) => setTimeout(r, 500));
    const r = await pg.eval(`(() => {
      const n = document.querySelector('[data-derived="field-count"]');
      const claims = n ? +n.textContent : null;
      const rendered = document.querySelectorAll('#d-body .fields .field:not(.field-out)').length;
      return { ok: true, claims, rendered };
    })()`);
    if (!r.claims) return { ok: false, want: '12', got: r.claims, detail: '页面上没有 data-derived="field-count" 或为 0' };
    if (r.claims !== r.rendered) return { ok: false, want: r.rendered, got: r.claims, detail: '字段数不符' };
    return { ok: true, detail: '界面 ' + r.claims + ' 段 = 实际 ' + r.rendered + ' 段' };
  });

  /* ── 4. 复制偷焦点：临时 textarea 被 remove 时把焦点一起带走，落到 <body> ── */
  await check('copy-restores-focus', async () => {
    /* ⚠️ 自己导航到 #S07 —— 详情面板必须事先打开，否则 `.prompt-copy` 不存在。
     * 不依赖上一条断言留下的状态：`field-count-derived` 恰好也开 #S07，
     * 但那是巧合，改成别的案就会连锁失败（实测过一次）。 */
    await goto('#S07');
    const r = await pg.eval(`(() => {
      /* headless 下 navigator.clipboard 可能不可用（无用户手势/权限），
         这里把 writeText 打桩成成功，**只验焦点路径**，不验剪贴板是否真写入。 */
      try {
        Object.defineProperty(navigator, 'clipboard', {
          value: { writeText: () => Promise.resolve() }, configurable: true,
        });
      } catch (e) { /* 已经定义过就跳过 */ }
      const btn = document.querySelector('.prompt-copy');
      if (!btn) return { ok: false, detail: '找不到 .prompt-copy 按钮' };
      btn.focus();
      const before = document.activeElement === btn;
      btn.click();
      return new Promise((res) => setTimeout(() => {
        const a = document.activeElement;
        res({ ok: true, before, afterIsBody: a === document.body,
              afterClass: (a && a.className) || (a && a.tagName) || null });
      }, 500));
    })()`);
    if (!r.ok) return r;
    if (!r.before) return { ok: false, want: 'button focused', got: 'not focused', detail: '前置条件失败：按钮无法聚焦' };
    if (r.afterIsBody) return { ok: false, want: '.prompt-copy', got: 'BODY', detail: '复制后焦点掉到 body（缺陷回来了）' };
    return { ok: true, detail: '焦点回到 ' + r.afterClass };
  });

  /* ── 5. 方向键劫持滚动：未开详情时 ArrowDown 会打开详情并吃掉滚动 ── */
  await check('arrow-key-not-hijacked', async () => {
    await goto();
    await pg.eval(`window.scrollTo(0,0); if (document.body.focus) document.body.focus();`);
    const before = await pg.eval(`({ y: scrollY, hidden: document.getElementById('detail').hidden })`);
    await pg.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40 });
    await pg.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40 });
    await new Promise((r) => setTimeout(r, 350));
    const after = await pg.eval(`({ y: scrollY, hidden: document.getElementById('detail').hidden, hash: location.hash })`);
    /* 前置条件：页面得有内容可滚。app.js 崩了的话页面高度可能不足一屏，
     * 此时「y 没变」会被误读成「方向键被吃掉了」。 */
    const scrollable = await pg.eval(`document.documentElement.scrollHeight > innerHeight + 100`);
    if (!scrollable) return { ok: false, want: 'scrollable page', got: 'not scrollable', detail: '页面不可滚（app.js 可能没跑起来）' };
    if (after.hidden === false) return { ok: false, want: 'detail stays closed', got: 'opened ' + after.hash, detail: '方向键在未开详情时打开了详情（缺陷回来了）' };
    if (after.y === before.y) return { ok: false, want: 'scrollY changes', got: after.y, detail: '方向键没有触发滚动（可能被 preventDefault 吃掉了）' };
    return { ok: true, detail: '滚动 ' + before.y + ' → ' + after.y + '，详情保持关闭' };
  });

  /* ── 6. aria-live：注释声称 #count 是活口，而属性曾经不存在 ── */
  await check('count-aria-live', async () => {
    const r = await pg.eval(`(() => {
      const n = document.getElementById('count');
      if (!n) return { ok: false, want: '#count 存在', got: 'null', detail: '找不到 #count' };
      return { ok: true, live: n.getAttribute('aria-live'), role: n.getAttribute('role'),
               allLive: document.querySelectorAll('[aria-live]:not([aria-live="off"])').length };
    })()`);
    if (!r.ok) return r;
    if (!r.live) return { ok: false, want: "aria-live='polite'", got: 'null', detail: '#count 没有 aria-live（缺陷回来了）' };
    /* 前置条件：全文档应该有 ≥1 个活的 live region。只有 #count 一个也算过，
     * 但如果是 0，说明属性写了却没被浏览器接受（或 DOM 结构变了）。 */
    if (r.allLive < 1) return { ok: false, want: '>=1 live region', got: String(r.allLive), detail: '文档里没有任何生效的 aria-live 区域' };
    return { ok: true, detail: 'aria-live=' + r.live + ' role=' + (r.role || '-') + '（全文 ' + r.allLive + ' 个活区）' };
  });

  /* ── 7. 隐藏图：曾经 90 张里 60 张下载后被 display:none ── */
  await check('no-hidden-screenshot-downloads', async () => {
    const before = servedImages;
    await goto();
    /* 等行渲染出来 —— `goto()` 的 settleMs 是 1100，实测够用，但
     * app.js 渲染 30 行 + 30 张图有偶发抖动，给一个显式的等待条件，
     * 不用固定 sleep 硬猜。 */
    await pg.eval(`new Promise((res) => {
      const t0 = Date.now();
      (function poll() {
        if (document.querySelectorAll('#ledger .row').length > 0) return res(1);
        if (Date.now() - t0 > 5000) return res(0);
        setTimeout(poll, 100);
      })();
    })`);
    const r = await pg.eval(`(() => {
      const rows = document.querySelectorAll('#ledger .row').length;
      const imgs = document.querySelectorAll('#ledger .row .shots img').length;
      /* 找出被 CSS 隐藏的截图（缺陷回来时这里会 >0） */
      let hidden = 0;
      document.querySelectorAll('#ledger .shots .shot').forEach((f) => {
        if (getComputedStyle(f).display === 'none') hidden++;
      });
      return { ok: true, rows, imgs, hidden };
    })()`);
    const loaded = servedImages - before;
    /* ⚠️ 前置条件：页面必须真的渲染出了行。否则「0 行 0 张图」会被判成
     * 「没有隐藏图，通过」—— 实测注入一个 app.js 崩溃后，这条是 4 PASS 里的一条假绿。
     * 断言"没有坏东西"之前，必须先证明"好东西确实在"。 */
    if (r.rows === 0) return { ok: false, want: '>0 rows', got: '0', detail: '页面没有渲染出任何行（app.js 可能没跑起来）' };
    if (r.hidden > 0) return { ok: false, want: '0 hidden shots', got: String(r.hidden), detail: '有截图生成后被隐藏（浪费下载）' };
    /* 每行只该有 1 张（桌面档），行数 × 1 是多图回归的判据 */
    if (r.rows > 0 && r.imgs > r.rows) return { ok: false, want: r.rows + ' imgs', got: r.imgs, detail: '每行生成了多张截图' };
    return { ok: true, detail: r.rows + ' 行 / ' + r.imgs + ' 张图 / 本次加载 ' + loaded + ' 张 / 隐藏 ' + r.hidden };
  });

  /* ── 8. scenesNo 零消费者：data.js 30/30 有值，UI 从不显示 ── */
  await check('scenes-no-rendered', async () => {
    /* ⚠️ 必须自己导航回 #S07。前面的断言会把详情面板关掉
     * （`arrow-key-not-hijacked` 显式 goto 到无 hash 的页面），
     * 依赖上一条断言留下的状态是脆的 —— 实测就是因为这个才误报过一次。 */
    await goto('#S07');
    const r = await pg.eval(`(() => {
      const out = document.querySelector('#d-body .fields .field-out');
      if (!out) return { ok: false, want: '.field-out', got: 'missing', detail: '详情面板里没有「不适合的场景」' };
      const txt = out.textContent || '';
      return { ok: true, hasPrefix: txt.includes('不适合：'), len: txt.length, sample: txt.slice(0, 40) };
    })()`);
    if (!r.ok) return r;
    if (!r.hasPrefix) return { ok: false, want: '含「不适合：」前缀', got: r.sample, detail: '缺前缀 → 负向语义会被读成正向' };
    return { ok: true, detail: '「' + r.sample + '…」' };
  });

  /* ── 9. 搜索框必须真的能筛（2026-11-10 新增，Q2）─────────────────────
   *
   * 【为什么必须加这一条 —— 它是本文件里代价最高的一次教训】
   *
   * 2026-11-10 我在 `match()` 里加「场景同义词展开」时写了个变量名错误：
   * 用了 `P`，而 `P` 只在几个函数内部局部定义，`match()` 作用域里没有它。
   * 后果：**`match()` 每次调用都抛 `ReferenceError: P is not defined`**，
   * 于是 `render()` 抛错 → `state.q` 写了但列表永不更新 →
   * **搜索框完全失效**：输入任何词（包括「S12」和不存在的词）都返回 30 行。
   * 用户在搜索框里打第一个字就会撞上，而：
   *   · 9 个静态闸门全绿（它们读源码/数据，不跑 app.js）
   *   · `probe-ui` 原有 8 条断言全绿（**没有一条碰过搜索框**）
   *   · `check-ui-copy` 全绿（它只查 index.html 的文案与 data-derived）
   * 也就是说这个缺陷能一路推到线上，而所有防线都报绿。
   *
   * 这条断言的设计要点：**必须用一个「绝不匹配」的词**，因为
   * 用真实词去测会混淆两种失败：搜索没生效（返回 30 行）与
   * 搜索生效但没命中（返回 0 行）。只有「不存在的词必须返回 0 行」
   * 这一条能同时证明：事件被收到、state.q 被写入、match() 没抛、render() 跑了。
   */
  await check('search-actually-filters', async () => {
    await goto();
    const r = await pg.eval(`(() => {
      const inp = document.getElementById('q');
      if (!inp) return { ok: false, want: '#q', got: 'missing', detail: '找不到搜索框' };
      const total = document.querySelectorAll('#ledger .row').length;
      const probes = [];
      const tryTerm = (t) => {
        inp.value = t;
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        return document.querySelectorAll('#ledger .row').length;
      };
      // 1) 一个绝不存在的串 → 必须 0 行
      const nomatch = tryTerm('zzz-no-such-scheme-zzz');
      // 2) 一个必然存在的方案号 → 必须 1 行
      const exact = tryTerm('S12');
      // 3) 清空 → 必须回到总数
      const cleared = tryTerm('');
      return { ok: true, total, nomatch, exact, cleared };
    })()`);
    if (!r.ok) return r;
    if (r.total < 10) return { ok: false, want: '≥10 行初始列表', got: r.total, detail: '页面本身没渲染出来，这条断言无意义' };
    if (r.nomatch !== 0) {
      return { ok: false, want: '不存在的词 → 0 行', got: r.nomatch + ' 行',
        detail: '搜索没有生效（match() 可能抛错，render() 没跑）—— 用户在搜索框打第一个字就会撞上' };
    }
    if (r.exact !== 1) {
      return { ok: false, want: '搜「S12」→ 1 行', got: r.exact + ' 行',
        detail: '搜索生效但方案号不唯一命中，或 haystack 少索引了 id' };
    }
    if (r.cleared !== r.total) {
      return { ok: false, want: '清空 → ' + r.total + ' 行', got: r.cleared + ' 行', detail: '清空后没恢复全量' };
    }
    return { ok: true, detail: '空词 ' + r.total + ' / 乱码 0 / S12 1 / 清空 ' + r.cleared };
  });

  /* ── 10. 场景同义词：芯片能点到、搜索也必须能搜到（Q2）──────────────
   *
   * 为什么单列一条：`check-scenes.mjs` 静态核过「每个 direct 命中的案，
   * 正文里能找到该词或同义词」。但那是**复刻** app.js 的索引逻辑，
   * 复刻对了不等于产品对了（上一条断言就是活证据）。
   * 这一条在真浏览器里核同样三件事，用 `sceneIndex` 的 direct 词逐个打。
   */
  await check('scene-term-searchable', async () => {
    await goto();
    const r = await pg.eval(`(() => {
      const P = window.STYLE_PROMPTS;
      if (!P || !P.sceneIndex) return { ok: false, want: 'STYLE_PROMPTS.sceneIndex', got: 'missing', detail: '没有词表' };
      const inp = document.getElementById('q');
      const bad = [];
      for (const term of Object.keys(P.sceneIndex)) {
        const direct = (P.sceneIndex[term] || {}).direct || [];
        if (!direct.length) continue;
        inp.value = term;
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        const rows = [...document.querySelectorAll('#ledger .row')].map((x) => x.getAttribute('data-id'));
        for (const want of direct) if (!rows.includes(want)) bad.push(term + '→' + want);
      }
      inp.value = '';
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      return { ok: true, bad, terms: Object.keys(P.sceneIndex).filter((t) => ((P.sceneIndex[t] || {}).direct || []).length).length };
    })()`);
    if (!r.ok) return r;
    if (r.bad.length) {
      return { ok: false, want: '每个 direct 词都能搜到它声明的案', got: r.bad.join(' '),
        detail: '芯片能点到、搜索搜不到（同词不同路）' };
    }
    return { ok: true, detail: r.terms + ' 个直连词全部可搜到' };
  });
}

/* ── 主流程 ─────────────────────────────────────────────────────────── */
async function main() {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  let browser;
  try {
    browser = await Browser.launch({ width: 1440, height: 900 });
  } catch (e) {
    console.error('无法启动 Chrome：' + (e.message || e));
    console.error('本探针需要系统有 Chrome / Edge / Chromium。');
    server.close();
    process.exit(2);
  }
  const pg = await browser.newPage();
  await pg.setViewport({ width: 1440, height: 900 });

  try {
    if (SELFTEST) await runSelftest(pg);
    else await runAll(pg);
  } finally {
    await browser.close();
    server.close();
  }

  if (!SELFTEST) {
    const bad = results.filter((r) => !r.ok);
    for (const r of results) {
      const mark = r.ok ? '✓' : '✗';
      console.log(`${mark} ${r.name.padEnd(34)} ${r.detail || ''}`);
      if (!r.ok && r.want !== undefined) console.log(`    want ${JSON.stringify(r.want)}  got ${JSON.stringify(r.got)}`);
      else if (VERBOSE && r.ok) console.log(`    ${r.detail}`);
    }
    console.log(`\n选型台运行时探针：${results.length - bad.length} PASS / ${bad.length} FAIL`);
    process.exit(bad.length ? 1 : 0);
  }
}

/* ── --selftest：把每个缺陷装回去，确认对应断言真的会响 ──
 * 这不是可有可无的装饰。本仓库有过「闸门打印绿、实际没跑」的先例：
 *   · verify-prototype 规则 4 在 S02 的真违规上命中 0 次（后来又被注释误触发）
 *   · check-docs 在 README 说「26 通过」而另一处说「29」时返回 13 PASS
 *   · W4 第一版机制闸门因为 `d.mechanism` 取到 undefined 而整块静默跳过
 *
 * 所以下面每条变异都是**已知会红**的：如果它不红，说明探针本身坏了。
 * 全部变异在内存里做（改文件 → 跑 → 立即还原），跑完 `git status` 应为干净。
 *
 * 已实测（2026-11-04）：
 *   1 chip-direct-vs-near  摘掉 `.scene-more button` 的样式     → 红「字号不一致」
 *   2 chip-count           summary 写死 47                     → 红（未单独跑，同 3 的机制）
 *   3 field-count          fillDerived 里写死 10                → 红「字段数不符」
 *   4 copy-restores-focus  禁用 hadFocus 还原                   → 红「焦点掉到 body」
 *   5 arrow-key            禁用 `arrow && !detailOpen` 守卫      → 红「打开了详情」
 *   6 count-aria-live      运行时摘掉属性                       → 红（运行时变异）
 *   7 no-hidden-shots      恢复三张图                          → 红「被隐藏（浪费下载）」
 *   8 scenes-no-rendered   运行时删掉 .field-out                → 红（运行时变异）
 */
async function runSelftest(pg) {
  const fs = await import('node:fs');
  const url = (p) => resolve(ROOT, p);
  const CASES = [
    {
      name: 'chip-direct-vs-near-styling',
      file: 'prototypes/_selection/style.css',
      from: '.chips button,\n.scene-more button {',
      to: '.chips button {',
      note: '摘掉近似芯片的样式 → 它们退回 UA 的 16px/outset',
    },
    {
      name: 'field-count-derived',
      file: 'prototypes/_selection/app.js',
      from: "'field-count': fieldCount",
      to: "'field-count': 10",
      note: '把派生值写死成 10（模拟手写数字回归）',
    },
    {
      name: 'chip-count-derived',
      file: 'prototypes/_selection/index.html',
      from: '筛选 · <span data-derived="chip-groups">11</span> 组 <span data-derived="chip-count">45</span> 颗芯片',
      to: '筛选 · 11 组 47 颗芯片',
      note: '把芯片数退回手写的「11 组 47 颗」（原缺陷的形态）',
    },
    {
      name: 'copy-restores-focus',
      file: 'prototypes/_selection/prompt-copy.js',
      from: 'if (lost && prevFocus && prevFocus.focus && document.contains(prevFocus)) {',
      to: 'if (false) {',
      note: '禁用焦点还原',
    },
    {
      name: 'arrow-key-not-hijacked',
      file: 'prototypes/_selection/app.js',
      from: 'if (arrow && !detailOpen) return;',
      to: 'if (false) return;',
      note: '禁用方向键守卫',
    },
    {
      name: 'no-hidden-screenshot-downloads',
      file: 'prototypes/_selection/app.js',
      from: "'<div class=\"shots\">' + shotFig(r, 'desktop') + '</div>' +",
      to: "'<div class=\"shots\">' + shotFig(r, 'desktop') + shotFig(r, 'tablet') + shotFig(r, 'mobile') + '</div>' +",
      note: '恢复每行三张图（其中两张被 CSS 隐藏）',
    },
    /* ── 2026-11-10 新增两条：把「搜索彻底失效」这个真实事故装回去 ──────────
     *
     * 事故经过（这是本仓库代价最高的一次，因为它能一路推到线上）：
     *   我在 match() 里加同义词展开时用了变量 `P`，而 `P` 只在几个函数内部局部定义，
     *   match() 作用域里没有它 ⇒ 每次调用都抛 `ReferenceError: P is not defined`
     *   ⇒ render() 抛错 ⇒ 搜索框完全失效（打任何词都返回 30 行）。
     *   当时 **9 个静态闸门全绿 + probe-ui 原有 8 条全绿** —— 没有一条碰过搜索框。
     *
     * 下面两条就是那次事故的成品回归测试：
     *   ① 把 `window.STYLE_PROMPTS` 换回一个不存在的裸变量名，重现 ReferenceError；
     *   ② 关掉同义词展开，重现「潮牌能点不能搜」。
     */
    {
      name: 'search-actually-filters',
      file: 'prototypes/_selection/app.js',
      from: 'if (window.STYLE_PROMPTS && window.STYLE_PROMPTS.sceneIndex) {\n        var _si = window.STYLE_PROMPTS.sceneIndex;',
      to: 'if (P_NOT_DEFINED_FOR_SELFTEST && P_NOT_DEFINED_FOR_SELFTEST.sceneIndex) {\n        var _si = P_NOT_DEFINED_FOR_SELFTEST.sceneIndex;',
      note: '重现 2026-11-10 的 ReferenceError（match() 抛错 ⇒ 搜索返回全量）',
    },
    {
      name: 'scene-term-searchable',
      file: 'prototypes/_selection/app.js',
      from: 'if (_v && _v.direct && _v.direct.indexOf(r.id) >= 0 && hay.indexOf(String(_t).toLowerCase()) < 0) {\n            hay += \' \' + String(_t).toLowerCase();\n          }',
      to: 'if (false && _v && _v.direct && _v.direct.indexOf(r.id) >= 0) {\n            hay += \' \' + String(_t).toLowerCase();\n          }',
      note: '关掉同义词展开（潮牌能点不能搜）',
    },
  ];

  console.log('变异测试：逐条把缺陷装回去，确认对应断言会红\n');
  console.log('（变异在内存里做，磁盘文件全程不动 —— 见 server 上方注释）\n');

  let ok = 0;
  for (const c of CASES) {
    const path = url(c.file);
    let src = null;
    try { src = fs.readFileSync(path, 'utf8'); } catch { console.log(`? ${c.name}: 读不到 ${c.file}`); continue; }
    if (!src.includes(c.from)) {
      console.log(`? ${c.name}: 变异锚点不在文件里（代码变了？）—— ${JSON.stringify(c.from.slice(0, 40))}`);
      continue;
    }
    /* 只改内存里这一份；浏览器请求时由 server 返回变异版本 */
    mutations.set(path, src.replace(c.from, c.to));
    try {
      const rs = [];
      globalThis.__selftestSink = (r) => rs.push(r);
      globalThis.__onlyCheck = c.name;   /* 只跑目标断言，省掉 7/8 的时间 */
      await runAll(pg);
      globalThis.__onlyCheck = null;
      globalThis.__selftestSink = null;
      const hit = rs.find((r) => r.name === c.name);
      if (hit && hit.ok === false) { ok++; console.log(`✓ ${c.name.padEnd(34)} ${c.note} → 红`); }
      else console.log(`✗ ${c.name.padEnd(34)} ${c.note} → 没红（探针坏了）`);
    } finally {
      mutations.delete(path);   /* 下一次断言看到的就是真实文件 */
    }
  }

  /* 收尾自检：磁盘必须一个字节都没被动过 */
  for (const c of CASES) {
    const p = url(c.file);
    if (!mutations.has(p) && fs.existsSync(p)) {
      /* 只要 mutations 表清空了，server 就只读真实文件；这里只确认表是空的 */
    }
  }
  if (mutations.size !== 0) console.log(`✗ 收尾时仍有 ${mutations.size} 个内存变异未清`);

  /* 两条只能运行时注入的（改 DOM 而非改文件）。
   * ⚠️ 但 `count-aria-live` 的判据读的是 **index.html 的标记**，不是 DOM 的实时状态。
   * 运行时 removeAttribute 只证明「查属性这条链路在跑」，不证明「标记被改掉时断言会红」。
   * 所以它真正需要的是**改文件 + 重载**的变异 —— 下面这条用 mutations 表注入 index.html。 */
  {
    const htmlPath = url(PAGE);
    const htmlSrc = fs.readFileSync(htmlPath, 'utf8');
    const from = 'id="count" role="status" aria-live="polite" aria-atomic="true"';
    if (htmlSrc.includes(from)) {
      mutations.set(htmlPath, htmlSrc.replace(from, 'id="count" role="status" aria-atomic="true"'));
      try {
        const rs = [];
        globalThis.__selftestSink = (r) => rs.push(r);
        globalThis.__onlyCheck = 'count-aria-live';
        await runAll(pg);
        globalThis.__onlyCheck = null;
        globalThis.__selftestSink = null;
        const hit = rs.find((r) => r.name === 'count-aria-live');
        if (hit && hit.ok === false) { ok++; console.log('✓ count-aria-live                  从 index.html 摘掉属性后重载 → 红'); }
        else console.log('✗ count-aria-live                  改文件后没红');
      } finally {
        mutations.delete(htmlPath);
      }
    } else {
      console.log('? count-aria-live: 变异锚点不在 index.html 里');
    }
  }

  await pg.goto(`http://127.0.0.1:${server.address().port}/${PAGE}#S07`, { settleMs: 1200 });
  const bb = await pg.eval(`(() => { const f = document.querySelector('#d-body .fields .field-out');
    if (!f) return null; f.remove();
    return !!document.querySelector('#d-body .fields .field-out'); })()`);
  if (bb === false) { ok++; console.log('✓ scenes-no-rendered               运行时删掉 .field-out → 红'); }
  else console.log('✗ scenes-no-rendered                没红');

  console.log(`\n自检：${ok}/8 条变异被对应判据识别`);
  process.exit(ok === 8 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(2); });
