import { makeCtx } from './lib.mjs';
import { writeFileSync } from 'node:fs';
const win = makeCtx();
const P = win.STYLE_PROMPTS;
const S = win.SCHEMES;
const PS = Object.fromEntries(P.schemes.map((s) => [s.id, s]));

const hardIds = P.hardIds.slice();
const degradesYes = P.schemes.filter((s) => s.capacity && s.capacity.degrades === 'yes').map((s) => s.id);
const degradesNo = P.schemes.filter((s) => s.capacity && s.capacity.degrades === 'no').map((s) => s.id);
const union = [...new Set([...hardIds, ...degradesYes])].sort();
const onlyHard = hardIds.filter((id) => !degradesYes.includes(id));

// Stored gate vs live gate
const storedFailTotal = S.reduce((a, s) => a + s.gate.fail, 0);
const storedFailList = S.filter((s) => s.gate.fail > 0).map((s) => ({ id: s.id, fail: s.gate.fail, ids: s.gate.failIds }));

const rows = S.map((s) => ({
  id: s.id, cn: s.cn, fr: s.fr, structure: s.structure, tone: s.tone,
  hard: hardIds.includes(s.id),
  degrades: PS[s.id].capacity.degrades,
  minItems: PS[s.id].minItems, minPics: PS[s.id].minPics,
  storedFail: s.gate.fail, storedFailIds: s.gate.failIds,
  pics: s.gate.realPictures, screens: s.gate.screens,
  promptLen: [...win.buildStylePrompt(s.id)].length,
  scenesYes: (s.scenesYes || []).length, scenesNo: (s.scenesNo || []).length,
}));

// scene vocabulary
const terms = Object.keys(P.sceneIndex);
const directTerms = terms.filter((t) => (P.sceneIndex[t].direct || []).length);
const nearOnly = terms.filter((t) => !(P.sceneIndex[t].direct || []).length);
const unsupported = P.unsupported.slice();
const overlap = unsupported.filter((t) => P.sceneIndex[t]);

const out = {
  counts: { terms: terms.length, direct: directTerms.length, nearOnly: nearOnly.length, unsupported: unsupported.length,
    hard: hardIds.length, degradesYes: degradesYes.length, degradesNo: degradesNo.length, union: union.length, storedFailTotal },
  hardIds, degradesYes, degradesNo, union, onlyHard,
  directTerms, nearOnly, unsupported, overlap,
  storedFailList, rows,
};
writeFileSync('deliverables/69-plan/redteam/b1-out.json', JSON.stringify(out, null, 1));
console.log('terms', terms.length, 'direct', directTerms.length, 'nearOnly', nearOnly.length, 'unsupported', unsupported.length);
console.log('overlap unsupported∩sceneIndex', JSON.stringify(overlap));
console.log('hardIds', hardIds.length, hardIds.join(' '));
console.log('degradesYes', degradesYes.length, degradesYes.join(' '));
console.log('union hard∪degrades', union.length, union.join(' '));
console.log('onlyHard (hard but degrades=no)', onlyHard.join(' '));
console.log('storedFailTotal', storedFailTotal, JSON.stringify(storedFailList));
console.log('direct terms:', directTerms.join(' '));
console.log('unsupported:', unsupported.join(' '));
