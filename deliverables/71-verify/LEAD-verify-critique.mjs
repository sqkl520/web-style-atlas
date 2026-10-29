// 核实批判 Agent 的三个指控
// 1. app.js 把 palette[1] 印成「主色」，与权威主色不符 5/30
// 2. check-twolines 的 R2/R3/R4 是构造恒真式
// 3. pickPalette 现在读 _specs，两链共享上游，R1 不再是跨源对账
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const ROOT = 'D:/Web/style';
const P = ROOT + '/prototypes';

const dataJs = readFileSync(P + '/_selection/data.js', 'utf8');
const sbD = { window: {} };
new Function('window', dataJs)(sbD.window);
const SCHEMES = sbD.window.SCHEMES || [];
const dM = new Map(SCHEMES.map((s) => [s.id, s]));

console.log('════ 指控 1：UI 印的「主色」与权威主色不符 ════\n');

/* 权威主色：从规格字段 3 里找带「主色」角色词的那句的第一个 hex */
const HEXT = /#([0-9a-fA-F]{6})(?![0-9a-fA-F])/g;
const NEG = /(反的是|反\s|不采用|修正前|不是|禁止|不新增|旧值)/;

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
  const text = buf.join('\n');
  // 按分句切，找含「主色」且不在否定语境的
  for (const seg of text.split(/[；。\n]/)) {
    if (!/主色/.test(seg)) continue;
    if (NEG.test(seg)) continue;
    // 取「主色」之前最近的一个 hex
    const m = seg.match(HEXT);
    if (!m) continue;
    return m[0].toUpperCase();
  }
  return null;
}

console.log('案    UI 标的「主色」(palette[1])   规格里的主色      一致?');
console.log('-'.repeat(70));
let agree = 0, disagree = 0;
const bad = [];
for (const id of [...dM.keys()].sort()) {
  const pal = (dM.get(id).palette || []).map((h) => String(h).toUpperCase());
  const uiPri = pal[1] || '';
  const real = specPrimary(id);
  if (!real) { console.log(`${id}  （规格无主色声明）`); continue; }
  const ok = uiPri === real;
  if (ok) agree++; else { disagree++; bad.push({ id, uiPri, real }); }
  console.log(`${id}  ${uiPri.padEnd(24)} ${real.padEnd(16)} ${ok ? '✓' : '✗'}`);
}
console.log('-'.repeat(70));
console.log(`\n一致: ${agree}   不符: ${disagree}`);
if (bad.length) {
  console.log('\n=== UI 说假话的案 ===');
  for (const x of bad) console.log(`  ${x.id}  UI 说主色是 ${x.uiPri}，规格写的是 ${x.real}`);
}

console.log('\n\n════ 指控 2：R2/R3/R4 是不是构造恒真式 ════\n');
const collectSrc = readFileSync(P + '/_build/collect-schemes.mjs', 'utf8');
const cl = collectSrc.split(/\r?\n/);
console.log('=== collect-schemes.mjs 里构造 palette 的代码（L483-496）===');
for (let i = 482; i < 496; i++) console.log(`${String(i + 1).padStart(4)}: ${cl[i]}`);

console.log('\n→ 若先 push(bg) 再 push(primary)，则 palette[0]===bg 与 palette[1]===primary');
console.log('  是**构造出来的**，不是"实测发现的一致性"。');
console.log('  那么 R2/R3 永远为真，等于恒真式（tautology）。');

console.log('\n\n════ 指控 3：pickPalette 现在读 _specs 了吗？════\n');
const cleanSrc = readFileSync(P + '/_prompts/clean-dna.mjs', 'utf8');
const hasSpecRead = /_specs/.test(cleanSrc);
console.log(`clean-dna.mjs 里出现 "_specs": ${hasSpecRead ? '是' : '否'}`);
if (hasSpecRead) {
  const lines2 = cleanSrc.split(/\r?\n/);
  lines2.forEach((l, i) => { if (/_specs/.test(l)) console.log(`  ${i + 1}: ${l.trim().slice(0, 120)}`); });
}
console.log('\n→ 若 prompts.js 的 palette 现在也读 _specs，那两条链共享上游，');
console.log('  R1（data ⊆ prompts）不再是"跨源对账"，而是"自己对自己"。');
