// 裁决 1 精算：只统计「设计参数级」数值（排除 C-1.3 / 000000 这类噪声）
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const t = readFileSync(resolve('prototypes/_selection/data.js'), 'utf8');
const rows = JSON.parse(t.slice(t.indexOf('= ') + 2).replace(/;\s*$/, ''));
const PL = JSON.parse(readFileSync(resolve('deliverables/65-plan/_v_out/promptlen.json'), 'utf8'));

// 只认带单位的设计参数
const params = (s) => [...String(s).matchAll(/(\d+(?:\.\d+)?)\s*(px|°|%|mm|ms|em|栏|级)/g)].map((m) => (m[1] + m[2]).replace(/\s+/g, ''));
let tot = 0, miss = 0, casesWithMiss = 0;
const rowsOut = [];
for (const r of rows) {
  const p = PL.prompts[r.id];
  const uniq = [...new Set(params(r.audit || ''))];
  const m = uniq.filter((x) => !p.includes(x));
  tot += uniq.length; miss += m.length;
  if (m.length) casesWithMiss++;
  rowsOut.push({ id: r.id, total: uniq.length, miss: m.length, list: m });
}
console.log('=== 设计参数级数值（带单位）在提示词里的覆盖率 ===');
console.log(`去重参数总数 ${tot}；提示词缺失 ${miss}（${(miss/tot*100).toFixed(1)}%）`);
console.log(`有缺失的案 ${casesWithMiss}/30`);
console.log('\n逐案（缺失数/总数）:');
for (const x of rowsOut) console.log(`  ${x.id} ${String(x.miss).padStart(2)}/${String(x.total).padStart(2)}  ${x.list.slice(0, 6).join(' ')}`);

// 分组统计
const g = [0,1,2].map(()=>({t:0,m:0}));
rowsOut.forEach((x,i)=>{ const k=Math.floor(i/10); g[k].t+=x.total; g[k].m+=x.miss; });
console.log('\n分组覆盖率:');
['S01–S10','S11–S20','S21–S30'].forEach((n,i)=>console.log(`  ${n}  ${g[i].t-g[i].m}/${g[i].t} (${((g[i].t-g[i].m)/g[i].t*100).toFixed(1)}%)`));

// 关键：audit 的正面动作句 vs 提示词「视觉硬约束」——按 3 件事（圆角/阴影/配色）分
console.log('\n=== 若只补「提示词还没有的设计参数」，字数是多少 ===');
let addChars = 0;
const addList = [];
for (const r of rows) {
  const p = PL.prompts[r.id];
  const segs = String(r.audit || '').split(/[。；]/).map((s) => s.trim()).filter(Boolean);
  const keep = segs.filter((s) => {
    const ps = [...new Set(params(s))];
    return ps.length > 0 && ps.some((x) => !p.includes(x));
  });
  const v = keep.join('；');
  addChars += v.length;
  addList.push({ id: r.id, n: keep.length, len: v.length });
}
console.log('合计', addChars, '字 ｜每案均值', Math.round(addChars/30));
const lens = addList.map(x=>x.len).sort((a,b)=>a-b);
console.log('区间 min/p50/max:', lens[0], lens[15], lens[29]);
const pl = PL.lens;
const proj = addList.map((x,i)=>pl[i]+16+x.len);
console.log('投影提示词 min', Math.min(...proj), 'max', Math.max(...proj), 'avg', Math.round(proj.reduce((a,b)=>a+b,0)/30), '超1905', proj.filter(x=>x>1905).length, '/30');
