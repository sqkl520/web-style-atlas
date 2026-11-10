import { makeCtx } from './lib.mjs';
import { writeFileSync } from 'node:fs';
const win = makeCtx();
const P = win.STYLE_PROMPTS;
const S = win.SCHEMES;
const k0 = Object.keys(P.schemes)[0];
writeFileSync('deliverables/69-plan/redteam/b1c-scheme-sample.json',
  JSON.stringify({ promptKeys: Object.keys(P), schemeKeys: Object.keys(P.schemes[k0]), sample: P.schemes[k0], s01axes: S[0].axes, s01gate: S[0].gate }, null, 1));
console.log('P keys', Object.keys(P).join(','));
console.log('schemeKeys', Object.keys(P.schemes[k0]).join(','));
console.log('axes S01', JSON.stringify(S[0].axes));
console.log('gate S01', JSON.stringify(S[0].gate));
