#!/usr/bin/env node
/* 选型台界面文案闸门（2026-11-04 新增，W5）
 *
 * 为什么需要它：`check-docs.mjs` 有 13 条断言，**全部针对 README.md**；
 * `index.html` 是产品界面，在此之前**一条断言都没有**。后果是实测出来的：
 *   · summary 写「11 组 47 颗芯片」，实际 10 组 73 颗
 *   · 「多数案 10 段、个别 9 段」，实际 12 段
 * 两个错误数字在公网 `sqkl520.github.io` 上至少对外服务了 8 天。
 *
 * 判据的设计原则：**界面里复述可计算量的数字必须派生，不许手打。**
 * W2 已把这两处改成 `<span data-derived="...">`，由 app.js 的 fillDerived() 现算。
 * 这个闸门守的就是那个机制不被绕过 —— 它查的是「有没有退回手写」，不是「数字对不对」。
 * 数字对不对由 `probe-ui.mjs` 在真实浏览器里量（那需要跑 app.js，静态扫不到）。
 *
 * 用法：
 *   node prototypes/_build/check-ui-copy.mjs
 *   node prototypes/_build/check-ui-copy.mjs --selftest   # 变异测试
 *
 * 退出码：0 无 FAIL；1 有 FAIL。
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/* 仓库根：与其他闸门一致用 `new URL('../..', import.meta.url)`。
 * 注意它与 `resolve(fileURLToPath(import.meta.url), '../..')` **不同** ——
 * 前者以文件所在**目录**为基址（所以 ../.. = 仓库根），
 * 后者以**文件本身**为基址（要 ../../.. 才是仓库根）。这里踩过一次。 */
