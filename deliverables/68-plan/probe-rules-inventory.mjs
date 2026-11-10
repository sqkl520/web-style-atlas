// Probe 4: rule inventory — which of lint's 23 static rules are code rules vs copy/data rules,
// and what each scope produces. Also verifies the ignore-comment hygiene in S*.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// --- part 1: classify lint rules by what they can legitimately hit
const lintSrc = readFileSync('tools/taste-skill/skills/taste-skill/scripts/lint.mjs', 'utf8');
const ruleBlock = lintSrc.slice(lintSrc.indexOf('const R = ['), lintSrc.indexOf('];', lintSrc.indexOf('const R = [')));
const rules = [...ruleBlock.matchAll(/\['(FAIL|WARN)',\s*'([^']+)',\s*\/(.+?)\/[gimsuy]*,/gs)].map((m) => ({ level: m[1], id: m[2] }));
const byLevel = { FAIL: rules.filter((r) => r.level === 'FAIL').length, WARN: rules.filter((r) => r.level === 'WARN').length };
console.log('=== lint.mjs static rule inventory (parsed from source) ===');
console.log(`total rule entries: ${rules.length}  (FAIL ${byLevel.FAIL}, WARN ${byLevel.WARN})`);
const ids = [...new Set(rules.map((r) => r.id))];
console.log(`distinct ids: ${ids.length} -> ${ids.join(', ')}`);

// --- part 2: dynamic rule ids from rules.mjs + inspect.mjs
const rulesSrc = readFileSync('tools/taste-skill/skills/taste-skill/scripts/lib/rules.mjs', 'utf8');
const dyn = [...rulesSrc.matchAll(/RULE_IDS = \[([\s\S]*?)\];/g)][0][1].match(/'([^']+)'/g).map((s) => s.slice(1, -1));
console.log(`\nrules.mjs RULE_IDS: ${dyn.length} ids`);

const inspectSrc = readFileSync('tools/taste-skill/skills/taste-skill/scripts/inspect.mjs', 'utf8');
const inspectOnly = [...new Set([...inspectSrc.matchAll(/id:\s*'([^']+)'/g)].map((m) => m[1]))];
console.log(`inspect-only ids: ${inspectOnly.length} -> ${inspectOnly.join(', ')}`);

const staticIds = new Set(ids);
const dynamicOnly = dyn.filter((d) => !staticIds.has(d));
console.log(`\nRENDER-ONLY (in judge/RULE_IDS but no static lint rule): ${dynamicOnly.length}`);
console.log('  ' + dynamicOnly.join(', '));

// --- part 3: ignore-comment hygiene in S*
console.log('\n=== taste-skill-ignore hygiene in prototypes/S* ===');
let bare = 0, reasoned = 0;
const perDir = new Map();
for (const d of readdirSync('prototypes')) {
  if (!/^S\d{2}-/.test(d)) continue;
  for (const f of readdirSync(join('prototypes', d))) {
    if (!/\.(html|css|js)$/.test(f)) continue;
    const lines = readFileSync(join('prototypes', d, f), 'utf8').split(/\r?\n/);
    lines.forEach((line) => {
      if (!/taste-skill-ignore/.test(line)) return;
      perDir.set(d, (perDir.get(d) || 0) + 1);
      // a "reason" = text after the marker beyond ~12 chars
      const after = line.split('taste-skill-ignore')[1] || '';
      const reason = after.replace(/^[:\s*\-—]+/, '').trim();
      if (reason.length >= 12) reasoned++; else { bare++; console.log(`  BARE  ${d}/${f}: ${line.trim().slice(0, 100)}`); }
    });
  }
}
console.log(`  reasoned=${reasoned}  bare=${bare}`);
console.log('  per dir: ' + [...perDir.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k.slice(0, 3)}=${v}`).join(' '));
