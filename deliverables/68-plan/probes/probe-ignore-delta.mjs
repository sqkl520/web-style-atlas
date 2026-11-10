#!/usr/bin/env node
// REDTEAM probe: what do the existing `taste-skill-ignore` comments hide?
//
// Copies a file into the probe directory, optionally strips every taste-skill-ignore marker,
// lints both copies, and reports the delta. Also simulates "clean state achieved by ignoring"
// for the product surface.
//
// Writes only inside deliverables/68-plan/probes/. Read-only with respect to prototypes/.
//
//   node probe-ignore-delta.mjs <file-under-repo>
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, basename, dirname } from 'node:path';

const ROOT = 'D:/Web/style';
const OUT = join(ROOT, 'deliverables/68-plan/probes/sim');
const LINT = join(ROOT, 'tools/taste-skill/skills/taste-skill/scripts/lint.mjs');
const NODE = 'D:/Nodejs/node.exe';
mkdirSync(OUT, { recursive: true });

const lint = (p) => {
  try {
    return JSON.parse(execFileSync(NODE, [LINT, p, '--json'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
  } catch (e) { return JSON.parse(e.stdout); }
};
const failCount = (r) => r.findings.filter((f) => f.level === 'FAIL').length;

const src = process.argv[2];
const abs = join(ROOT, src);
const rel = src.replace(/\//g, '\\');
const base = basename(abs);

// A: as committed (ignores in place)
const asIs = join(OUT, 'as-is-' + base);
copyFileSync(abs, asIs);

// B: same file with every ignore marker removed
const stripped = join(OUT, 'no-ignore-' + base);
const text = readFileSync(abs, 'utf8');
const strippedText = text.replace(/taste-skill-ignore/g, 'REDTEAM-removed-marker');
writeFileSync(stripped, strippedText);

const a = lint(asIs);
const b = lint(stripped);
const ids = (r) => {
  const m = new Map();
  for (const f of r.findings) if (f.level === 'FAIL') m.set(f.id, (m.get(f.id) || 0) + 1);
  return Object.fromEntries(m);
};

console.log(JSON.stringify({
  file: src,
  ignore_markers_in_file: (text.match(/taste-skill-ignore/g) || []).length,
  with_ignores: { FAIL: failCount(a), byRule: ids(a) },
  ignores_neutralised: { FAIL: failCount(b), byRule: ids(b) },
  hidden_by_the_markers: failCount(b) - failCount(a),
  hidden_by_rule: Object.fromEntries(Object.entries(ids(b)).map(([k, v]) => [k, v - (ids(a)[k] || 0)]).filter(([, v]) => v > 0)),
}, null, 1));
