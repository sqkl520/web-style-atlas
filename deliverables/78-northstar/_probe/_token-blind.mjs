// 用 meta.json 的 description 定位盲测 agent，再按 transcript 的 usage 算 token。
import { readFileSync, readdirSync } from 'node:fs';
const dir = 'C:/Users/Administrator/.claude/projects/D--Web-style/f932d1d4-572a-4f84-a764-bd6764f60b93/subagents';
const metas = readdirSync(dir).filter((x) => x.endsWith('.meta.json'));

const blind = [];
for (const m of metas) {
  const j = JSON.parse(readFileSync(dir + '/' + m, 'utf8'));
  const desc = (j.description || '') + ' ' + (j.agentType || '');
  // 盲测 agent 的 description 通常含 S03/S07/S17 或 "blind"/"复刻"/"prompt"
  if (/S\d\d|blind|复刻|提示词|prompt/i.test(desc)) blind.push({ file: m.replace('.meta.json', '.jsonl'), desc: j.description, model: j.model });
}
console.log('按 description 筛出的候选:', blind.length, '个');
blind.slice(0, 20).forEach((b) => console.log('  [' + b.model + '] ' + (b.desc || '').slice(0, 50)));

let i = 0, o = 0;
for (const b of blind) {
  try {
    for (const l of readFileSync(dir + '/' + b.file, 'utf8').split('\n')) {
      if (!l.includes('"usage"')) continue;
      try { const u = (JSON.parse(l).message || {}).usage || JSON.parse(l).usage; if (!u) continue;
        i += u.input_tokens || 0; o += u.output_tokens || 0; } catch (e) {}
    }
  } catch (e) {}
}
console.log('\n这些 agent 的 input+output 合计:', ((i + o) / 1e6).toFixed(1), 'M');
