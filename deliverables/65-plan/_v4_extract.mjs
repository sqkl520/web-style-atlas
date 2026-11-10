// 裁决 1：audit 的「抽取进提示词」规则实测——哪种切法能同时保住语义与字数
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const SEL = resolve('prototypes/_selection');
const t = readFileSync(join(SEL, 'data.js'), 'utf8');
const rows = JSON.parse(t.slice(t.indexOf('= ') + 2).replace(/;\s*$/, ''));

const BASE = { min: 1617, max: 1905 };

// ---- 规则 R0：现状（不进）----
// ---- 规则 R1：只取「跳脱之处」句 ----
const r1 = (a) => {
  const m = a.match(/跳脱之处(?:是|在于)?[：:]?\s*([^。]+)。?/);
  return m ? m[1].trim() : '';
};

// ---- 规则 R2：去掉元叙述前缀，保留每条的设计动作 ----
// 切条目
const splitItems = (a) => {
  let parts = [];
  if (/[①②③④⑤⑥⑦⑧]/.test(a)) {
    parts = a.split(/(?=[①②③④⑤⑥⑦⑧])/).map((s) => s.replace(/^[①②③④⑤⑥⑦⑧]\s*/, '').trim()).filter(Boolean);
  } else if (/（\d）/.test(a)) {
    parts = a.split(/(?=（\d）)/).map((s) => s.replace(/^（\d）\s*/, '').trim()).filter(Boolean);
  } else if (/第[一二三四五六]，/.test(a)) {
    parts = a.split(/(?=第[一二三四五六]，)/).map((s) => s.replace(/^第[一二三四五六]，\s*/, '').trim()).filter(Boolean);
  } else {
    parts = [a];
  }
  return parts;
};
// 去掉「它故意反 C-x.y 与 C-z.w「AI 通病」」这类前缀，保留「——」/「：」/「→」之后的设计动作
const stripMeta = (item) => {
  // 情形 1：以前缀开头，且前缀里含 C-/P- 编号或「反」
  const m = item.match(/^(?:它)?(?:故意)?反(?:的)?(?:是)?[^：—→]{0,120}?(?:——|：|→|:)\s*/);
  if (m) return item.slice(m[0].length).trim();
  return item;
};
const r2 = (a) => splitItems(a).map(stripMeta).filter((s) => s.length > 6).join('；');

// ---- 规则 R3：R2 但只保留「跳脱之处」+ 设计动作里的数字/具体值 ----
// ---- 规则 R4：只取含具体数值的从句 ----
const r4 = (a) => {
  const segs = a.split(/[。；]/).map((s) => s.trim()).filter(Boolean);
  return segs.filter((s) => /\d/.test(s) && !/^第[一二三四五六]/.test(s)).slice(0, 3).join('。');
};

const report = (name, vals) => {
  const lens = vals.map((s) => s.length);
  const nonEmpty = vals.filter(Boolean).length;
  return {
    name,
    nonEmpty,
    empty: 30 - nonEmpty,
    min: Math.min(...lens), p50: lens.slice().sort((a, b) => a - b)[15], max: Math.max(...lens),
    total: lens.reduce((a, b) => a + b, 0),
  };
};

console.log('=== audit 抽取规则的字数结果（30 案）===');
const TABLE = [
  ['原文', (a) => a],
  ['R1 只跳脱句', r1],
  ['R2 去元叙述', r2],
  ['R4 只数值句', r4],
];
for (const [n, f] of TABLE) {
  const s = report(n, rows.map((r) => f(r.audit || '')));
  console.log(`${n.padEnd(14)} 非空 ${String(s.nonEmpty).padStart(2)}/30  空 ${String(s.empty).padStart(2)}  min ${String(s.min).padStart(3)} p50 ${String(s.p50).padStart(3)} max ${String(s.max).padStart(3)} 合计 ${String(s.total).padStart(5)}`);
}

console.log('\n=== R2 逐案（去元叙述后）===');
for (const r of rows) {
  const v = r2(r.audit || '');
  console.log(`${r.id} 原${String(r.audit.length).padStart(3)} → R2 ${String(v.length).padStart(3)} | ${v.slice(0, 70)}`);
}

console.log('\n=== R2 的提示词投影（在 risk 段后插入，前缀 16 字）===');
const promptLens = JSON.parse(readFileSync(resolve('deliverables/65-plan/_v_out/promptlen.json'), 'utf8')).lens;
for (const [n, f] of TABLE) {
  const L = rows.map((r, i) => promptLens[i] + 16 + f(r.audit || '').length);
  console.log(`${n.padEnd(14)} min ${Math.min(...L)} max ${Math.max(...L)} avg ${Math.round(L.reduce((a, b) => a + b, 0) / 30)}  超1905 ${L.filter((x) => x > 1905).length}/30`);
}

console.log('\n=== 检查 R2 有没有把「反什么」全丢掉（保真度抽查 5 案）===');
for (const id of ['S01', 'S13', 'S20', 'S28', 'S05']) {
  const r = rows.find((x) => x.id === id);
  console.log(`\n[${id}] 原文 ${r.audit.length} 字`);
  console.log('原文: ' + r.audit.slice(0, 150));
  console.log('R2  : ' + r2(r.audit));
}
