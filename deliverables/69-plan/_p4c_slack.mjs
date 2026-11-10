// 探针 4c：把"首屏余量"的两种口径都算出来，解释 Lead 的 9.2px 与我量的 52.3px 差在哪。
// 口径 A：vh − 第一卡 border-box bottom（=52.3）
// 口径 B：vh − (第一卡 bottom + margin-bottom)（若 .row 有 43px 外边距 → 9.x）
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
  const r0 = rows[0], r1 = rows[1];
  const cs0 = getComputedStyle(r0);
  const b0 = r0.getBoundingClientRect();
  const b1 = r1.getBoundingClientRect();
  // 首屏内"完整可见"的卡片数：bottom <= vh 的
  const full = rows.filter((r) => r.getBoundingClientRect().bottom <= vh).length;
  return {
    vh,
    rowHeights: rows.map((r) => +r.getBoundingClientRect().height.toFixed(1)),
    marginBottom: cs0.marginBottom, marginTop: cs0.marginTop, padding: cs0.padding, gap: cs0.rowGap,
    card0: { top: +b0.top.toFixed(1), bottom: +b0.bottom.toFixed(1), h: +b0.height.toFixed(1) },
    card1: { top: +b1.top.toFixed(1), bottom: +b1.bottom.toFixed(1) },
    slackA_boxOnly: +(vh - b0.bottom).toFixed(1),
    slackB_withMargin: +(vh - b0.bottom - parseFloat(cs0.marginBottom)).toFixed(1),
    fullCardsInFold: full,
    docH: document.documentElement.scrollHeight,
    screens: +(document.documentElement.scrollHeight / vh).toFixed(2),
    // 卡片内部构成，看压缩空间在哪
    cardParts: (() => {
      const out = {};
      for (const sel of ['.row-head', '.row-meta', '.row-foot', '.swatches', '.shot', '.gate', 'h3', 'p']) {
        const el = r0.querySelector(sel); if (!el) continue;
        const r = el.getBoundingClientRect(); out[sel] = +r.height.toFixed(1);
      }
      return out;
    })(),
  };
};

const br = await Browser.launch({ width: 390, height: 844 });
const p = await br.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
await p.goto(PAGE, { settleMs: 2500 });
await p.eval('document.fonts.ready.then(()=>1)');
await sleep(400);
const m = await p.eval(M);
console.log(JSON.stringify(m, null, 1));
writeFileSync(join(HERE, 'p1c-slack.json'), JSON.stringify(m, null, 1), 'utf8');
await p.close(); await br.close();
