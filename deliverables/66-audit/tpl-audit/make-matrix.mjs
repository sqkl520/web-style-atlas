// 把矩阵与实测文案合成一份可直接粘进报告的 TSV。
import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = 'D:/Web/style/deliverables/66-audit/tpl-audit';
const rows = JSON.parse(readFileSync(`${ROOT}/matrix.json`, 'utf8'));
const live = JSON.parse(readFileSync(`${ROOT}/live-73.json`, 'utf8'));

const L = [];
for (const r of rows) {
  const s = live.searched[r.term] || {};
  const c = live.chipped[r.term];
  const scheme = r.inIndex
    ? (r.direct || []).length ? `直连 ${r.direct.join(' ')}` : `近似 ${(r.near || []).join(' ')}`
    : '—（unsupported）';
  const tpl = r.tplExact.length ? `直连 ${r.tplExact.join(' ')}` : r.tplAdj.length ? `近似 ${r.tplAdj.join(' ')}` : '—';
  const head = s.emptyTpl
    ? (s.emptyTpl.match(/^[^：]*：?/) || [''])[0].slice(0, 46)
    : s.stripLead ? s.stripLead.slice(0, 46) : '';
  L.push([r.term, scheme, tpl, String(s.rows), c ? String(c.rows) : '-', head].join('\t'));
}
writeFileSync(`${ROOT}/matrix.tsv`, L.join('\n'), 'utf8');

// 统计
const stat = {
  total: rows.length,
  schemeDirect: rows.filter((r) => (r.direct || []).length).length,
  schemeNearOnly: rows.filter((r) => r.inIndex && !(r.direct || []).length).length,
  schemeNone: rows.filter((r) => !r.inIndex).length,
  tplExact: rows.filter((r) => r.tplExact.length).length,
  tplAdjOnly: rows.filter((r) => !r.tplExact.length && r.tplAdj.length).length,
  tplNone: rows.filter((r) => !r.tplExact.length && !r.tplAdj.length).length,
  bothNone: rows.filter((r) => !r.inIndex && !r.tplExact.length && !r.tplAdj.length).length,
  searchZero: rows.filter((r) => (live.searched[r.term] || {}).rows === 0).length,
  chipOnlyHit: rows.filter((r) => live.chipped[r.term] && (live.searched[r.term] || {}).rows === 0).map((r) => r.term),
};
console.log(JSON.stringify(stat, null, 1));
writeFileSync(`${ROOT}/stats.json`, JSON.stringify(stat, null, 1), 'utf8');
console.log(L.slice(0, 8).join('\n'));
