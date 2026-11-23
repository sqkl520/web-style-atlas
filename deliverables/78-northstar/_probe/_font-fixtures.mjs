/* 字体回退链判据 —— 反例夹具
 *
 * 【这个文件存在的理由】
 * `_font-fallback-chain.mjs` 的解析判据一天被推翻两次（见 git log 21f3764 / 29b486d）。
 * 两次都不是「数错了」，而是**把它读错的输入当成事实去报数**：
 *   · `font-family: inherit` 被当成 1 个族 → 虚增链长
 *   · `@font-face{font-family:"A"}` 的定义被当成使用 → 虚增「有退路」的比例
 *   · `font:12px/1 "A",monospace` 整条简写被漏掉 → 虚减声明数
 * 所以这里不评「链够不够长」（那是判据使用者的事），只钉死一件事：
 *   **一段输入应当被解析成几条声明、每条有几个族、分别是什么、算哪个角色。**
 *
 * 【怎么读输出】
 *   ✓ 通过   —— 实际与期望逐字段相同
 *   ✗ 失败   —— 实际与期望不同；下面会写清差在哪
 *   ? 未判   —— 实现读不出结论（或没有可测接口）。**未判不是通过**，
 *               这是本仓库吃过五次的亏，见 79-measurement-layer-audit.md §四十八。
 *
 * 退出码：有失败 → 1，否则 0。没有失败但存在未判 → 0（并把未判数写出来）。
 *
 * 【契约（A1 的成品要 export 什么）】
 * 你的 `_font-fallback-chain.mjs` 只要 export 任意一个函数，接受「一份源码字符串」，
 * 返回下面任一形状，夹具会自动切过去（优先于内置的两套参照实现）：
 *
 *   [{ role: 'title'|'body'|'mono', families: ['A','B'] }]     ← 首选
 *   [{ role: '...', chain: [...] }] / [{ role:'...', fams:[...] }]
 *   [['A','B'], ['C']]                                          ← 无角色（角色类用例会判失败）
 *   { declarations: [ ...同上... ] }
 *
 * 语义要求（逐条都有对应用例，见 CASES）：
 *   1. 只算**使用**声明；`@font-face` 块里的 `font-family` 是定义，不算。
 *   2. `font:` 简写里的字族要算；`font:inherit` / `font:menu` 不算。
 *   3. `inherit` / `initial` / `unset` / `revert(-layer)` 不是族名：
 *      整条声明只有关键字时，**这条声明应当被丢弃**（它表示「不改字体」，
 *      不是「选了一种字体」）。留着它会把「无退路」误报出来。
 *   4. 通用族（serif/sans-serif/monospace/system-ui/ui-* 等）是**终止符**：
 *      它之后的族名永远不会被用到（通用族在任何机器上都能匹配），
 *      解析时应当截断。见用例 18/19。
 *   5. `var(--x)` 必须展开；展开后为空（变量未定义）时，声明**要保留**并标
 *      为未判（families 为空数组），不能静默丢掉 —— 那是「读不到」，不是「没问题」。
 *   6. 引号内的逗号/分号不是分隔符；`!important` 不是族名的一部分。
 *   7. 属性名大小写不敏感（`FONT-FAMILY` 是合法 CSS）。
 *   8. `--font-family:` / `my-font-family:` 不是 `font-family` 声明。
 *   9. 角色由选择器决定：h1–h6/title/head/display/masthead → title；
 *      code/pre/kbd/samp/mono/num → mono；其余 → body。
 *      （角色是观察项 29 号，**不计分** —— 理由见那一条的 why。）
 *
 * 【基线（会变，每次运行都打印被测文件的 md5 前 8 位）】
 *   编写于 git HEAD = 21e1639。被测文件在编写期间改过一次：
 *     · 21e1639 版：内联正则，无 export          → 夹具走 headLogic（HEAD 算法移植）
 *     · d123ab9a 版：改成 `fontChains(src)` + 滤空链，仍无 export
 *                                                → 夹具走 a1SourceLogic（镜像那一行）
 *   两种都无 export，所以「被测实现」这一列不是调用它的函数，而是**镜像它实际
 *   在跑的那段解析**。一旦 A1 导出函数，夹具自动切到直接调用（优先级最高）。
 *   每次运行的输出都会写明当前跑的是哪一条路 —— 读结论前先看那一行。
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SHARED = join(HERE, '..', '_blindtest', '_css-fonts.mjs');
const TARGET = join(HERE, '_font-fallback-chain.mjs');

/* ─────────────────────────── 用例表 ───────────────────────────
 * families 全部按「去掉引号、去掉首尾空白」后的字面值比较。
 * role 只在给了的情况下比较。
 * score:false = 观察项，打印但不计入「A1 失败 N 例」。
 */
