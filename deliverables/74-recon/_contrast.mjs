import fs from 'node:fs';
const clamp=v=>Math.min(1,Math.max(0,v));
function parseHex(h){
  h=h.trim();
  if(/^#([0-9a-f]{3})$/i.test(h)){const s=h.slice(1);return [0,1,2].map(i=>parseInt(s[i]+s[i],16));}
  if(/^#([0-9a-f]{6})$/i.test(h)){const s=h.slice(1);return [0,2,4].map(i=>parseInt(s.slice(i,i+2),16));}
  if(/^#([0-9a-f]{8})$/i.test(h)){const s=h.slice(1);return [0,2,4].map(i=>parseInt(s.slice(i,i+2),16));}
  const m=h.match(/rgba?\(([^)]+)\)/i);
  if(m){const p=m[1].split(/[,\s\/]+/).filter(Boolean).map(Number);return [p[0],p[1],p[2]];}
  return null;
}
function lin(c){c/=255;return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4);}
function L(rgb){const [r,g,b]=rgb.map(lin);return 0.2126*r+0.7152*g+0.0722*b;}
function ratio(a,b){const la=L(a),lb=L(b);const hi=Math.max(la,lb),lo=Math.min(la,lb);return (hi+0.05)/(lo+0.05);}
// alpha composite of rgba over a base
function over(fg,base){const [r,g,b]=fg;const a=(fg[3]===undefined?1:fg[3]);return [r*a+base[0]*(1-a),g*a+base[1]*(1-a),b*a+base[2]*(1-a)];}

const ROOT='D:/Web/style/prototypes';
function rootVars(dir){
  const css=fs.readFileSync(`${ROOT}/${dir}/style.css`,'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
  const out={};
  for(const b of css.matchAll(/:root\s*\{([\s\S]*?)\}/g)){
    for(const d of b[1].split(';')){
      const m=d.match(/^\s*(--[A-Za-z0-9_-]+)\s*:\s*(.+?)\s*$/);
      if(m) out[m[1]]=m[2];
    }
  }
  // resolve one level of var()
  for(const k of Object.keys(out)){
    out[k]=out[k].replace(/var\((--[A-Za-z0-9_-]+)\)/g,(_,v)=>out[v]||`var(${v})`);
  }
  return out;
}
const cases=process.argv.slice(2);
for(const dir of cases){
  const vars=rootVars(dir);
  console.log(`\n### ${dir}`);
  const colors={};
  for(const [k,v] of Object.entries(vars)){
    if(/^#|^rgb/i.test(v.trim())){const p=parseHex(v);if(p)colors[k]={raw:v.trim(),rgb:p};}
  }
  for(const [k,v] of Object.entries(colors)) console.log(`  ${k} = ${v.raw}  (L=${L(v.rgb).toFixed(4)})`);
}
