import { readFileSync } from 'node:fs';

const t = readFileSync('deliverables/78-northstar/_probe/_s99-stream-final.jsonl', 'utf8');
const lines = t.split('\n').filter((l) => l.trim().startsWith('{'));

let found = 0;
for (const l of lines) {
  let j;
  try { j = JSON.parse(l); } catch { continue; }
  if (j.type !== 'assistant') continue;
  for (const x of j.message?.content || []) {
    if (x.type !== 'thinking' || !x.thinking) continue;
    if (!x.thinking.includes('_run.ps1')) continue;
    if (found >= 3) break;
    found++;
    console.log(`--- thinking 片段 ${found} ---`);
    console.log(x.thinking.slice(0, 700));
    console.log();
  }
  if (found >= 3) break;
}
if (!found) console.log('未找到提到 _run.ps1 的 thinking');