const CASES = [
  { id: '01', shape: 'font-family: inherit',
    src: 'code{font-family:inherit}',
    expect: { decls: [] },
    why: '关键字不是族名，整条声明应丢弃。留着会被算成「1 个族」——虚增链长，' +
         '正是 21f3764 之前那条「37/38 不达标」的来源之一（原型 S01:174 就有这条）。',
    score: true },

  { id: '02', shape: '@font-face 定义 + 使用处有链',
    src: '@font-face{font-family:"Single";src:url(s.woff2) format("woff2")}h1{font-family:"Single",Georgia,serif}',
    expect: { decls: [{ role: 'title', families: ['Single', 'Georgia', 'serif'] }] },
    why: '@font-face 里的 font-family 是**定义**。算成使用会让「定义了但从没用到」的族' +
         '凭空得到一条链。实测 73 份样本共 89 条 @font-face 定义（重算于 21e1639）：' +
         '把定义算成使用会让 3 份产物的最短链从 2 变成 1（S04-r2 / S16 / S18），' +
         '即「无退路」率由 5/38=13% 虚增到 8/38=21%。',
    score: true },

  { id: '03', shape: 'font:12px/1 "A", monospace（简写）',
    src: 'body{font:12px/1 "A", monospace}',
    expect: { decls: [{ families: ['A', 'monospace'] }] },   // 角色不检查：选择器 body 与等宽链冲突，口径见报告
    why: '简写里的 size/line-height 不是族名，size 之后才是字族表。漏掉整条简写会虚减声明数：' +
         '实测 S03-r2 有 14 条、S16 有效 2 条、S18 2 条。',
    score: true },

  { id: '04', shape: 'font:inherit',
    src: 'body{font:inherit}',
    expect: { decls: [] },
    why: '简写关键字不是字族声明。实测 22/73 份文件有这一条（button 复位最常用）。' +
         '计进去会让「最短链」变成 0 族，把按钮复位误报成「无退路」。',
    score: true },

  { id: '05', shape: '嵌套 var(--a, var(--b))',
    src: ':root{--a:var(--b,var(--c));--c:Georgia}.x{font-family:var(--a),serif}',
    expect: { decls: [{ families: ['Georgia', 'serif'] }] },
    why: 'fallback 里还能再套 var()。用 `(?:,[^)]*)?` 的写法会在第一个 `)` 截断，' +
         '留下 `var(--b, Georgia)` 这种假族名。共享层的 expandVars 为此专门做过括号配对。',
    score: true },

  { id: '06', shape: 'var(--undefined)',
    src: '.x{font-family:var(--nope)}',
    expect: { decls: [{ families: [], undecidable: true }] },
    why: '变量没定义 ≠ 声明不存在。必须留下一条空链并标未判；静默丢弃等于把' +
         '「读不到」当「没问题」——本仓库最老的病（79 审计 §四十八）。',
    score: true },

  { id: '07', shape: '@media 内的 font-family',
    src: '@media (min-width:700px){.x{font-family:"A",serif}}',
    expect: { decls: [{ families: ['A', 'serif'] }] },
    why: 'at-rule 只是一层括号，里面的声明照常算。实测原型 S15 有一处 @media 内的 font-family。' +
         '按整块跳过会把响应式档位的字体漏掉。',
    score: true },

  { id: '08', shape: '注释里的 font-family:',
    src: '/* font-family: "Ghost", serif; */h1{font-family:"Real",serif}',
    expect: { decls: [{ role: 'title', families: ['Real', 'serif'] }] },
    why: 'S13 曾因注释里出现 monospace 被判「链外×1」（score.mjs:466-468 的病史）。' +
         '注释必须先剥。这一条的失败形态是**多出一条链**，不是少一条。',
    score: true },

  { id: '09', shape: "单引号 'A','B'",
    src: "h1{font-family:'A','B'}",
    expect: { decls: [{ role: 'title', families: ['A', 'B'] }] },
    why: "引号必须成对剥掉。只剥双引号会得到 ['\\'A\\'', 'B'] 这种带引号的假族名，" +
         '后续「族名是否在提示词允许集合里」会全部落空。',
    score: true },

  { id: '10', shape: '无空格 A,B',
    src: 'h1{font-family:A,B}',
    expect: { decls: [{ role: 'title', families: ['A', 'B'] }] },
    why: '压缩写法（产物里大量如此，如 S18 的 `VT323,"Courier New",monospace`）。' +
         '按 `, ` 切会只切出一条。',
    score: true },

  { id: '11', shape: '大写 FONT-FAMILY',
    src: 'h1{FONT-FAMILY:"A",serif}',
    expect: { decls: [{ role: 'title', families: ['A', 'serif'] }] },
    why: 'CSS 属性名大小写不敏感。当前实现在这里返回 0 条声明 —— 一声不响地整条漏掉。' +
         '（语料 73 份里 0 处，属防御性用例；但漏掉是**静默**的，符合本仓库要防的那一类。）',
    score: true },

  { id: '12', shape: 'font-family:"A" !important',
    src: 'h1{font-family:"A" !important}',
    expect: { decls: [{ role: 'title', families: ['A'] }] },
    why: '`!important` 必须剥掉。不剥会得到族名 `A" !important`（实测当前实现如此）：' +
         '链长对、族名错，而族名错会让「是否在允许集合内」误判。语料里 !important 32 份，' +
         '但都在别的属性上，font-family 上 0 处。',
    score: true },

  { id: '13', shape: '引号里的分号',
    src: 'h1{font-family:"A;B", serif}',
    expect: { decls: [{ role: 'title', families: ['A;B', 'serif'] }] },
    why: '声明值用 `[^;}]+` 切会在引号内的 `;` 处提前截断 —— 这不是「切错族名」，' +
         '是**整条值被腰斩**。与 14 号同源（A3 修了逗号，询问分号是否也修）。语料 0 处。',
    score: true },

  { id: '14', shape: '引号里的逗号',
    src: 'h1{font-family:"A, B", serif}',
    expect: { decls: [{ role: 'title', families: ['A, B', 'serif'] }] },
    why: '`split(",")` 会把一个族名切成两个。A3 的 splitFamilies 已修。语料 0 处，' +
         '但字体名带逗号是真实写法（"Noto Sans, Fallback" 这类）。',
    score: true },

  { id: '15', shape: '自定义属性 --font-family',
    src: ':root{--font-family:"A",serif}h1{font-family:var(--font-family)}',
    expect: { decls: [{ role: 'title', families: ['A', 'serif'] }] },
    why: '`:root{--font-family:...}` 是**变量定义**，不是使用。任何 `font-family\\s*:` 的' +
         '正则都会命中它（当前实现就把定义算成了一条链）。同一个坑在 `--font-size` 上已经' +
         '踩过（79 审计 §四十五：`--num` 匹配不到 `--font-num`）。语料 0 处，但一旦出现就是静默多算。',
    score: true },

  { id: '16', shape: '@font-face 的 src 里带花括号',
    src: '@font-face{font-family:"Z";src:url(data:font/woff2;base64,{AA})}h1{font-family:"Z",serif}',
    expect: { decls: [{ role: 'title', families: ['Z', 'serif'] }] },
    why: '排除 @font-face 用的是 `@font-face[^{]*\\{[^{}]*\\}`，块内一旦有花括号就配不上，' +
         '定义会漏出来变成一条使用链。语料 0 处（本库的 data URI 不含花括号），' +
         '但同一条正则也决定「@font-face 里如果有嵌套块会怎样」。',
    score: true },

  { id: '17', shape: '@font-face 定义了但没用到',
    src: '@font-face{font-family:"Unused";src:url(u)}h1{font-family:"A",serif}',
    expect: { decls: [{ role: 'title', families: ['A', 'serif'] }] },
    why: '和 02 同一类，但反过来钉：定义族「Unused」不得产生任何链。' +
         '它会把「有退路」的比例抬高 —— 规划 Agent 核出的真缺陷之一。',
    score: true },

  { id: '18', shape: '通用族在中间（终止符）',
    src: 'h1{font-family:"A", serif, Georgia}',
    expect: { decls: [{ role: 'title', families: ['A', 'serif'] }] },
    why: '通用族之后的族名永远用不到（serif 在任何机器上都能匹配），是**死代码**。' +
         '不截断会让链长虚增 1，把「2 族」报成「3 族」。语料 1 处同形：' +
         '原型 S08 `"Overprint Numerals", ui-monospace, monospace`。',
    score: true },

  { id: '19', shape: '通用族在开头',
    src: 'h1{font-family:serif, "A"}',
    expect: { decls: [{ role: 'title', families: ['serif'] }] },
    why: '18 的镜像。不截断会报 2 族（「有退路」），实际只有 1 个族 —— ' +
         '这正是把「单族声明」误判成合规的形态。',
    score: true },

  { id: '20', shape: 'font: menu（系统字体简写）',
    src: 'button{font:menu}',
    expect: { decls: [] },
    why: '`font: menu` 是系统字体简写，不是字族表。它的形态与 `font:12px "A"` 相同（无 size），' +
         '任何「取最后一个词当族名」的近似都会把 menu 当族名。',
    score: true },

  { id: '21', shape: '完整 font 简写（风格+权重+size/lh）',
    src: 'h2{font:italic 700 16px/1.5 "Noto Serif SC", Georgia, serif}',
    expect: { decls: [{ role: 'title', families: ['Noto Serif SC', 'Georgia', 'serif'] }] },
    why: 'size 之前的 italic/700 不是族名。按「第一个非关键字当族名」会把 italic 或 700 吃进去。' +
         '语料里的真实形态：S03-r2 `font:500 23px/1.1 \'IBM Plex Mono\',Consolas,serif`。',
    score: true },

  { id: '22', shape: 'initial / unset / revert',
    src: 'h1{font-family:initial}h2{font-family:unset}h3{font-family:revert}',
    expect: { decls: [] },
    why: '和 01 同类，一次覆盖三个关键字。共享层的 CSS_KEYWORDS 已含 revert-layer，' +
         '但「整条声明是否丢弃」是调用方的决定，不是 chainOf 的决定 —— 见用例 01。',
    score: true },

  { id: '23', shape: '正文里的 font-family:（非 CSS）',
    src: '<p>示例：font-family: "Fake", serif;</p><style>h1{font-family:"Real",serif}</style>',
    expect: { decls: [{ role: 'title', families: ['Real', 'serif'] }] },
    why: '先切出 CSS 上下文（<style> 与 style=""）再扫声明。语料 0 处正文提及，' +
         '但说明性文档页会踩；失败形态是多一条来自散文的假链。',
    score: true },

  { id: '24', shape: '内联 style 属性',
    src: '<div style="font-family:\'A\',serif">x</div>',
    expect: { decls: [{ families: ['A', 'serif'] }] },
    why: '观察项，不计分：语料 38 份产物里 font-family 出现在 style="" 的为 0 处，' +
         '所以「算不算」是产品口径问题，不是解析对错。共享层的 cssText 会算。',
    score: false },

  { id: '25', shape: 'my-font-family:（假属性）',
    src: 'h1{my-font-family:"A",serif}h2{font-family:"B",sans-serif}',
    expect: { decls: [{ role: 'title', families: ['B', 'sans-serif'] }] },
    why: '未知属性不是 font-family。正则不加左边界会把 `my-font-family:` 当声明。' +
         '语料 0 处，但与 15 号同源（都是「左边界」）。',
    score: true },

  { id: '26', shape: '简写的字族来自变量',
    src: ':root{--f:"A",Georgia,serif}h1{font:16px/1.5 var(--f)}',
    expect: { decls: [{ role: 'title', families: ['A', 'Georgia', 'serif'] }] },
    why: '简写与变量展开必须串起来：先切出简写的字族段（`var(--f)`），再展开。' +
         '任一环缺失都得到 0 条声明。',
    score: true },

  { id: '27', shape: '@supports 内的 font-family',
    src: '@supports (display:grid){h1{font-family:"Y",serif}}',
    expect: { decls: [{ role: 'title', families: ['Y', 'serif'] }] },
    why: '和 07 同源（at-rule 嵌套），但 @supports 没有预置关键字表，' +
         '常被 `@media` 专用分支漏掉。',
    score: true },

  { id: '28', shape: '三个角色的声明都要被解析出来',
    src: 'h1{font-family:"T",serif}body{font-family:"Bd",serif}code{font-family:"M",monospace}',
    expect: { decls: [
      { families: ['T', 'serif'] },
      { families: ['Bd', 'serif'] },
      { families: ['M', 'monospace'] },
    ] },
    why: '分角色的前提是三条声明都能被读出来。这一例**只查族表**，不查角色 —— 理由见 29 号。',
    score: true },

  { id: '29', shape: '角色字段：标题/正文/等宽三分',
    src: 'h1{font-family:"T",serif}body{font-family:"Bd",serif}code{font-family:"M",monospace}',
    expect: { decls: [
      { role: 'title', families: ['T', 'serif'] },
      { role: 'body', families: ['Bd', 'serif'] },
      { role: 'mono', families: ['M', 'monospace'] },
    ] },
    checkRole: true,
    score: false,
    why: '观察项，不计分。任务书要求「标题/正文/等宽分角色」，而 A1 现行实现只有两个桶' +
         '（`roleSummary` 里是 `{ mono, other }`，标题与正文合并成 other）。' +
         '**不计分的理由**：这条差距是真的，但 A1 的成品是脚本、不导出每条声明的角色，' +
         '夹具只能用镜像判，镜像出来的失败会让「N=0」这个验收信号永远到不了。' +
         '所以这里只打印，把「该不该分三档」留给报告去说。',
  },
];

