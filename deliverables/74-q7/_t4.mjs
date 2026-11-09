import http from 'node:http';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
const html = '<body style="margin:0"><div id="h1" style="border-top:0.5px solid #000;height:20px"></div><div id="h2" style="border-top:1px solid #000;height:20px"></div><div id="h3" style="border-top:2px solid #000;height:20px"></div></body>';
const srv = http.createServer((q, s) => { s.writeHead(200, {'Content-Type':'text/html; charset=utf-8'}); s.end(html); });
await new Promise(r => srv.listen(9611, r));
const b = await Browser.launch({ width: 800, height: 400 });
for (const dsf of [1,2]) {
  const p = await b.newPage({ width: 800, height: 400, dsf });
  await p.goto('http://localhost:9611/', { settleMs: 250 });
  const r = await p.eval(() => ['h1','h2','h3'].map(id => {
    const e = document.getElementById(id);
    return { id, h: e.getBoundingClientRect().height, bt: getComputedStyle(e).borderTopWidth };
  }));
  console.log('dsf', dsf, JSON.stringify(r));
  await p.close();
}
await b.close(); srv.close();
