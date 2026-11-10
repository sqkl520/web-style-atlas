// A5: prompt self-consistency coverage = for each of 30, do the values the prompt ASSERTS
// match what the prototype's CSS actually declares? This is the cheap 30/30 replacement.
// Claimed axes: palette (hex list), radius=0, mono usage, shadow kind, line widths, h1 size.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { makeCtx, ROOT, hexes } from './lib.mjs';
import { writeFileSync } from 'node:fs';

const win = makeCtx();
const S = win.SCHEMES;
const rows = [];

for (const s of S) {
  const prompt = win.buildStylePrompt(s.id);
  const dir = join(ROOT, 'prototypes', s.dir);
  const css = readFileSync(join(dir, 'style.css'), 'utf8');
  const html = readFileSync(join(dir, 'index.html'), 'utf8');
  const ph = hexes(prompt);
  const ch = new Set(hexes(css));

  // 1. every palette hex the prompt names must actually exist in the css
  const paletteLine = (prompt.match(/[^\n]*配[色色]只用[^\n]*/) || prompt.match(/[^\n]*#[0-9A-F]{6}[^\n]*/) || [''])[0];
  const namedHexes = hexes(paletteLine);
  const missingInCss = namedHexes.filter((h) => !ch.has(h) && !hexes(html).includes(h));

  // 2. radius claim
  const radiusClaimBare = /全直角|border-radius: ?0|圆角 0/.test(prompt);
  const cssRadius = (css.match(/border-radius\s*:\s*[^;}]+/g) || []).map((x) => x.replace(/\s+/g, ' ').trim());
  const nonZeroRadius = cssRadius.filter((r) => !/:\s*0(px|rem|em)?\s*$/.test(r) && !/:\s*0\s/.test(r + ' '));

  // 3. shadow claim: "only inset" / "no outer shadow"
  const claimsInsetOnly = /只允许 inset|只用 inset|全为 inset|没有一处外投影|无外投影|只有 inset/.test(prompt);
  const shadows = (css.match(/box-shadow\s*:\s*[^;}]+/g) || []).map((x) => x.replace(/\s+/g, ' ').trim());
  const outerShadows = shadows.filter((x) => !/inset/.test(x) && !/:\s*none/.test(x));
  const claimsNoOuter = /外投影 0|没有一处外投影|无外投影|不做外投影/.test(prompt);

  // 4. mono claim: does prompt say mono is used for numbers/codes?
  const claimsMono = /等宽|Mono|mono/.test(prompt);
  const cssHasMonoOnBody = /body[^{]*\{[^}]*font-family[^}]*Mono/i.test(css);

  rows.push({
    id: s.id,
    promptLen: [...prompt].length,
    namedHexes, missingInCss,
    paletteConsistent: missingInCss.length === 0,
    radiusClaimBare, cssRadiusCount: cssRadius.length, nonZeroRadiusCount: nonZeroRadius.length,
    claimsInsetOnly, shadowCount: shadows.length, outerShadowCount: outerShadows.length,
    shadowConsistent: !claimsInsetOnly || outerShadows.length === 0,
    claimsNoOuter, outerShadowViolation: claimsNoOuter && outerShadows.length > 0,
    claimsMono, cssHasMonoOnBody,
    gateFail: s.gate.fail,
  });
}

const summary = {
  n: rows.length,
  paletteConsistent: rows.filter((r) => r.paletteConsistent).length,
  shadowConsistent: rows.filter((r) => r.shadowConsistent).length,
  radiusConsistent: rows.filter((r) => !(r.radiusClaimBare && r.nonZeroRadiusCount > 0)).length,
  allThree: rows.filter((r) => r.paletteConsistent && r.shadowConsistent && !(r.radiusClaimBare && r.nonZeroRadiusCount > 0)).length,
  paletteFailures: rows.filter((r) => !r.paletteConsistent).map((r) => ({ id: r.id, missing: r.missingInCss })),
  shadowFailures: rows.filter((r) => !r.shadowConsistent).map((r) => ({ id: r.id, outer: r.outerShadowCount, shadows: r.shadowCount })),
  radiusFailures: rows.filter((r) => r.radiusClaimBare && r.nonZeroRadiusCount > 0).map((r) => ({ id: r.id, count: r.nonZeroRadiusCount })),
};
writeFileSync('deliverables/69-plan/redteam/a5-out.json', JSON.stringify({ summary, rows }, null, 1));
console.log(JSON.stringify(summary, null, 1));
