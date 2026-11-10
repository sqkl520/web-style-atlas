// P22：那 29 个「如实标为没有」的行业，用户在界面上到底能不能看到（可发现性）
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join } from 'node:path';
import { ROOT } from './_lib.mjs';

const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900, dsf: 1 });
await p.goto(PAGE, { settleMs: 1600 });

const r = await p.eval(() => {
  const note = document.querySelector('.scene-unsupported');
  const more = document.querySelector('.scene-more');
  const toggle = document.querySelector('.scene-toggle');
  const vis = (e) => { if (!e) return null; const cs = getComputedStyle(e); const rr = e.getBoundingClientRect(); return { display: cs.display, w: Math.round(rr.width), h: Math.round(rr.height), inViewport: rr.top < window.innerHeight }; };
  const before = { note: vis(note), more: vis(more), toggle: vis(toggle) };
  if (toggle) toggle.click();
  const after = { note: vis(note), more: vis(more) };
  return { before, after, noteText: note ? note.textContent.slice(0, 120) : null, toggleText: toggle ? toggle.textContent : null };
});
console.log(JSON.stringify(r, null, 1));
await b.close();