const ROOT = decodeURIComponent(new URL('../..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const SEL = join(ROOT, 'prototypes/_selection');
const HTML = join(SEL, 'index.html');
const CSS = join(SEL, 'style.css');
const APP = join(SEL, 'app.js');

const QUIET = process.argv.includes('--quiet');
const findings = [];
const add = (level, rule, msg) => findings.push({ level, rule, msg });

/* ── 读取 ────────────────────────────────────────────────────────────── */
function stripHtmlComments(s) {
  return s.replace(/<!--[\s\S]*?-->/g, ' ');
}
function stripCssComments(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, ' ');
}

const rawHtml = readFileSync(HTML, 'utf8');
const html = stripHtmlComments(rawHtml);
const rawCss = readFileSync(CSS, 'utf8');
const css = stripCssComments(rawCss);
const app = readFileSync(APP, 'utf8');

/* fillDerived() 认识的 key（从 app.js 里现读，不手抄 —— 手抄的清单会和实现脱节）。 */
function derivedKeysFromApp() {
  const m = app.match(/var vals = \{([\s\S]*?)\};/);
  if (!m) return null;
  return new Set([...m[1].matchAll(/'([\w-]+)'\s*:/g)].map((x) => x[1]));
}
const DERIVED_KEYS = derivedKeysFromApp();

/* ══════════════════════════════════════════════════════════════════════
   断言 1：所有 data-derived 的 key 都必须是 fillDerived() 认识的
   —— 否则那个 span 会永远显示它的 HTML 兜底值（静态数字），而没人会发现。
   ══════════════════════════════════════════════════════════════════════ */
const usedKeys = [...html.matchAll(/data-derived="([\w-]+)"/g)].map((m) => m[1]);
if (!DERIVED_KEYS) {
  add('FAIL', 'derived-keys-parseable', '在 app.js 里找不到 `var vals = {...}`，无法确定 fillDerived 认识哪些 key');
} else {
  for (const k of new Set(usedKeys)) {
    if (!DERIVED_KEYS.has(k)) {
      add('FAIL', 'derived-key-unknown', `index.html 里有 data-derived="${k}"，但 fillDerived() 不认这个 key —— 它会永远显示兜底值`);
    }
  }
  /* fillDerived 必须给每个填过的 span 打 data-filled 标记。
   * 为什么需要这个标记：一个变异审计实测出过假绿 —— `fillDerived()` 里插一个 throw
   * （数字退回 HTML 兜底），再把兜底值"顺手更新成正确值"（11→10、45→73），
   * 光比对数字的断言会报 8 PASS / 0 FAIL，而页面上的数字根本不是算出来的。
   * 有了标记，闸门可以先问「跑过没有」再问「对不对」。 */
  if (!/setAttribute\(\s*['"]data-filled['"]/.test(app)) {
    add('FAIL', 'derived-no-filled-marker',
      'app.js 的 fillDerived() 没有写 data-filled 标记 —— 闸门就无法区分「算出来的数字」和「HTML 兜底值」');
  }
  for (const k of DERIVED_KEYS) {
    if (!usedKeys.includes(k)) {
      add('WARN', 'derived-key-unused', `fillDerived() 会算 "${k}"，但 index.html 里没有对应的 data-derived 节点`);
    }
  }
}

/* ══════════════════════════════════════════════════════════════════════
   断言 2：几个特定位置不许再出现手写的数字
   这是「回归」判据：W2 修掉的正是这几处，任何一处退回手写都要红。
   ══════════════════════════════════════════════════════════════════════ */
const HARDCODED_GUARDS = [
  {
    rule: 'chip-count-hardcoded',
    /* 筛选条 summary 里的「N 组 M 颗」。允许夹着 data-derived 的 span，
       所以先把 span 整体抹成占位符，再看还有没有裸数字。 */
    re: /rail-fold-sum[^>]*>([\s\S]*?)<\/summary>/,
    what: '筛选条 summary（组数 / 芯片数）',
    digits: /\d+\s*组|\d+\s*颗/,
  },
  {
    rule: 'field-count-hardcoded',
    re: /class="[^"]*\brail-note\b[^"]*"[^>]*>([\s\S]*?)<\/div>/,
    what: '「怎么用」说明里的字段段数',
    digits: /(多数案|个别)\s*\d+\s*段/,
  },
];
/* ══════════════════════════════════════════════════════════════════════
   断言 2：任何面向用户的数字都不得手写
   ──────────────────────────────────────────────────────────────────────
   这一条原来只有两条**硬编码锚点**（rail-fold-sum / rail-note），守的是
   「W2 修过的那两处没有退回手写」。实测它的盲区有多大：往
   `index.html` 的 `.rail-hint` 里塞一句「实测 999 个方案里 888 个是暗底」，
   闸门仍然报 **FAIL 0 / WARN 0** —— 连 999（实际 35）都看不见。
   这就是第 ⑤ 类缺陷：闸门与被测对象共享同一个盲区。锚点守得越紧，
   越会给人「这一类已经守住了」的错觉。

   新判据换了一层：**扫全部可见文本节点**，凡出现「数字 + 中文量词」的，
   必须要么在 `<span data-derived>` 里（派生），要么在 WHITELIST 里被解释
   为什么它不需要派生。加锚点只能把「已知两处」扩成「已知四处」，下一次
   仍然会漏；换层次才有止住下一轮的可能（rail-hint 已漂移过至少一轮：
   30→35，13 个月无人发现）。
   ══════════════════════════════════════════════════════════════════════ */

/* 白名单：每一行必须写清「这个数字为什么不会随数据漂移」。
   写白名单贵，是为了让"我认为它不会漂"这个判断从脑子里落到文件里。 */
const RATIO_WORDS = '个|案|组|颗|段|条|张|屏|次|款|字|带|处|项|家|位';
/* ⚠️ 不要写成 `new RegExp(`\\d+\\s*...`)`。
 * 实测踩过：模板字符串里的 `\\d` 会被当成转义 ½ 次，构造出来的 source 是
 * `d+s*` —— 一个匹配不到任何东西的正则。于是整条断言永远 PASS，
 * 而它看起来"加了断言、也绿了"，是最难发现的一种假绿（第 ③ 类：断言恒真）。
 * 这里改用不含任何反斜杠的字符类写法，从根上不给转义留空间。 */
const NUM_RE = new RegExp('[0-9]+[ ]*(?:' + RATIO_WORDS + ')', 'g');

/* 只取**可见**文本：去掉注释、script、style，再按标签切开。 */
function visibleTextNodes(s) {
  const body = s
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, '\u0000');           // 标签变分隔符，文本段之间不会粘
  return body.split('\u0000').map((t) => t.trim()).filter(Boolean);
}

const WHITELIST = [
  /* 键盘快捷键：写死在 HTML，永不随数据变。
     注意 text 写的是**命中值本身**（'1'），不是数字（'1' 与 '1 个' 不是一回事）；
     匹配由下面的 wl() 逐条比对，不做子串包含。 */
  { file: 'index.html', text: '1', why: '键盘快捷键' },
  { file: 'index.html', text: '2', why: '键盘快捷键' },
  { file: 'index.html', text: '3', why: '键盘快捷键' },
  /* 向导五问：产品定义的常量，不来自数据。 */
  { file: 'index.html', text: '五', why: '向导固定五问' },
  { file: 'wizard.html', text: '五', why: '固定五问' },
  /* 模板层三个模板：templates/ 目录的产品定义，不是 SCHEMES。 */
  { file: 'index.html', text: '三', why: 'templates/ 固定三个' },
  /* 向导的「3 推荐 + 3 排除」：产品定义（wizard.js 里是 slice(0,3)），
     不来自数据规模，扩到 100 个案也还是 3 个。它归常量管，
     一旦有人把它改成"按比例取 N"，这条白名单就该删掉并改成派生。
     '推荐这 3 个' 与 '收成 3 个' 都是同一个 3，统一登记为 '3'（按文件）。
     注意：这一条会同时放行 wizard.html 里**所有**的「3 个」命中 ——
     wizard.html 目前只有这三处，加新的「3 个」时请重新审视。 */
  { file: 'wizard.html', text: '3', why: '推荐槽 / 排除槽固定 3（wizard.js slice(0,3)）' },
];
/* ⚠️ 白名单的匹配语义是「**整条命中**都落在白名单条目里」。
 * 曾写成 `text.includes(w.text)` —— 于是 `{text:'1'}` 这条（键盘快捷键 1）
 * 让任何含字符 "1" 的文本全部通过，包括「18 个方案」「30 个」。实测这条新断言
 * 因此**一次都没有真正报过**，而它看起来加了、也绿了：又一个恒真断言。
 * 现在：把文本里的**每一条数字命中**逐个取出，只有"这一条命中本身"是白名单
 * 里逐字登记的值时才放行。'1' 只放行 '1'，不放行 '18 个'。 */
const wl = (file, hits) => {
  if (!hits || !hits.length) return true;
  return hits.every((h) => {
    const num = h.replace(/[^0-9]/g, '');
    const unit = h.replace(/[0-9\s]/g, '');
    return WHITELIST.some((w) => w.file === file && (w.text === num || w.text === h || w.text === unit));
  });
};

const FILES = [
  { name: 'index.html', src: html, raw: rawHtml },
  { name: 'wizard.html', src: stripHtmlComments(readFileSync(join(SEL, 'wizard.html'), 'utf8')), raw: null },
];
for (const f of FILES) {
  /* 先把 data-derived 的**内容**抹成占位符（span 里的数字由 JS 填，不算手写） */
  const masked = f.src.replace(/<span[^>]*data-derived="[^"]*"[^>]*>[\s\S]*?<\/span>/g, '<DERIVED/>');
  for (const node of visibleTextNodes(masked)) {
    if (node === '<DERIVED/>' || node.includes('<DERIVED/>')) {
      /* 整段里只要还夹着别的数字，仍要报 —— 只豁免被 span 包住的那一段。 */
      const rest = node.replace(/<DERIVED\/>/g, ' ');
      const hits = rest.match(NUM_RE);
      if (hits && !wl(f.name, hits)) {
        add('FAIL', 'derived-number-hardcoded',
          `${f.name} 的可见文本里混着手写的数字（同一段里另有派生槽）：${hits.join('、')} —— 「${rest.trim().slice(0, 60)}」`);
      }
      continue;
    }
    const hits = node.match(NUM_RE);
    if (hits && !wl(f.name, hits)) {
      add('FAIL', 'derived-number-hardcoded',
        `${f.name} 的可见文本里有手写的数字：${hits.join('、')} —— 「${node.slice(0, 70)}」`);
    }
  }
}

/* 保留原来两条锚点检查：它们查的是**锚点还在不在**（HTML 结构回归），
   与新判据查的"数字对不对"是两件事，不能互相替代。 */
for (const g of HARDCODED_GUARDS) {
  const m = html.match(g.re);
  if (!m || m[1] === undefined) { add('WARN', 'guard-anchor-missing', `找不到「${g.what}」的锚点（HTML 结构变了？）`); continue; }
  /* 抹掉 data-derived span 的**内容**再查 —— span 本身可以留，里面的数字由 JS 填 */
  const masked = m[1].replace(/<span[^>]*data-derived="[^"]*"[^>]*>[\s\S]*?<\/span>/g, '<DERIVED/>');
  if (g.digits.test(masked)) {
    add('FAIL', g.rule, `「${g.what}」里还有手写的数字：${(masked.match(g.digits) || [])[0]}`);
  }
}

/* ══════════════════════════════════════════════════════════════════════
   断言 3：图例承诺的「实心 / 虚边」必须在 CSS 里真的有两条不同规则
   index.html 的图例说「实心＝有直连方案，虚边＝换文案能用」。
   在 W2 之前，`.is-direct` / `.is-near` 在全仓 CSS 里是 0 处引用 —— 图例是空话。
   ══════════════════════════════════════════════════════════════════════ */
{
  const hasDirect = /\.scene-chip\.is-direct\s*\{[^}]*border-style\s*:\s*solid/.test(css);
  const hasNear = /\.scene-chip\.is-near\s*\{[^}]*border-style\s*:\s*dashed/.test(css);
  if (!hasDirect || !hasNear) {
    add('FAIL', 'legend-not-implemented',
      `图例承诺「实心 vs 虚边」，但 CSS 里 ${!hasDirect ? '缺 .is-direct{border-style:solid} ' : ''}${!hasNear ? '缺 .is-near{border-style:dashed}' : ''}`);
  }
  /* 近似芯片挂在 .scene-more 里（.chips 之外），必须被同一个选择器覆盖 ——
     这是 W2 那个「视觉倒置」的根因。 */
  if (!/\.scene-more button/.test(css)) {
    add('FAIL', 'near-chips-unstyled',
      'CSS 里没有 `.scene-more button` 的样式 —— 28 颗近似芯片会退回 UA 的 16px/outset，比直连芯片更大更粗');
  }
}

/* ══════════════════════════════════════════════════════════════════════
   断言 4：注释声称的行为必须在标记里真的存在
   W2 之前，index.html 与 style.css 两处注释都在按「#count 是 aria-live 的活口」
   论证布局决定，而那个属性根本不存在。
   ══════════════════════════════════════════════════════════════════════ */
{
  const rawSaysLive = /aria-live/.test(rawHtml) || /aria-live/.test(rawCss);
  const reallyLive = /id="count"[^>]*aria-live/.test(html) || /aria-live[^>]*id="count"/.test(html);
  /* 只在注释提过 aria-live 且指向 #count 时才要求实现 */
  const commentClaimsCountLive = /#count[^\n]{0,40}aria-live|aria-live[^\n]{0,40}#count/.test(rawHtml + rawCss);
  if (commentClaimsCountLive && !reallyLive) {
    add('FAIL', 'aria-live-claimed-not-implemented',
      '注释声称 #count 是 aria-live 活口，但标记里没有这个属性');
  }
  if (!reallyLive) {
    add('FAIL', 'count-not-live', '#count 没有 aria-live —— 筛选结果与复制确认都不会被播报');
  }
}

/* ══════════════════════════════════════════════════════════════════════
   断言 5：data.js 的字段必须有消费者（scenesNo 类）
   这一条只做**已知字段**的定点检查，不做通用的「所有字段都要有消费者」——
   后者会误报大量本就只给下游用的字段（palette/gate/shots 等）。
   ══════════════════════════════════════════════════════════════════════ */
{
  const FIELDS_WITH_UI = ['scenesNo'];
  for (const f of FIELDS_WITH_UI) {
    const inApp = new RegExp(`\\b${f}\\b`).test(app);
    const inPc = /scenesNo/.test(readFileSync(join(SEL, 'prompt-copy.js'), 'utf8'));
    if (!inApp && !inPc) {
      add('FAIL', 'field-no-consumer', `data.js 的 ${f} 在 app.js / prompt-copy.js 里都没有消费者（有值但没人读）`);
    }
  }
}

/* ══════════════════════════════════════════════════════════════════════
   断言 6：界面上的豁免判定，必须与 check-contract.mjs 的 C1 同判据
   ──────────────────────────────────────────────────────────────────────
   2026-11-05：`app.js` 新增 gateVerdict()，把契约 §9.15 允许表搬进界面，
   于是卡片上「FAIL 3」变成「检查 3 · 契约允许」，筛选栏也不再出现
   「FAIL 3 → 5 案」。动机是对的（那 5 案的 17 条 FAIL 全在允许表内），
   但**这引入了一个新的信任点**：豁免判定写在渲染层，如果它错了，
   界面会把真缺陷说成"契约允许"——这比原来显示红字更危险，
   因为它把错误包装成了权威。

   两个实现各有各的数据源：
     · check-contract.mjs → prototypes/_prompts/minitems-parsed.json
     · app.js gateVerdict → window.STYLE_PROMPTS.schemes[].capacity.minPics
   两份至今逐条相等（实测 35/35 一致），但**没有任何东西保证它继续相等**。
   一旦分叉，闸门说"这案豁免成立"、界面说"不成立"（或反过来），
   而两边都会绿 —— 各自都在自己的判据里自洽。

   这条断言就是把两个数据源钉在一起：
     ① 两份 minPics 逐案相等；
     ② app.js 里「有条件豁免」的规则名集合，等于 check-contract 的 CONDITIONAL 键集合。
   任一条不成立 → FAIL，指名是哪一案/哪条规则。
   ══════════════════════════════════════════════════════════════════════ */
{
  const miPath = join(ROOT, 'prototypes/_prompts/minitems-parsed.json');
  const contractPath = join(ROOT, 'prototypes/_build/check-contract.mjs');
  if (!existsSync(miPath)) {
    add('FAIL', 'exemption-source-missing', '找不到 prototypes/_prompts/minitems-parsed.json —— 无法校验豁免判定的数据源');
  } else {
    let fromJson = {};
    try {
      const mj = JSON.parse(readFileSync(miPath, 'utf8').replace(/^﻿/, ''));
      fromJson = Object.fromEntries(mj.map((x) => [x.id, x.minPics]));
    } catch (e) {
      add('FAIL', 'exemption-source-unparsable', 'minitems-parsed.json 解析失败：' + (e.message || e));
    }
    /* 从 app.js 里现读它用的豁免条件（不手抄 —— 手抄的会和实现脱节） */
    const lowPicMatch = app.match(/pics\s*<=\s*(\d+)/);
    const appThreshold = lowPicMatch ? Number(lowPicMatch[1]) : null;
    const cMatch = existsSync(contractPath)
      ? readFileSync(contractPath, 'utf8').match(/CONDITIONAL\s*=\s*\{([\s\S]*?)\};/)
      : null;
    const contractThresholds = new Set();
    if (cMatch) for (const m of cMatch[1].matchAll(/mp\s*<=\s*(\d+)/g)) contractThresholds.add(Number(m[1]));
    if (appThreshold === null) {
      add('FAIL', 'exemption-threshold-unreadable', '在 app.js 里找不到 `pics <= N` 形式的豁免阈值 —— 判据结构变了？');
    }
    if (!cMatch) {
      add('FAIL', 'exemption-conditional-unreadable', '在 check-contract.mjs 里找不到 CONDITIONAL 定义 —— 两处判据无法比对');
    } else if (appThreshold !== null && !contractThresholds.has(appThreshold)) {
      add('FAIL', 'exemption-threshold-diverged',
        `app.js 用 minPics ≤ ${appThreshold} 判条件豁免，而 check-contract.mjs 的 CONDITIONAL 用的是 ${[...contractThresholds].join('/')} —— 两处判据已经分叉`);
    }
    /* 逐案比对两份 minPics：这不是"再算一遍"，是证两个源是同一个源 */
    let checked = 0, diverged = [];
    const pat = /'(S\d{2})':\s*\{\s*plain:/g;
    void pat;
    /* app.js 侧走 prompts.js（它才是界面读的那份）。
       ⚠️ 不用正则/JSON.parse 抠 —— prompts.js 是 `window.STYLE_PROMPTS = {...}`
       的赋值语句，不是纯 JSON，抠块状文本会脆。
       直接在一个隔离的 `window` 桩里执行它，比解析它的文本可靠一个量级：
       这正是界面运行时做的事，两边读到的一定是同一份。 */
    let fromPrompts = {};
    const promptsPath = join(SEL, 'prompts.js');
    if (existsSync(promptsPath)) {
      try {
        const src = readFileSync(promptsPath, 'utf8');
        const sandbox = { window: {} };
        const fn = new Function('window', src + '\n;return window.STYLE_PROMPTS;');
        const P = fn(sandbox.window);
        for (const s of (P && P.schemes) || []) {
          if (s && s.id && s.capacity && typeof s.capacity.minPics === 'number') {
            fromPrompts[s.id] = s.capacity.minPics;
          }
        }
      } catch (e) {
        add('FAIL', 'exemption-prompts-unreadable', 'prompts.js 执行失败，界面豁免判定的数据源无法校验：' + (e.message || e));
      }
    }
    const ids = Object.keys(fromJson);
    for (const id of ids) {
      if (!(id in fromPrompts)) continue;
      checked++;
      if (fromPrompts[id] !== fromJson[id]) diverged.push(`${id}：界面=${fromPrompts[id]} 契约闸门=${fromJson[id]}`);
    }
    if (diverged.length) {
      add('FAIL', 'exemption-source-diverged',
        `豁免判定的两个数据源已经不一致（界面读 prompts.js，契约闸门读 minitems-parsed.json）：${diverged.join('；')}`);
    } else if (checked === 0) {
      add('WARN', 'exemption-source-unchecked',
        '没能从 prompts.js 解析出任何 minPics —— 这条一致性校验实际上没跑（不是通过，是没检查）');
    }
  }
}

/* ══════════════════════════════════════════════════════════════════════
   --selftest：证明这条闸门真的会响
   ──────────────────────────────────────────────────────────────────────
   起因：这份脚本的文件头从 2026-11-04 起就写着 `--selftest`，但**从来没实现**。
   一条自称有变异测试、实际没有的断言，比没有断言更糟：下一个人看到文件头的
   用法说明，会以为"这条已经自证过了"。
   而这一轮实测恰好证明了自证的必要 —— 新加的「可见文本不许有手写数字」判据，
   第一版写出来时同时踩了两个恒真陷阱：
     · `new RegExp(`\\d+...`)` 构造出来是 `d+s*`，一个永不匹配的正则；
     · 白名单用 `text.includes('1')` 匹配，任何含 "1" 的句子（如 "18 个"）全放行。
   两条叠起来，闸门在任何输入下都报 FAIL 0。若早有 --selftest，第一个陷阱
   在写完那分钟就会被发现。

   每个变异体只改一处，断言"该响的那条规则确实响了"。任一变异体没响就 exit 1
   并指名是哪一条漏了 —— 失败时必须说清"哪条断言是废的"，不能只说"失败"。
   ══════════════════════════════════════════════════════════════════════ */
if (process.argv.includes('--selftest')) {
  const { execFileSync } = await import('node:child_process');
  const { writeFileSync, copyFileSync, unlinkSync } = await import('node:fs');
  const RULES_MUT = [
    {
      name: 'rail-hint 手写数字',
      file: 'index.html',
      from: '按调色板里最高彩度算。',
      to: '按调色板里最高彩度算。实测 999 个方案里 888 个是暗底。',
      expect: 'derived-number-hardcoded',
    },
    {
      name: '派生槽退回手写',
      file: 'index.html',
      /* ⚠️ 这条锚点随 derived key 改名要一起改。
       * 2026-11-05：`band-top` 改名为 `warm-top`（那一组从"底色属于哪条带"
       * 换成"暖色还是冷色"之后，键名跟着不再准确）。锚点没跟上时
       * selftest 报的是"变异体没能应用（锚点变了？）"——那正是它该做的事：
       * 不假装通过。 */
      from: /<span data-derived="warm-top">[^<]*<\/span>/,
      to: '18 个方案',
      expect: 'derived-number-hardcoded',
    },
    {
      name: 'wizard 参照行混入手写',
      file: 'wizard.html',
      from: '中位数 <span data-wz="words-med">',
      to: '中位数（30 案）<span data-wz="words-med">',
      expect: 'derived-number-hardcoded',
    },
    {
      name: 'title 里的总数写死',
      file: 'index.html',
      from: '<title>选型台 · 全部网站设计风格方案</title>',
      to: '<title>选型台 · 35 个网站设计风格方案</title>',
      expect: 'derived-number-hardcoded',
    },
    /* 断言 6 的变异体：豁免判定的两个数据源分叉。
       这条比上面四条更要紧 —— 上面四条抓的是"数字写错了"，
       这一条抓的是"界面的权威结论与闸门的结论不一致"。
       它需要在**别的目录**改文件，所以下面 selftest 支持 `file` 带路径前缀。 */
    {
      name: '豁免阈值分叉（app.js 2→3）',
      file: 'app.js',
      from: 'pics <= 2',
      to: 'pics <= 3',
      expect: 'exemption-threshold-diverged',
    },
    {
      name: '豁免数据源分叉（minPics 被单边改动）',
      file: '../_prompts/minitems-parsed.json',
      from: /("id":\s*"S31",[\s\S]*?"minPics":\s*)1/,
      to: '$19',
      expect: 'exemption-source-diverged',
      json: true,
    },
  ];
  let bad = 0;
  for (const m of RULES_MUT) {
    /* `file` 允许带 `../` 前缀（断言 6 要改 prototypes/_prompts/ 下的文件）。
       用一个临时备份路径**按变异体区分**，否则连续跑会在同一个 .selftest.bak
       上来回覆盖（并发跑时更糟：两个实例互相盖，结果全是假的）。 */
    const p = join(SEL, m.file);
    const bak = p + '.selftest.bak';
    copyFileSync(p, bak);
    try {
      const src = readFileSync(p, 'utf8');
      /* 字符串与正则都走 replace；正则的 `$1` 反向引用在 String.replace 里有效。 */
      const next = src.replace(m.from, m.to);
      if (next === src) { console.log(`  ✗ 变异体「${m.name}」没能应用到 ${m.file}（锚点变了？）`); bad++; continue; }
      writeFileSync(p, next);
      let out = '';
      let failed = false;
      try {
        /* ⚠️ 不要加 --quiet：那个开关会把 findings 全部吞掉，子进程输出为空，
         * 于是下面 `out.includes(m.expect)` 恒为 false，selftest 会**误报每条断言都是废的**。
         * 这正是它第一次跑出来的样子 —— 自测工具自己也会犯"判据写在错误的层"的错。 */
        out = execFileSync(process.execPath, [fileURLToPath(import.meta.url)], { encoding: 'utf8' });
      } catch (e) { failed = true; out = String(e.stdout || '') + String(e.stderr || ''); }
      const hit = out.includes(m.expect);
      if (!failed || !hit) {
        console.log(`  ✗ 变异体「${m.name}」没有让 [${m.expect}] 响 —— 这条断言是废的`);
        bad++;
      } else {
        console.log(`  ✓ ${m.name} → [${m.expect}]`);
      }
    } finally {
      copyFileSync(bak, p);
      try { unlinkSync(bak); } catch { /* 已删 */ }
    }
  }
  console.log(bad ? `\nselftest FAIL：${bad} 个变异体没被抓住` : '\nselftest PASS：全部变异体都被抓住');
  process.exit(bad ? 1 : 0);
}

/* ── 输出 ────────────────────────────────────────────────────────────── */
if (!QUIET) {
  console.log('选型台界面文案：index.html / style.css / app.js');
  const order = { FAIL: 0, WARN: 1, INFO: 2 };
  findings.sort((a, b) => order[a.level] - order[b.level]);
  for (const f of findings) {
    const mark = f.level === 'FAIL' ? '✗' : f.level === 'WARN' ? '~' : '·';
    console.log(`  ${mark} [${f.rule}] ${f.msg}`);
  }
  const nf = findings.filter((f) => f.level === 'FAIL').length;
  const nw = findings.filter((f) => f.level === 'WARN').length;
  console.log(`\n合计 FAIL ${nf} / WARN ${nw}`);
  console.log(`  data-derived key: ${usedKeys.length ? [...new Set(usedKeys)].join(', ') : '（无）'}`);
  console.log(`  fillDerived 认识: ${DERIVED_KEYS ? [...DERIVED_KEYS].join(', ') : '（解析失败）'}`);
}
process.exit(findings.some((f) => f.level === 'FAIL') ? 1 : 0);
