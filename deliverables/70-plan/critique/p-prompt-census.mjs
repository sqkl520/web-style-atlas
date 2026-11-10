// 探针：把 30 案「用户真的会复制到剪贴板的东西」逐案 dump 出来，用于
//   ① 数提示词里的色值条数（prompts.js 声明 vs 用户拿到的字符串）
//   ② 数字号/行高/配比/线宽各出现几次（Q4 的"约束条数"估算基础）
//   ③ 判断 S19 的 #5E5443（247 次正文色）在不在提示词里
// 装载路径与 check-docs.mjs 一致：vm 里跑 prompts.js + prompt-copy.js，调 window.buildStylePrompt。
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const ROOT = 'D:/Web/style';
const SEL = join(ROOT, 'prototypes/_selection');
// 与 check-docs.mjs:365-392 同一条装载路径（它用 global.document 打桩，否则 prompt-copy.js 末尾
// 的 DOMContentLoaded 注册会 ReferenceError）。
global.document = {
  readyState: 'complete',
  addEventListener() {},
  querySelector: () => null,
  querySelectorAll: () => [],
  getElementById: () => null,
  createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, remove() {}, addEventListener() {} }),
};
const sandbox = { window: {}, console };
sandbox.document = global.document;
vm.createContext(sandbox);
vm.runInContext(readFileSync(join(SEL, 'data.js'), 'utf8'), sandbox, { filename: 'data.js' });
vm.runInContext(readFileSync(join(SEL, 'prompts.js'), 'utf8'), sandbox, { filename: 'prompts.js' });
vm.runInContext(readFileSync(join(SEL, 'prompt-copy.js'), 'utf8'), sandbox, { filename: 'prompt-copy.js' });
const win = sandbox.window;
const build = win.buildStylePrompt;
const ids = win.SCHEMES.map((s) => s.id).sort();

const HEX = /#[0-9a-fA-F]{6}\b/g;
const rows = [];
const full = {};
for (const id of ids) {
  let p;
  // ⚠️ 不能传 biz/action：那两个值会**逐字进提示词正文**，于是 30/30 都含同一句
  // 「我经营测试生意」，把"30 案逐字相同的模板行"这个统计污染成我自己的输入。
  // 用不传 opts 的口径（与 README 承诺的 1639–1998 字、check-docs 的 nums/prompt-len 一致）。
  try { p = build(id); }
  catch (e) { rows.push({ id, err: String(e).slice(0, 60) }); continue; }
  full[id] = p;
  const hexOut = [...new Set([...p.matchAll(HEX)].map((m) => m[0].toUpperCase()))];
  const dna = win.STYLE_PROMPTS.schemes.find((s) => s.id === id) || {};
  const hexDna = [...new Set((dna.palette || []).flatMap((x) => [...String(x).matchAll(HEX)].map((m) => m[0].toUpperCase())))];
  rows.push({
    id,
    chars: p.length,
    hexOut: hexOut.length,
    hexDna: hexDna.length,
    // 字号：px 值 / clamp( / vw
    px: (p.match(/\d+(?:\.\d+)?px/g) || []).length,
    clamp: (p.match(/clamp\(/g) || []).length,
    vw: (p.match(/\d+(?:\.\d+)?vw/g) || []).length,
    ratio: (p.match(/占\s*\d+\s*%|\d+%/g) || []).length,
    lh: (p.match(/行高|line-height/g) || []).length,
    fs: (p.match(/字号|font-size/g) || []).length,
    lw: (p.match(/线宽/g) || []).length,
    has5E: /#5E5443/i.test(p),
  });
}

console.log('id  字数  提示词色数  dna色数   px数 clamp vw   %数  行高 字号 线宽  含#5E5443');
for (const r of rows) {
  if (r.err) { console.log(`${r.id}  ERROR ${r.err}`); continue; }
  console.log(
    `${r.id} ${String(r.chars).padStart(5)} ${String(r.hexOut).padStart(8)} ${String(r.hexDna).padStart(8)} ` +
    `${String(r.px).padStart(6)} ${String(r.clamp).padStart(4)} ${String(r.vw).padStart(3)} ` +
    `${String(r.ratio).padStart(4)} ${String(r.lh).padStart(5)} ${String(r.fs).padStart(4)} ${String(r.lw).padStart(4)}  ${r.has5E ? 'YES' : '-'}`
  );
}
const ok = rows.filter((r) => !r.err);
const sum = (k) => ok.reduce((a, r) => a + r[k], 0);
console.log('\n合计：px 出现 ' + sum('px') + ' 次，clamp ' + sum('clamp') + '，vw ' + sum('vw') +
  '，百分数 ' + sum('ratio') + '，行高 ' + sum('lh') + '，字号 ' + sum('fs') + '，线宽 ' + sum('lw'));
console.log('提示词字数：' + Math.min(...ok.map((r) => r.chars)) + '–' + Math.max(...ok.map((r) => r.chars)) +
  '，中位 ' + ok.map((r) => r.chars).sort((a, b) => a - b)[15]);
console.log('提示词色数 vs dna 色数不一致的案：' +
  ok.filter((r) => r.hexOut !== r.hexDna).map((r) => `${r.id}(${r.hexOut}/${r.hexDna})`).join(' '));

writeFileSync(join(ROOT, 'deliverables/70-plan/critique/p-prompts-dump.json'),
  JSON.stringify({ rows, full }, null, 1), 'utf8');
console.log('\n全文已落盘 deliverables/70-plan/critique/p-prompts-dump.json');
