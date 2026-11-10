// 第三版：以**顿号分隔的短句**为单位，从每个短句里抽"行业名词短语"。
// 目标不是 100% 自动，而是：给出一份**可人审的候选表**，把 48 个"用户点不到的词"
// 变成"机器提出来、人确认一次"的清单 —— 这比手写第二份清单可靠得多。
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const ctx = { window: {} }; vm.createContext(ctx);
vm.runInContext(readFileSync('prototypes/_selection/data.js', 'utf8'), ctx);
vm.runInContext(readFileSync('prototypes/_selection/prompts.js', 'utf8'), ctx);
const S = ctx.window.SCHEMES, P = ctx.window.STYLE_PROMPTS;
const posOf = (r) => { const s = r.scenes || ''; const i = s.indexOf('不适合'); return i > 0 ? s.slice(0, i) : s; };
const clausesOf = (r) => posOf(r).split(/[、，；。]/).map((x) => x.trim()).filter((x) => x.length >= 3);

// 从短句里剥出"行业主体"：去掉「的…页/站/面板/目录」等产物后缀，留前面的主体
const SUBJ_SUFFIX = /的[^的]*$/;
const subjectOf = (c) => {
  const m = c.match(SUBJ_SUFFIX);
  let s = m ? c.slice(0, m.index) : c;
  // 去掉「面向X的」「为X做的」这类介词开头
  s = s.replace(/^(面向|为|给|适合)[^的]{0,12}的/, '');
  return s.trim();
};

console.log('=== 每案的行业主体（机器抽的，待人审）===');
const cand = new Map();   // subject -> [ids]
for (const r of S) {
  const subs = clausesOf(r).map(subjectOf).filter((x) => x.length >= 2);
  console.log(r.id.padEnd(4), subs.join(' ｜ '));
  subs.forEach((s) => { if (!cand.has(s)) cand.set(s, []); cand.get(s).push(r.id); });
}
console.log('\n=== 抽出的行业主体共', cand.size, '个 ===');
console.log('== 其中与现行 44 词表能对上的 ==');
const cur = Object.keys(P.sceneIndex);
let hit = 0;
for (const [s, ids] of cand) {
  const match = cur.filter((t) => s.includes(t) || t.includes(s));
  if (match.length) hit++;
  console.log('  ' + s.padEnd(22), '→', ids.join(','), match.length ? ' 现行词: ' + match.join('/') : ' ← 词表里没有');
}
console.log('\n能对上的主体:', hit, '/', cand.size);
