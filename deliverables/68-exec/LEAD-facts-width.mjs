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
await new Promise(r => server.listen(8423, '127.0.0.1', r));
const browser = await Browser.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, mobile: false });
await page.goto('http://127.0.0.1:8423/prototypes/_selection/index.html', { settleMs: 1400 });

const variants = [
  ['现状（26 / 30 + （原型））', null],
  ['标签回原样「闸门 FAIL=0」', `document.querySelector('#facts dt:nth-of-type(1)');`],
];
// 直接操作 DOM 做 A/B
const measure = async (label, fn) => {
  if (fn) { await page.eval(fn); await new Promise(r => setTimeout(r, 320)); }
  const o = await page.eval(`(() => {
    const mast=document.querySelector('.mast');
    const cols=getComputedStyle(mast).gridTemplateColumns;
    const facts=document.querySelector('.mast-facts');
    const dts=[...document.querySelectorAll('.mast-facts dt')].map(d=>{
      const r=d.getBoundingClientRect(); return d.textContent.trim()+'='+Math.round(r.width);
    });
    return { cols, factsW: Math.round(facts.getBoundingClientRect().width), mastH:+mast.getBoundingClientRect().height.toFixed(1), dts, firstRow:+document.querySelector('li.row').getBoundingClientRect().top.toFixed(1) };
  })()`);
  console.log(`  [${label}] 列=${o.cols}  factsW=${o.factsW}  mast=${o.mastH}  首卡=${o.firstRow}`);
  console.log(`      dt 宽: ${o.dts.join(' | ')}`);
};

console.log('=== 1440 逐步剥离，定位撑宽源 ===');
await measure('现状');

// A: 标签去掉「（原型）」
await measure('去掉（原型）', `(() => { const ds=[...document.querySelectorAll('.mast-facts dt')]; ds[2].textContent='闸门 FAIL=0'; })()`);

// B: 再去掉分数，只留 26
await measure('再只留 26', `(() => { document.getElementById('f-clean').textContent='26'; })()`);

// C: 恢复分数
await measure('恢复 26 / 30', `(() => { document.getElementById('f-clean').textContent='26 / 30'; })()`);

// D: 恢复标签
await measure('恢复（原型）', `(() => { const ds=[...document.querySelectorAll('.mast-facts dt')]; ds[2].textContent='闸门 FAIL=0（原型）'; })()`);

await browser.close();
server.close();
