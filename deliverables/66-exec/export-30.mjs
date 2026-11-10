/* 30 案提示词导出 + 结构约束段自洽性检查（本轮验收 2/3/4/5 的机器部分）。
 *
 * 为什么自己写宿主而不复用 deliverables/65-exec/_harness.mjs：
 *  那个文件是另一个 Agent 的，本轮 4 个只读 Agent 也在读同一个仓库 —— 依赖别人文件的人
 *  会在别人重写它的时候静默坏掉（这个仓库记录过「两份副本静默分叉」的老毛病）。
 *  这里只做一件极简的事：给 window/document 空壳，按 index.html 的顺序装载
 *  data.js → prompts.js → prompt-copy.js。
 *
 * 对照组来自 deliverables/66-exec/_out/prompt-copy.HEAD.js，它由
 *   `git show HEAD:prototypes/_selection/prompt-copy.js` 取出（实测与磁盘逐字节相同）。
 *  对照组必须是 git 里的那一份，不能是我记忆里的那一份。
 *
 * 跑：node deliverables/66-exec/export-30.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const ROOT = 'D:/Web/style';
const SEL = join(ROOT, 'prototypes/_selection');
const OUT = join(ROOT, 'deliverables/66-exec/_out');
mkdirSync(OUT, { recursive: true });

function loadPromptCopy(file) {
  const win = {};
  win.window = win;
  const noop = () => {};
  const el = () => ({
    style: { cssText: '' }, setAttribute: noop, getAttribute: () => null,
    appendChild: noop, insertBefore: noop, addEventListener: noop,
    querySelector: () => null, querySelectorAll: () => [], classList: { add: noop, remove: noop, toggle: noop },
    textContent: '', innerHTML: '', remove: noop, parentNode: { appendChild: noop },
  });
  const doc = {
    readyState: 'loading',
    addEventListener: noop, removeEventListener: noop,
    createElement: el, getElementById: () => null,
    querySelector: () => null, querySelectorAll: () => [],
    body: { appendChild: noop, removeChild: noop },
  };
  const ctx = vm.createContext({ window: win, document: doc, console, navigator: {}, setTimeout, clearTimeout });
  for (const f of ['data.js', 'prompts.js']) {
    vm.runInContext(readFileSync(join(SEL, f), 'utf8'), ctx, { filename: f });
  }
  vm.runInContext(readFileSync(file, 'utf8'), ctx, { filename: file });
  return {
    build: win.buildStylePrompt,
    schemes: win.STYLE_PROMPTS.schemes.map((s) => ({
      id: s.id, minItems: s.minItems, minPics: s.minPics,
      degrades: s.capacity && s.capacity.degrades,
      hasReuse: !!(s.dna && s.dna.reuse),
    })),
  };
}

const OLD = loadPromptCopy(join(OUT, 'prompt-copy.HEAD.js'));
const NEW = loadPromptCopy(join(SEL, 'prompt-copy.js'));
const ids = OLD.schemes.map((s) => s.id);
if (JSON.stringify(ids) !== JSON.stringify(NEW.schemes.map((s) => s.id))) {
  console.error('两版案号不一致，下面的逐案 diff 无意义'); process.exit(2);
}

const meta = Object.fromEntries(NEW.schemes.map((s) => [s.id, s]));
let fail = 0;
const bad = (msg) => { fail++; console.log('  ✗ ' + msg); };
const ok = (msg) => console.log('  ✓ ' + msg);

/* ── 1. 导出 30 案全文（未填 / 已填两态），并逐案 diff ─────────────────── */
const BIZ = '一家只做手冲的咖啡店，5 个产区的豆子，加微信订、不做在线支付';
const ACTION = '看完就想问价，能直接加微信';

const before = {}, after = {}, beforeFilled = {}, afterFilled = {};
for (const d of ['before', 'after', 'before-filled', 'after-filled']) mkdirSync(join(OUT, d), { recursive: true });
for (const id of ids) {
  before[id] = OLD.build(id);
  after[id] = NEW.build(id);
  beforeFilled[id] = OLD.build(id, { biz: BIZ, action: ACTION });
  afterFilled[id] = NEW.build(id, { biz: BIZ, action: ACTION });
  writeFileSync(join(OUT, 'before', id + '.txt'), before[id], 'utf8');
  writeFileSync(join(OUT, 'after', id + '.txt'), after[id], 'utf8');
  writeFileSync(join(OUT, 'before-filled', id + '.txt'), beforeFilled[id], 'utf8');
  writeFileSync(join(OUT, 'after-filled', id + '.txt'), afterFilled[id], 'utf8');
}

/* ── 2. 验收 2：不得把设计规模说成用户的内容量 ─────────────────────────── */
console.log('== 验收 2：假前提措辞 ==');
/* 这两类都要挡：
 *  · 「我实际有 N 个条目，就排 N 个」—— 直接宣称用户有 N 个；
 *  · 「我实际有」这个短语本身 —— 即使后面跟的是别的话，读者第一眼也是"这个人在报数"。
 * 另外把「先凑到 N 个」「先凑够」「凑整」这类"让用户去凑"的说法也扫一遍：
 * 本轮修的就是"系统替用户编一个量"的病，换个说法复发就不算修好。 */
