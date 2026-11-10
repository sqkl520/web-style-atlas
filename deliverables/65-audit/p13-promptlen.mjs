// 探针 13：提示词总字数分布 + 若把 audit 加进提示词的体积影响推演
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, loadSchemes, loadPrompts } from './lib-load.mjs';

// 在 node 里伪造最小 window，直接加载 data.js / prompts.js / prompt-copy.js
const SEL = join(ROOT, 'prototypes/_selection');
const win = {};
globalThis.window = win;
globalThis.document = {
  createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, addEventListener() {}, remove() {} }),
  getElementById: () => null, addEventListener() {}, body: { appendChild() {} },
};

function run(file) {
  const src = readFileSync(join(SEL, file), 'utf8');
  // eslint-disable-next-line no-new-func
  new Function('window', 'document', 'navigator', src)(win, globalThis.document, globalThis.navigator);
}
run('data.js');
run('prompts.js');
run('prompt-copy.js');

const S = loadSchemes();
const P = loadPrompts();
const bp = win.buildStylePrompt;
if (typeof bp !== 'function') { console.log('buildStylePrompt 未挂上，放弃'); process.exit(0); }

const rows = [];
for (const s of P.schemes) {
  const t = bp(s.id);
  const rec = S.find((r) => r.id === s.id);
  rows.push({ id: s.id, len: t.length, riskLen: (s.dna.risk || '').length, auditLen: (rec && rec.audit || '').length, text: t });
}
console.log('案号\t提示词字数\trisk长度\trisk截断后进提示词\t本可加的 audit 长度');
for (const r of rows) console.log(`${r.id}\t${r.len}\t${r.riskLen}\t${Math.min(r.riskLen, 220)}\t${r.auditLen}`);

const lens = rows.map((r) => r.len).sort((a, b) => a - b);
const sum = (a) => a.reduce((x, y) => x + y, 0);
console.log(`\n字数：min ${lens[0]} / max ${lens[lens.length - 1]} / 中位 ${lens[Math.floor(lens.length / 2)]} / 均值 ${Math.round(sum(lens) / lens.length)}`);
console.log(`当前总字数 ${sum(lens)}`);

console.log('\n=== 若把 audit 全文加进提示词（假设追加一整段）===');
const proj = rows.map((r) => r.len + r.auditLen);
console.log(`投影：min ${Math.min(...proj)} / max ${Math.max(...proj)} / 均值 ${Math.round(sum(proj) / proj.length)}`);
console.log(`增幅：均值 +${Math.round((sum(proj) - sum(lens)) / rows.length)} 字 / 案，合计 +${sum(proj) - sum(lens)} 字`);

console.log('\n=== 若 audit 按 220 字截断（与 risk 同口径）===');
const proj2 = rows.map((r) => r.len + Math.min(r.auditLen, 220) + 30);
console.log(`投影：min ${Math.min(...proj2)} / max ${Math.max(...proj2)} / 均值 ${Math.round(sum(proj2) / proj2.length)}`);
console.log(`超出 2000 字的案：${rows.filter((r, i) => proj2[i] > 2000).map((r, i) => r.id).join(' ') || '无'}`);
console.log(`超出 1905 字（当前上界）的案数：${proj2.filter((x) => x > 1905).length}/30`);

// 打印 S01 全文作为样本
console.log('\n=== S01 提示词全文（用于核对哪些 data 字段进了提示词）===\n' + rows[0].text);
