// 两条数据链的关系闸门：记录差异，不是消除差异
//
// 为什么需要它
// ────────────
// 这个仓库有两条独立数据链描述同一批设计事实：
//
//   规格文本 _specs/*.md ─→ collect-schemes.mjs ─→ data.js ─→ 选型台 UI（用户**看**这个）
//   style.css 的 :root   ─→ clean-dna.mjs      ─→ prompts.js → 提示词（用户**拿**这个）
//
// 2026-10-30 实测确认它们**不该相等**，但**关系必须成立**：
//
//   · data.js     = 规格字段 3 声明的 4 个主色（面积和 100），忠实转录设计意图
//   · prompts.js  = data.js 的 4 色 + 从 :root 补的 0–4 个派生色 = 4–7 色
//                   补的 52 个里 51 个不在规格，但逐个查 CSS 注释后几乎全是必需的
//                   （次级墨、悬停态、暗部、AA 字色、结构线）
//
// 所以本闸门**不查相等**，查的是四条关系：
//
//   R1  data.js ⊆ prompts.js            —— data.js 不能有 prompts 没有的色（否则是漏抽）
//   R2  palette[0] === bg               —— app.js:953 的"底色"标签依赖它
//   R3  palette[1] === primary          —— app.js:945 的"主色"标签依赖它
//   R4  底色与主色都在 palette 里        —— 摘要不能丢主信息
//
// 外加一条软断言：
//
//   R5  prompts.js 补的色应当有 CSS 角色注释 —— 无注释的可能是真扩张（WARN）
//
// 历史教训：这个仓库连续两轮踩过「生成物无守卫」——
//   69 轮 `_selection/.inspect/report.json` 冻结 6 天 → 闸门谎报 FAIL 0
//   70 轮 `_prompts/dna-raw.json` 落后 3.5 天 → 生成链 2/3 不可复现
// 本闸门是第三类：不是查陈旧，是查**两条链的关系**。
//
// 用法：
//   node prototypes/_build/check-twolines.mjs [--quiet] [--json]
//   退出码 0 = 关系全部成立；1 = 有破坏

import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const P = join(ROOT, 'prototypes');
const SEL = join(P, '_selection');

const argv = process.argv.slice(2);
const QUIET = argv.includes('--quiet');
const JSON_OUT = argv.includes('--json');

/* ── 求值两个生成物 ──────────────────────────────────────────────────────
 * 它们都是 `window.XXX = ...` 形式的普通脚本，不是 ES 模块。
 * 用 Function 包一层在沙箱里求值，不引 jsdom。
 * data.js 可能引用 DOM（它同时含 UI 数据），失败时退化为正则抽取。
 */
function evalWindow(file) {
  const src = readFileSync(file, 'utf8');
  const sb = { window: {}, console: { warn() {}, log() {}, error() {} } };
  sb.window = sb;
  // 给可能被引用的浏览器全局加 stub
  sb.document = {
    createElement: () => ({ style: {}, classList: { add() {}, remove() {} }, setAttribute() {}, appendChild() {} }),
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener() {},
  };
  sb.navigator = { clipboard: { writeText: async () => {} } };
  try {
    new Function('window', 'document', 'navigator', src)(sb, sb.document, sb.navigator);
  } catch {
    /* 求值失败时 sb 里可能已经有部分赋值，继续用 */
  }
  return sb;
}

const dataWin = evalWindow(join(SEL, 'data.js'));
const promptsWin = evalWindow(join(SEL, 'prompts.js'));

const SCHEMES = dataWin.SCHEMES || dataWin.window?.SCHEMES || [];
const PSP = promptsWin.STYLE_PROMPTS?.schemes || promptsWin.window?.STYLE_PROMPTS?.schemes || [];

if (!SCHEMES.length) {
  console.error('✗ 无法读取 data.js 的 window.SCHEMES');
  process.exit(1);
}
if (!PSP.length) {
  console.error('✗ 无法读取 prompts.js 的 window.STYLE_PROMPTS.schemes');
  process.exit(1);
}

const HEXT = /#([0-9a-fA-F]{6})(?![0-9a-fA-F])/g;
const hexes = (s) => [...new Set([...String(s).matchAll(HEXT)].map((m) => m[0].toUpperCase()))];
const asHexList = (v) => (Array.isArray(v) ? v : String(v || '').split(/[、,，]/)).flatMap((x) => hexes(x));

const dM = new Map(SCHEMES.map((s) => [s.id, s]));
const pM = new Map(PSP.map((s) => [s.id, s]));

