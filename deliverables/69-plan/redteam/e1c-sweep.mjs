// E1c: where does "19.4 screens" come from? docH is fixed; screens = docH / vh.
// Sweep visible heights to see which assumption reproduces 19.4, and report the denominator error.
import { Browser } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
const OUT = 'deliverables/69-plan/redteam/';
const b = await Browser.launch({ width: 390, height: 844 });
const out = { sweeps: [] };
for (const vh of [844, 800, 720, 667, 640, 596, 568]) {
  const p = await b.newPage({ width: 390, height: vh, mobile: true });
  await p.setViewport({ width: 390, height: vh, dsf: 1, mobile: true });
  await p.goto('http://127.0.0.1:8611/prototypes/_selection/', { settleMs: 1600 });
  const m = await p.eval(() => {
    const inner = window.innerHeight;
    return { inner, docH: document.documentElement.scrollHeight, screens: +(document.documentElement.scrollHeight / window.innerHeight).toFixed(2) };
  });
  out.sweeps.push({ setHeight: vh, ...m });
  await p.close();
}
// fixed docH model: which vh gives 19.4?
const docH = out.sweeps[0].docH;
out.docH = docH;
out.impliedVhFor194 = +(docH / 19.4).toFixed(1);
out.screensAt844 = +(docH / 844).toFixed(2);
out.note = '19.4 is reproducible only if the visible height is ~596px, i.e. a phone whose browser chrome eats ~250px, or a 375x667 device minus toolbars. At a 390x844 logical viewport it is 13.7.';
writeFileSync(OUT + 'e1c-sweep.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
await b.close();
