import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
const PAGE='file:///D:/Web/style/prototypes/_selection/index.html';
const M=()=>{const en=document.querySelector('.detail-title p');return {txt:en.textContent,sw:en.scrollWidth,cw:en.clientWidth,cut:en.scrollWidth>en.clientWidth+1,h:+en.getBoundingClientRect().height.toFixed(1)};};
const SET=()=>{const en=document.querySelector('.detail-title p');en.style.whiteSpace='nowrap';en.style.overflow='hidden';en.style.textOverflow='ellipsis';return 1;};
const br=await Browser.launch({width:1440,height:900});
for(const id of ['S01','S26','S29']){
 const p=await br.newPage({width:390,height:844,dsf:2,mobile:true});
 await p.goto(PAGE+'#'+id,{settleMs:2000}); await p.eval('document.fonts.ready.then(()=>1)');
 const a=await p.eval(M); await p.eval(SET); await sleep(150); const b=await p.eval(M);
 console.log(id,'base',JSON.stringify(a)); console.log('   nowrap',JSON.stringify(b));
 await p.close();
}
await br.close();
