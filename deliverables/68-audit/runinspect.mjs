// Spawn inspect.mjs and write its stdout as UTF-8 (no BOM). Usage: node runinspect.mjs <out.json> <url> [widths]
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const [out, url, widths = '1440,390'] = process.argv.slice(2);
const r = spawnSync(process.execPath, [
  'tools/taste-skill/skills/taste-skill/scripts/inspect.mjs', url,
  '--out', 'deliverables/68-audit/inspect-' + out.replace(/.*[\\/]/, '').replace(/\.json$/, ''),
  '--widths', widths, '--json',
], { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
writeFileSync(out, r.stdout, 'utf8');
console.error(`exit=${r.status}`);
if (r.stderr && r.stderr.trim()) console.error('STDERR: ' + r.stderr.trim().slice(0, 2000));
