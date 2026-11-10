import fs from "node:fs";
const src = fs.readFileSync("prototypes/_selection/data.js","utf8");
const body = src.slice(src.indexOf("["));
const segs=[...body.matchAll(/"id":\s*"(S\d{2})"[\s\S]*?(?="id":|\]\s*;?$)/g)];
console.log("segs="+segs.length);
for (const x of segs) {
  const seg=x[0]; const i1=seg.indexOf('"audit"'), i2=seg.indexOf('"risk"');
  if(!(i1>=0&&i2>=0&&i1<i2)) console.log("FAIL",x[1],"i1="+i1,"i2="+i2,"len="+seg.length);
}
