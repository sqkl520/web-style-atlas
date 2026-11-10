// Summarise inspect.mjs --json output.
import { readFileSync } from 'node:fs';
const j = JSON.parse(readFileSync(process.argv[2], 'utf8'));
console.log('url', j.url, 'at', j.at);
const runs = j.runs || (j.widths ? Object.values(j.widths) : []);
console.log('top-level keys:', Object.keys(j).join(', '));
const list = j.runs || [];
for (const run of list) {
  console.log(`\n########## width ${run.width} ##########`);
  for (const f of (run.findings || [])) {
    console.log(`[${f.level}] ${f.id}: ${String(f.message).slice(0, 300)}`);
  }
}
if (!list.length) console.log(JSON.stringify(j).slice(0, 3000));
