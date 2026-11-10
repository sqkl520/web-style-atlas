#!/usr/bin/env node
// REDTEAM probe v2: rule surface + level split.
//
// v1 bug (fixed here): the regex required a literal 'FAIL'/'WARN' immediately after add(,
// so it missed ternary emits such as
//     add(s.hairlines >= 2 ? 'FAIL' : 'WARN', 'hairline', ...)
// which made `hairline` look "declared but never emitted". It IS emitted, and graded
// FAIL when the page has 2 or more hairlines.
//
// This version scans each add(...) call to its matching close paren and collects every
// quoted rule id plus the levels appearing inside it. Read-only.
import { readFileSync } from 'node:fs';

const BASE = 'D:/Web/style/tools/taste-skill/skills/taste-skill/scripts';
const lint = readFileSync(BASE + '/lint.mjs', 'utf8');
const rules = readFileSync(BASE + '/lib/rules.mjs', 'utf8');
const inspect = readFileSync(BASE + '/inspect.mjs', 'utf8');

// collect add(<expr>, '<id>', ...) where <expr> may be a ternary
function scanAdds(src) {
  const sites = [];
  const calls = [];
  const re = /\badd\(/g;
  let m;
  while ((m = re.exec(src))) {
    // walk to matching close paren
    let i = m.index + m[0].length, depth = 1;
    while (i < src.length && depth > 0) { if (src[i] === '(') depth++; else if (src[i] === ')') depth--; i++; }
    calls.push(src.slice(m.index + m[0].length, i - 1));
  }
  for (const call of calls) {
    // split top-level commas
    const parts = []; let d = 0, cur = '';
    for (const ch of call) {
      if ('([{'.includes(ch)) d++;
      if (')]}'.includes(ch)) d--;
      if (ch === ',' && d === 0) { parts.push(cur); cur = ''; } else cur += ch;
    }
    parts.push(cur);
    const idm = (parts[1] || '').match(/'([a-z-]+)'/);
    if (!idm) continue;
    const levels = new Set([...(parts[0] || '').matchAll(/'(FAIL|WARN)'/g)].map((x) => x[1]));
    sites.push({ id: idm[1], levels: [...levels] });
  }
  return sites;
}

const staticSites = [...lint.matchAll(/^\s*\['(FAIL|WARN)',\s*'([a-z-]+)'/gm)].map((x) => ({ id: x[2], levels: [x[1]] }));
const judgeSrc = rules.slice(rules.indexOf('export function judge'), rules.indexOf('export const RULE_IDS'));
const judgeSites = scanAdds(judgeSrc);
const inspectSites = scanAdds(inspect + '\n'); // inspect uses findings.push, handled below
const inspectPush = [...inspect.matchAll(/level:\s*'(FAIL|WARN)',\s*\n?\s*id:\s*'([a-z-]+)'/g)].map((x) => ({ id: x[2], levels: [x[1]] }));

const declared = [...rules.matchAll(/export const RULE_IDS = \[([\s\S]*?)\];/g)][0][1]
  .split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean);

const summarise = (sites) => {
  const byId = new Map();
  for (const s of sites) { if (!byId.has(s.id)) byId.set(s.id, new Set()); for (const l of s.levels) byId.get(s.id).add(l); }
  return byId;
};

const jm = summarise(judgeSites);
const judgeIds = [...jm.keys()];
const failOnly = [...jm].filter(([, v]) => v.has('FAIL') && !v.has('WARN')).map(([k]) => k);
const warnOnly = [...jm].filter(([, v]) => v.has('WARN') && !v.has('FAIL')).map(([k]) => k);
const both = [...jm].filter(([, v]) => v.has('FAIL') && v.has('WARN')).map(([k]) => k);

console.log(JSON.stringify({
  static_lint: { entries: staticSites.length, unique: new Set(staticSites.map((s) => s.id)).size },
  judge: {
    sites: judgeSites.length,
    unique: judgeIds.length,
    FAIL_only: failOnly.length,
    WARN_only: warnOnly.length,
    both: both.length,
    bothIds: both,
    FAIL_capable: judgeIds.filter((id) => jm.get(id).has('FAIL')).length,
    WARN_capable: judgeIds.filter((id) => jm.get(id).has('WARN')).length,
  },
  declared_RULE_IDS: declared.length,
  declared_but_no_judge_site: declared.filter((d) => !judgeIds.includes(d)),
  judge_but_undeclared: judgeIds.filter((d) => !declared.includes(d)),
  inspect_push_ids: [...new Set(inspectPush.map((s) => s.id))],
  union: new Set([...staticSites.map((s) => s.id), ...judgeIds, ...inspectPush.map((s) => s.id)]).size,
  hairline_levels: [...(jm.get('hairline') || [])],
}, null, 1));
