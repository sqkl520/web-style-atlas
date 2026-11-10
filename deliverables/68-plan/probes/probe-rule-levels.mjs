#!/usr/bin/env node
// REDTEAM probe: exact FAIL/WARN split of the two rule implementations, to test the
// "51 rules (25 FAIL + 26 WARN)" premise. Read-only.
import { readFileSync } from 'node:fs';

const BASE = 'D:/Web/style/tools/taste-skill/skills/taste-skill/scripts';
const lint = readFileSync(BASE + '/lint.mjs', 'utf8');
const rules = readFileSync(BASE + '/lib/rules.mjs', 'utf8');
const inspect = readFileSync(BASE + '/inspect.mjs', 'utf8');

const staticEntries = [...lint.matchAll(/^\s*\['(FAIL|WARN)',\s*'([a-z-]+)'/gm)].map((m) => ({ level: m[1], id: m[2] }));
const judgeBody = rules.slice(rules.indexOf('export function judge'), rules.indexOf('export const RULE_IDS'));
const judgeSites = [...judgeBody.matchAll(/add\('(FAIL|WARN)',\s*'([a-z-]+)'/g)].map((m) => ({ level: m[1], id: m[2] }));
const inspectSites = [...inspect.matchAll(/level:\s*'(FAIL|WARN)',\s*\n?\s*id:\s*'([a-z-]+)'/g)].map((m) => ({ level: m[1], id: m[2] }));

// a rule can be emitted at both levels; report the *rule* level set
const bucket = (sites) => {
  const m = new Map();
  for (const s of sites) {
    if (!m.has(s.id)) m.set(s.id, new Set());
    m.get(s.id).add(s.level);
  }
  const failOnly = [...m].filter(([, v]) => v.has('FAIL') && !v.has('WARN')).map(([k]) => k);
  const warnOnly = [...m].filter(([, v]) => v.has('WARN') && !v.has('FAIL')).map(([k]) => k);
  const both = [...m].filter(([, v]) => v.has('FAIL') && v.has('WARN')).map(([k]) => k);
  return { uniqueIds: m.size, sites: sites.length, failOnly: failOnly.length, warnOnly: warnOnly.length, both: both.length, bothIds: both };
};

const out = {
  static_lint: bucket(staticEntries),
  judge_render: bucket(judgeSites),
  inspect_extra: bucket(inspectSites),
};
out.union_ids = new Set([...staticEntries.map((s) => s.id), ...judgeSites.map((s) => s.id), ...inspectSites.map((s) => s.id)]).size;
console.log(JSON.stringify(out, null, 1));
