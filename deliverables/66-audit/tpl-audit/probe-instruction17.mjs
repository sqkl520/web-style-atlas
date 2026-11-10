// 全部 17 个「搜索 0 行但芯片有货」的词：照空状态的字面指示点芯片，是否会得到结果。
import http from 'node:http';
import { readFileSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { Browser, sleep } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style';
const OUT = 'D:/Web/style/deliverables/66-audit';
const PORT = 9601;
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

const rows = JSON.parse(readFileSync(`${OUT}/tpl-audit/matrix.json`, 'utf8'));
const live = JSON.parse(readFileSync(`${OUT}/tpl-audit/live-73.json`, 'utf8'));
const targets = rows.filter((r) => r.inIndex && (live.searched[r.term] || {}).rows === 0);
console.log('候选词数:', targets.length);

const res = [];
for (const r of targets) {
  const t = r.term;
  await p.eval(`(() => { document.getElementById('reset').click(); const q=document.getElementById('q'); q.value=${JSON.stringify(t)}; q.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await sleep(280);
  // 展开「还有 28 个只有近似的 →」，找到芯片（模拟用户按指示操作）
  await p.eval(`(() => { const tg=document.querySelector('.scene-toggle'); const more=document.querySelector('.scene-more'); if (tg && more && getComputedStyle(more).display==='none') tg.click(); })()`);
  await sleep(200);
  await p.eval(`(() => { const c=document.querySelector('[data-scene="' + ${JSON.stringify(t)} + '"]'); if (c) c.click(); })()`);
  await sleep(350);
  const s = await p.eval(`(() => ({
    count: document.getElementById('count').textContent,
    rows: document.querySelectorAll('#ledger .row').length,
    q: document.getElementById('q').value,
    hasChip: !!document.querySelector('.scene-chip[aria-pressed="true"]'),
  }))()`);
  res.push({ term: t, ...s, ok: s.rows > 0 });
  console.log(t.padEnd(6), s.count.padEnd(16), 'chipPressed=', s.hasChip, '| 按指示后可得行数=', s.rows);
}

const bad = res.filter((x) => !x.ok);
console.log('\n按字面指示仍为 0 行:', bad.length, '/', res.length);
console.log(bad.map((x) => x.term).join('、'));
writeFileSync(`${OUT}/tpl-audit/instruction-17.json`, JSON.stringify(res, null, 1), 'utf8');
await b.close(); server.close();
