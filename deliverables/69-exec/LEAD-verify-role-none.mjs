// 验证 role="none" 改动不改变任何渲染：几何签名 + AX 语义
import { Browser } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { createServer } from 'node:http';
import { readFileSync, existsSync, readdirSync, writeFileSync } from 'node:fs';
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
await new Promise(r => server.listen(8602, '127.0.0.1', r));
const browser = await Browser.launch({ headless: true });
const page = await browser.newPage();

for (const id of ['S07', 'S13', 'S21']) {
  const dirs = readdirSync(join(ROOT, 'prototypes')).filter(d => d.startsWith(id + '-'));
  for (const [w, h] of [[1440, 900], [768, 1024], [390, 844]]) {
    await page.setViewport({ width: w, height: h, mobile: w < 500 });
    await page.goto(`http://127.0.0.1:8602/prototypes/${dirs[0]}/index.html`, { settleMs: 2200 });

    const o = await page.eval(`(() => {
      // 几何签名：所有可见元素的 rect（0.01px 精度）拼串
      const parts = [];
      for (const el of document.querySelectorAll('*')) {
        const r = el.getBoundingClientRect();
        if (r.width < 0.5 || r.height < 0.5) continue;
        parts.push(el.tagName + ':' + r.width.toFixed(2) + ',' + r.height.toFixed(2) + '@' + r.top.toFixed(2) + ',' + r.left.toFixed(2));
      }
      // 文本节点的 rect（更敏感）
      const tparts = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        if (!n.nodeValue || !n.nodeValue.trim()) continue;
        const el = n.parentElement; if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 0.5) continue;
        tparts.push(r.width.toFixed(2) + 'x' + r.height.toFixed(2) + '@' + r.top.toFixed(2));
      }
      return {
        elems: parts.length,
        sig: parts.join('|').length,
        sigHash: (() => { let h = 0; const s = parts.join('|'); for (let i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; } return h; })(),
        textHash: (() => { let h = 0; const s = tparts.join('|'); for (let i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; } return h; })(),
        docH: document.documentElement.scrollHeight,
        codeCount: document.querySelectorAll('code').length,
        codeWithRoleNone: document.querySelectorAll('code[role="none"]').length,
      };
    })()`);
    // AX
    await page.send('Accessibility.enable');
    const tree = await page.send('Accessibility.getFullAXTree');
    const axCode = (tree.nodes || []).filter(x => x.role && x.role.value === 'code').length;

    console.log(`${id} ${w}x${h}: 元素 ${o.elems}  sigHash ${o.sigHash}  textHash ${o.textHash}  docH ${o.docH}  code ${o.codeCount}(role=none ${o.codeWithRoleNone})  AX code=${axCode}`);
  }
}
await browser.close();
server.close();
