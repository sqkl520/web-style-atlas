#!/usr/bin/env node
/* EXEC-B：评估"在模板层改造 d.risk 那句话"能去掉多少点名负向，以及会不会丢信息。
 *
 * d.risk 原文在 data.js（**不在本 Agent 的可改范围**：只能改 _prompts/、
 * prompts.js、prompt-copy.js）。所以逐案改原文是不允许的。
 * 允许的是在 prompt-copy.js 的模板层做**统一变换**。
 *
 * 本探针比较三种模板层变换：
 *   T0 原样输出
 *   T1 只去掉"最容易滑向「X」…"这句导语（X 就是被点名的退化风格）
 *   T2 T1 + 把"规避动作"里的禁止动词分句删掉
 * 对每种统计：点名负向条数、字符数、以及**保留了多少个可机械复核的数字约束**。
 * 数字约束（0.4px、24%、3:7…）是这句话里真正有信息量的部分，掉一个就是真丢信息。
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:/Web/style';
const all = JSON.parse(readFileSync(join(ROOT, 'deliverables/70-exec/probes-b/prompts-all.json'), 'utf8'));

/* 从提示词里取 risk 行，反推原文（模板层拿到的是 d.risk 原文，带"这一案…："前缀） */
function riskBody(text) {
  const line = (text.split('\n') || []).find((l) => l.startsWith('这一案最容易做成'));
  if (!line) return null;
  return line.replace(/^这一案最容易做成的错误样子（作者原话，务必避开）：/, '');
}

/* T1：砍掉导语，只留"规避动作…"及其后 */
function t1(body) {
  const i = body.indexOf('规避动作');
  if (i < 0) return body;
  return body.slice(i);
}

/* T2：T1 + 删除以"禁止/不得/不许/不允许/禁用"开头的分句（按，；。①②③…切分） */
function t2(body) {
  const base = t1(body);
  const parts = base.split(/(?<=[，；。、])/);
  const kept = parts.filter((p) => {
    const s = p.replace(/^[①②③④⑤⑥⑦⑧（(]\d?[）)]?/, '').trim();
    return !/^(禁止|不得|不许|不允许|禁用|勿|杜绝)/.test(s);
  });
  return kept.join('');
}

const NUM = /(?:[0-9]+(?:\.[0-9]+)?\s*(?:px|%|°|mm|cm|:)|[0-9]+:[0-9]+)/g;
const NEGVERB = /禁止|不得|不许|不允许|禁用|杜绝|不要|切勿/g;
const NAMED = /#[0-9A-Fa-f]{3,8}\b|(?:Playfair|Inter|Roboto)|(?:Sepia|ASCII|Neumorphism|clip-path|noise|grain|texture overlay)/gi;

const rows = [];
for (const id of Object.keys(all).sort()) {
  const body = riskBody(all[id].text);
  if (!body) continue;
  const variants = { T0: body, T1: t1(body), T2: t2(body) };
  const stat = {};
  for (const [k, v] of Object.entries(variants)) {
    stat[k] = {
      len: v.length,
      neg: (v.match(NEGVERB) || []).length,
      named: (v.match(NAMED) || []).length,
      nums: [...new Set((v.match(NUM) || []).map((s) => s.replace(/\s+/g, "")))],
    };
  }
  rows.push({ id, stat, body });
}

const sum = (k) => rows.reduce((s, r) => s + r.stat[k].neg, 0);
const sumNamed = (k) => rows.reduce((s, r) => s + r.stat[k].named, 0);
const lenAvg = (k) => Math.round(rows.reduce((s, r) => s + r.stat[k].len, 0) / rows.length);

console.log("=== d.risk 一句话在三种模板层变换下的指标（30 案合计）===");
console.log("变换   负向动词  点名值  平均字数");
for (const k of ["T0", "T1", "T2"]) {
  console.log(`${k}     ${String(sum(k)).padStart(6)}  ${String(sumNamed(k)).padStart(6)}  ${String(lenAvg(k)).padStart(6)}`);
}

/* 数字约束是否丢失 —— 这是判断"信息量有没有减"的硬判据 */
console.log("\n=== 数字约束保留情况（每个数字都是一个可机械复核的约束）===");
let lostT1 = 0, lostT2 = 0;
const examples = [];
for (const r of rows) {
  const base = new Set(r.stat.T0.nums);
  const m1 = r.stat.T1.nums.filter((n) => !base.has(n));
  const lost1 = [...base].filter((n) => !r.stat.T1.nums.includes(n));
  const lost2 = [...base].filter((n) => !r.stat.T2.nums.includes(n));
  if (lost1.length) { lostT1 += lost1.length; examples.push([r.id, 'T1', lost1]); }
  if (lost2.length) { lostT2 += lost2.length; examples.push([r.id, 'T2', lost2]); }
}
console.log(`  T1 丢失数字约束: ${lostT1} 个`);
console.log(`  T2 丢失数字约束: ${lostT2} 个`);
for (const [id, t, ls] of examples.slice(0, 12)) console.log(`    ${id} ${t} 丢了: ${ls.join(', ')}`);

console.log("\n=== 样例：S19 ===");
const s19 = rows.find((r) => r.id === 'S19');
for (const k of ["T0", "T1", "T2"]) {
  console.log(`\n  [${k}] (${s19.stat[k].len}字, 负向${s19.stat[k].neg}, 点名${s19.stat[k].named})`);
  console.log("  " + s19.stat[k] === undefined ? "" : "  " + ({ T0: s19.body, T1: t1(s19.body), T2: t2(s19.body) })[k]);
}
