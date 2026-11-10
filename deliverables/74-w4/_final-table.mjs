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
// unit-anchored token: number + optional space + unit; number may be written .5 for 0.5 or 0.50
function tokenRe(n,u){
  const forms=new Set([n]);
  if(n.startsWith('0.')) forms.add(n.slice(1));
  if(!n.includes('.')) forms.add(n+'.0');
  const alts=[...forms].map(f=>esc(f)).join('|');
  const unitPat=(u==='°'||u==='deg')?'(?:°|deg)':esc(u);
  return new RegExp('(^|[^0-9.])('+alts+')\\s*'+unitPat+'(?![0-9A-Za-z%])');
}
let rows=[];
for(const s of P.schemes){
  const d=byId.get(s.id);
  const cssRaw=readFileSync(`${ROOT}/${d}/style.css`,'utf8');
  const htmlRaw=readFileSync(`${ROOT}/${d}/index.html`,'utf8');
  const css=stripCss(cssRaw), html=stripHtml(htmlRaw);
  for(const m of (s.dna.mechanism||'').matchAll(/(\d*\.?\d+)\s*(px|fr|mm|ms|em|%|°|deg)/g)){
    const n=m[1], u=m[2];
    const re=tokenRe(n,u);
    const raw=re.test(cssRaw)||re.test(htmlRaw);
    const clean=re.test(css)||re.test(html);
    rows.push({id:s.id,tok:n+u,raw,clean});
  }
}
const tot=rows.length;
const rawY=rows.filter(r=>r.raw).length;
const cleanY=rows.filter(r=>r.clean).length;
console.log(`unit-anchored tokens: ${tot}`);
console.log(`  found incl. comments/HTML-comments : ${rawY}  (${(rawY/tot*100).toFixed(1)}%)`);
console.log(`  found with comments stripped       : ${cleanY}  (${(cleanY/tot*100).toFixed(1)}%)`);
console.log(`  comment-only                       : ${rows.filter(r=>r.raw&&!r.clean).length}  ->`, rows.filter(r=>r.raw&&!r.clean).map(r=>r.id+':'+r.tok).join(' '));
console.log(`  absent everywhere                  : ${rows.filter(r=>!r.raw).length}  ->`, rows.filter(r=>!r.raw).map(r=>r.id+':'+r.tok).join(' '));
