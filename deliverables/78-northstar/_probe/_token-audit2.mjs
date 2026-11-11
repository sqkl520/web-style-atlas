// 三种口径都算一遍，看红队的 385.6M 是哪种。
import { readFileSync, readdirSync } from 'node:fs';
const dir = 'C:/Users/Administrator/.claude/projects/D--Web-style/f932d1d4-572a-4f84-a764-bd6764f60b93/subagents';
const files = readdirSync(dir).filter((x) => x.endsWith('.jsonl'));
let i = 0, o = 0, cr = 0, cc = 0;
for (const f of files) {
  for (const l of readFileSync(dir + '/' + f, 'utf8').split('\n')) {
    if (!l.includes('"usage"')) continue;
    try {
      const u = (JSON.parse(l).message || {}).usage || JSON.parse(l).usage;
      if (!u) continue;
      i += u.input_tokens || 0; o += u.output_tokens || 0;
      cr += u.cache_read_input_tokens || 0; cc += u.cache_creation_input_tokens || 0;
    } catch (e) {}
  }
}
const M = (n) => (n / 1e6).toFixed(1) + 'M';
console.log('口径 A  input + output              =', M(i + o));
console.log('口径 B  input + output + cache_read =', M(i + o + cr));
console.log('口径 C  input + output + cr + cc    =', M(i + o + cr + cc));
console.log('');
console.log('明细: input', M(i), '| output', M(o), '| cache_read', M(cr), '| cache_creation', M(cc));
console.log('');
console.log('红队说 385.6M。最接近的是口径', Math.abs(i+o-385.6e6) < Math.abs(i+o+cr-385.6e6) ? 'A（差 ' + Math.abs((i+o)/1e6-385.6).toFixed(1) + 'M）' : 'B（差 ' + Math.abs((i+o+cr)/1e6-385.6).toFixed(1) + 'M）');
