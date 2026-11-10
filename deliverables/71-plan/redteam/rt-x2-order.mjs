/* 新问题①：palette 的**顺序**不是装饰，两条链都靠位置，而且含义相反。
 *
 * 已知：
 *   · app.js:963        「底色 p[0]　主色 p[1]」   → data.js 的 palette[0] 被标成**底色**
 *   · app.js:945 注释    「primary 恒等于 palette[1]」→ 位置 1 被标成**主色**
 *   · prompt-copy.js:730 「全页色彩面积按本案 palette 的明度顺序分配：**最大面积用第一个值**」
 *                       → 提示词的 palette[0] 被当成**最大面积色**
 *
 * 实测：data.js 的 palette[0] === bg 30/30；prompts 的 palette[0] 只有 7/30 是 bg。
 * 也就是说同一条「palette」数组，第一条链的第 0 项是"背景"，第二条链的第 0 项是"主/最大面积色"。
 *
 * 本探针用**规格原文的面积百分比**当裁判：规格字段 3 明确写了每个色的占比，
 * 「最大面积色」是可客观判定的。谁的第 0 项等于最大面积色，谁的顺序与规格一致。
 *
 *   node deliverables/71-plan/redteam/rt-x2-order.mjs
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { P, ROOT, loadData, loadPrompts, h1, h2 } from './rt-lib.mjs';

const data = loadData();
const prompts = loadPrompts();

const w2 = {};
new Function('window', readFileSync(join(ROOT, 'prototypes/_selection/prompts.js'), 'utf8'))(w2);
const pMap = new Map(prompts.map((s) => [s.id, s]));

/* 从规格字段 3 里抽 (hex, 百分比, 角色词) */
function specAreas(id) {
  const f = join(P, '_specs', id + '.md');
  let txt;
  try { txt = readFileSync(f, 'utf8'); } catch { return null; }
  const m = txt.match(/\*\*配色系统\*\*[：:]([\s\S]*?)(?:\n\n|$)/);
  const body = m ? m[1] : txt.split('\n').find((l) => /配色系统/.test(l)) || '';
  const out = [];
  // 「主色 `#5D43AD` 占 54%」 / 「背景 `#E6EDF2` 占 30%」
  const re = /(主色|背景|底色|强调|辅助|次要|正文|纸色|地面色)[^`]{0,8}`(#[0-9A-Fa-f]{6})`\s*占\s*([\d.]+)\s*%/g;
  for (const x of body.matchAll(re)) {
    out.push({ role: x[1], hex: x[2].toUpperCase(), pct: parseFloat(x[3]) });
  }
  // 反向写法：「`#5D43AD` 占 54%（…主色…）」
  const re2 = /`(#[0-9A-Fa-f]{6})`\s*占\s*([\d.]+)\s*%/g;
  for (const x of body.matchAll(re2)) {
    const hex = x[1].toUpperCase();
    if (out.some((o) => o.hex === hex)) continue;
    out.push({ role: '?', hex, pct: parseFloat(x[2]) });
  }
  return out.length ? out : null;
}

const pal0 = (rawArr) => (rawArr[0] || '').toUpperCase();

h1('palette[0] 的语义冲突：两条链谁与规格一致？');
const rows = [];
for (const s of data) {
  const areas = specAreas(s.id);
  const raw = String((pMap.get(s.id) || {}).dna?.palette || '');
  const pHex = [...raw.matchAll(/#[0-9A-Fa-f]{6}/g)].map((x) => x[0].toUpperCase());
  const d0 = pal0(s.palette || []);
  const p0 = pHex[0] || '';
  const maxArea = areas ? [...areas].sort((a, b) => b.pct - a.pct)[0] : null;
  rows.push({
    id: s.id, bg: (s.bg || '').toUpperCase(), d0, p0, areas, maxArea,
    dIsBg: d0 === (s.bg || '').toUpperCase(),
    dIsMax: maxArea ? d0 === maxArea.hex : null,
    pIsMax: maxArea ? p0 === maxArea.hex : null,
  });
}

console.log('案     data[0]   =bg?  prompts[0] 规格最大面积色  占比   data[0]是最大? prompts[0]是最大?');
console.log('─'.repeat(104));
for (const r of rows) {
  const ma = r.maxArea ? `${r.maxArea.hex}(${r.maxArea.role})` : '（规格无占比）';
  const pct = r.maxArea ? r.maxArea.pct + '%' : '—';
  console.log(
    r.id + '  ' + r.d0 + '  ' + (r.dIsBg ? '✓' : '✗') + '   ' + r.p0 + '   ' +
    ma.padEnd(22) + ' ' + String(pct).padStart(4) + '   ' +
    (r.dIsMax === null ? '  n/a' : (r.dIsMax ? '  ✓  ' : '  ✗  ')) + '        ' +
    (r.pIsMax === null ? 'n/a' : (r.pIsMax ? '✓' : '✗'))
  );
}

const withSpec = rows.filter((r) => r.maxArea);
h2('汇总');
console.log(`能从规格字段 3 抽到面积占比的案：${withSpec.length}/30`);
console.log(`data.js 的 palette[0] === 规格最大面积色 ：${withSpec.filter((r) => r.dIsMax).length}/${withSpec.length}`);
console.log(`prompts 的 palette[0] === 规格最大面积色 ：${withSpec.filter((r) => r.pIsMax).length}/${withSpec.length}`);
console.log(`data.js 的 palette[0] === bg              ：${rows.filter((r) => r.dIsBg).length}/30`);
console.log(`两链 palette[0] 相同                       ：${rows.filter((r) => r.d0 === r.p0).length}/30`);

h2('如果 WP2 让 data.js 采用 prompts 的顺序，会发生什么');
const wrong = rows.filter((r) => r.p0 !== r.bg);
console.log(`app.js:963 用「底色 p[0]」标注：${wrong.length}/30 案的第一个色块会被标成"底色"，而它其实不是本案背景色。`);
console.log(`app.js:965 的兜底「（底色 X）」会在这 ${wrong.length} 案上触发 —— 同一行里出现两个底色。`);
console.log('  实例：');
for (const r of wrong.slice(0, 5)) {
  console.log(`    ${r.id}: 会把 ${r.p0} 标成「底色」，而真实背景是 ${r.bg}`);
}

h2('如果 WP2 让 prompts 采用 data.js 的顺序，会发生什么');
console.log('prompt-copy.js:730「最大面积用第一个值」会把**背景色**当最大面积色。');
const inv = withSpec.filter((r) => {
  const bgArea = (r.areas || []).find((a) => a.hex === r.bg);
  return bgArea && r.maxArea && bgArea.hex !== r.maxArea.hex;
});
console.log(`规格里"最大面积色 ≠ 背景色"的案：${inv.length}/${withSpec.length} —— 这些案子的面积层级会被反转。`);
console.log('  实例：');
for (const r of inv.slice(0, 5)) {
  const bgA = (r.areas || []).find((a) => a.hex === r.bg);
  console.log(`    ${r.id}: 背景 ${r.bg} 占 ${bgA ? bgA.pct : '?'}%，最大面积 ${r.maxArea.hex} 占 ${r.maxArea.pct}% —— 改成背景打头后"最大面积"给了 ${bgA ? bgA.pct : '?'}% 的那个色`);
}

h2('判定');
console.log('顺序不是装饰：两条链都把 palette[0] 当语义位（底色 / 最大面积色），而且指向相反。');
console.log('「合并成单一来源」如果同时要求 A1「30/30 集合一致」，必然要把顺序也统一 ——');
console.log('而无论统一到哪一边，都会让另一边的位置语义变成错的。');
