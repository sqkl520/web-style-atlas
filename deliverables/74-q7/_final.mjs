import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
const b = await Browser.launch({ width: 1280, height: 900 });
const p = await b.newPage({ width: 1280, height: 900 });
await p.goto('file:///D:/Web/style/deliverables/74-q7/out-S17-c.html', { settleMs: 800 });
const r = await p.eval(`(()=>{
 const o={};
 const h1=getComputedStyle(document.querySelector('h1'));
 o.h1={size:h1.fontSize,ratio:+(parseFloat(h1.fontSize)/parseFloat(getComputedStyle(document.body).fontSize)).toFixed(3),align:h1.textAlign};
 o.bodySize=getComputedStyle(document.body).fontSize;
 o.overflowX=document.documentElement.scrollWidth-document.documentElement.clientWidth;
 o.foldBottom=Math.round(document.querySelector('.ctl').getBoundingClientRect().bottom+window.scrollY);
 o.vh=window.innerHeight;
 o.ctaCount=document.querySelectorAll('.cta').length;
 o.mainActions=[...document.querySelectorAll('a,button,[role=button]')].length;
 o.cols=[...new Set([...document.querySelectorAll('.mast-grid,.ctl,.slip,.slip-close,.ledger,.terms,.foot-grid,.sec-head')].map(e=>getComputedStyle(e).gridTemplateColumns))];
 o.amount={w:[...new Set([...document.querySelectorAll('.amount')].map(e=>Math.round(e.getBoundingClientRect().width)))],dot:[...new Set([...document.querySelectorAll('.amount')].map(e=>{const t=e.firstChild,i=t.textContent.indexOf('.');const g=document.createRange();g.setStart(t,i);g.setEnd(t,i+1);return +g.getBoundingClientRect().left.toFixed(2);}))]};
 o.rows=[...new Set([...document.querySelectorAll('.stub-facts > div')].map(e=>Math.round(e.getBoundingClientRect().height)))];
 o.radii=[...new Set([...document.querySelectorAll('*')].map(e=>getComputedStyle(e).borderRadius).filter(v=>v&&v!=='0px'))];
 o.shadows=[...new Set([...document.querySelectorAll('*')].map(e=>getComputedStyle(e).boxShadow).filter(v=>v&&v!=='none'))].length;
 const ws=new Set(); for(const e of document.querySelectorAll('body *')){const s=getComputedStyle(e);for(const k of ['borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth']){const v=s[k];if(v&&v!=='0px')ws.add(v);}}
 for(const e of document.querySelectorAll('svg *')){const v=getComputedStyle(e).strokeWidth; if(v&&v!=='0px')ws.add(v);}
 o.lineWidths=[...ws].sort();
 o.colors=[...new Set([...document.querySelectorAll('body *')].map(e=>getComputedStyle(e).color).filter(v=>v&&v!=='rgba(0, 0, 0, 0)'))].sort();
 o.bgs=[...new Set([...document.querySelectorAll('body *')].map(e=>getComputedStyle(e).backgroundColor).filter(v=>v&&v!=='rgba(0, 0, 0, 0)'))].sort();
 o.nums=[...new Set([...document.querySelectorAll('.num')].map(e=>getComputedStyle(e).fontVariantNumeric))];
 o.imgs=[...document.images].map(i=>{const q=i.getBoundingClientRect();return [i.getAttribute('src'),i.getAttribute('width')+'x'+i.getAttribute('height'),Math.round(q.width)+'x'+Math.round(q.height),+(q.width/q.height).toFixed(3)];});
 o.perfs=[...new Set([...document.querySelectorAll('.perf,.ctl-perf,.slip-perf,.close-perf')].map(e=>getComputedStyle(e).backgroundSize))];
 o.script=document.querySelectorAll('script').length;
 o.styles=document.querySelectorAll('style').length;
 o.slipCount=document.querySelectorAll('.slip').length;
 o.ids=[...new Set([...document.querySelectorAll('.stub-no,.chip,.slip')].map(e=>e.getAttribute('data-no')||e.textContent.trim().slice(0,6)).filter(Boolean))];
 return o;
})()`);
console.log(JSON.stringify(r,null,1));
await b.close?.();
