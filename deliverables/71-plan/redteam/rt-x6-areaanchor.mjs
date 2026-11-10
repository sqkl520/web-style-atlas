/* 核心新问题：prompt-copy.js 把 palette[0] 当「最大面积色」用，但 prompts.js 的 palette[0] 是**主色**。
 *
 * 三处位置语义，同一个字段名：
 *   app.js:945/963         data.js: palette[0]=底色, palette[1]=主色   （ad69f20 的 R2/R3 锁住了）
 *   clean-dna.mjs:1041-45  prompts: palette[0]=主色（注释原话「主色在前」）
 *   prompt-copy.js:730     prompts: palette[0] **= 最大面积色**
 *                          「全页色彩面积按本案 palette 的明度顺序分配：最大面积用第一个值」
 *
 * 后两者直接矛盾：palette[0] 是"主色/强调色"，不等于"占屏面积最大的色"。
 * 用规格字段 3 的面积百分比当裁判：在背景面积 > 主色面积的案子里，
 * 这句话会让 AI 把最大面积给一个少数色。
 *
 *   node deliverables/71-plan/redteam/rt-x6-areaanchor.mjs
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { P, ROOT, h1, h2 } from './rt-lib.mjs';

const SEL = join(P, '_selection');

/* 跑真 prompt-copy.js，取「防退化」那一段原文 */
function buildAll() {
  const win = {};
  global.window = win;
  global.document = {
    readyState: 'complete', addEventListener() {}, querySelector: () => null,
    querySelectorAll: () => [], getElementById: () => null,
    createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, remove() {}, addEventListener() {} }),
  };
  const sandbox = { window: win };
  vm.createContext(sandbox);
  sandbox.document = global.document;
  for (const f of ['data.js', 'prompts.js', 'prompt-copy.js']) {
    vm.runInContext(readFileSync(join(SEL, f), 'utf8'), sandbox, { filename: f });
  }
  return win;
}
const win = buildAll();
const build = win.buildStylePrompt;
const data = win.SCHEMES;
const prompts = win.STYLE_PROMPTS.schemes;

const HEX = /#([0-9A-Fa-f]{6})(?![0-9A-Fa-f])/g;
const hexes = (s) => [...new Set([...String(s).matchAll(HEX)].map((m) => m[0].toUpperCase()))];
const pMap = new Map(prompts.map((s) => [s.id, s]));

/* 从规格字段 3 抽面积 */
function specAreas(id) {
  const f = join(P, '_specs', id + '.md');
  let txt; try { txt = readFileSync(f, 'utf8'); } catch { return null; }
  const i = txt.search(/配色系统/);
  if (i < 0) return null;
  const body = txt.slice(i, i + 1200);
  const out = [];
  for (const seg of body.split(/[；。]/)) {
    if (!/\d+(?:\.\d+)?\s*%/.test(seg)) continue;
    const m = seg.match(/#([0-9A-Fa-f]{6})/);
    const p = seg.match(/(\d+(?:\.\d+)?)\s*%/);
    if (m && p) out.push({ hex: ('#' + m[1]).toUpperCase(), pct: parseFloat(p[1]), seg: seg.trim().slice(0, 60) });
  }
  return out.length ? out : null;
}

h1('提示词「最大面积用第一个值」 vs 规格的面积百分比');
console.log('被审的那句（prompt-copy.js:730 生成，30 案都含）：');
let sample = build('S24') || '';
const line = sample.split('\n').find((l) => /最大面积用第一个值/.test(l));
console.log('  ' + (line || '(未找到)').trim());
console.log('');

const rows = [];
for (const d of data) {
  const areas = specAreas(d.id);
  if (!areas) continue;
  const p = pMap.get(d.id) || {};
  const pal = hexes((p.dna || {}).palette);
  const p0 = pal[0] || '';
  const maxArea = [...areas].sort((a, b) => b.pct - a.pct)[0];
  const p0Area = areas.find((a) => a.hex === p0);
  rows.push({ id: d.id, p0, maxArea, p0Area, areas });
}
console.log('案     pal[0]      pal[0]占比  最大面积色   最大占比  一致?');
console.log('─'.repeat(76));
let bad = 0;
for (const r of rows) {
  const okk = r.maxArea.hex === r.p0;
  if (!okk) bad++;
  console.log(`${r.id}   ${r.p0}   ${String(r.p0Area ? r.p0Area.pct + '%' : '—').padStart(6)}     ${r.maxArea.hex}    ${String(r.maxArea.pct + '%').padStart(6)}    ${okk ? '✓' : '✗ 矛盾'}`);
}
h2('汇总');
console.log(`能从规格抽到面积比的案：${rows.length}`);
console.log(`palette[0] 就是最大面积色的：${rows.length - bad}/${rows.length}`);
console.log(`palette[0] 不是最大面积色的：${bad}/${rows.length}   ← 这些案子里那句话给了错的指令`);

if (bad) {
  h2('矛盾案的原文证据');
  for (const r of rows.filter((x) => x.maxArea.hex !== x.p0)) {
    console.log(`\n${r.id}`);
    console.log(`  提示词说：最大面积用第一个值 = ${r.p0}`);
    console.log(`  规格说  ：${r.maxArea.hex} 占 ${r.maxArea.pct}% 是最大面积`);
    if (r.p0Area) console.log(`  而 ${r.p0} 在规格里只占 ${r.p0Area.pct}%`);
    for (const a of r.areas) console.log(`     · ${a.hex} ${a.pct}%  ${a.seg}`);
  }
}

h2('判定');
console.log('`prompt-copy.js:730` 把 palette[0] 当「最大面积色」，而 `clean-dna.mjs` 把 palette[0]');
console.log('定义成「主色/强调色」（注释原话：「主色在前：提示词第一条就点名主色」）。');
console.log(`在 ${bad}/${rows.length} 个可测案里，这两个身份不是同一个色，于是提示词把最大面积指给了少数色。`);
console.log('');
console.log('这条**不在 ad69f20 的 R1–R5 覆盖范围内**：R2/R3 锁的是 data.js 的位置语义，');
console.log('没有任何断言检查「prompt-copy 的面积规则」与「palette[0] 的身份」是否自洽。');
