import fs from "node:fs";
const d = fs.readFileSync("prototypes/_selection/data.js","utf8");
global.window={}; new Function("window",d)(global.window);
const S = global.window.SCHEMES;
const TPL = {
  M01: ["律所","咨询","软件服务","设计工作室","代理商"],
  M02: ["餐厅","咖啡馆","烘焙","民宿","理发店","花店"],
  M03: ["个人作品集","自由职业者","小型创意工作室","摄影师","设计师","写作者"],
};
const hits=[];
for(const s of S){
  const yes=String(s.scenesYes||"");
  const h=Object.entries(TPL).filter(([k,v])=>v.some(t=>yes.includes(t))).map(([k])=>k);
  if(h.length) hits.push(s.id+"("+h.join(",")+")");
}
console.log("有模板交集的案:", hits.length, "/30 →", hits.join(" "));
const none = S.filter(s=>{const yes=String(s.scenesYes||"");
  return !Object.values(TPL).some(v=>v.some(t=>yes.includes(t)));}).map(s=>s.id);
console.log("无交集:", none.length, none.join(","));
