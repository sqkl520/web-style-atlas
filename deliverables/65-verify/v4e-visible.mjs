// V4e：用**完整可见文本**判括号配平（修正 v4d 只取末 30 字的采样缺陷）
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const nowPage = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const headPage = 'file:///' + join(HERE, 'tmp', 'sel-head', 'index.html').replace(/\\/g, '/');

const FN = () => [...document.querySelectorAll('.row')].map((el) => {
  const fam = el.querySelector('.row-family');
  if (!fam) return { id: el.getAttribute('data-id'), visText: '', total: 0 };
  const box = fam.getBoundingClientRect();
  const node = fam.firstChild;
  const text = fam.textContent;
  const r = document.createRange();
  let lo = 0, hi = text.length, best = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    r.setStart(node, 0); r.setEnd(node, Math.min(mid, node.length));
    const rects = [...r.getClientRects()];
    const ok = rects.length > 0 && rects.every((x) => x.bottom <= box.bottom + 1.5);
    if (ok) { best = mid; lo = mid + 1; } else { hi = mid - 1; }
  }
  return { id: el.getAttribute('data-id'), visText: text.slice(0, best), total: text.length,
    rowH: +el.getBoundingClientRect().height.toFixed(1) };
});

const bal = (t) => {
  const o = (s, a, b) => (t.split(a).length - 1) - (t.split(b).length - 1);
  return { 圆: o(t, '（', '）'), 角: o(t, '「', '」'), 方: o(t, '《', '》') };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const all = {};
for (const [tag, url] of [['NOW', nowPage], ['HEAD', headPage]]) {
  for (const [vp, w, h, m] of [['1440', 1440, 900, false], ['390', 390, 844, true]]) {
    const page = await browser.newPage({ width: w, height: h, dsf: 1, mobile: m });
    await page.goto(url, { settleMs: 1500 });
    const rows = await page.eval(FN);
    all[`${tag}-${vp}`] = rows;
    const bad = rows.filter((r) => Object.values(bal(r.visText)).some((v) => v !== 0));
    console.log(`\n=== ${tag} ${vp} ===  可见字总数 ${rows.reduce((a, r) => a + r.visText.length, 0)}`);
    console.log(`  可见文本括号不配平的案: ${bad.length}/30  ${bad.map((r) => `${r.id}${JSON.stringify(bal(r.visText))}`).join(' ')}`);
    const s13 = rows.find((r) => r.id === 'S13');
    console.log(`  S13 可见 ${s13.visText.length}/${s13.total} 行高 ${s13.rowH}`);
    console.log(`    「${s13.visText}」`);
  }
}
writeFileSync(join(HERE, 'v4e-visible.json'), JSON.stringify(all, null, 2), 'utf8');
await browser.close();
