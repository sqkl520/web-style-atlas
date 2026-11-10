import {readFileSync,readdirSync} from 'node:fs';
const ROOT='D:/Web/style/prototypes';
const dirs=readdirSync(ROOT,{withFileTypes:true}).filter(d=>d.isDirectory()&&/^S\d{2}-/.test(d.name)).map(d=>d.name).sort();
const FEATS=[['gBCR',/getBoundingClientRect/],['IO',/IntersectionObserver/],['rAF',/requestAnimationFrame/],['scrollEv',/addEventListener\(\s*['"]scroll/],['resizeEv',/addEventListener\(\s*['"]resize/],['mouse',/mouseenter|mousemove|pointermove|mouseover/],['matchMedia',/matchMedia/],['canvas',/<canvas|getContext/],['svgNS',/createElementNS/],['domBuild',/createElement\(/],['clipboard',/clipboard/],['classToggle',/classList\./]];
for(const d of dirs){
  const html=readFileSync(`${ROOT}/${d}/index.html`,'utf8');
  const blocks=[...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
  let js=blocks.join('\n');
  // external scripts
  const srcs=[...html.matchAll(/<script[^>]*\bsrc=["']([^"']+)["']/g)].map(m=>m[1]);
  let extLen=0;
  for(const s of srcs){ try{ const t=readFileSync(`${ROOT}/${d}/${s}`,'utf8'); js+='\n'+t; extLen+=t.length; }catch(e){} }
  const feats=FEATS.filter(([k,re])=>re.test(js)).map(([k])=>k);
  console.log(`${d.slice(0,3)} inline=${blocks.join('').length}B ext=${extLen}B feats=${feats.join(',')||'none'}`);
}