const BANNED = [
  [/我实际有/g, '「我实际有」——把设计规模写成用户的内容量'],
  [/就排\s*\d+\s*个/g, '「就排 N 个」——同上，命令句形态'],
  [/先凑到|先凑够|先凑齐/g, '「先凑到 N 个」——要求用户去凑数'],
];
for (const [re, why] of BANNED) {
  const hit = ids.filter((id) => re.test(after[id]));
  if (hit.length) bad(why + ' 命中 ' + hit.length + ' 案：' + hit.join(' '));
  else ok(why + '：30/30 未命中');
}
/* 对照组复现：证明这个措辞在改动前确实存在（不是我修了一个不存在的问题） */
const oldHit = ids.filter((id) => /我实际有/.test(before[id]));
console.log('    改动前命中「我实际有」：' + oldHit.length + ' 案');
console.log('    S07 改动前那句：' + (before.S07.split('\n').find((l) => /我实际有/.test(l)) || '(无)').trim());

/* ── 3. 验收 3：结构约束段自洽（互斥指令不得并存）─────────────────────── */
console.log('\n== 验收 3：结构约束段互斥指令 ==');
/* 互斥对：一边说"按你真实数量，别凑"、另一边说"先凑到 N 个"。
 * 上一轮记录的缺陷正是这两句同时出现在 13/30 案里。 */
const MUTEX = [
  { a: /按你(?:自己)?的真实|用你自己的真实|有几个排几个/, b: /先凑到|先凑够|凑数填满|拉高/, name: '真实数量 vs 先凑到 N 个' },
  { a: /不(?:要)?留空位|不留空位/, b: /留(?:空槽|空位)/, name: '不留空位 vs 留空槽' },
];
for (const m of MUTEX) {
  const hit = ids.filter((id) => {
    const seg = structureSection(after[id]);
    return m.a.test(seg) && m.b.test(seg);
  });
  /* 「不留空位」与「留空槽」这对是**假互斥**：一条禁令 + 一条禁止做某事的说明里都可能出现。
   * 所以第二对只做提示，不做判定；判定只用第一对。 */
  if (m.name === '不留空位 vs 留空槽') {
    console.log('  · ' + m.name + '：' + hit.length + ' 案同时出现（只做提示，见交付物说明）');
    continue;
  }
  if (hit.length) bad(m.name + ' 同时出现：' + hit.join(' '));
  else ok(m.name + '：30/30 无并存');
}
/* 结构约束段的条目编号必须从 1 开始连续 —— 中间跳号会让 AI 以为漏了一条。 */
const numProblems = [];
for (const id of ids) {
  const nums = [...structureSection(after[id]).matchAll(/^(\d)\. /gm)].map((m) => +m[1]);
  for (let i = 0; i < nums.length; i++) if (nums[i] !== i + 1) { numProblems.push(id + ':' + nums.join(',')); break; }
}
if (numProblems.length) bad('结构约束段编号不连续：' + numProblems.join(' '));
else ok('结构约束段编号 30/30 从 1 连续');
/* 顺带把"这一段到底有几条"摊开：reuse 缺失的 9 案会少最后一条，这是数据事实不是缺陷。 */
const counts = {};
for (const id of ids) { const n = ([...structureSection(after[id]).matchAll(/^(\d)\. /gm)]).length; counts[n] = (counts[n] || 0) + 1; }
console.log('    条目数分布：' + Object.entries(counts).map(([k, v]) => k + ' 条×' + v + ' 案').join('，') +
  '（缺最后一条的正是 dna.reuse 为空的案）');

/* ── 4. 验收 4：长度 ──────────────────────────────────────────────────── */
console.log('\n== 验收 4：长度 ==');
const lenBefore = ids.map((id) => before[id].length);
const lenAfter = ids.map((id) => after[id].length);
const minB = Math.min(...lenBefore), maxB = Math.max(...lenBefore);
const minA = Math.min(...lenAfter), maxA = Math.max(...lenAfter);
let worst = 0, worstId = '';
for (const id of ids) {
  const d = after[id].length - before[id].length;
  if (Math.abs(d) > Math.abs(worst)) { worst = d; worstId = id; }
}
const over80 = ids.filter((id) => Math.abs(after[id].length - before[id].length) > 80);
const outBand = ids.filter((id) => after[id].length < 1550 || after[id].length > 2000);
console.log('    改动前区间 ' + minB + '–' + maxB + '，改动后 ' + minA + '–' + maxA);
console.log('    最大变化 ' + worstId + ' ' + (worst >= 0 ? '+' : '') + worst);
if (over80.length) bad('变化超过 ±80：' + over80.map((id) => id + (after[id].length - before[id].length)).join(' '));
else ok('30/30 变化 ≤ ±80');
if (outBand.length) bad('越出 1550–2000：' + outBand.map((id) => id + '=' + after[id].length).join(' '));
else ok('30/30 仍在 1550–2000');

