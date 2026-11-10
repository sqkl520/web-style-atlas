#!/usr/bin/env node
// REDTEAM probe v3: the exact size of "how many rules can only be tested by rendering".
//
// Definitions used, stated explicitly so the number is falsifiable:
//   STATIC  = ids lint.mjs can emit from source text alone
//   RENDER  = ids only a real browser can decide (judge() + inspect.mjs scroll/motion band)
//   RENDER_ONLY = RENDER \ STATIC
// Read-only.
import { readFileSync } from 'node:fs';

const BASE = 'D:/Web/style/tools/taste-skill/skills/taste-skill/scripts';
const lint = readFileSync(BASE + '/lint.mjs', 'utf8');
const rules = readFileSync(BASE + '/lib/rules.mjs', 'utf8');
const inspect = readFileSync(BASE + '/inspect.mjs', 'utf8');

const staticIds = new Set([...lint.matchAll(/^\s*\['(FAIL|WARN)',\s*'([a-z-]+)'/gm)].map((m) => m[2]));

// judge(): scan every add( ... ) call to its matching paren, keep ids + levels
function scanAdds(src) {
  const out = [];
  const re = /\badd\(/g;
  let m;
  while ((m = re.exec(src))) {
    let i = m.index + m[0].length, depth = 1;
    while (i < src.length && depth > 0) { if (src[i] === '(') depth++; else if (src[i] === ')') depth--; i++; }
    const call = src.slice(m.index + m[0].length, i - 1);
    const parts = []; let d = 0, cur = '';
    for (const ch of call) {
      if ('([{'.includes(ch)) d++;
      if (')]}'.includes(ch)) d--;
      if (ch === ',' && d === 0) { parts.push(cur); cur = ''; } else cur += ch;
    }
    parts.push(cur);
    const idm = (parts[1] || '').match(/'([a-z-]+)'/);
    if (!idm) continue;
    const levels = [...new Set([...(parts[0] || '').matchAll(/'(FAIL|WARN)'/g)].map((x) => x[1]))];
    out.push({ id: idm[1], levels });
  }
  return out;
}
const judgeBody = rules.slice(rules.indexOf('export function judge'), rules.indexOf('export const RULE_IDS'));
const judgeSites = scanAdds(judgeBody);
const inspectSites = [...inspect.matchAll(/level:\s*'(FAIL|WARN)',\s*\n?\s*id:\s*'([a-z-]+)'/g)].map((m) => ({ id: m[2], levels: [m[1]] }));

const renderIds = new Set([...judgeSites.map((s) => s.id), ...inspectSites.map((s) => s.id)]);
const renderOnly = [...renderIds].filter((id) => !staticIds.has(id)).sort();
const staticOnly = [...staticIds].filter((id) => !renderIds.has(id)).sort();
const both = [...renderIds].filter((id) => staticIds.has(id)).sort();

const lvl = new Map();
for (const s of judgeSites) { if (!lvl.has(s.id)) lvl.set(s.id, new Set()); for (const l of s.levels) lvl.get(s.id).add(l); }
for (const s of inspectSites) { if (!lvl.has(s.id)) lvl.set(s.id, new Set()); for (const l of s.levels) lvl.get(s.id).add(l); }
const renderFailCapable = [...renderIds].filter((id) => lvl.get(id).has('FAIL'));

console.log(JSON.stringify({
  static_ids: staticIds.size,
  judge_sites: judgeSites.length,
  judge_ids: new Set(judgeSites.map((s) => s.id)).size,
  render_ids: renderIds.size,
  union: new Set([...staticIds, ...renderIds]).size,
  RENDER_ONLY: { count: renderOnly.length, ids: renderOnly },
  STATIC_ONLY: { count: staticOnly.length, ids: staticOnly },
  IN_BOTH: { count: both.length, ids: both },
  render_FAIL_capable: { count: renderFailCapable.length },
  render_WARN_capable: { count: [...renderIds].filter((id) => lvl.get(id).has('WARN')).length },
}, null, 1));
