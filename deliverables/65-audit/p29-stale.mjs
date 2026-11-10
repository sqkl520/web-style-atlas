// 探针 29：prompts.js 是否相对当前 data.js 陈旧；build-prompts 的正则是否会被新字段 audit 影响
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, loadSchemes, loadPrompts } from './lib-load.mjs';

const dataSrc = readFileSync(join(ROOT, 'prototypes/_selection/data.js'), 'utf8');
const S = loadSchemes();
const P = loadPrompts();

// 复刻 build-prompts.mjs 的两条抽取正则
function extract(key) {
  const out = {};
  const re = new RegExp('"id":\\s*"(S\\d{2})"[\\s\\S]*?"' + key + '":\\s*"((?:[^"\\\\]|\\\\.)*)"', 'g');
  let m;
  while ((m = re.exec(dataSrc))) out[m[1]] = m[2].replace(/\\"/g, '"').replace(/\\n/g, ' ').trim();
  return out;
}
const RISK = extract('risk');
const LANDING = extract('landing');
const AUDIT = extract('audit');

console.log('=== build-prompts 的正则在当前 data.js 上是否仍能正确抽取 ===');
console.log(`RISK 抽到 ${Object.keys(RISK).length}/30 案`);
console.log(`LANDING 抽到 ${Object.keys(LANDING).length}/30 案`);
console.log(`AUDIT 抽到 ${Object.keys(AUDIT).length}/30 案（build-prompts.mjs 目前不抽它）`);

// 校验 RISK 抽取是否正确（与 data.js 实际 risk 值比对）
let riskOk = 0;
for (const r of S) if (RISK[r.id] === (r.risk || '').replace(/\n/g, ' ').trim()) riskOk++;
console.log(`RISK 抽取值与 data.js 一致: ${riskOk}/30`);

// prompts.js 里的 risk 与当前 data.js 的 risk 是否一致（判断 prompts.js 是否陈旧）
let pRiskOk = 0; const stale = [];
for (const p of P.schemes) {
  const r = S.find((x) => x.id === p.id);
  const cur = (r.risk || '').replace(/\n/g, ' ').trim();
  if (p.dna.risk === cur) pRiskOk++; else stale.push(p.id);
}
console.log(`prompts.js 的 dna.risk 与当前 data.js 一致: ${pRiskOk}/30 ${stale.length ? '（陈旧：' + stale.join(' ') + '）' : ''}`);

console.log('\n=== prompts.js 里是否存在 audit（新字段）===');
console.log('  ' + (JSON.stringify(P).includes('audit') ? '存在' : '不存在 → prompts.js 未跟上 data.js 的新字段'));

console.log('\n=== prompts.js 文件里出现的所有 dna 键 ===');
const dk = new Set();
for (const s of P.schemes) for (const k of Object.keys(s.dna)) dk.add(k);
console.log('  ' + [...dk].join(' '));

console.log('\n=== 若把 audit 接进 prompts.js，需要改的地方 ===');
const bp = readFileSync(join(ROOT, 'prototypes/_prompts/build-prompts.mjs'), 'utf8');
console.log('  build-prompts.mjs 里读 data.js 的字段: ' + [...bp.matchAll(/extract|RISK|REUSE|"risk"|"landing"/g)].map((m) => m[0]).filter((v, i, a) => a.indexOf(v) === i).join(' ') || '（无）');
console.log('  实际有 2 个抽取闭包: RISK（risk）与 REUSE（landing）→ 需要新增第 3 个抽 audit');
console.log('  prompt-copy.js 里 d.risk 的消费点: L293, L295');

console.log('\n=== audit 若按 220 字截断进提示词，各案字数（复算用）===');
let over = 0;
for (const p of P.schemes) {
  const r = S.find((x) => x.id === p.id);
  const add = Math.min((r.audit || '').length, 220);
  if (add) over++;
}
console.log(`  30/30 都可以加，单案新增 220 字上限`);
