import { makeCtx } from './lib.mjs';
import { writeFileSync } from 'node:fs';
const win = makeCtx();
const P = win.STYLE_PROMPTS;
const S = win.SCHEMES;
const byId = Object.fromEntries(S.map((s) => [s.id, s]));

const PS = Object.fromEntries(P.schemes.map((s) => [s.id, s]));
const hardIds = P.hardIds.slice();
const degradesYes = S.filter((s) => s.capacity && s.capacity.degrades === 'yes').map((s) => s.id);
const degradesNo = S.filter((s) => s.capacity && s.capacity.degrades === 'no').map((s) => s.id);
const degradesOther = S.filter((s) => s.capacity && !['yes', 'no'].includes(s.capacity.degrades)).map((s) => s.id);
const union = [...new Set([...hardIds, ...degradesYes])].sort();

// does prompt.hard === P.hardIds for all 30?
const hardMismatch = S.filter((s, i) => (PS[s.id].hard ? true : false) !== hardIds.includes(s.id)).map((s) => s.id);

const rows = S.map((s) => ({
  id: s.id,
  hard: !!PS[s.id].hard,
  capacity: PS[s.id].capacity,
  minItems: PS[s.id].minItems,
  minPics: PS[s.id].minPics,
  tone: s.tone,
  cn: s.cn,
  family: s.fr,
  structure: s.structure,
  gateFail: s.gate.fail,
  failIds: s.gate.failIds,
  realPictures: s.gate.realPictures,
  screens: s.gate.screens,
  promptLen: [...win.buildStylePrompt(s.id)].length,
}));

writeFileSync('deliverables/69-plan/redteam/b1-out.json', JSON.stringify({
  counts: {
    hardIds: hardIds.length, degradesYes: degradesYes.length,
    degradesNo: degradesNo.length, degradesOther: degradesOther.length,
    union: union.length,
  },
  hardIds, degradesYes, degradesNo, degradesOther, union,
  hardMismatch,
  rows,
}, null, 1));
console.log('hardIds', hardIds.length, hardIds.join(' '));
console.log('degradesYes', degradesYes.length, degradesYes.join(' '));
console.log('degradesNo', degradesNo.length);
console.log('degradesOther', degradesOther.length, degradesOther.join(' '));
console.log('union', union.length, union.join(' '));
console.log('hardMismatch', JSON.stringify(hardMismatch));
console.log('FAIL total', rows.reduce((a, r) => a + r.gateFail, 0));

