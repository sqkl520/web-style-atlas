// m19-links.mjs — 页头模板链接（20px 高）与场景芯片的 WCAG 2.2 2.5.8 判定
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = {};
for (const vp of [{ k: '390', w: 390, h: 844, m: true }, { k: '1440', w: 1440, h: 900, m: false }]) {
  const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: 2, mobile: vp.m });
  await p.goto(PAGE, { settleMs: 1600 });
  out[vp.k] = await p.eval(() => {
    const all = Array.from(document.querySelectorAll('a[href], button, input, select, summary')).filter((e) => {
      const b = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      return b.height > 0 && cs.display !== 'none' && b.right > 0 && b.left < window.innerWidth;
    });
    const test = (el) => {
      const rc = el.getBoundingClientRect();
      const cx = rc.left + rc.width / 2, cy = rc.top + rc.height / 2;
      // 24px 圆：半径 12
      let hit = null;
      all.forEach((o) => {
        if (o === el || hit) return;
        const ob = o.getBoundingClientRect();
        // 圆与矩形相交
        const nx = Math.max(ob.left, Math.min(cx, ob.right));
        const ny = Math.max(ob.top, Math.min(cy, ob.bottom));
        if (Math.hypot(nx - cx, ny - cy) < 12) hit = (o.textContent || o.placeholder || '').replace(/\s+/g, ' ').trim().slice(0, 20);
      });
      return hit;
    };
    const small = all.map((e) => {
      const b = e.getBoundingClientRect();
      return { text: (e.textContent || e.placeholder || '').replace(/\s+/g, ' ').trim().slice(0, 22), tag: e.tagName.toLowerCase(), w: +b.width.toFixed(1), h: +b.height.toFixed(1), near: null };
    }).filter((x) => x.h < 24 || x.w < 24);
    // 重新用 DOM 顺序对 small 补 near
    const smallEls = all.filter((e) => { const b = e.getBoundingClientRect(); return b.height < 24 || b.width < 24; });
    small.forEach((s, i) => { s.near = test(smallEls[i]); });
    return { smallCount: small.length, small, passBySpacing: small.filter((s) => !s.near).length, fail: small.filter((s) => s.near) };
  });
  console.log(`\n[${vp.k}] <24px 目标 ${out[vp.k].smallCount} 个；靠间距例外通过 ${out[vp.k].passBySpacing}；真失败 ${out[vp.k].fail.length}`);
  out[vp.k].small.forEach((s) => console.log(`  ${s.tag.padEnd(7)} h=${String(s.h).padStart(5)} w=${String(s.w).padStart(5)} "${s.text}" 近邻=${s.near || '—'}`));
  await p.close();
}
writeFileSync(join(HERE, 'data-m19-links.json'), JSON.stringify(out, null, 1));
await browser.close();
