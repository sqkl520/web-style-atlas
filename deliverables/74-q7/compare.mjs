#!/usr/bin/env node
/* Q7 复刻验货的对账器：把 Agent 从提示词生成的作品，与原型逐量比对。
 *
 * 判读纪律（PROMPT-SYSTEM.md §6.3 定的）：
 *   FAIL 时要能回答「是提示词没写清楚，还是模型没听话」。
 *   做法：先看该量在提示词里有没有一句明确的指令。有指令而没做到 → 模型偏差；
 *   没有指令 → **这是提示词缺陷**，要回流到数据层，而不是记一笔就完。
 *
 * 用法：
 *   node deliverables/74-q7/compare.mjs                 # 默认三案 S03/S07/S17
 *   node deliverables/74-q7/compare.mjs S06,S14         # 任意案号
 *   node deliverables/74-q7/compare.mjs -v2             # 比另一个轮次的产物
 *   node deliverables/74-q7/compare.mjs --selftest      # 变异测试（判据真的会响吗）
 *
 * ── 2026-11-12 重写判据（A1）─────────────────────────────────────────────
 * 旧版 7 条判据里有 4 条**永远无法失败**，所以「S07 得 7/7」这个结论的分母是假的。
 * 逐条处理如下（详细理由各在各判据旁边，这里只给结论）：
 *
 *   · ①主体栏数 `ok:true` 写死   → 自校准后真判（提示词给了栏数、且尺子在原型上
 *     复现得出这个数，才判）。
 *   · ②主轴比例 只报不判         → 自校准后真判（同上口径）。
 *   · ④线宽集合(stroke) `ok:true` → **不改**：那条的理由（判实现手段 ≠ 判视觉结果）
 *     今天仍然成立，硬改会把正确实现判红（out-S17 就是 CSS 实现的）。改为另立一条
 *     「线宽档位合规」，判产物用到的每一级线宽是否都在提示词给的档位里 ——
 *     这才是那条判据真正想守的视觉约束。
 *   · ⑥图片位 只判 >0            → 改成 `got.imgVisible >= minPics`（读 minitems-parsed.json）。
 *   · ③标题/正文比 的 `null → PASS` → 改成 skip（无法判定不记通过）。
 *
 * 另加 ① 分栏结构（有无多栏版心）：旧版根本没有这一条，而 S14 那类「原型刻意不分栏」
 * 的案只有它能判。它带一道**landmark 差异守卫**，见该条注释 —— 没有守卫它会给出假 FAIL，
 * 这是实测出来的（S14 原型的两栏结构长在 <header> 里，被 measure 的 landmark 规则排除）。
 *
 * ⚠️ 贯穿全文件的原则：**「无法判定」不等于「成立」**（check-contract.mjs C0 的教训）。
 * 所以判据有三态 pass / fail / skip；skip 不计入分母，单独打印。
 * 分母只算真正跑过的判据 —— 这就是重写的目的：让「X/7」的分子分母都诚实。
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { measure } from './measure.mjs';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../..');
const Q7 = join(ROOT, 'deliverables/74-q7');
const SELFTEST = process.argv.includes('--selftest');

/* 原型路径从 data.js 的 dir 字段读，不手写 —— 手写会随目录改名而腐化，
 * 而这里要支持任意案号（`node compare.mjs -v2 S06,S14,...`）。 */
function dirOf(id, vm) {
  const src = readFileSync(join(ROOT, 'prototypes/_selection/data.js'), 'utf8');
  const c = { window: {} };
  vm.createContext(c);
  vm.runInContext(src, c);
  const s = c.window.SCHEMES.find((x) => x.id === id);
  return s ? s.dir : null;
}

/* 每案的 minPics（设计意图：必须放真图的槽位数）。
 *
 * 为什么从这里读、不拿原型的图片数当基准：提示词第 4 条写的是
 * 「版式里至少要 N 个不同的图片位置」，N 就来自这张表；拿原型的 12 张去要求产物，
 * 等于要求模型复刻它从未被告知的数字。这与 ⑦配色判据同一个道理。
 * 读法与 check-contract.mjs:120-137 同源（含 BOM 剥离）；缺该案时记 null
 * —— **不默认放行**（见 ⑧ 的处理）。 */
let minPicsById = {};
try {
  const mj = JSON.parse(readFileSync(join(ROOT, 'prototypes/_prompts/minitems-parsed.json'), 'utf8').replace(/^﻿/, ''));
  minPicsById = Object.fromEntries(mj.map((x) => [x.id, x.minPics]));
} catch { /* 读不到就全部退化成「无法判定」，不猜一个数出来 */ }

/* 默认三案（第一轮验证过的那三案）；命令行可传 `-v2 S06,S14` 之类。 */
const DEFAULT_IDS = ['S03', 'S07', 'S17'];
const idArg = process.argv.slice(2).find((a) => /^S\d{2}(,S\d{2})*$/.test(a));
const IDS = idArg ? idArg.split(',') : DEFAULT_IDS;
const PAIRS = IDS.map((id) => {
  const d = dirOf(id, vm);
  return { id, proto: d ? `prototypes/${d}/index.html` : null };
}).filter((p) => p.proto && existsSync(join(ROOT, p.proto)));

const fmt = (v) => Array.isArray(v) ? '[' + v.join(', ') + ']' : String(v);

/* ══ 从提示词里抽出「模型实际收到的约束」 ══════════════════════════════════
 *
 * 这一节是这次重写的关键。旧判据在两个方向上犯错：
 *   · 拿原型的全量去要求产物（配色那条已修过一轮，见 ⑦ 注释）；
 *   · 拿一把语义上不成立的尺子去判（栏数/比例被降级成只报不判）。
 *
 * 现在的做法：**只判提示词里写明的量**，且先用原型做一次「自校准」——
 * 如果度量器在原型（已知正确的页面）上量出的数与提示词说的数对不上，
 * 说明尺子不准（选错了容器 / 把中缝算成一栏），这时**跳过**，
 * 而不是拿不准的尺子去判产物。
 *
 * 自校准不是为了让判据好看，它有实测依据（2026-11-12，本机）：
 *   · S07 提示词写「正页 2 栏、背页 3 栏」，度量器在原型上量出 3 轨
 *     （2 页 + 1px 中缝，measure.mjs 顶部第 A 条讲的就是这个）——
 *     拿 3 直接判产物会把一个**正确**的两页版式判成错。
 *   · S26 提示词写「三栏」，度量器量出 2 轨（选中 div.two.two--f，三栏那个容器没选中）。
 *   · S19 提示词写「宽取 2/3/4 栏三档」，度量器量出 12（十二等分，那是另一个层级）。
 * 这三种情况下「跳过」都是正确答案，硬判只会制造假 FAIL。
 */

/* 中文数字 → 整数。提示词里「三轨」「三栏」「8 栏」混着写。 */
const CN_NUM = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 十一: 11, 十二: 12 };
function numOf(s) {
  if (/^[0-9]+$/.test(s)) return parseInt(s, 10);
  return CN_NUM[s] ?? null;
}

