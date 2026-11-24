/* 字体回退链：产物有没有给每一条链留退路？（判据第三次重建版，2026-11-24）
 *
 * ═══ 这条判据被推翻过两次，两次都记在这里 ═══════════════════════════════
 *
 * 【第一次错：把通用族滤掉再数长度】
 * 初版判据数「实名族有几个」，把 `monospace` 过滤掉。于是
 * `"Martian Mono", ui-monospace, monospace` 被算成「只有 1 个族」，
 * 报出「38 份里 37 份链太短」。拿 35 个原型一跑，**5 个原型自己就是这样**
 * （S04/S05/S07/S09/S13）—— 判据把合格样品判成违规，那是判据错。
 *
 * 【第二次错：正对照本身是脏的】
 * 改成「整条声明有没有退路」后报「产物 21% vs 原型 26%，与原型持平」，
 * 结论是「这条判据没有可靠合格线」。但这个正对照读的是**含噪数据**：
 *   · `font-family: inherit` 被算成「无退路」—— 原型 S01:174、S07:217、S09:232
 *   · `@font-face{font-family:"Barlow"}` 里的**定义**被当成**使用**—— S04 有 3 处
 * 把这两类排掉之后，原型真实的「无退路」是 **0/35**，不是 9/35。
 * 「原型也这样」这句话本身就是脏数据造成的，它把一个真缺陷洗成了「没法定线」。
 *
 * 【第三次：按「链有没有以通用族收尾」重新定义】
 * 产物系统性丢掉了原型每条链末尾那个 `sans-serif` / `serif`：
 *   原型 S01:20  `--f-text: "Noto Sans SC", "Source Han Sans SC", sans-serif;`
 *   产物 S01:29  `font-family: "Noto Sans SC", "Source Han Sans SC";`
 * 前者换台机器一定拿到无衬线，后者在没装思源黑体的机器上会退到浏览器默认
 * （多数是衬线体）。这是**确定性**的差别，不需要概率。
 *
 * ═══ 本判据的四条口径 ═════════════════════════════════════════════════
 *
 *   A 有声明不以通用族结尾        ← 主判据。通用族是 CSS 规定的「一定有」的终止符
 *   B 有声明只有 2 个族           ← 对照（不是判据）。只看长度，不看是不是通用族
 *   C 有声明只有 1 个族           ← 最严重：连一个字面退路都没有
 *   D 等宽角色的链不落到等宽通用族  ← 分角色。等宽链回退到 serif 会破坏对齐
 *
 * A 与 C 是包含关系（1 个族必然不以通用族结尾），B 与 C 不是。
 *
 * ═══ 第三次修正（2026-11-24，A2 反例夹具抓出来的六处）══════════════════
 *
 * A2 写了 `_font-fixtures.mjs`：27 例计分，钉死「一段输入应当被解析成几条声明、
 * 每条有几个族、什么角色」。我的实现第一次跑挂了 6 例。六处分两类：
 *
 *   【四处在共享模块（A3 的地盘），我没自写补丁，报告给 A3 并已修在源头】──
 *     13 `font-family:"A;B", serif`  —— 值被 `[^;}]+` 在引号内的分号处腰斩
 *     15 `:root{--font-family:...}`   —— 属性名缺左边界，把变量**定义**当**使用**
 *     16 `@font-face{src:url(data:...{AA})}` —— 块内有花括号就配不上，定义漏出来
 *     25 `my-font-family:"A"`         —— 同 15，缺左边界
 *
 *   【两处在我自己身上，而且是同一条自相矛盾】──────────────────────
 *     18 `"A", serif, Georgia` → 我读到末尾 `Georgia` → 判「无终止符」**假阳性**
 *     19 `serif, "A"`          → 我读成 2 族 → 判「有退路」**把单族误判成合规**
 *
 *     18/19 的要害：判据 A 的定义是「链末是不是通用族」，而我自己不截断。
 *     「末尾」这个词在定义和使用两处含义不同 —— 这是最坏的一种错，
 *     因为它让判据的语义和它自己的注释不一致，而数字看上去仍然正常。
 *     语料 1 处同形（原型 S08 `"Overprint Numerals", ui-monospace, monospace`），
 *     截断前后都以通用族收尾，所以 A 的读数不变；但它改 B 的读数，
 *     差异在「口径对照」一节显式打印。
 *
 * ═══ 分角色，不再跨角色取 Math.min ═══════════════════════════════════
 * 旧实现 `Math.min(...chains.map(len))` 把标题、正文、等宽三条链的最差值
 * 当成整份文件的成绩。后果：一条 2 族的等宽链（`"DM Mono", monospace`
 * 完全够用）会把整份判成「链太短」，而它的正文链其实是 4 族。
 *
 * 现在三个角色分开（标题 / 正文 / 等宽），角色由**选择器**决定：
 *   h1–h6 / title / head / display / masthead  → 标题
 *   code / pre / kbd / samp / mono / num / tt  → 等宽
 *   其余                                        → 正文
 * 另有一条：链以 `monospace`/`ui-monospace` 收尾的也算等宽 —— 链自己说的，
 * 不是从字体名猜的（S22-r5 的等宽链挂在 `.eyebrow` 上，光看选择器认不出）。
 *
 * ⚠️ 为什么不用「链里有没有 mono 字样」来分等宽：那是猜。
 * 原型 S30:51 `code{font-family:"IBM Plex Mono","Zhuque Fangsong",Georgia,serif}`
 * 里出现 "Mono" 只是第一个族名，它实际以 serif 收尾。用名字猜会把它算成
 * 等宽链再判它「没落到 monospace」，而它本来就是一条正文形态的链 ——
 * 旧版 `looksMono()` 正是这么写的，在原型上误报 1 份。
 *
 * ═══ 这份判据自身的可信度 ═════════════════════════════════════════════
 * 见输出最后一段。核心是「原型零误报」规则：原型是手工做的合格样品，
 * 任何判据只要在原型上误报 > 0，那一格就标「不出数」。
 * 旧版只对 A 执行这条规则，对 D 没执行（D 在 S30 上误报 1 份却照样出数）——
 * 现在统一对 A/C/D 执行，B 因为是**对照**而不适用。
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
/* ⚠️ 绝不在这里自带 CSS 变量展开 / @font-face 排除 / font: 简写解析。
 *
 * 这个仓库 2026-11-23 一天之内因为「不导出所以要重写」踩了三次同一个坑
 * （见 _css-fonts.mjs 头部）。共享模块今天刚补齐了本判据需要的全部四件事：
 *   · stripFontFaceRules()    —— @font-face 是定义不是使用
 *   · shorthandFamilies()     —— `font:12px/1 "A", monospace`
 *   · chainOf()               —— 展开 var()、剥 !important、按引号切逗号、排 inherit
 *   · cssText()               —— 只取 <style> 内与本判据相关的内容
 * 所以这里一行 CSS 解析都不写。 */
