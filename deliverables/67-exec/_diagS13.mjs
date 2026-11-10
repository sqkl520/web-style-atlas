// _diagS13.mjs — S13（454px，最矮要求差 22.4）与 S20（434.5）的卡内构成
// 找出它们比 S01 多花的钱在哪，判断能否在不删内容的前提下补上 43.5px
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const SRC = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const browser = await Browser.launch({ width: 1440, height: 900 });
const p = await browser.newPage({ width: 390, height: 844, dsf: 2, mobile: true, reducedMotion: true });
await p.goto(SRC, { settleMs: 1700 });

const r = await p.eval(() => {
  const pick = ['S01', 'S13', 'S20'];
  const out = {};
  for (const id of pick) {
    const row = document.querySelector(`.row[data-id="${id}"]`);
    const g = (s) => { const e = row.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return +b.height.toFixed(1); };
    const pLike = (s) => { const e = row.querySelector(s); if (!e) return null; return { chars: e.textContent.replace(/\s+/g, '').length, h: +e.getBoundingClientRect().height.toFixed(1), lines: Math.round(e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight)) }; };
    out[id] = { rowH: +row.getBoundingClientRect().height.toFixed(1), head: g('.row-head'), headLines: Math.round(g('.row-head') / 20),
      def: pLike('.row-def'), family: pLike('.row-family'), meta: g('.row-meta'),
      shots: g('.shots'), img: g('.shots .shot:first-child img'), cap: g('.shots figcaption'),
      foot: pLike('.row-foot'), tags: row.querySelectorAll('.row-head .tag').length,
      warn: (row.querySelector('.row-foot')?.textContent.match(/WARN：[^·]*/) || [''])[0].slice(0, 60) };
  }
  return out;
});
for (const [id, v] of Object.entries(r)) {
  console.log(`\n${id}  rowH=${v.rowH}  (可容纳 ${844 - 412.4})`);
  console.log(`   head=${v.head} (${v.tags} 个标签)   def=${v.def.h}(${v.def.lines}行)   family=${v.family.h}(${v.family.lines}行,${v.family.chars}字)`);
  console.log(`   meta=${v.meta}  shots=${v.shots} img=${v.img} cap=${v.cap}  foot=${v.foot.h}(${v.foot.lines}行,${v.foot.chars}字)`);
  console.log(`   ${v.warn}`);
}
await p.close();
await browser.close();
