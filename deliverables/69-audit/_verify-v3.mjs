import { Browser, openPage, settle, sleep, setSort } from './lib.mjs';
const PORT='8901';
const br = await Browser.launch({width:1200,height:900});
const p = await openPage(br,{width:390,height:844,mobile:true,dsf:2});
await p.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/`,{settleMs:1200});
await settle(p,1500);
const css = `.shots{display:none!important}
  .row{grid-template-columns:46px minmax(0,1fr)!important;gap:6px;padding:7px 0}
  .row-head h3{font-size:16px}
  .row-def{font-size:14px;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .row-family{display:none}
  .row-meta{margin-top:2px;font-size:12px}
  .row-foot{font-size:12px;line-height:1.35}`;
await p.eval(`(()=>{const s=document.createElement('style');s.textContent=${JSON.stringify(css)};document.head.appendChild(s);return 1})()`);
await sleep(800);
const r = await p.eval(`(()=>{
  const imgs=[...document.querySelectorAll('#ledger img')];
  const vis=imgs.filter(i=>i.getBoundingClientRect().width>0).length;
  const rows=[...document.querySelectorAll('#ledger .row')]; const vh=innerHeight;
  const ft=rows[0].getBoundingClientRect().top+scrollY;
  return { ledgerImgs: imgs.length, visibleImgs: vis,
    full: rows.filter(el=>{const b=el.getBoundingClientRect();return b.top>=-0.5&&b.bottom<=vh+0.5;}).length,
    sh: document.documentElement.scrollHeight, screens:+(document.documentElement.scrollHeight/vh).toFixed(3),
    ledgerH: +(document.querySelector('#ledger').getBoundingClientRect().height).toFixed(1),
    cardSum: +rows.reduce((a,e)=>a+e.getBoundingClientRect().height,0).toFixed(1) };
})()`);
console.log('V3 密集视图:', JSON.stringify(r,null,1));
console.log('ledger 占比 = ' + ((r.ledgerH/r.sh)*100).toFixed(2) + '%');
await br.close(); process.exit(0);