/* 找提示词里连续的轨道值串（`3fr、16px、9fr`），返回 {tokens, tail}。
 * 逐个 token 扫、只允许「、,，和空格」作分隔 —— 用正则会把 `1.2` 里的点在
 * 转义层上再坑一次（measure.mjs 顶部记着这个坑栽过四次）。 */
function trackRuns(prompt) {
  const toks = [...prompt.matchAll(/([0-9]+(?:\.[0-9]+)?)(fr|px)/g)]
    .map((m) => ({ v: +m[1], u: m[2], at: m.index, end: m.index + m[0].length }));
  const runs = [];
  let cur = null;
  for (const t of toks) {
    const gap = cur ? prompt.slice(cur.at(-1).end, t.at) : null;
    if (cur && /^[\s、,，和]*$/.test(gap)) cur.push(t);
    else { if (cur && cur.length >= 2) runs.push(cur); cur = [t]; }
  }
  if (cur && cur.length >= 2) runs.push(cur);
  return runs.map((r) => ({ tokens: r, tail: prompt.slice(r.at(-1).end, r.at(-1).end + 12) }));
}

/* 提示词里明说的「N 轨 / N 栏」。返回升序数组；空数组表示提示词没给栏数。
 *
 * ⚠️ 只读**机制句**（「这个风格的签名动作：……」那一行），并且排掉几类
 * 不是版式栏数的数字。这不是洁癖，实测有三个噪声源，每一个都会让判据变松：
 *   · S26 全文里「与 10 号（**五栏**非对称基线网格）…」是**指另一个案号**，
 *     抽出来的 5 会让判据接受一个 5 栏的错误产物；
 *   · S24「8 栏加中轴，每层各**伸 2 栏**」的 2 是「每层多占几栏」，
 *     不是「版式几栏」，抽出来会让 2 栏的产物蒙混过关；
 *   · S19「宽取 2/3/4 栏三档」是三档宽度，不是轨道数（这个案会被自校准挡下，
 *     但让它进入候选本身就没有信息价值）。
 * 排除词取「紧邻的前 4 个字里出现 伸/跨/缩/扩/号」—— 实测刚好够，
 * 且不会误伤「三轨分宽」「正页 2 栏」「两联按 3fr、16px、9fr 分栏」这些真值。 */
function mechanismSentence(prompt) {
  const line = prompt.split('\n').find((l) => /签名动作/.test(l));
  return line || prompt;
}

function specColumnCounts(prompt) {
  const mech = mechanismSentence(prompt);
  const out = new Set();
  for (const m of mech.matchAll(/([0-9]{1,2}|[一二两三四五六七八九十]{1,2})\s*(轨|栏)/g)) {
    const before = mech.slice(Math.max(0, m.index - 4), m.index);
    if (/[伸跨缩扩号]/.test(before)) continue;
    const n = numOf(m[1]);
    if (n) out.add(n);
  }
  /* fr 写法：S17「两联按 3fr、16px、9fr 分栏」—— 轨道值个数就是轨数（含中缝）。
   * 只在**连续的轨道值串**且后面紧跟「分栏/轨/栏/列」时数，
   * 避免把「轨道间距 96px」「0.62 递减」之类误当轨道表。 */
  for (const run of trackRuns(mech)) {
    if (/分栏|轨|栏|列/.test(run.tail)) out.add(run.tokens.length);
  }
  return [...out].sort((a, b) => a - b);
}

/* 提示词里可能描述「主轴比例」的所有候选（数字数组）。
 *
 * 提示词里有多处冒号数字，有些**不是版式比例**（S03 的「影像带以 1:0.5 的
 * 比率随滚动上移」是动画幅度）。所以不猜「哪句是真的」，而是把所有候选都返回，
 * 交给 matchRatio 用**原型实测**挑出能复现的那一个。
 *
 * 两类来源：
 *   a) 冒号比例，且前后 8 字里有「比/分宽/分栏/宽/栏」——
 *      「两页宽度比 5:7」「三栏按 5:3:4 分宽」「264:524:540 三轨分宽」；
 *   b) 连续轨道值串里**只用 fr 的那些**：「3fr、16px、9fr 分栏」⇒ [3, 9]
 *      （16px 是中缝，不参与比例；实测原型 mainRatio 去掉 0.012 的中缝后
 *       正是 0.25:0.75 = 3:9）。 */
function specRatioCandidates(prompt) {
  /* 比例只从机制句里找。全文找会把 S26 的「与 10 号（五栏…）」、
   * S03 的「影像带以 1:0.5 的比率随滚动上移」也收进来 —— 后者是动画幅度，
   * 不是版式比例。自校准能挡下它们，但让它们进候选只会稀释判据的信息量。 */
  const mech = mechanismSentence(prompt);
  const cands = [];
  for (const m of mech.matchAll(/([0-9]+(?:\.[0-9]+)?(?:\s*:\s*[0-9]+(?:\.[0-9]+)?){1,3})/g)) {
    const before = mech.slice(Math.max(0, m.index - 8), m.index);
    const after = mech.slice(m.index + m[0].length, m.index + m[0].length + 8);
    if (!/比|分宽|分栏|宽|栏/.test(before + after)) continue;
    const parts = m[1].split(':').map((v) => parseFloat(v));
    if (parts.length >= 2 && parts.every((v) => v > 0)) cands.push(parts);
  }
  for (const run of trackRuns(mech)) {
    const fr = run.tokens.filter((t) => t.u === 'fr').map((t) => t.v);
    if (fr.length >= 2) cands.push(fr);
  }
  return cands;
}

/* 提示词里写明的线宽档位：「5. 线宽只用这几级：0.5px、0.8px、1px、2px……」。
 * 找不到这一句就返回 null（该判据跳过，而不是默认通过）。
 *
 * ⚠️ **单值档位也是合法档位，必须判不能跳过**。实测 S31 / S34 的提示词写的正是
 * 「5. 线宽只用这几级：1px，全站线条都从这几级里取。」—— 只有 1px 一级。
 * 第一版这里写了 `vals.length >= 2`，等于把这两个案静默降级成「无法判定」，
 * 而它们其实有一条比多值档位**更严格**的判据（产物出现 2px 就该红）。
 * 那正是这次要修的毛病（读不到 ≠ 成立，也不该倒过来变成「读到了但不判」）。
 * 锚定在「线宽只用这几级」这句上，所以单值不会误匹配到别处的 px。 */
function specWidthScale(prompt) {
  const line = prompt.split('\n').find((l) => /线宽只用这几级/.test(l));
  if (!line) return null;
  const vals = [...line.matchAll(/([0-9]+(?:\.[0-9]+)?)px/g)].map((m) => parseFloat(m[1]));
  return vals.length >= 1 ? [...new Set(vals)].sort((a, b) => a - b) : null;
}

