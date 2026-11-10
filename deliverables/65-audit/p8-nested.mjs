// 探针 8：嵌套字段（axes / gate / shots / copyParts / capacity / dna）的子键消费矩阵
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, loadSchemes, loadPrompts } from './lib-load.mjs';

const SEL = join(ROOT, 'prototypes/_selection');
const FILES = ['app.js', 'index.html', 'prompt-copy.js', 'wizard.js', 'wizard.html', 'style.css'];
const src = Object.fromEntries(FILES.map((f) => [f, existsSync(join(SEL, f)) ? readFileSync(join(SEL, f), 'utf8') : '']));

const S = loadSchemes();
const P = loadPrompts();

function sub(prefix) {
  const keys = new Set();
  for (const r of S) {
    const v = r[prefix];
    if (v && typeof v === 'object') for (const k of Object.keys(v)) keys.add(k);
  }
  return [...keys];
}
function subP(prefix) {
  const keys = new Set();
  for (const s of P.schemes) {
    const v = prefix === 'dna' ? s.dna : s[prefix];
    if (v && typeof v === 'object') for (const k of Object.keys(v)) keys.add(k);
  }
  return [...keys];
}

function count(field) {
  const row = {};
  for (const f of FILES) {
    let n = 0;
    const re = new RegExp('(\\.' + field + '\\b|\\[\\s*[\'"]' + field + '[\'"]\\s*\\]|\\b' + field + '\\s*:)', 'g');
    for (const m of src[f].matchAll(re)) n++;
    row[f] = n;
  }
  return row;
}

for (const [label, keys] of [['axes', sub('axes')], ['gate', sub('gate')], ['shots', sub('shots')],
  ['copyParts', sub('copyParts')], ['capacity(prompts)', subP('capacity')], ['dna(prompts)', subP('dna')]]) {
  console.log('\n=== ' + label + ' 子键消费矩阵 ===');
  console.log('子键\t' + FILES.join('\t') + '\t合计');
  for (const k of keys) {
    const r = count(k);
    const tot = FILES.reduce((a, f) => a + r[f], 0);
    console.log(k + '\t' + FILES.map((f) => r[f] || '').join('\t') + '\t' + tot + (tot === 0 ? '   ⚠零命中' : ''));
  }
}

// 校验：某字段在数据里是否全空/全同（无区分度 = 变相死字段）
console.log('\n\n=== 低区分度字段（取值集合很小）===');
for (const k of ['fr', 'threshold', 'axes.ground', 'axes.band', 'axes.load', 'axes.loud', 'axes.words', 'axes.groundL',
  'axes.bandHue', 'axes.bandL', 'axes.bandSat', 'axes.chroma', 'errorCodeSource', 'built']) {
  const vals = S.map((r) => {
    if (k.startsWith('axes.')) return (r.axes || {})[k.slice(5)];
    return r[k];
  });
  const uniq = [...new Set(vals.map((v) => JSON.stringify(v)))];
  console.log(`${k}\t${uniq.length} 种取值\t${uniq.slice(0, 12).join(' ')}${uniq.length > 12 ? ' …' : ''}`);
}