/* ── 5. 验收 5：degrades 分岔仍然生效 ─────────────────────────────────── */
console.log('\n== 验收 5：degrades 分岔 ==');
const yes = ids.filter((id) => meta[id].degrades === 'yes');
const no = ids.filter((id) => meta[id].degrades === 'no');
console.log('    degrades=yes ' + yes.length + ' 案：' + yes.join(' '));
console.log('    degrades=no  ' + no.length + ' 案：' + no.join(' '));
/* 分岔判据不能只看"两句不同"——那太松。要各自命中自己的关键词，且**不**命中对方的。 */
const YES_MARK = /少一个就空一格/;
const NO_MARK = /自动流排版/;
const wrongYes = yes.filter((id) => !YES_MARK.test(structureSection(after[id])) || NO_MARK.test(structureSection(after[id])));
const wrongNo = no.filter((id) => !NO_MARK.test(structureSection(after[id])) || YES_MARK.test(structureSection(after[id])));
if (yes.length !== 13) bad('degrades=yes 不是 13 案');
else ok('degrades=yes = 13 案');
if (no.length !== 17) bad('degrades=no 不是 17 案');
else ok('degrades=no = 17 案');
if (wrongYes.length) bad('yes 案分岔句不对：' + wrongYes.join(' '));
else ok('13/13 yes 案命中"少一个就空一格"分支且不含"自动流排版"');
if (wrongNo.length) bad('no 案分岔句不对：' + wrongNo.join(' '));
else ok('17/17 no 案命中"自动流排版"分支且不含"少一个就空一格"');
/* 同一案内不得两句话都出现（那等于没分岔） */
const both = ids.filter((id) => YES_MARK.test(structureSection(after[id])) && NO_MARK.test(structureSection(after[id])));
if (both.length) bad('同时出现两种分岔：' + both.join(' '));
else ok('30/30 每案只有一种分岔');

/* ── 6. 落盘：逐案长度表 + 三案全文 ───────────────────────────────────── */
const table = ids.map((id) => ({
  id, minItems: meta[id].minItems, degrades: meta[id].degrades,
  before: before[id].length, after: after[id].length, delta: after[id].length - before[id].length,
  filledBefore: beforeFilled[id].length, filledAfter: afterFilled[id].length,
}));
writeFileSync(join(OUT, 'lengths.json'), JSON.stringify(table, null, 1), 'utf8');
writeFileSync(join(OUT, 'lengths.tsv'),
  'id\tminItems\tdegrades\tbefore\tafter\tdelta\tfilledBefore\tfilledAfter\n' +
  table.map((r) => [r.id, r.minItems, r.degrades, r.before, r.after, r.delta, r.filledBefore, r.filledAfter].join('\t')).join('\n') + '\n',
  'utf8');

console.log('\n== 逐案长度：改动前 → 改动后（Δ）==');
for (const r of table) {
  console.log(r.id + '  minItems=' + String(r.minItems).padStart(2) + '  ' + r.degrades.padEnd(3) +
    '  ' + String(r.before).padStart(4) + ' → ' + String(r.after).padStart(4) + '  Δ' +
    (r.delta >= 0 ? '+' : '') + r.delta);
}
/* 中位数有两种口径，两个都报，别让读者拿一个去对另一个：
 *   check-docs.mjs:398 取 sorted[floor(n/2)] —— 30 个元素时是**上中位**（第 16 个），
 *   我原来取 (sorted[14]+sorted[15])/2 —— **均值中位**。
 * 两者在基线差 8（1806/1822），README 的「中位 1822」是按 check-docs 的口径写的。
 * 交付物里必须两个都给，否则我算的中位和闸门算的中位对不上会被当成改动引入的差异。 */
const medHi = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const medAvg = (a) => { const s = [...a].sort((x, y) => x - y); return (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
console.log('\n中位（check-docs 口径 = 上中位）：改动前 ' + medHi(lenBefore) + ' → 改动后 ' + medHi(lenAfter));
console.log('中位（均值口径）：                  改动前 ' + medAvg(lenBefore) + ' → 改动后 ' + medAvg(lenAfter));

console.log('\n== 汇总 ==');
console.log(fail ? '失败 ' + fail + ' 项' : '全部通过');
process.exit(fail ? 1 : 0);

/* ── 工具：截出「结构约束：」到下一个空行段落之间的那一段 ─────────────── */
function structureSection(text) {
  const lines = text.split('\n');
  const i = lines.findIndex((l) => l.trim() === '结构约束：');
  if (i < 0) return '';
  const seg = [];
  for (let j = i + 1; j < lines.length; j++) {
    if (lines[j].trim() === '') break;
    seg.push(lines[j]);
  }
  return seg.join('\n');
}