/* ══ 度量结果的可信度 ═══════════════════════════════════════════════════
 *
 * 这一节是写判据时最容易被跳过、但跳过就会制造假 FAIL 的一步。
 *
 * measure.mjs 用「按文字量取第一 + 排除页头页脚 + 同构兄弟聚组」选版心容器。
 * 它选对的时候很多，但**选错的时候也不少**，而且选错不会报错 —— 它照样返回
 * 一个合法整数。实测（2026-11-12，本机，九个 Q7 生成物）：
 *
 *   out-S03 → 选中 `dl.spec>div`：36 个子项、每个 11 字。那是一张 dl 规格表，
 *             不是版心。它报「2 轨」，这个 2 毫无证据价值。
 *   原型 S03 → 选中 `div.chrono`：3 个子项、平均 193 字。可信。
 *
 * 所以判据不能直接吃 gridTracks，得先问一句「这次选中的东西像不像版心」。
 * 门槛用 **平均每个子项 ≥ 40 字**，与 measure.mjs 自己的 MIN_TEXT=40 同源
 * （那里用它判「不带 40 字的容器不是正文栏」）。
 *
 * ⚠️ 已知代价：S09 的版心是 column-count 布局，它的 PICK 平均每子项只有 14 字
 * （每个 .row 是一行价签）。按这个门槛它会被判「不可信」——方向是**跳过**，
 * 不是误判 FAIL，这是可以接受的代价（宁可说不知道，不要说错）。
 */
const MIN_KID_CHARS = 40;

function pickOf(m) { return (m.gridCandidates || []).find((c) => c.verdict === 'PICK') || null; }

function trustedPick(m) {
  if (m.gridFrom === 'nothing-measured') return { ok: false, why: '度量器一个候选都没找到（nothing-measured）' };
  const p = pickOf(m);
  if (!p) return { ok: false, why: m.gridFrom === 'no-column-layout' ? '没有任何及格的多栏容器' : '没有 PICK 候选' };
  const avg = p.avgKid ?? 0;
  if (avg < MIN_KID_CHARS) return { ok: false, why: `选中的 ${p.sel} 平均每子项只有 ${avg} 字（<${MIN_KID_CHARS}），像表格/清单而不是版心` };
  return { ok: true, pick: p };
}

/* 一侧被判成 no-column-layout 时，这个结论可信吗？
 *
 * 不可信的典型：**版心真的存在，但它长在一个被 landmark 规则排除的元素里**。
 * 实测 S14：原型的两栏首屏是 `header.masthead`（style.css:79 `display:grid;
 * grid-template-columns: 1.02fr 0.98fr`），measure 把 header 整个排除，
 * 于是判 no-column-layout；而产物把等价的两栏首屏写在 `<section>` 里，没被排除。
 * 同一把尺子量两侧、一个排除 header 一个不排除 ⇒ 报「原型 0 轨 / 产物 2 轨」。
 * 那是 **DOM 标签差异**，不是版式偏差。拿它判 FAIL 就是假 FAIL。
 *
 * 判法：在候选表里找「多栏 + 每子项 ≥40 字 + 不是画廊」的元素（含被 landmark
 * 规则排除的那些），找得到就说明版式存在、只是没被选中 ⇒ 这一侧不可信。
 * 候选表里带 verdict 字符串，可直接识别（landmark:header / landmark:footer / gallery）。
 *
 * ⚠️ 页脚**不算证据**，这条限定是实测逼出来的：
 * 本库 30 案里页脚普遍是多栏（实测 S14 div.foot-grid 3 栏、S16 同、S34 footer 4 栏），
 * 把页脚算进来，三道「确实没有版心分栏」的案（S14/S16/S34）就全部退化成跳过，
 * 这条判据在本库**等于被关掉**。而 measure.mjs 的判据本身就写着「版心不会长在
 * footer 里」（顶部第 5 条），页脚被排除是**有意的规则**，不是 artifact。
 * 头部不一样：S14/S16 的两栏首屏确实长在 `<header class="masthead">` 里
 * （S14 style.css:79、S16 .masthead-grid），那不是页头导航，是首屏本体 ——
 * 所以 header / nav / aside 里的多栏算 artifact，footer 的不算。
 * 收窄之后实测：S14/S16 仍跳过（header.masthead），S34 变得可判。 */
function noColumnVerdictIsSound(m) {
  const looks = (m.gridCandidates || []).filter((c) =>
    c.cols >= 2 && c.verdict !== 'gallery' && c.verdict !== 'landmark:footer' &&
    (c.avgKid ?? 0) >= MIN_KID_CHARS);
  return { sound: looks.length === 0, looks };
}

/* ══ 比例工具 ══════════════════════════════════════════════════════════ */
/* 去掉「接缝」这种极小项再归一化。
 *
 * 阈值 0.05 的依据：本仓库 30 案的接缝/栏沟占宽实测 0.1%–8%（S07 的 1px 中缝
 * 在 1440 宽下是 0.1%，S17 的 16px 齿孔线是 1.2%，S01 的 24px 铅条是 2.4%），
 * 而正文栏最小也有 8%。所以 5% 能把「线」和「栏」分开。
 * 它只用于**归一化之后**的比对，且两侧都经过同一步骤。 */
const RATIO_MIN = 0.05;
const RATIO_TOL = 0.03;
function normRatio(parts) {
  const sig = (parts || []).filter((v) => Number.isFinite(v) && v >= RATIO_MIN);
  const s = sig.reduce((a, b) => a + b, 0);
  return s > 0 ? sig.map((v) => v / s) : [];
}

/* 在候选里找出「度量器在原型上能复现」的那一个比例。
 * 找不到 ⇒ null ⇒ 判据跳过（尺子在这个案上不准，不判）。 */
function matchRatio(cands, wantParts) {
  const w = normRatio(wantParts);
  if (w.length < 2) return null;
  for (const c of cands) {
    const n = normRatio(c);
    if (n.length !== w.length) continue;
    if (n.every((v, i) => Math.abs(v - w[i]) <= RATIO_TOL)) return { spec: c, want: w };
  }
  return null;
}

/* 线宽比对必须**按整数分辨率**做。
 *
 * 起因是实测：out-S07 的 CSS 里写了 12 处 0.5px 边框，measure 的 borderWidths
 * 只报 [1.00, 2.00]；out-S17 写了 0.5 / 0.8 / 2.4，报出 [1.00, 2.00, 5.00, 6.00]。
 * 也就是 Chrome 在 getComputedStyle 里把亚像素边框**取整**了
 * （measure.mjs ④ 的注释记的是同一件事）。拿浮点数做集合包含会得到大面积假 FAIL；
 * 正确做法是把两边都四舍五入到整像素再比。
 * 代价（已知、接受）：0.4px 与 0.8px 在这一层无法区分，它们都算 1px。
 */
const roundPx = (v) => Math.round(parseFloat(v));
const widthSet = (arr) => new Set((arr || []).map(roundPx).filter((v) => v > 0));

/* ══ 八条判据 ══════════════════════════════════════════════════════════
 * 每条返回 {name, state, want, got, note}。
 *   state: 'pass' | 'fail' | 'skip'
 *   note：写「提示词里有没有明确指令」—— 那决定失败时该怪谁。
 */
