#!/usr/bin/env node
/* 数值 → CSS 出处定位（2026-11-11，Q3）
 *
 * 为什么需要它：Q3 的验收是「任取一份提示词，用户能点开看到每个数字的 CSS 出处」。
 * 计划原本给的方案是 SPEC 七行结构化段，但试点证明 CSS 语义抽取不可靠
 * （见 deliverables/76-q3/01-FEASIBILITY.md：轨道数≠栏数、混合写法、
 *  变量引用、main 容器有多个候选 —— 五类失败模式）。
 *
 * 退回的轻量版是「机制句 + 出处」：句子仍由人写（现在就是这样），
 * 机器只负责一件事 —— **给句子里每个带单位的数值找到它在 CSS 里的行号**。
 *
 * 这是纯机械工作，不需要理解语义：
 *   · 机制句里出现「11°」→ 在 style.css 里找哪一行的声明第一次出现 11deg / 11°
 *   · 出现「24px」→ 找哪一行声明 24px
 *   · 出现「1.2px」→ 同上
 *
 * 为什么这比七行可靠：它**不合成任何新句子**。所有语义判断留在人写的机制句里，
 * 机器只答「这个数在哪一行」。答不出来就如实报缺 —— 那本身是有用信息
 * （说明机制句里的某个数在 CSS 里根本没有，正是 check-prompts 的
 *  `mech-value-not-in-source` 在查的那类缺陷）。
 *
 * 用法：
 *   node prototypes/_prompts/build-provenance.mjs            # 写 dna-provenance.json
 *   node prototypes/_prompts/build-provenance.mjs --check    # 只看，不写盘
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const ROOT = decodeURIComponent(new URL('../..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const P = join(ROOT, 'prototypes');
const OUT = join(ROOT, 'prototypes/_prompts/dna-provenance.json');
const CHECK = process.argv.includes('--check');

/* 从机制句里抽出「带单位的数值」。判据与 check-prompts.mjs:163 的
 * mechSourceNumbers 同构 —— 两边必须收同一批数，否则出处与校验会错位。 */
