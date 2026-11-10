import { createServer } from "node:http";
import { readFileSync } from "node:fs";
const html = `<!doctype html><style>table{border-collapse:separate}</style><table><tr><th>a</th><td>b</td></tr></table>`;
const s = createServer((q, r) => { r.writeHead(200, {"Content-Type":"text/html; charset=utf-8"}); r.end(html); });
await new Promise((r) => s.listen(8755, "127.0.0.1", r));
const { spawn } = await import("node:child_process");
const ch = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new","--remote-debugging-port=9370","--user-data-dir=D:/Web/style/deliverables/70-exec/probes-b/_chromeUA","--no-first-run","--disable-gpu","about:blank"], { stdio: "ignore" });
const wait = async (u) => { for (let i=0;i<100;i++){ try{ if((await fetch(u)).ok) return; }catch{} await new Promise(r=>setTimeout(r,200)); } throw new Error("t"); };
await wait("http://127.0.0.1:9370/json/version");
let p = (await (await fetch("http://127.0.0.1:9370/json/list")).json()).find(t=>t.type==="page");
const ws = new WebSocket(p.webSocketDebuggerUrl);
await new Promise((res,rej)=>{ws.onopen=res;ws.onerror=rej;});
let id=0; const pend=new Map();
ws.onmessage=(e)=>{const m=JSON.parse(e.data); if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);}};
const send=(method,params={})=>{const i=++id;return new Promise(r=>{pend.set(i,r);ws.send(JSON.stringify({id:i,method,params}));});};
await send("Page.enable"); await send("Runtime.enable");
await send("Page.navigate",{url:"http://127.0.0.1:8755/"});
await new Promise(r=>setTimeout(r,800));
const r = await send("Runtime.evaluate",{expression:`(function(){
  var out=[];
  document.querySelectorAll('th,td').forEach(function(el){
    var cs=getComputedStyle(el);
    out.push({tag:el.tagName, bt:cs.borderTopWidth, bs:cs.borderTopStyle, bl:cs.borderLeftWidth, bls:cs.borderLeftStyle});
  });
  return JSON.stringify(out);
})()`,returnByValue:true});
console.log(r.result.result.value);
ws.close(); ch.kill(); s.close(); process.exit(0);
