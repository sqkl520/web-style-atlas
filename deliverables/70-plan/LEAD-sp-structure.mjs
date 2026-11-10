import { readFileSync } from 'node:fs';
const ROOT = 'D:/Web/style';

const promptsSrc = readFileSync(ROOT + '/prototypes/_selection/prompts.js', 'utf8');
const sandbox = { window: {} };
new Function('window', promptsSrc)(sandbox.window);
const SP = sandbox.window.STYLE_PROMPTS;

console.log('=== STYLE_PROMPTS 的顶层键 ===');
const keys = Object.keys(SP);
console.log(`共 ${keys.length} 个: ${keys.slice(0, 40).join(' ')}`);
console.log();
console.log('=== 哪些键匹配 /^S\\d{2}$/ ===');
const caseKeys = keys.filter((k) => /^S\d{2}$/.test(k));
console.log(`共 ${caseKeys.length}: ${caseKeys.join(' ')}`);
console.log();
if (caseKeys.length) {
  const first = SP[caseKeys[0]];
  console.log(`=== SP[${caseKeys[0]}] 的字段 ===`);
  console.log(Object.keys(first).join(', '));
  console.log();
  console.log('h1Size:', JSON.stringify(first.h1Size));
  console.log('lineWidths:', JSON.stringify(first.lineWidths));
  console.log('radius:', JSON.stringify(first.radius));
  console.log('shadow:', JSON.stringify(first.shadow));
} else {
  console.log('=== SP 的第一个键的结构 ===');
  console.log(JSON.stringify(SP[keys[0]], null, 1).slice(0, 800));
}
