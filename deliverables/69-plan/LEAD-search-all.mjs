// 从页面读真实的 sceneIndex 与 unsupported，算清缺口
import { Browser } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { createServer } from 'node:http';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
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
await new Promise(r => server.listen(8590, '127.0.0.1', r));
const browser = await Browser.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, mobile: false });
await page.goto('http://127.0.0.1:8590/prototypes/_selection/index.html', { settleMs: 1500 });

const data = await page.eval(`(() => {
  const P = window.STYLE_PROMPTS || {};
  const idx = P.sceneIndex || {};
  const terms = Object.keys(idx);
  const direct = terms.filter(t => (idx[t].direct||[]).length > 0);
  const nearOnly = terms.filter(t => (idx[t].direct||[]).length === 0 && (idx[t].near||[]).length > 0);
  const emptyBoth = terms.filter(t => (idx[t].direct||[]).length === 0 && (idx[t].near||[]).length === 0);
  return {
    total: terms.length,
    terms,
    direct, nearOnly, emptyBoth,
    unsupported: window.UNSUPPORTED || P.unsupported || null,
    keys: Object.keys(P),
  };
})()`);

console.log('=== sceneIndex 结构 ===');
console.log(`  总词数: ${data.total}`);
console.log(`  direct 非空: ${data.direct.length} → ${data.direct.join('、')}`);
console.log(`  只有 near: ${data.nearOnly.length} → ${data.nearOnly.join('、')}`);
console.log(`  两者皆空: ${data.emptyBoth.length} ${data.emptyBoth.length ? '→ ' + data.emptyBoth.join('、') : ''}`);
console.log(`\nSTYLE_PROMPTS 的键: ${JSON.stringify(data.keys)}`);
console.log(`unsupported: ${data.unsupported ? (Array.isArray(data.unsupported) ? data.unsupported.length + ' 个' : typeof data.unsupported) : '未暴露到 window'}`);

// 关键：哪些词在索引里但两者皆空 == 搜了必 0 行
if (data.emptyBoth.length) {
  console.log(`\n⚠️ 在索引里但 direct/near 都空 → 搜了必 0 行: ${data.emptyBoth.length} 个`);
}

// 用 CDP 实测：对每个词搜一遍，数真实行数
console.log('\n=== 实测：44 个词逐个搜索的真实结果 ===');
const results = [];
for (const t of data.terms) {
  await page.eval(`(() => { const i=document.querySelector('.search input') || document.querySelector('input[type=search]') || document.querySelector('#q'); if(i){ i.value=${JSON.stringify(t)}; i.dispatchEvent(new Event('input',{bubbles:true})); } })()`);
  await new Promise(r => setTimeout(r, 180));
  const r = await page.eval(`(() => {
    const rows = document.querySelectorAll('li.row');
    const cnt = document.querySelector('#count') ? document.querySelector('#count').textContent : '';
    const empty = document.getElementById('empty');
    const emptyVis = empty && getComputedStyle(empty).display !== 'none' && !empty.hidden;
    return { rows: rows.length, count: (cnt||'').trim().slice(0,40), emptyVisible: !!emptyVis };
  })()`);
  results.push({ term: t, ...r });
}
// 清空
await page.eval(`(() => { const i=document.querySelector('.search input') || document.querySelector('input[type=search]') || document.querySelector('#q'); if(i){ i.value=''; i.dispatchEvent(new Event('input',{bubbles:true})); } })()`);

const zero = results.filter(r => r.rows === 0);
console.log(`  实测 0 行的词: ${zero.length} / ${results.length}`);
console.log(`  0 行的词: ${zero.map(r => r.term).join('、')}`);
const nonzero = results.filter(r => r.rows > 0);
console.log(`\n  有结果的词（${nonzero.length} 个）:`);
for (const r of nonzero.slice(0, 20)) console.log(`    ${r.term}: ${r.rows} 行  「${r.count}」`);

writeFileSync('deliverables/69-plan/search-results.json', JSON.stringify(results, null, 1), 'utf8');
await browser.close();
server.close();
