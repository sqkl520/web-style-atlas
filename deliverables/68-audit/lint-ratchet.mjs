// THIRD PATH prototype: a ratchet/baseline gate for lint.mjs.
//   · known findings are frozen in a baseline file (fingerprinted by rule + file + normalised source text)
//   · the gate fails ONLY on findings that are not in the baseline  → the light is green *and* meaningful
//   · when a frozen finding disappears, the baseline entry goes stale and the ratchet reports it (so the
//     baseline cannot silently rot into a blanket waiver)
//
//   node lint-ratchet.mjs check  <baseline.json> <root...>
//   node lint-ratchet.mjs freeze <baseline.json> <root...>
//
// Exit 0 = no new findings. Exit 1 = new findings (or a stale baseline entry, with --strict-stale).
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const [mode, baselinePath, ...roots] = process.argv.slice(2);
if (!mode || !baselinePath || !roots.length) {
  console.error('usage: node lint-ratchet.mjs <check|freeze> <baseline.json> <root...>');
  process.exit(2);
}
const r = spawnSync(process.execPath, [
  'tools/taste-skill/skills/taste-skill/scripts/lint.mjs', ...roots, '--json',
], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const { findings } = JSON.parse(r.stdout);

// Fingerprint: rule + file + a hash of the *trimmed source line*. Keying on source text (not line
// number) means unrelated edits elsewhere in the file do not invalidate the baseline, while any edit
// to the flagged construct does — which is exactly when a human should look again.
const srcCache = new Map();
const srcOf = (f) => {
  if (!srcCache.has(f)) {
    try { srcCache.set(f, readFileSync(f, 'utf8').split(/\r?\n/)); } catch { srcCache.set(f, []); }
  }
  return srcCache.get(f);
};
const fp = (f) => {
  if (f.line === 0) return `${f.level}/${f.id}/(aggregate)`;
  const line = (srcOf(f.file)[f.line - 1] || '').trim().replace(/\s+/g, ' ');
  return `${f.level}/${f.id}/${f.file}/${createHash('sha1').update(line).digest('hex').slice(0, 12)}`;
};

const current = new Map();
for (const f of findings) {
  const k = fp(f);
  current.set(k, (current.get(k) || 0) + 1);
}

if (mode === 'freeze') {
  const out = {
    note: 'Frozen lint findings. Each entry is a ruling, not a waiver — see LINT-TRUTH.md for why it stands.',
    frozenAt: new Date().toISOString(),
    entries: [...current.entries()].sort().map(([k, n]) => ({ fp: k, count: n })),
  };
  writeFileSync(baselinePath, JSON.stringify(out, null, 1), 'utf8');
  console.log(`froze ${out.entries.length} distinct findings (${findings.length} total) into ${baselinePath}`);
  process.exit(0);
}

if (!existsSync(baselinePath)) { console.error('no baseline: run freeze first'); process.exit(2); }
const base = new Map(JSON.parse(readFileSync(baselinePath, 'utf8')).entries.map((e) => [e.fp, e.count]));

const isNew = [];
const grew = [];
for (const [k, n] of current) {
  if (!base.has(k)) isNew.push({ fp: k, count: n });
  else if (n > base.get(k)) grew.push({ fp: k, now: n, was: base.get(k) });
}
const fixed = [...base.keys()].filter((k) => !current.has(k));

const show = (x) => x.fp.split('/').slice(0, 2).join(' ') + '  ' + x.fp.split('/').slice(2).join(' ');

console.log(`baseline: ${base.size} frozen   current: ${current.size} distinct   ` +
  `new ${isNew.length}   grew ${grew.length}   no-longer-present ${fixed.length}`);
if (isNew.length) { console.log('\nNEW (block the build):'); for (const x of isNew) console.log('  + ' + show(x)); }
if (grew.length) { console.log('\nMORE OCCURRENCES THAN FROZEN:'); for (const x of grew) console.log(`  + ${show(x)}  ${x.was} → ${x.now}`); }
if (fixed.length) { console.log(`\nNO LONGER PRESENT (${fixed.length}) — delete these baseline entries so the ratchet stays honest:`); for (const k of fixed.slice(0, 20)) console.log('  - ' + k); }
process.exit(isNew.length || grew.length ? 1 : 0);
