/* 为负对照 S99 找一组「没被任何原型用过」的配色与字体。
 * 目的：S99 必须是真·不存在的风格，否则控制组失去意义。 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const c = { window: {} };
vm.createContext(c);
vm.runInContext(readFileSync(join(ROOT, 'prototypes/_selection/data.js'), 'utf8'), c);
const W = c.window.SCHEMES;

const usedHex = new Set();
const usedFont = new Set();
for (const s of W) {
  for (const h of JSON.stringify(s).match(/#[0-9A-Fa-f]{6}/g) || []) usedHex.add(h.toUpperCase());
}
const c2 = { window: {} };
vm.createContext(c2);
vm.runInContext(readFileSync(join(ROOT, 'prototypes/_selection/prompts.js'), 'utf8'), c2);
for (const s of c2.window.STYLE_PROMPTS.schemes) {
  const f = s.dna?.fonts || {};
  for (const k of ['display', 'body', 'mono']) if (f[k]) usedFont.add(f[k]);
}

/* 候选：一组冷门但真实的色值（深青灰 + 一点芥末），字体用仓库字体库里有的 */
const candHex = ['#1F2A2E', '#E8E3D9', '#7A8C8E', '#C9A227', '#3C4A4D'];
const candFont = ['Spectral', 'Karla', 'Source Code Pro'];

console.log('=== S99 候选配色是否与现有原型冲突 ===');
for (const h of candHex) {
  console.log(`  ${h}  ${usedHex.has(h) ? '✗ 已被使用' : '✓ 未使用'}`);
}
console.log('=== S99 候选字体是否与现有原型冲突 ===');
for (const f of candFont) console.log(`  ${f}  ${usedFont.has(f) ? '✗ 已使用' : '✓ 未使用'}`);

console.log('\n=== 仓库字体库里有哪些可用族（前 20）===');
const fontDir = join(ROOT, 'prototypes/_fonts/css');
try {
  const files = readdirSync(fontDir).filter((f) => f.endsWith('.css'));
  console.log(files.slice(0, 20).map((f) => f.replace(/__.*/, '')).join(' '));
  console.log(`共 ${files.length} 个字体 css`);
} catch { console.log('（读不到字体目录）'); }
