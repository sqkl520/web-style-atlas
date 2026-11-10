// 探针：Q4 —— 一条提示词里到底有多少条「独立可执行约束」？其中多少是真关键？
// 方法：把 buildStylePrompt 的实测产物按行切开，逐行判定是否构成一条约束，
// 再按「指令句 / 禁令句 / 背景描述句」分类计数。不猜，全部来自 p-prompts-dump.json。
import { readFileSync } from 'node:fs';

const dump = JSON.parse(readFileSync('D:/Web/style/deliverables/70-plan/critique/p-prompts-dump.json', 'utf8'));
const full = dump.full;
const ids = Object.keys(full).sort();

// 约束判定：一条"约束"= 一个祈使/禁止/硬性数值声明
const RULES = [
  { name: '禁令（不要/不许/不得/禁止/别）', re: /不要|不许|不得|禁止|别用|不得改/ },
  { name: '强制指令（只用/一律/必须/按序/至少）', re: /只用|一律|必须|按序|至少|逐条执行/ },
  { name: '数值阈值（px/%/栏/条/倍）', re: /\d+\s*(?:px|%|栏|条|倍|个)/ },
  { name: '否定式防退化（出现任何一条就重做）', re: /重做/ },
];

const rows = [];
for (const id of ids) {
  const t = full[id];
  const lines = t.split('\n').filter((l) => l.trim());
  let ruleLines = 0;
  const byKind = {};
  for (const r of RULES) byKind[r.name] = 0;
  let numbered = 0;
  for (const l of lines) {
    // 编号条目：① ② 或 1. 2. 或 （1）
    if (/^\s*(?:[①②③④⑤⑥⑦⑧⑨⑩]|\d+[.、]|（\d+）)/.test(l)) numbered++;
    let hit = false;
    for (const r of RULES) if (r.re.test(l)) { byKind[r.name]++; hit = true; }
    if (hit) ruleLines++;
  }
  // 独立约束的更细口径：编号条目数 + 每个编号条目内部的「、」并列项
  let atoms = 0;
  for (const l of lines) {
    if (/^\s*(?:[①②③④⑤⑥⑦⑧⑨⑩]|\d+[.、]|（\d+）)/.test(l)) {
      atoms += Math.max(1, (l.match(/[、，]/g) || []).length + 1) > 1 ? 1 : 1;
    }
  }
  rows.push({ id, lines: lines.length, ruleLines, numbered, byKind });
}

console.log('id   总行 命中规则行 编号条目  禁令 指令 数值 重做');
for (const r of rows) {
  console.log(
    `${r.id} ${String(r.lines).padStart(5)} ${String(r.ruleLines).padStart(10)} ${String(r.numbered).padStart(8)}` +
    ` ${String(r.byKind['禁令（不要/不许/不得/禁止/别）']).padStart(4)}` +
    ` ${String(r.byKind['强制指令（只用/一律/必须/按序/至少）']).padStart(4)}` +
    ` ${String(r.byKind['数值阈值（px/%/栏/条/倍）']).padStart(4)}` +
    ` ${String(r.byKind['否定式防退化（出现任何一条就重做）']).padStart(4)}`
  );
}
const avg = (k) => (rows.reduce((a, r) => a + r[k], 0) / rows.length).toFixed(1);
console.log(`\n平均：总行 ${avg('lines')}，命中规则行 ${avg('ruleLines')}，编号条目 ${avg('numbered')}`);
console.log(`单案编号条目最少 ${Math.min(...rows.map(r => r.numbered))}，最多 ${Math.max(...rows.map(r => r.numbered))}`);
