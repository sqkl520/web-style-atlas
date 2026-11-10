// Group a lint --json output by level+id and by file. Usage: node summarize.mjs <json>
import { readFileSync } from 'node:fs';
const p = process.argv[2];
const { files, findings } = JSON.parse(readFileSync(p, 'utf8'));
const byId = new Map();
for (const f of findings) {
  const k = f.level + ' ' + f.id;
  if (!byId.has(k)) byId.set(k, []);
  byId.get(k).push(f);
}
console.log(`file(s) scanned: ${files}`);
const fails = findings.filter((f) => f.level === 'FAIL').length;
console.log(`TOTAL: ${fails} FAIL, ${findings.length - fails} WARN`);
for (const lvl of ['FAIL', 'WARN']) {
  for (const [k, list] of byId) {
    if (!k.startsWith(lvl)) continue;
    console.log(`\n=== ${k}  (${list.length}x)  ${list[0].message}`);
    for (const f of list) console.log(`  ${f.file}:${f.line}  ${f.match}`);
  }
}
