import {readFileSync,readdirSync} from 'node:fs';
const ROOT='D:/Web/style/prototypes';
const src='D:/Web/style/prototypes/_selection/prompts.js';
const w={window:{}};new Function('window',readFileSync(src,'utf8'))(w.window);
const P=w.window.STYLE_PROMPTS;
const dirs=readdirSync(ROOT,{withFileTypes:true}).filter(d=>d.isDirectory()&&/^S\d{2}-/.test(d.name)).map(d=>d.name);
const byId=new Map(dirs.map(d=>[d.slice(0,3),d]));
const esc=(s)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
for(const s of P.schemes){
  const d=byId.get(s.id);
  const css=readFileSync(`${ROOT}/${d}/style.css`,'utf8');
  const html=readFileSync(`${ROOT}/${d}/index.html`,'utf8');
  const mech=s.dna.mechanism||'';
  for(const m of mech.matchAll(/(\d*\.?\d+)\s*(px|fr|mm|ms|em|%|°)/g)){
    const n=m[1],u=m[2];
    const re=new RegExp('(^|[^\\d.])'+esc(n)+'(?![\\d.])');
    if(!re.test(css)&&!re.test(html)) console.log('MISSING',s.id,n+u,'|',mech.slice(0,50));
  }
}
