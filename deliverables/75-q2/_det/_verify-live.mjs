// 线上验证：35 个新案是否真的能在选型台上渲染出来、筛选是否工作。
import { Browser } from '../../../prototypes/_build/vendor/cdp.mjs';
const browser = await Browser.launch();
const pg = await browser.newPage();
try {
  await pg.goto('https://sqkl520.github.io/web-style-atlas/prototypes/_selection/', { settleMs: 3500 });
  const ready = await pg.eval(`new Promise(function(res){var t0=Date.now();(function p(){
    if(document.querySelectorAll('#ledger .row').length>0) return res(true);
    if(Date.now()-t0>25000) return res(false); setTimeout(p,150);})();})`);
  if (!ready) { console.log('页面未就绪'); process.exit(1); }
  const out = await pg.eval(`(function(){
    var rows=[].map.call(document.querySelectorAll('#ledger .row'),function(r){return r.getAttribute('data-id')});
    var inp=document.getElementById('q');
    inp.value='S34'; inp.dispatchEvent(new Event('input',{bubbles:true}));
    var s34=document.querySelectorAll('#ledger .row').length;
    inp.value=''; inp.dispatchEvent(new Event('input',{bubbles:true}));
    return JSON.stringify({ total: rows.length, hasNew: rows.filter(function(x){return /^S3[1-5]$/.test(x)}),
      searchS34: s34, count: document.getElementById('count').textContent });
  })()`);
  const d = JSON.parse(out);
  console.log('线上选型台：');
  console.log('  渲染行数:', d.total);
  console.log('  新案可见:', d.hasNew.join(' ') || '（无）');
  console.log('  搜「S34」命中:', d.searchS34, '行');
  console.log('  #count:', d.count);
} finally { await browser.close(); }
