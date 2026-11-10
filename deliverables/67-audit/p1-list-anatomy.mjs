// p1-list-anatomy.mjs — 390 档列表页从 top=0 到首行卡（含行卡内部）的逐元素高度账。
// 输出：每个有高度的元素一行（含 top/bottom/h/字号/行高/文本），外加 mast/rail/bar/row 四块的分层核算。
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HERE, launchPage, gotoSelection, INPAGE } from './lib-measure.mjs';

const W = 390, H = 844;
const { browser, page } = await launchPage(W, H);

async function measure(label) {
  await gotoSelection(page);
  const out = await page.eval(`(async () => {
    ${INPAGE}
    var first = document.querySelector('#ledger .row');
    var stop = first ? __M.rect(first).bottom : __M.rect(document.querySelector('#ledger')).bottom;
    var flat = __M.all(null, 0.5, null).filter(function (e) { return e.top < stop; });
    return {
      viewport: __V,
      doc: { scrollH: document.documentElement.scrollHeight, scrollW: document.documentElement.scrollWidth,
             clientW: document.documentElement.clientWidth },
      firstRow: first ? { top: __M.px(__M.rect(first).top), h: __M.px(__M.rect(first).height),
                          bottom: __M.px(__M.rect(first).bottom) } : null,
      mast: __M.stack('.mast'),
      rail: __M.stack('.rail'),
      bar: __M.stack('.bar'),
      row: __M.stack(first),
      rowHead: __M.stack(first.querySelector('.row-head')),
      rowMeta: __M.stack(first.querySelector('.row-meta')),
      rowFoot: __M.stack(first.querySelector('.row-foot')),
      flat: flat
    };
  })()`);
  out.label = label;
  return out;
}

const base = await measure('A0-现状');
console.log('=== viewport', JSON.stringify(base.viewport));
console.log('=== doc', JSON.stringify(base.doc));
console.log('=== firstRow', JSON.stringify(base.firstRow));
for (const k of ['mast', 'rail', 'bar']) {
  const s = base[k];
  console.log(`\n--- ${k}  h=${s.h}  top=${s.top}  pad ${s.padTop}/${s.padBottom} border ${s.borderTop}/${s.borderBottom} scrollH=${s.scrollHeight}/${s.clientHeight}`);
  for (const c of s.kids) console.log(`     ${String(c.top).padStart(7)}  h=${String(c.h).padStart(6)}  gap=${String(c.gapBefore).padStart(5)}  ${c.el}  «${c.text || ''}»`);
  console.log(`     kidsSum=${s.kidsSum}  tail=${s.tailPad}  accounted=${s.accounted}`);
}

console.log('\n=== 首行卡内部 (S01) h=' + base.row.h);
for (const c of base.row.kids) console.log(`     ${String(c.top).padStart(7)}  h=${String(c.h).padStart(6)}  ${c.el}  «${c.text || ''}»`);

console.log('\n=== 首行卡 head/meta/foot');
for (const k of ['rowHead', 'rowMeta', 'rowFoot']) {
  const s = base[k];
  console.log(`  --- ${k} h=${s.h} pad ${s.padTop}/${s.padBottom}`);
  for (const c of s.kids) console.log(`     h=${String(c.h).padStart(6)}  ${c.el}  «${c.text || ''}»`);
}

console.log('\n=== 扁平清单（top < 首卡 bottom），按高度降序打印');
const flat = base.flat.slice().sort((a, b) => b.h - a.h);
for (const e of flat.slice(0, 90)) {
  console.log(`${String(e.i).padStart(3)} d${e.d} top=${String(e.top).padStart(7)} h=${String(e.h).padStart(6)} ${e.el.padEnd(38)} «${e.text}»`);
}

writeFileSync(join(HERE, 'data-p1-list-anatomy.json'), JSON.stringify(base, null, 2), 'utf8');
await browser.close();