/* 从规格字段 3 解析「主色」——这是 R6 的权威来源。
 *
 * 为什么要切分句而不是取第一个 hex：字段 3 的写法是
 *   「主色 `#4FA83D` 漆面绿＝主色与读数，18%；背景色 `#0E100D` 铁皮底，58%；…」
 * 主色不一定排第一句。而且后面还有「反的是 `#6366F1` 靛蓝主色」这种**否定语境**，
 * 直接找含「主色」的句子会抓到禁色。
 *
 * 批判 Agent 实测过：单纯调换正则顺序（A/B）会把正确率从 25/30 打到 16/30，
 * 因为 B 会命中否定语境。分句法才是 30/30。
 */
const NEG_CTX = /(反的是|反\s|不采用|修正前|不是|禁止|不新增|旧值|避免|不用)/;
function specPrimaryOf(id) {
  const p = join(P, '_specs', id + '.md');
  if (!existsSync(p)) return null;
  const md = readFileSync(p, 'utf8');
  const lines = md.split(/\r?\n/);
  const i = lines.findIndex((l) => /配色系统/.test(l));
  if (i < 0) return null;
  const buf = [lines[i]];
  for (let j = i + 1; j < lines.length; j++) {
    if (/^\*{0,2}4[\.．]?\s/.test(lines[j].trim())) break;
    buf.push(lines[j]);
  }
  for (const seg of buf.join('\n').split(/[；。\n]/)) {
    if (!/主色/.test(seg)) continue;
    if (NEG_CTX.test(seg)) continue;
    const m = seg.match(/#([0-9a-fA-F]{6})(?![0-9a-fA-F])/);
    if (m) return m[0].toUpperCase();
  }
  return null;
}

/* ── 检查 ──────────────────────────────────────────────────────────────── */
const findings = [];
const add = (level, id, rule, msg) => findings.push({ level, id, rule, msg });

const stats = {
  cases: SCHEMES.length,
  subsetOk: 0,
  r6Ok: 0,
  r7Ok: 0,
  r8Ok: 0,
  extraWithRole: 0,
  extraWithoutRole: 0,
  fail: 0,
  warn: 0,
  info: 0,
};

const extraNoRole = [];
const unnamedPal = [];

for (const id of [...dM.keys()].sort()) {
  const sc = dM.get(id);
  const ps = pM.get(id);
  if (!ps) { add('FAIL', id, 'missing-in-prompts', 'prompts.js 里没有这一案'); continue; }

  const dPal = asHexList(sc.palette || []);
  const pPal = asHexList(ps.dna?.palette || '');

  /* R1: data.js ⊆ prompts.js */
  const dataOnly = dPal.filter((h) => !pPal.includes(h));
  if (dataOnly.length) {
    add('FAIL', id, 'R1-not-subset',
      `data.js 有 ${dataOnly.length} 个色不在 prompts.js 里: ${dataOnly.join(' ')}` +
      `（提示词漏了这些色，AI 就不知道页面要用它们）`);
  } else stats.subsetOk++;

  /* R8（硬，2026-10-31 新增）：data.js 必须有非空的 fontsSpec
   *
   * 为什么需要 —— 锐评 Agent 的实测：把 data.js 的 30 处 `fontsSpec` 全退回
   * `fonts`（模拟"改名没做完"），**六个检查器全绿、exit 全 0**。
   * 那个改名当时零测试保护：`prompt-copy.js` 的 `for-key-in` 泛化扫描会把它
   * 当普通字符串带走，`check-prompts` 只看提示词正文，没有任何一条断言读这个键名。
   *
   * 更糟的是 `field()` 的 `if (!val) return ''` 让 undefined 与空串**输出相同**，
   * 所以「那一段静默消失」在页面上表现为"少一段"，不报错、不变红。
   *
   * 判据用「键存在且非空」而不是「键名等于 fontsSpec」：
   * 前者能抓「改名没做完」（键变回 fonts，fontsSpec 为 undefined），
   * 后者只是把常量再写一遍，改错了也不知道。 */
  const fs = sc.fontsSpec;
  if (typeof fs !== 'string' || !fs.trim()) {
    add('FAIL', id, 'R8-fontsSpec-missing',
      `data.js 的 \`fontsSpec\` ${typeof fs === 'string' ? '是空串' : '缺失（undefined）'}` +
      `—— 生成器改名没做完，或 collect-schemes.mjs 的赋值行被删。` +
      `后果：app.js 的搜索少索引一个字段、详情面板「字体策略」整段消失，且两者都不报错。`);
  } else stats.r8Ok++;

  /* ── R2/R3/R4 已删除（2026-10-30）────────────────────────────────────
   *
   * 它们原来是：
   *   R2  palette[0] === bg          → 30/30 绿
   *   R3  palette[1] === primary     → 30/30 绿
   *   R4  底色与主色都在 palette 里   → 30/30 绿
   *
   * 为什么删：**它们是构造恒真式，测不出任何东西。**
   * 看 `collect-schemes.mjs:483-486`：
   *
   *     const pal = [];
   *     if (rec.bg) pal.push(rec.bg);                    ← palette[0] 就是 bg
   *     if (rec.primary && ...) pal.push(rec.primary);    ← palette[1] 就是 primary
   *     for (const h of fromSpec) { if (pal.length >= 4) break; ... }
   *     rec.palette = pal;
   *
   * 先 push(bg) 再 push(primary)，所以 R2/R3 永远成立。R4 同理。
   * 批判 Agent 做了变异测试：注入一个「一致的错」（palette[1] 与 primary
   * 同时改成 #123456）→ R2/R3/R4 **全绿**。三个断言一起漏掉同一个错误。
   *
   * 真正该查的不是「数组位置对不对」，而是「**这个位置上的色，角色对不对**」。
   * 见下面的 R6。
   */

  /* R6（硬，替换 R2/R3/R4）：UI 印出来的「主色」必须是规格声明的主色
   *
   * 为什么需要：`app.js:963` 用 `palette[1]` 印「主色」标签给用户看。
   * 而 `collect-schemes.mjs:293-298` 抽 `primary` 时是三个正则并联，
   * 谁的先命中就赢 —— 实测有 5 案抽到了非主色的色：
   *
   *   S05  UI 印 #BFB9A6 面板灰米，规格写「#4FA83D 漆面绿＝主色与读数」
   *   S10  UI 印 #6E7076，而那是全案面积最小的色（5%）
   *   S02 / S07 / S09 同类
   *
   * 用户看到「主色：#BFB9A6」会以为这个设计的主色是灰米色，而实际是亮漆绿。
   * **集合相同、角色标错，用户看到的是两个设计。**
   *
   * 判据：从规格字段 3 里切分句，取含「主色」且不在否定语境的分句的第一个 hex。
   * 这是「解析角色词」，不是「按位置猜」。
   */
  const specPri = specPrimaryOf(id);
  if (specPri) {
    const uiPri = String(sc.primary || '').toUpperCase();
    if (uiPri && uiPri !== specPri) {
      add('FAIL', id, 'R6-primary-mismatch',
        `UI 印「主色 ${uiPri}」，但规格字段 3 写的主色是 ${specPri}` +
        `（app.js:963 会把 ${uiPri} 标成「主色」给用户看）`);
    } else if (uiPri) stats.r6Ok++;
  }

  /* R7（硬）：提示词的调色板条目是否带角色名
   *
   * 为什么必须管：调色板条目形如 `#C1121F（red）`，括号里那个词是 AI 判断
   * 「哪个色当底、哪个当主」的**唯一依据**。色值本身不带语义 —— 同一组 5 个色，
   * 标成「主色在前」和完全不标，AI 会做出两个不同的站。
   *
   * 实测（2026-10-30）：S14 的 6 个条目**全部没有角色名**，且它的主色排在
   * 第 4 位、首位是规格里根本没有的 HUD 文字色。根因是 `pickPalette` 靠
   * `:root` 变量名提供角色语义，而 S14 整个文件没有 `:root`。
   *
   * 判据：每个条目必须是「#RRGGBB + 至少一个字母/汉字」。纯 hex 一律算失败。
   * 这是**关系断言**（色值 ↔ 角色），不是「两边相等」——所以它不会变成恒真式：
   * 角色名来自另一套数据（规格字段 3 的原文 / CSS 的 color: 用法计数）。
   */
  const palItems = String(ps.dna?.palette || '').split(/[、,，]/).map((x) => x.trim()).filter(Boolean);
  const bare = palItems.filter((it) => {
    const withoutHex = it.replace(/#[0-9A-Fa-f]{6}/g, '').replace(/[（）()\s、,，]/g, '');
    return !/[A-Za-z\u4e00-\u9fa5]/.test(withoutHex);
  });
  if (bare.length) {
    unnamedPal.push({ id, list: bare });
    add('FAIL', id, 'R7-palette-no-role',
      `调色板有 ${bare.length}/${palItems.length} 个条目没有角色名: ${bare.join(' ')}` +
      `（AI 无法判断这些色的用途，只能猜）`);
  } else stats.r7Ok++;

  /* R5（软，降级为 INFO）：prompts.js 补出来的色有没有 CSS 角色注释
   *
   * 批判 Agent 指出这条与"色该不该进提示词"没有因果关系：
   * 19 个报警里含占屏 20% 的必需色（无注释 ≠ 不该进）。降为 INFO，不参与退出码。 */
  const extra = pPal.filter((h) => !dPal.includes(h));
  if (extra.length) {
    const dir = SCHEMES.find((s) => s.id === id)?.dir || '';
    let roles = new Map();
    if (dir) {
      const cssPath = join(P, dir, 'style.css');
      if (existsSync(cssPath)) {
        const css = readFileSync(cssPath, 'utf8');
        const rootM = css.match(/:root\s*\{([\s\S]*?)\}/);
        if (rootM) {
          for (const line of rootM[1].split(/\r?\n/)) {
            const d = line.match(/(--[\w-]+)\s*:\s*([^;]+);(.*)$/);
            if (!d) continue;
            const hx = (d[2].match(/#[0-9A-Fa-f]{6}/) || [])[0];
            if (!hx) continue;
            const comment = (d[3] || '').replace(/^[\s]*\/\*|\*\/[\s]*$/g, '').trim();
            roles.set(hx.toUpperCase(), { name: d[1], comment });
          }
        }
      }
    }
    const noRole = extra.filter((h) => {
      const r = roles.get(h);
      return !r || !r.comment;
    });
    stats.extraWithRole += extra.length - noRole.length;
    stats.extraWithoutRole += noRole.length;
    if (noRole.length) extraNoRole.push({ id, list: noRole });
  }
}

if (extraNoRole.length) {
  const total = extraNoRole.reduce((a, x) => a + x.list.length, 0);
  /* 降为 INFO（2026-10-30）。批判 Agent 指出这条判据与"色该不该进提示词"没有因果：
   * 19 个报警里含占屏 20% 的必需色 —— 没写注释 ≠ 不该进色板。
   * 它是有用的排查线索，但不该影响退出码。 */
  add('INFO', '*', 'R5-extra-no-role',
    `prompts.js 补了 ${total} 个没有 CSS 角色注释的色（排查线索，非缺陷；无注释 ≠ 不该进）: ` +
    extraNoRole.slice(0, 6).map((x) => `${x.id}[${x.list.join(' ')}]`).join(' ') +
    (extraNoRole.length > 6 ? ` … 其余 ${extraNoRole.length - 6} 案` : ''));
}

/* 覆盖检查 */
if (SCHEMES.length !== 30) add('FAIL', '*', 'coverage', `data.js 只有 ${SCHEMES.length} 案，应为 30`);
if (PSP.length !== 30) add('FAIL', '*', 'coverage', `prompts.js 只有 ${PSP.length} 案，应为 30`);

/* ── 输出 ──────────────────────────────────────────────────────────────── */
const FAILS = findings.filter((f) => f.level === 'FAIL');
const WARNS = findings.filter((f) => f.level === 'WARN');
stats.fail = FAILS.length;
stats.warn = WARNS.length;

if (JSON_OUT) {
  console.log(JSON.stringify({ stats, findings }, null, 2));
} else {
  console.log(`两链关系闸门：data.js(${SCHEMES.length} 案) ↔ prompts.js(${PSP.length} 案)`);
  console.log('  查的是「关系成立」，不是「两边相等」——它们描述设计意图 vs 施工细节两个层次');
  console.log('');
  console.log(`  R1 data.js ⊆ prompts.js           ${stats.subsetOk}/${SCHEMES.length}`);
  console.log(`  R6 UI 的「主色」= 规格声明的主色   ${stats.r6Ok}/${SCHEMES.length}   ← 替换已删除的 R2/R3/R4（恒真式）`);
  console.log(`  R7 调色板条目都带角色名            ${stats.r7Ok}/${SCHEMES.length}   ← 色值不带语义，角色名是 AI 的唯一依据`);
  console.log(`  R8 data.js 的 fontsSpec 非空       ${stats.r8Ok}/${SCHEMES.length}   ← 抓「改名没做完/赋值行被删」，否则搜索与详情面板静默缺一段`);
  console.log(`  R5 补色有 CSS 角色注释（INFO）     ${stats.extraWithRole}/${stats.extraWithRole + stats.extraWithoutRole}`);
  console.log('');

  if (!QUIET || FAILS.length) {
    const byRule = new Map();
    for (const f of findings) {
      const k = `${f.level}|${f.rule}`;
      if (!byRule.has(k)) byRule.set(k, []);
      byRule.get(k).push(f);
    }
    for (const [k, list] of [...byRule.entries()].sort()) {
      const [level, rule] = k.split('|');
      if (QUIET && level !== 'FAIL') continue;
      const mark = level === 'FAIL' ? '✗' : level === 'WARN' ? '~' : '·';
      console.log(`${mark} [${rule}] ${list.length} 条`);
      for (const f of list.slice(0, QUIET ? 3 : 20)) console.log(`    ${f.id}  ${f.msg}`);
      if (list.length > (QUIET ? 3 : 20)) console.log(`    … 其余 ${list.length - (QUIET ? 3 : 20)} 条同规则`);
    }
    console.log('');
  }

  console.log(`合计 FAIL ${stats.fail} / WARN ${stats.warn}`);
}

process.exit(FAILS.length ? 1 : 0);
