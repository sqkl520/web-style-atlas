import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
const W=1200,H=800;
const BG=[0xCD,0xD3,0xD8], BG2=[0xD8,0xDD,0xE2], INK=[0x1A,0x1E,0x22], RULE=[0x8A,0x93,0x9C];
const px=new Uint8Array(W*H*3);
for(let i=0;i<W*H;i++){px[i*3]=BG[0];px[i*3+1]=BG[1];px[i*3+2]=BG[2];}
const set=(x,y,c,a=1)=>{if(x<0||y<0||x>=W||y>=H)return;const i=(y*W+x)*3;
 px[i]=Math.round(px[i]*(1-a)+c[0]*a);px[i+1]=Math.round(px[i+1]*(1-a)+c[1]*a);px[i+2]=Math.round(px[i+2]*(1-a)+c[2]*a);};
let seed=20261110;const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;};
// 纸纤维
for(let i=0;i<W*H/9;i++){const x=Math.floor(rnd()*W),y=Math.floor(rnd()*H);set(x,y,rnd()>0.5?INK:BG2,0.03);}
// 等宽字符行的示意：每 34px 一行，长度不等
for(let y=100;y<H-80;y+=34){
  const n=Math.floor(120+rnd()*700);
  for(let x=70;x<70+n;x++){ if(rnd()>0.12) set(x,y,INK,0.36); }
  // 字符间隙
  for(let x=70;x<70+n;x+=9){ for(let k=0;k<3;k++) set(x+k,y,INK,0.36); }
}
// 一条被反复覆盖的旧行（比其他行深）
for(let x=70;x<620;x++){ for(let k=0;k<2;k++) set(x,304+k,INK,0.62); }
// 扫描线
for(let y=0;y<H;y+=3){ for(let x=0;x<W;x+=1) set(x,y,RULE,0.05); }
// 右侧一块空白（终端右侧不写满）
for(let y=60;y<H-60;y++){ for(let x=W-160;x<W-20;x++) set(x,y,BG2,0.5); }
const raw=Buffer.alloc((W*3+1)*H);
for(let y=0;y<H;y++){raw[y*(W*3+1)]=0;Buffer.from(px.buffer,y*W*3,W*3).copy(raw,y*(W*3+1)+1);}
const T=(()=>{const t=new Int32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c;}return t;})();
const crc=(b)=>{let c=-1;for(let i=0;i<b.length;i++)c=T[(c^b[i])&0xff]^(c>>>8);return (c^-1)>>>0;};
const chunk=(ty,d)=>{const l=Buffer.alloc(4);l.writeUInt32BE(d.length);const body=Buffer.concat([Buffer.from(ty,'ascii'),d]);
 const c=Buffer.alloc(4);c.writeUInt32BE(crc(body));return Buffer.concat([l,body,c]);};
const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(W,0);ihdr.writeUInt32BE(H,4);ihdr[8]=8;ihdr[9]=2;
const png=Buffer.concat([Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);
mkdirSync('prototypes/S35-ash-newsprint-flip/assets',{recursive:true});
writeFileSync('prototypes/S35-ash-newsprint-flip/assets/terminal-grain.png',png);
console.log('已写 terminal-grain.png',png.length,'字节');
