import http from 'node:http';
import { writeFileSync } from 'node:fs';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { decodePNG } from './_png.mjs';
const html=`<body style="margin:0;background:#E7E7E0">
<div style="height:40px"></div>
<div style="border-left:0.5px solid #1C1A16;height:40px"></div>
<div style="height:40px"></div>
<div style="border-left:1px solid #1C1A16;height:40px"></div>
<div style="height:40px"></div>
<div style="position:relative;height:40px"><i style="position:absolute;left:0;top:0;bottom:0;width:0.5px;background:#1C1A16"></i></div>
<div style="height:40px"></div>
<div style="position:relative;height:40px"><i style="position:absolute;left:0;top:0;bottom:0;width:1px;background:#1C1A16"></i></div>
</body>`;
const srv=http.createServer((q,s)=>{s.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});s.end(html);});
await new Promise(r=>srv.listen(9613,r));
const b=await Browser.launch({width:300,height:400});
const p=await b.newPage({width:300,height:400,dsf:1});
await p.goto('http://localhost:9613/',{settleMs:300});
const raw=Buffer.from(await p.screenshot({format:'png'}),'base64');
writeFileSync('shots/_lines.png',raw);
const {w,h,bpp,px}=decodePNG(raw);
const y0=20; // row 1 center (40..80 => y=60)
function scan(y){
  const vals=[];
  for(let x=0;x<8;x++){const i=(y*w+x)*bpp;vals.push(px[i]);}
  return vals;
}
for(const [name,y] of [['border .5',60],['border 1',140],['box .5',220],['box 1',300]]) console.log(name, JSON.stringify(scan(y)));
await b.close();srv.close();
