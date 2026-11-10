// 索引 vs data.js 的严格双向对照：
//  A. 词出现在某案 scenesYes 里，却不在该词的 direct+near 里（索引漏收）
//  B. 词在某案 direct+near 里，该案 scenesYes 却完全不含这个词（索引无据）
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

const misses = [];
const ungrounded = [];
for (const [term, v] of Object.entries(P.sceneIndex)) {
  const idxIds = new Set([...(v.direct || []), ...(v.near || [])]);
  for (const s of S) {
    const has = (s.scenesYes || '').includes(term);
    if (has && !idxIds.has(s.id)) misses.push({ term, id: s.id, snippet: (s.scenesYes || '').slice(0, 60) });
    if (!has && idxIds.has(s.id)) ungrounded.push({ term, id: s.id, direct: (v.direct || []).includes(s.id) });
  }
}
console.log('A. 索引漏收（案子里写了，索引没收）:', misses.length);
for (const m of misses) console.log('  ', m.term, '←', m.id, '|', m.snippet);
console.log('\nB. 索引无据（索引收了，案子没写这个词）:', ungrounded.length);
const byTerm = {};
for (const u of ungrounded) (byTerm[u.term] = byTerm[u.term] || []).push(u.id + (u.direct ? '(d)' : ''));
for (const [t, ids] of Object.entries(byTerm)) console.log('  ', t, '→', ids.join(','));
writeFileSync(`${ROOT}/deliverables/66-audit/tpl-audit/index-vs-datajs.json`, JSON.stringify({ misses, ungrounded }, null, 1), 'utf8');
