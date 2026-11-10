// p-chars.mjs — 核对「字数」口径：dd 文本 vs 全部字段文本 vs 渲染后可见文本
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const browser = await Browser.launch({ width: 1440, height: 900 });
const p = await browser.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
await p.goto(PAGE, { settleMs: 1400 });
await p.eval(() => { document.querySelector('.row[data-id="S01"]').click(); });
await new Promise((r) => setTimeout(r, 300));

const r = await p.eval(() => {
  const dl = document.querySelector('#d-body .fields');
  const strip = (s) => (s || '').replace(/\s+/g, '').length;
  const dds = Array.from(dl.querySelectorAll('dd'));
  const foldBodies = Array.from(dl.querySelectorAll('.fold-body'));
  const children = Array.from(dl.children);
  return {
    childCount: children.length,
    childTags: children.map((c) => ({
      cls: c.className,
      hasDt: !!c.querySelector('dt'), hasDd: !!c.querySelector('dd'),
      hasFoldBody: !!c.querySelector('.fold-body'),
      hasSummary: !!c.querySelector('summary'),
      textLen: strip(c.textContent),
      ddLen: Array.from(c.querySelectorAll('dd')).reduce((s, e) => s + strip(e.textContent), 0),
      fbLen: Array.from(c.querySelectorAll('.fold-body')).reduce((s, e) => s + strip(e.textContent), 0),
      sumLen: Array.from(c.querySelectorAll('summary')).reduce((s, e) => s + strip(e.textContent), 0),
      dtLen: Array.from(c.querySelectorAll('dt')).reduce((s, e) => s + strip(e.textContent), 0),
    })),
    totalDd: dds.reduce((s, e) => s + strip(e.textContent), 0),
    totalFb: foldBodies.reduce((s, e) => s + strip(e.textContent), 0),
    totalAll: strip(dl.textContent),
  };
});
console.log(JSON.stringify(r, null, 1));
await p.close();
await browser.close();
