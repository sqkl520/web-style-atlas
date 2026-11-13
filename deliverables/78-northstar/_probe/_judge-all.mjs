/* 三个对照的统一判定：S31（有数值）/ S99（不存在的风格 + 数值）/ S98（有文字无数值）
 *                        / S97（泛化描述，正对照）
 *
 * 要回答的问题只有一个：
 *   一份提示词能让模型产出多少、多准，取决于「有没有具体数值」，还是「有没有具体指令」？
 *
 * 判定表：
 *   有数值 + 有机制   → S31   预期：产出 + 高命中
 *   有数值 + 无真实原型 → S99   预期：产出 + 高命中（证明数值通道与风格无关）
 *   无数值 + 有机制   → S98   实测：零产物
 *   无数值 + 无机制   → S97   本次：正对照
 *
 * 关键推论：如果 S97 也零产物 → S98 的零产物可能只是「缺具体指令」，
 *           与「数值 vs 文字」无关，我的结论要降一档。
 */
import { readFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const STAGING = join(ROOT, 'deliverables/78-northstar/_probe/_staged');
mkdirSync(STAGING, { recursive: true });

const CASES = [
  { id: 'S31', label: '有数值 + 有机制', want: '产出 + 高命中' },
  { id: 'S99', label: '有数值 + 虚构风格', want: '产出 + 高命中' },
  { id: 'S98', label: '无数值 + 有机制', want: '?' },
  { id: 'S97', label: '无数值 + 无机制', want: '?' },
];

function findOutput(id) {
  for (const n of ['out.html', 'index.html']) {
    const f = join('C:/tmp/bb', id, n);
    if (existsSync(f)) return f;
  }
  return null;
}

function streamStats(id) {
  const f = join('C:/tmp/bb', id, 'stream.jsonl');
  if (!existsSync(f)) return null;
  const lines = readFileSync(f, 'utf8').split('\n').filter((l) => l.trim().startsWith('{'));
  let tools = 0, peak = 0, texts = 0;
  for (const l of lines) {
    let j;
    try { j = JSON.parse(l); } catch { continue; }
    if (j.type === 'system' && j.subtype === 'thinking_tokens') peak = Math.max(peak, j.estimated_tokens || 0);
    if (j.type === 'assistant') {
      for (const x of j.message?.content || []) {
        if (x.type === 'tool_use') tools++;
        if (x.type === 'text' && x.text.trim()) texts++;
      }
    }
  }
  return { lines: lines.length, tools, peak, texts };
}

const { measure } = await import('../../74-q7/measure.mjs');

console.log('案   配置                 行数    thinking  工具  产物      字号比  配色');
console.log('─'.repeat(78));
const results = {};
for (const c of CASES) {
  const st = streamStats(c.id);
  const out = findOutput(c.id);
  let line = `${c.id}  ${c.label.padEnd(20)}`;
  line += st ? String(st.lines).padStart(6) : '  —  ';
  line += st ? String(st.peak).padStart(10) : '     —   ';
  line += st ? String(st.tools).padStart(6) : '  —  ';
  if (out) {
    const bytes = readFileSync(out).length;
    line += `  ${String(bytes).padStart(6)}B`;
    const staged = join(STAGING, `${c.id}-judge.html`);
    copyFileSync(out, staged);
    try {
      const m = await measure(staged);
      line += `  ${String(m.headBodyRatio || '—').padStart(6)}`;
      line += `  ${m.hexes.length}`;
      results[c.id] = { bytes, headBody: m.headBodyRatio, hexes: m.hexes.length };
    } catch (e) {
      line += '  度量失败';
      results[c.id] = { bytes };
    }
  } else {
    line += '       无';
    results[c.id] = null;
  }
  console.log(line);
}

console.log('\n=== 判定 ===');
const s31 = results.S31, s99 = results.S99, s98 = results.S98, s97 = results.S97;

if (s31 && s99) {
  console.log(`有数值的两次都产出了（S31 ${s31.bytes}B / S99 ${s99.bytes}B）→ 数值通道可用。`);
}
if (!s98 && !s97) {
  console.log('无数值的两次都零产物（S98 有机制、S97 无机制）');
  console.log('  ⇒ S98 的零产物不能归因于「数值 vs 文字」，');
  console.log('    而是「没有具体可执行的约束就做不出来」。');
  console.log('  ⇒ 我先前「靠数值不靠文字」的结论要降一档：');
  console.log('    准确说法是「靠具体约束，数值是最有效的那种约束」。');
} else if (!s98 && s97) {
  console.log('S98（有机制、无数值）零产物，但 S97（无机制、无数值）产出了');
  console.log('  ⇒ 反直觉：泛泛的描述反而能做，具体但不带数字的描述做不出来。');
  console.log('  ⇒ 这指向「分析瘫痪」假说：S98 的信息量足够它反复权衡，但不足以收敛。');
} else if (s98 && !s97) {
  console.log('S98 有产物、S97 零产物 → 机制文字本身就足够，数值不是承重墙。');
  console.log('  ⇒ 与上一轮结论矛盾，需要重新检查 S98 的判定。');
} else {
  console.log('两次都有产物 → 数值不是必要条件。S31 的结论可以维持，且更强。');
}
