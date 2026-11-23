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
 *   B 有声明只有 2 个族           ← 对照。只看长度，不看是不是通用族
 *   C 有声明只有 1 个族           ← 最严重：连一个字面退路都没有
 *   D 等宽链不落到等宽通用族      ← 分角色。等宽链回退到 serif 会破坏对齐
 *
 * A 与 C 是包含关系（1 个族必然不以通用族结尾），B 与 C 不是。
 *
 * ═══ 分角色，不再跨角色取 Math.min ═══════════════════════════════════
 * 旧实现 `Math.min(...chains.map(len))` 把标题、正文、等宽三条链的最差值
 * 当成整份文件的成绩。后果：一条 2 族的等宽链（`"DM Mono", monospace`
 * 完全够用）会把整份判成「链太短」，而它的正文链其实是 4 族。
 * 现在三个角色分开统计，等宽链只按等宽的标准判。
 *
 * ═══ 这份判据自身的可信度 ═════════════════════════════════════════════
 * 见输出最后一行。它打印的是「判据 A 在多少个原型上误报」——
 * 原型是手工做的合格样品，A 在原型上误报 0 份才允许拿它判产物。
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
import { fontChains } from '../_blindtest/_css-fonts.mjs';

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

/* 读一份文件 → 声明列表。解析全部交给共享模块，这里只做「读文件 + 过滤空链」。
 *
 * ⚠️ 空链必须记下来单独报，不能静默丢掉。
 *
 * 共享模块（2026-11-24 版）已经把「不是字族声明」的值滤在产出口径之外：
 *   · `font-family: inherit` / `initial` / `unset` / `revert`  → 不产出条目
 *   · `font: inherit` / `font: menu`                          → 不产出条目
 * 但 `font-family: var(--未定义)` **仍会产出一个空数组** —— 那是「读不到」，
 * 不是「没有」。这两件事的处置完全不同：前者应当无视，后者应当记「未判」。
 * 所以空数组单独计数，并在输出里报出来。本次实测 0 条 —— 但计数必须留着，
 * 下一批产物里出现未定义变量时，这个数会自己涨，而不是让结论悄悄变窄。 */
function loadRows(dirs, fileOf) {
  const rows = [];
  for (const id of dirs) {
    const p = fileOf(id);
    if (!existsSync(p)) continue;
    const src = readFileSync(p, 'utf8');
    const all = fontChains(src);
    const chains = all.filter((c) => c.length > 0);
    const undecided = all.length - chains.length;
    if (!chains.length) continue;
    rows.push({ id, src, chains, undecided, nDecls: all.length });
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
    test: (r) => r.chains.some((c) => !isGeneric(c[c.length - 1])),
    example: (r) => {
      const c = r.chains.find((x) => !isGeneric(x[x.length - 1]));
      return c.join(', ');
    },
  },
  {
    id: 'B',
    label: '有声明只有 2 个族',
    why: '对照。只看长度不看内容 —— 一条 2 族的链可能是 ' +
      '`"Noto Sans SC", sans-serif`（够用），也可能是 `"Antonio", "WenJin Mincho"`（不够）。' +
      'B 与 A 的差集就是「长度够但没终止符」的那一批。',
    test: (r) => r.chains.some((c) => c.length === 2),
    example: (r) => r.chains.find((c) => c.length === 2).join(', '),
  },
  {
    id: 'C',
    label: '有声明只有 1 个族',
    why: '最严重的一档：连一个字面退路都没有。只有装了那一个字体才不出事。',
    test: (r) => r.chains.some((c) => c.length === 1),
    example: (r) => r.chains.find((c) => c.length === 1).join(', '),
  },
  {
    id: 'D',
    label: '等宽链不落到等宽通用族',
    why: '分角色的判据。等宽链回退到 `serif`/`sans-serif` 能保证有字可显，' +
      '但字符不再对齐 —— 表格数字、栏号、代码块会散架。只有 monospace/ui-monospace 算数。',
    test: (r) => {
      const mono = r.chains.filter(looksMono);
      return mono.length > 0 && mono.some((c) => !isMonoGeneric(c[c.length - 1]));
    },
    example: (r) => {
      const c = r.chains.filter(looksMono).find((x) => !isMonoGeneric(x[x.length - 1]));
      return c.join(', ');
    },
  },
];

