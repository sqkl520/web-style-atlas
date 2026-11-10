// 任务 4 实测第二轮：真正会产生差别的几种口径。
// 第一轮发现：`家庭名` 首句最长只有 34 字，所以"把 slice 从 34 放宽到 60"是**空操作**
// （s60 与 cur 的行高、字宽逐案完全相同）。真正丢内容的是 `split('。')[0]` 那一刀。
// 所以这一轮比较：
//   cur   现状 = split('。')[0].split('：').pop().slice(0,34)
//   m60   全文截 60 字（不切句）
//   m80   全文截 80 字（不切句）
//   s2    首句 + 第二句（作者写"参考对象/参考三个真实对象…"的那一句）
import { resolve } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startServer } from '../65-audit/lab/serve.mjs';
import { readFileSync } from 'node:fs';

const load = (p) => JSON.parse(readFileSync(p, 'utf8').replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/, '').replace(/;\s*$/, ''));
const B = load('prototypes/_selection/data.js');
const famMap = Object.fromEntries(B.map((r) => [r.id, r.family || '']));

const apply = (arg) => {
  const { mode, map } = arg;
  for (const row of [...document.querySelectorAll('.row')]) {
    const id = row.getAttribute('data-id');
    const el = row.querySelector('.row-family');
    if (!el) continue;
    const full = map[id] || '';
    const head = full.split('。')[0].split('：').pop();
    const segs = full.split('。').filter((s) => s.trim());
    let t;
    if (mode === 'cur') t = head.slice(0, 34);
    else if (mode === 'm60') t = full.slice(0, 60);
    else if (mode === 'm80') t = full.slice(0, 80);
    else t = (segs[0] || '') + (segs.length > 1 ? '。' + segs[1] : '');
    el.textContent = t;
  }
  return true;
};

const probe = () => [...document.querySelectorAll('.row')].map((row) => {
  const main = row.querySelector('.row-main');
  const fam = row.querySelector('.row-family');
  const foot = row.querySelector('.row-foot');
  const rr = row.getBoundingClientRect();
  const cs = getComputedStyle(fam);
  return {
    id: row.getAttribute('data-id'),
    rowH: +rr.height.toFixed(1),
    mainH: +main.getBoundingClientRect().height.toFixed(1),
    famH: +fam.getBoundingClientRect().height.toFixed(1),
    famLines: Math.round(fam.getBoundingClientRect().height / (parseFloat(cs.lineHeight) || 1)),
    footH: foot ? +foot.getBoundingClientRect().height.toFixed(1) : 0,
    mainOverflowX: main.scrollWidth - main.clientWidth,
    rowOverflowX: rr.width ? row.scrollWidth - row.clientWidth : 0,
    text: fam.textContent,
    len: fam.textContent.length,
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
    for (const mode of ['cur', 'm60', 'm80', 's2']) {
      await page.eval(apply, { mode, map: famMap });
      await sleep(320);
      all[vp.l + ':' + mode] = await page.eval(probe);
    }
    await page.close();
  }
} finally { await browser.close(); await srv.close(); }

const st = (a) => ({ min: Math.min(...a), p50: a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)], max: Math.max(...a) });
console.log('mode   | 行高 min/p50/max           | 30 行总高 | 行高上涨案 | famH max | fam 行数 max | 列溢出 | 平均字数');
for (const vpl of ['1440', '390']) {
  console.log(`\n=== ${vpl} ===`);
  for (const mode of ['cur', 'm60', 'm80', 's2']) {
    const g = all[vpl + ':' + mode], c = all[vpl + ':cur'];
    const grows = g.filter((x, i) => x.rowH > c[i].rowH + 0.5).length;
    console.log(`${mode.padEnd(5)} | ${JSON.stringify(st(g.map((x) => x.rowH))).padEnd(28)} | ${String(g.reduce((a, x) => a + x.rowH, 0).toFixed(0)).padStart(6)} | ${String(grows).padStart(3)}/30 | ${String(Math.max(...g.map((x) => x.famH))).padStart(7)} | ${String(Math.max(...g.map((x) => x.famLines))).padStart(2)} | ${Math.max(...g.map((x) => x.mainOverflowX))} | ${(g.reduce((a, x) => a + x.len, 0) / 30).toFixed(1)}`);
  }
  const cur = all[vpl + ':cur'];
  console.log('  逐案 Δrow(m60-cur)：' + cur.map((x, i) => x.id + (all[vpl + ':m60'][i].rowH - x.rowH >= 0 ? '+' : '') + (all[vpl + ':m60'][i].rowH - x.rowH).toFixed(1)).join(' '));
  console.log('  逐案 Δrow(m80-cur)：' + cur.map((x, i) => x.id + (all[vpl + ':m80'][i].rowH - x.rowH >= 0 ? '+' : '') + (all[vpl + ':m80'][i].rowH - x.rowH).toFixed(1)).join(' '));
  console.log('  footH(cur) ' + JSON.stringify(st(cur.map((x) => x.footH))) + '  mainH(cur) ' + JSON.stringify(st(cur.map((x) => x.mainH))));
}
console.log('\n=== 样本：S15 各口径在行卡上显示什么 ===');
for (const mode of ['cur', 'm60', 'm80', 's2']) {
  const t = all['1440:' + mode].find((x) => x.id === 'S15');
  console.log(`  ${mode.padEnd(4)} (${t.len} 字) ${JSON.stringify(t.text)}`);
}
