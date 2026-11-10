// 纯净 A/B：同一次加载，运行时切换 role="none"，测几何是否变化
import { Browser } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { createServer } from 'node:http';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = 'D:/Web/style';
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf' };
const server = createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const p = join(ROOT, u);
  if (!existsSync(p)) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise(r => server.listen(8603, '127.0.0.1', r));
const browser = await Browser.launch({ headless: true });
const page = await browser.newPage();

const MEASURE = `(() => {
  const parts = [];
  for (const el of document.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (r.width < 0.5 || r.height < 0.5) continue;
    parts.push(el.tagName + ':' + r.width.toFixed(2) + ',' + r.height.toFixed(2) + '@' + r.top.toFixed(2) + ',' + r.left.toFixed(2));
  }
  const s = parts.join('|');
  let h = 0; for (let i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
  // 文本 rect
  const tp = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    if (!n.nodeValue || !n.nodeValue.trim()) continue;
    const el = n.parentElement; if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 0.5) continue;
    tp.push(r.width.toFixed(2) + 'x' + r.height.toFixed(2) + '@' + r.top.toFixed(2));
  }
  const ts = tp.join('|');
  let th = 0; for (let i = 0; i < ts.length; i++) { th = ((th << 5) - th + ts.charCodeAt(i)) | 0; }
  return { elems: parts.length, sigHash: h, textHash: th, docH: document.documentElement.scrollHeight, axPending: true };
})()`;

for (const id of ['S07', 'S13', 'S21']) {
  const dirs = readdirSync(join(ROOT, 'prototypes')).filter(d => d.startsWith(id + '-'));
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    await page.setViewport({ width: w, height: h, mobile: w < 500 });
    await page.goto(`http://127.0.0.1:8603/prototypes/${dirs[0]}/index.html`, { settleMs: 2200 });

    // A：现状（有 role=none）
    const A = await page.eval(MEASURE);
    await page.send('Accessibility.enable');
    let tree = await page.send('Accessibility.getFullAXTree');
    const axA = (tree.nodes || []).filter(x => x.role && x.role.value === 'code').length;

    // B：运行时移除 role
    await page.eval(`(() => { for (const c of document.querySelectorAll('code[role="none"]')) c.removeAttribute('role'); })()`);
    await new Promise(r => setTimeout(r, 350));
    const B = await page.eval(MEASURE);
    tree = await page.send('Accessibility.getFullAXTree');
    const axB = (tree.nodes || []).filter(x => x.role && x.role.value === 'code').length;

    const same = A.sigHash === B.sigHash && A.textHash === B.textHash && A.docH === B.docH && A.elems === B.elems;
    console.log(`${id} ${w}x${h}: 有role ${A.sigHash}/${A.textHash}/${A.elems}  AX=${axA}  |  无role ${B.sigHash}/${B.textHash}/${B.elems}  AX=${axB}  → 几何${same ? ' ✓ 完全相同' : ' ✗ 不同'}`);
  }
}
await browser.close();
server.close();
