// 生成任务 1 的完整词表（Markdown），数字全部来自实测 JSON，不手抄。
import fs from 'node:fs';

const OUT = 'D:/Web/style/deliverables/69-audit';
const raw44 = JSON.parse(fs.readFileSync(OUT + '/probe-44-raw.json', 'utf8'));
const raw29 = JSON.parse(fs.readFileSync(OUT + '/probe-29-raw.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync(OUT + '/sceneIndex.json', 'utf8'));
const chips = JSON.parse(fs.readFileSync(OUT + '/probe-chips-all.json', 'utf8'));
const chipMap = Object.fromEntries(chips.map(c => [c.term, c]));

function emptyKind(r) {
  const t = r.emptyText || '';
  if (/按文字搜不到/.test(t)) return 'E1 搜不到、但索引有直连 → 引导点芯片';
  if (/正属于没有直连方案的那一类/.test(t)) return 'E2 承认无直连 → 引导点芯片';
  if (/不在这 44 个行业词里/.test(t)) return 'E3 承认词不在索引里';
  return 'E4 其他';
}
function tplCell(r) {
  if (r.etplCards && r.etplCards.length) return r.etplCards.join('+') + '（有卡）';
  if (r.etplVisible) return '无（摊开 3 个 README 的承诺行业）';
  if (r.stripCards && r.stripCards.length) return r.stripCards.join('+') + '（带）';
  return '无';
}

const rows = [];
for (const r of raw44) {
  const v = idx[r.term] || { direct: [], near: [] };
  const d = v.direct || [], n = v.near || [];
  const status = d.length ? (n.length ? '直连+近似' : '仅直连') : (n.length ? '仅近似' : '无');
  const chip = chipMap[r.term];
  const seen = r.rows > 0
    ? `列出 ${r.rows} / 30；${r.stripVisible ? '清单上方有模板带 [' + r.stripCards.join(',') + ']' : '无模板带'}`
    : `列出 0 / 30；空状态 ${emptyKind(r)}；模板块 ${tplCell(r)}`;
  rows.push({ term: r.term, direct: d.join(' ') || '—', near: n.join(' ') || '—', status,
    rows: r.rows, seen,
    chipRows: chip ? chip.rows : null,
    chipIds: chip ? chip.ids.join(',') : '',
    chipTpl: chip ? (chip.stripCards.join(',') || '—') : '—' });
}

let md = '| 行业词 | direct（直连） | near（近似） | 索引状态 | 搜索行数 | 搜完实际看到什么 | 点同名芯片后看到什么 |\n';
md += '| --- | --- | --- | --- | --- | --- | --- |\n';
for (const r of rows) {
  md += `| ${r.term} | ${r.direct} | ${r.near} | ${r.status} | ${r.rows} | ${r.seen} | ${r.chipRows} 行（${r.chipIds}）；模板带 ${r.chipTpl} |\n`;
}
fs.writeFileSync(OUT + '/table-44.md', md);

const rows29 = raw29.map(r => ({ term: r.term, rows: r.rows, kind: emptyKind(r), tpl: tplCell(r) }));
let md29 = '| 词 | 搜索行数 | 空状态分类 | 模板块 |\n| --- | --- | --- | --- |\n';
for (const r of rows29) md29 += `| ${r.term} | ${r.rows} | ${r.kind} | ${r.tpl} |\n`;
fs.writeFileSync(OUT + '/table-29.md', md29);

const zero44 = raw44.filter(r => r.rows === 0);
const zero29 = raw29.filter(r => r.rows === 0);
const dist = {};
for (const r of zero44) dist[emptyKind(r)] = (dist[emptyKind(r)] || 0) + 1;
const stats = {
  n44: raw44.length, zero44: zero44.length,
  n29: raw29.length, zero29: zero29.length,
  zeroAll: zero44.length + zero29.length, nAll: raw44.length + raw29.length,
  withTplCard44: raw44.filter(r => r.etplCards.length).map(r => r.term + '→' + r.etplCards.join('')),
  withStrip44: raw44.filter(r => r.stripVisible).map(r => r.term + '→' + r.stripCards.join('')),
  withTplCard29: raw29.filter(r => r.etplCards.length).map(r => r.term + '→' + r.etplCards.join('')),
  emptyDist: dist,
  chipStillZero: chips.filter(r => r.rows === 0).map(r => r.term),
  chipFewerThanSearch: chips.filter(r => r.rows < r.searchOnly).map(r => r.term + '(' + r.searchOnly + '→' + r.rows + ')'),
};
fs.writeFileSync(OUT + '/table-stats.json', JSON.stringify(stats, null, 1));
console.log(JSON.stringify(stats, null, 1));
