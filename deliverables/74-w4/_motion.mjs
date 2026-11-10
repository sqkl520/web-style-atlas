import {readFileSync,readdirSync} from 'node:fs';
const ROOT='D:/Web/style/prototypes';
const src='D:/Web/style/prototypes/_selection/prompts.js';
const w={window:{}};new Function('window',readFileSync(src,'utf8'))(w.window);
const P=w.window.STYLE_PROMPTS;
const dirs=readdirSync(ROOT,{withFileTypes:true}).filter(d=>d.isDirectory()&&/^S\d{2}-/.test(d.name)).map(d=>d.name).sort();
const byId=new Map(dirs.map(d=>[d.slice(0,3),d]));
const MOTION=/(滚动|悬停|随|按下|进入视口|点击|漂移|动画|跟随|滑|过渡|回位|相位|抽|翻|收|移动|展开|落|变)/;
let frozen=[];
for(const s of P.schemes){
  const m=s.dna.mechanism||'';
  const d=byId.get(s.id);
  const html=readFileSync(`${ROOT}/${d}/index.html`,'utf8');
  let js=[...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('');
  for(const sr of html.matchAll(/<script[^>]*\bsrc=["']([^"']+)["']/g)){
    try{ js+=readFileSync(`${ROOT}/${d}/${sr[1]}`,'utf8'); }catch{}
  }
  const css=readFileSync(`${ROOT}/${d}/style.css`,'utf8');
  const hasAnim=/@keyframes/.test(css);
  const hasMotionJs=/scroll|requestAnimationFrame|IntersectionObserver|transition|mouse|pointer/i.test(js);
  const mechMotion=MOTION.test(m);
  if(!mechMotion && (hasAnim||hasMotionJs)) frozen.push({id:s.id,hasAnim,hasMotionJs});
}
console.log('schemes whose mechanism names no motion but prototype does move:',frozen.length,'/30');
console.log(frozen.map(f=>f.id+(f.hasAnim?'(css-anim)':'')+(f.hasMotionJs?'(js)':'')).join(' '));
