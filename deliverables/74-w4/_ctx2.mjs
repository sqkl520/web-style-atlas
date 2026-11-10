import {readFileSync,readdirSync} from 'node:fs';
const ROOT='D:/Web/style/prototypes';
const src='D:/Web/style/prototypes/_selection/prompts.js';
const w={window:{}};new Function('window',readFileSync(src,'utf8'))(w.window);
const P=w.window.STYLE_PROMPTS;
const dirs=readdirSync(ROOT,{withFileTypes:true}).filter(d=>d.isDirectory()&&/^S\d{2}-/.test(d.name)).map(d=>d.name);
const byId=new Map(dirs.map(d=>[d.slice(0,3),d]));
const LAYOUT=/grid-template-columns|grid-template-rows|column-count|column-gap|grid-column|grid-row|gap|width|height|max-width|min-width|max-height|min-height|padding|margin|font-size|line-height|letter-spacing|transform|background-size|border-radius|top|left|right|bottom|inset|flex-basis|flex|aspect-ratio/i;
const GENERIC=/padding|margin|border-radius|font-size|line-height|letter-spacing|top|left|right|bottom|inset|gap/i;
// for each token: does any declaration whose property is layout-ish contain it?
for(const s of P.schemes){
  const d=byId.get(s.id);
  const css=readFileSync(`${ROOT}/${d}/style.css`,'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
  const decls=css.split(/[;{}]/).map(x=>x.trim()).filter(x=>x.includes(':'));
  const mech=s.dna.mechanism||'';
  const toks=[...new Set([...mech.matchAll(/(\d*\.?\d+)\s*(px|fr|mm|ms|em|%|°)/g)].map(m=>m[1]+m[2]))];
  const genericOnly=[];
  for(const t of toks){
    const num=t.match(/\d*\.?\d+/)[0];
    const unit=t.replace(num,'');
    const uRe=(unit==='°')?'(?:°|deg)':unit;
    const re=new RegExp('(^|[^\\d.])'+num.replace(/\./g,'\\.')+'\\s*'+uRe);
    const hits=decls.filter(dl=>re.test(dl));
    if(hits.length===0){ genericOnly.push(t+'[absent]'); continue; }
    const layoutHit=hits.some(dl=>LAYOUT.test(dl.split(':')[0]));
    const onlyGeneric=!layoutHit;
    if(onlyGeneric) genericOnly.push(t+'[only:'+hits.slice(0,2).map(x=>x.split(':')[0].trim()).join('/')+']');
  }
  if(genericOnly.length) console.log(`${s.id}: ${genericOnly.join('  ')}`);
}
