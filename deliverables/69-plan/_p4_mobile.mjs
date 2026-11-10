// 探针 4：E 的真实数字。390 档选型台：docH、屏数、30 张卡的高度分布、首屏余量。
// 复用 tools/taste-skill 的零依赖 CDP。
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const M = () => {
  const rows = Array.from(document.querySelectorAll('.row'));
  const vh = window.innerHeight;
  const doc = document.documentElement;
  const body = document.body;
  const heights = rows.map((r) => +r.getBoundingClientRect().height.toFixed(1));
  const first = rows[0] ? rows[0].getBoundingClientRect() : null;
  const second = rows[1] ? rows[1].getBoundingClientRect() : null;
  const mast = document.querySelector('.mast, header');
  return {
    vh,
    docH: doc.scrollHeight,
    bodyH: body.scrollHeight,
    screens: +(doc.scrollHeight / vh).toFixed(2),
    rowCount: rows.length,
    rowHeights: heights,
    rowHMin: Math.min(...heights), rowHMax: Math.max(...heights),
    rowHMean: +(heights.reduce((a, b) => a + b, 0) / heights.length).toFixed(1),
    firstRowTop: first ? +first.top.toFixed(1) : null,
    firstRowBottom: first ? +first.bottom.toFixed(1) : null,
    firstRowSlack: first ? +(vh - first.bottom).toFixed(1) : null,
    secondRowTop: second ? +second.top.toFixed(1) : null,
    secondRowVisible: second ? +Math.max(0, Math.min(vh, second.bottom) - Math.max(0, second.top)).toFixed(1) : null,
    mastH: mast ? +mast.getBoundingClientRect().height.toFixed(1) : null,
    hOverflow: doc.scrollWidth - window.innerWidth,
    cardTextChars: rows.slice(0, 3).map((r) => (r.textContent || '').replace(/\s+/g, '').length),
  };
};

const br = await Browser.launch({ width: 390, height: 844 });
const out = { at: new Date().toISOString(), url: PAGE, tiers: {} };
for (const [name, w, h] of [['390', 390, 844], ['414', 414, 896], ['768', 768, 1024], ['1440', 1440, 900]]) {
  const p = await br.newPage({ width: w, height: h, dsf: 1, mobile: w < 600 });
  await p.goto(PAGE, { settleMs: 2500 });
  await p.eval('document.fonts.ready.then(()=>1)');
  await sleep(400);
  const m = await p.eval(M);
  out.tiers[name] = m;
  console.log(`=== ${name} (${w}x${h}) ===`);
  console.log(`  docH ${m.docH}px / vh ${m.vh} = ${m.screens} 屏   (Lead 说的 19.4 屏 → 应 ${(19.4 * m.vh).toFixed(0)}px)`);
  console.log(`  30 张卡：min ${m.rowHMin} / mean ${m.rowHMean} / max ${m.rowHMax}`);
  console.log(`  首屏：mastH ${m.mastH}  第一卡 ${m.firstRowTop}→${m.firstRowBottom}  余量 ${m.firstRowSlack}px  第二卡可见 ${m.secondRowVisible}px`);
  console.log(`  横向溢出 ${m.hOverflow}px   前 3 卡文本字数 ${m.cardTextChars.join('/')}`);
  await p.close();
}
await br.close();
writeFileSync(join(HERE, 'p1-mobile.json'), JSON.stringify(out, null, 1), 'utf8');
console.log('\nwrote p1-mobile.json');
