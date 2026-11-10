// Measures every lab variant at 1440×900 and 390×844 against the same probe as the baseline.
// Read-only: the variants are injected by serve-lab.mjs, prototypes/ is never written.
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { Browser, sleep } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startLabServer } from './serve-lab.mjs';
import { probePanel, probeVariantExtra } from './probe-panel.mjs';

const OUT = resolve('deliverables/65-audit');
const LAB = join(OUT, 'lab');
const SHOTS = join(OUT, 'shots');
mkdirSync(LAB, { recursive: true });
mkdirSync(SHOTS, { recursive: true });

// variant id → what it is (used in the report and in file names)
const VARIANTS = [
  { id: 'base', name: '现状（无覆盖）' },
  { id: 'jia', name: '甲 字段分组+折叠（5 组，2 展开）' },
  { id: 'yi', name: '乙 顶部字段跳转条（全展开）' },
  { id: 'bing', name: '丙 摘要卡+核心3段+其余折叠' },
  { id: 'ding', name: '丁 双 tab：看设计/看实现' },
  { id: 'wu', name: '戊 结论卡+核心3段+任务分组折叠' },
  { id: 'ji', name: '己 只折预览器（字段全平铺）' },
  { id: 'geng', name: '庚 折预览器+字段5组折叠' },
  { id: 'xin', name: '辛 推荐：前导收缩+结论卡+3段展开+3组折叠' },
  { id: 'ren', name: '壬 最终推荐：单行结论+3段展开+3组折叠+前导压到一条' },
];

const CASES = [
  { label: 'desktop', w: 1440, h: 900, mobile: false, scheme: 'S15' },
  { label: 'desktop', w: 1440, h: 900, mobile: false, scheme: 'S08' },
  { label: 'mobile', w: 390, h: 844, mobile: true, scheme: 'S15' },
];

const srv = await startLabServer({
  root: resolve('.'),
  labDir: join(LAB, 'variants'),
  overrides: [{ prefix: '/prototypes/_selection/', dir: join(LAB, 'snapshot') }],
});
const browser = await Browser.launch();
const out = { at: new Date().toISOString(), variants: VARIANTS, runs: [] };

try {
  for (const v of VARIANTS) {
    for (const c of CASES) {
      const page = await browser.newPage({ width: c.w, height: c.h, dsf: 1, mobile: c.mobile });
      const qs = v.id === 'base' ? '' : '?lab=' + v.id;
      await page.goto(srv.origin + '/prototypes/_selection/index.html' + qs, { settleMs: 900 });
      await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
      await sleep(400);
      await page.eval((sid) => {
        const row = document.querySelector('.row[data-id="' + sid + '"]');
        if (row) row.click();
      }, c.scheme);
      await sleep(800);
      await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
      await page.eval('document.getElementById("detail").scrollTop = 0');
      await sleep(250);

      const m = await page.eval(probePanel);
      const extra = await page.eval(probeVariantExtra);
      const rec = {
        variant: v.id, name: v.name, label: c.label, w: c.w, h: c.h, scheme: c.scheme,
        ...m, variantExtra: extra,
      };

      const clip = c.label === 'desktop'
        ? { x: c.w - m.panel.rect.w, y: 0, width: Math.round(m.panel.rect.w), height: c.h, scale: 1 }
        : { x: 0, y: 0, width: c.w, height: c.h, scale: 1 };

      const stops = [0];
      const stepPx = Math.round(m.panel.clientH - m.panel.headH);
      for (let s = stepPx; s < m.scroll.maxScroll; s += stepPx) stops.push(s);
      stops.push(m.scroll.maxScroll);
      const shots = [];
      for (let k = 0; k < stops.length; k++) {
        await page.eval((t) => { const d = document.getElementById('detail'); d.scrollTop = t; return d.scrollTop; }, stops[k]);
        await sleep(180);
        const f = join(SHOTS, `${c.label}-${c.w}-${v.id}-${c.scheme}-s${k}.jpg`);
        await page.screenshot({ path: f, quality: 80, clip });
        shots.push({ file: f.replace(/\\/g, '/').replace(resolve('.').replace(/\\/g, '/') + '/', ''), scrollTop: stops[k] });
      }
      rec.shots = shots;
      out.runs.push(rec);
      console.log(`${v.id.padEnd(5)} ${c.label.padEnd(7)} ${c.scheme}  contentH=${String(m.panel.contentH).padStart(5)}  screens=${m.scroll.screens}  fieldsVisible@first=${m.fields.filter(f => f.visibility !== 'none').length}  collapsed=${extra.collapsedCount}`);
      await page.close();
    }
  }
} finally {
  await browser.close();
  await srv.close();
}

writeFileSync(join(LAB, 'variants.json'), JSON.stringify(out, null, 2));
console.log('\nwrote lab/variants.json');
