import { readFileSync } from 'node:fs';
const src = readFileSync('D:/Web/style/prototypes/_selection/data.js', 'utf8');
const D = JSON.parse(src.replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/, '').replace(/;\s*$/, ''));
const NUM = /(\d+(?:\.\d+)?)\s*(px|mm|%|deg|°|:1|栏|条|个|处|层|档|级|倍)/g;
const HEX = /#[0-9A-Fa-f]{6}\b/g;
const SHOWN = ['def', 'family', 'fonts', 'layout', 'landing', 'visuals', 'motion', 'risk', 'scenes', 'quirk'];
const uniq = (a) => [...new Set(a)];
const strip = (s) => String(s)
  .replace(/(?:C-\d+(?:\.\d+|\s*第\s*\d+\s*条)?|R-\d+|P\d+(?![0-9])|文件\s*01|01-research-brief\.md)/g, '');
// 被否定的色值（"不是 #FFFFFF"）不算正向主张
const NEG = /(不是|而不是|不使用|不用|没有|禁止|不得|不得出现|而非)\s*(`?#[0-9A-Fa-f]{6}`?)/g;

console.log('=== 剔除规则编号后：字段8 独有的具体值 ===');
let newN = 0, newH = 0, totN = 0, totH = 0;
for (const r of D) {
  const a = strip(r.audit);
  const negHex = new Set([...a.matchAll(NEG)].map((m) => m[2].replace(/`/g, '').toUpperCase()));
  const shown = SHOWN.filter((k) => k !== 'risk').map((k) => r[k] || '').join('\n') + '\n' + (r.palette || []).join(' ');
  const sn = new Set([...shown.matchAll(NUM)].map((m) => m[0].toUpperCase()));
  const sh = new Set([...shown.matchAll(HEX)].map((m) => m[0].toUpperCase()));
  const n8 = uniq([...a.matchAll(NUM)].map((m) => m[0]));
  const h8 = uniq([...a.matchAll(HEX)].map((m) => m[0].toUpperCase())).filter((h) => !negHex.has(h));
  totN += n8.length; totH += h8.length;
  const nn = n8.filter((x) => !sn.has(x.toUpperCase()));
  const nh = h8.filter((x) => !sh.has(x));
  newN += nn.length; newH += nh.length;
  if (nn.length || nh.length) console.log('  ' + r.id + ': ' + (nh.join(' ') || '—') + ' ｜ ' + (nn.join(' ') || '—'));
}
console.log('\n带单位数值：' + totN + ' 个，其中独有 ' + newN + '（' + (newN / totN * 100).toFixed(0) + '%）');
console.log('正向 hex：' + totH + ' 个，其中独有 ' + newH + '（' + (newH / totH * 100).toFixed(0) + '%）');
