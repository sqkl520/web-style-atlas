// 验证使用记录：不偷偷记、能导出、能清空、失败不影响复制。
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

  const r1 = await pg.eval(`(function(){
    var out = {};
    out.hasUsageApi = typeof window.USAGE !== 'undefined';
    out.available = window.USAGE ? window.USAGE.available() : false;
    out.hasNote = !!document.querySelector('.usage-note');
    out.noteText = (document.querySelector('.usage-note summary')||{}).textContent || '';
    out.beforeStat = (document.querySelector('.usage-stat')||{}).textContent || '';
    // 直接调 API 记三条
    window.USAGE.record('S17','税票存根联','copy',{tool:'generic'});
    window.USAGE.record('S17','税票存根联','copy-prov',{withProv:true,tool:'v0'});
    window.USAGE.record('S19','铜版标本柜','download',{tool:'cursor'});
    var s = window.USAGE.summary();
    out.total = s.total; out.cases = s.cases;
    out.rows = s.rows.map(function(x){return x.id+':'+x.copies+'/'+x.downloads});
    out.mdLen = window.USAGE.toMarkdown().length;
    out.mdHasWarning = window.USAGE.toMarkdown().indexOf('项目方没有收到过任何东西') >= 0;
    // 清空
    window.USAGE.clear();
    out.afterClear = window.USAGE.summary().total;
    return JSON.stringify(out);
  })()`);
  const d = JSON.parse(r1);
  console.log('USAGE API:', d.hasUsageApi, '| available:', d.available);
  console.log('说明条存在:', d.hasNote, '|', d.noteText);
  console.log('记录 3 条后: total=' + d.total, 'cases=' + d.cases, '|', d.rows.join(' '));
  console.log('导出 md:', d.mdLen, '字节，含"数据不出本机"声明:', d.mdHasWarning);
  console.log('清空后 total:', d.afterClear);

  // 关键：点击复制按钮，看是否真的记了一笔
  const r2 = await pg.eval(`(function(){
    window.USAGE.clear();
    var captured=null;
    try{Object.defineProperty(navigator,'clipboard',{value:{writeText:function(t){captured=t;return Promise.resolve();}},configurable:true});}catch(e){}
    var b=document.querySelector('.prompt-copy');
    b.click();
    return new Promise(function(res){setTimeout(function(){
      var s=window.USAGE.summary();
      res(JSON.stringify({copied: captured?captured.length:0, total:s.total,
        id: s.rows[0]&&s.rows[0].id, copies: s.rows[0]&&s.rows[0].copies}));
    },400);});
  })()`);
  console.log('点「复制」后:', r2);
} finally { await browser.close(); server.close(); }
