import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
const PAGE='file:///D:/Web/style/deliverables/67-plan/_head/index.html';
const A5JS=`function addStyle(css){var s=document.createElement('style');s.setAttribute('data-lab','1');s.textContent=css;document.head.appendChild(s);}
function railToSummary(){var rail=document.querySelector('.rail');var d=document.createElement('details');d.setAttribute('data-lab','1');
var s=document.createElement('summary');s.textContent='筛选与场景反查 · 11 组 47 颗芯片';
s.style.cssText='display:flex;align-items:center;font-size:14px;font-weight:600;padding:0 0 0 20px;min-height:48px;cursor:pointer;list-style-position:inside';
var body=document.createElement('div');while(rail.firstChild)body.appendChild(rail.firstChild);d.appendChild(s);d.appendChild(body);rail.appendChild(d);
rail.style.maxHeight='none';rail.style.overflow='visible';rail.style.padding='0 16px 6px';rail.style.borderBottom='2px solid var(--ink)';d.open=false;}
window.__A2=function(){railToSummary();return 1;};`;
const M=()=>{const vh=window.innerHeight;
 const inClosed=(el)=>{let n=el;while(n&&n!==document.body){if(n.tagName==='DETAILS'&&!n.open)return true;n=n.parentElement;}return false;};
 const vis=(el)=>{if(inClosed(el))return false;const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden')return false;const r=el.getBoundingClientRect();if(r.width<2||r.height<2)return false;return r.top>=0&&r.bottom<=vh;};
 const rail=document.querySelector('.rail').getBoundingClientRect();
 return {vh, railH:+rail.height.toFixed(1), railW:+rail.width.toFixed(1),
  chipsTotal:document.querySelectorAll('.rail .chips button').length,
  chipsVis:Array.from(document.querySelectorAll('.rail .chips button')).filter(vis).length,
  groupsVis:Array.from(document.querySelectorAll('.rail-block h2')).filter(vis).length,
  groupsTotal:document.querySelectorAll('.rail-block h2').length,
  railFrac:+((rail.height/vh)*100).toFixed(1)};};
const br=await Browser.launch({width:1440,height:900});
for(const [t,w,h,m] of [['1440',1440,900,false],['390',390,844,true]]){
 for(const [tag,js] of [['base',false],['A2-railOnly',true]]){
  const p=await br.newPage({width:w,height:h,dsf:1,mobile:m});
  await p.goto(PAGE,{settleMs:1700}); await p.eval('document.fonts.ready.then(()=>1)');
  if(js){await p.eval(A5JS);await p.eval('window.__A2()');await sleep(280);}
  console.log(t,tag.padEnd(12),JSON.stringify(await p.eval(M)));
  await p.close();
 }
}
await br.close();
