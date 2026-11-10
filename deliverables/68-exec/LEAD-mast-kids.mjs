import { Browser } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = 'D:/Web/style';
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const p = join(ROOT, u);
  if (!existsSync(p)) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise(r => server.listen(8422, '127.0.0.1', r));
const browser = await Browser.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, mobile: false });
await page.goto('http://127.0.0.1:8422/prototypes/_selection/index.html', { settleMs: 1400 });

// 逐个子项量 .mast-fold 内部
const o = await page.eval(`(() => {
  const fold = document.getElementById('mast-fold');
  const kids = [...fold.children].map(c => {
    const r = c.getBoundingClientRect(); const cs = getComputedStyle(c);
    return { tag: c.tagName.toLowerCase(), cls: (c.className||'').toString().slice(0,26), h: +r.height.toFixed(1), mt: cs.marginTop, mb: cs.marginBottom, txt: (c.textContent||'').trim().slice(0,34) };
  });
  const idBox = document.querySelector('.mast-id');
  const idKids = [...idBox.children].map(c => { const r=c.getBoundingClientRect(); return { tag:c.tagName.toLowerCase(), cls:(c.className||'').toString().slice(0,24), h:+r.height.toFixed(1) }; });
  return {
    foldH: +fold.getBoundingClientRect().height.toFixed(1),
    kids,
    mastIdH: +idBox.getBoundingClientRect().height.toFixed(1),
    idKids,
    gridCols: getComputedStyle(document.querySelector('.mast')).gridTemplateColumns,
  };
})()`);
console.log('=== 1440：.mast 网格列 ===');
console.log('  ' + o.gridCols);
console.log(`\n=== .mast-id 高 ${o.mastIdH}，子项 ===`);
for (const k of o.idKids) console.log(`  ${k.tag}.${k.cls}  h=${k.h}`);
console.log(`\n=== .mast-fold 高 ${o.foldH}，子项 ===`);
for (const k of o.kids) console.log(`  ${k.tag}.${k.cls}  h=${k.h}  mt=${k.mt} mb=${k.mb}  「${k.txt}」`);

// 试算：如果把 self-gate 的 margin-top 归零，能省多少
const t1 = await page.eval(`(() => { const s=document.getElementById('self-gate'); s.style.marginTop='0'; s.style.lineHeight='1.35'; const f=document.getElementById('mast-fold').getBoundingClientRect(); const m=document.querySelector('.mast').getBoundingClientRect(); return { fold:+f.height.toFixed(1), mast:+m.height.toFixed(1), firstRow:+document.querySelector('li.row').getBoundingClientRect().top.toFixed(1) }; })()`);
console.log(`\n→ self-gate margin-top=0 + line-height 1.35: fold=${t1.fold} mast=${t1.mast} 首卡=${t1.firstRow}`);

await browser.close();
server.close();
