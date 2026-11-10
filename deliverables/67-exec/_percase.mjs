// _percase.mjs — 逐案矩阵：把排序切到每一种，看首屏第一张卡到底完整不完整
// 这决定「1 张完整卡」是只在默认排序成立，还是任意排序都成立。
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const SRC = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const M = () => {
  const rows = [...document.querySelectorAll('.row')];
  const vh = innerHeight;
  const boxes = rows.map((el) => { const b = el.getBoundingClientRect(); return { id: el.getAttribute('data-id'), top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), h: +b.height.toFixed(1) }; });
  return { firstId: boxes[0]?.id, firstTop: boxes[0]?.top, firstH: boxes[0]?.h,
    complete: boxes.filter((b) => b.top >= -0.5 && b.bottom <= vh + 0.5).length,
    slack: boxes[0] ? +(vh - (boxes[0].top + boxes[0].h)).toFixed(1) : null,
    tallest: Math.max(...boxes.map((b) => b.h)) };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const p = await browser.newPage({ width: 390, height: 844, dsf: 2, mobile: true, reducedMotion: true });
await p.goto(SRC, { settleMs: 1700 });

console.log('=== 五种排序下，首屏第一张卡 ===');
for (const s of ['n', 'fr', 'thr', 'gate', 'built']) {
  const m = await p.eval((sort) => {
    const sel = document.getElementById('sort');
    sel.value = sort;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    const rows = [...document.querySelectorAll('.row')];
    const vh = innerHeight;
    const boxes = rows.map((el) => { const b = el.getBoundingClientRect(); return { id: el.getAttribute('data-id'), top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), h: +b.height.toFixed(1) }; });
    return { firstId: boxes[0]?.id, firstTop: boxes[0]?.top, firstH: boxes[0]?.h,
      complete: boxes.filter((b) => b.top >= -0.5 && b.bottom <= vh + 0.5).length,
      slack: boxes[0] ? +(vh - (boxes[0].top + boxes[0].h)).toFixed(1) : null };
  }, s);
  console.log(`  排序=${s.padEnd(5)} 首卡=${m.firstId} top=${m.firstTop} 高=${m.firstH} 完整=${m.complete} 余=${m.slack} ${m.complete >= 1 ? '✓' : '✗'}`);
}

// 复位后逐案：把每个案滚到首行位置，量它自己的高度与首屏余量
console.log('\n=== 30 案各自作首卡时的高度与首屏余量（首卡 top 固定 412.4）===');
const per = await p.eval(() => {
  const sel = document.getElementById('sort'); sel.value = 'n'; sel.dispatchEvent(new Event('change', { bubbles: true }));
  const rows = [...document.querySelectorAll('.row')];
  const firstTop = rows[0].getBoundingClientRect().top;
  const vh = innerHeight;
  return rows.map((el) => { const b = el.getBoundingClientRect(); return { id: el.getAttribute('data-id'), h: +b.height.toFixed(1), fits: b.height <= vh - firstTop + 0.5 }; });
});
const ok = per.filter((x) => x.fits).length;
for (const x of per) console.log(`  ${x.id} h=${String(x.h).padStart(6)} ${x.fits ? '✓ 能完整进首屏' : '✗ 差 ' + (x.h - (844 - 412.4)).toFixed(1) + 'px'}`);
console.log(`\n  30 案里能当首卡完整露出的：${ok} / 30`);
console.log(`  卡高 min=${Math.min(...per.map(x => x.h))} max=${Math.max(...per.map(x => x.h))}`);
await p.close();
await browser.close();
