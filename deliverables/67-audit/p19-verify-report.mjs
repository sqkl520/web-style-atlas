// p19-verify-report.mjs — 逐条复核 mobile-budget.md 里被我写进结论的数字，防自己写错。
import { HERE, PAGE_HEAD, PAGE_NOW } from './lib-measure.mjs';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const checks = [];
function ck(name, got, want, tol = 0.15) {
  const ok = typeof want === 'number' ? Math.abs(got - want) <= tol : got === want;
  checks.push({ name, got, want, ok });
}

async function withPage(url, w, h, fn) {
  const br = await Browser.launch({ width: w, height: h });
  const p = await br.newPage({ width: w, height: h, mobile: w <= 620 });
  await p.setViewport({ width: w, height: h, mobile: w <= 620 });
  await p.goto(url, { settleMs: 1400 });
  const r = await fn(p);
  await br.close();
  return r;
}

// 1) HEAD 390 列表
const head = await withPage(PAGE_HEAD, 390, 844, (p) => p.eval(`(async () => {
  await (async function(){ if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch(e){} } })();
  var R = function (s) { var e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().height * 10) / 10 : null; };
  var T = function (s) { var e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().top * 10) / 10 : null; };
  var f = document.querySelector('#ledger .row');
  return { mast: R('.mast'), rail: R('.rail'), bar: R('.bar'), firstTop: T('#ledger .row'), firstH: R('#ledger .row'),
    mainTopPad: getComputedStyle(document.querySelector('.main')).paddingTop,
    docH: document.documentElement.scrollHeight };
})()`));

// 2) 详情面板 HEAD 390 S01 首字段 & 30 案
const det = await withPage(PAGE_HEAD, 390, 844, async (p) => {
  return p.eval(`(async () => {
    var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    var ids = Array.from(document.querySelectorAll('#ledger .row')).map(function (r) { return r.getAttribute('data-id'); });
    var hs = [], ffs = [];
    for (var i = 0; i < ids.length; i++) {
      location.hash = '#' + ids[i]; await sleep(80);
      var d = document.querySelector('#detail'), base = d.getBoundingClientRect().top;
      var ff = d.querySelector('#d-body .fields .field');
      hs.push(d.scrollHeight);
      ffs.push(ff ? Math.round((ff.getBoundingClientRect().top - base) * 10) / 10 : null);
    }
    var h2 = hs.slice().sort(function (a, b) { return a - b; });
    var f2 = ffs.slice().sort(function (a, b) { return a - b; });
    return { min: h2[0], max: h2[h2.length - 1], avg: Math.round(hs.reduce(function (a, b) { return a + b; }, 0) / hs.length),
      over3800: hs.filter(function (h) { return h > 3800; }).length, over3000: hs.filter(function (h) { return h > 3000; }).length,
      ffMin: f2[0], ffMax: f2[f2.length - 1],
      ffOver: ffs.filter(function (x) { return x + 179.6 > 844; }).length };
  })()`);
});

// 3) NOW 390 列表 + 1440 回归
const now390 = await withPage(PAGE_NOW, 390, 844, (p) => p.eval(`(async () => {
  await (async function(){ if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch(e){} } })();
  var R = function (s) { var e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().height * 10) / 10 : null; };
  var T = function (s) { var e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().top * 10) / 10 : null; };
  return { mast: R('.mast'), rail: R('.rail'), bar: R('.bar'), firstTop: T('#ledger .row'), firstH: R('#ledger .row'),
    docH: document.documentElement.scrollHeight, screens: Math.round(document.documentElement.scrollHeight / innerHeight * 100) / 100 };
})()`));
const now1440 = await withPage(PAGE_NOW, 1440, 900, (p) => p.eval(`(async () => {
  await (async function(){ if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch(e){} } })();
  var T = function (s) { var e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().top * 10) / 10 : null; };
  var R = function (s) { var e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().height * 10) / 10 : null; };
  var vh = innerHeight, full = 0;
  document.querySelectorAll('#ledger .row').forEach(function (r) { var b = r.getBoundingClientRect(); if (b.top >= 0 && b.bottom <= vh) full++; });
  return { firstTop: T('#ledger .row'), firstH: R('#ledger .row'), full: full, screens: Math.round(document.documentElement.scrollHeight / vh * 100) / 100 };
})()`));

ck('HEAD390 .mast', head.mast, 453.4);
ck('HEAD390 .rail', head.rail, 337.6);
ck('HEAD390 .bar', head.bar, 145.0);
ck('HEAD390 首卡top', head.firstTop, 954.0);
ck('HEAD390 首卡高', head.firstH, 577.8);
ck('HEAD390 docH', head.docH, 17308, 1);
ck('HEAD main 上内距', head.mainTopPad, '16px');
ck('HEAD390 详情 min', det.min, 3538, 1);
ck('HEAD390 详情 max', det.max, 4668, 1);
ck('HEAD390 详情 avg', det.avg, 4205, 2);
ck('HEAD390 >3800 案数', det.over3800, 24);
ck('HEAD390 >3000 案数', det.over3000, 30);
ck('HEAD390 首字段 min', det.ffMin, 606.4);
ck('HEAD390 首字段 max', det.ffMax, 669.6);
ck('HEAD390 首字段跨844的案数', det.ffOver, 3);

ck('NOW390 .mast', now390.mast, 276.6);
ck('NOW390 .rail', now390.rail, 52.0);
ck('NOW390 .bar', now390.bar, 93.9);
ck('NOW390 首卡top', now390.firstTop, 440.5);
ck('NOW390 首卡高', now390.firstH, 430.2);
ck('NOW390 屏数', now390.screens, 15.2, 0.02);
ck('NOW1440 首卡top', now1440.firstTop, 421.1);
ck('NOW1440 完整卡', now1440.full, 1);
ck('NOW1440 屏数', now1440.screens, 9.78, 0.02);

console.log('\n=== 复核（got vs 报告里写的）');
let bad = 0;
for (const c of checks) {
  if (!c.ok) bad++;
  console.log(`${c.ok ? '  ✓' : '  ✗'} ${c.name.padEnd(26)} got=${c.got}  want=${c.want}`);
}
console.log(`\n${checks.length - bad}/${checks.length} 通过`);
