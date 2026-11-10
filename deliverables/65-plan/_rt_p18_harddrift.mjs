// 探针 18：README 承诺的「9 个方案会报警告」 vs 界面实际会报警告的案
// 判据来源：prompt-copy.js:496-505（riskyTopic=hard / riskyCount=degrades）
import { readFileSync } from 'node:fs';

const ROOT = 'D:/Web/style';
const win = {};
global.window = win;
global.document = { readyState: 'complete', addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, remove() {}, addEventListener() {} }) };

const SEL = ROOT + '/prototypes/_selection';
function loadVar(f, v) {
  const t = readFileSync(SEL + '/' + f, 'utf8');
  const i = t.indexOf('window.' + v + ' ');
  const s = t.slice(t.indexOf('=', i) + 1);
  return JSON.parse(s.slice(0, s.lastIndexOf('};') + 1));
}
win.STYLE_PROMPTS = loadVar('prompts.js', 'STYLE_PROMPTS');
const ds = readFileSync(SEL + '/data.js', 'utf8');
// data.js: window.SCHEMES = [...]  →   以最后的 `;\n` 收尾
const dsj = ds.slice(ds.indexOf('= ') + 2).replace(/;\s*$/, '');
win.SCHEMES = JSON.parse(dsj);
new Function('window', 'document', 'location', 'navigator', 'console', readFileSync(SEL + '/prompt-copy.js', 'utf8'))(win, global.document, { href: 'x', pathname: '/x' }, {}, console);

const README_HARD = ['S03', 'S05', 'S10', 'S14', 'S15', 'S18', 'S20', 'S21', 'S29'];
console.log('README.md:103 / README-EN.md:103 承诺会报警告的 9 个：');
console.log('  ' + README_HARD.join(' '));
console.log('');

// 复刻 prompt-copy.js 的判定
console.log('案   hard  degrades  实际会报警告   README 说要报  一致');
let mismatch = [];
for (const s of win.STYLE_PROMPTS.schemes) {
  const riskyTopic = !!s.hard;
  const riskyCount = !!(s.capacity && s.capacity.degrades === 'yes');
  const warns = riskyTopic || riskyCount;
  const promised = README_HARD.includes(s.id);
  const ok = warns === promised;
  if (!ok) mismatch.push({ id: s.id, warns, promised, hard: s.hard, deg: s.capacity && s.capacity.degrades });
  console.log(`${s.id}  ${String(s.hard).padEnd(5)} ${String(s.capacity && s.capacity.degrades).padEnd(9)} ${String(warns).padEnd(13)} ${String(promised).padEnd(14)} ${ok ? '✔' : '✗'}`);
}
console.log('');
console.log('=== 不一致明细 ===');
if (!mismatch.length) console.log('  无');
for (const m of mismatch) {
  const dir = m.promised && !m.warns ? 'README 说会报，实际不报（用户被承诺了不存在的警告）' : 'README 没写，实际会报（少报）';
  console.log(`  ${m.id}  hard=${m.hard} degrades=${m.deg} → ${dir}`);
}
console.log('');
console.log('prompts.js hardIds = ' + JSON.stringify(win.STYLE_PROMPTS.hardIds));
console.log('README 承诺 9 个，实际 hardIds 4 个。差的 5 个：' + README_HARD.filter((x) => !win.STYLE_PROMPTS.hardIds.includes(x)).join(' '));

console.log('');
console.log('=== 那 5 个「掉了警告」的案，现在默认提示词里还有没有数量警告兜底？===');
for (const id of README_HARD.filter((x) => !win.STYLE_PROMPTS.hardIds.includes(x))) {
  const s = win.STYLE_PROMPTS.schemes.find((x) => x.id === id);
  console.log(`  ${id}  degrades=${s.capacity.degrades} → ` + (s.capacity.degrades === 'yes' ? '有数量警告兜底' : '★ 完全没有警告了'));
}