import {
  stripCssComments, cssText, cssVariables, chainOf,
  fontDeclarations, shorthandDeclarations, shorthandFamilies,
  stripFontFaceRules, isKeywordDeclaration,
  fontChains as fontChainsShared,
} from '../_blindtest/_css-fonts.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const BT = join(resolve(HERE, '..'), '_blindtest');
const PROTOS = resolve(HERE, '..', '..', '..', 'prototypes');

/* ── 通用族：CSS 规范里「终止回退链」的族 ────────────────────────────────
 *
 * 列在这里的每一个都保证**任何浏览器都有对应字体**，所以一条链以它们结尾
 * 就意味着「换台机器也不会退到浏览器默认字体」。
 *
 * `ui-*` 系列（ui-monospace / ui-serif / ui-sans-serif / ui-rounded）是
 * CSS Fonts 4 的系统 UI 族，同样是终止符 —— 它们不是某个具体字体名，
 * 而是「让浏览器挑它自己的 UI 字体」。
 *
 * ⚠️ 与 _css-fonts.mjs 的 `chainOf` 有一处刻意的分工：那边**不滤**通用族
 * （因为「通用族算不算兜底」取决于上下文），这边才滤。 */
const GENERIC = new Set([
  'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui',
  'ui-monospace', 'ui-serif', 'ui-sans-serif', 'ui-rounded',
  'emoji', 'math', 'fangsong',
]);

/* 等宽通用族：只有这两个能替代等宽字体而不破坏字符对齐。
 * `serif` / `sans-serif` 也能终止回退链，但会破坏等宽排版 —— 判据 D 用这个子集。 */
const MONO_GENERIC = new Set(['monospace', 'ui-monospace']);

/* 等宽字体名识别。仅用于把声明**归到等宽角色**，不参与合格判定 ——
 * 归错角色只会让这条声明按错误的阈值判，不会改变「链长」本身。
 * 这个仓库 8 个案的等宽字体都在这里能命中（Martian / JetBrains / IBM Plex /
 * Fragment / Sometype / Redaction / Departure / VT323 / DM / Reddit）。 */
const MONO_NAME = /mono|courier|consolas|menlo|monaco|vt323/i;

const isGeneric = (f) => typeof f === 'string' && GENERIC.has(f.toLowerCase());
const isMonoGeneric = (f) => typeof f === 'string' && MONO_GENERIC.has(f.toLowerCase());
const looksMono = (chain) => chain.some((f) => MONO_NAME.test(f));
const namedCount = (chain) => chain.filter((f) => !isGeneric(f)).length;

/* ── 终止符截断（修正 J，2026-11-24）────────────────────────────────────
 *
 * 通用族之后的族名**永远用不到** —— `serif` 在任何机器上都能匹配，
 * 所以 `"A", serif, Georgia` 里的 `Georgia` 是死代码。
 * 不截断的后果有两个，方向相反，都很糟：
 *
 *   `"A", serif, Georgia` → 末尾读到 `Georgia` → 判据 A 报「无终止符」
 *                            ← **假阳性**（明明有 serif）
 *   `serif, "A"`          → 报 2 族 → 判据 B 报「有退路」
 *                            ← **把单族误判成合规**（serif 能匹配，但 A 永远用不到）
 *
 * 这直接自相矛盾：判据 A 的定义是「链末是不是通用族」，而 A 自己不截断，
 * 于是「末尾」这个词在两处含义不同。A2 夹具 18/19 号抓的就是这个。
 *
 * 之所以现在才加：语料 1 处同形（原型 S08 `"Overprint Numerals", ui-monospace, monospace`），
 * 且它截断前后都以通用族结尾，A 的读数不变。但它改 B 的读数 —— 见输出里
 * 「截断的影响」那一节，我把差异显式打印出来，不藏着。 */
