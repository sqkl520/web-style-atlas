/* 30 案提示词导出 + 逐案长度/文案对照（本轮 66-exec 自己的宿主，不依赖别人的 _harness）。
 *
 * 对照组 = deliverables/66-exec/_out/prompt-copy.BASE.js
 *   —— 它是本轮动手**之前**从磁盘逐字节复制出来的那一份（不是 git HEAD，因为工作区里
 *      已经有上一轮 Agent 未提交的改动，HEAD 会把那些改动也算成"我改坏了"）。
 *
 * 跑：node deliverables/66-exec/_out/cmp.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const ROOT = 'D:/Web/style';
const SEL = join(ROOT, 'prototypes/_selection');
const OUT = join(ROOT, 'deliverables/66-exec/_out');

function load(file) {
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
    readyState: 'loading', addEventListener: noop, removeEventListener: noop,
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

const BASE = load(join(OUT, 'prompt-copy.BASE.js'));
const NEW = load(join(SEL, 'prompt-copy.js'));
const ids = BASE.schemes.map((s) => s.id);
const meta = Object.fromEntries(NEW.schemes.map((s) => [s.id, s]));

const before = {}, after = {};
for (const id of ids) { before[id] = BASE.build(id); after[id] = NEW.build(id); }

for (const d of ['before', 'after']) mkdirSync(join(OUT, d), { recursive: true });
for (const id of ids) {
  writeFileSync(join(OUT, 'before', id + '.txt'), before[id], 'utf8');
  writeFileSync(join(OUT, 'after', id + '.txt'), after[id], 'utf8');
}

const fail = [];
const bad = (m) => { fail.push(m); console.log('  X ' + m); };
const ok = (m) => console.log('  OK ' + m);

/* 1. 无条件版第 2 条是否还在 */
console.log('\n== 1. 无条件版「不留占位符 / 编号连续不跳号」 ==');
const UNCOND = '不留空位、不留占位符、编号连续不跳号';
for (const id of ids) {
  if (after[id].includes(UNCOND)) bad(id + ' 仍含无条件版第 2 条');
}
if (!fail.length) ok('30/30 不再含「' + UNCOND + '」');

/* 2. 刻意留空的案：必须出现「不要补满 / 不要重排编号」 */
console.log('\n== 2. 刻意留空案的限定句 ==');
const VOID = ['S01', 'S02', 'S06', 'S12', 'S19', 'S23', 'S29'];
for (const id of ids) {
  const has = after[id].includes('不要补满、不要删掉、编号不要重排');
  const want = VOID.includes(id);
  if (has !== want) bad(id + ' 限定句 ' + (has ? '多出' : '缺失'));
  else console.log('  ' + id + ' ' + (want ? '有（刻意留空案）' : '无（无空位机制）'));
}

/* 3. 非留空案：普通句必须保留「凑整」与「占位符」的禁令 */
console.log('\n== 3. 普通句仍禁「凑整 / 占位符」 ==');
for (const id of ids) {
  const t = after[id];
  if (!t.includes('不凑整')) bad(id + ' 丢了「不凑整」');
  if (!t.includes('不留占位符')) bad(id + ' 丢了「不留占位符」');
}
ok('30/30 仍含「不凑整」与「不留占位符」');

/* 3b. 留空案的编号：既要有「编号不要重排」，又要**不含**「编号连续不跳号」 */
console.log('\n== 3b. 留空案不得再出现「编号连续不跳号」 ==');
for (const id of VOID) {
  if (after[id].includes('编号连续不跳号')) bad(id + ' 仍有「编号连续不跳号」');
  if (!after[id].includes('编号不要重排')) bad(id + ' 缺「编号不要重排」');
}
if (!fail.length) ok('7/7 留空案：删掉了「编号连续不跳号」，代之以「编号不要重排」');

/* 4. degrades=yes 的案必须保住「不要留空槽 / 整块重排」 */
console.log('\n== 4. degrades=yes 仍保住「不要留空槽」 ==');
const yes = ids.filter((id) => meta[id].degrades === 'yes');
const no = ids.filter((id) => meta[id].degrades !== 'yes');
for (const id of ids) {
  const t = after[id];
  const hasSlot = t.includes('不要留空槽');
  const hasReflow = t.includes('整块重排');
  const hasAuto = t.includes('自动流排版');
  const hasCarve = t.includes('上面说的刻意留空');
  if (yes.includes(id)) {
    if (!hasSlot || !hasReflow || hasAuto) bad(id + ' [yes] 分支不对');
  } else if (!hasAuto || hasSlot) bad(id + ' [no] 分支不对');
  // 留空案必须带括号限定，非留空案必须不带
  if (hasCarve !== VOID.includes(id)) bad(id + ' 第 3 条的括号限定 ' + (hasCarve ? '多出' : '缺失'));
}
console.log('  yes 13 案：' + yes.join(' '));
console.log('  no  17 案：' + no.join(' '));
if (!fail.length) ok('13/13 yes 保住「不要留空槽 + 整块重排」，17/17 no 走自动流分支；括号限定 7 有 / 23 无');

/* 5. 长度 */
console.log('\n== 5. 长度变化 ==');
let maxDelta = 0, maxId = '', minL = 1e9, maxL = 0, allLens = [];
for (const id of ids) {
  const d = after[id].length - before[id].length;
  allLens.push(after[id].length);
  if (Math.abs(d) > Math.abs(maxDelta)) { maxDelta = d; maxId = id; }
  minL = Math.min(minL, after[id].length);
  maxL = Math.max(maxL, after[id].length);
  console.log('  ' + id + ' ' + String(meta[id].minItems).padStart(2) + ' ' +
    String(meta[id].degrades).padEnd(3) + ' ' + before[id].length + ' -> ' + after[id].length +
    '  d' + (d >= 0 ? '+' : '') + d + (VOID.includes(id) ? '  [void]' : ''));
}
allLens.sort((a, b) => a - b);
const median = allLens[Math.floor(allLens.length / 2)];
console.log('  range ' + minL + '-' + maxL + '  median ' + median + '  最大变化 ' + maxId + ' ' + maxDelta);
if (Math.abs(maxDelta) > 60) bad('长度变化超过 +-60：' + maxId + ' ' + maxDelta);
if (minL < 1550 || maxL > 2050) bad('长度越界：' + minL + '-' + maxL);
if (!fail.length) ok('30/30 变化 <= +-60，且全部落在 1550-2050');

/* 6. 结构约束段编号连续性 */
console.log('\n== 6. 结构约束段编号 ==');
for (const id of ids) {
  const seg = after[id].split('结构约束：')[1].split('防退化')[0];
  const nums = [...seg.matchAll(/^(\d)\. /gm)].map((m) => Number(m[1]));
  const want = meta[id].hasReuse ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5];
  if (JSON.stringify(nums) !== JSON.stringify(want)) bad(id + ' 编号 ' + JSON.stringify(nums) + ' 期望 ' + JSON.stringify(want));
}
if (!fail.length) ok('30/30 编号从 1 连续');

console.log('\n' + (fail.length ? ('FAIL ' + fail.length + ' 条') : 'ALL PASS'));
writeFileSync(join(OUT, 'cmp-result.json'), JSON.stringify({
  ids, before, after, meta, fail,
  lens: { min: minL, max: maxL, median, all: allLens }, maxDelta, maxId,
}, null, 1), 'utf8');
process.exit(fail.length ? 1 : 0);
