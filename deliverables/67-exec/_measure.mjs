// _measure.mjs — 390×844 与 1440×900 两档：首个行卡 top 之前的每一个有高度的元素
// 只读，不改 DOM。输出 data-67-measure.json + 控制台表格。
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const COLLECT = () => {
  const q = (s) => document.querySelector(s);
  const rc = (e) => { const b = e.getBoundingClientRect(); return { top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), h: +b.height.toFixed(1), w: +b.width.toFixed(1), left: +b.left.toFixed(1) }; };
  const rows = [...document.querySelectorAll('.row')];
  const firstRowTop = rows.length ? +rows[0].getBoundingClientRect().top.toFixed(1) : null;
  const vh = innerHeight;
  const rowBoxes = rows.map((el) => rc(el));
  const complete = rowBoxes.filter((b) => b.top >= -0.5 && b.bottom <= vh + 0.5).length;

  // 每个元素：tag + id + class + 尺寸
  const desc = (e) => {
    const t = e.tagName.toLowerCase();
    const id = e.id ? '#' + e.id : '';
    const cls = e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).join('.') : '';
    return t + id + cls;
  };
  const cs = (e) => getComputedStyle(e);

  const out = [];
  const walk = (e, depth) => {
    const b = rc(e);
    const st = cs(e);
    if (st.display === 'none' || b.h <= 0) { for (const c of e.children) walk(c, depth + 1); return; }
    out.push({ depth, el: desc(e), top: b.top, h: b.h, bottom: b.bottom, w: b.w, left: b.left,
      display: st.display, overflowY: st.overflowY, position: st.position,
      clippedBy: e.closest('.rail') && e.closest('.rail') !== e ? true : false,
      inPreRowZone: firstRowTop != null && b.top >= -1 && b.top < firstRowTop });
    for (const c of e.children) walk(c, depth + 1);
  };
  for (const c of document.body.children) walk(c, 0);
  // body 自身
  const bodyBox = rc(document.body);

  // rail 内滚：clip 之后哪些块看不见
  const rail = q('.rail');
  const railScroll = rail ? { clientH: rail.clientHeight, scrollH: rail.scrollHeight } : null;
  const railBlocks = rail ? [...rail.querySelectorAll('.rail-block, .rail-lead, .rail-sep')].map((e) => ({ el: desc(e), ...rc(e) })) : [];

  return {
    innerHeight: vh, innerWidth: innerWidth,
    mast: rc(q('.mast')), rail: rc(q('.rail')), bar: rc(q('.bar')),
    ledger: rc(q('.ledger')), main: rc(q('.main')), bench: rc(q('.bench')),
    firstRowTop, firstRowH: rows.length ? rowBoxes[0].h : null,
    completeCards: complete,
    partialCards: rowBoxes.filter((b) => b.top < vh && b.bottom > vh).length,
    docH: document.documentElement.scrollHeight,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    bodyBox, railScroll, railBlocks,
    mastParts: [...document.querySelectorAll('.mast-id > *, .mast-facts, .mast-facts > div')].map((e) => ({ el: desc(e), ...rc(e) })),
    barParts: [...document.querySelectorAll('.bar > *')].map((e) => ({ el: desc(e), ...rc(e) })),
    elements: out,
  };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const data = { measuredAt: new Date().toISOString(), page: PAGE, vps: {} };

for (const vp of [{ k: '390', w: 390, h: 844, mobile: true }, { k: '1440', w: 1440, h: 900, mobile: false }]) {
  const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: vp.k === '390' ? 2 : 1, mobile: vp.mobile });
  await p.goto(PAGE, { settleMs: 1800 });
  const m = await p.eval(COLLECT);
  m.consoleErrors = p.consoleErrors.slice();
  data.vps[vp.k] = m;

  console.log(`\n===== ${vp.k}x${vp.h} =====`);
  console.log(`mast   top=${m.mast.top} h=${m.mast.h}`);
  console.log(`rail   top=${m.rail.top} h=${m.rail.h}  内滚 clientH=${m.railScroll?.clientH} scrollH=${m.railScroll?.scrollH}`);
  console.log(`bar    top=${m.bar.top} h=${m.bar.h}`);
  console.log(`ledger top=${m.ledger.top}`);
  console.log(`首卡   top=${m.firstRowTop} h=${m.firstRowH} bottom=${(m.firstRowTop + m.firstRowH).toFixed(1)}`);
  console.log(`完整卡=${m.completeCards} 部分=${m.partialCards} 视口=${m.innerHeight} docH=${m.docH} ovX=${m.overflowX} consoleErr=${m.consoleErrors.length}`);
  console.log('--- mast 内部 ---');
  for (const x of m.mastParts) console.log(`  ${String(x.top).padStart(7)} h=${String(x.h).padStart(6)}  ${x.el}`);
  console.log('--- bar 内部 ---');
  for (const x of m.barParts) console.log(`  ${String(x.top).padStart(7)} h=${String(x.h).padStart(6)}  ${x.el}`);
  console.log('--- rail 内块 ---');
  for (const x of m.railBlocks) console.log(`  ${String(x.top).padStart(7)} h=${String(x.h).padStart(6)} bottom=${String(x.bottom).padStart(7)}  ${x.el}`);
  console.log('--- 首卡之前的所有有高度元素（按 top 升序，含嵌套）---');
  const pre = m.elements.filter((e) => e.inPreRowZone).sort((a, b) => a.top - b.top || a.depth - b.depth);
  for (const e of pre) console.log(`  ${'  '.repeat(e.depth)}${String(e.top).padStart(7)} h=${String(e.h).padStart(6)} w=${String(e.w).padStart(5)}  ${e.el}${e.clippedBy ? '  [rail内]' : ''}`);
  await p.close();
}

writeFileSync(join(HERE, 'data-67-measure.json'), JSON.stringify(data, null, 1));
await browser.close();
console.log('\nwritten data-67-measure.json');
