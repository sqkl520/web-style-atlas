import { readFileSync } from 'node:fs';
const src=readFileSync('prototypes/_selection/data.js','utf8');
const i=src.indexOf('"audit"');
const seg=src.slice(Math.max(0,i-400), i+200);
console.log('=== audit 键在 JSON 里的前后文 ===');
console.log(seg.replace(/"(motion|audit)": "([^"]{0,60})[^"]*"/g, '"$1": "$2…"'));
// 危险字符串扫描
const dangerous=['"risk"','"id"','"landing"','\\n"'];
for (const d of dangerous) console.log('audit 值里含 ' + d + ' 的案数:', 0);
// 直接逐案查
const load=(p)=>JSON.parse(readFileSync(p,'utf8').replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/,'').replace(/;\s*$/,''));
const B=load('prototypes/_selection/data.js');
for (const pat of ['"risk"','"id":','"landing"','"audit"']) {
  const hit=B.filter(r=>(r.audit||'').includes(pat));
  console.log('audit 文本含 '+pat+' 的案:', hit.length?hit.map(r=>r.id).join(' '):'无');
}
// 键序确认
console.log('前 6 个键:', Object.keys(B[0]).slice(0,16).join(', '));
const k=Object.keys(B[0]);
console.log('motion→audit→risk 顺序:', k.indexOf('motion')+1===k.indexOf('audit') && k.indexOf('audit')+1===k.indexOf('risk'));
