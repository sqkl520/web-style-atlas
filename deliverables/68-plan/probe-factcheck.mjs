// Probe 6: verify the specific numeric claims in the task brief, one by one.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const R = 'tools/taste-skill/skills/taste-skill/scripts/lib/rules.mjs';
const src = readFileSync(R, 'utf8');

// --- claim: "51 条：25 FAIL + 26 WARN"
const pairs = [...src.matchAll(/add\('(FAIL|WARN)',\s*'([^']+)'/g)].map((m) => `${m[1]}:${m[2]}`);
const uniqPairs = [...new Set(pairs)];
const failP = uniqPairs.filter((p) => p.startsWith('FAIL')).length;
const warnP = uniqPairs.filter((p) => p.startsWith('WARN')).length;
console.log('=== rules.mjs judge() rule branches ===');
console.log(`raw add() call sites: ${pairs.length}`);
console.log(`distinct (level,id) pairs: ${uniqPairs.length}  -> FAIL ${failP}, WARN ${warnP}`);
console.log(`distinct ids overall: ${new Set(uniqPairs.map((p) => p.split(':')[1])).size}`);
console.log('  FAIL ids: ' + [...new Set(uniqPairs.filter((p) => p.startsWith('FAIL')).map((p) => p.split(':')[1]))].join(', '));

// inspect.mjs adds 6 more ids
const isrc = readFileSync('tools/taste-skill/skills/taste-skill/scripts/inspect.mjs', 'utf8');
const insp = [...new Set([...isrc.matchAll(/id:\s*'([^']+)'/g)].map((m) => m[1]))];
const inspPairs = [...isrc.matchAll(/level:\s*'(FAIL|WARN)',\s*id:\s*'([^']+)'/g)].map((m) => `${m[1]}:${m[2]}`);
console.log(`\ninspect.mjs extra (level,id) pairs: ${[...new Set(inspPairs)].length} -> ${[...new Set(inspPairs)].join(', ')}`);
const allPairs = new Set([...uniqPairs, ...inspPairs]);
console.log(`TOTAL distinct (level,id) pairs across both: ${allPairs.size}`);
console.log(`  of which FAIL: ${[...allPairs].filter((p) => p.startsWith('FAIL')).length}, WARN: ${[...allPairs].filter((p) => p.startsWith('WARN')).length}`);

// --- claim: "全仓 18 个 build/check 脚本"
const b = readdirSync('prototypes/_build').filter((f) => /\.(mjs|py)$/.test(f));
console.log(`\n=== prototypes/_build script count ===`);
console.log(`files: ${b.length} -> ${b.sort().join(', ')}`);

// --- claim: gitignore has no rule for 6*-plan
console.log('\n=== .gitignore coverage for deliverables/*-plan ===');
const gi = readFileSync('.gitignore', 'utf8');
console.log(`contains "deliverables/*-scratch/": ${gi.includes('deliverables/*-scratch/')}`);
console.log(`contains "6*-plan": ${gi.includes('6*-plan')}`);
console.log(`contains "*-plan": ${gi.includes('*-plan')}`);

// --- exempted cases: what does the tracked report's allow array say?
console.log('\n=== allow[] recorded in tracked .inspect/report.json (the durable exemption) ===');
for (const d of readdirSync('prototypes').filter((x) => /^S\d{2}-/.test(x)).sort()) {
  const rp = join('prototypes', d, '.inspect', 'report.json');
  if (!existsSync(rp)) continue;
  const j = JSON.parse(readFileSync(rp, 'utf8').replace(/^\uFEFF/, ''));
  const allow = j.allow || [];
  if (allow.length) console.log(`  ${d.slice(0, 3)}  allow=[${allow.join(',')}]`);
}