/* ── 参照实现 B0：A1 **当前源码**的解析路径镜像 ─────────────────────────
 *
 * 2026-11-24 07:13 A1 重写了 `_font-fallback-chain.mjs`，但它仍然是一个脚本、
 * 没有 export（它把解析全交给共享模块）：
 *
 *     import { fontChains } from '../_blindtest/_css-fonts.mjs';
 *     const all = fontChains(src);
 *     const chains = all.filter((c) => c.length > 0);
 *
 * 所以夹具不能再拿 HEAD 版算法去判它 —— 那会把旧逻辑的账算在新文件头上。
 * 这一层逐字复刻上面两行：**它测的就是 A1 现在真正拿到的链**。
 * 如果 A1 哪天改成 export 一个函数，夹具会自动切到那个函数（见 loadA1）。
 *
 * 注意：A1 的 `chains` 没有 role 字段（角色只用于打印，不参与判定），
 * 所以这一层产出的 role 是 undefined —— 只有 28 号用例会因此失败，而它
 * 恰好就是「A1 是否真的按选择器分了角色」的那一问。
 */
function a1SourceLogic(F, src) {
  const all = F.fontChains(src);
  const chains = all.filter((c) => c.length > 0);
  const out = chains.map((c) => ({ families: c }));
  /* A1 把「展开后为空」的声明从 chains 里滤掉了，但**它单独记了数**
   * （`const undecided = all.length - chains.length`，输出表里有「未知」一列）。
   * 所以信息没丢。夹具要测的是「有没有丢信息」，不是「形状像不像」——
   * 这里把 A1 记下来的那部分按 undecidable 补回去，才是公平的比法。
   * 如果 A1 哪天不再记这个数，这条就会重新变红。 */
  for (let i = chains.length; i < all.length; i++) out.push({ families: [], undecidable: true });
  return out;
}

