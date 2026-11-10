// 探针 10：提示词默认参数（o.count 不传）下，「我实际有 N 个条目」用的是 minItems，
// 而 minItems 在设计文档里被明确定义为「同构重复单元的设计规模，不是至少这么多」。
// 检验：默认提示词是否把「设计规模」当成「用户的真实条目数」讲给 AI。
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:/Web/style';
const SEL = join(ROOT, 'prototypes/_selection');
const win = {};
global.window = win;
global.document = { readyState: 'complete', addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, remove() {}, addEventListener() {} }) };
const loadVar = (f, v) => { const t = readFileSync(join(SEL, f), 'utf8'); const i = t.indexOf('window.' + v + ' '); const eq = t.indexOf('=', i); return JSON.parse(t.slice(eq + 1, t.lastIndexOf(';'))); };
win.STYLE_PROMPTS = loadVar('prompts.js', 'STYLE_PROMPTS');
const ds = readFileSync(join(SEL, 'data.js'), 'utf8');
win.SCHEMES = JSON.parse(ds.slice(ds.indexOf('= ') + 2).replace(/;\s*$/, ''));
new Function('window', 'document', 'location', 'navigator', 'console', readFileSync(join(SEL, 'prompt-copy.js'), 'utf8'))(win, global.document, { href: 'x', pathname: '/x' }, {}, console);

console.log('=== 默认提示词里的「我实际有 N 个条目」 ===');
const rows = [];
for (const s of win.STYLE_PROMPTS.schemes) {
  const p = win.buildStylePrompt(s.id);              // 不带 opts —— 就是用户点按钮时的默认
  const m = /我实际有 (\d+) 个条目，就排 (\d+) 个/.exec(p);
  const deg = s.capacity ? s.capacity.degrades : '?';
  const unit = /我经营一家小店/.test(p);
  rows.push({ id: s.id, n: m ? +m[1] : null, deg, plain: s.plain });
}
rows.sort((a, b) => b.n - a.n);
for (const r of rows) console.log(`  ${r.id}  N=${String(r.n).padStart(2)}  degrades=${r.deg.padEnd(3)}  ${r.plain}`);
const ns = rows.map((r) => r.n);
console.log(`\n  N 分布：最小 ${Math.min(...ns)}｜中位 ${ns.slice().sort((a, b) => a - b)[15]}｜最大 ${Math.max(...ns)}`);
console.log(`  N ≥ 10 的案：${rows.filter((r) => r.n >= 10).length}/30 → ${rows.filter((r) => r.n >= 10).map((r) => r.id + '=' + r.n).join(' ')}`);
console.log(`  N ≥ 20 的案：${rows.filter((r) => r.n >= 20).length}/30 → ${rows.filter((r) => r.n >= 20).map((r) => r.id + '=' + r.n).join(' ')}`);

console.log('');
console.log('=== 同一段里第 1 条与第 2 条是否互相矛盾 ===');
console.log('  第 1 条（断言事实）：「我实际有 N 个条目，就排 N 个」');
console.log('  第 2 条（自动流案）：「按你真实的数量排即可」 ← 已经承认 N 不一定是真实数');
const autoFlow = rows.filter((r) => r.deg === 'no');
console.log(`  自动流案（degrades=no）共 ${autoFlow.length} 个，全部同时命中上面两句：${autoFlow.map((r) => r.id).join(' ')}`);

console.log('');
console.log('=== 举证：S07 的 46 与 S19 的 20 在 README/报告中怎么定义 ===');
const rd = readFileSync(join(ROOT, 'README.md'), 'utf8');
rd.split(/\r?\n/).forEach((l, i) => {
  if (/minItems|设计规模|46 条/.test(l)) console.log(`  README.md:${i + 1}  ${l.replace(/\s+/g, ' ').slice(0, 260)}`);
});
const cm = readFileSync(join(ROOT, 'prototypes/_selection/app.js'), 'utf8');
cm.split(/\r?\n/).forEach((l, i) => {
  if (/设计规模|至少/.test(l)) console.log(`  app.js:${i + 1}  ${l.trim().slice(0, 240)}`);
});
const bp = readFileSync(join(ROOT, 'prototypes/_prompts/build-prompts.mjs'), 'utf8');
bp.split(/\r?\n/).forEach((l, i) => {
  if (/设计规模|不是"至少要这么多"/.test(l)) console.log(`  build-prompts.mjs:${i + 1}  ${l.trim().slice(0, 240)}`);
});
