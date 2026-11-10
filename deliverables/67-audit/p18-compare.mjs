// p18-compare.mjs — 三份状态并排：HEAD（改动前）/ NOW（我钉住的快照）/ LIVE（现在的工作区）。
import { HERE, PAGE_HEAD, PAGE_NOW, PAGE_LIVE } from './lib-measure.mjs';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const rows = [];
for (const [lbl, url] of [['HEAD', PAGE_HEAD], ['NOW', PAGE_NOW], ['LIVE', PAGE_LIVE]]) {
  const br = await Browser.launch({ width: 390, height: 844 });
  const p = await br.newPage({ width: 390, height: 844, mobile: true });
  await p.setViewport({ width: 390, height: 844, mobile: true });
  await p.goto(url, { settleMs: 1400 });
  const r = await p.eval(`(async () => {
    await (async function(){ if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch(e){} } })();
    var q = function (s) { return document.querySelector(s); };
    var R = function (s) { var e = q(s); return e ? Math.round(e.getBoundingClientRect().height * 10) / 10 : null; };
    var T = function (s) { var e = q(s); return e ? Math.round(e.getBoundingClientRect().top * 10) / 10 : null; };
    var first = q('#ledger .row'); var fb = first ? first.getBoundingClientRect() : null;
    var vh = innerHeight;
    return {
      mast: R('.mast'), rail: R('.rail'), bar: R('.bar'),
      firstTop: fb ? Math.round(fb.top * 10) / 10 : null,
      firstH: fb ? Math.round(fb.height * 10) / 10 : null,
      visiblePct: fb ? Math.round(Math.max(0, Math.min(fb.bottom, vh) - fb.top) / fb.height * 1000) / 10 : 0,
      docH: document.documentElement.scrollHeight, screens: Math.round(document.documentElement.scrollHeight / vh * 100) / 100,
      folds: document.querySelectorAll('.rail-fold, .mast-fold, .bar-fold').length,
      railMax: q('.rail') ? getComputedStyle(q('.rail')).maxHeight : null
    };
  })()`);
  rows.push({ lbl, ...r });
  await br.close();
}
for (const r of rows) console.log(JSON.stringify(r));
