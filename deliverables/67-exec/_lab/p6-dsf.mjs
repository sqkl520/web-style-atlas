// p6-dsf.mjs — 为什么 S01 在 dsf2 下量到 2405、dsf1 下量到 2280？（2026-10-28）
// 两次都是"刚打开就量"，唯一差别是 deviceScaleFactor。.field-long 的 summary 用的是
// 13px/1.6 的 flex 行，怀疑是字体（--num=Archivo）在 dsf 下换行不同。
import { Browser } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { PAGE, openCase, sleep } from './lib.mjs';

const B = () => {
  const d = document.getElementById('detail');
  const dTop = d.getBoundingClientRect().top;
  const rows = [...document.querySelectorAll('#d-body .field-long > details > summary')].map((s) => {
    const r = s.getBoundingClientRect();
    const rg = document.createRange(); rg.selectNodeContents(s);
    const tops = {}; for (const x of rg.getClientRects()) if (x.height > 1) tops[Math.round(x.top)] = 1;
    const kids = [...s.children].map((c) => { const b = c.getBoundingClientRect(); return { cls: c.className, w: +b.width.toFixed(1), h: +b.height.toFixed(1), top: +(b.top - r.top).toFixed(1) }; });
    return { h: +r.height.toFixed(1), lines: Object.keys(tops).length, kids };
  });
  return { scrollH: d.scrollHeight, detailsH: [...document.querySelectorAll('#d-body .field-long')].map((f) => +f.getBoundingClientRect().height.toFixed(1)), rows };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const shots = {};
for (const dsf of [1, 2]) {
  const p = await browser.newPage({ width: 390, height: 844, dsf, mobile: true });
  await p.setViewport({ width: 390, height: 844, dsf, mobile: true });
  await p.goto(PAGE, { settleMs: 1800 });
  await openCase(p, 'S01');
  await sleep(200);
  const m = await p.eval(B);
  console.log(`dsf=${dsf} scrollH=${m.scrollH} 长字段块高=${JSON.stringify(m.detailsH)}`);
  for (const r of m.rows) console.log(`   sum h=${r.h} lines=${r.lines} ${JSON.stringify(r.kids)}`);
  // 再等一会儿，看是不是字体加载时序
  await sleep(900);
  const m2 = await p.eval(B);
  console.log(`  +900ms scrollH=${m2.scrollH} sumH=${JSON.stringify(m2.rows.map((r) => r.h))}`);
  await p.close();
}
await browser.close();
