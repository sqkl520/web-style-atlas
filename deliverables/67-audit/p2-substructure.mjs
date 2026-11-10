// p2-substructure.mjs — 390 档：mast 内每一行、rail 内每一组、bar 内每一项的精确高度与行数。
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HERE, launchPage, gotoSelection, INPAGE } from './lib-measure.mjs';

const W = 390, H = 844;
const { browser, page } = await launchPage(W, H);
await gotoSelection(page);

const out = await page.eval(`(async () => {
  ${INPAGE}
  function stackOf(el, len) { return el ? __M.stack(el, { textLen: len || 40 }) : null; }
  function deep(sel) {
    var el = document.querySelector(sel);
    if (!el) return null;
    var s = __M.stack(el, { textLen: 60 });
    s.kids = s.kids.map(function (k) {
      var e = el.children[k.el ? 0 : 0];
      return k;
    });
    return s;
  }
  // mast-id 逐行
  var mid = document.querySelector('.mast-id');
  var midStack = __M.stack(mid, { textLen: 60 });
  // 每个子元素的 margin / padding 实测（用于核对 327.9 的构成）
  var detail = [];
  Array.prototype.forEach.call(mid.children, function (k) {
    var c = __M.cs(k), r = __M.rect(k);
    detail.push({ el: __M.label(k), top: __M.px(r.top), h: __M.px(r.height),
      mt: c.marginTop, mb: c.marginBottom, pt: c.paddingTop, pb: c.paddingBottom,
      bt: c.borderTopWidth, fs: c.fontSize, lh: c.lineHeight,
      lines: Math.round(r.height / parseFloat(c.lineHeight) * 10) / 10,
      text: __M.txt(k, 60) });
  });
  // 每个 rail 组：标题、芯片行数、hint
  var rail = document.querySelector('.rail');
  var groups = [];
  Array.prototype.forEach.call(rail.children, function (k) {
    var r = __M.rect(k), c = __M.cs(k);
    if (c.display === 'none') { groups.push({ el: __M.label(k), hidden: true, h: 0 }); return; }
    var g = { el: __M.label(k), top: __M.px(r.top), h: __M.px(r.height), mb: c.marginBottom };
    var h2 = k.querySelector('h2');
    if (h2) { g.h2 = __M.txt(h2, 20); g.h2h = __M.px(__M.rect(h2).height); }
    var chips = k.querySelector('.chips');
    if (chips) {
      g.chipsH = __M.px(__M.rect(chips).height);
      g.chipCount = chips.querySelectorAll('button').length;
      var rows = {};
      Array.prototype.forEach.call(chips.querySelectorAll('button'), function (b) {
        var t = Math.round(__M.rect(b).top);
        rows[t] = (rows[t] || 0) + 1;
      });
      g.chipRows = Object.keys(rows).length;
      g.chipH = chips.querySelector('button') ? __M.px(__M.rect(chips.querySelector('button')).height) : 0;
    }
    var hint = k.querySelector('.rail-hint');
    if (hint) { g.hintH = __M.px(__M.rect(hint).height); g.hintLines = Math.round(__M.rect(hint).height / parseFloat(__M.cs(hint).lineHeight)); }
    groups.push(g);
  });
  // bar 逐项
  var bar = document.querySelector('.bar');
  var barItems = [];
  Array.prototype.forEach.call(bar.children, function (k) {
    var r = __M.rect(k), c = __M.cs(k);
    barItems.push({ el: __M.label(k), top: __M.px(r.top), h: __M.px(r.height), w: __M.px(r.width),
      mt: c.marginTop, mb: c.marginBottom, order: c.order, flex: c.flex, text: __M.txt(k, 24) });
  });
  // 行卡内部：每个直接子格 + row-main 内部
  var row = document.querySelector('#ledger .row');
  var rowStack = __M.stack(row, { textLen: 40 });
  var main = row.querySelector('.row-main');
  var mainStack = __M.stack(main, { textLen: 40 });
  var noEl = row.querySelector('.no');
  return {
    viewport: __V,
    mastId: { h: midStack.h, kidsSum: midStack.kidsSum, tail: midStack.tailPad, kids: midStack.kids, detail: detail },
    facts: stackOf(document.querySelector('.mast-facts'), 20),
    rail: { h: __M.px(__M.rect(rail).height), scrollH: rail.scrollHeight, clientH: rail.clientHeight,
            innerScroll: rail.scrollHeight - rail.clientHeight, groups: groups },
    bar: { h: __M.px(__M.rect(bar).height), items: barItems },
    row: { h: __M.px(__M.rect(row).height), cols: __M.cs(row).gridTemplateColumns, gap: __M.cs(row).gap,
           pad: __M.cs(row).padding, kids: rowStack.kids },
    rowMain: { h: mainStack.h, kids: mainStack.kids },
    no: { h: __M.px(__M.rect(noEl).height), fs: __M.cs(noEl).fontSize, lh: __M.cs(noEl).lineHeight }
  };
})()`);

console.log('=== mast-id  h=' + out.mastId.h + '  kidsSum=' + out.mastId.kidsSum + ' tail=' + out.mastId.tail);
for (const d of out.mastId.detail) {
  console.log(`  top=${String(d.top).padStart(6)} h=${String(d.h).padStart(6)} mt=${d.mt.padStart(5)} mb=${d.mb.padStart(5)} pt=${d.pt.padStart(4)} pb=${d.pb.padStart(4)} bt=${d.bt.padStart(4)} fs=${d.fs.padStart(5)} lh=${d.lh.padStart(6)} lines=${d.lines}  ${d.el}  «${d.text}»`);
}

console.log('\n=== facts h=' + out.facts.h);
for (const k of out.facts.kids) console.log(`  top=${String(k.top).padStart(6)} h=${String(k.h).padStart(6)}  ${k.el}  «${k.text}»`);

console.log('\n=== rail h=' + out.rail.h + '  inner scrollH=' + out.rail.scrollH + ' clientH=' + out.rail.clientH + '  需内滚 ' + out.rail.innerScroll);
for (const g of out.rail.groups) {
  console.log(`  top=${String(g.top).padStart(6)} h=${String(g.h).padStart(7)} mb=${String(g.mb).padStart(4)} ${g.el.padEnd(26)} h2=${g.h2h || '-'} chips=${g.chipsH || '-'}(${g.chipCount || 0}颗/${g.chipRows || 0}行/单颗${g.chipH || '-'}) hint=${g.hintH || '-'}(${g.hintLines || 0}行)`);
}

console.log('\n=== bar h=' + out.bar.h);
for (const k of out.bar.items) console.log(`  top=${String(k.top).padStart(6)} h=${String(k.h).padStart(6)} w=${String(k.w).padStart(6)} order=${k.order} flex=${k.flex}  ${k.el}  «${k.text}»`);

console.log('\n=== row h=' + out.row.h + ' cols=' + out.row.cols + ' gap=' + out.row.gap + ' pad=' + out.row.pad);
for (const k of out.row.kids) console.log(`  top=${String(k.top).padStart(6)} h=${String(k.h).padStart(7)}  ${k.el}`);
console.log('--- row-main h=' + out.rowMain.h);
for (const k of out.rowMain.kids) console.log(`  top=${String(k.top).padStart(6)} h=${String(k.h).padStart(7)}  ${k.el}  «${k.text || ''}»`);
console.log('--- .no h=' + out.no.h + ' fs=' + out.no.fs + ' lh=' + out.no.lh);

writeFileSync(join(HERE, 'data-p2-substructure.json'), JSON.stringify(out, null, 2), 'utf8');
await browser.close();
