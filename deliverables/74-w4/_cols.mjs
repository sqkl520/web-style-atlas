import {readFileSync,readdirSync} from 'node:fs';
const ROOT='D:/Web/style/prototypes';
const src='D:/Web/style/prototypes/_selection/prompts.js';
const w={window:{}};new Function('window',readFileSync(src,'utf8'))(w.window);
const P=w.window.STYLE_PROMPTS;
const dirs=readdirSync(ROOT,{withFileTypes:true}).filter(d=>d.isDirectory()&&/^S\d{2}-/.test(d.name)).map(d=>d.name);
const byId=new Map(dirs.map(d=>[d.slice(0,3),d]));
const strip=s=>s.replace(/\/\*[\s\S]*?\*\//g,'');
for(const s of P.schemes){
  const d=byId.get(s.id);
  const cssRaw=readFileSync(`${ROOT}/${d}/style.css`,'utf8');
  const css=strip(cssRaw);
  const mech=s.dna.mechanism||'';
  const colClaims=[...mech.matchAll(/(\d+)\s*栏/g)].map(m=>m[1]);
  if(!colClaims.length) continue;
  const grids=[...css.matchAll(/grid-template-columns\s*:\s*([^;}]+)/g)].map(m=>m[1].trim());
  const repeats=grids.filter(g=>/repeat\(/.test(g)||/\d+fr/.test(g));
  console.log(`\n### ${s.id} claims 栏: ${colClaims.join(',')}`);
  // count fr/column tokens in the primary grid
  for(const g of new Set(grids)){
    const r=g.match(/repeat\(\s*(\d+)/);
    if(r) console.log(`   repeat(${r[1]}): ${g}`);
  }
  // max column count estimate
  const counts=grids.map(g=>{
    const r=g.match(/repeat\(\s*(\d+)/);
    if(r) return +r[1];
    const parts=g.split(/\s+/).filter(Boolean);
    return parts.length;
  });
  console.log(`   grid col counts seen: ${[...new Set(counts)].join(',')}  (n=${grids.length} declarations)`);
}
