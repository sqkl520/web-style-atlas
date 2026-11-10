/* 暂存条在各档视口的位置（66-exec，2026-10-27）。
 * 为什么单独量：390 档的 DOM 顺序是 rail 在前、主区在后，暂存条挂在 .bar 里 ——
 * 也就是"用户点完芯片，条子可能在首屏之外"。那它就是一条用户看不见的凭据，
 * 等于回到"字被静默吃掉"。判据：**点完芯片后**，条子的 top 必须落在视口内，
 * 或者至少与 #count（用户必然会看的那个数）同屏。
 *
 * 跑：node deliverables/66-exec/_parked-pos.mjs
 */
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = 'D:/Web/style';
const PAGE = 'file:///' + ROOT + '/prototypes/_selection/index.html';
const out = { vps: [], fails: [] };
const fail = (m) => { out.fails.push(m); console.log('  ✗ ' + m); };

const b = await Browser.launch({ width: 1440, height: 900 });
try {
  for (const vp of [{ w: 1440, h: 900 }, { w: 768, h: 1024 }, { w: 390, h: 844 }]) {
    const page = await b.newPage({ width: vp.w, height: vp.h, mobile: vp.w < 500 });
    await page.goto(PAGE);
    await sleep(800);
    const r = await page.eval(() => {
      document.getElementById('reset').click();
      const q = document.getElementById('q');
      q.value = '咖啡店';
      q.dispatchEvent(new Event('input', { bubbles: true }));
      for (const b2 of document.querySelectorAll('#flt-scene button[data-scene]')) {
        if (b2.getAttribute('data-scene') === '咖啡店') { b2.click(); break; }
      }
      const rect = (sel) => {
        const e = document.querySelector(sel);
        if (!e) return null;
        const b3 = e.getBoundingClientRect();
        return { top: Math.round(b3.top), bottom: Math.round(b3.bottom), h: Math.round(b3.height), visible: b3.top >= 0 && b3.top < window.innerHeight };
      };
      const bar = document.querySelector('.bar');
      return {
        vw: window.innerWidth, vh: window.innerHeight,
        scrollY: Math.round(window.scrollY),
        parked: rect('#q-parked'),
        count: rect('#count'),
        bar: rect('.bar'),
        rail: rect('.rail'),
        firstRow: rect('#ledger .row'),
        rows: document.querySelectorAll('#ledger .row').length,
        parkedH: Math.round(bar.getBoundingClientRect().height),
        emptyShown: !document.getElementById('empty').hidden,
      };
    });
    out.vps.push({ vp: vp.w + 'x' + vp.h, ...r });
    console.log(`${vp.w}x${vp.h}  rows=${r.rows}  暂存条 top=${r.parked.top} bottom=${r.parked.bottom} 首屏可见=${r.parked.visible}`);
    console.log(`          #count top=${r.count.top} 可见=${r.count.visible} | rail bottom=${r.rail.bottom} | 首行 top=${r.firstRow ? r.firstRow.top : '—'}`);
    if (r.rows !== 4) fail(vp.w + ' 点咖啡店后应为 4 行，实际 ' + r.rows);
    if (!r.parked.visible) fail(vp.w + ' 档：点完芯片后暂存条在首屏外（top=' + r.parked.top + '，视口高 ' + r.vh + '）—— 用户看不到"字还在"');
    /* #count 不在首屏是既有缺陷（390 档页头 489 + rail 338 把主区推到 989 以下，
       见 LEAD-recon F4），不在本轮改动范围内 —— 这里只记录，不断言。 */
    if (!r.count.visible) console.log('         ~（已知，不在本轮范围）#count 在首屏外：' + r.count.top);
    await page.close();
  }
} finally {
  await b.close();
}
writeFileSync(join(HERE, '_parked-pos.json'), JSON.stringify(out, null, 1), 'utf8');
console.log('\n' + (out.fails.length ? '失败 ' + out.fails.length + ' 项' : '全部通过'));
process.exit(out.fails.length ? 1 : 0);
