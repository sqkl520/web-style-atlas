// A2: the decisive cheap test. Does the GENERATED prompt describe the prototype that exists?
// Extract falsifiable claims from buildPrompt(id) and check them against the live DOM.
// If the prompt contradicts its own prototype, no LLM can produce that style from it.
import { Browser } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { makeCtx } from './lib.mjs';
import { writeFileSync } from 'node:fs';

const win = makeCtx();
const S = win.SCHEMES;
const BASE = 'http://127.0.0.1:8611/prototypes/';
const OUT = 'deliverables/69-plan/redteam/';

const b = await Browser.launch({ width: 1440, height: 900 });
const rows = [];
for (const s of S) {
  const prompt = win.buildStylePrompt(s.id);
  const p = await b.newPage({ width: 1440, height: 900 });
  await p.setViewport({ width: 1440, height: 900, dsf: 1, mobile: false });
  await p.goto(BASE + s.dir + '/', { settleMs: 900 });
  const dom = await p.eval(() => {
    const de = document.documentElement;
    const cs = getComputedStyle(document.body);
    // count "panel/unit-like" repeated blocks: elements whose class repeats >=3 times
    const clsCount = {};
    for (const el of document.querySelectorAll('*')) {
      const c = (el.className || '').toString().split(/\s+/).filter(Boolean)[0];
      if (c) clsCount[c] = (clsCount[c] || 0) + 1;
    }
    const repeated = Object.entries(clsCount).filter(([, n]) => n >= 3).sort((a, b2) => b2[1] - a[1]).slice(0, 6);
    // real images
    const imgs = [...document.querySelectorAll('img')];
    const loaded = imgs.filter((i) => i.complete && i.naturalWidth > 0);
    return {
      bodyFF: cs.fontFamily,
      bodySize: cs.fontSize,
      docH: de.scrollHeight,
      imgCount: imgs.length, loadedImgs: loaded.length,
      repeated,
      h1: (document.querySelector('h1') || {}).textContent ? document.querySelector('h1').textContent.trim().slice(0, 50) : null,
      h1FF: document.querySelector('h1') ? getComputedStyle(document.querySelector('h1')).fontFamily : null,
      h1Size: document.querySelector('h1') ? getComputedStyle(document.querySelector('h1')).fontSize : null,
    };
  });
  await p.close();

  // ---- falsifiable claims in the prompt
  // 1) "N 块面板分 M 行" / "N 个条目"
  const panelClaim = (prompt.match(/(\d+)\s*块面板分\s*(\d+)\s*行/) || prompt.match(/(\d+)\s*个条目/) || [])[0] || null;
  const claimN = panelClaim ? parseInt((panelClaim.match(/(\d+)/) || [])[1], 10) : null;
  // 2) minItems claim
  const minItems = win.STYLE_PROMPTS.schemes.find((x) => x.id === s.id).minItems;
  const minItemsClaim = (prompt.match(/至少要\s*(\d+)\s*个/) || [])[1];
  // 3) "至少 N 个不同的图片位置"
  const picsClaim = (prompt.match(/至少要\s*(\d+)\s*个\*\*不同\*\*的图片位置/) || prompt.match(/至少要\s*(\d+)\s*个不同的图片位置/) || [])[1];

  rows.push({
    id: s.id,
    panelClaim, claimN,
    minItemsClaim: minItemsClaim ? +minItemsClaim : null, minItems,
    minItemsMatch: minItemsClaim ? +minItemsClaim === minItems : null,
    picsClaim: picsClaim ? +picsClaim : null,
    actualLoadedImgs: dom.loadedImgs, actualImgTags: dom.imgCount,
    picsClaimSatisfied: picsClaim ? dom.loadedImgs >= +picsClaim : null,
    topRepeated: dom.repeated,
    // does any repeated class hit the claimed panel count?
    claimNObserved: claimN ? dom.repeated.some(([, n]) => n === claimN) : null,
    bodySize: dom.bodySize,
  });
}
writeFileSync(OUT + 'a2-claims.json', JSON.stringify(rows, null, 1));
console.log('| id | panel claim | observed repeat | minItems claim/actual | pics claim/actual |');
for (const r of rows) {
  console.log([r.id, (r.panelClaim || '-').padEnd(16), (r.claimNObserved === null ? '-' : String(r.claimNObserved)).padEnd(7),
    (r.minItemsMatch === null ? '-' : (r.minItemsClaim + '/' + r.minItems + (r.minItemsMatch ? ' OK' : ' MISMATCH'))).padEnd(14),
    (r.picsClaim === null ? '-' : (r.picsClaim + '/' + r.actualLoadedImgs + (r.picsClaimSatisfied ? ' OK' : ' SHORT'))).padEnd(12)].join(' | '));
}
console.log('\nminItems mismatches:', rows.filter((r) => r.minItemsMatch === false).map((r) => r.id + '(' + r.minItemsClaim + 'vs' + r.minItems + ')').join(' '));
console.log('pics short:', rows.filter((r) => r.picsClaimSatisfied === false).map((r) => r.id + '(' + r.picsClaim + 'vs' + r.actualLoadedImgs + ')').join(' '));
console.log('panel claim not observed:', rows.filter((r) => r.claimNObserved === false).map((r) => r.id + '[' + r.panelClaim + ']').join(' '));
await b.close();
