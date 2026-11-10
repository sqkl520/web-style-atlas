// _r8_determinism.mjs — 同一案同一视口，为什么两次跑出 2405 与 3538？
// 逐块拆解 + 三次独立进程内重复，找出不稳定的来源
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const BLOCKS = () => {
  const d = document.getElementById('detail');
  const q = (s) => { const e = d.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { h: +r.height.toFixed(1), open: e.open === undefined ? null : e.open }; };
  const dets = Array.from(d.querySelectorAll('details')).map((e) => ({
    cls: e.className, open: e.open, h: +e.getBoundingClientRect().height.toFixed(1),
    sum: (e.querySelector('summary')?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30),
  }));
  const dbody = document.getElementById('d-body');
  return {
    at: Date.now(),
    vw: window.innerWidth, vh: window.innerHeight, dpr: window.devicePixelRatio,
    detailClientH: d.clientHeight, detailScrollH: d.scrollHeight,
    detailOverflowY: getComputedStyle(d).overflowY,
    docScrollH: document.documentElement.scrollHeight,
    bodyScrollH: document.body.scrollHeight,
    head: q('.detail-head'), cta: q('.prompt-cta'), open: q('.open-proto'), fields: q('.fields'),
    bodyPad: getComputedStyle(dbody).padding,
    detailsCount: dets.length, detailsOpen: dets.filter((x) => x.open).length,
    dets: dets.map((x) => x.cls + '|open=' + x.open + '|h=' + x.h + '|' + x.sum),
    fieldCount: d.querySelectorAll('.fields .field').length,
    vpBtns: d.querySelectorAll('.vp button, .vp-switch button').length,
    fonts: document.fonts.status,
    images: Array.from(d.querySelectorAll('img')).map((i) => ({ src: (i.getAttribute('src') || '').split('/').pop(), h: i.getBoundingClientRect().height, w: i.getBoundingClientRect().width, complete: i.complete })),
  };
};

const runs = [];
const br = await Browser.launch({ width: 1440, height: 900 });
for (let i = 0; i < 3; i++) {
  // 三种打开方式：直接深链 / 先首页再点第一行 / 深链但等更久
  const p = await br.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
  if (i === 1) {
    await p.goto(PAGE, { settleMs: 1800 });
    await p.eval('document.fonts.ready.then(()=>1)');
    await p.eval(`document.querySelector('#ledger .row').click(); 1`);
    await sleep(900);
  } else {
    await p.goto(PAGE + '#S01', { settleMs: i === 2 ? 4000 : 2200 });
    await p.eval('document.fonts.ready.then(()=>1)');
  }
  const m = await p.eval(BLOCKS);
  m.mode = ['deeplink-2200', 'click-row', 'deeplink-4000'][i];
  runs.push(m);
  await p.close();
}
await br.close();
writeFileSync(join(HERE, '_r8_determinism.json'), JSON.stringify(runs, null, 1), 'utf8');
runs.forEach((m) => {
  console.log('---', m.mode, 'clientH', m.detailClientH, 'scrollH', m.detailScrollH, 'overflowY', m.detailOverflowY);
  console.log('   head', JSON.stringify(m.head), 'cta', JSON.stringify(m.cta), 'fields', JSON.stringify(m.fields));
  console.log('   details', m.detailsCount, 'open', m.detailsOpen, 'fields', m.fieldCount, 'fonts', m.fonts);
  console.log('   dets:', m.dets.join(' || '));
  console.log('   imgs:', m.images.map((x) => x.src + '=' + Math.round(x.w) + 'x' + Math.round(x.h) + (x.complete ? '' : '(loading)')).join(' '));
});
