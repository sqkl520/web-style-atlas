import { readFileSync } from 'node:fs';
const j = JSON.parse(readFileSync('deliverables/70-exec/probes-b/prompts-all.json', 'utf8'));
const ids = Object.keys(j).sort();
for (const id of ids) {
  const line = (j[id].text.split('\n') || []).find((l) => l.startsWith('这一案最容易做成'));
  if (!line) { console.log(id + '  (none)'); continue; }
  const body = line.replace(/^这一案最容易做成的错误样子（作者原话，务必避开）：/, '');
  console.log('=== ' + id + ' ===');
  console.log('  ' + body.slice(0, 300));
}
