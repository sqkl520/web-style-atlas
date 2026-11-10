import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import vm from "node:vm";
const read = (p) => readFileSync(p, "utf8").replace(/^\uFEFF/,"");
const documentStub = { readyState:"complete", addEventListener(){}, removeEventListener(){}, getElementById(){return null;}, querySelectorAll(){return [];}, createElement(){return {style:{},setAttribute(){},appendChild(){},addEventListener(){},classList:{toggle(){}}};}, body:{appendChild(){},removeChild(){}} };
const sandbox = { console, document: documentStub, navigator:{}, setTimeout };
sandbox.window = sandbox; sandbox.globalThis = sandbox;
const ctx = vm.createContext(sandbox);
vm.runInContext(read("prototypes/_selection/data.js"), ctx, {filename:"data.js"});
vm.runInContext(read("prototypes/_selection/prompts.js"), ctx, {filename:"prompts.js"});
// 用 NOW 版本
vm.runInContext(read("deliverables/66-audit/frozen-prompt-copy-NOW.js"), ctx, {filename:"prompt-copy-NOW.js"});
const bp = sandbox.window.buildStylePrompt;
mkdirSync("deliverables/66-audit/prompts-live", {recursive:true});
const P = sandbox.window.STYLE_PROMPTS;
let out=[];
for (const s of P.schemes) {
  const t = bp(s.id, {biz:"",action:""});
  writeFileSync("deliverables/66-audit/prompts-live/"+s.id+".txt", t, "utf8");
  out.push({id:s.id, len:t.length, hasOld: /我实际有 \d+ 个/.test(t), hasNew: /用你自己的真实数量排/.test(t)});
}
console.log("dumped " + out.length);
console.log("仍含「我实际有 N 个条目」：" + out.filter(x=>x.hasOld).length);
console.log("已改成「用你自己的真实数量排」：" + out.filter(x=>x.hasNew).length);
console.log("长度 min/max: " + Math.min(...out.map(x=>x.len)) + "/" + Math.max(...out.map(x=>x.len)));
