import {readFileSync,readdirSync} from 'node:fs';
const ROOT='D:/Web/style';
const src=readFileSync(ROOT+'/prototypes/_selection/prompts.js','utf8');
const w={window:{}};new Function('window',src)(w.window);
const P=w.window.STYLE_PROMPTS;
const dirs=readdirSync(ROOT+'/prototypes',{withFileTypes:true}).filter(d=>d.isDirectory()&&/^S\d{2}-/.test(d.name)).map(d=>d.name);
const byId=new Map(dirs.map(d=>[d.slice(0,3),d]));
const strip=s=>s.replace(/\/\*[\s\S]*?\*\//g,'');
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
let total=0, missTotal=0;
const report=[];
for(const s of P.schemes){
  const d=byId.get(s.id);
  const css=strip(readFileSync(`${ROOT}/prototypes/${d}/style.css`,'utf8'));
  const html=readFileSync(`${ROOT}/prototypes/${d}/index.html`,'utf8');
  const mech=s.dna.mechanism||'';
  const units=[...mech.matchAll(/(-?\d*\.?\d+)\s*(px|fr|mm|ms|em|%|°|deg)/g)].map(m=>({n:m[1],u:m[2]}));
  total+=units.length;
  const miss=[];
  for(const {n,u} of units){
    const unitRe = (u==='°'||u==='deg') ? '(?:°|deg)' : esc(u);
    const re = new RegExp('(^|[^\\d.])'+esc(n)+'\\s*'+unitRe+'(?![\\w%])');
    const reLoose = new RegExp('(^|[^\\d.])'+esc(n)+'\\s*'+unitRe);
    if(!reLoose.test(css)&&!reLoose.test(html)) miss.push(n+u);
  }
  missTotal+=miss.length;
  report.push([s.id, units.length, miss]);
  if(miss.length) console.log(`${s.id}: NOT-LITERAL ${miss.join(' ')}`);
}
console.log(`\ntotal unit tokens ${total}, not-literal ${missTotal}`);
// also: bare numbers with counters (栏/层/档/级/枚/块/处/条/行/倍/个/组/页/格)
let cntTotal=0, cntMiss=0;
console.log('\n--- bare-number-with-counter tokens ---');
for(const s of P.schemes){
  const mech=s.dna.mechanism||'';
  const ms=[...mech.matchAll(/(\d+)\s*(栏|层|档|级|枚|块|处|条|行|倍|个|组|页|格|列|种|分之一)/g)];
  if(ms.length) console.log(s.id, ms.map(m=>m[1]+m[2]).join(' '));
}
