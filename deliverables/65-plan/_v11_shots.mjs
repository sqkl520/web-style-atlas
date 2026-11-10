// 裁决 3 视觉取证：行卡 family 放开后是否撑坏布局
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startServer } from './_v_srv.mjs';
import { readFileSync } from 'node:fs';

const OUT = resolve('deliverables/65-plan/_v_out/shots');
mkdirSync(OUT, { recursive: true });
const srv = await startServer({ root: resolve('.') });
const browser = await Browser.launch();

const dataTxt = readFileSync(resolve('prototypes/_selection/data.js'), 'utf8');
const rowsData = JSON.parse(dataTxt.slice(dataTxt.indexOf('= ') + 2).replace(/;\s*$/, ''));
const families = {};
for (const r of rowsData) families[r.id] = r.family || '';

const setFam = (arg) => {
  const { mode, map } = arg;
  for (const row of [...document.querySelectorAll('.row')]) {
    const id = row.getAttribute('data-id');
    const fam = row.querySelector('.row-family');
    if (!fam) continue;
    const full = map[id] || '';
    const segs = full.split('。').filter((s) => s.trim());
    const name = (segs[0] || '').split('：').pop();
    const mech = segs.find((s, i) => i > 0 && /偷|拿的|不是/.test(s)) || '';
    fam.textContent = mode === 'full' ? full : (mode === 'name_mech' ? name + (mech ? '。' + mech : '') : name);
  }
  return true;
};

const shotRows = () => {
  // 只截前 4 行长卡，看清 family 换行
  const list = document.querySelector('#list') || document.querySelector('ol');
  const rows = [...document.querySelectorAll('.row')].slice(0, 4);
  if (!rows.length) return null;
  const first = rows[0].getBoundingClientRect();
  const last = rows[rows.length - 1].getBoundingClientRect();
  return { y: Math.round(first.top + window.scrollY), h: Math.round(last.bottom - first.top), x: 0, w: Math.round(first.width) };
};

try {
  for (const mode of ['name', 'name_mech', 'full']) {
    for (const vp of [{ l: '1440', w: 1440, h: 1000 }, { l: '390', w: 390, h: 844, m: true }]) {
      const page = await browser.newPage({ width: vp.w, height: vp.h, dsf: 1, mobile: !!vp.m });
      await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 1100 });
      await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
      await sleep(500);
      await page.eval(setFam, { mode, map: families });
      await sleep(400);
      await page.eval((y) => window.scrollTo(0, y), 0);
      await sleep(300);
      const clip = await page.eval(shotRows);
      await page.screenshot({ path: join(OUT, `rows-${vp.l}-${mode}.jpg`), quality: 82, clip: { x: clip.x, y: clip.y, width: clip.w, height: clip.h, scale: 1 } });
      console.log(`${vp.l} ${mode} → rows-${vp.l}-${mode}.jpg (h=${clip.h})`);
      await page.close();
    }
  }
} finally {
  await browser.close();
  await srv.close();
}
