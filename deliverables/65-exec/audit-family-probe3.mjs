// 任务 4 实测第三轮：候选形态（行内两行截断 / 独占一行两行截断 / 独占一行一行截断）。
// 判据：1440 与 390 两档下 30 行的行高代价、是否横向溢出、是否把 swatches/错误码/cap 挤掉。
import { resolve } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startServer } from '../65-audit/lab/serve.mjs';
import { readFileSync } from 'node:fs';

const load = (p) => JSON.parse(readFileSync(p, 'utf8').replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/, '').replace(/;\s*$/, ''));
const B = load('prototypes/_selection/data.js');
const famMap = Object.fromEntries(B.map((r) => [r.id, r.family || '']));

const apply = (arg) => {
  const { mode, map } = arg;
  let st = document.getElementById('__probe_style');
  if (!st) { st = document.createElement('style'); st.id = '__probe_style'; document.head.appendChild(st); }
  const base = '.row-family{color:var(--ink-2);}';
  const v1 = '.row-family{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-width:0;max-width:100%;}';
  const v2 = '.row-family{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;flex:1 1 100%;min-width:0;}';
  const v3 = '.row-family{display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden;flex:1 1 100%;min-width:0;}';
  st.textContent = base + (mode === 'base' ? '' : mode === 'v1' ? v1 : mode === 'v2' ? v2 : v3);
  for (const row of [...document.querySelectorAll('.row')]) {
    const id = row.getAttribute('data-id');
    const el = row.querySelector('.row-family');
    if (!el) continue;
    el.textContent = mode === 'base'
      ? (map[id] || '').split('。')[0].split('：').pop().slice(0, 34)
      : (map[id] || '');
  }
  return true;
};

const probe = () => [...document.querySelectorAll('.row')].map((row) => {
  const main = row.querySelector('.row-main');
  const fam = row.querySelector('.row-family');
  const meta = row.querySelector('.row-meta');
  const sw = row.querySelector('.swatches');
  const cap = row.querySelector('.cap');
  const rr = row.getBoundingClientRect();
  const cs = getComputedStyle(fam);
  const lh = parseFloat(cs.lineHeight) || 1;
  return {
    id: row.getAttribute('data-id'),
    rowH: +rr.height.toFixed(1),
    famH: +fam.getBoundingClientRect().height.toFixed(1),
    famLines: Math.round(fam.getBoundingClientRect().height / lh),
    metaH: +meta.getBoundingClientRect().height.toFixed(1),
    metaLines: Math.round(meta.getBoundingClientRect().height / lh),
    famW: +fam.getBoundingClientRect().width.toFixed(1),
    metaW: +meta.getBoundingClientRect().width.toFixed(1),
    swVisible: sw ? sw.getBoundingClientRect().width > 0 : null,
    capVisible: cap ? cap.getBoundingClientRect().width > 0 : null,
    mainOverflowX: main.scrollWidth - main.clientWidth,
    // 截断是否生效（element.scrollHeight > clientHeight ⇒ 有内容被藏）
    clamped: fam.scrollHeight > fam.clientHeight + 1,
    visibleText: fam.textContent,
  };
});

const srv = await startServer(resolve('.'));
const browser = await Browser.launch();
const all = {};
try {
  for (const vp of [{ l: '1440', w: 1440, h: 900 }, { l: '390', w: 390, h: 844, m: true }]) {
    const page = await browser.newPage({ width: vp.w, height: vp.h, dsf: 1, mobile: !!vp.m });
    await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 1300 });
    await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
    await sleep(500);
    for (const mode of ['base', 'v1', 'v2', 'v3']) {
      await page.eval(apply, { mode, map: famMap });
      await sleep(360);
      all[vp.l + ':' + mode] = await page.eval(probe);
    }
    await page.close();
  }
} finally { await browser.close(); await srv.close(); }

const st = (a) => ({ min: Math.min(...a), p50: a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)], max: Math.max(...a) });
for (const vpl of ['1440', '390']) {
  console.log(`\n=== ${vpl} ===`);
  const base = all[vpl + ':base'];
  for (const mode of ['base', 'v1', 'v2', 'v3']) {
    const g = all[vpl + ':' + mode];
    const grows = g.filter((x, i) => x.rowH > base[i].rowH + 0.5).length;
    const sum = g.reduce((a, x) => a + x.rowH, 0);
    console.log(`  ${mode.padEnd(4)} 行高 ${JSON.stringify(st(g.map((x) => x.rowH))).padEnd(30)} 总高 ${String(sum.toFixed(0)).padStart(6)} 上涨 ${String(grows).padStart(2)}/30  famH max ${String(Math.max(...g.map((x) => x.famH))).padStart(6)} fam行 max ${Math.max(...g.map((x) => x.famLines))} meta行 max ${Math.max(...g.map((x) => x.metaLines))} 溢出 ${Math.max(...g.map((x) => x.mainOverflowX))} sw缺 ${g.filter((x) => x.swVisible === false).length} cap缺 ${g.filter((x) => x.capVisible === false).length} 被截 ${g.filter((x) => x.clamped).length}/30`);
  }
  console.log('  逐案 Δrow(v2-base)：' + base.map((x, i) => x.id + (all[vpl + ':v2'][i].rowH - x.rowH >= 0 ? '+' : '') + (all[vpl + ':v2'][i].rowH - x.rowH).toFixed(1)).join(' '));
}
console.log('\n=== 1440 下 v2 每案 fam 显示行数 ===');
console.log(all['1440:v2'].map((x) => x.id + ':' + x.famLines + '行/' + x.famW.toFixed(0) + 'w').join(' '));
console.log('\n=== 390 下 v2 每案 fam 显示行数 ===');
console.log(all['390:v2'].map((x) => x.id + ':' + x.famLines + '行').join(' '));
