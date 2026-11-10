// Find terms that exist ONLY inside a folded field, so find-in-page tests are decisive.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = readFileSync('deliverables/65-audit/lab/snapshot/data.js', 'utf8');
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(src, ctx);
const s15 = ctx.window.SCHEMES.find((r) => r.id === 'S15');
const keys = ['def', 'family', 'fonts', 'layout', 'landing', 'visuals', 'motion', 'risk', 'scenes', 'quirk'];
for (const k of keys) console.log(k.padEnd(9), String(s15[k] || '').length, '|', String(s15[k] || '').slice(0, 90));
console.log('\n--- landing full ---\n' + s15.landing);
console.log('\n--- motion full ---\n' + s15.motion);
