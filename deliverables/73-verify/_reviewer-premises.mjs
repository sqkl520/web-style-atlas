/* 核对两个前提：
 *  1) prompt-copy.js:180 的数组分支是否真是死代码（dna.fonts 是否 30/30 都是对象）
 *  2) data.js diff 里唯一那条非改名改动（S08.gate.at）是不是 P2 的副作用
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const ROOT = 'D:/Web/style';
const w = { window: {} };
new Function('window', readFileSync(ROOT + '/prototypes/_selection/prompts.js', 'utf8'))(w.window);
const P = w.window.STYLE_PROMPTS;

console.log('═══ 1) dna.fonts 的真实形状（决定 prompt-copy.js:180 是否死代码）═══');
const kinds = {};
for (const s of P.schemes) {
  const f = s.dna && s.dna.fonts;
  const k = Array.isArray(f) ? 'array' : f === null ? 'null' : typeof f;
  kinds[k] = (kinds[k] || 0) + 1;
}
console.log('  30 案的 dna.fonts 形状分布:', JSON.stringify(kinds));
const withLen = P.schemes.filter((s) => s.dna && s.dna.fonts && s.dna.fonts.length !== undefined);
console.log('  有 .length 属性的案数:', withLen.length, '（数组才为 30）');
console.log('  ⇒ 数组分支', kinds.array ? '有数据会走到' : '永远走不到（死代码）');

console.log('\n═══ 2) data.js diff 里那条非改名改动 ═══');
const ud = execSync('git diff -U0 -- prototypes/_selection/data.js', { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
const plus = ud.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++'));
const atLine = plus.find((l) => /"at":/.test(l));
console.log('  唯一非字体策略的新增行:', atLine ? atLine.trim() : '（无）');
console.log('  它属于哪个案: 需要看 hunk 头');
const hunks = ud.split('\n').filter((l) => l.startsWith('@@'));
console.log('  diff 的 hunk 数:', hunks.length);
const atIdx = ud.split('\n').findIndex((l) => l === atLine);
const before = ud.split('\n').slice(0, atIdx).filter((l) => l.startsWith('@@')).pop();
console.log('  该行所在 hunk:', before);
/* 该 hunk 里 fonts→fontsSpec 的配对 */
const hunkLines = ud.split('\n').slice(ud.split('\n').indexOf(before), atIdx + 1);
console.log('  hunk 内 -fonts 行数:', hunkLines.filter((l) => /^-\s+"fonts":/.test(l)).length);
console.log('  hunk 内 +fontsSpec 行数:', hunkLines.filter((l) => /^\+\s+"fontsSpec":/.test(l)).length);
console.log('  ⇒ 这条 "at" 与改名同处一个 hunk 但语义无关（S08 的闸门时间戳）');
/* 确认这个 at 来自哪里 */
const rep = JSON.parse(readFileSync(ROOT + '/prototypes/S08-amber-overprint-lightbox/.inspect/report.json', 'utf8'));
console.log('  S08 report.json 的 "at":', rep.at);
console.log('  data.js 里 S08.gate.at 的值:', (() => {
  const d = JSON.parse(readFileSync(ROOT + '/prototypes/_selection/data.js', 'utf8').match(/window\.SCHEMES\s*=\s*(\[[\s\S]*\])\s*;/)[1]);
  return d.find((r) => r.id === 'S08').gate.at;
})());
console.log('  ⇒ 生成器把 S08 的 inspect 时间戳抄进了 data.js；这份 report.json 在本次改动中被改写过');
const headRep = JSON.parse(execSync('git show HEAD:prototypes/S08-amber-overprint-lightbox/.inspect/report.json', { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 }));
console.log('  HEAD 的 S08 report.at:', headRep.at);
const mOf = (r) => JSON.stringify((r.viewports || []).map((v) => v.motion && v.motion.elements));
console.log('  HEAD motion.elements:', mOf(headRep), ' NOW:', mOf(rep));
