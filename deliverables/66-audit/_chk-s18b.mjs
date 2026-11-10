import { readFileSync } from "node:fs";
const t = readFileSync("prototypes/S18-phosphor-service-deck/index.html","utf8");
// 精确定位每个 pre.lines 的开始与结束
let idx=0, seg=0;
while (true) {
  const s = t.indexOf('<pre class="lines"', idx);
  if (s<0) break;
  const e = t.indexOf("</pre>", s);
  seg++;
  const body = t.slice(s, e);
  const all = (body.match(/<span class="ln[ "]/g)||[]).length;
  const out = (body.match(/<span class="ln ln--out"/g)||[]).length;
  console.log(`段${seg}: 全部 span.ln=${all}  其中 ln--out=${out}  普通=${all-out}`);
  idx = e+6;
}
console.log("总 span.ln =", (t.match(/<span class="ln[ "]/g)||[]).length);
// 页面自报
const m = t.match(/每\s*(\d+)\s*行[^<]{0,20}/);
console.log("页面自报:", m?m[0]:"(无)");
// 找 "20 行"
for (const mm of t.matchAll(/(\d+)\s*行/g)) { if (Number(mm[1])>=10) console.log("  数词:", mm[0], "上下文:", t.slice(Math.max(0,mm.index-30),mm.index+10).replace(/\s+/g," ")); }
