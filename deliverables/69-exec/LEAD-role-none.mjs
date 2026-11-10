// 验证：<code> 加 role="none" 能否消掉 AX 语义？probe 的 inCode 判据还成立吗？
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
await new Promise(r => server.listen(8601, '127.0.0.1', r));
const browser = await Browser.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, mobile: false });

const dirs = readdirSync(join(ROOT, 'prototypes')).filter(d => d.startsWith('S07-'));
await page.goto(`http://127.0.0.1:8601/prototypes/${dirs[0]}/index.html`, { settleMs: 2000 });

// 1) 基线：AX 里 role=code 的节点数
await page.send('Accessibility.enable');
let tree = await page.send('Accessibility.getFullAXTree');
const before = (tree.nodes || []).filter(n => n.role && n.role.value === 'code').length;
console.log(`=== S07 基线 ===`);
console.log(`  AX role="code" 节点: ${before}`);

// 2) 注入 role="none" 到所有 <code>
await page.eval(`(() => { for (const c of document.querySelectorAll('code')) c.setAttribute('role','none'); return document.querySelectorAll('code').length; })()`);
await new Promise(r => setTimeout(r, 400));
tree = await page.send('Accessibility.getFullAXTree');
const after = (tree.nodes || []).filter(n => n.role && n.role.value === 'code').length;
console.log(`  加 role="none" 后 AX role="code": ${after}  （${before} → ${after}）`);

// 3) 关键：probe 的 inCode 判据还成立吗？（closest('code,pre,kbd,samp')）
await page.goto(`http://127.0.0.1:8601/prototypes/${dirs[0]}/index.html`, { settleMs: 2000 });
await page.eval(`(() => { for (const c of document.querySelectorAll('code')) c.setAttribute('role','none'); })()`);
const stillInCode = await page.eval(`(() => {
  const codes = [...document.querySelectorAll('code')];
  if (!codes.length) return { total: 0 };
  // 复刻 probe.mjs: closest('code,pre,kbd,samp')
  let hit = 0, miss = 0;
  for (const c of codes) {
    const txt = (c.textContent||'').trim();
    if (!txt) continue;
    // probe 用的是文本节点的 parentElement.closest
    const parent = c.firstChild && c.firstChild.nodeType === 3 ? c : c;
    if (parent.closest('code,pre,kbd,samp')) hit++; else miss++;
  }
  return { total: codes.length, hit, miss };
})()`);
console.log(`  closest('code,pre,kbd,samp') 仍命中: ${stillInCode.hit} / ${stillInCode.total}（miss ${stillInCode.miss}）`);

// 4) 另一种方案：aria-hidden="true" —— 但那样整段文字对屏幕阅读器消失，更糟
console.log('\n=== 三种方案的代价对比 ===');
console.log('  (a) 接受 <code>:            AX 会被念"代码"；但 inCode 判据成立，闸门绿');
console.log('  (b) role="none":            AX 角色消掉；closest() 仍命中原生标签名 → 闸门应该仍绿（上面已测）');
console.log('  (c) aria-hidden="true":     整段文字对屏幕阅读器不可见 —— 绝对不行');
console.log('  (d) <span class="mono">:    视觉不变；但 inCode 不成立 → mono FAIL 回来');

// 5) 验证 (b) 对闸门的影响：只看 inCode 判据是否成立
console.log(`\n→ 结论：(b) role="none" ${stillInCode.hit === stillInCode.total ? '✓ 不影响 inCode 判据，可以先加来消 AX 语义' : '✗ 会影响'}`);

await browser.close();
server.close();
