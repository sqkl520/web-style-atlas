// 裁决 3 定量：桌面行卡有多少垂直余量？mobile 又差多少？
import { resolve } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startServer } from './_v_srv.mjs';
import { readFileSync } from 'node:fs';

const dataTxt = readFileSync(resolve('prototypes/_selection/data.js'), 'utf8');
const rowsData = JSON.parse(dataTxt.slice(dataTxt.indexOf('= ') + 2).replace(/;\s*$/, ''));
const families = {};
for (const r of rowsData) families[r.id] = r.family || '';

const probe = () => {
  return [...document.querySelectorAll('.row')].map((row) => {
    const r = row.getBoundingClientRect();
    const main = row.querySelector('.row-main');
    const shots = row.querySelector('.shots');
    const fam = row.querySelector('.row-family');
    const meta = row.querySelector('.row-meta');
    const def = row.querySelector('.row-def');
    return {
      id: row.getAttribute('data-id'),
      rowH: +r.height.toFixed(1),
      mainH: main ? +main.getBoundingClientRect().height.toFixed(1) : 0,
      shotsH: shots ? +shots.getBoundingClientRect().height.toFixed(1) : 0,
      famH: fam ? +fam.getBoundingClientRect().height.toFixed(1) : 0,
      metaH: meta ? +meta.getBoundingClientRect().height.toFixed(1) : 0,
      defH: def ? +def.getBoundingClientRect().height.toFixed(1) : 0,
      // main 列还剩多少垂直余量（rowH - padding*2 - mainH）
      slack: +(r.height - main.getBoundingClientRect().height).toFixed(1),
    };
  });
};
const setFam = (arg) => {
  const { mode, map } = arg;
  for (const row of [...document.querySelectorAll('.row')]) {
    const id = row.getAttribute('data-id');
    const fam = row.querySelector('.row-family');
    if (!fam) continue;
    const segs = (map[id] || '').split('。').filter((s) => s.trim());
    const name = (segs[0] || '').split('：').pop();
    const mech = segs.find((s, i) => i > 0 && /偷|拿的|不是/.test(s)) || '';
    fam.textContent = mode === 'full' ? (map[id] || '') : (mode === 'name_mech' ? name + (mech ? '。' + mech : '') : name);
  }
  return true;
};

const srv = await startServer({ root: resolve('.') });
const browser = await Browser.launch();
const all = {};
try {
  for (const vp of [{ l: '1440', w: 1440, h: 1000 }, { l: '390', w: 390, h: 844, m: true }]) {
    const page = await browser.newPage({ width: vp.w, height: vp.h, dsf: 1, mobile: !!vp.m });
    await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 1100 });
    await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
    await sleep(500);
    for (const mode of ['name', 'name_mech', 'full']) {
      await page.eval(setFam, { mode, map: families });
      await sleep(350);
      all[vp.l + ':' + mode] = await page.eval(probe);
    }
    await page.close();
  }
} finally { await browser.close(); await srv.close(); }

console.log('=== 桌面 1440：行高是否被 family 影响 ===');
const d = all['1440:name'], dm = all['1440:name_mech'], df = all['1440:full'];
let worse = 0;
for (let i = 0; i < d.length; i++) {
  const a = d[i].rowH, b = df[i].rowH;
  if (b > a) worse++;
  console.log(`  ${d[i].id} name=${String(a).padStart(6)} full=${String(b).padStart(6)} Δ=${(b - a).toFixed(1).padStart(6)}  slack(name)=${String(d[i].rowH - d[i].mainH).padStart(6)} mainH=${d[i].mainH} shotsH=${d[i].shotsH}`);
}
console.log(`\n桌面：full 使行高上升的案数 = ${worse}/30`);

console.log('\n=== 关键：桌面行卡垂直余量（rowH - mainH）===');
const slacks = d.map((x) => x.rowH - x.mainH).sort((a, b) => a - b);
console.log('slack min/p50/max =', slacks[0], slacks[15], slacks[29]);
const famDelta = dm.map((x, i) => x.famH - d[i].famH).sort((a, b) => a - b);
const fullDelta = df.map((x, i) => x.famH - d[i].famH).sort((a, b) => a - b);
console.log('name→name_mech 的 famH 增量 min/p50/max =', famDelta[0], famDelta[15], famDelta[29]);
console.log('name→full 的 famH 增量 min/p50/max =', fullDelta[0], fullDelta[15], fullDelta[29]);
console.log('→ 桌面 slack 中位数', slacks[15], 'px；full 的 famH 增量中位数', fullDelta[15], 'px ⇒ 余量是否够:', slacks[15] >= fullDelta[15]);

console.log('\n=== mobile 390：行高影响 ===');
const m = all['390:name'], mf = all['390:full'], mm = all['390:name_mech'];
for (let i = 0; i < m.length; i++) {
  console.log(`  ${m[i].id} name=${String(m[i].rowH).padStart(6)} mech=${String(mm[i].rowH).padStart(6)} full=${String(mf[i].rowH).padStart(6)} Δfull=${(mf[i].rowH - m[i].rowH).toFixed(1).padStart(7)}`);
}
const sums = [m, mm, mf].map((g) => g.reduce((a, x) => a + x.rowH, 0));
console.log('\nmobile 30 卡总高: name=%d mech=%d full=%d  ⇒ +%d / +%d px', sums[0].toFixed(0), sums[1].toFixed(0), sums[2].toFixed(0), (sums[1] - sums[0]).toFixed(0), (sums[2] - sums[0]).toFixed(0));

console.log('\n=== 桌面 30 卡总高 ===');
const ds = [d, dm, df].map((g) => g.reduce((a, x) => a + x.rowH, 0));
console.log('name=%d mech=%d full=%d', ds[0].toFixed(0), ds[1].toFixed(0), ds[2].toFixed(0));
