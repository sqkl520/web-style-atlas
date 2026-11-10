/* 新问题③：README 与提示词实测的「配色几个色」不一致，且 check-docs 不查 palette。
 *
 * README.md:84 写「配色（4–5 个色值）」，README.md:96 的示例提示词写
 *   「1. 配色只用这几个值：#E4DECD #D8CFB6 #4A5C3A #2A241C #7C7460」——5 个色。
 * 但 clean-dna.mjs 的 MAX 已经是 7（P0-4 修复后），实际分布 4–7。
 *
 * 本探针真的把 prompt-copy.js 跑起来（与 check-docs.mjs:374-395 同一条路径），
 * 数出「1. 配色只用这几个值：」那一行到底有几个色，再与 README 的说法对照。
 *
 *   node deliverables/71-plan/redteam/rt-x3-readme.mjs
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { ROOT, SEL, h1, h2, loadPrompts } from './rt-lib.mjs';

const prompts = loadPrompts();

/* 与 check-docs.mjs:376-395 完全同一条装载路径（含 document 桩） */
function buildAll() {
  const win = {};
  global.window = win;
  global.document = {
    readyState: 'complete',
    addEventListener() {},
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
    createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, remove() {}, addEventListener() {} }),
  };
  const sandbox = { window: win };
  vm.createContext(sandbox);
  sandbox.document = global.document;
  for (const f of ['data.js', 'prompts.js', 'prompt-copy.js']) {
    vm.runInContext(readFileSync(join(SEL, f), 'utf8'), sandbox, { filename: f });
  }
  return { win };
}
const { win } = buildAll();
const build = win.buildStylePrompt;
if (typeof build !== 'function') { console.log('buildStylePrompt 不可用，退出'); process.exit(2); }

h1('提示词里「配色只用这几个值」的真实色数');
const rows = [];
for (const s of prompts) {
  let txt = '';
  try { txt = build(s.id); } catch (e) { txt = ''; }
  if (!txt) continue;
  const m = txt.match(/1\.\s*配色只用这几个值：([^。]*)。/);
  if (!m) continue;
  const n = (m[1].match(/#[0-9A-Fa-f]{6}/g) || []).length;
  rows.push({ id: s.id, n, line: m[1].trim(), len: txt.length });
}
if (!rows.length) {
  console.log('无法通过现有全局构建提示词，改用 prompts.js 的 dna.palette 计数（等价，build-prompts 不再加工色数）：');
  for (const s of prompts) {
    const raw = String(s.dna && s.dna.palette || '');
    rows.push({ id: s.id, n: (raw.match(/#[0-9A-Fa-f]{6}/g) || []).length, line: raw.replace(/（[^）]*）/g, '') });
  }
} else {
  console.log(`（已真的跑 prompt-copy.js 生成提示词，${rows.length}/30 案取到配色行）`);
}

rows.sort((a, b) => a.id.localeCompare(b.id));
const dist = rows.reduce((a, r) => (a[r.n] = (a[r.n] || 0) + 1, a), {});
for (const r of rows) console.log(`  ${r.id}  ${r.n} 色   ${r.line.slice(0, 90)}`);
h2('分布');
console.log('实际色数分布：' + JSON.stringify(dist));
console.log(`区间：${Math.min(...rows.map((r) => r.n))}–${Math.max(...rows.map((r) => r.n))}`);
console.log(`色数 = 5 的案：${rows.filter((r) => r.n === 5).length}/30`);
console.log(`色数 > 5 的案：${rows.filter((r) => r.n > 5).length}/30`);

h2('与 README 的声称对照');
const readme = readFileSync(join(ROOT, 'README.md'), 'utf8').split('\n');
for (const ln of readme) {
  if (/配色（[\d–\-]+ 个色值）/.test(ln)) console.log('  README.md  表头 : ' + ln.trim());
  if (/配色只用这几个值：/.test(ln)) console.log('  README.md  示例 : ' + ln.trim().slice(0, 120));
}
const readmeMax = 5;
const bad = rows.filter((r) => r.n > readmeMax);
console.log(`\nREADME 声称上限 ${readmeMax} 色，实测超出的案：${bad.length}/30`);
for (const r of bad) console.log(`  ${r.id} 实际 ${r.n} 色`);

h2('结论');
if (bad.length) {
  console.log('README 的「4–5 个色值」与实测不符，且 check-docs.mjs 没有任何 palette 相关断言 —— 这条谎没有守卫。');
  console.log('这不是"两条链不一致"，是"文档与两条链都不一致"。');
} else {
  console.log('README 声称与实测一致。');
}
