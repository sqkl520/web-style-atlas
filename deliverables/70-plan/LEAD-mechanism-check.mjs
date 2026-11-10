import { readFileSync } from 'node:fs';
const ROOT = 'D:/Web/style';
const d = JSON.parse(readFileSync(ROOT + '/prototypes/_prompts/dna-clean.json', 'utf8'));
const arr = Array.isArray(d) ? d : Object.values(d);

console.log('=== dna-clean.json 的 mechanism 字段 ===');
for (const e of arr.slice(0, 6)) {
  const m = String(e.mechanism || '');
  console.log(`${e.id} len=${String(m.length).padStart(4)} : ${m.slice(0, 100)}`);
}
const nonEmpty = arr.filter((e) => e.mechanism && e.mechanism.length > 10);
console.log(`\nmechanism 非空: ${nonEmpty.length}/30  → ${nonEmpty.map((e) => e.id).join(' ')}`);

console.log('\n=== prompts.js 里 S19 的完整对象键 ===');
const pr = readFileSync(ROOT + '/prototypes/_selection/prompts.js', 'utf8');
const i = pr.indexOf('"S19"');
console.log('S19 位置:', i);
if (i >= 0) {
  const seg = pr.slice(i, i + 3000);
  // 找所有 key: "value" 对
  const keys = [...seg.matchAll(/"?([a-zA-Z][\w]*)"?\s*:\s*"([^"]{0,120})"/g)].slice(0, 20);
  for (const k of keys) console.log(`  ${k[1]}: ${k[2].slice(0, 100)}`);
  const j = seg.indexOf('签名动作');
  console.log('\n签名动作位置:', j);
  if (j >= 0) console.log(seg.slice(Math.max(0, j - 120), j + 260));
}
