function hslOf(R,G,B){const r0=R/255,g0=G/255,b0=B/255;const mx=Math.max(r0,g0,b0),mn=Math.min(r0,g0,b0),l=(mx+mn)/2;
 let h=0,s=0;if(mx!==mn){const d=mx-mn;s=l>0.5?d/(2-mx-mn):d/(mx+mn);
 if(mx===r0)h=(g0-b0)/d+(g0<b0?6:0);else if(mx===g0)h=(b0-r0)/d+2;else h=(r0-g0)/d+4;h*=60;}
 return {h,s:s*100,l:l*100};}
function labL(R,G,B){const f=v=>{v/=255;return v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4);};
 const r=f(R),g=f(G),b=f(B);const Y=r*0.2126+g*0.7152+b*0.0722;
 const t=v=>v>0.008856?Math.cbrt(v):(7.787*v+16/116);return 116*t(Y)-16;}
function hsl2rgb(h,s,L){const c=(1-Math.abs(2*L-1))*s,x=c*(1-Math.abs(((h/60)%2)-1)),m=L-c/2;
 let r=0,g=0,b=0;if(h<60){r=c;g=x;}else if(h<120){r=x;g=c;}else if(h<180){g=c;b=x;}
 else if(h<240){g=x;b=c;}else if(h<300){r=x;b=c;}else{r=c;b=x;}
 return [Math.round((r+m)*255),Math.round((g+m)*255),Math.round((b+m)*255)];}
const bandOfHSL=l=>l>=78?'浅':l<=22?'暗':'中';
const bandOfLab=l=>l>=82?'浅':l<=30?'暗':'中';
for(const [h,s,label] of [[42,0.30,'暖纸 H42 S30%'],[45,0.90,'亮黄 H45 S90%'],[205,0.32,'冷蓝 H205 S32%'],[0,0.0,'纯灰 S0%']]){
  console.log('\n=== '+label+' ===');
  console.log('HSL-L  Lab-L*  RGB            band(HSL)  band(Lab)');
  for(let l=55;l<=95;l+=5){
    const [R,G,B]=hsl2rgb(h,s,l/100);
    const hs=Math.round(hslOf(R,G,B).l), lb=Math.round(labL(R,G,B));
    console.log(String(hs).padStart(5),String(lb).padStart(7),'  rgb('+R+','+G+','+B+')'.padEnd(17),
      bandOfHSL(hs).padEnd(10),bandOfLab(lb));
  }
}
console.log('\n=== 在 HSL l=78 这条线上，不同饱和度的 Lab L* ===');
console.log('S%    RGB             Lab-L*   Lab 的带');
for(const s of [0,10,20,30,40,50,60,70,80,90,100]){
  const [R,G,B]=hsl2rgb(45,s/100,0.78);
  const lb=Math.round(labL(R,G,B));
  console.log(String(s).padStart(3),'  rgb('+R+','+G+','+B+')'.padEnd(17),String(lb).padStart(6),'   '+bandOfLab(lb));
}
