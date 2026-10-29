// 关键核实：prompt-copy.js 里的 d.palette 第一个值，到底是底色还是主色？
// 两个来源：
//   data.js 的 palette[0] = bg（已知 30/30）
//   prompts.js 的 dna.palette 第一个 = ?
import { readFileSync } from 'node:fs';
const ROOT = 'D:/Web/style';
const P = ROOT + '/prototypes';

const dataJs = readFileSync(P + '/_selection/data.js', 'utf8');
const sbD = { window: {} };
new Function('window', dataJs)(sbD.window);
const dM = new Map((sbD.window.SCHEMES || []).map((s) => [s.id, s]));

const pr = readFileSync(P + '/_selection/prompts.js', 'utf8');
const sbP = { window: {} };
new Function('window', pr)(sbP.window);
const pM = new Map((sbP.window.STYLE_PROMPTS.schemes || []).map((s) => [s.id, s]));

const HEXT = /#([0-9a-fA-F]{6})(?![0-9a-fA-F])/g;
const hx = (s) => [...String(s).matchAll(HEXT)].map((m) => m[0].toUpperCase());

console.log('=== prompts.js 的 dna.palette 第一个值 vs data.js 的 bg / primary ===\n');
console.log('案    dna.palette[0]   data.bg     data.primary  等于哪个?  角色名');
console.log('-'.repeat(88));

let eqBg = 0, eqPri = 0, neither = 0;
for (const id of [...dM.keys()].sort()) {
  const sc = dM.get(id);
  const bg = String(sc.bg || '').toUpperCase();
  const pri = String(sc.primary || '').toUpperCase();
  const rawPal = pM.get(id)?.dna?.palette;
  // 保留角色名
  const firstEntry = String(Array.isArray(rawPal) ? rawPal[0] : (rawPal || '').split('、')[0] || '');
  const firstHex = (firstEntry.match(HEXT) || [])[0]?.toUpperCase() || '';
  const nameM = firstEntry.match(/[（(]([^）)]+)[）)]/);
  const roleName = nameM ? nameM[1] : '';
  let eq = '都不等';
  if (firstHex === bg) { eqBg++; eq = '= bg'; }
  else if (firstHex === pri) { eqPri++; eq = '= primary'; }
  else neither++;
  console.log(`${id}  ${firstHex.padEnd(10)}  ${bg.padEnd(10)}  ${pri.padEnd(10)}  ${eq.padEnd(9)}  ${roleName}`);
}
console.log('-'.repeat(88));
console.log(`\ndna.palette[0] === bg:      ${eqBg}/30`);
console.log(`dna.palette[0] === primary: ${eqPri}/30`);
console.log(`都不是:                     ${neither}/30`);

console.log('\n\n=== 结论 ===');
if (eqPri > eqBg) {
  console.log('⚠️ prompts.js 的 dna.palette[0] 是**主色**，不是底色！');
  console.log('   所以 prompt-copy.js:730 说"最大面积用第一个值"——指的是主色。');
  console.log('   那么问题变成：主色是不是规格里的最大面积色？');
} else if (eqBg > eqPri) {
  console.log('dna.palette[0] 是底色（与 data.js 一致）');
} else {
  console.log('两者都不等，说明 dna.palette 的顺序是第三种逻辑');
}
