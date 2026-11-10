import fs from 'node:fs';
function parseHex(h){
  h=h.trim();
  if(/^#([0-9a-f]{3})$/i.test(h)){const s=h.slice(1);return [0,1,2].map(i=>parseInt(s[i]+s[i],16));}
  if(/^#([0-9a-f]{6})$/i.test(h)){const s=h.slice(1);return [0,2,4].map(i=>parseInt(s.slice(i,i+2),16));}
  if(/^#([0-9a-f]{8})$/i.test(h)){const s=h.slice(1);return [0,2,4].map(i=>parseInt(s.slice(i,i+2),16));}
  const m=h.match(/rgba?\(([^)]+)\)/i);
  if(m){const p=m[1].split(/[,\s\/]+/).filter(Boolean).map(Number);return [p[0],p[1],p[2],p[3]];}
  return null;
}
function lin(c){c/=255;return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4);}
function L(rgb){const [r,g,b]=rgb.map(lin);return 0.2126*r+0.7152*g+0.0722*b;}
function ratio(a,b){const la=L(a),lb=L(b);const hi=Math.max(la,lb),lo=Math.min(la,lb);return (hi+0.05)/(lo+0.05);}
function over(fg,base){const a=fg[3]===undefined?1:fg[3];return [fg[0]*a+base[0]*(1-a),fg[1]*a+base[1]*(1-a),fg[2]*a+base[2]*(1-a)];}
const ROOT='D:/Web/style/prototypes';
function vars(dir){
  const css=fs.readFileSync(`${ROOT}/${dir}/style.css`,'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
  const out={};
  for(const b of css.matchAll(/:root\s*\{([\s\S]*?)\}/g)) for(const d of b[1].split(';')){
    const m=d.match(/^\s*(--[A-Za-z0-9_-]+)\s*:\s*(.+?)\s*$/); if(m) out[m[1]]=m[2];
  }
  for(const k of Object.keys(out)) out[k]=out[k].replace(/var\((--[A-Za-z0-9_-]+)\)/g,(_,v)=>out[v]||`var(${v})`);
  return out;
}
const P={
 'S01-red-wedge-broadsheet':[['正文 ink / paper','--ink','--paper'],['铅灰 lead / paper','--lead','--paper'],['纸字 paper / 红底 red','--paper','--red'],['红字 red / paper','--red','--paper'],['ink / red（红底上的墨字）','--ink','--red'],['paper / ink（页脚墨底）','--paper','--ink']],
 'S07-slate-ink-contents':[['正文 ink / paper','--ink','--paper'],['铅灰 slate / paper（导航、图注、页码）','--slate','--paper'],['paper / slate（按钮白字）','--paper','--slate'],['deckle / paper（毛口，非文字）','--deckle','--paper']],
 'S15-fishery-floor-ledger':[['石墨 graphite / paper','--graphite','--paper'],['重压 press / paper','--press','--paper'],['铅笔 pencil / paper（细线，不载文字）','--pencil','--paper']],
 'S21-interlocking-release-book':[['ink / paper','--ink','--paper'],['ink-2(80%) / paper','--ink-2','--paper'],['amber / paper','--amber','--paper'],['paper / ink（锁条数字）','--paper','--ink'],['white / amber','--white','--amber'],['fibre / paper（非文字）','--fibre','--paper']],
 'S29-wire-bound-safety-manual':[['ink / paper','--ink','--paper'],['amber / paper','--amber','--paper'],['white / amber','#FFFFFF','--amber'],['gray / paper','--gray','--paper'],['bright / paper（装饰）','--bright','--paper'],['ink / bright（警示框编号）','--ink','--bright'],['ink / row（表行底）','--ink','--row']]
};
for(const [dir,pairs] of Object.entries(P)){
  const v=vars(dir);
  console.log(`\n### ${dir}`);
  for(const [label,fg,bg] of pairs){
    const f=parseHex(v[fg]||fg), b=parseHex(v[bg]||bg);
    if(!f||!b){console.log('  ??',label,fg,bg,v[fg],v[bg]);continue;}
    const base=[b[0],b[1],b[2]];
    const comp=over(f,base);
    const r=ratio(comp,base);
    const flag=r<3?' **FAIL<3**':r<4.5?' **FAIL<4.5**':r<7?' WARN(AA large only ok)':' ok(AAA)';
    console.log(`  ${label.padEnd(38)} ${r.toFixed(2)}:1${flag}`);
  }
}