function truncateAtGeneric(chain) {
  const i = chain.findIndex(isGeneric);
  return i < 0 ? chain : chain.slice(0, i + 1);
}

/* ── 选择器 → 角色（修正 K，2026-11-24）────────────────────────────────
 *
 * 任务书要求「标题 / 正文 / 等宽 三个角色分开」。旧版只有 `{mono, other}`
 * 两个桶 —— 那只修了「等宽 vs 其余」，没修「标题 vs 正文」，
 * 而文件头声明要修的是 `Math.min` 跨角色取最差，标题混进正文里照样是它。
 *
 * ⚠️ 这里只做**选择器分类**，不做任何值级解析。族名解析仍然全部来自
 * 共享模块的 `chainOf` / `shorthandFamilies` —— A3 对 `_css-fonts.mjs`
 * 有一票否决权，A1 不得自带变量展开（编排记录 C1）。
 * 切块（找 `{}` 配对、递归进 at-rule）是选择器定位，不是 CSS 值解析，
 * 共享模块本来就不提供选择器，所以这一段写在调用方。 */
const ROLE_TITLE = /(^|[\s,.#>+~:])(h[1-6]|title|head|display|masthead)\b/i;
const ROLE_MONO = /(^|[\s,.#>+~:])(code|pre|kbd|samp|mono|num|tt)\b/i;
const AT_NESTED = /^@(media|supports|layer|container|document|scope|starting-style)\b/i;

/* 选择器 → 角色。两条判据，任一成立即算等宽：
 *   ① 选择器本身是等宽位（code / pre / kbd / samp / mono / num / tt）
 *   ② 链的**终止符**是等宽通用族（`monospace` / `ui-monospace`）
 *
 * 加②的理由（实测）：S22-r5 的 `IBM Plex Mono, ui-monospace, monospace`
 * 挂在 `.eyebrow` 这类选择器上 —— ①认不出，但一条以 `monospace` 收尾的链
 * 只可能是等宽声明，这是链自己说的，不是从字体名猜的。
 * 只靠①会把它算成正文链，于是判据 B 把一条**完整的等宽链**当成「正文链太短」。
 *
 * ⚠️ 为什么不反过来用「链里有没有 mono 字样」：那是猜。
 * `code{font-family:"IBM Plex Mono","Zhuque Fangsong",Georgia,serif}`（原型 S30:51）
 * 里出现 "Mono" 只是第一个族名，它实际以 serif 收尾 —— 用名字猜会把它
 * 算成等宽链，然后判它「没落到 monospace」，而它本来就是一条正文形态的链。 */
function roleOf(sel, families) {
  if (ROLE_MONO.test(sel)) return 'mono';
  const last = families[families.length - 1];
  if (isMonoGeneric(last)) return 'mono';
  if (ROLE_TITLE.test(sel)) return 'title';
  return 'body';
}

/* 把一份 CSS/HTML 切成 (选择器, 规则体) 列表，递归进 at-rule。
 * `@font-face` 已由共享模块的 `stripFontFaceRules` 整块挖掉。 */
function splitRules(src) {
  const css = stripFontFaceRules(cssText(stripCssComments(src)));
  const rules = [];
  const walk = (text) => {
    let k = 0;
    while (k < text.length) {
      const b = text.indexOf('{', k);
      if (b < 0) break;
      let lvl = 0, j = b;
      for (; j < text.length; j++) {
        if (text[j] === '{') lvl++;
        else if (text[j] === '}') { lvl--; if (lvl === 0) { j++; break; } }
      }
      const sel = text.slice(k, b).trim().split(';').pop().trim();
      const body = text.slice(b + 1, Math.max(b + 1, j - 1));
      if (AT_NESTED.test(sel)) walk(body);
      else if (!/^@/.test(sel)) rules.push({ sel, body });
      k = j;
    }
  };
  walk(css);
  return { rules, vars: cssVariables(css) };
}

/* ── 取样 ────────────────────────────────────────────────────────────────
 * 产物：`_blindtest/S01`、`S21-r3` 这类目录下的 index.html
 * 原型：`prototypes/S01-red-wedge-broadsheet` 这类目录下的 style.css
 * 两者用同一套判据，因为「原型是手工做的合格样品」正是正对照的前提。 */
function artifactDirs() {
  return readdirSync(BT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^S\d{2}(-r\d+)?$/.test(d.name))
    .map((d) => d.name).sort();
}
function prototypeDirs() {
  return readdirSync(PROTOS, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name))
    .map((d) => d.name).sort();
}

/* 一份源码 → [{ role, families, undecidable }]。
 *
 * 这是 **A2 夹具的契约接口**（`_font-probe` 探测到 `export` 就直接调用它，
 * 不再镜像源码）。契约见 `_font-fixtures.mjs` 文件头：
 *   [{ role: 'title'|'body'|'mono', families: ['A','B'], undecidable?: true }]
 *
 * 值级解析全部委托共享模块：
 *   · `fontDeclarations` / `shorthandDeclarations` 已排除 @font-face 定义、
 *     已加属性名左边界、已按引号/括号感知切分（不是 `[^;}]+`）
 *   · `chainOf` 已展开 var()、剥 !important、排 inherit 等关键字
 * 这里只补共享模块不提供的两件事：**选择器**（决定角色）和**终止符截断**。 */
export function parseFontUsage(src) {
  const { rules, vars } = splitRules(src);
  const out = [];
  const push = (sel, fams, rawValue) => {
    const families = truncateAtGeneric(fams);
    out.push({
      role: roleOf(sel, families),
      families,
      /* 空链 + 原文里有 var() = 读不到（不是「没有」）。夹具 06 号要求保留并标未判。 */
      undecidable: families.length === 0 && /var\(/i.test(String(rawValue || '')),
    });
  };
  for (const r of rules) {
    for (const v of fontDeclarations(r.body)) {
      /* 整条只有 inherit/initial/unset/revert 的，**这条声明不存在** ——
       * 它表示「不改字体」，不是「选了字体」。留着会产出一条 0 族的链，
       * 消费方按「链长 0」读就变成「无退路」，正是 21f3764 之前那条
       * 「37/38 不达标」的来源之一（原型 S01:174 就有这条）。
       * A2 夹具 01 / 22 号钉的就是这一条。 */
      if (isKeywordDeclaration(v)) continue;
      push(r.sel, chainOf(v, vars), v);
    }
    for (const v of shorthandDeclarations(r.body)) {
      const fam = shorthandFamilies(v);
      if (!fam) continue;                 // font:inherit / font:menu
      push(r.sel, chainOf(fam, vars), v);
    }
  }
  return out;
}

/* 读一份文件 → 判据用的行。
 *
 * ⚠️ 同时保存**两套链**，因为两条判据的口径本来就不同：
 *   · `decls`      —— 截断后的链，+ 角色。判据 A / C / D 用。
 *                     （A 的定义是「链末是不是通用族」，所以必须截断，
 *                       否则 `"A", serif, Georgia` 的「末尾」读到 Georgia；
 *                       见 A2 夹具 18/19。）
 *   · `rawChains`  —— 共享模块原样输出，不截断、不分角色。判据 B 用。
 *                     B 是**对照**，它的价值就在于「朴素长度」，和验收基线
 *                     （25/38、4/35）可比。截断会让一批等宽链从 3 族变 2 族，
 *                     B 的数会漂到 26/38 与 7/35 —— 那不再是那个基准了。
 * 两套并存，差异在「口径对照」那一节显式打印。 */
function loadRows(dirs, fileOf) {
  const rows = [];
  for (const id of dirs) {
    const p = fileOf(id);
    if (!existsSync(p)) continue;
    const src = readFileSync(p, 'utf8');
    const decls = parseFontUsage(src);
    const live = decls.filter((d) => d.families.length > 0);
    const undecided = decls.length - live.length;
    if (!live.length) continue;
    /* 原始链：共享模块原样输出，滤掉空链与关键字声明。 */
    const rawChains = fontChainsShared(src).filter((c) => c.length > 0);
    rows.push({ id, src, decls: live, rawChains, undecided, nDecls: decls.length });
  }
  return rows;
}

const artifacts = loadRows(artifactDirs(), (id) => join(BT, id, 'index.html'));
const prototypes = loadRows(prototypeDirs(), (id) => join(PROTOS, id, 'style.css'));

/* ── 四条判据 ────────────────────────────────────────────────────────────
 * 全部定义在「一份文件」这一层：只要有一处踩线就算这份不合格。
 * 这一层是刻意的 —— 交付物是一整个页面，用户不会因为「只有 footer 换字」
 * 就觉得没关系。 */
const JUDGES = [
  {
    id: 'A',
    label: '有声明不以通用族结尾',
    why: '主判据。链末没有 serif/sans-serif/monospace/system-ui/ui-* 就是没有终止符，' +
      '换台机器会退到浏览器默认字体。原型 0/35 踩线，所以这是一条能定线的判据。',
    test: (r) => r.decls.some((d) => !isGeneric(d.families[d.families.length - 1])),
    example: (r) => r.decls.find((d) => !isGeneric(d.families[d.families.length - 1])).families.join(', '),
  },
  {
    id: 'B',
    label: '有声明只有 2 个族',
    /* ⚠️ B 是**对照**，不是判据。它故意保持「朴素长度口径」：
     * 用共享模块的原始输出（**不截断、不分角色**），只问这条链有几个族。
     * 留着它就是为了和 A 做差集 ——「长度够长但没有终止符」那一批，
     * 正是数长度永远看不见的东西。
     *
     * 口径必须和验收基线一致（25/38、4/35）。如果改用截断后的链，
     * `"X", ui-monospace, monospace` 会从 3 族变 2 族，B 漂到 26/38，
     * 那就不再是那个基准了 —— 差异在「口径对照」一节显式打印。 */
    why: '对照（不是判据）。只看长度不看内容 —— 一条 2 族的链可能是 ' +
      '`"Noto Sans SC", sans-serif`（够用），也可能是 `"Antonio", "WenJin Mincho"`（不够）。' +
      'B 与 A 的差集就是「长度够但没终止符」的那一批。' +
      'B 在原型上也报数，因为「2 族」对等宽链是合格的 —— 这正说明 B 不能单独当判据。',
    test: (r) => r.rawChains.some((c) => c.length === 2),
    example: (r) => r.rawChains.find((c) => c.length === 2).join(', '),
    /* B 是对照，不参与「原型零误报」那道门 —— 那道门是给「用来说产物有毛病」
     * 的判据用的。B 不说谁有毛病，它提供一个基准。 */
    isControl: true,
  },
  {
    id: 'C',
    label: '有声明只有 1 个族',
    why: '最严重的一档：连一个字面退路都没有。只有装了那一个字体才不出事。',
    test: (r) => r.decls.some((d) => d.families.length === 1),
    example: (r) => r.decls.find((d) => d.families.length === 1).families.join(', '),
  },
  {
    id: 'D',
    label: '等宽角色的链不落到等宽通用族',
    /* ⚠️ 角色现在由**选择器**决定，不再由「链里有没有 mono 字样」猜。
     * 旧版用 `looksMono(chain)`，于是 `code{font-family:"IBM Plex Mono",
     * "Zhuque Fangsong", Georgia, serif}`（原型 S30:51）被当成等宽链，
     * 判它「没落到 monospace」—— 但那条链以 serif 收尾，是**正文链形态**，
     * 而它挂在 `code` 选择器上，角色本来就是等宽（只是字体选得不像等宽）。
     * 无论怎么解释，旧口径在原型上误报 1 份。 */
    why: '分角色的判据。等宽角色的链若以 serif/sans-serif 收尾，字符不再对齐 —— ' +
      '表格数字、栏号、代码块会散架。只有 monospace/ui-monospace 算数。' +
      '角色由选择器定（code/pre/kbd/samp/mono/num/tt），不由链里的字体名猜。',
    test: (r) => {
      const mono = r.decls.filter((d) => d.role === 'mono');
      return mono.length > 0 && mono.some((d) => !isMonoGeneric(d.families[d.families.length - 1]));
    },
    example: (r) => r.decls.filter((d) => d.role === 'mono')
      .find((d) => !isMonoGeneric(d.families[d.families.length - 1])).families.join(', '),
    /* D 必须遵守「原型零误报」规则才能出数。见下方 D 的处置。 */
    requiresCleanPrototype: true,
  },
];

/* ── 角色三分：标题 / 正文 / 等宽 ──────────────────────────────────────
 *
 * 旧版只有 `{mono, other}` 两个桶 —— 那是把「等宽 vs 其余」分开了，
 * 但「标题」和「正文」仍然混在 `other` 里一起取最差。而文件头声明要修的
 * 正是 `Math.min` 跨角色取最差：标题链通常是 2–3 族，正文链通常 4–5 族，
 * 混在一起取最差的话，一条 2 族的标题链会把整份文件的正文成绩拉下水。
 *
 * 现在三档分开，每档各自取最差。角色来自 `parseFontUsage` 的选择器分类。 */
function roleSummary(r) {
  const by = { title: [], body: [], mono: [] };
  for (const d of r.decls) by[d.role].push(d.families);
  const worst = (arr) => (arr.length ? arr.reduce((a, b) => (b.length < a.length ? b : a)) : null);
  return { title: worst(by.title), body: worst(by.body), mono: worst(by.mono),
    nTitle: by.title.length, nBody: by.body.length, nMono: by.mono.length };
}

/* ── Fisher 双侧精确检验 ─────────────────────────────────────────────────
 * 为什么必须给 p 值：A 是「产物 10/38 vs 原型 0/35」，两个比例看着差很多，
 * 但样本只有 38 和 35。没有 p 值就无法区分「真差别」和「小样本噪声」。
 * 这个仓库已经因为「21% vs 26%，看起来持平」下过一次错误结论 ——
 * 那次是数据脏，但如果数据干净而样本小，同样会得出「持平」。
 * 双侧（不是单侧）是因为我们事先没有假设方向。 */
function logFact(n) { let s = 0; for (let i = 2; i <= n; i++) s += Math.log(i); return s; }
function hyper(a, b, c, d) {
  const N = a + b + c + d;
  return Math.exp(
    logFact(a + b) + logFact(c + d) + logFact(a + c) + logFact(b + d) -
    logFact(N) - logFact(a) - logFact(b) - logFact(c) - logFact(d));
}
function fisher2(a, b, c, d) {
  const N = a + b + c + d, r1 = a + b, r2 = c + d, c1 = a + c;
  const p0 = hyper(a, b, c, d);
  let p = 0;
  for (let x = Math.max(0, c1 - r2); x <= Math.min(r1, c1); x++) {
    const px = hyper(x, r1 - x, c1 - x, r2 - c1 + x);
    if (px <= p0 * (1 + 1e-9)) p += px;
  }
  return Math.min(1, p);
}

const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0).toString() + '%';

/* ── 主表 ─────────────────────────────────────────────────────────────── */
const results = {};
for (const j of JUDGES) {
  const bad = artifacts.filter(j.test);
  const protoBad = prototypes.filter(j.test);
  results[j.id] = { bad, protoBad };
}

console.log(`字体回退链：${artifacts.length} 份产物 vs ${prototypes.length} 份原型\n`);
console.log('判据 A/B/C/D 各扫全部声明；一份里只要有一处踩线就算这份不合格。');
console.log('链 = 一条 font-family（或 font: 简写）声明里的族名序列，已展开 var()、');
console.log('排除 @font-face 定义、排除 inherit/initial/unset/revert。');
console.log('通用族算**终止符**：它之后的族名永远用不到，解析时截断（A2 夹具 18/19）。');
console.log('角色 = 由选择器决定（h1–h6/title/head/display/masthead → 标题；');
console.log('        code/pre/kbd/samp/mono/num/tt → 等宽；其余 → 正文），三档分开不合并。\n');

console.log('案          声明数  未知  标题最短  正文最短  等宽最短  判定');
console.log('─'.repeat(68));
for (const r of artifacts) {
  const rs = roleSummary(r);
  const badA = JUDGES[0].test(r);
  /* 这里印的是**最短链的族名个数**，不是字符串长度 ——
   * 第一版写成 `s.length`（join 后整串的字符数），印出 [42] 这种数，
   * 读表的人会以为链有 42 族。 */
  const shown = (c) => (c ? String(c.length) : '—');
  console.log(
    `${r.id.padEnd(11)} ${String(r.nDecls).padStart(5)} ${String(r.undecided).padStart(5)} ` +
    `${shown(rs.title).padStart(8)} ${shown(rs.body).padStart(9)} ${shown(rs.mono).padStart(9)}` +
    `  ${badA ? '✗A' : '✓'}`);
}
console.log('─'.repeat(64));
console.log('（未知 = 展开后仍为空数组的声明数：只有 `font-family: var(--未定义)` 会这样。');
console.log('  `font-family: inherit` 这类关键字已由共享模块滤掉，不产出条目 ——');
console.log('  那正是第二次推翻的假象来源：把「继承」当成「无退路」，原型被脏读成 9/35。）\n');

/* ── 四条判据的分子分母 + p 值 ──────────────────────────────────────────
 * 任务书要求「产物与原型在四条判据上的分子分母百分比，以及 A、B 两条的 p 值」。
 * C/D 也给 p 值 —— 成本是几行代码，而不给的话读表的人无法判断该不该当回事。 */
console.log('━━ 四条判据：产物 vs 原型 ━━\n');
console.log('判据                                   产物            原型          Fisher 双侧 p   状态');
console.log('─'.repeat(100));
for (const j of JUDGES) {
  const a = results[j.id].bad.length, na = artifacts.length;
  const b = results[j.id].protoBad.length, nb = prototypes.length;
  const p = fisher2(a, na - a, b, nb - b);
  const pTxt = p < 1e-4 ? p.toExponential(2) : p.toFixed(4);
  /* 原型零误报规则（见文件头）：原型是手工做的合格样品，判据若在它身上
   * 报出违规，说明判据错了，那一格的产物读数也就不能用。
   *
   * ⚠️ 这条规则以前只对 A 执行，对 D 没执行 —— D 在原型 S30 上误报 1 份，
   * 却照样出数。现在统一：任何**判据**原型误报 > 0，那一行标「不出数」。
   *
   * 例外是 `isControl` 那几条（B）：它们是对照不是判据，存在的目的就是
   * 提供一个朴素基准来和 A 做差集。对照在原型上报数不是误报，是它的本职。 */
  const state = j.isControl ? '（对照，非判据）'
    : b > 0 ? `⚠️ 原型误报 ${b} 份，本判据不出数` : '';
  console.log(
    `${j.id} ${j.label.padEnd(35)} ${String(a).padStart(2)}/${na} = ${pct(a, na).padStart(4)}` +
    `   ${String(b).padStart(2)}/${nb} = ${pct(b, nb).padStart(4)}` +
    `        p = ${pTxt.padEnd(9)} ${state}`);
}
console.log('─'.repeat(100));
console.log('');

/* ── 逐条判据的说明与案发清单 ────────────────────────────────────────── */
for (const j of JUDGES) {
  console.log(`━━ 判据 ${j.id}：${j.label} ━━`);
  console.log(`   ${j.why}`);
  const bad = results[j.id].bad;
  if (bad.length) {
    console.log(`   产物踩线 ${bad.length} 份：`);
    for (const r of bad) console.log(`     ${r.id.padEnd(10)} ${j.example(r)}`);
  } else {
    console.log('   产物踩线 0 份。');
  }
  const pb = results[j.id].protoBad;
  console.log(pb.length
    ? `   原型踩线 ${pb.length} 份：${pb.map((r) => r.id.slice(0, 3)).join(' ')}`
    : '   原型踩线 0 份 —— 这条判据在合格样品上不误报。');
  console.log('');
}

/* ── 交叉：A 与 B 的差集就是「长度够但没终止符」────────────────────────
 * 这一格是本轮最直接的证据：产物把原型每条链末尾的通用族丢了。
 * 如果 B 高（链短）而 A 更高（链短且没终止符），说明「短」不是唯一的病。
 * 如果 A 高而 B 低，说明链够长但末尾没写通用族 —— 那正是本轮发现的形态。 */
/* ── 口径对照：截断改变了什么 ────────────────────────────────────────────
 *
 * A2 夹具 18/19 号要求「通用族是终止符，后面截断」。加了截断之后，
 * 判据 **A/C/D** 的口径变了，而 **B 有意留在旧口径**（理由见 B 的注释）。
 *
 * 这一节把两个数都摆出来。不能只报一个：
 *   · 只报旧数 → 读的人以为「没有截断这回事」
 *   · 只报新数 → B 的数会从 25/38 漂到 26/38，与验收基线对不上，读的人
 *               会以为缺陷面变了
 * 差异来自 `"Martian Mono", ui-monospace, monospace` 截断后是 2 族（monospace 是死代码）。
 */
const truncSet = new Set(
  artifacts.filter((r) => r.decls.some((d) => d.families.length === 2)).map((r) => r.id));
const rawSet = new Set(results.B.bad.map((r) => r.id));
const bSameA = [...truncSet].filter((x) => !rawSet.has(x));
const bSameB = [...rawSet].filter((x) => !truncSet.has(x));
console.log('━━ 口径对照：终止符截断对判据 B 的影响 ━━');
console.log(`  B 采用的口径（原始链，不截断）        ：产物 ${rawSet.size}/38  原型 ${results.B.protoBad.length}/35`);
console.log(`  若改用截断后的链（A/C/D 的口径）      ：产物 ${truncSet.size}/38`);
console.log(`  截断后才变成「2 族」的产物：${bSameA.join(' ') || '（无）'}`);
console.log(`  原口径算、截断后不算的产物：${bSameB.join(' ') || '（无）'}`);
console.log('  原因：`"X", ui-monospace, monospace` 里 `monospace` 在 `ui-monospace` 之后，');
console.log('  永远用不到 —— 截断后这条链是 2 族而不是 3 族。');
console.log('  ⇒ B 保持原口径是因为它是**对照**，要与验收基线（25/38）可比；');
console.log('    A/C/D 用截断口径因为它们的定义涉及「链末」，不截断就自相矛盾。');
console.log('');

const setA = new Set(results.A.bad.map((r) => r.id));
const setB = new Set(results.B.bad.map((r) => r.id));
const onlyA = [...setA].filter((x) => !setB.has(x));
const onlyB = [...setB].filter((x) => !setA.has(x));
const both = [...setA].filter((x) => setB.has(x));
console.log('━━ A 与 B 的关系 ━━');
console.log(`  A∩B ${both.length} 份：${both.join(' ') || '（无）'}`);
console.log(`  只踩 A（链够长但末尾没终止符）${onlyA.length} 份：${onlyA.join(' ') || '（无）'}`);
console.log(`  只踩 B（链短但末尾有终止符）${onlyB.length} 份：${onlyB.join(' ') || '（无）'}`);
console.log('');
console.log('  只踩 A 的那批是本轮的核心发现：链长看着够（≥3），');
console.log('  但最后一个是实名族而不是通用族 —— 换台机器仍然会换字。');
console.log('  这就是「数长度」永远量不出来的东西，也是为什么必须改判据。');
console.log('');

/* ── 与字体来源的交叉 ──────────────────────────────────────────────────
 * 「写了 @import / <link> / @font-face」与「链有终止符」是两件独立的事吗？
 * 如果高度相关，说明模型做对一件就做对另一件；无关则说明要分开修。 */
const hasSource = (r) => /@import\s+url\([^)]*fonts|fonts\.googleapis|<link[^>]+\.css|@font-face/i.test(r.src);
const withSrc = artifacts.filter(hasSource);
const noSrc = artifacts.filter((r) => !hasSource(r));
const rateA = (list) => `${list.filter(JUDGES[0].test).length}/${list.length} = ${pct(list.filter(JUDGES[0].test).length, list.length)}`;
console.log('━━ 对照：有没有写字体来源 vs 判据 A ━━');
console.log(`  写了来源 ${withSrc.length} 份，其中踩 A 的 ${rateA(withSrc)}`);
console.log(`  没写来源 ${noSrc.length} 份，其中踩 A 的 ${rateA(noSrc)}`);
console.log('  （注意：写来源 ≠ 链合规。CDN 挂了照样回退，所以两件事本来就不该相关。）');
console.log('');

/* ── 本判据自身的可信度 ────────────────────────────────────────────────
 * 这一行是本脚本存在的主要理由。
 * 这条判据被推翻两次，两次都不是「数字算错」，而是「量错了东西」。
 * 所以每次运行都必须自己回答：凭什么信这一次。
 *
 * 三条证据：
 *   ① 原型（手工合格样品）在 A 上的误报数 —— 必须是 0
 *   ② 脏数据是否真的被排掉了 —— 打印被排除的 @font-face 定义数与 inherit 数
 *   ③ 是否还有「未判」的声明 —— 未判多说明结论的覆盖面窄
 */
const protoFailsA = results.A.protoBad.length;
let ffDefs = 0, inheritDecls = 0, shorthandDecls = 0;
for (const r of [...artifacts, ...prototypes]) {
  /* @font-face 定义：共享模块的 stripFontFaceRules 会把它们整块删掉，
   * 所以这里数的是「被删掉了多少块」—— 这个数必须 >0，否则说明语料里
   * 根本没有这类脏数据，正对照的修正也就无从验证。 */
  ffDefs += (r.src.match(/@font-face/gi) || []).length;
  inheritDecls += (r.src.match(/font(?:-family)?\s*:\s*(?:inherit|initial|unset|revert)\b/gi) || []).length;
  /* 简写：数「有字族的 font:」—— 减去 font:inherit 那类。
   * 共享模块的 shorthandFamilies 对没有 size 词的简写返回 ''（宁可漏不猜），
   * 所以这里的正则数可能略高于真正进统计的条数，仅作规模参考。 */
  shorthandDecls += (r.src.match(/(?<![-\w])font\s*:\s*[^;}]*["'\w]/gi) || []).length
    - (r.src.match(/(?<![-\w])font\s*:\s*(?:inherit|initial|unset|revert)\b/gi) || []).length;
}
const undecidedTotal = [...artifacts, ...prototypes].reduce((s, r) => s + r.undecided, 0);

console.log('━━ 本判据自身的可信度 ━━');
console.log(`  ① 正对照（**每条判据都要过这道门**）：`);
for (const j of JUDGES) {
  const n = results[j.id].protoBad.length;
  const tag = j.isControl ? '对照，不适用' : (n === 0 ? '✓ 原型 0 误报' : `✗ 原型误报 ${n} 份 → 不出数`);
  console.log(`     ${j.id} ${j.label.padEnd(28)} ${tag}`);
}
if (results.D.protoBad.length) {
  console.log(`     D 的误报案：${results.D.protoBad.map((r) => r.id).join(' ')}`);
  console.log(`       （${'`'}code{font-family:"IBM Plex Mono","Zhuque Fangsong",Georgia,serif${'`'}}：`);
  console.log(`        挂在 code 上所以角色是等宽，但链以 serif 收尾。`);
  console.log(`        原型自己就这么写 —— 按「原型零误报」规则，D 不能拿来说产物有毛病。）`);
}
console.log(`  ② 脏数据已排除：${ffDefs} 处 @font-face 定义（整块不参与统计）、` +
  `${inheritDecls} 处 inherit/initial/unset/revert（不产出条目）`);
console.log(`     第二次推翻正是栽在这两类被误计：` +
  `@font-face 的「定义」被当成「使用」，inherit 被当成「无退路」——`);
console.log(`     两处一起把原型的真值 0/35 脏读成 9/35。`);
console.log(`  ③ 覆盖面：${undecidedTotal} 条声明展开后仍为空（只有未定义 var() 会这样），未计入判据；`);
console.log(`     另有 ${shorthandDecls} 处 font: 简写参与了统计（旧实现完全看不见这些：` +
  `S03-r2 有 18 处、S16 2 处、S18 2 处）。`);
console.log(`  ⇒ 判据 A 可信度：${protoFailsA === 0 ? '高' : '低'}` +
  `（原型 0 误报；A 的产物-原型差 p = ${(() => {
    const a = results.A.bad.length, b = results.A.protoBad.length;
    const p = fisher2(a, artifacts.length - a, b, prototypes.length - b);
    return p < 1e-4 ? p.toExponential(2) : p.toFixed(4);
  })()}）。`);
console.log(`     仍未解决的问题：判据只看「链怎么写」，不看「字体到底能不能拿到」——`);
console.log(`     一条写全了的链在没装字体的机器上照样换字。这一条的实测见 ` +
  `_render-audit16/17 与 _chain-vs-fallback.mjs。`);

/* 不判分（fail: false）的理由：
 * 这条判据现在是**能定线**的（原型 0/35，p = 0.0011），
 * 但「产物 10/38 不达标」这个事实该不该让 verify-research 变红，
 * 取决于要不要为它改提示词 —— 那是产品决定，不是测量能决定的。
 * 一旦改成 fail: true，每次改提示词重跑都会红，人就会开始无视它。
 * 所以保持只报不判，但这个「不判」现在是**已知阈值下的选择**，
 * 不是「不知道线在哪」。
 *
 * ⚠️ 与旧版的关键差别：旧版的注释写「这条判据没有可靠的合格线」——
 * 那句话是脏数据的产物。现在有合格线了（原型 0/35 就是线），
 * verify-research.mjs:238 的 label 必须同步改，否则两处文案互相矛盾。 */
