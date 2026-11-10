import { makeCtx } from './lib.mjs';
const win = makeCtx();
const S = win.SCHEMES;
console.log('n', S.length);
console.log('keys', Object.keys(S[0]).join(','));
console.log('sample', JSON.stringify(S[0], null, 1).slice(0, 1500));
