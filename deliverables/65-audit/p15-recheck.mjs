// 探针 15：复核 p14 里的可疑命中 —— 短值（fr/threshold/bg/primary/cn）的“包含”是不是巧合
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { ROOT, loadSchemes, loadPrompts } from './lib-load.mjs';

const SEL = join(ROOT, 'prototypes/_selection');
const win = {};
globalThis.window = win;
globalThis.document = { createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, addEventListener() {}, remove() {} }), getElementById: () => null, addEventListener() {}, body: { appendChild() {} } };
function run(f) { new Function('window', 'document', readFileSync(join(SEL, f), 'utf8'))(win, globalThis.document); }
run('data.js'); run('prompts.js'); run('prompt-copy.js');
const S = loadSchemes(); const P = loadPrompts(); const bp = win.buildStylePrompt;
const T = Object.fromEntries(P.schemes.map((s) => [s.id, bp(s.id)]));

console.log('=== S01 提示词全文 ===');
console.log(T.S01);

console.log('\n\n=== 短值命中真伪核查 ===');
for (const f of ['fr', 'threshold', 'bg', 'primary', 'tone', 'minPics', 'count']) {
  console.log('\n[' + f + ']');
  for (const r of S.slice(0, 4)) {
    let v = r[f];
    if (v == null) { console.log(`  ${r.id}: data=null`); continue; }
    v = String(v);
    const inT = T[r.id].includes(v);
    // 找出出现在提示词里的上下文
    const idx = T[r.id].indexOf(v);
    console.log(`  ${r.id}: value=${JSON.stringify(v)} includes=${inT}` + (idx >= 0 ? '  ctx=' + JSON.stringify(T[r.id].slice(Math.max(0, idx - 40), idx + v.length + 20)) : ''));
  }
}

console.log('\n\n=== tone 是否真进了提示词（整句核对）===');
for (const r of S.slice(0, 5)) {
  const line = T[r.id].split('\n').find((l) => l.includes('调性'));
  console.log(`  ${r.id} tone=${JSON.stringify(r.tone)}  →  ${JSON.stringify(line || '（无调性行）')}`);
}

console.log('\n\n=== 提示词里数据来源统计（行级）===');
const s1 = P.schemes.find((x) => x.id === 'S01');
console.log('S01 的 dna 键: ' + Object.keys(s1.dna).join(', '));
