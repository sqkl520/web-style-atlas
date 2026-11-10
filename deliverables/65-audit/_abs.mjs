import { readFileSync } from 'node:fs';
const src = readFileSync('D:/Web/style/prototypes/_selection/data.js', 'utf8');
const D = JSON.parse(src.replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/, '').replace(/;\s*$/, ''));
const ch = (s) => String(s || '').replace(/\s/g, '');
const SHOWN = ['def', 'family', 'fonts', 'layout', 'landing', 'visuals', 'motion', 'risk', 'scenes', 'quirk'];

/* 字段8 的独特价值不在值，而在"绝对否定句"这种形式：
 * "全站只有一种底""页面不存在任何柔和投影""没有一片元素浮起来"。
 * 数一数：这种句子在别的已展示字段里有多少。 */
const ABS = /(全站|页面|全篇|整站)[^。；]{0,12}(没有|不存在|只用|只有|唯一|一律|绝不)|(没有|不存在)[^。；]{0,10}(一片|一处|任何|一个)/g;

function countAbs(s) { return (String(s).match(ABS) || []).length; }
let f8 = 0, other = 0;
const per = [];
for (const r of D) {
  const a = countAbs(r.audit);
  const o = SHOWN.filter((k) => k !== 'risk').reduce((acc, k) => acc + countAbs(r[k] || ''), 0);
  f8 += a; other += o;
  per.push({ id: r.id, audit: a, shown: o });
}
console.log('=== "绝对否定句"（全站没有X / 只用Y一个值）出现次数 ===');
console.log('字段8 合计 ' + f8 + ' 句；其他 10 个已展示字段合计 ' + other + ' 句');
console.log('\nid\t字段8\t已展示字段');
for (const p of per) console.log([p.id, p.audit, p.shown].join('\t'));
