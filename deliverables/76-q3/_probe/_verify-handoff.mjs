// 真浏览器验证 Q3 第四项。所有字符串处理都在 Node 侧，页面只返回原始文本。
import { Browser } from '../../../prototypes/_build/vendor/cdp.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
const ROOT = decodeURIComponent(new URL('../../..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const MIME = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2' };
const server = createServer(async (req,res)=>{try{let rel=decodeURIComponent(req.url.split('?')[0]);if(rel.endsWith('/'))rel+='index.html';
  const p=join(ROOT,rel);const b=await readFile(p);res.writeHead(200,{'Content-Type':MIME[extname(p)]||'application/octet-stream','Cache-Control':'no-store'});res.end(b);}
  catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser = await Browser.launch(); const pg = await browser.newPage();
try {
  await pg.goto(`http://127.0.0.1:${server.address().port}/prototypes/_selection/#S17`, { settleMs: 2500 });

  const meta = JSON.parse(await pg.eval(`JSON.stringify({
    btns: [].map.call(document.querySelectorAll('.prompt-copy'), function(b){return b.textContent.trim()}),
    options: [].map.call(document.querySelectorAll('#prompt-tool-select option'), function(o){return o.value}),
    defaultVal: (document.querySelector('#prompt-tool-select')||{}).value
  })`));
  console.log('按钮:', meta.btns.join(' / '));
  console.log('工具选择器选项:', meta.options.join(' '), '| 默认:', meta.defaultVal);

  for (const tool of ['generic', 'chatgpt', 'claude', 'v0', 'cursor']) {
    const raw = await pg.eval(`window.buildStylePrompt('S17', {tool: ${JSON.stringify(tool)}}) || ''`);
    const head = raw.split('\n').slice(0, 3).filter(Boolean).join(' ⏎ ');
    console.log(`\n[${tool}] ${raw.length} 字`);
    console.log('  首三行:', head.slice(0, 130));
  }

  const v0hard = await pg.eval(`window.buildStylePrompt('S15', {tool:'v0'}) || ''`);
  console.log('\n[v0 + S15（hard 案）] 首部 320 字：');
  console.log(v0hard.slice(0, 320));

  // 下载：截获 Blob
  const dl = await pg.eval(`(function(){
    var cap=null;
    var OrigBlob = window.Blob;
    window.Blob = function(parts, opts){ cap = {text: parts.join(''), type: opts && opts.type}; return new OrigBlob(parts, opts); };
    var a0 = document.createElement;
    var clicked = null;
    document.createElement = function(tag){ var el = a0.call(document, tag);
      if (tag === 'a') { el.click = function(){ clicked = {href: el.href, download: el.download}; }; }
      return el; };
    var btn = [].slice.call(document.querySelectorAll('.prompt-copy')).filter(function(b){return /下载/.test(b.textContent)})[0];
    if (!btn) return JSON.stringify({err:'没有下载按钮'});
    btn.click();
    document.createElement = a0; window.Blob = OrigBlob;
    return JSON.stringify({ hasBlob: !!cap, bytes: cap?cap.text.length:0, type: cap?cap.type:'',
      filename: clicked?clicked.download:'', head: cap?cap.text.slice(0,300):'' });
  })()`);
  const d = JSON.parse(dl);
  console.log('\n[下载 .md]');
  console.log('  Blob:', d.hasBlob, '| 字节:', d.bytes, '| 类型:', d.type);
  console.log('  文件名:', d.filename);
  console.log('  文件头:', (d.head||'').replace(/\n/g, ' ⏎ ').slice(0, 200));
} finally { await browser.close(); server.close(); }
