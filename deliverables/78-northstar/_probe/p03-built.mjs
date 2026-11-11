// 探针 03：built 字段（判断 Q2/Q3 新建）、buildPrompt 是否可离线调用
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const ctx = { window: {}, console };
vm.createContext(ctx);
vm.runInContext(readFileSync('D:/Web/style/prototypes/_selection/data.js', 'utf8'), ctx);
vm.runInContext(readFileSync('D:/Web/style/prototypes/_selection/prompts.js', 'utf8'), ctx);

const S = ctx.window.SCHEMES;

console.log('--- built / axes.band / tone / structure ---');
for (const s of S) {
  console.log([s.id, JSON.stringify(s.built), s.axes.band, s.tone, s.structure, s.threshold,
    'chroma=' + s.axes.chroma, 'ground=' + s.axes.ground, 'load=' + s.axes.load, 'loud=' + s.axes.loud].join(' | '));
}

console.log('\n--- built value distribution ---');
const bd = {};
for (const s of S) { const k = JSON.stringify(s.built); bd[k] = (bd[k] || 0) + 1; }
console.log(JSON.stringify(bd, null, 1));
