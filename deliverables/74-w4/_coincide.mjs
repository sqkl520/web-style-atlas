import {readFileSync,readdirSync} from 'node:fs';
const ROOT='D:/Web/style/prototypes';
const src='D:/Web/style/prototypes/_selection/prompts.js';
const w={window:{}};new Function('window',readFileSync(src,'utf8'))(w.window);
const P=w.window.STYLE_PROMPTS;
const dirs=readdirSync(ROOT,{withFileTypes:true}).filter(d=>d.isDirectory()&&/^S\d{2}-/.test(d.name)).map(d=>d.name);
const byId=new Map(dirs.map(d=>[d.slice(0,3),d]));
const stripCss=s=>s.replace(/\/\*[\s\S]*?\*\//g,'');
const stripHtml=s=>s.replace(/<!--[\s\S]*?-->/g,'');
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
// property families each noun implies
const FAMILY={
 'px':/^(width|height|min-width|min-height|max-width|max-height|gap|column-gap|row-gap|padding|margin|top|left|right|bottom|inset|grid-template-columns|grid-template-rows|grid-column|grid-row|font-size|line-height|letter-spacing|border|border-\w+|outline|column-rule|stroke-width|flex-basis|background-size)/i,
};
let coincidental=[], anchored=[], absent=[];
for(const s of P.schemes){
  const d=byId.get(s.id);
  const css=stripCss(readFileSync(`${ROOT}/${d}/style.css`,'utf8'));
  const html=stripHtml(readFileSync(`${ROOT}/${d}/index.html`,'utf8'));
  const mech=s.dna.mechanism||'';
  const decls=css.split(/[;{}]/).map(x=>x.trim()).filter(x=>x.includes(':'));
  for(const m of mech.matchAll(/(\d*\.?\d+)\s*(px|fr|mm|ms|em|%|°|deg)/g)){
    const n=m[1], u=(m[2]==='deg'?'°':m[2]);
    const unitPat=(u==='°')?'(?:°|deg)':esc(u);
    const re=new RegExp('(^|[^\\d.])'+esc(n)+'\\s*'+unitPat+'(?![\\dA-Za-z%])');
    const inCss=decls.filter(dl=>re.test(dl));
    const inCssRaw=re.test(css);
    const inHtml=re.test(html);
    const tok=n+u;
    if(!inCssRaw && !inHtml){ absent.push(`${s.id}:${tok}`); continue; }
    if(!inCss.length){ coincidental.push(`${s.id}:${tok}`+(inHtml?'(html-only)':'')); continue; }
    const props=inCss.map(dl=>dl.split(':')[0].trim().toLowerCase());
    const anyProp=FAMILY[u]? props.some(p=>FAMILY[u].test(p)) : true;
    if(anyProp) anchored.push(`${s.id}:${tok}`); else coincidental.push(`${s.id}:${tok}(${props.slice(0,2).join('/')})`);
  }
}
console.log('anchored (number sits in a plausible layout declaration):',anchored.length);
console.log('coincidental (number exists but only in implausible properties / HTML text):',coincidental.length);
console.log(coincidental.join('\n'));
console.log('\nabsent:',absent.length,absent.join(' '));
