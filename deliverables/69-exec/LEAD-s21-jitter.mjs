// 查清 S21 的 A/B 差异：是 role="none" 引起，还是自身抖动
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
await new Promise(r => server.listen(8604, '127.0.0.1', r));
const browser = await Browser.launch({ headless: true });
const page = await browser.newPage();
const dirs = readdirSync(join(ROOT, 'prototypes')).filter(d => d.startsWith('S21-'));
await page.setViewport({ width: 1440, height: 900, mobile: false });

const MEASURE = `(() => {
  const parts = [];
  for (const el of document.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (r.width < 0.5 || r.height < 0.5) continue;
    parts.push(el.tagName + ':' + r.width.toFixed(2) + ',' + r.height.toFixed(2) + '@' + r.top.toFixed(2) + ',' + r.left.toFixed(2));
  }
  const s = parts.join('|');
  let h = 0; for (let i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
  return { n: parts.length, hash: h, sample: parts.slice(0, 3) };
})()`;

console.log('=== S21 稳定性测试：同状态连测 5 次 ===');
await page.goto(`http://127.0.0.1:8604/prototypes/${dirs[0]}/index.html`, { settleMs: 2500 });
for (let i = 0; i < 5; i++) {
  const m = await page.eval(MEASURE);
  console.log(`  第 ${i + 1} 次: n=${m.n} hash=${m.hash}`);
  await new Promise(r => setTimeout(r, 400));
}

console.log('\n=== 加载后等待时间的影响 ===');
for (const wait of [1000, 2000, 3000, 5000]) {
  await page.goto(`http://127.0.0.1:8604/prototypes/${dirs[0]}/index.html`, { settleMs: wait });
  const m = await page.eval(MEASURE);
  console.log(`  等 ${wait}ms: n=${m.n} hash=${m.hash}`);
}

console.log('\n=== 反复切换 role="none" 5 轮 ===');
await page.goto(`http://127.0.0.1:8604/prototypes/${dirs[0]}/index.html`, { settleMs: 2500 });
for (let i = 0; i < 5; i++) {
  // 移除
  await page.eval(`(() => { for (const c of document.querySelectorAll('code[role="none"]')) c.removeAttribute('role'); })()`);
  await new Promise(r => setTimeout(r, 300));
  const off = await page.eval(MEASURE);
  // 加回
  await page.eval(`(() => { for (const c of document.querySelectorAll('code:not([role])')) c.setAttribute('role','none'); })()`);
  await new Promise(r => setTimeout(r, 300));
  const on = await page.eval(MEASURE);
  console.log(`  轮 ${i + 1}: 无role hash=${off.hash}  有role hash=${on.hash}  ${off.hash === on.hash ? '相同' : '不同'}`);
}

// 找出差异元素（如果有）
console.log('\n=== 找具体差异元素 ===');
await page.goto(`http://127.0.0.1:8604/prototypes/${dirs[0]}/index.html`, { settleMs: 2500 });
const diff = await page.eval(`(() => {
  const snap = () => [...document.querySelectorAll('*')].map(el => { const r = el.getBoundingClientRect(); return { t: el.tagName, c: (el.className||'').toString().slice(0,20), w: +r.width.toFixed(2), h: +r.height.toFixed(2), top: +r.top.toFixed(2) }; });
  const A = snap();
  for (const c of document.querySelectorAll('code[role="none"]')) c.removeAttribute('role');
  const B = snap();
  const diffs = [];
  for (let i = 0; i < Math.min(A.length, B.length); i++) {
    const a = A[i], b = B[i];
    if (a.w !== b.w || a.h !== b.h || a.top !== b.top) diffs.push({ i, tag: a.t, cls: a.c, A: a.w + 'x' + a.h + '@' + a.top, B: b.w + 'x' + b.h + '@' + b.top });
  }
  return { total: A.length, diffCount: diffs.length, first: diffs.slice(0, 6) };
})()`);
console.log(`  元素总数 ${diff.total}，差异 ${diff.diffCount} 个`);
for (const d of diff.first) console.log(`    [${d.i}] ${d.tag}.${d.cls}: ${d.A} → ${d.B}`);

await browser.close();
server.close();
