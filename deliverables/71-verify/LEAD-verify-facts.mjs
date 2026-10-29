// 核实测量 Agent 的 P0：L2 的 pickPalette 有 9 案零召回（提示词里没有主色信息）
// 以及 S27 的 #FFFFFF 被 L1 截掉
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const ROOT = 'D:/Web/style';
const P = ROOT + '/prototypes';

const dna = JSON.parse(readFileSync(P + '/_prompts/dna-clean.json', 'utf8'));
const DNA = Array.isArray(dna) ? dna : Object.values(dna);

const pr = readFileSync(P + '/_selection/prompts.js', 'utf8');
const sbP = { window: {} };
new Function('window', pr)(sbP.window);
const PSP = sbP.window.STYLE_PROMPTS.schemes || [];
const pM = new Map(PSP.map((s) => [s.id, s]));

const HEXT = /#([0-9a-fA-F]{6})(?![0-9a-fA-F])/g;
const hx = (s) => [...String(s).matchAll(HEXT)].map((m) => m[0].toUpperCase());

console.log('════ 核实 1：pickPalette 的 primary 零召回 ════\n');
const NO_PRI = ['S01', 'S08', 'S13', 'S14', 'S17', 'S18', 'S20', 'S25', 'S26'];
console.log('案    dna.primary   dna.palette 色数   dna.palette[0]   规格里的主色');
console.log('-'.repeat(88));

const NEG = /(反的是|反\s|不采用|修正前|不是|禁止|不新增|旧值|避免|不用)/;
function specPrimary(id) {
  const p = join(P, '_specs', id + '.md');
  if (!existsSync(p)) return null;
  const md = readFileSync(p, 'utf8');
  const lines = md.split(/\r?\n/);
  const i = lines.findIndex((l) => /配色系统/.test(l));
  if (i < 0) return null;
  const buf = [lines[i]];
  for (let j = i + 1; j < lines.length; j++) {
    if (/^\*{0,2}4[\.．]?\s/.test(lines[j].trim())) break;
    buf.push(lines[j]);
  }
  for (const seg of buf.join('\n').split(/[；。\n]/)) {
    if (!/主色/.test(seg)) continue;
    if (NEG.test(seg)) continue;
    const m = seg.match(/#([0-9a-fA-F]{6})(?![0-9a-fA-F])/);
    if (m) return m.toUpperCase === undefined ? m[0].toUpperCase() : m[0].toUpperCase();
  }
  return null;
}

let zeroRecall = 0;
for (const e of DNA) {
  const pri = (e.primary || []).join(',');
  const pal = hx((e.palette || []).join(' '));
  const sp = specPrimary(e.id);
  const isZero = !pri;
  if (isZero) zeroRecall++;
  const flag = NO_PRI.includes(e.id) ? '  ← Agent 点名的' : '';
  console.log(
    `${e.id}  ${String(pri || '(空)').padEnd(12)} ${String(pal.length).padStart(2)}          ${String(pal[0] || '').padEnd(10)} ${String(sp || '').padEnd(10)}${flag}`
  );
}
console.log('-'.repeat(88));
console.log(`\ndna.primary 为空的案: ${zeroRecall}/30`);
console.log(`Agent 点名的 9 案: ${NO_PRI.join(' ')}`);

console.log('\n\n════ 核实：提示词里有没有主色信息？════\n');
console.log('（若 dna.primary 为空，看提示词的配色段是否仍含规格主色）\n');
let hasPriInPrompt = 0;
for (const e of DNA) {
  const sp = specPrimary(e.id);
  const rawPal = pM.get(e.id)?.dna?.palette;
  const pPal = hx(Array.isArray(rawPal) ? rawPal.join(' ') : String(rawPal || ''));
  const inPrompt = sp && pPal.includes(sp);
  if (inPrompt) hasPriInPrompt++;
  if (NO_PRI.includes(e.id)) {
    console.log(`  ${e.id}  规格主色=${sp || '?'}  在提示词色板里? ${inPrompt ? '✓ 在' : '✗ 不在'}`);
  }
}
console.log(`\n30 案里规格主色出现在提示词色板的: ${hasPriInPrompt}/30`);

console.log('\n\n════ 核实 2：S27 的 #FFFFFF ════\n');
const s27 = DNA.find((e) => e.id === 'S27');
console.log('S27 dna.palette:', JSON.stringify(s27?.palette));
console.log('含 #FFFFFF?', hx((s27?.palette || []).join(' ')).includes('#FFFFFF'));
const dataJs = readFileSync(P + '/_selection/data.js', 'utf8');
const sbD = { window: {} };
new Function('window', dataJs)(sbD.window);
const d27 = (sbD.window.SCHEMES || []).find((s) => s.id === 'S27');
console.log('S27 data.js palette:', JSON.stringify(d27?.palette));
console.log('S27 data.js primary:', d27?.primary);
// 规格里 S27 的白色说明
const sp27 = readFileSync(P + '/_specs/S27.md', 'utf8');
const i27 = sp27.indexOf('配色系统');
console.log('\nS27 规格字段3：');
console.log(sp27.slice(i27, i27 + 500));
