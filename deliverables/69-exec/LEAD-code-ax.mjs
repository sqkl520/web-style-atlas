// 核实 <code> 的 AX 语义代价：屏幕阅读器会念成什么
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
await new Promise(r => server.listen(8600, '127.0.0.1', r));
const browser = await Browser.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, mobile: false });

for (const id of ['S07', 'S13', 'S21']) {
  const dirs = readdirSync(join(ROOT, 'prototypes')).filter(d => d.startsWith(id + '-'));
  await page.goto(`http://127.0.0.1:8600/prototypes/${dirs[0]}/index.html`, { settleMs: 2000 });

  const o = await page.eval(`(() => {
    const codes = [...document.querySelectorAll('code')];
    return {
      codeCount: codes.length,
      samples: codes.slice(0, 6).map(c => ({
        text: (c.textContent||'').trim().slice(0, 24),
        parent: c.parentElement ? c.parentElement.tagName.toLowerCase() + '.' + (c.parentElement.className||'').toString().slice(0,18) : '?',
        // 有没有 ARIA 覆盖
        role: c.getAttribute('role') || '(无)',
        ariaHidden: c.getAttribute('aria-hidden') || '(无)',
      })),
      // 统计 code 里都是什么内容
      kinds: (() => {
        const k = { 数字: 0, 时间: 0, 编号: 0, 中文: 0, 混合: 0, 其他: 0 };
        for (const c of codes) {
          const t = (c.textContent||'').trim();
          if (!t) continue;
          if (/^[\\d.]+$/.test(t)) k.数字++;
          else if (/^\\d{1,2}:\\d{2}/.test(t)) k.时间++;
          else if (/^[A-Z]-?\\d/.test(t) || /^[A-Z]{1,3}\\d/.test(t)) k.编号++;
          else if (/^[\\u4e00-\\u9fa5]+$/.test(t)) k.中文++;
          else if (/[\\u4e00-\\u9fa5]/.test(t) && /\\d/.test(t)) k.混合++;
          else k.其他++;
        }
        return k;
      })(),
    };
  })()`);

  console.log(`\n=== ${id} (${dirs[0]}) ===`);
  console.log(`  <code> 数: ${o.codeCount}`);
  console.log(`  内容类型: ${JSON.stringify(o.kinds)}`);
  console.log(`  样本:`);
  for (const s of o.samples) console.log(`    「${s.text}」 in ${s.parent}  role=${s.role} aria-hidden=${s.ariaHidden}`);
}

// 检查 CDP 能否读 AX 树
console.log('\n\n=== CDP Accessibility.getFullAXTree 能否验证 ===');
try {
  const client = page;
  await client.send && await client.send('Accessibility.enable');
  const tree = await client.send('Accessibility.getFullAXTree');
  const codeNodes = (tree.nodes || []).filter(n => n.role && n.role.value === 'code');
  console.log(`  AX 树里 role="code" 的节点: ${codeNodes.length} 个（最后一个页面 S21）`);
  if (codeNodes.length) {
    console.log(`  样本: ${codeNodes.slice(0,4).map(n => '「' + (n.name && n.name.value || '').slice(0,16) + '」').join(' ')}`);
  }
} catch (e) {
  console.log('  CDP AX 查询失败:', e.message);
}

await browser.close();
server.close();
