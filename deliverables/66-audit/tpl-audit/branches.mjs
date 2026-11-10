// 每个词实际落进哪一条文案分支 —— 用来判定「界面说的是不是事实」。
import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = 'D:/Web/style/deliverables/66-audit/tpl-audit';
const rows = JSON.parse(readFileSync(`${ROOT}/matrix.json`, 'utf8'));
const live = JSON.parse(readFileSync(`${ROOT}/live-73.json`, 'utf8'));

const BR = {
  strip_direct: 'strip：有直连方案 + 模板为它写的',
  strip_adj: 'strip：有方案 + 模板仅相邻候选',
  empty_exact: '空状态：明说「模板层有 Mxx」',
  empty_adj: '空状态：模板仅相邻候选 + 免责句',
  empty_none: '空状态：「这套图集和模板层都给不了你」',
  empty_chip: '空状态：搜不到但芯片能筛（并点名 Mxx）',
  rows_only: '有方案行 + 模板层无对应（不挂模板带）',
};

const out = [];
for (const r of rows) {
  const s = live.searched[r.term] || {};
  let br;
  if (s.rows > 0) br = s.stripVisible ? (r.tplExact.length ? 'strip_direct' : 'strip_adj') : 'rows_only';
  else if (/都给不了你/.test(s.emptyTpl || '')) br = 'empty_none';
  else if (/下面只是相邻候选/.test(s.emptyTpl || '')) br = 'empty_adj';
  else if (/但模板层有|另外模板层有/.test(s.emptyTpl || '')) br = 'empty_exact';
  else br = 'other';
  out.push({ term: r.term, branch: br, tplExact: r.tplExact, tplAdj: r.tplAdj, rows: s.rows });
}

const by = {};
for (const o of out) (by[o.branch] = by[o.branch] || []).push(o.term);
for (const [k, v] of Object.entries(by)) console.log(k, '(' + v.length + '):', v.join('、'));
console.log('\n--- 全部「给不了你」的 27 个词 ---');
console.log((by.empty_none || []).join('、'));
writeFileSync(`${ROOT}/branches.json`, JSON.stringify({ out, by }, null, 1), 'utf8');
