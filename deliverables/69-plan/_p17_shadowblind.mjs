// 探针 17：闸门的 shadow 判据有没有盲区？probe.mjs 只读**元素**的 computed boxShadow，
// 不读 ::before / ::after。若阴影落在伪元素上，运行期会报 shadowStatic=0 而页面上真有阴影。
// 同时检查 S19 的 `0 0 0 1px` 那类"环形外投影"落在哪个元素上、为什么没被数到。
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const fileUrl = (p) => 'file:///' + join(ROOT, p).replace(/\\/g, '/');

const SCAN = () => {
  const els = [...document.querySelectorAll('*')];
  const elemShadow = [], pseudoShadow = [];
  for (const el of els) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none') continue;
    const bs = cs.boxShadow;
    if (bs && bs !== 'none') {
      const outer = bs.split(/,(?![^(]*\))/).some((p) => !/inset/.test(p) && !/ 0px 0px 0px 0px/.test(p) && !/rgba\(\d+, \d+, \d+, 0\)/.test(p));
      if (outer) elemShadow.push({ tag: el.tagName, cls: el.className, bs: bs.slice(0, 70), vis: el.getBoundingClientRect().width > 2 });
    }
    for (const pe of ['::before', '::after']) {
      const pcs = getComputedStyle(el, pe);
      if (pcs.content === 'none' || pcs.display === 'none') continue;
      const pbs = pcs.boxShadow;
      if (pbs && pbs !== 'none') {
        const outer = pbs.split(/,(?![^(]*\))/).some((p) => !/inset/.test(p) && !/ 0px 0px 0px 0px/.test(p));
        if (outer) pseudoShadow.push({ tag: el.tagName, cls: String(el.className).slice(0, 40), pe, bs: pbs.slice(0, 70), w: +pcs.width.slice(0, 10), h: +pcs.height.slice(0, 10) });
      }
    }
  }
  return {
    elemShadowCount: elemShadow.length, pseudoShadowCount: pseudoShadow.length,
    elemShadow: elemShadow.slice(0, 8), pseudoShadow: pseudoShadow.slice(0, 8),
    hasPinned: !!document.querySelector('.is-pinned'),
  };
};

const br = await Browser.launch({ width: 1440, height: 900 });
for (const p of ['prototypes/S13-blind-debossed-dispatch/index.html', 'prototypes/S19-copperplate-herbarium-cabinet/index.html',
  'prototypes/S07-slate-ink-contents/index.html', 'prototypes/S21-interlocking-release-book/index.html']) {
  const pg = await br.newPage({ width: 1440, height: 900, dsf: 1 });
  await pg.goto(fileUrl(p), { settleMs: 2000 });
  await pg.eval('document.fonts.ready.then(()=>1)');
  const r = await pg.eval(SCAN);
  console.log(`=== ${p.split('/')[1]} ===`);
  console.log(`  元素上有外投影: ${r.elemShadowCount}   伪元素上有外投影: ${r.pseudoShadowCount}   存在 .is-pinned: ${r.hasPinned}`);
  for (const x of r.elemShadow) console.log(`    ELEM  ${x.tag}.${String(x.cls).slice(0, 30)}  ${x.bs}  visible=${x.vis}`);
  for (const x of r.pseudoShadow) console.log(`    PSEUDO ${x.tag}.${x.cls} ${x.pe}  ${x.bs}  size=${x.w}x${x.h}`);
  await pg.close();
}
await br.close();
