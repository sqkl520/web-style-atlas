// 从 transcript 的 usage 字段真算 token 消耗。
import { readFileSync, readdirSync } from 'node:fs';
const dir = 'C:/Users/Administrator/.claude/projects/D--Web-style/f932d1d4-572a-4f84-a764-bd6764f60b93/subagents';
const files = readdirSync(dir).filter((x) => x.endsWith('.jsonl'));
let totalIn = 0, totalOut = 0, totalCacheRead = 0, filesWithUsage = 0;
const perFile = [];
for (const f of files) {
  const lines = readFileSync(dir + '/' + f, 'utf8').split('\n').filter(Boolean);
  let fi = 0, fo = 0, fc = 0, got = false;
  for (const l of lines) {
    if (!l.includes('"usage"')) continue;
    try {
      const o = JSON.parse(l);
      const u = (o.message && o.message.usage) || o.usage;
      if (!u) continue;
      fi += u.input_tokens || 0;
      fo += u.output_tokens || 0;
      fc += u.cache_read_input_tokens || 0;
      got = true;
    } catch (e) { /* 坏行跳过 */ }
  }
  if (got) { filesWithUsage++; perFile.push({ f, fi, fo, fc, tot: fi + fo }); }
  totalIn += fi; totalOut += fo; totalCacheRead += fc;
}
console.log('transcript 文件:', files.length, ' 其中有 usage 的:', filesWithUsage);
console.log('input_tokens 合计:', (totalIn/1e6).toFixed(1), 'M');
console.log('output_tokens 合计:', (totalOut/1e6).toFixed(1), 'M');
console.log('cache_read 合计:', (totalCacheRead/1e6).toFixed(1), 'M');
console.log('input+output 合计:', ((totalIn+totalOut)/1e6).toFixed(1), 'M');
perFile.sort((a,b)=>b.tot-a.tot);
console.log('\n最耗的 5 个:');
perFile.slice(0,5).forEach(x=>console.log('  '+(x.tot/1e6).toFixed(1)+'M  '+x.f.slice(0,30)));
console.log('\n中位:', (perFile.sort((a,b)=>a.tot-b.tot)[Math.floor(perFile.length/2)].tot/1e6).toFixed(1)+'M');
