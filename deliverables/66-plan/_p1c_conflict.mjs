// P1c：现行提示词里，「就排 N 个」与「按你真实的数量排即可」是否仍然互斥；
//      以及 S07 原型真页里有几个条目（N 的来源是不是"设计规模"）
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { HERE, ROOT, dirOf } from './_lib.mjs';

const out = JSON.parse(readFileSync(join(HERE, 'p1-prompts.json'), 'utf8'));
let both = 0;
console.log('== 现行提示词：第 1 条（命令 N 个）与第 2 条（按真实数量）是否互斥 ==');
for (const o of out) {
  const wantN = /就排 (\d+) 个/.test(o.line1 || '');
  const saysReal = /按你真实的数量排即可/.test(o.structBlock || '');
  const saysRebuild = /请先用你真实的/.test(o.structBlock || '');
  const conflict = wantN && saysReal;
  if (conflict) both++;
  console.log(`  ${o.id} 「就排N个」=${wantN ? 'Y' : 'n'}  第2条=「${saysReal ? '按你真实的数量排即可' : saysRebuild ? '先按真实数量、不足则重排' : '?'}」  ${conflict ? '← 互斥' : ''}`);
}
console.log('\n互斥（第1条命令 N、第2条说按真实数量）: %d / 30', both);

// S07 原型真页条目数
const d = dirOf('S07');
const h = readFileSync(join(d, 'index.html'), 'utf8');
const body = h.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
const t = {};
for (const m of body.matchAll(/<([a-z][a-z0-9]*)\b/g)) t[m[1]] = (t[m[1]] || 0) + 1;
console.log('\n== S07 原型真页结构 ==');
console.log(JSON.stringify(t));
const cols = /column-count\s*:\s*(\d+)/.exec(readFileSync(join(d, 'style.css'), 'utf8'));
console.log('column-count =', cols ? cols[1] : '—');
