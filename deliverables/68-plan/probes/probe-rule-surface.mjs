#!/usr/bin/env node
// REDTEAM probe: count the rule surface and split it into bands.
//   1) static lint rules          (lint.mjs R table)
//   2) render rules judge() can emit   (lib/rules.mjs)
//   3) rules declared in RULE_IDS that judge() never emits
//   4) rules emitted only by inspect.mjs, outside judge()   (scroll-band / motion)
// Read-only: reads the scripts as text.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:/Web/style';
const BASE = join(ROOT, 'tools/taste-skill/skills/taste-skill/scripts');
const lint = readFileSync(join(BASE, 'lint.mjs'), 'utf8');
const rules = readFileSync(join(BASE, 'lib/rules.mjs'), 'utf8');
const inspect = readFileSync(join(BASE, 'inspect.mjs'), 'utf8');

// static rules: each entry of R starts a line with ['FAIL'|'WARN', 'id',
const staticRules = [...lint.matchAll(/^\s*\['(FAIL|WARN)',\s*'([a-z-]+)'/gm)].map((m) => ({ level: m[1], id: m[2] }));

// judge() emit sites: add('FAIL'|'WARN', 'id', ...)
const judgeBody = rules.slice(rules.indexOf('export function judge'), rules.indexOf('export const RULE_IDS'));
const judgeRules = [...new Set([...judgeBody.matchAll(/add\('(FAIL|WARN)',\s*'([a-z-]+)'/g)].map((m) => m[2]))];

const declared = [...rules.matchAll(/export const RULE_IDS = \[([\s\S]*?)\];/g)][0][1]
  .split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean);

// inspect-only findings pushed straight onto findings[] (scroll band + motion)
const inspectOnly = [...new Set([...inspect.matchAll(/id:\s*'([a-z-]+)'/g)].map((m) => m[1]))];

const staticIds = [...new Set(staticRules.map((r) => r.id))];
console.log(JSON.stringify({
  counts: {
    static_lint_entries: staticRules.length,
    static_lint_unique_ids: staticIds.length,
    judge_emittable_ids: judgeRules.length,
    declared_RULE_IDS: declared.length,
    inspect_only_ids: inspectOnly.length,
    union_everything: new Set([...staticIds, ...judgeRules, ...inspectOnly]).size,
  },
  declared_but_never_emitted_by_judge: declared.filter((d) => !judgeRules.includes(d)),
  judge_emits_but_not_declared: judgeRules.filter((d) => !declared.includes(d)),
  staticOnly_not_in_judge: staticIds.filter((d) => !judgeRules.includes(d)),
  judgeOnly_not_static: judgeRules.filter((d) => !staticIds.includes(d)),
  inspect_only_not_in_either: inspectOnly.filter((d) => !judgeRules.includes(d) && !staticIds.includes(d)),
  declared,
  judgeRules,
  inspectOnly,
}, null, 1));
