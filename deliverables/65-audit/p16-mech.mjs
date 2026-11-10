// 探针 16：机制字段的双路径 —— collect-schemes 不读，extract-dna 另有一条正则直读 md
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, readSpec, specIds, loadPrompts } from './lib-load.mjs';

const dna = JSON.parse(readFileSync(join(ROOT, 'prototypes/_prompts/dna-clean.json'), 'utf8').replace(/^\uFEFF/, ''));
const P = loadPrompts();

console.log('=== dna-clean.json 里 mechanism 的来源（是否等于 md 的 1-附 行）===');
console.log('案号\tmd有1-附?\tmechanism长度\t等于md原文?\tdna.mechanismSource');
let fromSpec = 0, fromPatch = 0, missing = 0;
for (const d of dna) {
  const spec = readSpec(d.id);
  const mm = spec.match(/1-附（去掉名字之后的机制）[：:]\s*([^\n]+)/);
  const md = mm ? mm[1].trim() : '';
  const eq = md && d.mechanism === md;
  if (d.mechanismSource) fromPatch++; else if (eq) fromSpec++; else if (!d.mechanism) missing++;
  console.log(`${d.id}\t${md ? 'Y' : 'N'}\t${(d.mechanism || '').length}\t${eq ? 'Y' : 'N'}\t${d.mechanismSource || '（无，来自 md）'}`);
}
console.log(`\n来自 md 1-附：${fromSpec} 案｜来自 mechanisms.mjs 补丁：${fromPatch} 案｜空：${missing} 案`);

console.log('\n=== 「机制」在 data.js 里的 66 次命中是什么 ===');
const dataSrc = readFileSync(join(ROOT, 'prototypes/_selection/data.js'), 'utf8');
const lines = dataSrc.split(/\r?\n/);
let n = 0;
for (const l of lines) {
  const c = (l.match(/机制/g) || []).length;
  if (c) { n += c; if (n <= 8) console.log('  ' + l.trim().slice(0, 130)); }
}
console.log('  合计 ' + n + ' 次，全部出现在正文字段（如「主机制＝…」），没有一个 key 叫 "机制"');
console.log('  data.js 里存在 "机制": 作为键？ ' + /"机制"\s*:/.test(dataSrc));

console.log('\n=== mechanisms.mjs 覆盖面 ===');
const mech = readFileSync(join(ROOT, 'prototypes/_prompts/mechanisms.mjs'), 'utf8');
const ids = [...mech.matchAll(/^\s*(S\d{2})\s*:/gm)].map((m) => m[1]);
console.log('mechanisms.mjs 覆盖: ' + ids.length + ' 案  ' + ids.join(' '));
console.log('每条都带 source 字段: ' + ((mech.match(/source\s*:/g) || []).length) + ' 处');
