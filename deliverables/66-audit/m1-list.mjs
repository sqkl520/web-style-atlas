// m1-list.mjs — 列表页 390×844 / 414×896 / 1440×900 基线测量
// 只读仓库。输出 JSON 到 deliverables/66-audit/data-m1-list.json
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const SHOTS = join(HERE, 'shots-mobile');
mkdirSync(SHOTS, { recursive: true });

const VPS = [
  { name: '390', w: 390, h: 844, mobile: true },
  { name: '414', w: 414, h: 896, mobile: true },
  { name: '1440', w: 1440, h: 900, mobile: false },
];

const probe = () => {
  const r = (el) => {
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return {
      top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1),
      height: +b.height.toFixed(1), left: +b.left.toFixed(1), width: +b.width.toFixed(1),
    };
  };
  const de = document.documentElement;
  const shots = (el) => el ? Array.from(el.querySelectorAll('.shot img')).map((i) => +i.getBoundingClientRect().height.toFixed(1)) : [];
  const rows = Array.from(document.querySelectorAll('.row'));
  const rowInfos = rows.map((el) => {
    const b = el.getBoundingClientRect();
    return { id: el.getAttribute('data-id'), top: +b.top.toFixed(1), height: +b.height.toFixed(1), bottom: +b.bottom.toFixed(1) };
  });
  const vh = window.innerHeight;
  const complete = rowInfos.filter((x) => x.top >= 0 && x.bottom <= vh).length;
  const partial = rowInfos.filter((x) => x.top < vh && x.bottom > vh).length;
  const railEl = document.querySelector('.rail');
  const mastEl = document.querySelector('.mast');
  const barEl = document.querySelector('.bar');
  const ledgerEl = document.querySelector('#ledger');
  return {
    vp: { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio },
    doc: {
      scrollHeight: de.scrollHeight, clientHeight: de.clientHeight,
      scrollWidth: de.scrollWidth, clientWidth: de.clientWidth,
      overflowX: de.scrollWidth - de.clientWidth,
    },
    mast: r(mastEl),
    bench: r(document.querySelector('.bench')),
    rail: {
      ...r(railEl),
      scrollHeight: railEl ? railEl.scrollHeight : null,
      clientHeight: railEl ? railEl.clientHeight : null,
      innerScroll: railEl ? railEl.scrollHeight - railEl.clientHeight : null,
      maxHeight: railEl ? getComputedStyle(railEl).maxHeight : null,
      position: railEl ? getComputedStyle(railEl).position : null,
      blocks: railEl ? railEl.querySelectorAll('.rail-block').length : 0,
      chips: railEl ? railEl.querySelectorAll('.chips button').length : 0,
      firstBlockTop: railEl && railEl.querySelector('.rail-block') ? +railEl.querySelector('.rail-block').getBoundingClientRect().top.toFixed(1) : null,
    },
    railFold: (() => {
      const f = document.getElementById('rail-fold');
      if (!f) return { exists: false };
      const body = f.querySelector('.rail-fold-body');
      return {
        exists: true, open: f.open, rect: r(f),
        bodyChildren: body ? body.children.length : null,
        bodyHeight: body ? +body.getBoundingClientRect().height.toFixed(1) : null,
      };
    })(),
    bar: r(barEl),
    barChildren: barEl ? Array.from(barEl.children).map((c) => ({ cls: c.className, ...r(c) })) : [],
    ledger: r(ledgerEl),
    rowCount: rows.length,
    firstRow: rowInfos[0] || null,
    firstRowCompleteInViewport: rowInfos[0] && rowInfos[0].top >= 0 && rowInfos[0].bottom <= vh,
    completeCards: complete,
    partialCards: partial,
    rowHeights: rowInfos.map((x) => x.height),
    rowMinH: Math.min(...rowInfos.map((x) => x.height)),
    rowMaxH: Math.max(...rowInfos.map((x) => x.height)),
    rowAvgH: +(rowInfos.reduce((a, b) => a + b.height, 0) / rowInfos.length).toFixed(1),
    firstRowShotHeights: rows[0] ? shots(rows[0]) : [],
    rowTop5: rowInfos.slice(0, 6),
    // 页头内部构成
    mastParts: mastEl ? Array.from(mastEl.querySelectorAll(':scope > *')).map((c) => ({ cls: c.className, ...r(c) })) : [],
    mastInner: mastEl ? {
      kicker: r(mastEl.querySelector('.mast-kicker')),
      h1: r(mastEl.querySelector('h1')),
      claim: r(mastEl.querySelector('.mast-claim')),
      wizard: r(mastEl.querySelector('.mast-wizard')),
      exit: r(mastEl.querySelector('.mast-exit')),
      facts: r(mastEl.querySelector('.mast-facts')),
    } : null,
    // 横向溢出的具体元凶
    overflowers: (() => {
      const out = [];
      const vw = de.clientWidth;
      document.querySelectorAll('body *').forEach((el) => {
        const b = el.getBoundingClientRect();
        if (b.width > 0 && (b.right > vw + 0.5 || b.left < -0.5)) {
          out.push({ tag: el.tagName, cls: (el.className || '').toString().slice(0, 60), left: +b.left.toFixed(1), right: +b.right.toFixed(1), w: +b.width.toFixed(1) });
        }
      });
      return out.slice(0, 25);
    })(),
  };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = { measuredAt: new Date().toISOString(), vps: {} };

for (const vp of VPS) {
  const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: 2, mobile: vp.mobile });
  await p.goto(PAGE, { settleMs: 2200 });
  const data = await p.eval(probe);
  out.vps[vp.name] = data;
  await p.screenshot({ path: join(SHOTS, `before-list-${vp.name}-first.png`), format: 'png' });
  // 滚到第一张卡，看整张卡长什么样
  await p.eval(() => window.scrollTo(0, document.querySelector('.row').getBoundingClientRect().top + window.scrollY - 8));
  await new Promise((r) => setTimeout(r, 400));
  await p.screenshot({ path: join(SHOTS, `before-list-${vp.name}-card.png`), format: 'png' });
  console.log(`[${vp.name}] firstRow.top=${data.firstRow.top} complete=${data.completeCards} railH=${data.rail.height} railScroll=${data.rail.innerScroll} mastH=${data.mast.height} overflowX=${data.doc.overflowX} docH=${data.doc.scrollHeight}`);
  await p.close();
}

writeFileSync(join(HERE, 'data-m1-list.json'), JSON.stringify(out, null, 1));
await browser.close();
console.log('written data-m1-list.json');
