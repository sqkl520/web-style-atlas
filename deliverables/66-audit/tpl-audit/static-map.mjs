// 静态口径盘查：只读 prompts.js / prompt-copy.js，不启动浏览器。
// 输出：73 词并集、每词的 sceneIndex 直连/近似、TEMPLATES exact/adjacent 命中矩阵。
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';

const ROOT = 'D:/Web/style';
const src = readFileSync(`${ROOT}/prototypes/_selection/prompts.js`, 'utf8');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(src, sandbox);
const P = sandbox.window.STYLE_PROMPTS;

const idx = Object.keys(P.sceneIndex);
const uns = P.unsupported;
const idxSet = new Set(idx);
const overlap = uns.filter((w) => idxSet.has(w));
const union = [...idx, ...uns.filter((w) => !idxSet.has(w))];

// 从 prompt-copy.js 里抠出 TEMPLATES / TPL_ALIAS / TPL_ADJACENT（它们在同一 IIFE 内，没有导出）
const pc = readFileSync(`${ROOT}/prototypes/_selection/prompt-copy.js`, 'utf8');
function sliceBlock(startMarker, endMarker) {
  const a = pc.indexOf(startMarker);
  if (a < 0) throw new Error('missing ' + startMarker);
  const b = pc.indexOf(endMarker, a);
  return pc.slice(a, b);
}
const tplSrc = sliceBlock('var TEMPLATES = [', '/* 索引词 → README 词');
const aliasSrc = sliceBlock('var TPL_ALIAS = {', '/* 「README 没有写这个词');
const adjSrc = sliceBlock('var TPL_ADJACENT = {', 'function tplEsc');
const ctx2 = {};
vm.createContext(ctx2);
vm.runInContext(tplSrc + '\n' + aliasSrc + '\n' + adjSrc + '\nthis.OUT={TEMPLATES,TPL_ALIAS,TPL_ADJACENT};', ctx2);
const { TEMPLATES, TPL_ALIAS, TPL_ADJACENT } = ctx2.OUT;

const exactOf = (term) => {
  const key = TPL_ALIAS[term] || term;
  return TEMPLATES.filter((t) => t.scenes.indexOf(key) >= 0).map((t) => t.id);
};
const adjOf = (term) => (TPL_ADJACENT[term] || []).map((a) => a.id);

const rows = union.map((term) => {
  const v = P.sceneIndex[term];
  return {
    term,
    inIndex: !!v,
    direct: v ? v.direct : null,
    near: v ? v.near : null,
    tplExact: exactOf(term),
    tplAdj: adjOf(term),
  };
});

const out = {
  counts: {
    sceneIndex: idx.length,
    unsupported: uns.length,
    overlap,
    union: union.length,
  },
  templates: TEMPLATES,
  tplAlias: TPL_ALIAS,
  tplAdjacentKeys: Object.keys(TPL_ADJACENT),
  stats: {
    indexWithDirect: idx.filter((t) => P.sceneIndex[t].direct.length).length,
    indexNearOnly: idx.filter((t) => !P.sceneIndex[t].direct.length).length,
    unionTplExact: rows.filter((r) => r.tplExact.length).length,
    unionTplAdjOnly: rows.filter((r) => !r.tplExact.length && r.tplAdj.length).length,
    unionTplNone: rows.filter((r) => !r.tplExact.length && !r.tplAdj.length).length,
    unsupportedWithTplExact: rows.filter((r) => !r.inIndex && r.tplExact.length).length,
  },
  rows,
};
writeFileSync(`${ROOT}/deliverables/66-audit/tpl-audit/static-map.json`, JSON.stringify(out, null, 1), 'utf8');

console.log('sceneIndex', idx.length, '| unsupported', uns.length, '| overlap', overlap, '| union', union.length);
console.log('index with direct:', out.stats.indexWithDirect, '| near-only:', out.stats.indexNearOnly);
console.log('union tpl exact:', out.stats.unionTplExact, '| adj-only:', out.stats.unionTplAdjOnly, '| none:', out.stats.unionTplNone);
console.log('unsupported w/ tpl exact:', out.stats.unsupportedWithTplExact);
for (const r of rows) {
  console.log(
    [r.term, r.inIndex ? (r.direct.length ? 'direct ' + r.direct.join(',') : 'near-only ' + r.near.join(',')) : 'UNSUPPORTED',
      'tpl=' + (r.tplExact.join('+') || '-') + (r.tplAdj.length ? ' adj:' + r.tplAdj.join('+') : '')].join(' | ')
  );
}
