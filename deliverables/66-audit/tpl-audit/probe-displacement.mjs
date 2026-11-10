// 甲/乙/丙 取舍要用到的三个数：
//  1) 模板带把方案行往下推了多少（存在感成本）
//  2) 空状态里「没有」与「但有模板」的先后与距离
//  3) 三种接法下用户实际会看到的行数/顺序（用现有 DOM 模拟，不改仓库）
import http from 'node:http';
import { readFileSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { Browser, sleep } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style';
const OUT = 'D:/Web/style/deliverables/66-audit';
const PORT = 9598;
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
  let f = join(ROOT, p);
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!existsSync(f)) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(PORT, r));
const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900 });
await p.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/index.html`, { settleMs: 2000 });

const probe = `(term) => {
  document.getElementById('reset').click();
  const q = document.getElementById('q');
  q.value = term; q.dispatchEvent(new Event('input', { bubbles: true }));
  const rect = (sel) => { const el = document.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); return { top: Math.round(r.top + scrollY), bottom: Math.round(r.bottom + scrollY) }; };
  const strip = document.getElementById('tpl-strip');
  return {
    term,
    ledgerTop: rect('#ledger'),
    firstRowTop: rect('#ledger .row'),
    strip: strip.hidden ? null : rect('#tpl-strip'),
    empty: document.getElementById('empty').hidden ? null : rect('#empty'),
    emptyTpl: document.getElementById('empty-tpl').hidden ? null : rect('#empty-tpl'),
    count: document.getElementById('count').textContent,
  };
}`;

const out = {};
for (const t of ['手作品牌', '烘焙', '设计工作室', '餐厅', '作品集', '内容媒体']) {
  out[t] = await p.eval(`(${probe})(${JSON.stringify(t)})`);
  await sleep(250);
  console.log(t, JSON.stringify(out[t]));
}

// 位移：同为「有方案行」，有模板带 vs 无模板带的首行位置差
const withStrip = out['烘焙'].firstRowTop.top;
const without = out['手作品牌'] ? out['手作品牌'].firstRowTop : null;
console.log('\n首行位置: 烘焙(有模板带)', withStrip, '| 手作品牌(无模板带)', without && without.top, '| 位移', without ? withStrip - without.top : null);

// 空状态里「没有」与「但模板层有」的距离
console.log('\n餐厅: #empty', JSON.stringify(out['餐厅'].empty), '#empty-tpl', JSON.stringify(out['餐厅'].emptyTpl));

writeFileSync(`${OUT}/tpl-audit/displacement.json`, JSON.stringify(out, null, 1), 'utf8');
await b.close(); server.close();
