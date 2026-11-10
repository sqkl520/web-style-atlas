// 探针 14：哪些 data.js 字段的内容真的出现在提示词文本里（值包含检测，不靠键名）
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { ROOT, loadSchemes, loadPrompts } from './lib-load.mjs';

const SEL = join(ROOT, 'prototypes/_selection');
const win = {};
globalThis.window = win;
globalThis.document = {
  createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, addEventListener() {}, remove() {} }),
  getElementById: () => null, addEventListener() {}, body: { appendChild() {} },
};
function run(file) { new Function('window', 'document', readFileSync(join(SEL, file), 'utf8'))(win, globalThis.document); }
run('data.js'); run('prompts.js'); run('prompt-copy.js');

const S = loadSchemes();
const P = loadPrompts();
const bp = win.buildStylePrompt;
const texts = Object.fromEntries(P.schemes.map((s) => [s.id, bp(s.id)]));

// 对每个 data 字段：它的值有百分之多少的案，其内容片段出现在提示词里
function probe(field, sampleLen = 24) {
  let hit = 0; const hitIds = []; const missIds = [];
  for (const r of S) {
    let v = r[field];
    if (v == null) { missIds.push(r.id); continue; }
    if (typeof v === 'object') v = JSON.stringify(v);
    v = String(v);
    if (!v.trim()) { missIds.push(r.id); continue; }
    const frag = v.slice(0, sampleLen);
    if (texts[r.id] && texts[r.id].includes(frag)) { hit++; hitIds.push(r.id); }
    else missIds.push(r.id);
  }
  return { field, hit, hitIds, missIds };
}

console.log('字段\t进入提示词案数/30\t未进入的案');
const FIELDS = [...new Set(S.flatMap((r) => Object.keys(r)))];
const results = [];
for (const f of FIELDS) {
  const x = probe(f);
  results.push(x);
  console.log(`${f}\t${x.hit}/30\t${x.missIds.join(' ')}`);
}

// 特殊：copyParts 子段
console.log('\n--- copyParts / palette / axes 子键 ---');
for (const [f, sub] of [['copyParts', ['claim', 'button', 'empty', 'error']], ['axes', ['ground', 'band', 'load', 'loud']]]) {
  for (const k of sub) {
    let hit = 0;
    for (const r of S) {
      const v = String((r[f] || {})[k] || '');
      if (v && texts[r.id] && texts[r.id].includes(v.slice(0, 18))) hit++;
    }
    console.log(`${f}.${k}\t${hit}/30`);
  }
}
