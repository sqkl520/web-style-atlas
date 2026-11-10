// A2c: S19 specifically. Prompt says "20 块面板分 5 行". What does the prototype actually render?
import { Browser } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
const OUT = 'deliverables/69-plan/redteam/';
const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900 });
await p.setViewport({ width: 1440, height: 900, dsf: 1, mobile: false });
await p.goto('http://127.0.0.1:8611/prototypes/S19-copperplate-herbarium-cabinet/', { settleMs: 1600 });
const r = await p.eval(() => {
  const bars = [...document.querySelectorAll('.dw__bar')];
  const cards = [...document.querySelectorAll('.dw__card')];
  const rows = [...document.querySelectorAll('.dw')];
  // group drawers by their top offset => number of visual rows
  const tops = [...new Set(bars.map((x) => Math.round(x.getBoundingClientRect().top + window.scrollY)))].sort((a, c) => a - c);
  const rowGroups = [];
  for (const t of tops) {
    let g = rowGroups.find((x) => Math.abs(x.top - t) < 12);
    if (g) g.n++; else rowGroups.push({ top: t, n: 1 });
  }
  return {
    drawerEls: rows.length, bars: bars.length, cards: cards.length,
    visualRows: rowGroups.length, perRow: rowGroups.map((g) => g.n),
    barHeights: [...new Set(bars.map((x) => Math.round(x.getBoundingClientRect().height)))],
    cardHeights: [...new Set(cards.map((x) => Math.round(x.getBoundingClientRect().height)))],
    emptyRowTitles: [...document.querySelectorAll('.dw-empty, .dw-row__t')].map((x) => x.textContent.trim().slice(0, 30)),
  };
});
console.log(JSON.stringify(r, null, 1));
writeFileSync(OUT + 'a2c-S19-dom.json', JSON.stringify(r, null, 1));
await p.screenshot({ path: OUT + 'shots/a2c-S19.jpg', format: 'jpeg', quality: 76 });
await p.close(); await b.close();
