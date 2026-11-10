import { readFileSync } from 'node:fs';
const load=(p)=>JSON.parse(readFileSync(p,'utf8').replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/,'').replace(/;\s*$/,''));
const B=load('prototypes/_selection/data.js');
const s13=B.find(r=>r.id==='S13');
const i=s13.audit.indexOf('反套路改造三指标');
console.log('S13 audit 总长', s13.audit.length, '｜「反套路改造三指标」起始于', i);
console.log('属于字段 8 正文的部分:', i, '字');
console.log('混入的 3-附 子块:', s13.audit.length-i, '字');
console.log('\n=== 无编号加粗小节的混入统计（改前/改后都是同一个解析行为）===');
for (const r of B){
  for (const k of ['layout','audit','motion','risk','landing','scenes']){
    const v=r[k]||'';
    for (const h of ['断点具体行为','三层硫酸纸的透叠规则','反套路改造三指标','放弃常规导航后的可发现性机制']){
      if(v.includes(h)) console.log(`  ${r.id}.${k} 含「${h}」（位置 ${v.indexOf(h)}/${v.length}）`);
    }
  }
}
