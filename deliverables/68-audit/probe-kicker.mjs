// Verify: (1) exact lint FAIL counts for S01..S30 only, (2) S16 kicker geometry vs the runtime eyebrow
// detector's header exclusion, (3) why _selection's .mast-kicker never trips the runtime gate.
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const j = JSON.parse(readFileSync('deliverables/68-audit/lint-prototypes.json', 'utf8'));
const sOnly = j.findings.filter((f) => /^prototypes\/S\d\d-/.test(f.file));
const byRule = {};
for (const f of sOnly) { const k = f.level + ' ' + f.id; byRule[k] = (byRule[k] || 0) + 1; }
const protoDirs = readdirSync('prototypes').filter((d) => /^S\d\d-/.test(d) && statSync(join('prototypes', d)).isDirectory());
const withFindings = new Set(sOnly.map((f) => f.file.split('/')[1]));
console.log(`S01..S30 dirs on disk: ${protoDirs.length}`);
console.log(`S-dirs with at least one lint finding: ${withFindings.size}`);
console.log(`lint findings inside S-dirs: ${sOnly.length} (FAIL ${sOnly.filter((f) => f.level === 'FAIL').length})`);
console.log('by rule:', JSON.stringify(byRule, null, 1));

const out = { lint: { sDirs: protoDirs.length, withFindings: withFindings.size, total: sOnly.length, fails: sOnly.filter((f) => f.level === 'FAIL').length, byRule } };

const b = await Browser.launch({ width: 1440, height: 900 });
try {
  for (const [k, url] of [
    ['S16', 'http://127.0.0.1:8100/prototypes/S16-velocity-slant-manifesto/index.html'],
    ['sel', 'http://127.0.0.1:8100/prototypes/_selection/index.html'],
    ['wizard', 'http://127.0.0.1:8100/prototypes/_selection/wizard.html'],
  ]) {
    const p = await b.newPage({ width: 1440, height: 900, dsf: 1 });
    await p.goto(url, { settleMs: 1800 });
    out[k] = await p.eval(() => {
      const h = document.querySelector('h1');
      const hr = h.getBoundingClientRect();
      const cand = document.querySelector('.kicker, .mast-kicker');
      let res = null;
      if (cand) {
        const r = cand.getBoundingClientRect();
        const cs = getComputedStyle(cand);
        res = {
          text: cand.textContent.trim().slice(0, 50),
          top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height),
          size: cs.fontSize, upper: cs.textTransform === 'uppercase', ls: cs.letterSpacing,
          inHeader: !!cand.closest('header'),
          h1top: Math.round(hr.top), h1size: getComputedStyle(h).fontSize,
          gapDown: Math.round(hr.top - r.bottom),
          sizeOk: parseFloat(cs.fontSize) <= Math.min(18, parseFloat(getComputedStyle(h).fontSize) * 0.5),
        };
      }
      return { kicker: res, h1: { text: h.textContent.trim().slice(0, 30), size: getComputedStyle(h).fontSize, top: Math.round(hr.top) } };
    });
    await p.close();
  }
} finally {
  writeFileSync('deliverables/68-audit/probe-kicker.json', JSON.stringify(out, null, 1), 'utf8');
  await b.close();
}
console.log(JSON.stringify(out, null, 1));
