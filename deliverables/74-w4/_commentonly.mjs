import {readFileSync,readdirSync} from 'node:fs';
const ROOT='D:/Web/style/prototypes';
const src='D:/Web/style/prototypes/_selection/prompts.js';
const w={window:{}};new Function('window',readFileSync(src,'utf8'))(w.window);
const P=w.window.STYLE_PROMPTS;
const dirs=readdirSync(ROOT,{withFileTypes:true}).filter(d=>d.isDirectory()&&/^S\d{2}-/.test(d.name)).map(d=>d.name);
const byId=new Map(dirs.map(d=>[d.slice(0,3),d]));
const stripCss=s=>s.replace(/\/\*[\s\S]*?\*\//g,'');
const stripHtml=s=>s.replace(/<!--[\s\S]*?-->/g,'');

let total=0; const commentOnly=[]; const absent=[];
for(const s of P.schemes){
  const d=byId.get(s.id);
  const cssRaw=readFileSync(`${ROOT}/${d}/style.css`,'utf8');
  const htmlRaw=readFileSync(`${ROOT}/${d}/index.html`,'utf8');
  const css=stripCss(cssRaw), html=stripHtml(htmlRaw);
  const mech=s.dna.mechanism||'';
  for(const m of mech.matchAll(/(\d*\.?\d+)\s*(px|fr|mm|ms|em|%|°|deg)/g)){
    total++;
    const n=m[1], u=(m[2]==='deg'?'°':m[2]);
    const numPat='(?:\\.?'+n.replace(/^0\./,'.')+'|0?\\.?'+n.replace(/^0\./,'')+')';
    // simple robust: build alternation of forms
    const forms=[n];
    if(n.startsWith('0.')) forms.push(n.slice(1));
    if(!n.includes('.')) forms.push(n+'.0');
    const unitPat=(u==='°')?'(?:°|deg)':u;
    const build=(str)=>{
      // token = number + optional space + unit, not preceded/followed by digit
      const alts=forms.map(f=>f.replace(/\./g,'\\.')).join('|');
      return new RegExp('(^|[^0-9.])('+alts+')\\s*'+unitPat+'(?![0-9A-Za-z%])');
    };
    const re=build();
    const inRaw=re.test(cssRaw)||re.test(htmlRaw);
    const inClean=re.test(css)||re.test(html);
    if(!inClean){
      if(inRaw) commentOnly.push(`${s.id}:${n}${u}`);
      else absent.push(`${s.id}:${n}${u}`);
    }
  }
}
console.log('unit tokens total',total);
console.log('only in comments:',commentOnly.length, commentOnly.join(' '));
console.log('absent entirely:',absent.length, absent.join(' '));
