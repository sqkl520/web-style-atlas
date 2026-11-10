// p3-detail-anatomy.mjs — 390 档详情面板：从面板顶到第一个字段之间的逐元素账 + 30 案 scrollHeight。
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HERE, launchPage, gotoSelection, INPAGE } from './lib-measure.mjs';

const W = 390, H = 844;
const { browser, page } = await launchPage(W, H);
await gotoSelection(page);

const out = await page.eval(`(async () => {
  ${INPAGE}
  function openOne(id) {
    location.hash = '#' + id;
    return null;
  }
  // 用真实路径打开：点行卡等价（这里用 hash，app.js 的 hashchange 会走 open()）
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  var ids = Array.from(document.querySelectorAll('#ledger .row')).map(function (r) { return r.getAttribute('data-id'); });

  // ---- 1) 逐元素解剖（S01 = 最短案）
  location.hash = '#S01';
  await sleep(260);
  var d = document.querySelector('#detail');
  var body = document.querySelector('#d-body');
  var head = document.querySelector('.detail-head');
  var panel = __M.stack(d, { textLen: 46 });
  // panel 是 flex column：head + body。body 自己滚（其实是 panel 滚）
  var bodyStack = __M.stack(body, { textLen: 46 });

  // 面板坐标：所有 top 相对 panel 顶
  var base = __M.rect(d).top;
  function rel(el) { var r = __M.rect(el); return { top: __M.px(r.top - base), bottom: __M.px(r.bottom - base), h: __M.px(r.height) }; }

  var flat = [];
  (function walk(el, depth) {
    var c = __M.cs(el);
    if (c.display === 'none') return;
    var r = __M.rect(el);
    if (r.height > 0.5) {
      flat.push({ d: depth, el: __M.label(el), top: __M.px(r.top - base), bottom: __M.px(r.bottom - base),
        h: __M.px(r.height), fs: c.fontSize, lh: c.lineHeight, pos: c.position,
        scrollH: el.scrollHeight, clientH: el.clientHeight,
        text: __M.txt(el, 52) });
    }
    Array.prototype.forEach.call(el.children, function (k) { walk(k, depth + 1); });
  })(body, 0);

  var firstField = body.querySelector('.fields .field');
  var firstFieldTop = firstField ? __M.px(__M.rect(firstField).top - base) : null;

  var dHead = rel(head);
  var dHeadStack = __M.stack(head, { textLen: 40 });

  // 折叠块逐条
  var folds = Array.prototype.map.call(body.querySelectorAll(':scope > details.fold'), function (f) {
    var s = f.querySelector(':scope > summary');
    return { cls: f.className, open: f.open, h: __M.px(__M.rect(f).height),
      top: __M.px(__M.rect(f).top - base), summaryH: s ? __M.px(__M.rect(s).height) : 0,
      text: __M.txt(s, 40) };
  });
  var proto = body.querySelector('.open-proto');
  var cta = body.querySelector('.prompt-cta');

  // ---- 2) 30 案 scrollHeight（真实视口，mobile:true 已在外面设好）
  var perCase = [];
  for (var i = 0; i < ids.length; i++) {
    location.hash = '#' + ids[i];
    await sleep(90);
    var dd = document.querySelector('#detail');
    var ff = document.querySelector('#d-body .fields .field');
    perCase.push({ id: ids[i], scrollH: dd.scrollHeight, clientH: dd.clientHeight,
      firstField: ff ? __M.px(__M.rect(ff).top - __M.rect(dd).top) : null,
      fields: document.querySelectorAll('#d-body .fields > .field').length });
  }
  location.hash = '#S01'; await sleep(120);

  return {
    viewport: __V,
    panel: panel,
    panelRel: { h: __M.px(__M.rect(d).height), w: __M.px(__M.rect(d).width), scrollH: d.scrollHeight },
    head: { h: dHead.h, top: dHead.top, kids: dHeadStack.kids, pad: dHeadStack.padTop + '/' + dHeadStack.padBottom },
    bodyStack: { h: bodyStack.h, pad: bodyStack.padTop + '/' + bodyStack.padBottom, kids: bodyStack.kids },
    firstFieldTop: firstFieldTop,
    folds: folds,
    protoH: proto ? __M.px(__M.rect(proto).height) : null,
    ctaH: cta ? __M.px(__M.rect(cta).height) : null,
    flat: flat,
    perCase: perCase
  };
})()`);

console.log('=== panel', JSON.stringify(out.panelRel));
console.log('=== head h=' + out.head.h + ' pad=' + out.head.pad);
for (const k of out.head.kids) console.log(`  top=${String(k.top).padStart(6)} h=${String(k.h).padStart(6)} fs=${k.fs} lh=${k.lh}  ${k.el}  «${k.text}»`);
console.log('=== body h=' + out.bodyStack.h + ' pad=' + out.bodyStack.pad);
for (const k of out.bodyStack.kids) console.log(`  top=${String(k.top).padStart(7)} h=${String(k.h).padStart(6)} gap=${String(k.gapBefore).padStart(6)}  ${k.el}`);
console.log('=== 首字段 top(相对面板顶) = ' + out.firstFieldTop);
console.log('=== 折叠块');
for (const f of out.folds) console.log(`  top=${String(f.top).padStart(7)} h=${String(f.h).padStart(6)} summaryH=${f.summaryH}  ${f.cls}  «${f.text}»`);
console.log('=== open-proto h=' + out.protoH + '  prompt-cta h=' + out.ctaH);

console.log('\n=== 面板顶→首字段的扁平清单（按 top 排序）');
const seg = out.flat.filter((e) => e.top < out.firstFieldTop).sort((a, b) => a.top - b.top || b.h - a.h);
for (const e of seg) {
  console.log(`  top=${String(e.top).padStart(7)} h=${String(e.h).padStart(6)} d${e.d} ${e.el.padEnd(40)} «${e.text}»`);
}

console.log('\n=== 30 案 scrollHeight（390×844）');
const pc = out.perCase.slice().sort((a, b) => a.scrollH - b.scrollH);
for (const p of pc) console.log(`  ${p.id}  scrollH=${p.scrollH}  (${(p.scrollH / 844).toFixed(2)} 屏)  首字段=${p.firstField}  字段数=${p.fields}`);
const hs = pc.map((p) => p.scrollH);
console.log(`  min=${Math.min(...hs)} max=${Math.max(...hs)} avg=${Math.round(hs.reduce((a, b) => a + b, 0) / hs.length)}`);
console.log('  >3800 = ' + hs.filter((h) => h > 3800).length + '/30');

writeFileSync(join(HERE, 'data-p3-detail-anatomy.json'), JSON.stringify(out, null, 2), 'utf8');
await browser.close();
