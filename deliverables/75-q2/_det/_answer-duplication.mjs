import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const ctx = { window: {} }; vm.createContext(ctx);
vm.runInContext(readFileSync('prototypes/_selection/prompts.js', 'utf8'), ctx);
const P = ctx.window.STYLE_PROMPTS;

console.log('=== 「这些案适合什么行业」今天存在几份答案 ===');
console.log('1) sceneIndex（build-prompts.mjs:172 手写常量）  ', Object.keys(P.sceneIndex).length, '个行业词');
console.log('   其中 direct 有直连案:', Object.keys(P.sceneIndex).filter(t => P.sceneIndex[t].direct.length).length);
console.log('   仅 near 近似:', Object.keys(P.sceneIndex).filter(t => !P.sceneIndex[t].direct.length).length);
console.log('2) unsupported（单列的「没对应风格」）           ', P.unsupported.length, '个词');
console.log('3) 每个方案的 scenes（_specs 字段 10 手写）      30 份，各含「适合」与「不适合：」');
console.log('4) 每个方案的 scenesNo（从字段 10 切出来的负向）  30 份');
console.log('5) CAPACITY 表里的 scenes（build-prompts.mjs:135-170 手写）', 30, '份');

console.log('\n=== 这五份答案是否一致（拿 sceneIndex 与 CAPACITY.scenes 对撞）===');
// 读 build-prompts 里 HUMAN 的 scenes
const src = readFileSync('prototypes/_prompts/build-prompts.mjs', 'utf8');
const humanBlock = src.slice(src.indexOf('const HUMAN'), src.indexOf('};', src.indexOf('const HUMAN')));
const humanScenes = {};
for (const m of humanBlock.matchAll(/(S\d{2}):\s*\{[^}]*?scenes:\s*\[([^\]]*)\]/g)) {
  humanScenes[m[1]] = [...m[2].matchAll(/"([^"]+)"/g)].map(x => x[1]);
}
console.log('从 HUMAN 解析出', Object.keys(humanScenes).length, '案的 scenes');

// sceneIndex 反查：某案被哪些词 direct / near
const fromIndex = { direct: {}, near: {} };
for (const [term, v] of Object.entries(P.sceneIndex)) {
  (v.direct || []).forEach(id => (fromIndex.direct[id] = fromIndex.direct[id] || []).push(term));
  (v.near || []).forEach(id => (fromIndex.near[id] = fromIndex.near[id] || []).push(term));
}
let mism = 0;
console.log('\n案   HUMAN.scenes                        sceneIndex 里 direct 命中的词        一致？');
for (const id of Object.keys(humanScenes).sort()) {
  const h = humanScenes[id], d = fromIndex.direct[id] || [];
  const same = JSON.stringify([...h].sort()) === JSON.stringify([...d].sort());
  if (!same) mism++;
  console.log(id, h.join('/').padEnd(32), (d.join('/') || '（无）').padEnd(30), same ? '✓' : '✗');
}
console.log('\n不一致案数:', mism, '/ 30');
console.log('注：不一致不一定是错——两份答案回答的可能不是同一个问题。');
console.log('   HUMAN.scenes = 「这案像什么行业」（作者自述，用于提示词里"我经营…"的默认填充）');
console.log('   sceneIndex   = 「用户点这个词该筛出哪案」（反查索引，用于芯片）');
console.log('   但如果两者对同一案给出不同的行业集合，用户在芯片筛出来的案，详情里读到的适用行业是另一批——');
console.log('   这正是「各存一份答案」的代价。');
