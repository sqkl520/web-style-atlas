import { Browser } from '../../../prototypes/_build/vendor/cdp.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
const ROOT = 'D:/Web/style';
const MIME={'.html':'text/html;charset=utf-8','.css':'text/css','.js':'text/javascript','.woff2':'font/woff2','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
  try{const rel=decodeURIComponent(req.url.split('?')[0]);const p=join(ROOT,rel);const buf=await readFile(p);
  res.writeHead(200,{'Content-Type':MIME[extname(p)]||'application/octet-stream'});
  res.end(buf);}catch(e){ if(/favicon/.test(req.url)){res.writeHead(204);res.end();return;} res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const port=server.address().port;
const b=await Browser.launch({width:1440,height:900});
const pg=await b.newPage();
await pg.setViewport({width:1440,height:900});
await pg.send('DOM.enable'); await pg.send('CSS.enable');
await pg.goto(`http://127.0.0.1:${port}/deliverables/78-northstar/_blindtest/S18/index.html`,{settleMs:800});
const doc=await pg.send('DOM.getDocument',{depth:-1});
const q=async(sel)=>{const r=await pg.send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:sel});return r.nodeId;};
for (const sel of ['body','h1','.job-id','.mast h1']){
  const nid=await q(sel); if(!nid){console.log(sel,'not found');continue;}
  try{
    const f=await pg.send('CSS.getPlatformFontsForNode',{nodeId:nid});
    console.log(sel, JSON.stringify(f.fonts));
  }catch(e){console.log(sel,'ERR',e.message);}
}
const cs=await pg.eval(`(()=>{const g=(s)=>{const e=document.querySelector(s);if(!e)return null;const c=getComputedStyle(e);return {ff:c.fontFamily,fs:c.fontSize,bg:c.backgroundColor,br:c.borderRadius,op:c.opacity};};return {html:g('html'),body:g('body'),h1:g('h1')};})()`);
console.log(JSON.stringify(cs,null,1));
await b.close();server.close();
