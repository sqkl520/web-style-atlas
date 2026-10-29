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

/* ── 检查 ──────────────────────────────────────────────────────────────── */
const findings = [];
const add = (level, id, rule, msg) => findings.push({ level, id, rule, msg });

const stats = {
  cases: SCHEMES.length,
  subsetOk: 0,
  p0Ok: 0,
  p1Ok: 0,
  mainOk: 0,
  extraWithRole: 0,
  extraWithoutRole: 0,
  fail: 0,
  warn: 0,
  info: 0,
};

const extraNoRole = [];

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

  /* R2: palette[0] === bg */
  const bg = String(sc.bg || '').toUpperCase();
  if (dPal[0] && bg && dPal[0] !== bg) {
    add('FAIL', id, 'R2-p0-not-bg', `palette[0]=${dPal[0]} 但 bg=${bg}（app.js:953 的「底色」标签会标错）`);
  } else if (dPal[0] && bg) stats.p0Ok++;

  /* R3: palette[1] === primary */
  const pri = String(sc.primary || '').toUpperCase();
  if (dPal[1] && pri && dPal[1] !== pri) {
    add('FAIL', id, 'R3-p1-not-primary', `palette[1]=${dPal[1]} 但 primary=${pri}（app.js:945 的「主色」标签会标错）`);
  } else if (dPal[1] && pri) stats.p1Ok++;

  /* R4: 底色与主色都在 palette 里 */
  const missingMain = [];
  if (bg && !dPal.includes(bg)) missingMain.push(`底色 ${bg}`);
  if (pri && !dPal.includes(pri)) missingMain.push(`主色 ${pri}`);
  if (missingMain.length) add('FAIL', id, 'R4-main-missing', `palette 里没有${missingMain.join(' 和 ')}`);
  else stats.mainOk++;

  /* R5（软）: prompts.js 补出来的色有没有 CSS 角色注释 */
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
  add('WARN', '*', 'R5-extra-no-role',
    `prompts.js 补了 ${total} 个没有 CSS 角色注释的色（无注释 = 可能是设计扩张而非必需派生）: ` +
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
  console.log(`  R1 data.js ⊆ prompts.js      ${stats.subsetOk}/${SCHEMES.length}`);
  console.log(`  R2 palette[0] === bg         ${stats.p0Ok}/${SCHEMES.length}`);
  console.log(`  R3 palette[1] === primary    ${stats.p1Ok}/${SCHEMES.length}`);
  console.log(`  R4 底色与主色都在 palette    ${stats.mainOk}/${SCHEMES.length}`);
  console.log(`  R5 补色有 CSS 角色注释       ${stats.extraWithRole}/${stats.extraWithRole + stats.extraWithoutRole}`);
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
