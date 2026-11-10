import {readFileSync,readdirSync} from 'node:fs';
const ROOT='D:/Web/style/prototypes';
const src='D:/Web/style/prototypes/_selection/prompts.js';
const w={window:{}};new Function('window',readFileSync(src,'utf8'))(w.window);
const P=w.window.STYLE_PROMPTS;
const dirs=readdirSync(ROOT,{withFileTypes:true}).filter(d=>d.isDirectory()&&/^S\d{2}-/.test(d.name)).map(d=>d.name);
const byId=new Map(dirs.map(d=>[d.slice(0,3),d]));
const strip=s=>s.replace(/\/\*[\s\S]*?\*\//g,'').replace(/<!--[\s\S]*?-->/g,'');
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
let tot=0, okAll=0, okStripped=0, onlyComment=0;
const onlyCommentList=[];
for(const s of P.schemes){
  const d=byId.get(s.id);
  const cssRaw=readFileSync(`${ROOT}/${d}/style.css`,'utf8');
  const htmlRaw=readFileSync(`${ROOT}/${d}/index.html`,'utf8');
  const css=strip(cssRaw), html=strip(htmlRaw);
  const mech=s.dna.mechanism||'';
  const toks=[...mech.matchAll(/(\d*\.?\d+)\s*(px|fr|mm|ms|em|%|°)/g)].map(m=>({n:m[1],u:m[2]}));
  for(const {n,u} of toks){
    tot++;
    const ur=(u==='°')?'(?:°|deg)':esc(u);
    const numAlt='(?:0?'+esc(n)+'|'+esc(n)+')';
    const reU=new RegExp('(^|[^\\d.])'+numAlt+'\\s*'+ur);
    const reBare=new RegExp('(^|[^\\d.])'+esc(n)+'(?![\\d.])');
    const raw = reU.test(cssRaw)||reU.test(htmlRaw)||reBare.test(cssRaw)||reBare.test(htmlRaw);
    const str = reU.test(css)||reU.test(html)||reBare.test(css)||reBare.test(html);
    if(raw) okAll++;
    if(str) okStripped++;
    if(raw&&!str){ onlyComment++; onlyCommentList.push(`${s.id}:${n}${u}`); }
  }
}
console.log(`tokens=${tot}  found-including-comments=${okAll}  found-comments-stripped=${okStripped}  comment-only=${onlyComment}`);
console.log('comment-only tokens:', onlyCommentList.join(' '));
