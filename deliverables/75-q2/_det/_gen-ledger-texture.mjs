// S33 的对账簿纹理。确定性：固定种子、无时间戳。
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
const W = 1200, H = 800;
const PAPER = [0x3F, 0x58, 0x55];
const PAPER2 = [0x46, 0x62, 0x5E];
const INK = [0xF2, 0xF6, 0xF5];
const RULE = [0xA8, 0xC0, 0xBD];
const px = new Uint8Array(W*H*3);
for (let i=0;i<W*H;i++){px[i*3]=PAPER[0];px[i*3+1]=PAPER[1];px[i*3+2]=PAPER[2];}
const set=(x,y,c,a=1)=>{if(x<0||y<0||x>=W||y>=H)return;const i=(y*W+x)*3;
 px[i]=Math.round(px[i]*(1-a)+c[0]*a);px[i+1]=Math.round(px[i+1]*(1-a)+c[1]*a);px[i+2]=Math.round(px[i+2]*(1-a)+c[2]*a);};
let seed=20261110;const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;};
// 纸纤维
for(let i=0;i<W*H/8;i++){const x=Math.floor(rnd()*W),y=Math.floor(rnd()*H);set(x,y,rnd()>0.5?INK:PAPER2,0.035);}
// 中缝竖线（2px）
for(let y=40;y<H-40;y++){set(W/2,y,RULE,0.85);set(W/2+1,y,RULE,0.6);}
// 左右两列的横格
for(let y=110;y<H-70;y+=38){for(let x=60;x<W/2-30;x++)set(x,y,RULE,0.28);for(let x=W/2+30;x<W-60;x++)set(x,y,RULE,0.28);}
// 被擦写留下的浅痕（中缝左侧一块）
for(let i=0;i<14000;i++){const x=W/2-190+Math.floor(rnd()*150),y=300+Math.floor(rnd()*200);set(x,y,INK,0.03);}
// 左侧几行"原话"的横线示意
for(const [y0,n] of [[152,180],[190,150],[228,200],[266,120],[304,170]]){
  for(let x=60;x<60+n;x++)set(x,y0,INK,0.42);
}
// 右侧"记账"的短行示意
for(const [y0,n] of [[152,260],[190,230],[228,280],[266,200],[304,250]]){
  for(let x=W/2+34;x<W/2+34+n;x++)set(x,y0,INK,0.30);
}
// PNG
const raw=Buffer.alloc((W*3+1)*H);
for(let y=0;y<H;y++){raw[y*(W*3+1)]=0;Buffer.from(px.buffer,y*W*3,W*3).copy(raw,y*(W*3+1)+1);}
const T=(()=>{const t=new Int32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c;}return t;})();
const crc=(b)=>{let c=-1;for(let i=0;i<b.length;i++)c=T[(c^b[i])&0xff]^(c>>>8);return (c^-1)>>>0;};
const chunk=(ty,d)=>{const l=Buffer.alloc(4);l.writeUInt32BE(d.length);const body=Buffer.concat([Buffer.from(ty,'ascii'),d]);
 const c=Buffer.alloc(4);c.writeUInt32BE(crc(body));return Buffer.concat([l,body,c]);};
const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(W,0);ihdr.writeUInt32BE(H,4);ihdr[8]=8;ihdr[9]=2;
const png=Buffer.concat([Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);
mkdirSync('prototypes/S33-teal-mirror-ledger/assets',{recursive:true});
writeFileSync('prototypes/S33-teal-mirror-ledger/assets/ledger-rule.png',png);
console.log('已写 ledger-rule.png',png.length,'字节');
