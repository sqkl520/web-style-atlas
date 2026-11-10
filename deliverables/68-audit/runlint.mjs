// Run lint.mjs programmatically (spawn) and write its --json output as UTF-8 no BOM.
// Usage: node runlint.mjs <out.json> <root...>
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const [out, ...roots] = process.argv.slice(2);
const r = spawnSync(process.execPath, [
  'tools/taste-skill/skills/taste-skill/scripts/lint.mjs',
  ...roots,
  '--json',
], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
writeFileSync(out, r.stdout, 'utf8');
console.error(`exit=${r.status} stderr=${(r.stderr || '').trim()}`);
