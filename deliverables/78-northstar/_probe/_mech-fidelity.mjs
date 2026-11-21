#!/usr/bin/env node
/* 机制保真度：提示词机制句里的数值，在盲测产物里到底实现了没有？
 *
 * 【为什么需要它】
 *
 * `score.mjs` 的五类判据查配色/字体/几何/结构/禁项 —— **没有一类查机制**。
 * 实测 S13 的两份产物（新线 ACP vs 旧线沙箱）在五类上全过，
 * 但机制层 5/8 vs 8/8：新线丢了 `0.4mm`、`3%`、`14.5px` 三个全是机制量的值。
 * 详见 `_probe/79-measurement-layer-audit.md` §十。
 *
 * 机制句是"这个风格区别于同类"的唯一载体。配色/字体/圆角回答"像不像一个体面的页面"，
 * 机制回答"像不像**这一个**样板"。没有这一层，绿闸门分不出 5/8 和 8/8。
 *
 * 【三态，不是二态】
 *
 * 一个数值在产物里"没出现"有几种不同的含义，不能合并：
 *
 *   hit        —— 出现在会改变渲染的 CSS 声明里                     ✓
 *   script     —— 只出现在 <script> 里（JS 算出来的量，不是声明）    ~
 *   comment    —— 只在注释里（推导值，没有声明佐证）                  ~
 *   absent     —— 哪里都没有                                         ✗
 *
 * 这个分层是照抄 `check-prompts.mjs:1197-1203` 已有的做法 ——
 * 那里对**原型**做同样的事，把 comment / script 降成 WARN 而不是 FAIL。
 * 产物也应该用同一把尺。
 *
 * 【单位换算：只对 mm 做，且只做单向】
 *
 * `0.4mm` 在浏览器里约等于 1.51px（96dpi）。AI 完全可能写成 `1.5px`，
 * 那是**正确实现**而不是缺失。所以 mm → px 要认。
 * 但 deg / fr / % 不做换算 —— 它们没有通用等价，硬换会制造假阳性。
 * 这条限制写在结果里，免得被当成"全都能换"。
 *
 * 用法：
 *   node _mech-fidelity.mjs            # 所有已跑案
 *   node _mech-fidelity.mjs S21        # 单案
 *   node _mech-fidelity.mjs --selftest
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';

const ROOT = decodeURIComponent(new URL('../../../', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const BT = ROOT + '/deliverables/78-northstar/_blindtest';
const P = {};
new Function('window', readFileSync(ROOT + '/prototypes/_selection/prompts.js', 'utf8'))(P);

/* 抓机制句里的数值 token。单位表与 check-prompts 保持一致，另加 deg/fr。
 *
 * ⚠️ 不能用 `\b` 收尾 —— 这是个真踩过的坑。
 * `\b` 在 `%` 与空格之间不成立（`%` 是非词字符，空格也是，两者之间没有边界），
 * 于是 `1%` / `3%` / `5.5%` 全部抓不到。实测 S34 的机制句
 * 「左缩进分 0/3/5.5/2/7/4/1% 七档」只被抓到 `72px` 一个值，
 * 而它真正的核心是那七个百分比。
 *
 * 改成用「前面不是数字或小数点」+「后面不是字母数字」来界定边界，
 * 并且允许 `%` 结尾（它天然不在 `\w` 里）。 */
const NUM_RE = /(?<![\d.])\d+(?:\.\d+)?(?:px|deg|fr|mm|%)(?![\w%])/g;

/* mm → px（96dpi）。只此一种换算，理由见文件头。 */
function equivalents(tok) {
  const out = [tok];
  const m = tok.match(/^(\d+(?:\.\d+)?)mm$/);
  if (m) {
    const px = Number(m[1]) * 96 / 25.4;
    /* 允许 ±0.1px 的写法差异，把 1.51 与 1.5 都列上 */
    for (const v of [px, Math.round(px * 10) / 10, Math.round(px)]) {
      out.push(String(Number(v.toFixed(2))) + 'px');
    }
  }
  return out;
}

