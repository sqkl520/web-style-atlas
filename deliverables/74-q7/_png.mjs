import zlib from 'node:zlib';
export function decodePNG(buf){
  let p=8,w=0,h=0,bd=0,ct=0,idat=[];
  while(p<buf.length){
    const len=buf.readUInt32BE(p); const type=buf.toString('ascii',p+4,p+8);
    const data=buf.subarray(p+8,p+8+len);
    if(type==='IHDR'){w=data.readUInt32BE(0);h=data.readUInt32BE(4);bd=data[8];ct=data[9];}
    else if(type==='IDAT') idat.push(data);
    else if(type==='IEND') break;
    p+=12+len;
  }
  const raw=zlib.inflateSync(Buffer.concat(idat));
  const ch = ct===6?4:ct===2?3:ct===0?1:0;
  const bpp=ch*(bd/8); const stride=w*bpp;
  const out=Buffer.alloc(w*h*bpp);
  let prev=Buffer.alloc(stride);
  for(let y=0;y<h;y++){
    const f=raw[y*(stride+1)];
    const line=raw.subarray(y*(stride+1)+1,(y+1)*(stride+1));
    const cur=Buffer.alloc(stride);
    for(let i=0;i<stride;i++){
      const a=i>=bpp?cur[i-bpp]:0,b=prev[i],c=i>=bpp?prev[i-bpp]:0; let v=line[i];
      if(f===1)v+=a; else if(f===2)v+=b; else if(f===3)v+=(a+b)>>1;
      else if(f===4){const pp=a+b-c,pa=Math.abs(pp-a),pb=Math.abs(pp-b),pc=Math.abs(pp-c);v+=(pa<=pb&&pa<=pc)?a:(pb<=pc?b:c);}
      cur[i]=v&255;
    }
    cur.copy(out,y*stride); prev=cur;
  }
  return {w,h,bpp,px:out};
}
