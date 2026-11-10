import {readFileSync} from 'node:fs';
const s=readFileSync('D:/Web/style/prototypes/S14-zero-g-launch-sequence/index.html','utf8');
const tags=[...s.matchAll(/<article[^>]*data-code="(A-\d+)"[^>]*style="([^"]*)"/g)];
const rows=tags.map(([,code,st])=>{
  const g=k=>{const m=st.match(new RegExp('--'+k+':(-?[\\d.]+)')); return m?Number(m[1]):null;};
  return {code,dx:g('dx'),dy:g('dy'),ux:g('ux'),uy:g('uy'),w:g('w')};
});
console.log('tags',rows.length);
console.log(rows.map(r=>`${r.code} dx=${r.dx} dy=${r.dy} w=${r.w}`).join('\n'));
// angles from dx,dy (y down)
const angs=rows.map(r=>((Math.atan2(r.dy,r.dx)*180/Math.PI)+360)%360).sort((a,b)=>a-b);
console.log('\nangles(deg from +x, y-down):',angs.map(a=>a.toFixed(1)).join(' '));
const d=[]; for(let i=1;i<angs.length;i++) d.push(angs[i]-angs[i-1]);
console.log('adjacent deltas:',d.map(x=>x.toFixed(1)).join(' '));
console.log('min delta',Math.min(...d).toFixed(1),'max delta',Math.max(...d).toFixed(1));
const radii=rows.map(r=>Math.hypot(r.dx,r.dy));
console.log('radii:',radii.map(r=>r.toFixed(0)).join(' '));
