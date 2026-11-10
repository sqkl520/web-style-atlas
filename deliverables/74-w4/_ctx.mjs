import {readFileSync,readdirSync} from 'node:fs';
const ROOT='D:/Web/style/prototypes';
const src=readFileSync('D:/Web/style/prototypes/_selection/prompts.js','utf8');
const w={window:{}};new Function('window',src)(w.window);
const P=w.window.STYLE_PROMPTS;
const dirs=readdirSync(ROOT,{withFileTypes:true}).filter(d=>d.isDirectory()&&/^S\d{2}-/.test(d.name)).map(d=>d.name);
const byId=new Map(dirs.map(d=>[d.slice(0,3),d]));
const only=process.argv[2];
for(const s of P.schemes){
  if(only && s.id!==only) continue;
  const d=byId.get(s.id);
  const css=readFileSync(`${ROOT}/${d}/style.css`,'utf8');
  const html=readFileSync(`${ROOT}/${d}/index.html`,'utf8');
  const mech=s.dna.mechanism||'';
  console.log(`\n############ ${s.id}  ${mech}`);
  const nums=[...new Set([...mech.matchAll(/\d*\.?\d+/g)].map(m=>m[0]))];
  for(const n of nums){
    const re=new RegExp('(^|[^\\d.])'+n.replace(/\./g,'\\.')+'(?![\\d])','g');
    const hitsCss=[...css.matchAll(re)].map(m=>{
      const i=m.index; const line=css.slice(0,i).split('\n').length;
      const text=css.split('\n')[line-1].trim().slice(0,140);
      return `css:${line} ${text}`;
    });
    const hitsHtml=[...html.matchAll(re)].map(m=>{
      const i=m.index; const line=html.slice(0,i).split('\n').length;
      const text=html.split('\n')[line-1].trim().slice(0,120);
      return `html:${line} ${text}`;
    });
    const all=[...hitsCss,...hitsHtml];
    console.log(`  [${n}] ${all.length} hits`);
    for(const h of all.slice(0,6)) console.log('     '+h);
  }
}