/* ─────────────────── 参照实现 B：HEAD 版算法原样移植 ───────────────────
 *
 * 出处：git HEAD=21e1639 的 `_font-fallback-chain.mjs` 第 63-74 行（expand/变量展开）
 * 与第 95-105 行（声明扫描）。这两段是当时**真正在跑**的逻辑，不是我的理解版本。
 * 它没有 role（分角色是 A1 新加的），也没有简写/终止符/关键字剔除。
 * A1 一 export 接口，这一层就不再参与判定，只在需要对照时打印。
 */
function headLogic(html) {
  html = String(html || '').replace(/\/\*[\s\S]*?\*\//g, '');
  const vars = {};
  for (const m of html.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)) vars[m[1]] = m[2];
  const go = (s, d = 0) => {
    if (d > 5) return s;
    return s.replace(/var\(\s*(--[\w-]+)\s*(?:,[^)]*)?\)/g,
      (_, n) => (vars[n] !== undefined ? go(vars[n], d + 1) : ''));
  };
  const out = [];
  for (const m of html.matchAll(/font-family\s*:\s*([^;}]+)/g)) {
    const fams = go(m[1]).split(',')
      .map((x) => x.trim().replace(/^["']|["']$/g, '').trim())
      .filter((x) => x && !x.startsWith('var('));
    out.push({ families: fams });
  }
  return out;
}

/* ─────────────── 参照实现 C：A1 被要求复用的共享层 ───────────────
 *
 * 这一层只把「值级解析」交给 `_css-fonts.mjs`（chainOf/expandVars/shorthandFamilies/
 * stripFontFaceRules/cssText），结构级的切块与角色分类由夹具提供 —— 因为共享层
 * 不提供选择器，而角色正是要靠选择器。所以 C 的失败点 = 共享层的值级盲区，
 * 也就是 A1 照要求 import 之后**仍然会继承**的那部分。
 */
function sharedLogic(F, src) {
  /* 共享层正在被 A3 重写，导出名可能变。缺任何一个就返回 null（→ 判「未判」），
   * 不能让夹具本身抛错 —— 那样会看起来像「被测实现崩了」，而实际是夹具的依赖变了。 */
  const need = ['stripFontFaceRules', 'stripCssComments', 'cssVariables',
    'fontDeclarations', 'shorthandDeclarations', 'shorthandFamilies', 'chainOf'];
  const missing = need.filter((k) => typeof F[k] !== 'function');
  if (missing.length) return null;
  const css = F.stripFontFaceRules(F.stripCssComments(String(src || '')));
  const vars = F.cssVariables(src);
  const out = [];
  for (const rule of splitRules(css)) {
    const role = roleOf(rule.sel);
    for (const v of F.fontDeclarations(rule.body)) out.push(finish(F.chainOf(v, vars), v, role));
    for (const v of F.shorthandDeclarations(rule.body)) {
      const fam = F.shorthandFamilies(v);
      if (!fam) continue;                       // font:inherit / font:menu
      out.push(finish(F.chainOf(fam, vars), fam, role));
    }
  }
  return out.filter((d) => !(d.families.length === 0 && !d.undecidable));
}

/* 共享层缺导出时的可读说明（只在对照统计里用，不影响 A1 的判定）。 */
function sharedMissing(F) {
  const need = ['stripFontFaceRules', 'stripCssComments', 'cssVariables',
    'fontDeclarations', 'shorthandDeclarations', 'shorthandFamilies', 'chainOf'];
  return need.filter((k) => typeof F[k] !== 'function');
}

/* 规则切块（花括号配对），**递归进 at-rule**。
 *
 * 这是夹具自己的最小实现，不追求 CSS 完备，但必须递归：否则
 * `@media{ h1{...} }` 会把 `@media (...)` 当成选择器，角色被判成 body。
 * 那是夹具的错，不能记到共享层头上。`@font-face` 已被 stripFontFaceRules 去掉。 */
const AT_BLOCK = /^@(media|supports|layer|container|document|scope|starting-style)\b/i;
function splitRules(css) {
  const rules = [];
  let i = 0;
  while (i < css.length) {
    const b = css.indexOf('{', i);
    if (b < 0) break;
    let lvl = 0, j = b;
    for (; j < css.length; j++) {
      if (css[j] === '{') lvl++;
      else if (css[j] === '}') { lvl--; if (lvl === 0) { j++; break; } }
    }
    const sel = css.slice(i, b).trim().split(';').pop().trim();
    const body = css.slice(b + 1, Math.max(b + 1, j - 1));
    if (AT_BLOCK.test(sel)) rules.push(...splitRules(body));
    else rules.push({ sel, body });
    i = j;
  }
  return rules;
}

const ROLE_TITLE = /(^|[\s,.#>+~])(h[1-6]|title|head|display|masthead)\b/i;
const ROLE_MONO = /(^|[\s,.#>+~])(code|pre|kbd|samp|mono|num)\b/i;
function roleOf(sel) {
  if (ROLE_MONO.test(sel)) return 'mono';
  if (ROLE_TITLE.test(sel)) return 'title';
  return 'body';
}

/* 终止符截断 + 未判标记（契约第 4/5 条）。 */
const GENERIC = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy',
  'system-ui', 'ui-monospace', 'ui-serif', 'ui-sans-serif', 'ui-rounded', 'math', 'emoji']);
function finish(families, rawValue, role) {
  const fams = (families || []).slice();
  const gi = fams.findIndex((f) => GENERIC.has(String(f).toLowerCase()));
  const chain = gi >= 0 ? fams.slice(0, gi + 1) : fams;
  return {
    role,
    families: chain,
    // 展开后为空且原文里确实有 var() → 读不到，标未判，不能丢
    undecidable: chain.length === 0 && /var\(/i.test(String(rawValue || '')),
  };
}

/* ─────────────────── 参照实现 A：A1 成品的自动探测 ─────────────────── */
async function loadA1() {
  let src;
  try { src = readFileSync(TARGET, 'utf8'); } catch { return null; }
  if (!/\bexport\s+(?:async\s+)?(?:function|const|let|var)\b/.test(src)) return null;
  let mod;
  try { mod = await import(pathToFileURL(TARGET).href + '?t=' + Date.now()); }
  catch (e) { return { name: '(导入失败)', note: e.message, fn: null }; }
  const names = Object.keys(mod).filter((k) => typeof mod[k] === 'function');
  const prefer = names.find((k) => /^(parse|analy|font|decl|chain|usage|judge)/i.test(k)) || names[0];
  if (!prefer) return null;
  return { name: prefer, fn: mod[prefer], all: names };
}

function normA1(r) {
  if (Array.isArray(r)) {
    if (r.length === 0) return [];
    if (Array.isArray(r[0])) return r.map((f) => ({ families: f }));
    if (r[0] && typeof r[0] === 'object') return r.map((d) => ({
      role: d.role || d.slot || d.kind,
      families: d.families || d.chain || d.fams || [],
      undecidable: d.undecidable === true,
    }));
  }
  if (r && Array.isArray(r.declarations)) return normA1(r.declarations);
  return null;
}

/* ─────────────────────────── 比较 ─────────────────────────── */
const ROLE_ALIAS = { heading: 'title', display: 'title', head: 'title',
  text: 'body', paragraph: 'body', copy: 'body', default: 'body', normal: 'body',
  code: 'mono', monospace: 'mono' };
const normRole = (r) => (r ? (ROLE_ALIAS[String(r).toLowerCase()] || String(r).toLowerCase()) : r);
const normFam = (f) => String(f).trim().replace(/^["']|["']$/g, '').trim();
/* 族表打印：带逗号/空格的族名加引号。否则 `['A, B','serif']`（2 个族）
 * 与 `['A','B','serif']`（3 个族）打印出来一模一样，失败信息会自相矛盾。 */
const fmtFams = (fams) => '[' + (fams || []).map((f) => (/[,\s]/.test(f) ? JSON.stringify(f) : f)).join(' | ') + ']';

function compare(expect, actual, checkRole) {
  const want = expect.decls;
  if (actual === null) return { ok: false, kind: 'shape', why: '返回值形状无法识别（见文件头的契约）' };
  if (!Array.isArray(actual)) return { ok: false, kind: 'shape', why: '返回值不是数组' };
  if (actual.length !== want.length) {
    return { ok: false, kind: 'decl-count', why: `声明条数 ${actual.length} ≠ 期望 ${want.length}` +
      (actual.length ? `；实际=[${actual.map((d) => '[' + (d.families || []).join('|') + ']').join(', ')}]` : '') };
  }
  for (let i = 0; i < want.length; i++) {
    const w = want[i], a = actual[i] || {};
    const af = (a.families || []).map(normFam);
    const wf = w.families.map(normFam);
    if (af.length !== wf.length || af.some((x, k) => x !== wf[k])) {
      return { ok: false, kind: 'families',
        why: `第 ${i + 1} 条族表 ${fmtFams(af)} ≠ 期望 ${fmtFams(wf)}` +
             (af.length === wf.length ? '' : `（${af.length} 个 ≠ ${wf.length} 个）`) };
    }
    /* 角色只在专门的「分角色」用例上比较（见 CASES 里 28 号的注释）。
     * 其余用例的 role 字段只作为**意图说明**保留：把「角色没实现」混进
     * 「解析写错」的计数里，会让一个未实现的功能看起来像十来个独立 bug。 */
    if (checkRole && w.role && normRole(a.role) !== normRole(w.role)) {
      return { ok: false, kind: a.role === undefined ? 'role-missing' : 'role-wrong',
        why: `第 ${i + 1} 条角色 ${a.role === undefined ? '未提供' : JSON.stringify(a.role)} ≠ 期望 ${w.role}` };
    }
    if (w.undecidable && !a.undecidable) {
      return { ok: false, kind: 'undecidable-lost',
        why: `第 ${i + 1} 条展开为空，但没有标未判（families 空且无 undecidable —— 会被当成「没问题」）` };
    }
  }
  return { ok: true };
}

/* 族表打印：带逗号/空格的族名用引号包起来，否则
 * `['A, B','serif']` 和 `['A','B','serif']` 打印出来一模一样，
 * 失败信息会自相矛盾（实测 14 号就是这样）。 */
const showFam = (f) => (/[,\s]/.test(f) ? JSON.stringify(f) : f);
const fmt = (decls) => (decls && decls.length
  ? decls.map((d) => `{${d.role || '?'}: ${(d.families || []).map((f) => showFam(normFam(f))).join(' | ') || '（空）'}${d.undecidable ? ' [未判]' : ''}}`).join(' ')
  : '（无声明）');

/* ─────────────────────────── 运行 ─────────────────────────── */
const F = await import(pathToFileURL(SHARED).href);
const a1 = await loadA1();

/* A1 的三条形态，按可信度取舍：① export 了函数 → 直接调；② 脚本但改用
 * fontChains(src) → 跑同一行（a1SourceLogic）；③ 还是 HEAD 那套正则 → headLogic。
 * ②③ 混为一谈会把旧逻辑的账算在新文件头上 —— A1 已于 07:13 重写成 ②。 */
const A1_SRC = (() => { try { return readFileSync(TARGET, 'utf8'); } catch { return ''; } })();
const A1_CALLS_SHARED = /\bfontChains\s*\(/.test(A1_SRC);
const A1_HASH = (() => {
  try { return createHash('md5').update(A1_SRC).digest('hex').slice(0, 8); } catch { return '?'; }
})();
const MODE = a1 && a1.fn ? 'export' : A1_CALLS_SHARED ? 'source' : A1_SRC ? 'head' : 'missing';
const MODE_DESC = {
  export: `A1 导出的 ${a1 && a1.name}()`,
  source: 'A1 源码的解析路径（fontChains(src) + 滤空链）—— 它未导出，夹具镜像这一行',
  head: 'HEAD 版算法（A1 的起点：既没导出、也还没改用共享层）',
  missing: '（找不到被测文件）',
};

console.log('字体回退链判据 — 反例夹具');
console.log('被测文件的 md5 前 8 位：' + A1_HASH);
console.log(`被测实现：${MODE_DESC[MODE]}`);
if (MODE === 'source') {
  console.log('  ⚠️ 这个文件是脚本、没有 export，所以夹具镜像了它调用共享层的那一行。');
  console.log('     它自己的 A/B/C/D 四条判据不在此测 —— 这里只测「链解析得对不对」。');
}
if (a1 && a1.name === '(导入失败)') console.log(`  ⚠️ 导入 A1 成品失败：${a1.note}`);
console.log('对照实现：共享层 _css-fonts.mjs（A1 被要求 import 的那份）');
console.log('');

const rows = [];
for (const c of CASES) {
  let actual, actualShared, note = '';
  try {
    if (MODE === 'export') actual = normA1(await a1.fn(c.src));
    else if (MODE === 'source') actual = a1SourceLogic(F, c.src);
    else if (MODE === 'head') actual = headLogic(c.src);
    else actual = null;
  } catch (e) { actual = null; note = '被测实现抛错：' + e.message; }
  try { actualShared = sharedLogic(F, c.src); }
  catch (e) { actualShared = null; note += ' 共享层抛错：' + e.message; }
  const verdict = actual === null
    ? { ok: false, kind: 'shape', why: note || '无法取得结果', undecided: true }
    : compare(c.expect, actual, c.checkRole === true);
  const verdictShared = actualShared === null
    ? { ok: false, kind: 'shape', why: '共享层缺导出 ' + sharedMissing(F).join(',') }
    : compare(c.expect, actualShared, c.checkRole === true);
  rows.push({ c, actual, actualShared, verdict, verdictShared });
}

for (const r of rows) {
  const { c, verdict } = r;
  const mark = !c.score ? '·' : (verdict.ok ? '✓' : '✗');
  console.log(`${mark} ${c.id} ${c.shape}`);
  console.log(`   输入  ${c.src}`);
  console.log(`   期望  ${fmt(c.expect.decls)}`);
  console.log(`   实际  ${fmt(r.actual)}`);
  if (!verdict.ok) console.log(`   ✗ ${verdict.why}`);
  if (c.why) console.log(`   为什么这一条要这么期望：${c.why}`);
  console.log('');
}

const scored = rows.filter((r) => r.c.score);
const fails = scored.filter((r) => !r.verdict.ok);
const passes = scored.length - fails.length;
const failShared = scored.filter((r) => !r.verdictShared.ok);

console.log('─'.repeat(72));
console.log(`A1 失败 ${fails.length} 例（通过 ${passes} 例，共 ${scored.length} 例计分）`);
if (fails.length) {
  /* 按**失败种类**分组：让「一个功能没做」和「一处解析写错」分开，否则
   * 24 例看起来像 24 个独立 bug，而实际可能只是一个角色分类没输出。 */
  const KINDS = {
    'decl-count': '声明条数不对（漏声明 / 多声明）',
    'families': '族名或族数不对',
    'role-missing': '没输出角色（A1 的新要求，未实现）',
    'role-wrong': '角色判错',
    'undecidable-lost': '读不到却当成没问题（未标未判）',
    'shape': '返回形状不符合契约',
  };
  const byKind = {};
  for (const r of fails) (byKind[r.verdict.kind] ||= []).push(r.c.id);
  console.log('  按失败种类：');
  for (const [k, ids] of Object.entries(byKind)) {
    console.log(`    ${(KINDS[k] || k).padEnd(34)} ${String(ids.length).padStart(2)} 例  ${ids.join(' ')}`);
  }
  console.log(`  失败清单：${fails.map((r) => r.c.id).join(' ')}`);
  console.log('  ↑ 每一例都是「解析口径」的错，不是「链够不够长」。');
}
console.log(`共享层对照：若 A1 照要求 import _css-fonts 而不打补丁，失败 ${failShared.length} 例` +
  (failShared.length ? `（${failShared.map((r) => r.c.id).join(' ')}）` : ''));

const undecided = scored.filter((r) => r.verdict.undecided);
if (undecided.length) console.log(`未判 ${undecided.length} 例（不是通过）：${undecided.map((r) => r.c.id).join(' ')}`);

process.exitCode = fails.length ? 1 : 0;
