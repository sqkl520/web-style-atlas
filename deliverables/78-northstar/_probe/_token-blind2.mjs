// 只算真正的盲测 agent（description 明确是 Blind test / Replicate / Build from prompt）。
import { readFileSync, readdirSync } from 'node:fs';
const dir = 'C:/Users/Administrator/.claude/projects/D--Web-style/f932d1d4-572a-4f84-a764-bd6764f60b93/subagents';
const metas = readdirSync(dir).filter((x) => x.endsWith('.meta.json'));
const BLIND = /^(blind test|replicate|build .* from prompt|build s\d\d|rerun .*blind)/i;

const hits = [];
for (const m of metas) {
  const j = JSON.parse(readFileSync(dir + '/' + m, 'utf8'));
  if (!BLIND.test(j.description || '')) continue;
  let i = 0, o = 0;
  try {
    for (const l of readFileSync(dir + '/' + m.replace('.meta.json', '.jsonl'), 'utf8').split('\n')) {
      if (!l.includes('"usage"')) continue;
      try { const u = (JSON.parse(l).message || {}).usage || JSON.parse(l).usage; if (!u) continue;
        i += u.input_tokens || 0; o += u.output_tokens || 0; } catch (e) {}
    }
  } catch (e) {}
  hits.push({ desc: j.description, model: j.model, tot: i + o, i, o });
}
hits.sort((a, b) => b.tot - a.tot);
console.log('真正的盲测 agent:', hits.length, '个');
let sum = 0;
for (const h of hits) {
  sum += h.tot;
  console.log('  ' + (h.tot / 1e6).toFixed(1).padStart(5) + 'M  [' + h.model + ']  ' + h.desc);
}
console.log('\n合计:', (sum / 1e6).toFixed(1), 'M');
console.log('平均每案:', (sum / hits.length / 1e6).toFixed(1), 'M');
