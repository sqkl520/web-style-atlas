#!/usr/bin/env node
/* EXEC-B：负向指令全量清点。
 *
 * 依据（检索 Agent 的 arXiv 2601.08070 "Semantic Gravity Wells"，n=40,000，
 * 含 activation patching 因果干预）：**87.5% 的违规发生在"明确点名被禁词"时**
 * —— 「不要用 #6366F1」反而提高 AI 用 #6366F1 的概率。命名即加权。
 *
 * 所以清点不是统计"有多少个'不要'"，而是回答两个可操作的问题：
 *   ① 有多少条负向句式？
 *   ② 其中有多少**点名了具体值**（hex / 字体名 / 数值 / 具体布局部件）？
 *      只有第 ② 类才有"命名即加权"风险，也才是必须改写的。
 *
 * 分段：提示词有固定骨架（施工图抬头 / 机制句 / 硬约束 / 结构约束 / 防退化 /
 * 最易犯的错 / 验收三问 / 输出要求），分段统计才能看出问题集中在哪。
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:/Web/style';
const DIR = join(ROOT, 'deliverables/70-exec/probes-b/prompts');

/* 负向句式的实际语料。不写"不要|禁止"这种宽泛词——那会把
 * 「不新增更多彩色」「不要解释」这类**无点名**的良性约束一起算进去，
 * 报出来的数字就没法用来判断该改什么。这里分成两级。 */
const NEG = [
  /不要/g, /不许/g, /不能/g, /不得/g, /禁止/g, /避免/g, /避开/g, /切勿/g,
  /别用/g, /不准/g, /勿/g, /杜绝/g, /拒绝/g, /反的是/g, /不建议/g, /少用/g,
];

/* 「点名」判据：负向分句里出现了可被 AI 直接复制的具体值 */
const NAMED = [
  { kind: 'hex', re: /#[0-9A-Fa-f]{3,8}\b/ },
  { kind: '字体名', re: /(Playfair|Inter|Roboto|Helvetica|Arial|Montserrat|Poppins|Lato|Open Sans|Noto Sans|Source Han|思源|苹方|PingFang|微软雅黑|Microsoft YaHei)/ },
  { kind: '数值+单位', re: /[0-9.]+\s*(?:px|em|rem|%|deg|ms|s)\b/ },
  { kind: '具名组件', re: /(轮播|卡片|CTA|emoji|玻璃拟态|毛玻璃|圆角|投影|渐变|发光|霓虹|扫描线|视差|图标|插画|水彩|烫金|暗角|feature)/i },
];

/* 骨架分段：按提示词的固定小标题切。切不到就归入"其他"。 */
const SECTIONS = [
  { name: '开头（施工图抬头）', re: /^下面这份是这个风格的施工图/ },
  { name: '机制句（签名动作）', re: /^这个风格的签名动作：/ },
  { name: '视觉硬约束', re: /^视觉硬约束/ },
  { name: '结构约束', re: /^结构约束：/ },
  { name: '防退化清单', re: /^防退化/ },
  { name: '最易犯的错', re: /^这一案最容易做成的错误样子/ },
  { name: '验收三问', re: /^验收三问/ },
  { name: '输出要求', re: /^输出要求：/ },
];

function sectionsOf(text) {
  const lines = text.split('\n');
  const out = [];
  let cur = { name: '开头（施工图抬头）', lines: [] };
  for (const ln of lines) {
    const hit = SECTIONS.find((s) => s.re.test(ln));
    if (hit) { out.push(cur); cur = { name: hit.name, lines: [ln] }; continue; }
    cur.lines.push(ln);
  }
  out.push(cur);
  return out.filter((s) => s.lines.join('').trim());
}

const files = readdirSync(DIR).filter((f) => /^S\d\d\.txt$/.test(f)).sort();
const perCase = {};
const sectionTally = {};
const namedTally = {};
let totalNeg = 0, totalNamedNeg = 0;

for (const f of files) {
  const id = f.slice(0, 3);
  const text = readFileSync(join(DIR, f), 'utf8');
  const secs = sectionsOf(text);
  perCase[id] = { neg: 0, namedNeg: 0, bySection: {}, items: [] };
  for (const sec of secs) {
    const body = sec.lines.join('\n');
    /* 按句切：中文句号/分号/换行，保留 ① ② 这类条目独立成句 */
    const sentences = body.split(/(?<=[。；\n])/).map((s) => s.trim()).filter(Boolean);
    for (const s of sentences) {
      let cnt = 0;
      for (const re of NEG) { re.lastIndex = 0; const m = s.match(re); if (m) cnt += m.length; }
      if (!cnt) continue;
      perCase[id].neg += cnt; totalNeg += cnt;
      perCase[id].bySection[sec.name] = (perCase[id].bySection[sec.name] || 0) + cnt;
      sectionTally[sec.name] = (sectionTally[sec.name] || 0) + cnt;
      const named = NAMED.filter((n) => n.re.test(s)).map((n) => n.kind);
      const item = { sec: sec.name, text: s.replace(/\s+/g, " ").slice(0, 150), count: cnt, named };
      if (named.length) {
        perCase[id].namedNeg += cnt; totalNamedNeg += cnt;
        for (const k of named) namedTally[k] = (namedTally[k] || 0) + 1;
      }
      perCase[id].items.push(item);
    }
  }
}

console.log("=== 1. 总量 ===");
console.log(`  30 条提示词里的负向指令总数: ${totalNeg}`);
console.log(`  其中点名了具体值的:          ${totalNamedNeg}（占 ${Math.round(totalNamedNeg / totalNeg * 100)}%）`);
console.log(`  平均每案: ${(totalNeg / files.length).toFixed(1)} 条负向 / ${(totalNamedNeg / files.length).toFixed(1)} 条点名`);

console.log("\n=== 2. 按段落分布 ===");
for (const [k, v] of Object.entries(sectionTally).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(v).padStart(4)}  ${k}`);
}
console.log("\n=== 3. 点名了什么（按类型） ===");
for (const [k, v] of Object.entries(namedTally).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(v).padStart(4)}  ${k}`);
}
console.log("\n=== 4. 逐案 ===");
console.log("  案    负向  点名   分布（段落:条数）");
for (const [id, v] of Object.entries(perCase)) {
  const dist = Object.entries(v.bySection).map(([k, n]) => k.replace(/（.*?）/g, "") + ":" + n).join(" ");
  console.log(`  ${id}  ${String(v.neg).padStart(4)}  ${String(v.namedNeg).padStart(4)}   ${dist}`);
}

console.log("\n=== 5. 点名了具体值的负向句（改写目标清单） ===");
const seen = new Map();
for (const [id, v] of Object.entries(perCase)) {
  for (const it of v.items) {
    if (!it.named.length) continue;
    const key = it.text.replace(/\s+/g, " ");
    if (seen.has(key)) { seen.get(key).ids.push(id); continue; }
    seen.set(key, { ...it, ids: [id] });
  }
}
let n = 0;
for (const [key, v] of [...seen.entries()].sort((a, b) => b[1].ids.length - a[1].ids.length)) {
  n++;
  console.log(`  [${n}] ×${v.ids.length}案 (${v.sec})  点名:${v.named.join('/')}`);
  console.log(`      ${key}`);
}
console.log(`\n  去重后共 ${seen.size} 条不同的点名负向句`);

writeFileSync(join(ROOT, 'deliverables/70-exec/probes-b/negative-inventory.json'),
  JSON.stringify({ perCase, sectionTally, namedTally, totalNeg, totalNamedNeg }, null, 1));
console.log("\n已写 deliverables/70-exec/probes-b/negative-inventory.json");
