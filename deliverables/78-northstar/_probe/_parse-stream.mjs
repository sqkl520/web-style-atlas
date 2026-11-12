import { readFileSync } from 'node:fs';
const p = 'C:\\tmp\\bb\\S31\\stream.jsonl';
const txt = readFileSync(p, 'utf8');
const lines = txt.split('\n').filter((l) => l.trim().startsWith('{'));
console.log('total json lines:', lines.length);
const toolCalls = [];
const toolResults = [];
for (const l of lines) {
  let j;
  try { j = JSON.parse(l); } catch { continue; }
  if (j.type === 'assistant') {
    for (const x of j.message?.content || []) {
      if (x.type === 'tool_use') toolCalls.push({ name: x.name, input: JSON.stringify(x.input).slice(0, 120) });
      if (x.type === 'text' && x.text.trim()) toolCalls.push({ name: '(text)', input: x.text.slice(0, 120) });
    }
  }
  if (j.type === 'user') {
    for (const x of j.message?.content || []) {
      if (x.type === 'tool_result') {
        const c = typeof x.content === 'string' ? x.content : JSON.stringify(x.content);
        toolResults.push({ err: !!x.is_error, text: c.slice(0, 150) });
      }
    }
  }
  if (j.type === 'result') {
    console.log('=== RESULT ===', j.subtype, 'cost', j.total_cost_usd, 'output_tokens', j.usage?.output_tokens);
  }
}
console.log('\n=== tool calls (last 12) ===');
for (const t of toolCalls.slice(-12)) console.log(' ', t.name, '|', t.input);
console.log('\n=== tool results (last 8) ===');
for (const r of toolResults.slice(-8)) console.log(' ', r.err ? 'ERROR' : 'ok', '|', r.text);
console.log('\n=== errors count ===', toolResults.filter((r) => r.err).length);
