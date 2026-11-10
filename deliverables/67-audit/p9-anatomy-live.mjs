// p9-anatomy-live.mjs — 现工作区（含 2026-10-28 长字段折叠）的逐块账：列表 390 / 详情 390+1440。
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HERE, launchPage, INPAGE, PAGE_LIVE } from './lib-measure.mjs';

async function listAnatomy(w, h) {
  const { browser, page } = await launchPage(w, h);
  await page.goto(PAGE_LIVE, { settleMs: 1100 });
  const r = await page.eval(`(async () => {
    ${INPAGE}
    await (async function(){ if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch(e){} } })();
    var first = document.querySelector('#ledger .row');
    var out = { viewport: __V, doc: { scrollH: document.documentElement.scrollHeight },
      mast: __M.stack('.mast'), rail: __M.stack('.rail'), bar: __M.stack('.bar'),
      firstRow: { top: __M.px(__M.rect(first).top), h: __M.px(__M.rect(first).height) },
      row: __M.stack(first), rowHead: __M.stack(first.querySelector('.row-head')),
      rowMeta: __M.stack(first.querySelector('.row-meta')),
      mastId: __M.stack(document.querySelector('.mast-id')),
      midDetail: Array.prototype.map.call(document.querySelector('.mast-id').children, function (k) {
        var c = __M.cs(k), rr = __M.rect(k);
        return { el: __M.label(k), h: __M.px(rr.height), fs: c.fontSize, lh: c.lineHeight,
          lines: Math.round(rr.height / parseFloat(c.lineHeight) * 10) / 10,
          mt: c.marginTop, mb: c.marginBottom, pt: c.paddingTop, pb: c.paddingBottom,
          bt: c.borderTopWidth, text: __M.txt(k, 44) };
      }),
      railGroups: Array.prototype.map.call(document.querySelector('.rail').children, function (k) {
        var c = __M.cs(k), rr = __M.rect(k);
        return { el: __M.label(k), h: c.display === 'none' ? 0 : __M.px(rr.height), display: c.display,
          mb: c.marginBottom, text: __M.txt(k, 24) };
      }),
      barItems: Array.prototype.map.call(document.querySelector('.bar').children, function (k) {
        var c = __M.cs(k), rr = __M.rect(k);
        return { el: __M.label(k), top: __M.px(rr.top - __M.rect(document.querySelector('.bar')).top), h: __M.px(rr.height), w: __M.px(rr.width) };
      }),
      rowMain: __M.stack(first.querySelector('.row-main'))
    };
    return out;
  })()`);
  await browser.close();
  return r;
}

async function detailAnatomy(w, h) {
  const { browser, page } = await launchPage(w, h);
  await page.goto(PAGE_LIVE, { settleMs: 1100 });
  const r = await page.eval(`(async () => {
    ${INPAGE}
    await (async function(){ if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch(e){} } })();
    var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    location.hash = '#S01'; await sleep(300);
    var d = document.querySelector('#detail'), base = __M.rect(d).top, vh = innerHeight;
    var body = document.querySelector('#d-body'), head = document.querySelector('.detail-head');
    var kids = Array.prototype.map.call(body.children, function (k) {
      var rr = __M.rect(k), c = __M.cs(k);
      var o = { el: __M.label(k), top: __M.px(rr.top - base), h: __M.px(rr.height), text: __M.txt(k, 40) };
      if (k.matches('details.fold')) {
        var s = k.querySelector(':scope > summary');
        o.summaryH = s ? __M.px(__M.rect(s).height) : 0;
        o.open = k.open;
      }
      return o;
    });
    var flat = [];
    (function walk(el, depth) {
      var c = __M.cs(el); if (c.display === 'none') return;
      var rr = __M.rect(el);
      if (rr.height > 0.5 && rr.top - base < 720) {
        flat.push({ d: depth, el: __M.label(el), top: __M.px(rr.top - base), h: __M.px(rr.height),
          fs: c.fontSize, lh: c.lineHeight, text: __M.txt(el, 46) });
      }
      Array.prototype.forEach.call(el.children, function (k) { walk(k, depth + 1); });
    })(body, 0);
    var ff = body.querySelector('.fields .field');
    var fields = Array.prototype.map.call(body.querySelectorAll('.fields > .field'), function (f) {
      var rr = __M.rect(f), det = f.querySelector(':scope > details');
      var s = det ? det.querySelector(':scope > summary') : null;
      return { fold: !!det, h: __M.px(rr.height), top: __M.px(rr.top - base),
        label: (f.querySelector(':scope > dt') || s || {textContent:'?'}).textContent.trim().slice(0, 30),
        summaryH: s ? __M.px(__M.rect(s).height) : null };
    });
    var headStack = __M.stack(head);
    return { viewport: __V, panelScrollH: d.scrollHeight, headH: __M.px(__M.rect(head).height),
      headKids: headStack.kids, bodyPad: __M.cs(body).padding, kids: kids,
      firstFieldTop: ff ? __M.px(__M.rect(ff).top - base) : null,
      fieldsDlTop: __M.px(__M.rect(body.querySelector('.fields')).top - base),
      fields: fields, flat: flat };
  })()`);
  await browser.close();
  return r;
}

