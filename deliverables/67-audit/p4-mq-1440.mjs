// p4-mq-1440.mjs — ① style.css 全部 @media 断点（Node 解析源码 + 浏览器 matchMedia 验证）
//                  ② 1440×900 / 768×1024 / 390×844 三档同一批块的高度对照
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HERE, ROOT, launchPage, gotoSelection, INPAGE } from './lib-measure.mjs';

// ── 1. 解析 style.css 的 @media 块（含嵌套大括号）
const cssPath = join(ROOT, 'prototypes', '_selection', 'style.css');
const cssText = readFileSync(cssPath, 'utf8');
const lineOf = (idx) => cssText.slice(0, idx).split('\n').length;

const mediaBlocks = [];
const re = /@media([^{]+)\{/g;
let m;
while ((m = re.exec(cssText))) {
  const start = m.index + m[0].length;
  let depth = 1, i = start;
  while (i < cssText.length && depth > 0) {
    if (cssText[i] === '{') depth++;
    else if (cssText[i] === '}') depth--;
    i++;
  }
  const body = cssText.slice(start, i - 1);
  // 块内的顶层规则（选择器 + 声明），支持一层嵌套
  const rules = [];
  const rre = /([^{}]+)\{([^{}]*)\}/g;
  let r;
  while ((r = rre.exec(body))) {
    rules.push({ sel: r[1].replace(/\s+/g, ' ').trim(), decls: r[2].replace(/\s+/g, ' ').trim() });
  }
  mediaBlocks.push({
    query: m[1].trim(), line: lineOf(m.index), rules,
    innerComments: (body.match(/\/\*[\s\S]*?\*\//g) || []).map((c) => c.replace(/\/\*|\*\//g, '').replace(/\s+/g, ' ').trim())
  });
}

console.log('=== style.css 全部 @media（源码解析）');
for (const b of mediaBlocks) {
  console.log(`\n## @media ${b.query}   (style.css:${b.line})  ${b.rules.length} 条规则`);
  for (const r of b.rules) console.log(`   ${r.sel}  { ${r.decls} }`);
  for (const c of b.innerComments) console.log(`   /* ${c.slice(0, 300)} */`);
}

// ── 2. 三档对照
async function blocks(page) {
  return page.eval(`(async () => {
    ${INPAGE}
    var q = function (s) { return document.querySelector(s); };
    var R = function (s) { var e = q(s); return e ? __M.px(__M.rect(e).height) : null; };
    var T = function (s) { var e = q(s); return e ? __M.px(__M.rect(e).top) : null; };
    var row = q('#ledger .row');
    var barEl = q('.bar');
    var barItems = [];
    Array.prototype.forEach.call(barEl.children, function (k) {
      var r = __M.rect(k), c = __M.cs(k);
      barItems.push({ el: __M.label(k), top: __M.px(r.top - __M.rect(barEl).top), h: __M.px(r.height), w: __M.px(r.width), display: c.display });
    });
    var mid = q('.mast-id');
    var midLines = [];
    Array.prototype.forEach.call(mid.children, function (k) {
      var r = __M.rect(k), c = __M.cs(k);
      midLines.push({ el: __M.label(k), h: __M.px(r.height), fs: c.fontSize, lh: c.lineHeight,
        lines: Math.round(r.height / parseFloat(c.lineHeight) * 10) / 10,
        mt: c.marginTop, mb: c.marginBottom, w: __M.px(r.width), display: c.display });
    });
    var disp = function (s) { var e = q(s); return e ? __M.cs(e).display : null; };
    var rails = [];
    Array.prototype.forEach.call(q('.rail').children, function (k) {
      var r = __M.rect(k), c = __M.cs(k);
      rails.push({ el: __M.label(k), top: __M.px(r.top), h: c.display === 'none' ? 0 : __M.px(r.height), display: c.display });
    });
    return {
      vw: innerWidth, vh: innerHeight, docScrollH: document.documentElement.scrollHeight,
      mast: R('.mast'), mastid: R('.mast-id'),
      rail: { h: R('.rail'), scrollH: q('.rail').scrollHeight, clientH: q('.rail').clientHeight, maxH: __M.cs(q('.rail')).maxHeight, pos: __M.cs(q('.rail')).position, overflow: __M.cs(q('.rail')).overflowY },
      bar: R('.bar'), barItems: barItems,
      firstRowTop: T('#ledger .row'), firstRowH: R('#ledger .row'),
      ledgerTop: T('#ledger'), mainPad: __M.cs(q('.main')).padding,
      rowCols: __M.cs(row).gridTemplateColumns, rowGap: __M.cs(row).gap, rowPad: __M.cs(row).padding,
      rowKids: Array.prototype.map.call(row.children, function (k) { return { el: __M.label(k), h: __M.px(__M.rect(k).height), w: __M.px(__M.rect(k).width) }; }),
      midLines: midLines, railItems: rails,
      shots: { h: R('.shots'), imgH: R('.shots .shot img'), capH: R('.shots figcaption') },
      railLead: disp('.rail-lead'),
      benchCols: __M.cs(q('.bench')).gridTemplateColumns,
      detailW: __M.cs(q('.detail')).width,
      detailBodyPad: __M.cs(q('.detail-body')).padding,
      detailHeadPad: __M.cs(q('.detail-head')).padding,
      docHOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
    };
  })()`);
}

async function detailBlocks(page) {
  return page.eval(`(async () => {
    ${INPAGE}
    var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    location.hash = '#S01'; await sleep(300);
    var d = document.querySelector('#detail'), b = document.querySelector('#d-body');
    var base = __M.rect(d).top;
    var kids = Array.prototype.map.call(b.children, function (k) {
      var r = __M.rect(k);
      return { el: __M.label(k), top: __M.px(r.top - base), h: __M.px(r.height) };
    });
    var ff = b.querySelector('.fields .field');
    var head = document.querySelector('.detail-head');
    return {
      panelW: __M.px(__M.rect(d).width), panelScrollH: d.scrollHeight,
      headH: __M.px(__M.rect(head).height), bodyPad: __M.cs(b).padding,
      kids: kids,
      firstFieldTop: ff ? __M.px(__M.rect(ff).top - base) : null,
      fieldsDlTop: b.querySelector('.fields') ? __M.px(__M.rect(b.querySelector('.fields')).top - base) : null
    };
  })()`);
}

const res = { mq: mediaBlocks, viewports: {} };
for (const [w, h] of [[1440, 900], [768, 1024], [390, 844]]) {
  const { browser, page } = await launchPage(w, h, { mobile: w <= 620 });
  await gotoSelection(page);
  const match = await page.eval(`(${(qs) => qs.map((q) => ({ q, m: matchMedia(q).matches }))})(${JSON.stringify(mediaBlocks.map((b) => b.query))})`);
  const blk = await blocks(page);
  const det = await detailBlocks(page);
  res.viewports[w] = { match, blk, det };
  console.log(`\n\n===== ${w}×${h} =====`);
  console.log('media 命中: ' + match.filter((x) => x.m).map((x) => x.q).join(' | '));
  console.log(JSON.stringify(blk, null, 1));
  console.log('--- detail: ' + JSON.stringify(det));
  await browser.close();
}
writeFileSync(join(HERE, 'data-p4-mq.json'), JSON.stringify(res, null, 2), 'utf8');
