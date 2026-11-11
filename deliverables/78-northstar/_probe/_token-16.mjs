// 只算 Q7 那 16 个盲测 agent（红队说的范围），看是不是 385.6M。
import { readFileSync, readdirSync, existsSync } from 'node:fs';
const dir = 'C:/Users/Administrator/.claude/projects/D--Web-style/f932d1d4-572a-4f84-a764-bd6764f60b93/subagents';
const files = readdirSync(dir).filter((x) => x.endsWith('.jsonl'));
// 盲测 agent 的判据：transcript 里提到 out-S* 且提到"提示词"或"只拿到"
const blind = [];
for (const f of files) {
  const txt = readFileSync(dir + '/' + f, 'utf8');
  if (/out-S\d\d/.test(txt) && /提示词/.test(txt) && txt.length < 800000) blind.push(f);
}
console.log('疑似盲测 agent:', blind.length, '个');
let i=0,o=0;
for (const f of blind) {
  for (const l of readFileSync(dir+'/'+f,'utf8').split('\n')) {
    if(!l.includes('"usage"'))continue;
    try{const u=(JSON.parse(l).message||{}).usage||JSON.parse(l).usage; if(!u)continue;
      i+=u.input_tokens||0; o+=u.output_tokens||0;}catch(e){}
  }
}
console.log('这些 agent 的 input+output:', ((i+o)/1e6).toFixed(1), 'M');
console.log('  其中 input:', (i/1e6).toFixed(1), 'M  output:', (o/1e6).toFixed(1), 'M');
if(blind.length) console.log('  每 agent 平均:', ((i+o)/blind.length/1e6).toFixed(1), 'M');
