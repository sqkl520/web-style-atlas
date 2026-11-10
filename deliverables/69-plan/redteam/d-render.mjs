// D3: render S07/S13/S21 and measure HOW MUCH text is set in monospace, and where.
// "mono" FAIL is only a real defect if prose is set in mono. Measure share of visible
// characters inside mono-font elements, and the top offenders by selector.
import { Browser } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
const BASE = 'http://127.0.0.1:8611/prototypes/';
const OUT = 'deliverables/69-plan/redteam/';
const b = await Browser.launch({ width: 1440, height: 900 });
const out = {};
for (const [id, dir] of [['S07', 'S07-slate-ink-contents'], ['S13', 'S13-blind-debossed-dispatch'], ['S21', 'S21-interlocking-release-book'], ['S08', 'S08-amber-overprint-lightbox']]) {
  const p = await b.newPage({ width: 1440, height: 900 });
  await p.setViewport({ width: 1440, height: 900, dsf: 1, mobile: false });
  await p.goto(BASE + dir + '/', { settleMs: 1600 });
  const r = await p.eval(() => {
    const isMono = (ff) => /mono|courier|consolas|menlo/i.test(ff || '');
    const all = [...document.querySelectorAll('body *')];
    let totalChars = 0, monoChars = 0;
    const offenders = [];
    for (const el of all) {
      // only leaf-ish elements with direct text
      const direct = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
      if (!direct) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const n = direct.length;
      totalChars += n;
      if (isMono(cs.fontFamily)) {
        monoChars += n;
        offenders.push({ tag: el.tagName.toLowerCase(), cls: (el.className || '').toString().slice(0, 40), chars: n, ff: cs.fontFamily.slice(0, 46), sample: direct.slice(0, 50) });
      }
    }
    // also: is <body> itself mono?
    const bodyFF = getComputedStyle(document.body).fontFamily;
    // count of mono elements carrying >40 chars (i.e. prose, not numbers)
    const proseish = offenders.filter((o) => o.chars > 40);
    return {
      bodyFontFamily: bodyFF, totalChars, monoChars,
      monoShare: totalChars ? +(monoChars / totalChars).toFixed(4) : 0,
      monoElements: offenders.length,
      proseishMono: proseish.slice(0, 12),
      proseishCount: proseish.length,
      top: offenders.sort((a, c) => c.chars - a.chars).slice(0, 8),
    };
  });
  out[id] = r;
  await p.screenshot({ path: OUT + `shots/d-${id}.jpg`, format: 'jpeg', quality: 74 });
  await p.close();
}
writeFileSync(OUT + 'd-render.json', JSON.stringify(out, null, 1));
for (const [k, v] of Object.entries(out)) {
  console.log('\n#### ' + k + '  bodyFF=' + v.bodyFontFamily);
  console.log('   totalChars=' + v.totalChars + ' monoChars=' + v.monoChars + ' share=' + (v.monoShare * 100).toFixed(1) + '%  monoEls=' + v.monoElements + '  proseish(>40ch)=' + v.proseishCount);
  for (const t of v.top) console.log('   ', t.chars.toString().padStart(4), t.tag + '.' + t.cls, '|', t.sample.replace(/\s+/g, ' '));
}
await b.close();
