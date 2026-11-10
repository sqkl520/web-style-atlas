// Q: how many taste-skill-ignore comments would it take to green the 29 FAILs, and what else would
// each one silence? Simulates the fix by measuring (a) distinct file:line pairs, (b) co-located findings
// that would be suppressed for free, (c) findings on the SAME line in OTHER rules (collateral).
import { readFileSync, writeFileSync } from 'node:fs';

function analyse(jsonPath) {
  const { findings } = JSON.parse(readFileSync(jsonPath, 'utf8'));
  const fails = findings.filter((f) => f.level === 'FAIL' && f.line > 0);
  const byLine = new Map();
  for (const f of findings) {
    if (f.line === 0) continue;
    const k = f.file + ':' + f.line;
    if (!byLine.has(k)) byLine.set(k, []);
    byLine.get(k).push(f);
  }
  const failLines = new Set(fails.map((f) => f.file + ':' + f.line));
  // collateral: lines carrying a FAIL and at least one other finding
  const collateral = [];
  for (const k of failLines) {
    const all = byLine.get(k);
    if (all.length > 1) collateral.push({ line: k, findings: all.map((f) => f.level + ' ' + f.id) });
  }
  // semantic collateral: a CSS line like "border-top: 1px solid" + "border: 1px solid" is one declaration
  return {
    failCount: fails.length,
    distinctFailLines: failLines.size,
    ignoreCommentsNeeded: failLines.size,
    byFile: Object.fromEntries([...new Set(fails.map((f) => f.file))].map((f) => [f, fails.filter((x) => x.file === f).length])),
    linesSharedWithOtherFindings: collateral,
  };
}

const sel = analyse('deliverables/68-audit/lint-selection.json');
const tpl = analyse('deliverables/68-audit/lint-templates.json');
console.log('=== _selection ===');
console.log(JSON.stringify(sel, null, 1));
console.log('\n=== templates ===');
console.log(JSON.stringify({ failCount: tpl.failCount, distinctFailLines: tpl.distinctFailLines, byFile: tpl.byFile, shared: tpl.linesSharedWithOtherFindings.length }, null, 1));
writeFileSync('deliverables/68-audit/exemption-cost.json', JSON.stringify({ sel, tpl }, null, 1), 'utf8');
