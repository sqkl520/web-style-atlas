// p8-recheck-frozen.mjs — 在冻结快照上复测基线，确认「改动前」的数字可复现，并给出改动后的对照。
import { join } from 'node:path';
import { HERE, INPAGE } from './lib-measure.mjs';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const FROZEN = 'file:///' + join(HERE, 'frozen', 'index.html').replace(/\\/g, '/');
const LIVE = 'file:///D:/Web/style/prototypes/_selection/index.html';

async function probe(url, w, h) {
  const br = await Browser.launch({ width: w, height: h });
  const p = await br.newPage({ width: w, height: h, mobile: w <= 620 });
  await p.setViewport({ width: w, height: h, mobile: w <= 620 });
  await p.goto(url, { settleMs: 1200 });
  const r = await p.eval(`(async () => {
    ${INPAGE}
    await (async function(){ if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch(e){} } })();
    var rows = Array.prototype.slice.call(document.querySelectorAll('#ledger .row'));
    var vh = innerHeight;
    var hs = rows.map(function (r) { return __M.rect(r).height; });
    var full = 0;
    rows.forEach(function (r) { var b = __M.rect(r); if (b.top >= 0 && b.bottom <= vh) full++; });
    var first = rows[0] ? __M.rect(rows[0]) : null;
    var R = function (s) { var e = document.querySelector(s); return e ? __M.px(__M.rect(e).height) : null; };
    return {
      rows: rows.length,
      mast: R('.mast'), rail: R('.rail'), bar: R('.bar'),
      firstRowTop: first ? __M.px(first.top) : null, firstRowH: first ? __M.px(first.height) : null,
      fullCards: full,
      docScrollH: document.documentElement.scrollHeight,
      closes: document.querySelectorAll('#d-body .field-fold summary').length
    };
  })()`);
  await br.close();
  return r;
}

async function detail(url, w, h) {
  const br = await Browser.launch({ width: w, height: h });
  const p = await br.newPage({ width: w, height: h, mobile: w <= 620 });
  await p.setViewport({ width: w, height: h, mobile: w <= 620 });
  await p.goto(url, { settleMs: 1200 });
  const r = await p.eval(`(async () => {
    ${INPAGE}
    await (async function(){ if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch(e){} } })();
    var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    var ids = Array.from(document.querySelectorAll('#ledger .row')).map(function (r) { return r.getAttribute('data-id'); });
    var out = [];
    for (var i = 0; i < ids.length; i++) {
      location.hash = '#' + ids[i];
      await sleep(95);
      var d = document.querySelector('#detail'), base = __M.rect(d).top, vh = innerHeight;
      var ff = d.querySelector('#d-body .fields .field');
      var fr = Array.prototype.map.call(d.querySelectorAll('#d-body .fields > .field'), function (f) {
        var r = __M.rect(f); return { top: r.top - base, bottom: r.bottom - base };
      });
      out.push({ id: ids[i], scrollH: d.scrollHeight,
        firstFieldTop: ff ? __M.px(__M.rect(ff).top - base) : null,
        full: fr.filter(function (x) { return x.top >= 0 && x.bottom <= vh; }).length,
        folded: d.querySelectorAll('#d-body .fields > .field-field-fold, #d-body .field-fold').length,
        summaries: d.querySelectorAll('#d-body .field-fold > details > summary').length });
    }
    return out;
  })()`);
  await br.close();
  return r;
}

for (const [label, url] of [['HEAD(frozen)', FROZEN], ['工作区(现)', LIVE]]) {
  const l390 = await probe(url, 390, 844);
  const l1440 = await probe(url, 1440, 900);
  console.log(`\n===== ${label}`);
  console.log('  390  列表: ' + JSON.stringify(l390));
  console.log('  1440 列表: ' + JSON.stringify(l1440));
  const d390 = await detail(url, 390, 844);
  const hs = d390.map((x) => x.scrollH).sort((a, b) => a - b);
  const ff = d390.map((x) => x.firstFieldTop).sort((a, b) => a - b);
  console.log(`  390  详情: scrollH ${hs[0]}–${hs[hs.length - 1]} (avg ${Math.round(hs.reduce((a, b) => a + b) / 30)})  屏max ${(hs[hs.length - 1] / 844).toFixed(2)}  首字段 ${ff[0]}–${ff[ff.length - 1]}  首屏完整字段 ${(d390.reduce((a, b) => a + b.full, 0) / 30).toFixed(1)}  summary数=${d390[0].summaries}`);
  const d1440 = await detail(url, 1440, 900);
  const hs2 = d1440.map((x) => x.scrollH).sort((a, b) => a - b);
  console.log(`  1440 详情: scrollH ${hs2[0]}–${hs2[hs2.length - 1]} (avg ${Math.round(hs2.reduce((a, b) => a + b) / 30)})  首字段 ${d1440.map(x=>x.firstFieldTop).sort((a,b)=>a-b)[0]}`);
}
