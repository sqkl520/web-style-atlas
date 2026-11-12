/* 复核红队的「18/21 数值原样取自 data.js」这条。
 * 方法：从 S31 的产品提示词里抽出数值/色值 token，看有多少原样出现在 data.js 的 S31 条目里。 */
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const c = { window: {} };
vm.createContext(c);
vm.runInContext(readFileSync(join(ROOT, 'prototypes/_selection/data.js'), 'utf8'), c);
const s = c.window.SCHEMES.find((x) => x.id === 'S31');
const dataText = JSON.stringify(s);

const prompt = readFileSync(join(ROOT, 'deliverables/78-northstar/blind/S31/task.txt'), 'utf8');

/* 抽 token：hex、带单位的数、字体名、纯数字比例 */
const toks = new Set();
for (const m of prompt.matchAll(/#[0-9A-Fa-f]{6}/g)) toks.add(m[0]);
for (const m of prompt.matchAll(/\b\d+(?:\.\d+)?(?:px|vw|fr|mm|%)\b/g)) toks.add(m[0]);
for (const m of prompt.matchAll(/\bclamp\([^)]+\)/g)) toks.add(m[0]);
for (const m of prompt.matchAll(/\b\d+\.\d+\s*倍/g)) toks.add(m[0].replace(/\s/g, ''));

const inData = [], notInData = [];
for (const t of toks) {
  const probe = t.replace(/px$|vw$|fr$|mm$|%$/, '');
  if (dataText.includes(t) || dataText.includes(probe)) inData.push(t);
  else notInData.push(t);
}
console.log(`data.js S31 条目长度: ${dataText.length} 字符`);
console.log(`提示词里抽取的数值/色值 token: ${toks.size}`);
console.log(`原样出现在 data.js 里: ${inData.length}`);
console.log(`未出现: ${notInData.length}  ${notInData.join(' ')}`);
console.log('\n出现的 token 清单:');
console.log([...inData].join(' '));