/* ── 角色分档（供人读，不参与合格判定）─────────────────────────────────
 * 任务书要求「标题 / 正文 / 等宽 三个角色分开，不许 Math.min 跨角色取最差」。
 * 四条判据本身已经不再跨角色取最差（每条判据各自扫全部声明），
 * 这里额外按角色打印最差链，让人能看出「短的那条是等宽的，无所谓」
 * 还是「短的那条是正文，那是真的没退路」。 */
const ROLE_OF = (chain) => (looksMono(chain) ? 'mono' : null);

function roleSummary(r) {
  const m = { mono: [], other: [] };
  for (const c of r.chains) (looksMono(c) ? m.mono : m.other).push(c);
  const worst = (arr) => (arr.length ? arr.reduce((a, b) => (b.length < a.length ? b : a)) : null);
  return { mono: worst(m.mono), other: worst(m.other), nMono: m.mono.length, nOther: m.other.length };
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
console.log('排除 @font-face 定义、排除 inherit/initial/unset/revert。通用族算终止符。\n');

console.log('案          声明数  未知  正文最短族  等宽最短族  判定');
console.log('─'.repeat(64));
for (const r of artifacts) {
  const rs = roleSummary(r);
  const badA = JUDGES[0].test(r);
  /* 这里印的是**最短链的族名个数**，不是字符串长度 ——
   * 第一版写成 `s.length`（join 后整串的字符数），印出 [42] 这种数，
   * 读表的人会以为链有 42 族。 */
  const shown = (c) => (c ? String(c.length) : '—');
  console.log(
    `${r.id.padEnd(11)} ${String(r.nDecls).padStart(5)} ${String(r.undecided).padStart(5)} ` +
    `${shown(rs.other).padStart(9)} ${shown(rs.mono).padStart(10)}  ${badA ? '✗A' : '✓'}`);
}
console.log('─'.repeat(64));
console.log('（未知 = 展开后仍为空数组的声明数：只有 `font-family: var(--未定义)` 会这样。');
console.log('  `font-family: inherit` 这类关键字已由共享模块滤掉，不产出条目 ——');
console.log('  那正是第二次推翻的假象来源：把「继承」当成「无退路」，原型被脏读成 9/35。）\n');

/* ── 四条判据的分子分母 + p 值 ──────────────────────────────────────────
 * 任务书要求「产物与原型在四条判据上的分子分母百分比，以及 A、B 两条的 p 值」。
 * C/D 也给 p 值 —— 成本是几行代码，而不给的话读表的人无法判断该不该当回事。 */
console.log('━━ 四条判据：产物 vs 原型 ━━\n');
console.log('判据                                   产物            原型          Fisher 双侧 p');
console.log('─'.repeat(88));
for (const j of JUDGES) {
  const a = results[j.id].bad.length, na = artifacts.length;
  const b = results[j.id].protoBad.length, nb = prototypes.length;
  const p = fisher2(a, na - a, b, nb - b);
  const pTxt = p < 1e-4 ? p.toExponential(2) : p.toFixed(4);
  console.log(
    `${j.id} ${j.label.padEnd(35)} ${String(a).padStart(2)}/${na} = ${pct(a, na).padStart(4)}` +
    `   ${String(b).padStart(2)}/${nb} = ${pct(b, nb).padStart(4)}` +
    `        p = ${pTxt}`);
}
console.log('─'.repeat(88));
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
console.log(`  ① 正对照：判据 A 在 ${prototypes.length} 份原型（手工合格样品）上误报 ${protoFailsA} 份` +
  (protoFailsA === 0 ? ' —— 合格样品不被冤枉。' : ` —— ⚠️ 误报 ${protoFailsA} 份，判据有问题，先别读上面的数。`));
if (protoFailsA !== 0) console.log(`     误报的案：${results.A.protoBad.map((r) => r.id).join(' ')}`);
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
