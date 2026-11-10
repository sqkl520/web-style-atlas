// 探针 20：字段 8 体量差异成因 —— S01–S10 vs S11–S20 的写法差异，而不只是字数
import { readSpec, specIds, dec } from './lib-load.mjs';

const NAME = '([^\\n：*\\d][^\\n：*]{0,38}?)';
const RES = [
  new RegExp('^(\\d{1,2})(-附|[.．])\\s*' + NAME + '：', 'gm'),
  new RegExp('^\\*\\*(\\d{1,2})(-附)?[.．]?\\s*' + NAME + '\\*\\*\\s*$', 'gm'),
  new RegExp('^(\\d{1,2})(-附)?[.．]?\\s*\\*\\*' + NAME + '\\*\\*\\s*[：:]', 'gm'),
];
function field8raw(id) {
  const text = readSpec(id);
  const s = [];
  for (const re of RES) for (const m of text.matchAll(re)) s.push({ i: m.index, end: m.index + m[0].length, key: m[3] });
  s.sort((a, b) => a.i - b.i);
  const byLine = new Map();
  for (const x of s) { const ln = text.lastIndexOf('\n', x.i) + 1; if (!byLine.has(ln)) byLine.set(ln, x); }
  const st = [...byLine.values()].sort((a, b) => a.i - b.i);
  const idx = st.findIndex((x) => x.key.replace(/（[^）]*）/g, '').trim() === '去 AI 味审查点');
  const raw = text.slice(st[idx].end, st[idx + 1].i);
  return raw;
}

console.log('案号\t原始字数\t行数\t空行数\t最长行\t编号样式\t每条约字数');
for (const id of specIds()) {
  const raw = field8raw(id);
  const lines = raw.split(/\r?\n/);
  const nonEmpty = lines.filter((l) => l.trim());
  const maxLen = Math.max(...nonEmpty.map((l) => dec(l).length));
  // 编号样式判定
  const t = dec(raw);
  let style = '?';
  if (/[①②③④⑤⑥⑦⑧⑨]/.test(t)) style = '①②③';
  else if (/（1）|\(1\)/.test(t)) style = '（1）';
  else if (/第一[，、]|第二[，、]|第三[，、]|第四[，、]/.test(t)) style = '第一/第二';
  else if (/^\s*[1-9][.．]/.test(t)) style = '1.';
  const nItems = Math.max(
    (t.match(/[①②③④⑤⑥⑦⑧⑨]/g) || []).length,
    (t.match(/（\d）/g) || []).length,
    (t.match(/第[一二三四五六]，/g) || []).length
  );
  console.log(`${id}\t${dec(raw).length}\t${lines.length}\t${lines.length - nonEmpty.length}\t${maxLen}\t${style}\t${nItems ? Math.round(dec(raw).length / nItems) : '—'}`);
}

console.log('\n=== S01 与 S11 字段 8 原文对照 ===');
for (const id of ['S01', 'S11', 'S13']) {
  console.log('\n--- ' + id + ' ---');
  console.log(field8raw(id).trim().slice(0, 900));
}