function judge(want, got, prompt, minPics) {
  const out = [];
  const add = (name, state, w, g, note) => out.push({ name, state, want: fmt(w), got: fmt(g), note });

  /* ① 分栏结构：**有没有多栏版心**。
   *
   * 新增的一条。旧版没有它，而「原型刻意不分栏、产物却分了栏」这类偏差
   * 只有它能判（旧版 ①主体栏数 写死 ok:true，把这整类偏差盖住了）。
   *
   * 它不判「几栏」只判「有无」，理由是旧注释那两条仍然成立：
   *   · 数到几轨会被中缝/铅条/齿孔线干扰（S07 的 1px 中缝让 2 栏数成 3 轨）；
   *   · 产物可以用 flex / column-count 做出同样的分栏，实现手段不该判。
   * 但「有没有」是分类判断，不受这两条影响 —— 数值会漂，分类不会。
   *
   * ⚠️ 必须带 artifact 守卫：一侧判成 no-column-layout 时，先确认它的候选表里
   * 真的没有多栏版式（见 noColumnVerdictIsSound 的实测说明）。没有这道守卫，
   * S14 会得到假 FAIL。 */
  let colState, colNote;
  const wantNone = want.gridFrom === 'no-column-layout';
  const gotNone = got.gridFrom === 'no-column-layout';
  const wSound = wantNone ? noColumnVerdictIsSound(want) : null;
  const gSound = gotNone ? noColumnVerdictIsSound(got) : null;
  const wBad = wSound && !wSound.sound && wSound.looks[0];
  const gBad = gSound && !gSound.sound && gSound.looks[0];
  if (wBad) {
    colState = 'skip';
    colNote = `原型判成「无多栏」，但候选表里有 ${wBad.sel}（${wBad.cols} 栏、每子项 ${wBad.avgKid} 字）——` +
      `版式存在、只是落在被 landmark 规则排除的元素里，两侧的尺子不对等，不判`;
  } else if (gBad) {
    colState = 'skip';
    colNote = `产物判成「无多栏」，但候选表里有 ${gBad.sel}（${gBad.cols} 栏、每子项 ${gBad.avgKid} 字）——同上，不判`;
  } else if (want.gridFrom === 'nothing-measured' || got.gridFrom === 'nothing-measured') {
    colState = 'skip';
    colNote = `有一侧什么都没测到（${want.gridFrom}/${got.gridFrom}）—— 没测到不等于没有分栏`;
  } else if (wantNone === gotNone) {
    colState = 'pass';
    colNote = wantNone ? '两侧都没有多栏版心' : '两侧都是多栏版心';
  } else {
    colState = 'fail';
    colNote = wantNone
      ? '原型刻意不分栏，产物却排成了多栏 —— 提示词第 3 条要求按自动流排版'
      : '原型是多栏版心，产物塌成了单栏 / 无版心';
  }
  add('分栏结构', colState, wantNone ? '无分栏' : `${want.gridTracks} 轨`, gotNone ? '无分栏' : `${got.gridTracks} 轨`, colNote);

  /* ② 主体栏数：**只在提示词给了明确栏数、且度量器在原型上复现得了这个数时判**。
   *
   * 旧注释（降级为只报不判）的两条理由现在这样处理：
   *   1. 「哪个 grid 是主版式」——measure.mjs 2026-11 重写后改成「按文字量取第一 +
   *      排除页头页脚 + 同构兄弟聚组」，S23 选页头那个反例已经修掉。但它仍会选错
   *      （S26 实测选中 div.two.two--f；out-S03 实测选中 dl.spec>div），所以不能无条件判。
   *   2. 「机制句语义范围不同」—— 机制句没给栏数的案（S06/S14/S23）直接跳过。
   *
   * 于是判据 = 提示词给了栏数 N + 原型实测 = N（尺子准）+ 产物那一侧选中的容器
   * 确实像版心（trustedPick）。三个条件都满足才判。
   * 多值提示词里属于其中任意一个都算对（S07「正页 2 栏、背页 3 栏」）。 */
  const specCols = specColumnCounts(prompt);
  const gotTrust = trustedPick(got);
  let nState, nNote;
  if (!specCols.length) {
    nState = 'skip';
    nNote = '提示词未给栏数（机制句描述的是排布方式，不是版式骨架）—— 不拿语义不成立的尺子判';
  } else if (!specCols.includes(want.gridTracks)) {
    nState = 'skip';
    nNote = `度量器在原型上测到 ${want.gridTracks} 轨（${want.gridSel || '无'}），与提示词的 ${fmt(specCols)} 复现不上 —— 尺子在此案不准，跳过`;
  } else if (!gotTrust.ok) {
    nState = 'skip';
    nNote = `产物侧度量不可信：${gotTrust.why} —— 不拿这个数判人`;
  } else if (specCols.includes(got.gridTracks)) {
    nState = 'pass';
    nNote = `提示词给 ${fmt(specCols)} 轨，产物 ${got.gridTracks} 轨（${got.gridSel}）在范围内`;
  } else {
    nState = 'fail';
    nNote = `提示词给 ${fmt(specCols)} 轨，产物 ${got.gridTracks} 轨（${got.gridSel}）—— 有明确指令而没照做`;
  }
  add('主体栏数', nState, `${want.gridTracks} (提示词 ${fmt(specCols)})`, `${got.gridTracks} (${got.gridSel || '-'})`, nNote);

  /* ③ 主轴比例：同样自校准 + 同样的可信度门槛。
   *
   * 旧注释说它是「最不可靠的一条」，两个原因现在的处理：
   *   · 「按面积选到页头」——已由 measure.mjs 重写修掉（按文字量取第一）；
   *   · 「机制句语义范围不同」——现在**只在机制句真的给了比例时**才判
   *     （「两页宽度比 5:7」「三栏按 5:3:4 分宽」「3fr、16px、9fr 分栏」），
   *     没给比例直接跳过，语义门槛因此消失。
   * 再加两道关：原型侧要能复现提示词的比例（尺子准），产物侧选中的容器要像版心。
   * S23 那个反例（5fr 7fr 的版心 vs 页头）会走到「尺子不准 → 跳过」，
   * 不会拿页头的比例去判版心。 */
  const ratioCands = specRatioCandidates(prompt);
  const rm = matchRatio(ratioCands, want.mainRatio);
  let rState, rNote;
  if (!rm) {
    rState = 'skip';
    rNote = ratioCands.length
      ? `提示词的比例候选 ${ratioCands.map(fmt).join(' / ')} 与原型实测 ${fmt(want.mainRatio)} 复现不上 —— 尺子在此案不准，跳过`
      : '提示词未给主轴比例 —— 不判';
  } else if (!gotTrust.ok) {
    rState = 'skip';
    /* 这时**不等于没事**：产物那一侧选中的不是版心，但版心可能真实存在、
     * 只是度量器看不见（实测 out-S03：264px 固定轴 + 24px 轨，用 position:fixed
     * 实现，根本不进 grid 候选表）。所以把候选表摊开写进 note 交人核。
     * 为什么不判 FAIL：候选表里只有「几栏」这个整数，没有比例 ——
     * 「全表没有多栏候选」不等于「产物没做这个比例」（嵌套 flex 同样看不见）。
     * 拿「看不见」当「没有」正是这次要修的那种毛病。 */
    const multi = (got.gridCandidates || []).filter((c) => c.cols >= 2 && c.verdict !== 'gallery');
    rNote = `产物侧度量不可信：${gotTrust.why} —— 不拿这个数判人；` +
      (multi.length
        ? `全表有 ${multi.length} 个多栏候选（如 ${multi[0].sel} ${multi[0].cols} 栏），结构可能只是没选中，需人工核`
        : `且全表没有任何多栏候选 —— 提示词要求的 ${fmt(rm.spec)} 结构疑似缺失，需人工核`);
  } else {
    const specN = normRatio(rm.spec);
    const g = normRatio(got.mainRatio);
    if (specN.length !== g.length) {
      rState = 'fail';
      rNote = `提示词要求 ${fmt(rm.spec)} 的分栏比例，产物测到 ${g.length} 段 ${fmt(got.mainRatio)}（${got.gridSel}）—— 结构不同`;
    } else if (g.every((v, i) => Math.abs(v - specN[i]) <= RATIO_TOL)) {
      rState = 'pass';
      rNote = `提示词 ${fmt(rm.spec)} ≈ 原型 ${fmt(want.mainRatio)} ≈ 产物 ${fmt(got.mainRatio)}`;
    } else {
      rState = 'fail';
      rNote = `提示词 ${fmt(rm.spec)}，产物实测 ${fmt(got.mainRatio)}（${got.gridSel}）—— 比例对不上`;
    }
  }
  add('主轴比例', rState, rm ? rm.spec : '未给', got.mainRatio, rNote);

  /* ④ 标题/正文字号比：容差 ±20%。
   *
   * 这条是旧版里唯一**真的在判**的一条（九案实测偏差全在 ±1.1% 内），
   * 判法一个字没动。只修了一个洞：旧代码在任一侧取不到字号时
   * `hr === null → ok:true`，也就是「量不出来 → 记通过」。
   * 现在记 skip（不计入分母），因为没量到不是做到了。
   * ⚠️ 不要为了「让判据能失败」去动它 —— 它是真的在判。 */
  let hState, hNote;
  if (!(want.headBodyRatio && got.headBodyRatio)) {
    hState = 'skip';
    hNote = '有一侧量不到字号比 —— 无法判定，不记通过';
  } else {
    const diff = Math.abs(got.headBodyRatio - want.headBodyRatio) / want.headBodyRatio;
    hState = diff <= 0.20 ? 'pass' : 'fail';
    hNote = (/字号|字阶|font-size|标题/i.test(prompt) ? '提示词有字号约束' : '提示词未提字号') +
            `，偏差 ${(diff * 100).toFixed(1)}%`;
  }
  add('标题/正文比', hState, want.headBodyRatio, got.headBodyRatio, hNote);

  /* ⑤ 线宽集合：原型声明过的线宽必须都出现（不反向要求 —— 生成物可以多，
     但少了就是没照做）。
   *
   * ⚠️ 必须同时收 border 与 svg stroke-width，两组分开比。
   * 起因是一个盲测 Agent 的实测发现：CSS 的 0.5px / 0.8px / 2.4px 细线
   * 被 Chrome 在 getComputedStyle 里**取整**成 1px / 2px，而 SVG 的 stroke-width
   * 不取整。S17 的细线恰好全在 SVG 里（0.5 / 0.8 / 2.4 / 5 / 6），
   * 只比 borderWidths 会得到 [1.00, 2.00]，把它的线宽体系整个看漏。
   *
   * 这一条本身能失败（少了就红），判法不动；只把比对改成整数分辨率
   * （见 roundPx）—— 不改的话，产物正确地用 0.5px 反而会被判缺 1px。 */
  const wantBW = want.borderWidths.filter((w) => parseFloat(w) > 0);
  const gotBW = widthSet(got.borderWidths);
  const missBW = [...widthSet(wantBW)].filter((w) => !gotBW.has(w));
  add('线宽集合(border)', missBW.length === 0 ? 'pass' : 'fail', wantBW, got.borderWidths,
    (/线宽|border|stroke/i.test(prompt) ? `缺 ${missBW.join(',') || '无'}` : '提示词未提线宽'));

  /* ⑥ 线宽档位合规：**产物用到的每一级线宽，都必须是提示词给的那几级**。
   *
   * 这是旧版「线宽集合(stroke,参考) ok:true」的替代，也是一条新判据。
   * 旧判据为什么不能判（**这条理由今天仍然成立，所以没有硬改它**）：
   * 它测的是**实现手段**（用不用 SVG 画线），不是视觉结果。原型 S17 用 SVG 是
   * 因为 CSS border 会被 Chrome 取整，但产物完全可以用 CSS 画出同样的细线 ——
   * 实测 out-S17 就是这么做的：CSS 里声明 0.5 / 0.8 / 2.4 / 5 / 6 px，
   * svgStrokeWidths 是空数组，视觉等价。拿「有没有 SVG」判对错会把正确实现判红。
   *
   * 那个判据真正想守的是「线宽体系有没有被复刻」，它可以由提示词那一句
   * 「5. 线宽只用这几级：0.5px、0.8px、1px、2px、2.4px、5px、6px，全站线条都从这几级里取」
   * 直接判：产物用到的任意一级若不在这个集合里，就是没照做。
   * 这条**能失败**，且判的是视觉结果（屏幕上多粗的线），与实现手段无关。
   * 原型那组 stroke 数字仍然打印在 note 里供人复核（诊断价值保留）。 */
  const scale = specWidthScale(prompt);
  const gotAll = new Set([...widthSet(got.borderWidths), ...widthSet(got.svgStrokeWidths)]);
  let wState, wNote;
  if (!scale) {
    wState = 'skip';
    wNote = '提示词未给线宽档位 —— 不判';
  } else {
    const allowed = new Set(scale.map(roundPx));
    const off = [...gotAll].filter((w) => !allowed.has(w)).sort((a, b) => a - b);
    wState = off.length ? 'fail' : 'pass';
    wNote = (off.length ? `产物用到档位外的线宽 ${off.join(',')}px` : `产物 ${[...gotAll].join(',') || '无'}px 全部在档位内`) +
      `；原型 SVG 用 ${fmt(want.svgStrokeWidths)}，产物 ${got.svgStrokeWidths.length ? '也用了 SVG' : '改用 CSS 实现（视觉等价，不判手段）'}`;
  }
  add('线宽档位合规', wState, scale || '未给', [...gotAll], wNote);

  /* ⑦ 主色：判据是**提示词里给的色是否都出现在产物里**，不是「产物是否复刻了原型的全部色」。
   *
   * 为什么必须这样定：原型 S14 的 CSS 里有 13 个 hex，而提示词只给了 9 个
   * （pickPalette 的上限），剩下 4 个是派生色。拿原型的全量色去要求产物，
   * 等于要求模型复刻它从未被告知的颜色 —— 那是拿一把错的尺子判分。
   * 提示词的色列表才是模型收到的约束；产物只要把它全部用上，配色这一关就成立。 */
  const promptHexes = new Set((prompt.match(/#[0-9A-Fa-f]{6}/g) || []).map((h) => h.toUpperCase()));
  const gotHex = new Set(got.hexes);
  const missHex = [...promptHexes].filter((h) => !gotHex.has(h));
  add('配色（提示词给的色）', missHex.length === 0 ? 'pass' : 'fail',
    `${promptHexes.size} 个`, `${gotHex.size} 个（缺 ${missHex.length}）`,
    promptHexes.size ? `缺: ${missHex.slice(0, 4).join(' ') || '无'}` : '提示词未给色值');

  /* ⑧ 图片位：可见图片数必须达到提示词的 minPics。
   *
   * 旧判据是 `got.imgVisible > 0 || want.imgVisible === 0` —— 只判「有没有」，
   * 而 prompt-S03 第 4 条写的是「至少要 8 个不同的图片位置」。实测 out-S03 只有 9 张
   * （原型 12），旧判据给绿；S19 原型 11 张、产物 6 张，旧判据也给绿。
   * 现在按 minPics 判（数据来自 minitems-parsed.json，与提示词同源）。
   *
   * minPics 为 null（数据缺该案）时**不默认放行**，记 skip 并大声说 ——
   * 这正是 check-contract.mjs C0 那条教训：读不到 ≠ 成立。
   * minPics 为 0 的案（S34）就是 `0 >= 0`，是真正的通过，不是特例放行。
   *
   * ⚠️ 已知口径局限：提示词要求的是「**不同的**图片位置（同一张图重复用不算）」，
   * 而 measure 只给 img 标签数 / 可见数，不给唯一 src 数。out-S07 就是 16 个标签
   * 只有 8 个唯一 src 的情形（仍是 8 ≥ 7，结论不变）。要按「唯一」判，
   * 得让 measure 多返回一个字段 —— 那属于改度量器，本文件不动它。
   * 这条写进报告 §4，不在这里偷偷放宽。 */
  let pState, pNote;
  if (minPics === null || minPics === undefined) {
    pState = 'skip';
    pNote = 'minitems-parsed.json 里没有该案的 minPics —— 无法判定（不默认放行）';
  } else {
    pState = got.imgVisible >= minPics ? 'pass' : 'fail';
    pNote = `提示词要求至少 ${minPics} 个图片位；产物 ${got.imgCount} 个标签 / ${got.imgVisible} 个可见` +
      (got.imgVisible >= minPics ? '' : ` —— 少 ${minPics - got.imgVisible} 个`);
  }
  add('图片位', pState, `${minPics ?? '?'} 个起`, `${got.imgCount}/${got.imgVisible}`, pNote);

  return out;
}

/* ══ 主流程 ════════════════════════════════════════════════════════════ */
async function runAll() {
  const results = [];
  for (const p of PAIRS) {
    /* 支持 `node compare.mjs -v2` 这类后缀，用来对比不同轮次的产物。
     * 为什么需要：9 色那一轮要同时看「旧版」和「新版」的结果差异，
     * 而写死 out-${id}.html 就只能看一版。 */
    const SUFFIX = process.argv.find((a) => /^-[a-z0-9]+$/i.test(a)) || '';
    const outFile = join(Q7, `out-${p.id}${SUFFIX}.html`);
    const promptFile = join(Q7, `prompt-${p.id}.txt`);
    if (!existsSync(outFile)) { console.log(`${p.id}: 还没有生成物（out-${p.id}${SUFFIX}.html），跳过`); continue; }
    const prompt = readFileSync(promptFile, 'utf8');
    console.log(`\n=== ${p.id} ===`);
    const [want, got] = [await measure(p.proto), await measure(outFile)];
    const rows = judge(want, got, prompt, minPicsById[p.id]);
    for (const r of rows) {
      const mark = r.state === 'pass' ? '✓' : r.state === 'fail' ? '✗' : '—';
      console.log(`  ${mark} ${r.name.padEnd(16)} want ${String(r.want).padEnd(22)} got ${String(r.got).padEnd(22)} ${r.note}`);
    }
    results.push({ id: p.id, rows });
  }

  if (!results.length) return 0;

  console.log('\n=== 汇总 ===');
  for (const r of results) {
    const pass = r.rows.filter((x) => x.state === 'pass').length;
    const fail = r.rows.filter((x) => x.state === 'fail').length;
    const skip = r.rows.filter((x) => x.state === 'skip').length;
    /* 分母只算**真正跑过**的判据。这一行是本次修复的核心：
     * 旧版把 4 条恒真的判据也算进分母，于是「7/7」不代表 7 个独立结论。 */
    console.log(`${r.id}: ${pass}/${pass + fail}` + (skip ? `（另有 ${skip} 项无法判定，不计入分母）` : ''));
    for (const s of r.rows.filter((x) => x.state === 'skip')) console.log(`      — ${s.name}：${s.note}`);
  }

  const allFail = results.flatMap((r) => r.rows.filter((x) => x.state === 'fail').map((x) => ({ id: r.id, ...x })));
  if (allFail.length) {
    console.log('\n失败项按「该怪谁」分组：');
    const promptDefect = allFail.filter((f) => /未提|未给|未给色值/.test(f.note));
    const modelBias = allFail.filter((f) => !/未提|未给|未给色值/.test(f.note));
    if (promptDefect.length) {
      console.log('  【提示词缺陷】提示词里压根没这条指令 —— 要回流修数据层：');
      promptDefect.forEach((f) => console.log(`    ${f.id} ${f.name}`));
    }
    if (modelBias.length) {
      console.log('  【模型偏差】提示词有指令但没照做 —— 重跑一次再判定：');
      modelBias.forEach((f) => console.log(`    ${f.id} ${f.name}（${f.note}）`));
    }
  } else {
    console.log('\n没有失败项。');
  }

  /* 旧版到这一行就结束了，**进程退出码永远是 0** —— 一个不会失败的闸门
   * 和一个打印漂亮的报告没有区别。补上退出码，才能进 CI / 批量回归。 */
  return allFail.length ? 1 : 0;
}

/* ══ --selftest：把缺陷装回去，确认对应判据真的会响 ════════════════════
 *
 * 为什么要做（本仓库惯例，见 prototypes/_build/probe-ui.mjs:673-691）：
 *   本仓库有过「闸门打印绿、实际没跑」的先例，而这次的问题更严重 ——
 *   判据不是没跑，是**结构上不可能红**（ok:true 写死 / 只报不判）。
 *   所以每条判据都必须给出一个「已知会红」的变异；不红就说明判据坏了。
 *
 * ⚠️ 变异全部在**内存里的测量结果**上做，**一个字节都不写盘**。
 *    probe-ui.mjs 的注释记着为什么：曾经改真实文件再还原，被 timeout 杀掉后
 *    在仓库里留下了坏代码。这里更彻底 —— 连临时文件都不产生。
 *
 * 每条新判据都配一个**反向变体**（合格的样子必须报 PASS），两次都过才算它
 * 既不是恒真也不是恒假。最后再核对一遍：每条判据都必须同时出现过 PASS 与 FAIL。
 *
 * 素材用 deliverables/74-q7/out-S03 / out-S14 / out-S17（Q7 留下的真实生成物），
 * 不是手搓的假数据 —— 这样连 measure 的字段名写错都能被测出来。
 * S14 尤其重要：它的真实数据就是「原型两栏结构长在 header 里」的那个反例，
 * 用它证明守卫真的会跳过。
 */
function clone(o) { return JSON.parse(JSON.stringify(o)); }

async function runSelftest() {
  console.log('变异测试：逐条把缺陷装回去，确认对应判据真的会响\n');
  console.log('（变异在内存里做，磁盘文件全程不动 —— 素材是真实生成物的实测结果）\n');

  const need = ['S03', 'S14', 'S17'];
  const fx = {};
  for (const id of need) {
    const d = dirOf(id, vm);
    const proto = join(ROOT, `prototypes/${d}/index.html`);
    const gen = join(Q7, `out-${id}.html`);
    if (!existsSync(proto) || !existsSync(gen)) { console.log(`? 缺素材：${proto} / ${gen}`); return 2; }
    fx[id] = {
      prompt: readFileSync(join(Q7, `prompt-${id}.txt`), 'utf8'),
      minPics: minPicsById[id] ?? null,
      want: await measure(proto),
      got: await measure(gen),
    };
    console.log(`  素材 ${id}: 原型 prototypes/${d}/index.html + 生成物 out-${id}.html`);
  }
  console.log('');

  /* 每条变异：base=拿哪一案的测量结果，mut=对内存副本的改动，
   * 期望在 expect 的那条判据上看到给定状态。 */
  const CASES = [
    /* ── ① 分栏结构 ─────────────────────────────────────────────── */
    {
      name: 'col-invented',
      base: 'S03', row: '分栏结构', state: 'fail',
      mut: (f) => { f.want.gridFrom = 'no-column-layout'; f.want.gridTracks = 0; f.want.gridSel = '';
        f.want.gridCandidates = (f.want.gridCandidates || []).filter((c) => c.cols < 2);
        f.got.gridFrom = 'grid'; f.got.gridTracks = 2; },
      note: '原型真的没有多栏版式（候选表里也无多栏），产物却排成 2 栏 —— S14 的情形',
    },
    {
      name: 'col-collapsed',
      base: 'S03', row: '分栏结构', state: 'fail',
      mut: (f) => { f.got.gridFrom = 'no-column-layout'; f.got.gridTracks = 0;
        f.got.gridCandidates = (f.got.gridCandidates || []).filter((c) => c.cols < 2); },
      note: '原型是多栏版心，产物塌成无分栏',
    },
    {
      name: 'col-same [反向]',
      base: 'S03', row: '分栏结构', state: 'pass',
      mut: () => {},
      note: '两侧都是多栏 → 必须报 PASS（防恒假）',
    },
    {
      name: 'col-landmark-artifact [跳过]',
      base: 'S14', row: '分栏结构', state: 'skip',
      mut: () => {},
      note: '**真实数据**：原型两栏首屏长在 <header.masthead> 里，被 landmark 规则排除 —— 守卫必须跳过（没有守卫这里会假 FAIL）',
    },

    /* ── ② 主体栏数 ─────────────────────────────────────────────── */
    {
      name: 'columns-collapse',
      base: 'S03', row: '主体栏数', state: 'fail',
      mut: (f) => { f.got.gridTracks = 2; f.got.gridSel = 'div.hero-grid';
        const p = (f.got.gridCandidates || []).find((c) => c.verdict === 'PICK'); if (p) p.avgKid = 200; },
      note: '提示词给「264:524:540 三轨」，产物可信地测出 2 轨',
    },
    {
      name: 'columns-match [反向]',
      base: 'S03', row: '主体栏数', state: 'pass',
      mut: (f) => { f.got.gridTracks = 3;
        const p = (f.got.gridCandidates || []).find((c) => c.verdict === 'PICK'); if (p) p.avgKid = 200; },
      note: '产物也是 3 轨 → 必须报 PASS（防恒假）',
    },
    {
      name: 'columns-ruler-off [跳过]',
      base: 'S03', row: '主体栏数', state: 'skip',
      mut: (f) => { f.want.gridTracks = 7; },   /* 尺子测到 7，提示词说 3 → 尺子不准 */
      note: '度量器在原型上量出 7 轨、提示词说 3 轨 → 必须跳过而不是判错（S26 的情形）',
    },
    {
      name: 'columns-untrusted-pick [跳过]',
      base: 'S03', row: '主体栏数', state: 'skip',
      mut: () => {},   /* 真实 out-S03：选中的 dl.spec>div 平均每子项 11 字 */
      note: '**真实数据**：产物侧选中 dl.spec>div（36 个子项、每个 11 字）—— 不是版心，必须跳过',
    },

    /* ── ③ 主轴比例 ─────────────────────────────────────────────── */
    {
      name: 'ratio-collapse',
      base: 'S17', row: '主轴比例', state: 'fail',
      mut: (f) => { f.got.mainRatio = [0.9, 0.1]; f.got.gridSel = 'div.wrap';
        const p = (f.got.gridCandidates || []).find((c) => c.verdict === 'PICK'); if (p) p.avgKid = 300; },
      note: '提示词要求 3fr/16px/9fr（3:9），产物测到 2 段 9:1',
    },
    {
      name: 'ratio-match [反向]',
      base: 'S17', row: '主轴比例', state: 'pass',
      mut: () => {},
      note: '**真实数据**：out-S17 的 .tk 就是 3fr/16px/9fr → 必须报 PASS',
    },
    {
      name: 'ratio-ruler-off [跳过]',
      base: 'S17', row: '主轴比例', state: 'skip',
      mut: (f) => { f.want.mainRatio = [0.5, 0.5]; },
      note: '尺子在原型上量出的比例与提示词对不上 → 必须跳过（S23 页头反例、S26 选错容器）',
    },

    /* ── ④ 标题/正文比 ───────────────────────────────────────────── */
    {
      name: 'headbody-off',
      base: 'S03', row: '标题/正文比', state: 'fail',
      mut: (f) => { f.got.headBodyRatio = +(f.want.headBodyRatio * 1.6).toFixed(2); },
      note: '字号比偏离 60%（容差 ±20%）',
    },
    {
      name: 'headbody-match [反向]',
      base: 'S03', row: '标题/正文比', state: 'pass',
      mut: () => {},
      note: '真实生成物的字号比（偏差 ~1%）→ 必须报 PASS',
    },
    {
      name: 'headbody-null [跳过]',
      base: 'S03', row: '标题/正文比', state: 'skip',
      mut: (f) => { f.want.headBodyRatio = null; },
      note: '量不到字号比 → 旧版记 PASS，现在必须记「无法判定」',
    },

    /* ── ⑤ 线宽集合（原型档位 ⊆ 产物）──────────────────────────── */
    {
      name: 'border-missing',
      base: 'S17', row: '线宽集合(border)', state: 'fail',
      mut: (f) => { f.got.borderWidths = ['1.00']; },
      note: '原型有 2px 的线，产物只有 1px',
    },
    {
      name: 'border-superset [反向]',
      base: 'S17', row: '线宽集合(border)', state: 'pass',
      mut: () => {},
      note: '产物的线宽是原型的超集 → 必须报 PASS（不反向要求）',
    },

    /* ── ⑥ 线宽档位合规（产物 ⊆ 提示词档位）────────────────────── */
    {
      name: 'width-off-scale',
      base: 'S17', row: '线宽档位合规', state: 'fail',
      mut: (f) => { f.got.borderWidths = [...f.got.borderWidths, '3.00']; },
      note: '产物用了 3px，提示词档位是 0.5/0.8/1/2/2.4/5/6',
    },
    {
      name: 'width-on-scale [反向]',
      base: 'S17', row: '线宽档位合规', state: 'pass',
      mut: () => {},
      note: '**真实数据**：out-S17 用 CSS 实现 0.5/0.8/2.4 细线 → 必须 PASS，不能因为没用 SVG 就红',
    },
    {
      name: 'width-scale-absent [跳过]',
      base: 'S17', row: '线宽档位合规', state: 'skip',
      mut: (f) => { f.prompt = f.prompt.replace(/^5\. 线宽只用这几级.*$/m, ''); },
      note: '提示词没有档位句 → 跳过，不默认通过',
    },
    /* ── 2026-11-12 补：单值档位必须照样判 ─────────────────────────
     * 实测 S31 / S34 的产品提示词写的是「线宽只用这几级：**1px**」——只有一级。
     * 我的第一版解析器要求 `vals.length >= 2`，于是把这两案静默降级成「无法判定」。
     * 那是错的：单值档位是一条**更严格**的判据（产物出现 2px 就该红），
     * 读到了却不判，和「读不到就放行」是同一类毛病。
     * 下面两条把这个坑钉死：单值档位下，产物合规必须 PASS、超档必须 FAIL。 */
    {
      name: 'width-single-tier [反向]',
      base: 'S17', row: '线宽档位合规', state: 'pass',
      mut: (f) => { f.prompt = f.prompt.replace(/^5\. 线宽只用这几级.*$/m, '5. 线宽只用这几级：1px，全站线条都从这几级里取。');
        f.got.borderWidths = ['1.00']; f.got.svgStrokeWidths = []; },
      note: '单值档位「只有 1px」（S31/S34 的真实形态），产物也只有 1px → 必须 PASS 而不是跳过',
    },
    {
      name: 'width-single-tier-violated',
      base: 'S17', row: '线宽档位合规', state: 'fail',
      mut: (f) => { f.prompt = f.prompt.replace(/^5\. 线宽只用这几级.*$/m, '5. 线宽只用这几级：1px，全站线条都从这几级里取。');
        f.got.borderWidths = ['1.00', '2.00']; f.got.svgStrokeWidths = []; },
      note: '单值档位「只有 1px」，产物用了 2px → 必须 FAIL（单值不是「无法判定」）',
    },

    /* ── ⑦ 配色 ─────────────────────────────────────────────────── */
    {
      name: 'colors-missing',
      base: 'S17', row: '配色（提示词给的色）', state: 'fail',
      mut: (f) => { f.got.hexes = f.got.hexes.filter((h) => h !== '#D6C9AC'); },
      note: '**真实缺陷**：提示词给的 #D6C9AC 没出现在 out-S17 里',
    },
    {
      name: 'colors-complete [反向]',
      base: 'S17', row: '配色（提示词给的色）', state: 'pass',
      mut: (f) => { f.got.hexes = [...f.got.hexes, '#D6C9AC']; },
      note: '把缺的色补上 → 必须报 PASS',
    },

    /* ── ⑧ 图片位 ───────────────────────────────────────────────── */
    {
      name: 'pics-short',
      base: 'S03', row: '图片位', state: 'fail',
      mut: (f) => { f.got.imgVisible = 7; },   /* S03 的 minPics = 8 */
      note: '提示词要求 ≥8 个图片位，产物只有 7 个可见 —— 旧判据（>0）会给绿',
    },
    {
      name: 'pics-just-enough [反向]',
      base: 'S03', row: '图片位', state: 'pass',
      mut: (f) => { f.got.imgVisible = 8; },   /* 刚好等于 minPics */
      note: '刚好 8 个 → 必须报 PASS（边界值，防「>=」写成「>」）',
    },
    {
      name: 'pics-minpics-null [跳过]',
      base: 'S03', row: '图片位', state: 'skip',
      mut: (f) => { f.minPics = null; },
      note: 'minitems-parsed.json 缺该案 → 跳过并报出来，不默认放行',
    },
  ];

  let ok = 0;
  const seen = new Map();   /* row → Set(state)，用于最后核对「每条都双向」 */

  for (const c of CASES) {
    const f0 = fx[c.base];
    const f = { prompt: f0.prompt, minPics: f0.minPics, want: clone(f0.want), got: clone(f0.got) };
    try { c.mut(f); } catch (e) { console.log(`? ${c.name}: 变异本身抛错 ${e.message}`); continue; }
    const rows = judge(f.want, f.got, f.prompt, f.minPics);
    const hit = rows.find((r) => r.name === c.row);
    if (!hit) { console.log(`? ${c.name}: 找不到判据「${c.row}」（改名了？）`); continue; }
    if (!seen.has(c.row)) seen.set(c.row, new Set());
    seen.get(c.row).add(hit.state);
    const good = hit.state === c.state;
    if (good) ok++;
    const shown = { pass: 'PASS', fail: 'FAIL', skip: '跳过' }[hit.state];
    const want = { pass: 'PASS', fail: 'FAIL', skip: '跳过' }[c.state];
    console.log(`${good ? '✓' : '✗'} ${c.name.padEnd(30)} —— 触发了 ${shown}（期望 ${want}）  ${c.note}`);
    if (!good) console.log(`    实际 note：${hit.note}`);
  }

  /* 收尾核对：每条判据都必须同时出现过 PASS 与 FAIL。
   * 这条防的是「判据恒真」或「判据恒假」—— 单个变异只能测一个方向。 */
  const CRITERIA = ['分栏结构', '主体栏数', '主轴比例', '标题/正文比', '线宽集合(border)', '线宽档位合规', '配色（提示词给的色）', '图片位'];
  const oneWay = CRITERIA.filter((r) => {
    const s = seen.get(r) || new Set();
    return !(s.has('pass') && s.has('fail'));
  });
  console.log(`\n判据极性核对：${CRITERIA.length - oneWay.length}/${CRITERIA.length} 条判据同时出现过 PASS 与 FAIL`);
  if (oneWay.length) console.log(`  ✗ 只有单向（无法排除恒真/恒假）：${oneWay.join('、')}`);

  console.log(`\n自检：${ok}/${CASES.length} 条变异被对应判据识别`);
  return ok === CASES.length && oneWay.length === 0 ? 0 : 1;
}

if (SELFTEST) {
  const code = await runSelftest();
  process.exit(code);
} else {
  const code = await runAll();
  process.exit(code);
}
