// 线上验证：出处功能在公网上真的能用。
// 判据全部在 Node 侧算，页面只负责返回剪贴板原文 —— 避免正则嵌套转义出错。
import { Browser } from '../../../prototypes/_build/vendor/cdp.mjs';
const browser = await Browser.launch();
const pg = await browser.newPage();
try {
  await pg.goto('https://sqkl520.github.io/web-style-atlas/prototypes/_selection/#S17', { settleMs: 4000 });
  const ready = await pg.eval(`new Promise(function(res){var t0=Date.now();(function p(){
    if(document.querySelectorAll('#ledger .row').length>0) return res(true);
    if(Date.now()-t0>25000) return res(false); setTimeout(p,150);})();})`);
  if (!ready) { console.log('未就绪'); process.exit(1); }

  const raw = await pg.eval(`(function(){
    var captured=null;
    try{ Object.defineProperty(navigator,'clipboard',{value:{writeText:function(t){captured=t;return Promise.resolve();}},configurable:true});}catch(e){}
    var pb=document.querySelector('.prompt-copy-prov');
    if(pb) pb.click();
    return new Promise(function(res){setTimeout(function(){ res(captured||''); },500);});
  })()`);
  const meta = await pg.eval(`JSON.stringify({
    rows: document.querySelectorAll('#ledger .row').length,
    btns: [].map.call(document.querySelectorAll('.prompt-copy'), function(b){return b.textContent.trim()}),
    prov: typeof window.PROVENANCE!=='undefined' ? window.PROVENANCE.length : 0
  })`);
  const d = JSON.parse(meta);

  const refs = (raw.match(/第 \d+ 行/g) || []).length;
  const hasAppendix = raw.indexOf('下面这段是给出处的') >= 0;

  console.log('线上：行数', d.rows, '| 按钮', d.btns.join(' / '));
  console.log('     provenance 记录', d.prov, '案');
  console.log('     复制长度', raw.length, '字，含附录:', hasAppendix, '，行号', refs, '处');
  console.log('');
  console.log('附录尾段：');
  console.log(raw.slice(-320));
} finally { await browser.close(); }
