// 探针 23：死条件取证 —— UI 里读了字段，但分支条件永不成立 / 值恒定
import { join } from 'node:path';
import { ROOT, loadSchemes, loadPrompts } from './lib-load.mjs';

const S = loadSchemes();
const P = loadPrompts();

const n = (arr) => arr.length;
const ids = (arr) => arr.map((r) => r.id).join(' ');

console.log('=== 1) copyParts.error 为空 → 决定 errorCodeSource 那一支是否渲染 ===');
const noErr = S.filter((r) => !((r.copyParts || {}).error || '').trim());
console.log(`copyParts.error 为空: ${noErr.length}/30  → ${ids(noErr)}`);
console.log(`app.js:432 的 "${'（源文件缺，错误码为 Lead 补入）'}" 与 errorCodeSource 只在 error 为空时渲染`);
console.log(`=> 实际可渲染案数: ${noErr.length}/30；其余 ${30 - noErr.length} 案这一支永不执行`);

console.log('\n=== 2) built 恒为 true → 未建原型分支是否是死代码 ===');
const unbuilt = S.filter((r) => !r.built);
console.log(`built=false: ${unbuilt.length}/30  → ${ids(unbuilt) || '（无）'}`);
console.log('受影响分支：app.js:183 「未建原型」tag / :247 「尚未渲染」/ :250 「目录尚未建立」/ :422-424 「原型尚未建立」/ :254 的 is-unbuilt class');

console.log('\n=== 3) gate 是否恒非空 → 「未渲染」分支是否死 ===');
const noGate = S.filter((r) => !r.gate);
console.log(`gate=null: ${noGate.length}/30 → ${ids(noGate) || '（无）'}`);

console.log('\n=== 4) shots 是否恒非空（三视口）===');
for (const vp of ['desktop', 'tablet', 'mobile']) {
  const empty = S.filter((r) => !((r.shots || {})[vp] || []).length);
  console.log(`shots.${vp} 空: ${empty.length}/30`);
}

console.log('\n=== 5) scenesNo 是否有值（字段存在但零消费）===');
const snEmpty = S.filter((r) => !(r.scenesNo || '').trim());
console.log(`scenesNo 有值: ${30 - snEmpty.length}/30，共 ${S.reduce((a, r) => a + (r.scenesNo || '').length, 0)} 字`);
console.log(`scenesYes 有值: ${S.filter((r) => (r.scenesYes || '').trim()).length}/30，共 ${S.reduce((a, r) => a + (r.scenesYes || '').length, 0)} 字`);

console.log('\n=== 6) copy 字段 vs copyParts 是否重复（copy 零消费，内容是否被 copyParts 完整承载）===');
const lost = S.filter((r) => {
  const c = r.copy || '';
  const parts = r.copyParts || {};
  const joined = Object.values(parts).join('');
  // 检查 copy 里有多少内容不在 copyParts 里
  let missing = 0;
  for (const seg of c.split(/[；;]/)) {
    const t = seg.trim();
    if (t.length > 8 && !joined.includes(t.slice(0, 8))) missing++;
  }
  return missing > 0;
});
console.log(`copy 中有片段未被 copyParts 覆盖的案: ${lost.length}/30 → ${ids(lost)}`);

console.log('\n=== 7) primary 与 palette[0]/bg 的关系（primary 零消费，值是否可信）===');
let sameAsBg = 0, inPal0 = 0;
for (const r of S) {
  if (r.primary === r.bg) sameAsBg++;
  if ((r.palette || [])[0] === r.primary) inPal0++;
}
console.log(`primary === bg: ${sameAsBg}/30`);
console.log(`primary === palette[0]: ${inPal0}/30`);

console.log('\n=== 8) buttonText 值分布（零消费）===');
const bt = {};
for (const r of S) { const k = r.buttonText == null ? 'null' : r.buttonText; bt[k] = (bt[k] || 0) + 1; }
console.log(JSON.stringify(bt));

console.log('\n=== 9) audit 字段（本轮新增）是否有消费 ===');
console.log(`audit 有值: ${S.filter((r) => (r.audit || '').trim()).length}/30，共 ${S.reduce((a, r) => a + (r.audit || '').length, 0)} 字`);
console.log(`prompts.js 里 audit 命中: ${JSON.stringify(P).includes('"audit"') ? '有' : '无'}`);

console.log('\n=== 10) axes 里哪些子键零消费 ===');
const axKeys = [...new Set(S.flatMap((r) => Object.keys(r.axes || {})))];
console.log('axes 子键: ' + axKeys.join(' '));
