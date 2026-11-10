// 第三份真相源：data.js 的 scenes / scenesYes 里，73 个词到底出现在哪些案子中。
// 用来验 sceneIndex 的「直连/近似」是不是自说自话。
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';

const ROOT = 'D:/Web/style';
const sb = { window: {} };
vm.createContext(sb);
vm.runInContext(readFileSync(`${ROOT}/prototypes/_selection/data.js`, 'utf8'), sb);
const S = sb.window.SCHEMES;
const sb2 = { window: {} };
vm.createContext(sb2);
vm.runInContext(readFileSync(`${ROOT}/prototypes/_selection/prompts.js`, 'utf8'), sb2);
const P = sb2.window.STYLE_PROMPTS;

const staticMap = JSON.parse(readFileSync(`${ROOT}/deliverables/66-audit/tpl-audit/static-map.json`, 'utf8'));
const live = JSON.parse(readFileSync(`${ROOT}/deliverables/66-audit/tpl-audit/live-73.json`, 'utf8'));

console.log('SCHEMES:', S.length, '| keys of one record:', Object.keys(S[0]).join(','));
console.log('has scenesYes:', S.every((r) => 'scenesYes' in r), '| has scenes:', S.every((r) => 'scenes' in r));

const rows = staticMap.rows.map((r) => {
  const inYes = S.filter((s) => (s.scenesYes || '').includes(r.term)).map((s) => s.id);
  const inAll = S.filter((s) => (s.scenes || '').includes(r.term)).map((s) => s.id);
  const inNegOnly = inAll.filter((id) => !inYes.includes(id));
  const l = live.searched[r.term] || {};
  return {
    term: r.term,
    inIndex: r.inIndex,
    direct: r.direct, near: r.near,
    tplExact: r.tplExact, tplAdj: r.tplAdj,
    dataYes: inYes, dataAny: inAll, dataNegOnly: inNegOnly,
    liveRows: l.rows, liveCount: l.count,
    liveEmptyHead: l.emptyTpl ? (l.emptyTpl || '').slice(0, 120) : null,
  };
});

// 一致性检查
const mism = [];
for (const r of rows) {
  if (!r.inIndex) {
    if (r.dataYes.length) mism.push(['UNSUPPORTED 但 data.js 正面场景里有', r.term, r.dataYes]);
    continue;
  }
  const idxIds = [...(r.direct || []), ...(r.near || [])].sort();
  const dataIds = [...new Set(r.dataYes)].sort();
  if (idxIds.join() !== dataIds.join()) {
    mism.push(['索引与 data.js 正面场景不一致', r.term, { idx: idxIds, data: dataIds }]);
  }
}

console.log('\n=== 不一致（索引 vs data.js scenesYes） ===');
if (!mism.length) console.log('（无：44 个索引词的 direct+near 与 data.js 正面场景逐字一致）');
for (const m of mism) console.log(JSON.stringify(m));

console.log('\n=== unsupported 词在 data.js 里是否只出现在「不适合」从句 ===');
for (const r of rows.filter((x) => !x.inIndex)) {
  if (r.dataAny.length) console.log(r.term, '→ 出现在', r.dataAny.join(','), '| 正面:', r.dataYes.join(',') || '无', '| 全在否定句:', r.dataNegOnly.length === r.dataAny.length);
}
console.log('（未列出的 unsupported 词：data.js 里 0 次出现）');

console.log('\n=== 搜索 0 行但索引有直连的词（搜索框 vs 芯片两条路不一致） ===');
for (const r of rows.filter((x) => x.inIndex && x.liveRows === 0 && (x.direct || []).length)) {
  console.log(r.term, '| direct', r.direct.join(','), '| 搜「' + r.term + '」→', r.liveCount, '| 点芯片行数见 live-73.json');
}
console.log('\n=== 搜索有行但索引只有近似的词 ===');
for (const r of rows.filter((x) => x.inIndex && x.liveRows > 0 && !(x.direct || []).length)) {
  console.log(r.term, '| near', (r.near || []).join(','), '| 搜出', r.liveRows, '行');
}

writeFileSync(`${ROOT}/deliverables/66-audit/tpl-audit/matrix.json`, JSON.stringify(rows, null, 1), 'utf8');
console.log('\nrows written:', rows.length);