const out = {};
out.list390 = await listAnatomy(390, 844);
out.detail390 = await detailAnatomy(390, 844);
out.detail1440 = await detailAnatomy(1440, 900);
out.list1440 = await listAnatomy(1440, 900);

console.log('===== 列表 390');
for (const k of out.list390.mast.kids) console.log(`  mast   top=${String(k.top).padStart(6)} h=${String(k.h).padStart(6)}  ${k.el} «${(k.text||'').slice(0,30)}»`);
for (const k of out.list390.mastId.kids) console.log(`    └ top=${String(k.top).padStart(6)} h=${String(k.h).padStart(6)}  ${k.el}`);
for (const g of out.list390.railGroups) console.log(`  rail   h=${String(g.h).padStart(7)}  ${g.el} «${(g.text||'').slice(0,22)}»`);
console.log(`  rail total h=${out.list390.rail.h} scrollH=${out.list390.rail.scrollHeight} 内滚=${out.list390.rail.scrollHeight - out.list390.rail.clientHeight}`);
for (const k of out.list390.bar.kids) console.log(`  bar    top=${String(k.top).padStart(6)} h=${String(k.h).padStart(6)}  ${k.el}`);
console.log(`  bar total h=${out.list390.bar.h}`);
console.log(`  首卡 top=${out.list390.firstRow.top} h=${out.list390.firstRow.h}`);
for (const k of out.list390.row.kids) console.log(`    row  top=${String(k.top).padStart(6)} h=${String(k.h).padStart(6)}  ${k.el}`);
for (const k of out.list390.rowMain.kids) console.log(`      main top=${String(k.top).padStart(6)} h=${String(k.h).padStart(6)}  ${k.el}`);

console.log(`\n===== 详情 390  面板 scrollH=${out.detail390.panelScrollH} headH=${out.detail390.headH} 首字段=${out.detail390.firstFieldTop} bodyPad=${out.detail390.bodyPad}`);
for (const k of out.detail390.kids) console.log(`  top=${String(k.top).padStart(7)} h=${String(k.h).padStart(6)} ${k.el}${k.summaryH!=null?' summaryH='+k.summaryH:''} «${(k.text||'').slice(0,40)}»`);
console.log('  --- 字段逐条');
for (const f of out.detail390.fields) console.log(`    top=${String(f.top).padStart(7)} h=${String(f.h).padStart(6)} ${f.fold?'[折'+f.summaryH+']':'[平]'} ${f.label}`);

console.log(`\n===== 详情 1440  面板 scrollH=${out.detail1440.panelScrollH} headH=${out.detail1440.headH} 首字段=${out.detail1440.firstFieldTop}`);
for (const k of out.detail1440.kids) console.log(`  top=${String(k.top).padStart(7)} h=${String(k.h).padStart(6)} ${k.el}${k.summaryH!=null?' summaryH='+k.summaryH:''}`);

console.log(`\n===== 列表 1440  mast=${out.list1440.mast.h} rail=${out.list1440.rail.h} bar=${out.list1440.bar.h} 首卡top=${out.list1440.firstRow.top} h=${out.list1440.firstRow.h}`);
for (const k of out.list1440.mastId.kids) console.log(`    mastid top=${String(k.top).padStart(6)} h=${String(k.h).padStart(6)} fs=${k.fs} lines=${k.lines} ${k.el}`);

writeFileSync(join(HERE, 'data-p9-anatomy-live.json'), JSON.stringify(out, null, 2), 'utf8');