/* 把产物切三段：CSS 声明体 / <script> 体 / 注释。注释要先从 CSS 里剔除，
 * 否则"只在注释里出现"会被误判成"实现了"。
 *
 * ⚠️ 2026-11-21 大改：第一版用 `decl.includes(tok)` 做字面比对，
 * 于是 `opacity: .14` 不算实现了机制句里的 `14%`、`0.5px` 也不认 `stroke-width: .5`。
 * 实测 S07 因此被报「缺 14%、0.5px」，而原型里写的是 `opacity: min(.14, …)` 与 SVG 描边宽度。
 *
 * **仓库里早就有正确的做法**：`check-prompts.mjs` 的 `mechSourceNumbers()`
 * 把 px/mm/stroke-width/r/rx/ry/百分比/opacity 都归一成数值集合再比对。
 * 我另写一套字面匹配，等于把别人踩过的坑重踩一遍。
 * 下面直接照抄那一套的口径（不 import，因为它在 check-prompts 内部没导出）。
 */
function declaredNumbers(text) {
  const len = new Set();
  const pct = new Set();
  const push = (v) => { const n = Number(v); if (Number.isFinite(n)) len.add(n.toFixed(2)); };
  for (const m of text.matchAll(/(?<![\w-])(\d*\.?\d+)\s*(px|mm)(?![\w])/g)) push(m[1]);
  for (const m of text.matchAll(/stroke-width\s*[:=]\s*["']?(\d*\.?\d+)/g)) push(m[1]);
  for (const m of text.matchAll(/\b(?:r|rx|ry)\s*[:=]\s*["'](\d*\.?\d+)["']/g)) push(m[1]);
  for (const m of text.matchAll(/(\d*\.?\d+)\s*%/g)) {
    const n = Number(m[1]); if (Number.isFinite(n)) pct.add(n.toFixed(2));
  }
  /* opacity 归一：`opacity: .14` 与 `opacity: min(.14, …)` 两种都认。
   * S07 的「8% 至 14%」正是后者。 */
  for (const m of text.matchAll(/opacity\s*:\s*[^;{}]*?(\d*\.\d+)/g)) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > 0 && n <= 1) pct.add((n * 100).toFixed(2));
  }
  for (const m of text.matchAll(/opacity\s*=\s*["']?(\d*\.\d+)/g)) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > 0 && n <= 1) pct.add((n * 100).toFixed(2));
  }
  return { len, pct };
}

function splitArtifact(html) {
  const style = (html.match(/<style[^>]*>([\s\S]*?)<\/style>/i) || ['', ''])[1] || '';
  const script = (html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || []).join('\n');
  const comments = (html.match(/\/\*[\s\S]*?\*\//g) || []).join('\n');
  /* 声明坐标系：去掉注释与 <script>，剩下的才是"真的在渲染"。
   * 内联 style 属性也算声明。 */
  const decl = style.replace(/\/\*[\s\S]*?\*\//g, ' ') + '\n' +
    (html.match(/style="[^"]*"/g) || []).join('\n') + '\n' +
    (html.match(/<(?:rect|circle|line|path|svg)\b[^>]*>/g) || []).join('\n');
  return { decl, script, comments };
}

function judge(mechanism, html) {
  const { decl, script, comments } = splitArtifact(html);
  const D = declaredNumbers(decl);
  const S = declaredNumbers(script);
  const C = declaredNumbers(comments);
  const toks = [...new Set(mechanism.match(NUM_RE) || [])];
  const rows = [];
  for (const tok of toks) {
    const m = tok.match(/^([\d.]+)(px|deg|fr|mm|%)$/);
    if (!m) { rows.push({ tok, state: 'absent' }); continue; }
    const num = Number(m[1]);
    const isPct = m[2] === '%';
    /* mm 先换算成 px 再比（0.4mm ≈ 1.51px）；deg/fr 没有通用等价，不做换算。 */
    const vals = [num];
    if (m[2] === 'mm') {
      const px = num * 96 / 25.4;
      vals.push(Math.round(px * 10) / 10, Math.round(px));
    }
    const inSet = (set) => vals.some((v) => set.has(Number(v).toFixed(2)));
    /* 百分比只跟百分比集合比；长度只跟长度集合比 —— 单位不能串 */
    const state = (isPct ? inSet(D.pct) : inSet(D.len)) ? 'hit'
      : (isPct ? inSet(S.pct) : inSet(S.len)) ? 'script'
      : (isPct ? inSet(C.pct) : inSet(C.len)) ? 'comment'
      : 'absent';
    rows.push({ tok, state });
  }
  const hit = rows.filter((r) => r.state === 'hit').length;
  const soft = rows.filter((r) => r.state === 'script' || r.state === 'comment').length;
  return { rows, hit, soft, absent: rows.filter((r) => r.state === 'absent').length, total: rows.length };
}

function selfTest() {
  const S = [];
  const eq = (n, g, w) => S.push([n, JSON.stringify(g) === JSON.stringify(w), g, w]);
  /* 完整 token 匹配：60px 不能被 160px 命中 */
  const j1 = judge('60px', '<style>.a{border:160px solid}</style>');
  eq('子串不算命中', j1.hit, 0);
  const j2 = judge('60px', '<style>.a{border:60px solid}</style>');
  eq('完整 token 命中', j2.hit, 1);
  /* 只在 script 里 → script 态，不是 hit */
  const j3 = judge('1.5px', '<style>.a{color:red}</style><script>var h=1.5px</script>');
  eq('只在 script 里记 script 态', j3.rows[0].state, 'script');
  /* 只在注释里 → comment 态 */
  const j4 = judge('14px', '<style>/* 14px */ .a{color:red}</style>');
  eq('只在注释里记 comment 态', j4.rows[0].state, 'comment');
  /* mm → px 换算：0.4mm ≈ 1.51px，写成 1.5px 算实现 */
  const j5 = judge('0.4mm', '<style>.a{box-shadow:inset 0 0 0 1.5px #000}</style>');
  eq('mm 换算后命中', j5.hit, 1);
  eq('mm 保留了原 token', j5.rows[0].tok, '0.4mm');
  /* 完全没有 → absent */
  const j6 = judge('7px', '<style>.a{color:red}</style>');
  eq('完全没有记 absent', j6.rows[0].state, 'absent');
  /* 变异：同一个输入两次结果必须一致 */
  eq('幂等', JSON.stringify(judge('12px 34%', '<style>.a{width:12px}</style>')),
    JSON.stringify(judge('12px 34%', '<style>.a{width:12px}</style>')));
  /* ⚠️ 百分比必须能抓到 —— 用 `\b` 收尾时 `34%` 会漏。
   * 实测 S34 的机制句写的是「0/3/5.5/2/7/4/1%」这种**省略写法**：
   * 只有最后一个带单位，前面的裸数字在原句里就是百分比。
   * 那六个裸数字本判据抓不到，是**数据写法**的问题，不是正则的 ——
   * 所以这里的用例只断言"带 % 的能抓到"，不假装能还原省略写法。 */
  eq('带百分号的值能抓到', judge('缩进分 1% 与 7%', '<style></style>').rows.map((r) => r.tok), ['1%', '7%']);
  eq('px 与百分数能共存', judge('72px 与 1%', '<style></style>').rows.length, 2);
  /* 记录这条局限：斜杠省略写法会少算。S34 的七个缩进档只数到 1 个。 */
  eq('斜杠省略写法只抓到带单位的那一个',
    judge('0/3/5.5/2/7/4/1%', '<style></style>').rows.map((r) => r.tok), ['1%']);
  /* ⚠️ 归一化：`14%` 写成 `opacity: .14` 必须认。
   * 实测 S07 的「8% 至 14%」在 style.css 里就是 `opacity: min(.14, calc(...))`，
   * 第一版字面匹配把它判成缺失 —— 那是判据的错，不是实现的错。 */
  eq('opacity .14 认作 14%',
    judge('亮度差 14%', '<style>.a{opacity:.14}</style>').rows[0].state, 'hit');
  eq('opacity: min(.14,…) 也认',
    judge('亮度差 14%', '<style>.a{opacity:min(.14,calc(1 - .2))}</style>').rows[0].state, 'hit');
  /* SVG 描边宽度归一：`stroke-width: .5` 认作 0.5px */
  eq('stroke-width .5 认作 0.5px',
    judge('栏线 0.5px', '<svg><line stroke-width="0.5"/></svg>').rows[0].state, 'hit');
  /* 单位不能串：14% 不能被 14px 满足 */
  eq('百分比与长度不串',
    judge('亮度差 14%', '<style>.a{width:14px}</style>').rows[0].state, 'absent');
  const bad = S.filter(([, ok]) => !ok);
  for (const [n, ok, g, w] of S) {
    console.log(`  ${ok ? '✓' : '✗'} ${n}`);
    if (!ok) console.log(`      实得 ${JSON.stringify(g)}，期望 ${JSON.stringify(w)}`);
  }
  console.log(`\n自测：${S.length - bad.length}/${S.length} 通过`);
  return bad.length === 0;
}

if (process.argv.includes('--selftest')) {
  console.log('=== 机制保真度自测 ===');
  process.exit(selfTest() ? 0 : 1);
}

const arg = process.argv[2];
const ids = arg && /^S\d/.test(arg)
  ? [arg]
  : readdirSync(BT, { withFileTypes: true }).filter((d) => d.isDirectory() && /^S\d/.test(d.name)).map((d) => d.name).sort();

console.log('机制保真度：提示词机制句里的数值，产物里实现了几个？\n');
let totHit = 0, totSoft = 0, totAbs = 0, totAll = 0;
for (const id of ids) {
  const dir = `${BT}/${id}`;
  const htmlPath = ['index.html', 'out.html'].map((f) => `${dir}/${f}`).find((f) => existsSync(f));
  if (!htmlPath) continue;
  /* S34-r2 这种带后缀的案号，数据要回退到前两位 */
  const base = id.match(/^S\d{2}/)[0];
  const sp = P.STYLE_PROMPTS.schemes.find((x) => x.id === base);
  if (!sp || !sp.dna || !sp.dna.mechanism) continue;
  const r = judge(sp.dna.mechanism, readFileSync(htmlPath, 'utf8'));
  totHit += r.hit; totSoft += r.soft; totAbs += r.absent; totAll += r.total;
  const mark = r.absent === 0 ? '✓' : r.absent <= 1 ? '~' : '✗';
  console.log(`  ${mark} ${id.padEnd(8)} 命中 ${r.hit}/${r.total}　软 ${r.soft}　缺 ${r.absent}`);
  for (const row of r.rows) {
    if (row.state === 'hit') continue;
    const tag = row.state === 'script' ? '（只在 script 里）' : row.state === 'comment' ? '（只在注释里）' : '';
    console.log(`        ${row.tok.padEnd(8)} ${row.state}${tag}`);
  }
}
console.log('');
console.log(`合计：命中 ${totHit}/${totAll}　软 ${totSoft}　缺失 ${totAbs}`);

/* ── 缺失值的原型对照 ──────────────────────────────────────────────────
 *
 * 一个值在产物里缺席，有两种完全不同的含义：
 *
 *   · 原型**也**没有 → 机制句写了一个两头都没做到的要求。那是机制句的问题。
 *   · 原型**有**但产物没有 → 提示词没把它传过去，或 AI 没复刻。那才是产品的洞。
 *
 * 不区分这两者，这个数就只能说"缺了 N 个"，说不出缺的是谁的锅。
 * 所以每个缺席的值都回原型里查一次。 */
const W = {};
new Function('window', readFileSync(ROOT + '/prototypes/_selection/data.js', 'utf8'))(W);
console.log('');
console.log('缺失值的原型对照：');
let protoHas = 0, protoLacks = 0, protoSoft = 0;
for (const id of ids) {
  const dir = `${BT}/${id}`;
  const htmlPath = ['index.html', 'out.html'].map((f) => `${dir}/${f}`).find((f) => existsSync(f));
  if (!htmlPath) continue;
  const base = id.match(/^S\d{2}/)[0];
  const sp = P.STYLE_PROMPTS.schemes.find((x) => x.id === base);
  const sc = W.SCHEMES.find((x) => x.id === base);
  if (!sp || !sc || !sp.dna || !sp.dna.mechanism) continue;
  const r = judge(sp.dna.mechanism, readFileSync(htmlPath, 'utf8'));
  const missing = r.rows.filter((x) => x.state === 'absent').map((x) => x.tok);
  if (!missing.length) continue;
  const pdir = `${ROOT}/prototypes/${sc.dir}`;
  if (!existsSync(`${pdir}/index.html`)) continue;
  const proto = readFileSync(`${pdir}/index.html`, 'utf8') +
    (existsSync(`${pdir}/style.css`) ? readFileSync(`${pdir}/style.css`, 'utf8') : '');
  const pr = judge(sp.dna.mechanism, `<style>${proto}</style>`);
  const protoMap = Object.fromEntries(pr.rows.map((x) => [x.tok, x.state]));
  for (const tok of missing) {
    /* 原型侧的三态要保留，不能压成"有/没有"：
     * S13 的 `14%` 只出现在 style.css:13 的**排版规格注释**里
     * （`检查项/压深/亮度差/对比度` 那张表），实现里没有对应声明。
     * 把它归成"原型有"是错的（产物确实没法从实现里复刻它），
     * 归成"原型没有"也不对（原型确实写了这个量）。
     * 所以三种结论分开报。 */
    const st = protoMap[tok];
    if (st === 'hit') {
      protoHas++;
      console.log(`  ${id}  ${tok.padEnd(8)} 原型：✓ 有声明 → 是产物/提示词的洞`);
    } else if (st === 'script' || st === 'comment') {
      protoSoft++;
      console.log(`  ${id}  ${tok.padEnd(8)} 原型：~ 只在${st === 'comment' ? '注释' : '脚本'}里 → 本来就没有声明可复刻`);
    } else {
      protoLacks++;
      console.log(`  ${id}  ${tok.padEnd(8)} 原型：✗ 也没有 → 机制句写了两头都没做到的要求`);
    }
  }
}
if (!protoHas && !protoLacks && !protoSoft) console.log('  （没有缺失值）');
else {
  console.log('');
  if (protoHas) console.log(`  ${protoHas} 个原型有声明、产物没有 → 提示词没传过去或 AI 没复刻`);
  if (protoSoft) console.log(`  ${protoSoft} 个原型只在注释/脚本里 → 没有声明可复刻，机制句写了推导值`);
  if (protoLacks) console.log(`  ${protoLacks} 个原型也没有 → 机制句写了两头都没做到的要求`);
}
console.log('');
console.log('说明：');
console.log('  · 「软」= 只在 script 或注释里出现，不是 CSS 声明。原型侧同样的判定');
console.log('    在 check-prompts.mjs:1197-1203 里降成 WARN，这里保持一致。');
console.log('  · 数值归一化照抄 check-prompts.mjs 的 mechSourceNumbers()：');
console.log('    opacity .14 认作 14%、stroke-width .5 认作 0.5px、mm 换 px。');
console.log('    deg / fr 不换算 —— 没有通用等价，硬换会制造假阳性。');
console.log('  · 这一层 score.mjs 完全没有，所以它报"五类全过"时机制可能是缺的。');
