// 展开态的代价：用户主动点开之后，面板会长多少？（任务 1 说"展开会增加 200–600px，可接受"）
// 这份只读 numbers，不改任何东西。
import { resolve } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startServer } from '../65-audit/lab/serve.mjs';

const load = (p) => JSON.parse(readFileSync(p, 'utf8').replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/, '').replace(/;\s*$/, ''));
const B = load('prototypes/_selection/data.js');
const IDS = B.map((r) => r.id);

const openCase = (id) => {
  const row = document.querySelector('.row[data-id="' + id + '"]');
  if (row) row.click();
  return true;
};
const h = () => document.getElementById('detail').scrollHeight;
const toggle = () => {
  const d = document.querySelector('#detail .field-fold details');
  d.querySelector('summary').click();
  return d.open;
};

const srv = await startServer(resolve('.'));
const browser = await Browser.launch();
const out = [];
try {
  for (const vp of [{ label: 'desktop', w: 1440, h: 900 }, { label: 'mobile', w: 390, h: 844, m: true }]) {
    const page = await browser.newPage({ width: vp.w, height: vp.h, dsf: 1, mobile: !!vp.m });
    await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 1200 });
    await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
    await sleep(400);
    for (const id of IDS) {
      await page.eval(openCase, id);
      await sleep(140);
      const closed = await page.eval(h);
      await page.eval(toggle);
      await sleep(140);
      const opened = await page.eval(h);
      const len = await page.eval(() => document.querySelector('#detail .field-fold .fold-body').textContent.length);
      await page.eval(toggle);
      out.push({ vp: vp.label, id, len, closed, opened, delta: opened - closed });
      await page.eval(() => { document.getElementById('d-close').click(); return true; });
      await sleep(50);
    }
    await page.close();
  }
} finally { await browser.close(); await srv.close(); }

writeFileSync('deliverables/65-exec/audit-expanded.json', JSON.stringify(out, null, 2));
for (const vp of ['desktop', 'mobile']) {
  const g = out.filter((x) => x.vp === vp);
  const ds = g.map((x) => x.delta);
  console.log(`\n[${vp}] 展开态增量：min ${Math.min(...ds)} / p50 ${ds.slice().sort((a, b) => a - b)[15]} / max ${Math.max(...ds)}`);
  console.log('  逐案（字数→Δpx）：' + g.map((x) => x.id + ' ' + x.len + '字/+' + x.delta).join(' | '));
}
