// A2 (corrected): only the "N 个条目" / "N 块面板分 M 行" claim is about item count.
// Check it against the actual DOM structure (repeated unit class) and against minItems,
// and compare against the drawer count the spec/CSS says.
import { readFileSync } from 'node:fs';
import { makeCtx } from './lib.mjs';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const win = makeCtx();
const S = win.SCHEMES;
const rows = [];
for (const s of S) {
  const prompt = win.buildStylePrompt(s.id);
  const html = readFileSync(join('D:\\Web\\style\\prototypes', s.dir, 'index.html'), 'utf8');
  const css = readFileSync(join('D:\\Web\\style\\prototypes', s.dir, 'style.css'), 'utf8');
  const ps = win.STYLE_PROMPTS.schemes.find((x) => x.id === s.id);

  const claim = (prompt.match(/(\d+)\s*(?:个条目|块面板分\s*\d+\s*行)/) || [])[0] || null;
  const claimN = claim ? parseInt(claim.match(/(\d+)/)[1], 10) : null;

  // "N 个条目" wording used by the prompt — is it described as a design-time scale?
  const describedAsScale = /设计时排了|设计规模|版式的规模|写死坐标/.test(prompt);

  // how many *units* does the actual page render? Take the most-repeated class among
  // elements that carry an id-ish or index-ish child, fallback to most repeated class.
  const cls = {};
  for (const m of html.matchAll(/class="([^"]+)"/g)) {
    for (const c of m[1].split(/\s+/).filter(Boolean)) cls[c] = (cls[c] || 0) + 1;
  }
  const bestRepeat = Object.entries(cls).sort((a, b) => b[1] - a[1])[0];

  rows.push({
    id: s.id, claim, claimN, minItems: ps.minItems,
    claimEqualsMinItems: claimN === ps.minItems,
    describedAsScale,
    topClass: bestRepeat ? bestRepeat[0] : null,
    topClassCount: bestRepeat ? bestRepeat[1] : null,
    topClassMatchesClaim: bestRepeat ? bestRepeat[1] === claimN : null,
  });
}
writeFileSync('D:\\Web\\style\\deliverables\\69-plan\\redteam\\a2b-claims.json', JSON.stringify(rows, null, 1));
console.log('schemes with an "N 个条目/块面板" claim:', rows.filter((r) => r.claimN).length, '/30');
console.log('of those, claimN === minItems:', rows.filter((r) => r.claimEqualsMinItems).length);
console.log('claimN !== minItems:', rows.filter((r) => r.claimN && !r.claimEqualsMinItems).map((r) => r.id + '(' + r.claimN + 'v' + r.minItems + ')').join(' '));
console.log('marked as design-time scale (not a content requirement):', rows.filter((r) => r.describedAsScale).length);
console.log('\nclaim vs most-repeated class in HTML:');
for (const r of rows) console.log(' ', r.id, String(r.claimN).padStart(3), 'vs', String(r.topClassCount).padStart(3), r.topClass, r.topClassMatchesClaim ? 'MATCH' : '');
