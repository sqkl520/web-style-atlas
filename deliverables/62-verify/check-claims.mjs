import fs from 'fs';
import vm from 'vm';

const ROOT = 'D:/Web/style';
const frozenCopy = fs.readFileSync(ROOT + '/deliverables/62-verify/frozen-prompt-copy.js', 'utf8');

function mk(src) {
  const sb = { window: {}, console, Math, JSON, Set, Map, Object, Array, Number, String, isNaN, parseInt, parseFloat, RegExp, Date, navigator: {} };
  sb.global = sb;
  sb.document = {
    addEventListener() {}, getElementById() { return null; },
    createElement() { return { style: {}, setAttribute() {}, appendChild() {}, addEventListener() {} }; },
    querySelectorAll() { return []; }, body: { appendChild() {}, removeChild() {} },
  };
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(ROOT + '/prototypes/_selection/data.js', 'utf8'), sb, { filename: 'data.js' });
  vm.runInContext(src, sb, { filename: 'x' });
  vm.runInContext(frozenCopy, sb, { filename: 'prompt-copy.js' });
  return sb.window;
}

const t = fs.readFileSync(ROOT + '/deliverables/62-verify/dump30-frozen.txt', 'utf8');
const parts = t.split(/^===== (S\d+) =====$/m).slice(1);
const cases = [];
for (let i = 0; i < parts.length; i += 2) cases.push({ id: parts[i], body: parts[i + 1] });

// Conflict definition from the code comment: "不要拉高/不要为了凑数" vs "先凑到 N 个"
// Current implementation: one direction only. Detect a *contradiction pair*:
//   phrase A = says "don't leave holes / delete rows & reflow"
//   phrase B = says "add rows to reach N" / "凑到"
console.log('=== claim 3: structural self-contradiction in structure clause 2 ===');
const contradiction = [];
cases.forEach(c => {
  const sec = (c.body.split('结构约束：')[1] || '').split('防退化')[0];
  const saysAutoFlow = sec.includes('自动流排版');
  const saysManual = sec.includes('手工排定');
  const saysDeleteReflow = sec.includes('把空出来的位置删掉、整块重排');
  const saysPadUp = /凑到|补足到|先凑够|至少排 \d+|排满 \d+/.test(sec);
  const saysDontPad = /不要为了凑数编造内容|不凑整/.test(sec);
  // true contradiction: manual says pad up, OR both auto+manual, OR says delete-and-reflow while also demanding exactly N
  const both = saysAutoFlow && saysManual;
  if (both) contradiction.push(c.id + ':both-flow-modes');
  if (saysPadUp && saysDontPad) contradiction.push(c.id + ':padup-vs-dontpad');
  if (saysDeleteReflow && /就排 \d+ 个，不凑整/.test(sec) === false && /请先把数量凑/.test(sec)) contradiction.push(c.id + ':reflow-vs-padup');
});
console.log('contradictions found:', contradiction.length, contradiction.join(' '));

// Also directly check the exact old conflict wording is gone
const oldWording = cases.filter(c => /请先把数量凑到/.test(c.body)).map(c => c.id);
console.log('cases still containing old "请先把数量凑到":', oldWording.length, oldWording.join(' '));

// per-case clause-2 classification
console.log('\n--- clause 2 classification (frozen) ---');
const w = mk(fs.readFileSync(ROOT + '/prototypes/_selection/prompts.js', 'utf8'));
let yesManual = 0, noAuto = 0;
w.STYLE_PROMPTS.schemes.forEach(s => {
  const body = w.buildStylePrompt(s.id);
  const sec = (body.split('结构约束：')[1] || '').split('防退化')[0];
  const manual = sec.includes('手工排定');
  const auto = sec.includes('自动流');
  const deg = s.dna.degrades;
  const ok = (deg === true) ? manual : auto;
  if (!ok) console.log('  MISMATCH', s.id, 'degrades=', deg, 'manual=', manual, 'auto=', auto);
  if (manual) yesManual++; if (auto) noAuto++;
});
console.log('manual-flow cases:', yesManual, 'auto-flow cases:', noAuto, 'sum:', yesManual + noAuto);

// claim 8: S18 yes, S30 no
const s18 = w.STYLE_PROMPTS.schemes.find(x => x.id === 'S18');
const s30 = w.STYLE_PROMPTS.schemes.find(x => x.id === 'S30');
console.log('\n=== claim 8 ===');
console.log('S18 dna.degrades =', s18.dna.degrades, '| prompt clause:', /手工排定/.test(w.buildStylePrompt('S18')) ? 'manual(degrades=yes)' : 'autoflow(no)');
console.log('S30 dna.degrades =', s30.dna.degrades, '| prompt clause:', /手工排定/.test(w.buildStylePrompt('S30')) ? 'manual(yes)' : 'autoflow(no)');
const degYes = w.STYLE_PROMPTS.schemes.filter(s => s.dna.degrades === true).map(s => s.id);
console.log('degrades=yes set:', degYes.join(','), '(' + degYes.length + ')');
