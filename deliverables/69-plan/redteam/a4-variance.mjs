// A4: how much of a prompt is STYLE-BEARING vs boilerplate?
// If all 30 prompts are 90% identical text, then "the style" lives in a thin slice and any
// LLM's sampling variance will swamp it — which decides whether e2e validation generalises.
import { makeCtx } from './lib.mjs';
import { writeFileSync } from 'node:fs';

const win = makeCtx();
const S = win.SCHEMES;
const prompts = Object.fromEntries(S.map((s) => [s.id, win.buildStylePrompt(s.id)]));

// 1. longest common substring (via suffix-free approximation: line-level + sentence-level)
const sentenceSplit = (t) => t.split(/(?<=[。；\n])/).map((x) => x.trim()).filter(Boolean);
const sentMap = Object.fromEntries(Object.entries(prompts).map(([k, v]) => [k, sentenceSplit(v)]));

// sentences appearing in ALL 30 prompts = structurally boilerplate
const allSets = Object.values(sentMap);
const common = allSets[0].filter((s) => allSets.every((set) => set.includes(s)));
const commonChars = common.join('').length;

// 2. pairwise Jaccard on sentences
const jac = (a, b) => {
  const A = new Set(a), B = new Set(b);
  const i = [...A].filter((x) => B.has(x)).length;
  return i / (A.size + B.size - i);
};
let minJ = 1, maxJ = 0, sumJ = 0, n = 0;
const keys = Object.keys(prompts);
for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
  const v = jac(sentMap[keys[i]], sentMap[keys[j]]);
  minJ = Math.min(minJ, v); maxJ = Math.max(maxJ, v); sumJ += v; n++;
}
const avgJ = sumJ / n;

// 3. how many chars are unique to each prompt (the load-bearing style slice)
const rows = keys.map((k) => {
  const total = [...prompts[k]].length;
  const shared = sentenceSplit(prompts[k]).filter((s) => common.includes(s)).join('').length;
  return { id: k, total, sharedLen: shared, uniqueLen: total - shared, uniqueShare: +((total - shared) / total).toFixed(3) };
});

// 4. shared opening lines across all 30 (show them)
writeFileSync('D:\\Web\\style\\deliverables\\69-plan\\redteam\\a4-promptvariance.json', JSON.stringify({
  commonSentences: common, commonChars,
  avgChars: Math.round(rows.reduce((a, r) => a + r.total, 0) / rows.length),
  pairwiseJaccard: { min: +minJ.toFixed(3), max: +maxJ.toFixed(3), avg: +avgJ.toFixed(3) },
  rows,
}, null, 1));

console.log('prompts:', keys.length, ' avg chars:', Math.round(rows.reduce((a, r) => a + r.total, 0) / rows.length));
console.log('sentences appearing in ALL 30 prompts:', common.length, '=', commonChars, 'chars');
console.log('pairwise sentence Jaccard: avg', avgJ.toFixed(3), 'min', minJ.toFixed(3), 'max', maxJ.toFixed(3));
console.log('mean unique-to-this-prompt share:', (rows.reduce((a, r) => a + r.uniqueShare, 0) / rows.length * 100).toFixed(1) + '%');
console.log('\nshared boilerplate sentences:');
for (const c of common) console.log('  -', c.slice(0, 110));
