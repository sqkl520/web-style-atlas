// _combo390.mjs — 在改后源码上做内容全保留的组合搜索，目标是「首屏完整卡 1 张 且 余量 ≥15px」
// 只允许改：缩略图宽度、留白、行高（都不删内容、不藏字）
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const SRC = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 页头/工具条那一组（V3 已证）：facts 一行 + 向导行高 + 页头 padding
const HDR = `
  .mast-facts{gap:2px 10px;flex-wrap:nowrap}
  .mast-facts>div{flex:0 1 auto;min-width:0}
  .mast-facts dt{font-size:12px}
  .mast-facts dd{font-size:15px}
  .mast-wizard a{line-height:1.35}
  .mast{padding:8px var(--pad) 6px}
`;

const M = () => {
  const q = (s) => document.querySelector(s);
  const h = (s) => { const e = q(s); return e ? +e.getBoundingClientRect().height.toFixed(1) : null; };
  const rows = [...document.querySelectorAll('.row')];
  const vh = innerHeight;
  const boxes = rows.map((el) => { const b = el.getBoundingClientRect(); return { top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), h: +b.height.toFixed(1) }; });
  return { mastH: h('.mast'), railH: h('.rail'), barH: h('.bar'),
    firstRowTop: boxes[0]?.top, firstRowH: boxes[0]?.h,
    completeCards: boxes.filter((b) => b.top >= -0.5 && b.bottom <= vh + 0.5).length,
    fitSlack: boxes[0] ? +(vh - (boxes[0].top + boxes[0].h)).toFixed(1) : null,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    // 30 案的最高卡（决定「只有 S01 能进」还是「多案能进」）
    maxRowH: Math.max(...boxes.map((b) => b.h)),
    // 内容完整性哨兵
    famLen: q('.row .row-family')?.textContent.replace(/\s+/g, '').length,
    footLen: q('.row .row-foot')?.textContent.replace(/\s+/g, '').length,
    capText: q('.row .cap')?.textContent.trim().slice(0, 20) };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const p = await browser.newPage({ width: 390, height: 844, dsf: 2, mobile: true, reducedMotion: true });
const out = [];
const CASES = [];
for (const img of [200, 190, 184, 176, 168]) {
  for (const footLh of [1.62, 1.5]) {
    for (const barPad of [8, 6]) {
      CASES.push({ img, footLh, barPad });
    }
  }
}
for (const c of CASES) {
  await p.goto(SRC, { settleMs: 1150 });
  const css = HDR
    + `.shots .shot:first-child{max-width:${c.img}px}`
    + `.row-foot{line-height:${c.footLh}}`
    + `.bar{padding-bottom:${c.barPad}px}`;
  await p.eval((x) => { const s = document.createElement('style'); s.textContent = x; document.head.appendChild(s); }, css);
  await sleep(180);
  const m = await p.eval(M);
  const ok = m.firstRowTop <= 600 && m.completeCards >= 1 && m.fitSlack >= 15;
  out.push({ ...c, ...m, ok });
  console.log(`img=${String(c.img).padStart(3)} footLh=${c.footLh} barPad=${c.barPad}  首卡=${String(m.firstRowTop).padStart(6)} 卡高=${String(m.firstRowH).padStart(6)} 最高卡=${String(m.maxRowH).padStart(6)} 完整=${m.completeCards} 余=${String(m.fitSlack).padStart(6)} ${ok ? '✓✓' : (m.completeCards >= 1 ? '✓' : '✗')} ovX=${m.overflowX} fam=${m.famLen} foot=${m.footLen}`);
}
writeFileSync(join(HERE, 'data-67-combo390.json'), JSON.stringify(out, null, 1));
await p.close();
await browser.close();
console.log('\n✅ 达标（余量≥15）的组合：');
for (const r of out.filter((x) => x.ok)) console.log(`  img=${r.img} footLh=${r.footLh} barPad=${r.barPad} 余=${r.fitSlack}`);
