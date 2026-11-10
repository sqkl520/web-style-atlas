// 裁决 3 终测：推荐方案「家族名 + 一句机制」在 mobile 的代价
import { resolve } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startServer } from './_v_srv.mjs';
import { readFileSync } from 'node:fs';

const t = readFileSync(resolve('prototypes/_selection/data.js'), 'utf8');
const rows = JSON.parse(t.slice(t.indexOf('= ') + 2).replace(/;\s*$/, ''));
const fam = {}, mech = {};
for (const r of rows) {
  const f = r.family || '';
  fam[r.id] = f;
  const segs = f.split('。').filter((s) => s.trim());
  mech[r.id] = segs.find((s, i) => i > 0 && /偷|拿的|机制/.test(s)) || '';
}
const apply = (arg) => {
  const { mode, map, mmap, n } = arg;
  for (const row of [...document.querySelectorAll('.row')]) {
    const id = row.getAttribute('data-id');
    const el = row.querySelector('.row-family');
    if (!el) continue;
    const segs = (map[id] || '').split('。').filter((s) => s.trim());
    const name = (segs[0] || '').split('：').pop();
    if (mode === 'slice34') { el.textContent = name.slice(0, 34); el.style.cssText = ''; }
    else { // nameMech
      el.textContent = name + (mmap[id] ? '。' + mmap[id] : '');
      el.style.cssText = '-webkit-line-clamp:' + n + ';-webkit-box-orient:vertical;display:-webkit-box;overflow:hidden;';
    }
  }
  return true;
};
const probe = () => [...document.querySelectorAll('.row')].map((row) => {
  const r = row.getBoundingClientRect();
  const el = row.querySelector('.row-family');
  return { id: row.getAttribute('data-id'), rowH: +r.height.toFixed(1),
    famH: el ? +el.getBoundingClientRect().height.toFixed(1) : 0,
    clipped: el ? el.scrollHeight > el.clientHeight + 2 : false };
});

const srv = await startServer({ root: resolve('.') });
const browser = await Browser.launch();
const R = {};
try {
  for (const vp of [{ l: '1440', w: 1440, h: 1000 }, { l: '390', w: 390, h: 844, m: true }]) {
    const page = await browser.newPage({ width: vp.w, height: vp.h, dsf: 1, mobile: !!vp.m });
    await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 1100 });
    await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
    await sleep(500);
    for (const [mode, n] of [['slice34', 0], ['nameMech', 2], ['nameMech', 3]]) {
      await page.eval(apply, { mode, map: fam, mmap: mech, n });
      await sleep(350);
      R[vp.l + ':' + mode + n] = await page.eval(probe);
    }
    await page.close();
  }
} finally { await browser.close(); await srv.close(); }

for (const vp of ['1440', '390']) {
  const base = R[vp + ':slice340'];
  console.log(`\n=== ${vp} ===`);
  for (const k of [vp + ':slice340', vp + ':nameMech2', vp + ':nameMech3']) {
    const g = R[k];
    console.log(`${k.padEnd(20)} 总高 ${g.reduce((a, x) => a + x.rowH, 0).toFixed(0).padStart(6)}  max行高 ${Math.max(...g.map(x=>x.rowH))}  被钳 ${g.filter(x=>x.clipped).length}/30`);
  }
  for (const k of [':nameMech2', ':nameMech3']) {
    const g = R[vp + k];
    const d = g.map((x, i) => x.rowH - base[i].rowH);
    console.log(`  ${k} vs 现状: 上升 ${d.filter(x=>x>0.5).length}/30 案，总增量 ${d.reduce((a,b)=>a+b,0).toFixed(0)}px，单案最大 +${Math.max(...d).toFixed(0)}px`);
  }
}
