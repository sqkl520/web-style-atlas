import {readFileSync,readdirSync,existsSync} from 'node:fs';
const ROOT='D:/Web/style';
const src=readFileSync(ROOT+'/prototypes/_selection/prompts.js','utf8');
const w={window:{}};new Function('window',src)(w.window);
const P=w.window.STYLE_PROMPTS;
const dirs=readdirSync(ROOT+'/prototypes',{withFileTypes:true}).filter(d=>d.isDirectory()&&/^S\d{2}-/.test(d.name)).map(d=>d.name);
const byId=new Map(dirs.map(d=>[d.slice(0,3),d]));
const strip=s=>s.replace(/\/\*[\s\S]*?\*\//g,'');
for(const s of P.schemes){
  const d=byId.get(s.id);
  const cssRaw=readFileSync(`${ROOT}/prototypes/${d}/style.css`,'utf8');
  const html=readFileSync(`${ROOT}/prototypes/${d}/index.html`,'utf8');
  const css=strip(cssRaw);
  const mech=s.dna.mechanism||'';
  // tokens: number+unit, and number+chinese counter
  const toks=[...new Set([...mech.matchAll(/(-?\d*\.?\d+)\s*(px|fr|mm|ms|em|%|°|deg|x)?(?=\s*(栏|列|层|档|级|枚|块|处|条|行|字|倍|组|个|点|片|页|格))?/g)].map(m=>m[1]))];
  const units=[...mech.matchAll(/(-?\d*\.?\d+)\s*(px|fr|mm|ms|em|%|°)/g)].map(m=>m[0].replace(/\s+/g,''));
  console.log(`\n=== ${s.id}`);
  const missing=[];
  for(const u of units){
    const num=u.match(/-?\d*\.?\d+/)[0];
    const raw=u.replace(/°|deg/,'');
    const parts=[num];
    const hit = new RegExp('(^|[^\d.])'+num.replace('.','\.')+'(?![\d])').test(css) || new RegExp('(^|[^\d.])'+num.replace('.','\.')+'(?![\d])').test(html);
    if(!hit) missing.push(u);
  }
  console.log(' units:',units.join(' '));
  console.log(' NOT-LITERAL:',missing.join(' ')||'(none)');
}
