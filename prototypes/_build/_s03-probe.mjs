// S03 读数表探针：量最后一格的内容盒宽度、行盒数与单元格高度
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

// 仓库根由脚本自身位置推得（模板 = check-stale.mjs:16；含 Windows 盘符修正与 39 §3-N10 的 decodeURIComponent）。
const ROOT = decodeURIComponent(new URL('../..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const PORT = 9179;
const TARGET = 'prototypes/S03-long-exposure-observatory/index.html';
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p.endsWith('/')) p += 'index.html';
    const full = join(ROOT, p);
    if (!existsSync(full) || statSync(full).isDirectory()) { res.writeHead(404); return res.end('nf'); }
    res.writeHead(200, { 'Content-Type': MIME[extname(full)] || 'application/octet-stream' });
    res.end(await readFile(full));
  } catch { res.writeHead(500); res.end('e'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

const PROBE = `(() => {
  const out = [];
  const rows = document.querySelectorAll('.readouts tbody tr');
  rows.forEach((tr, i) => {
    const tds = tr.querySelectorAll('td');
    const last = tds[tds.length - 1];
    if (!last) return;
    const cs = getComputedStyle(last);
    const r = last.getBoundingClientRect();
    // 行盒数：把内容矩形拆成一个个 client rect（inline 元素换行会有多个）
    const rects = last.getClientRects();
    out.push({
      i: i + 2,
      padRight: Math.round(parseFloat(cs.paddingRight)),
      clientW: Math.round(last.clientWidth),
      contentW: Math.round(last.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)),
      h: Math.round(r.height),
      lineBoxes: rects.length,
      text: (last.textContent || '').trim().slice(0, 16),
    });
  });
  return out;
})()`;

const browser = await Browser.launch({ width: 1440, height: 900 });
for (const vp of [{ w: 1440, h: 900 }, { w: 768, h: 1024 }, { w: 390, h: 844 }]) {
  const page = await browser.newPage({ width: vp.w, height: vp.h });
  await page.goto(`http://127.0.0.1:${PORT}/${TARGET}`, { settleMs: 2000 });
  const d = await page.eval(PROBE);
  const maxPad = Math.max(...d.map(x => x.padRight));
  const minContent = Math.min(...d.map(x => x.contentW));
  const maxH = Math.max(...d.map(x => x.h));
  const maxLB = Math.max(...d.map(x => x.lineBoxes));
  console.log(`\n  === ${vp.w}×${vp.h} ===`);
  console.log(`    最大 padding-right ${maxPad}px   最小内容盒 ${minContent}px   最大单元格高 ${maxH}px   最多行盒 ${maxLB}`);
  for (const x of d.slice(0, 6)) {
    console.log(`      第${x.i}行  padR=${String(x.padRight).padStart(2)}  内容盒=${String(x.contentW).padStart(3)}px  高=${String(x.h).padStart(3)}  行盒=${x.lineBoxes}  「${x.text}」`);
  }
  await page.close();
}
await browser.close();
server.close();
