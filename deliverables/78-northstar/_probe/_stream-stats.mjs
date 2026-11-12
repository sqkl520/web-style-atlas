import { readFileSync } from 'node:fs';
const p = 'C:\\tmp\\bb\\S31\\stream.jsonl';
const lines = readFileSync(p, 'utf8').split('\n').filter((l) => l.trim().startsWith('{'));
let thinking = 0, textN = 0, toolN = 0, lastTools = [];
for (const l of lines) {
  let j;
  try { j = JSON.parse(l); } catch { continue; }
  if (j.type === 'system' && j.subtype === 'thinking_tokens') thinking++;
  if (j.type === 'assistant') {
    for (const x of j.message?.content || []) {
      if (x.type === 'thinking') thinking++;
      if (x.type === 'text') textN++;
      if (x.type === 'tool_use') { toolN++; lastTools.push(x.name + ' ' + JSON.stringify(x.input).slice(0, 80)); }
    }
  }
}
console.log('lines:', lines.length);
console.log('thinking events:', thinking);
console.log('text blocks:', textN);
console.log('tool calls:', toolN);
console.log('\nlast 6 tools:');
for (const t of lastTools.slice(-6)) console.log(' ', t);