function numericClaims(text) {
  const out = [];
  const seen = new Set();
  const push = (raw, unit, kind) => {
    const key = `${Number(raw)}|${kind}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ raw: String(raw), n: Number(raw), unit, kind });
  };
  // px / mm
  for (const m of String(text).matchAll(/(\d*\.?\d+)\s*(px|mm)(?![\w])/g)) push(m[1], m[2], 'len');
  // 百分比
  for (const m of String(text).matchAll(/(\d*\.?\d+)\s*%/g)) push(m[1], '%', 'pct');
  // 角度（机制句里最常见的一类：11° 斜切）
  for (const m of String(text).matchAll(/(\d*\.?\d+)\s*°/g)) push(m[1], '°', 'deg');
  // em
  for (const m of String(text).matchAll(/(\d*\.?\d+)\s*em(?![\w])/g)) push(m[1], 'em', 'em');
  return out;
}

/* 在一份 CSS 里找出某个数值出现的所有行。
 *
 * 判据刻意宽：同一个数可能以多种写法出现（11deg / 11° / 11 配合 transform）。
 * 我们不判断"哪一种写法才是机制句说的那个"，只**列出全部候选行**。
 * 让用户自己看 —— 这正是「可回溯」的意思：不是机器替你确认，是给你可点的位置。
 */
function locate(css, claim) {
  const lines = css.split('\n');
  const hits = [];
  const n = claim.n;
  // 数值匹配：前后不能紧跟数字/字母/小数点，避免 1 命中 10 / 1.5
  const esc = String(n).replace('.', '\\.');
  const numRe = new RegExp(`(?<![\\d.])${esc}(?![\\d])`);

  /* ⚠️ 单位判据不能用 `\bpx\b`：`24px` 里 `4` 与 `p` 之间**没有词边界**，
   * 所以 `\bpx\b` 对 `24px` 是 false、对 `24 px` 才是 true。
   * 第一版就是这么写的，结果 28/34 的数值被判「找不到出处」——
   * 而实测 S01 的 24px 明明在第 26 行的 `--bar: 24px;`。
   * 正确判据是「单位后面不能再跟字母数字」：`px(?![\w])`。 */
  const UNIT_PATTERNS = {
    len: [/px(?![\w])/, /mm(?![\w])/],
    pct: [/%/],
    deg: [/deg(?![\w])/, /°/],
    em: [/em(?![\w])/],
  };
  const units = UNIT_PATTERNS[claim.kind] || [];

  /* 百分比 ↔ 小数互转（2026-11-11，Q3）。
   *
   * 实测：S11 的机制句写「第三层不透明度 12%」，而 CSS 里是 `--ghost-3-a: 0.12` ——
   * 12% 与 0.12 是同一个值，但字符串上毫无关系。不互转就会把真值判成 missing。
   * 这个做法 check-prompts.mjs:169 的 mechSourceNumbers 已经在用（它把
   * `opacity: .14` 归一成 14%），这里沿用同一口径，避免两处判据不一致。 */
  /* ⚠️ 数值必须以 `\d` 开头这条假设是错的。
   *
   * 实测（2026-11-11）：S07 的机制句写「栏线 0.5px」，而 CSS 第 80 行是
   * `column-rule:.5px solid var(--slate)` —— **`.5px` 没有前导零**。
   * 我的正则要求 `(\d*\.?\d+)` 至少有一个数字在点前面，于是 `.5px` 全文不命中，
   * S07 被判成"机制句里的数实现里没有"—— 而它明明写着。
   *
   * 修法：把 `altNums` 扩成「原值 + 补前导零 + 去前导零」三种形态。
   * 这是 CSS 里极常见的省略写法，不加这一层会持续误判。 */
  const altNums = [n];
  if (claim.kind === 'pct') altNums.push(Math.round((n / 100) * 10000) / 10000);
  // 0.5 → .5（去前导零）；.5 → 0.5（补前导零），两个方向都要
  const s0 = String(n);
  if (s0.startsWith('0.')) altNums.push(s0.slice(1));
  if (s0.includes('.')) altNums.push(s0.replace(/0+$/, '').replace(/\.$/, ''));
  const res = [...new Set(altNums.map(String))].map((v) => new RegExp(`(?<![\\d.])${v.replace('.', '\\.')}(?![\\d])`));

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const matchedAlt = res.some((r) => r.test(line));
    if (!matchedAlt) continue;
    const isComment = /^\s*(\/\*|\*|\/\/)/.test(line);
    // 注释行只在没有生效声明时才算候选 —— 注释是"说明"，不是"实现"
    if (!isComment) {
      const hasUnit = units.length === 0 || units.some((u) => u.test(line)) || claim.kind === 'pct';
      if (!hasUnit) continue;
      const code = line.split('/*')[0];
      if (!res.some((r) => r.test(code))) continue;
      hits.push({ line: i + 1, text: code.trim().slice(0, 96), byComment: false });
    } else {
      // 注释里认了这个数（含百分比互转后的形态）也算"提到过"
      hits.push({ line: i + 1, text: line.trim().slice(0, 96), byComment: true });
    }
    if (hits.length >= 6) break;
  }
  // 生效声明排在注释前面 —— 有真的就别拿注释充数
  hits.sort((a, b) => (a.byComment === b.byComment ? 0 : a.byComment ? 1 : -1));
  return hits;
}

/* ── 四态定性（2026-11-11，Q3 第二项）────────────────────────────────────
 *
 * 为什么需要四种状态：实测 4 个"找不到出处"的数值，它们的性质**完全不同**，
 * 而只有其中两种是失败。压平成一个"失败"会误导用户去改不该改的东西。
 *
 *   direct  —— CSS 里直接写着这个数              （S01 的 24px → L26）
 *   derived —— 由 CSS 的其它值换算而来            （S01 的 11° → 由 L145 的多边形顶点换算）
 *   media   —— 载体是位图/字体，不在 CSS          （S03 的 32% → 烘焙进 assets/）
 *   missing —— 实现里根本没有这个数               （S07 的 0.5px、S08 的 200px）
 *
 * 推断顺序（每一层的判据都尽量窄，避免把真 missing 误判成合理）：
 *   1. 有 hits                              → direct
 *   2. 无 hits，但该行范围里有「几何声明」    → derived
 *   3. 无 hits，但 CSS 注释里认了这个数       → media
 *   4. 都不成立                              → missing
 *
 * 为什么 derived 判据要看「几何声明存在」而不是看「换算得上」：
 * 我们不去复算 11° 是不是真的等于那个多边形（那需要知道视口尺寸与方向基准，
 * 复算本身就可能错）。只回答一件事：**这一带确实做了几何变换，数值是它的结果。**
 */
function classify(css, claim, hits) {
  if (hits.length) {
    /* 有 hits 时区分 direct / media / derived：
     *
     * ⚠️ 不能"全部命中来自注释 ⇒ media"。实测这个判据太宽：
     * S21 的「60°」在注释里被提到（说明几何），S24 的 2.5px 在注释里
     * 说明 SVG 描边宽度 —— 这两个都是**真的几何/描边值**，不是"载体在别处"。
     *
     * 正确的 media 判据只有一条：**注释里明说了载体不是 CSS**
     * （"预生成位图"/"烘焙"/"由 assets 承担"）。除此之外的注释命中，
     * 一律按 derived 处理 —— 它说明这个数在那一带被用过，只是不在生效声明里。
     *
     * 这个区分的实际意义：media 用户不必去 CSS 找（找不到是对的）；
     * derived 用户能点到那一行的注释，从上下文理解数值从哪来。 */
    const carrier = hits.find((h) => h.byComment && /预生成|烘焙|位图|由 ?assets|预渲染/.test(h.text));
    if (carrier) return { status: 'media', line: carrier.line, why: '注释明说载体是位图/资源', text: carrier.text };
    const live = hits.find((h) => !h.byComment);
    if (live) return { status: 'direct', why: 'CSS 里直接写着' };
    return { status: 'derived', line: hits[0].line, why: '在注释里说明，生效值由别处推得', text: hits[0].text };
  }

  const lines = css.split('\n');
  /* 与 locate 同一口径的数值正则（含百分比 ↔ 小数互转）。
   * ⚠️ 第一版这里另写了一个只匹配原值的 numRe，于是 S03 的 32%（CSS 里写 `32%`
   * 但 locate 通过互转找到了、classify 却找不到）被判成 missing。
   * 两处判据必须同源，否则同一份数据会得出两个结论。 */
  const altNums = [claim.n];
  if (claim.kind === 'pct') altNums.push(Math.round((claim.n / 100) * 10000) / 10000);
  /* 与 locate 同源：补前导零 / 去前导零都要试（CSS 里 `.5px` 与 `0.5px` 都常见）。 */
  const cs0 = String(claim.n);
  if (cs0.startsWith('0.')) altNums.push(cs0.slice(1));
  const numRe = new RegExp(`(?<![\\d.])(${[...new Set(altNums.map(String))].map((v) => v.replace('.', '\\.')).join('|')})(?![\\d])`);

  // 2. derived：CSS 里有几何声明（clip-path / transform / calc）但没有这个数
  //
  // ⚠️ 判据不能只写 `transform\s*:` —— 实测 S01 命中了第 69 行的
  // `text-transform: uppercase;`，那是文字大小写，不是几何。
  // ⚠️ 也不能取「第一条命中」—— 实测第二个版本命中了第 74 行的
  // `clip-path: inset(50%)`，那是 `.sr-only` 的视觉隐藏（屏读器专用），
  // 与楔形毫无关系。
  //
  // 正确做法：收**所有**几何候选，再挑「最像机制载体」的那一条：
  //   · 排除 `.sr-only` / `.skip` 这类辅助隐藏（inset(50%) 是它们的标志）；
  //   · 优先含 polygon/circle 的（真形状），其次 transform，最后 inset；
  //   · 有多个时取**行号靠后**的（本仓库约定：版式实现在前，组件细节在后）。
  const GEO_STRONG = /clip-path\s*:\s*(polygon|circle|ellipse)|rotate\(|skew[XY]?\(/;
  const GEO_WEAK = /(?<!text-)transform\s*:\s*(?!none)|clip-path\s*:\s*inset/;
  const HIDE = /\.sr-only|\.skip|visually-hidden|aria-hidden/;
  if (claim.kind === 'deg') {
    const cands = lines
      .map((l, i) => ({ l, i }))
      .filter(({ l, i }) => !l.trim().startsWith('/*'))
      .filter(({ l }) => GEO_STRONG.test(l) || GEO_WEAK.test(l))
      .filter(({ i }) => {
        // 往上找 6 行看选择器是不是辅助隐藏类
        for (let k = Math.max(0, i - 6); k <= i; k++) if (HIDE.test(lines[k])) return false;
        return true;
      });
    // 优先 strong，其次 weak
    const strong = cands.filter(({ l }) => GEO_STRONG.test(l));
    /* 取**第一条** strong 候选，不是最后一条。
     *
     * 实测（S01）：有 5 处 polygon —— L145 的 .wedge 基础定义、L281 的 .fold-corner、
     * L411/L429 的 media 覆写、L451 文件末尾一块。机制句说的「11° 楔形」是 L145，
     * 而取最后一条会指到 L451（那是尾部块，不是主定义）。
     *
     * 本仓库的书写约定是「先写基础规则、后写媒体查询与降级」，
     * 所以第一条 strong 候选最接近机制的本体。 */
    const pick = (strong.length ? strong : cands)[0];
    if (pick) {
      return {
        status: 'derived',
        line: pick.i + 1,
        why: '由几何声明换算，不是直接写的角度',
        text: pick.l.split('/*')[0].trim().slice(0, 96),
      };
    }
  }

  // 3. media：该数出现在注释里（通常写着"预生成位图"/"烘焙"/"由 assets 承担"）
  const MEDIA_HINT = /预生成|烘焙|位图|字体|assets|预渲染/;
  for (let i = 0; i < lines.length; i++) {
    if (!numRe.test(lines[i])) continue;
    if (MEDIA_HINT.test(lines[i])) {
      return { status: 'media', line: i + 1, why: '载体是位图/资源，不是 CSS 声明', text: lines[i].trim().slice(0, 96) };
    }
  }

  /* 3. 再看 index.html —— 有些数值的载体是 SVG 属性或内联样式，不在 style.css 里。
   *
   * 实测（2026-11-11）：S19 的「0.4px 与 0.8px 两级线宽」在 HTML 第 26 行的注释里
   * 写着，实际线宽由 SVG 的 stroke-width 控制；S14 的「r 四档 24/40/72/120」
   * 在 HTML 的 meta description 里。只扫 CSS 会把这两类判成 missing，
   * 而它们其实有载体 —— 这是定位器的真实局限，补上就能把 5 个 missing 降到 2 个。
   *
   * 判据与 CSS 侧同源：数值 + 单位，且优先取生效的属性而非注释。 */
  const htmlPath = join(P, claim._dir || '', 'index.html');
  if (claim._dir && existsSync(htmlPath)) {
    const html = readFileSync(htmlPath, 'utf8');
    const hlines = html.split('\n');
    const altNums = [claim.n];
    if (claim.kind === 'pct') altNums.push(Math.round((claim.n / 100) * 10000) / 10000);
    const hAll = [];
    const hRe = new RegExp(`(?<![\\d.])(${altNums.map((v) => String(v).replace('.', '\\.')).join('|')})`, '');
    for (let i = 0; i < hlines.length; i++) {
      if (!hRe.test(hlines[i])) continue;
      const isComment = /^\s*<!--/.test(hlines[i]) || /-->\s*$/.test(hlines[i]);
      /* ⚠️ 单位检查不能一律要求带 `px`。
       *
       * 实测（2026-11-11）：S20 的 SVG 是 `stroke-width="0.2"` —— **没有单位**，
       * 因为 SVG 用户单位默认就是 px。要求必须出现 `px` 会把这条真实现挡掉，
       * 于是 0.2px 被误判成「页面展示了实现里没有的参数」。
       *
       * 判据：若该行是 SVG 属性（stroke-width / r / width 等），无单位也算数；
       * 其余行仍要求带单位，避免把 `0.2` 这种浮点数（如 opacity）误当长度。 */
      const isSvgAttr = /stroke-width\s*=|(?<![-\w])(r|rx|ry|width|height)\s*=\s*"\d/i.test(hlines[i]);
      const hasUnit = claim.kind === 'pct'
        ? /%/.test(hlines[i])
        : (isSvgAttr || new RegExp(`${claim.unit === '°' ? '(deg|°)' : claim.unit}(?![\\w])`).test(hlines[i]));
      if (!hasUnit) continue;

      /* ⚠️ 必须把「实现里写着」与「页面上展示着」分开。
       *
       * 实测（2026-11-11）：S08 的机制句说「滚动 200px 走 6px」，
       * CSS 里没有 200，而 index.html:182 有：
       *   <div><dt>滚动视差</dt><dd><code>200px / 6px</code></dd></div>
       * 那是**页面自己展示给用户看的参数栏**，不是实现。
       *
       * ⚠️ 但也不能一律把 <code>/<dd> 判成展示 —— 实测踩过两次：
       *   · S20 的 0.2px 在 SVG 的 `stroke-width="0.2"` 里（第 70 行），
       *     那行同时有一段 <dd> 展示；只看标签会把真实现判成展示。
       *   · S08 的 200 在 **JS** 里（`window.scrollY / 200`），
       *     那一行没有 <dd>，但它是真实现。
       *
       * 所以判据要三层：
       *   1. 该行有 SVG/canvas/JS 的实现痕迹（stroke-width / <path / scrollY / style.）⇒ 实现
       *   2. 该行是纯展示标签（<code>/<dd>/<dt>）且没有实现痕迹 ⇒ displayOnly
       *   3. 其余 ⇒ 按注释/实现处理
       */
      const implTrace = /stroke-width\s*=|<\s*(path|line|circle|rect|g|svg|canvas)\b|scrollY|scrollTop|style\.[a-zA-Z]|\.style\s*=|getContext|lineWidth|ctx\./i;
      const displayTrace = /<(code|dd|dt|samp|kbd)\b/i;
      const displayOnly = displayTrace.test(hlines[i]) && !implTrace.test(hlines[i]);

      /* ⚠️ 不能"第一个命中就 return"。实测（2026-11-11）：
       * S08 的 200px 在第 182 行（展示栏）先出现、第 303 行（JS 的 scrollY / 200）后出现；
       * S20 的 0.2px 在第 43 行（展示栏）先出现、第 70 行（SVG stroke-width）后出现。
       * 第一个命中就返回的话，两条真实现都会被前面的展示行遮住。
       *
       * 正确做法：**先扫完全部命中**，按优先级挑：
       *   实现行 > 注释行 > 展示行。只有连实现行都没有时，才算 displayOnly。 */
      hAll.push({
        line: i + 1,
        text: hlines[i].trim().slice(0, 96),
        isComment,
        isImpl: implTrace.test(hlines[i]),
        isDisplay: displayOnly,
      });
    }

    if (hAll.length) {
      const impl = hAll.find((x) => x.isImpl && !x.isComment);
      const comment = hAll.find((x) => x.isComment);
      if (impl) {
        return { status: 'direct', line: impl.line, file: 'index.html', why: 'index.html 的实现里写着（SVG 属性/JS）', text: impl.text };
      }
      if (comment) {
        return { status: 'derived', line: comment.line, file: 'index.html', why: 'index.html 注释里说明', text: comment.text };
      }
      const disp = hAll.find((x) => x.isDisplay) || hAll[0];
      /* ⚠️ 走到这里说明「页面展示了、但没找到实现痕迹」。
       *
       * 我在这个判据上反复调了四轮（implTrace 白名单、优先序、hAll 收集顺序、
       * SVG 无单位），每修好一案就退回另一案（S08 → S20 → S14 → S08）。
       * 这本身就是「启发式判断 CSS/JS 语义不可靠」的第五个实证。
       *
       * 所以不再猜。这一档如实命名为 `display-only`：
       * **页面展示了这个数，我没能在实现里定位到它。**
       * 它可能是真缺陷（S08 早先的版本），也可能是我漏了某类载体。
       * 让闸门报出来，由人看一眼 —— 这比让机器猜一个 status 更诚实。
       *
       * （配套：`mech-display-only` 定为 WARN 而不是 FAIL，理由同上 ——
       *   它的假阳性来自定位器的局限，不是产品的错。真缺陷会被
       *   `check-prompts` 的 mech-value-not-in-source 与本闸门的 mech-missing 抓。） */
      return {
        status: 'missing',
        displayOnly: true,
        line: disp.line,
        file: 'index.html',
        why: '页面展示了这个数，但没在实现里定位到',
        text: disp.text,
      };
    }
  }

  return { status: 'missing', why: 'CSS 与 index.html 里都没有这个数' };
}

const dirs = readdirSync(P, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name))
  .map((d) => d.name)
  .sort();

const results = [];
let totalClaims = 0, resolved = 0, unresolved = 0;

for (const dir of dirs) {
  const id = dir.slice(0, 3);
  const cssPath = join(P, dir, 'style.css');
  if (!existsSync(cssPath)) continue;
  const css = readFileSync(cssPath, 'utf8');

  /* ⚠️ 机制句必须从 **prompts.js** 取，不能从 dna-clean.json 取。
   *
   * 实测（2026-11-11）：dna-clean.json 里 S17 的 mechanism 是**空串**，
   * 而 prompts.js 里有值。原因是机制句的补齐发生在 build-prompts.mjs ——
   * 它读 mechanisms.mjs 的补丁表，把 S11–S35 缺的机制句填进 dna，
   * 这一步在 dna-clean.json 写盘**之后**。
   *
   * 用 dna-clean.json 的后果：34 个数值（几乎只有 S01–S10），
   * 而 prompts.js 是 148 个。差了四倍多 —— 等于出处只覆盖三分之一的提示词。
   *
   * 判据：出处要跟**用户实际拿到的那份提示词**对齐，所以读 prompts.js。 */
  let mech = '';
  const promptsPath = join(P, '_selection/prompts.js');
  if (existsSync(promptsPath)) {
    const ctx = { window: {} };
    vm.createContext(ctx);
    vm.runInContext(readFileSync(promptsPath, 'utf8'), ctx, { filename: 'prompts.js' });
    const all = (ctx.window.STYLE_PROMPTS && ctx.window.STYLE_PROMPTS.schemes) || [];
    const rec = all.find((x) => x.id === id);
    mech = (rec && rec.dna && rec.dna.mechanism) || '';
  }
  if (!mech) { results.push({ id, claims: [], note: '无机制句' }); continue; }

  const claims = numericClaims(mech).map((c) => {
    totalClaims++;
    c._dir = dir;   // 供 classify 找 index.html
    const hits = locate(css, c);
    const cls = classify(css, c, hits);
    if (cls.status === 'missing') unresolved++; else resolved++;
    return { ...c, status: cls.status, displayOnly: !!cls.displayOnly, why: cls.why, hintFile: cls.file || null, hintLine: cls.line || (hits[0] && hits[0].line) || null, hintText: cls.text || (hits[0] && hits[0].text) || null, hits };
  });
  results.push({ id, file: dir + '/style.css', mechanism: mech, claims });
}

if (!CHECK) {
  writeFileSync(OUT, JSON.stringify(results, null, 1) + '\n', 'utf8');
  console.log(`已写 ${OUT}`);
}

/* 汇总：按四态分组。
 * 只有 missing 是失败 —— 另外三种都是"找到了，只是方式不同"。 */
const byStatus = { direct: [], derived: [], media: [], missing: [] };
for (const r of results) for (const c of r.claims || []) byStatus[c.status].push({ id: r.id, c });

console.log('');
console.log(`机制句数值：共 ${totalClaims} 个`);
console.log(`  直接可回溯 (direct)   ${String(byStatus.direct.length).padStart(3)} 个`);
console.log(`  由几何换算 (derived)  ${String(byStatus.derived.length).padStart(3)} 个`);
console.log(`  载体是资源 (media)    ${String(byStatus.media.length).padStart(3)} 个`);
console.log(`  实现里没有 (missing)  ${String(byStatus.missing.length).padStart(3)} 个  ← 只有这类是缺陷`);

if (byStatus.missing.length) {
  console.log('');
  console.log('missing（机制句里的数在实现中不存在）：');
  for (const { id, c } of byStatus.missing) console.log(`  ${id}  ${c.raw}${c.unit}`);
}
if (byStatus.derived.length) {
  console.log('');
  console.log('derived（由几何换算，不是直接写的）：');
  for (const { id, c } of byStatus.derived) console.log(`  ${id}  ${c.raw}${c.unit}  → L${c.hintLine}  ${String(c.hintText || '').slice(0, 60)}`);
}
if (byStatus.media.length) {
  console.log('');
  console.log('media（载体是位图/资源）：');
  for (const { id, c } of byStatus.media) console.log(`  ${id}  ${c.raw}${c.unit}  → L${c.hintLine}`);
}
