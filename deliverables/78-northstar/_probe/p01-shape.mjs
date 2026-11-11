// 探针 01：确认 data.js / prompts.js 的真实字段形状（只读，不改源码）
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const ctx = { window: {}, console };
vm.createContext(ctx);
vm.runInContext(readFileSync('D:/Web/style/prototypes/_selection/data.js', 'utf8'), ctx);
vm.runInContext(readFileSync('D:/Web/style/prototypes/_selection/prompts.js', 'utf8'), ctx);

const S = ctx.window.SCHEMES;
const P = ctx.window.STYLE_PROMPTS;

console.log('SCHEMES len =', S.length);
console.log('ids =', S.map(x => x.id).join(' '));

const s = S[0];
console.log('\n--- scheme keys ---');
console.log(Object.keys(s).join(', '));
console.log('\n--- axes ---');
console.log(JSON.stringify(s.axes, null, 1));
console.log('\n--- gate ---');
console.log(JSON.stringify(s.gate, null, 1));
console.log('\n--- hard ---');
console.log(JSON.stringify(s.hard));
console.log('\n--- struct-ish fields ---');
for (const k of ['structure', 'threshold', 'tone', 'cn', 'en', 'fr', 'dir']) console.log(k, '=', JSON.stringify(s[k]));

console.log('\n=== STYLE_PROMPTS keys ===');
console.log(Object.keys(P).join(', '));

// find the per-scheme prompt objects
const firstKey = Object.keys(P).find(k => k !== 'sceneIndex');
console.log('\nfirst non-sceneIndex key =', firstKey);
console.log(JSON.stringify(P[firstKey], null, 1).slice(0, 3000));
