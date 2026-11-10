// 核实：sceneIndex 与搜索框的脱节机制
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
await new Promise(r => server.listen(8591, '127.0.0.1', r));
const browser = await Browser.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, mobile: false });
await page.goto('http://127.0.0.1:8591/prototypes/_selection/index.html', { settleMs: 1500 });

// 1) 读 match() 的实现
const code = await page.eval(`(() => {
  // 试着从页面里找到 match 函数源代码（它是 IIFE 私有，试试 source）
  const out = {};
  // 找搜索框与 sceneIds
  const inp = document.querySelector('.search input') || document.querySelector('input[type=search]') || document.querySelector('#q');
  out.searchInput = inp ? { id: inp.id, cls: inp.className, placeholder: inp.placeholder } : null;
  out.hasRailFold = !!document.getElementById('rail-fold');
  // 统计每案的 haystack 里有没有「咖啡店」
  const found = [];
  for (const r of (window.SCHEMES || [])) {
    const hay = JSON.stringify(r).toLowerCase();
    if (hay.includes('咖啡店')) found.push(r.id);
  }
  out.casesWithCoffeeShop = found;
  return out;
})()`);
console.log('=== 页面结构 ===');
console.log('  搜索框:', JSON.stringify(code.searchInput));
console.log('  data.js 里含「咖啡店」的案:', JSON.stringify(code.casesWithCoffeeShop), `(${code.casesWithCoffeeShop.length} 个)`);

// 2) 对比：搜「咖啡店」vs 搜「咖啡」
console.log('\n=== 同一个概念，两种搜法 ===');
for (const q of ['咖啡店', '咖啡', 'S06', '茶饮', '茶', '餐厅', '餐']) {
  await page.eval(`(() => { const i=document.querySelector('.search input') || document.querySelector('input[type=search]') || document.querySelector('#q'); i.value=${JSON.stringify(q)}; i.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await new Promise(r => setTimeout(r, 200));
  const r = await page.eval(`(() => ({ rows: document.querySelectorAll('li.row').length, count: (document.getElementById('count')||{}).textContent }))()`);
  console.log(`  搜「${q}」→ ${r.rows} 行  ${(r.count||'').trim()}`);
}

// 3) 芯片点击 vs 搜索
console.log('\n=== 芯片点击（sceneIndex 路径）vs 搜索框（haystack 路径）===');
await page.eval(`(() => { const i=document.querySelector('.search input') || document.querySelector('input[type=search]') || document.querySelector('#q'); i.value=''; i.dispatchEvent(new Event('input',{bubbles:true})); })()`);
await new Promise(r => setTimeout(r, 300));
// 找「咖啡店」芯片
const chipInfo = await page.eval(`(() => {
  const btns = [...document.querySelectorAll('button')];
  const target = btns.find(b => b.textContent.trim().startsWith('咖啡店'));
  if (!target) return { found: false, sample: btns.slice(0,8).map(b=>b.textContent.trim().slice(0,16)) };
  target.click();
  return { found: true, text: target.textContent.trim().slice(0,30), pressed: target.getAttribute('aria-pressed') };
})()`);
console.log('  点「咖啡店」芯片:', JSON.stringify(chipInfo));
await new Promise(r => setTimeout(r, 500));
const afterChip = await page.eval(`(() => ({ rows: document.querySelectorAll('li.row').length, count: (document.getElementById('count')||{}).textContent, q: (document.querySelector('.search input')||{}).value, sceneIds: (window.__state||{}).sceneIds }))()`);
console.log(`  → ${afterChip.rows} 行  「${(afterChip.count||'').trim()}」  搜索框值="${afterChip.q}"`);

// 4) 最终对比：搜索是子串匹配，芯片是白名单
console.log('\n=== 结论 ===');
console.log('  搜索框 = 对 30 案的文本做整串子串匹配');
console.log('  芯片   = 用 sceneIndex 的 direct/near 列表做白名单过滤');
console.log('  两者是两套完全独立的机制，且 sceneIndex 的词不保证出现在案的文本里');

await browser.close();
server.close();
