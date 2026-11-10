// 侦察 2：两条链的「字段语义」级差异（不是格式级）
// 关键问题：data.js 的 palette/primary/fonts 到底和 prompts.js 是不是"同一件事"？
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const ROOT = 'D:/Web/style';
const P = ROOT + '/prototypes';

const dataJs = readFileSync(join(P, '_selection/data.js'), 'utf8');
const sbD = { window: {} };
new Function('window', dataJs)(sbD.window);
const SCHEMES = sbD.window.SCHEMES || [];
const dM = new Map(SCHEMES.map((s) => [s.id, s]));

const pr = readFileSync(join(P, '_selection/prompts.js'), 'utf8');
const sbP = { window: {} };
new Function('window', pr)(sbP.window);
const pM = new Map((sbP.window.STYLE_PROMPTS.schemes || []).map((s) => [s.id, s]));

console.log('════ S04 逐字段深看：为什么 palette 顺序不同？════\n');
const d4 = dM.get('S04'), p4 = pM.get('S04');
console.log('data.js:');
console.log('  palette:', JSON.stringify(d4.palette));
console.log('  primary:', JSON.stringify(d4.primary));
console.log('  bg:', JSON.stringify(d4.bg));
console.log('  fonts:', JSON.stringify(d4.fonts).slice(0, 120));
console.log('prompts.js (dna):');
console.log('  palette:', JSON.stringify(p4.dna.palette));
console.log('  primary:', JSON.stringify(p4.dna.primary));
console.log('  fonts:', JSON.stringify(p4.dna.fonts));

console.log('\n════ 关键差异：palette 的「顺序」vs「集合」════\n');
const HEXT = /#([0-9a-fA-F]{6})(?![0-9a-fA-F])/g;
const hx = (s) => [...String(s).matchAll(HEXT)].map((m) => m[0].toUpperCase());
let orderDiff = 0, setDiff = 0;
for (const id of dM.keys()) {
  const d = hx((dM.get(id).palette || []).join(' '));
  const r = pM.get(id)?.dna?.palette;
  const p = hx(Array.isArray(r) ? r.join(' ') : String(r || ''));
  const sameSet = JSON.stringify([...d].sort()) === JSON.stringify([...p].sort());
  const sameOrder = JSON.stringify(d) === JSON.stringify(p);
  if (!sameOrder) orderDiff++;
  if (!sameSet) setDiff++;
}
console.log(`顺序不同: ${orderDiff}/30`);
console.log(`集合不同: ${setDiff}/30  ← 这个才是真差异`);

console.log('\n════ data.js 的 palette[0] 是否 = bg？（app.js 注释声称 30/30 相等）════\n');
let bgEq = 0;
for (const id of dM.keys()) {
  const s = dM.get(id);
  const p0 = String((s.palette || [])[0] || '').toUpperCase();
  const bg = String(s.bg || '').toUpperCase();
  if (p0 === bg) bgEq++;
}
console.log(`palette[0] === bg: ${bgEq}/30`);

console.log('\n════ data.js 的 primary 是否 = palette[1]？（app.js:945 声称 30/30）════\n');
let priEq = 0;
for (const id of dM.keys()) {
  const s = dM.get(id);
  const p1 = String((s.palette || [])[1] || '').toUpperCase();
  const pri = String(s.primary || '').toUpperCase();
  if (p1 === pri) priEq++;
}
console.log(`primary === palette[1]: ${priEq}/30`);

console.log('\n════ prompts.js 的 primary 来源 ════\n');
const pWithPrimary = [...pM.values()].filter((s) => (s.dna?.primary || []).length > 0);
console.log(`有 primary 的案: ${pWithPrimary.length}/30`);
console.log('样例:', pWithPrimary.slice(0, 3).map((s) => `${s.id}=${JSON.stringify(s.dna.primary)}`).join('  '));

console.log('\n════ 消费方：谁读 data.js 的 palette，谁读 prompts.js 的 palette？════\n');
for (const f of ['app.js', 'wizard.js', 'prompt-copy.js']) {
  const src = readFileSync(join(P, '_selection', f), 'utf8');
  const usesPalette = (src.match(/palette/g) || []).length;
  const usesPrimary = (src.match(/primary/g) || []).length;
  const usesFonts = (src.match(/fonts/g) || []).length;
  console.log(`  ${f.padEnd(18)} palette:${String(usesPalette).padStart(3)}  primary:${String(usesPrimary).padStart(3)}  fonts:${String(usesFonts).padStart(3)}`);
}

console.log('\n════ 结论 ════');
console.log('data.js 的 palette 服务于 UI（色块展示、搜索索引），');
console.log('prompts.js 的 palette 服务于提示词（AI 施工图）。');
console.log('两者「语义不同」，但**用户看到的是前者，拿到的是后者**。');
