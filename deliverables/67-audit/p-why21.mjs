// p-why21.mjs — 为什么 19/30 案的 scrollH 在 01:26→01:49 之间各降了 21px？
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const PROBE = () => {
  const d = document.getElementById('detail');
  const body = document.getElementById('d-body');
  const H = (e) => e ? +e.getBoundingClientRect().height.toFixed(1) : null;
  const head = d.querySelector('.detail-head');
  const kids = Array.from(body.children).map((e) => ({ cls: e.className, h: H(e) }));
  const stage = d.querySelector('.viewer-stage');
  const img = stage ? stage.querySelector('img') : null;
  return {
    scrollH: d.scrollHeight,
    headH: H(head),
    headParts: {
      no: H(d.querySelector('.detail-no')),
      title: H(d.querySelector('.detail-title')),
      h2: H(d.querySelector('.detail-title h2')),
      p: H(d.querySelector('.detail-title p')),
    },
    kids,
    viewer: H(d.querySelector('.viewer')),
    stageH: H(stage), stageScroll: stage ? stage.scrollHeight : null,
    imgH: img ? +img.getBoundingClientRect().height.toFixed(1) : null,
    imgNatural: img ? [img.naturalWidth, img.naturalHeight] : null,
    imgComplete: img ? img.complete : null,
    promptCta: H(d.querySelector('.prompt-cta')),
    parts: H(d.querySelector('.fold-parts')),
    gate: H(d.querySelector('.fold-gate')),
    fields: H(d.querySelector('#d-body .fields')),
  };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const p = await browser.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
for (const id of ['S01', 'S11', 'S26', 'S21']) {
  await p.goto(PAGE, { settleMs: 1000 });
  await p.eval((sid) => { document.querySelector('.row[data-id="' + sid + '"]').click(); document.getElementById('detail').scrollTop = 0; }, id);
  await new Promise((r) => setTimeout(r, 400));
  const a = await p.eval(PROBE);
  console.log('\n' + id, 'scrollH', a.scrollH, '| head', a.headH, JSON.stringify(a.headParts));
  console.log('  stageH', a.stageH, 'imgH', a.imgH, 'natural', JSON.stringify(a.imgNatural), 'complete', a.imgComplete);
  console.log('  promptCta', a.promptCta, 'parts', a.parts, 'gate', a.gate, 'fields', a.fields);
  for (const k of a.kids) console.log('   ', String(k.cls).padEnd(18), k.h);
}
await p.close();
await browser.close();
