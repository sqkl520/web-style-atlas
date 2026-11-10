// P5：行卡 clamp 的可见文本（1440 + 390），含「有没有省略号」与括号配平判据
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HERE, ROOT } from './_lib.mjs';

const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const b = await Browser.launch({ width: 1440, height: 900 });

const fn = () => {
  const rows = [];
  for (const row of document.querySelectorAll('#ledger [data-id]')) {
    const id = row.getAttribute('data-id');
    const fam = row.querySelector('.row-family');
    if (!fam) { rows.push({ id, missing: true }); continue; }
    const node = fam.firstChild;
    const box = fam.getBoundingClientRect();
    const cs = getComputedStyle(fam);
    let shown = fam.textContent || '', cut = false;
    if (node && node.nodeType === 3) {
      const r = document.createRange();
      let last = -1;
      for (let i = 0; i < node.length; i++) {
        r.setStart(node, i); r.setEnd(node, i + 1);
        const bb = r.getBoundingClientRect();
        if (bb.height === 0) continue;
        if (bb.bottom <= box.bottom + 1.5) last = i; else { cut = true; break; }
      }
      shown = node.textContent.slice(0, last + 1);
    }
    const pairs = [['（', '）'], ['(', ')'], ['「', '」'], ['【', '】'], ['《', '》'], ['“', '”'], ['〈', '〉']];
    const imb = pairs.map(([a, z]) => ({
      pair: a + z,
      open: (shown.match(new RegExp('\\' + a, 'g')) || []).length,
      close: (shown.match(new RegExp('\\' + z, 'g')) || []).length,
    })).filter((x) => x.open !== x.close);
    rows.push({
      id, total: (fam.textContent || '').length, shown: shown.length, cut,
      clamp: cs.webkitLineClamp, textOverflow: cs.textOverflow, boxH: Math.round(box.height),
      lh: cs.lineHeight, shownText: shown, tail: shown.slice(-24), imbalance: imb,
      ellipsisInText: /…|\.\.\./.test(shown),
    });
  }
  return rows;
};

const out = {};
for (const [w, h, mob] of [[1440, 900, false], [390, 844, true], [768, 1024, false]]) {
  const p = await b.newPage({ width: w, height: h, dsf: 1, mobile: mob });
  await p.goto(PAGE, { settleMs: 1800 });
  const rows = await p.eval(fn);
  out[w] = rows;
  const cut = rows.filter((r) => r.cut);
  const imb = rows.filter((r) => (r.imbalance || []).length);
  console.log(`\n=== ${w}px ===  行数 ${rows.length}；被截断 ${cut.length}；可见括号不配平 ${imb.length}；可见文本含省略号 ${rows.filter((r) => r.ellipsisInText).length}`);
  console.log('  text-overflow: ' + [...new Set(rows.map((r) => r.textOverflow))].join(',') + ' / clamp: ' + [...new Set(rows.map((r) => r.clamp))].join(','));
  for (const r of imb) console.log(`  ✗ ${r.id} ${JSON.stringify(r.imbalance)} …${r.tail}`);
  if (w === 390) {
    // 截一张行卡 region 图，用来看「有没有省略号」
    const box = await p.eval(() => {
      const rows = [...document.querySelectorAll('#ledger [data-id]')];
      const t = rows.find((r) => r.getAttribute('data-id') === 'S07') || rows[0];
      const fam = t.querySelector('.row-family');
      const r = fam.getBoundingClientRect();
      return { x: Math.round(r.left), y: Math.round(r.top + window.scrollY), w: Math.round(r.width), h: Math.round(r.height), id: t.getAttribute('data-id') };
    });
    console.log('  截图区域', JSON.stringify(box));
    await p.screenshot({ path: join(HERE, `clamp-${w}-${box.id}.png`), format: 'png', clip: { x: box.x, y: box.y - (await p.eval(() => window.scrollY)), width: box.w, height: box.h + 8 } });
  }
  await p.close();
}
writeFileSync(join(HERE, 'p5-clamp.json'), JSON.stringify(out, null, 1), 'utf8');
await b.close();
