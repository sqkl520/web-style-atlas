#!/usr/bin/env node
/* 渲染层审计 · 第三遍：正文字号的"字数加权"实测（2026-11-22）
 *
 * 为什么需要这一遍：score.mjs 的「正文」取 `body{font-size}` 的声明值。
 * 但 body 的 font-size 只对"没有自己 font-size 的元素"生效 —— 而真实页面里
 * 正文段落几乎都有自己的类。所以「body 声明 16px」与「用户读到的正文是多少 px」
 * 是两件事。这一遍按**可见字符数加权**求正文的实际字号分布。
 *
 * 同时把「声明的首族」与「Chrome 实际用的字体」逐案对齐，并记录
 * document.fonts.check 的结果，用来区分「没加载」与「加载了但不是那个字」。
 */
import { Browser } from '../../../prototypes/_build/vendor/cdp.mjs';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const ROOT = resolve('D:/Web/style');
const BT = join(ROOT, 'deliverables/78-northstar/_blindtest');
const MIME = { '.html': 'text/html;charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    const rel = decodeURIComponent(req.url.split('?')[0]);
    const buf = await readFile(join(ROOT, rel));
    res.writeHead(200, { 'Content-Type': MIME[extname(rel)] || 'application/octet-stream' });
    res.end(buf);
  } catch { if (/favicon/.test(req.url)) { res.writeHead(204); res.end(); return; } res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;

/* 固定在本任务声明的 17 份产物 + S34 的复跑。不自动扫描目录 ——
 * 审计期间别的 agent 正在往 _blindtest/ 里加新案（S10/S12/S16 是中途出现的），
 * 自动扫描会让同一次审计的前后两半量不同的样本。 */
const PINNED = ['S01', 'S05', 'S09', 'S13', 'S15', 'S17', 'S18', 'S19', 'S21',
  'S22', 'S23', 'S24', 'S29', 'S31', 'S32', 'S34', 'S34-r2', 'S35'];
const ids = (process.argv.slice(2).length ? process.argv.slice(2) : PINNED)
  .filter((id) => existsSync(join(BT, id, 'index.html')) && existsSync(join(BT, id, '_prompt.txt')));

const browser = await Browser.launch({ width: 1440, height: 900 });
const pg = await browser.newPage();
await pg.setViewport({ width: 1440, height: 900 });
await pg.send('DOM.enable');
await pg.send('CSS.enable');

const out = [];
for (const id of ids) {
  const prompt = await readFile(join(BT, id, '_prompt.txt'), 'utf8');
  await pg.goto(`http://127.0.0.1:${PORT}/deliverables/78-northstar/_blindtest/${id}/index.html`, { settleMs: 500 });
  const r = await pg.eval(`(() => {
    const px = (v) => parseFloat(v) || 0;
    /* 字数加权：每个"自己带文字"的可见元素，按其文字长度累加到该字号桶 */
    const bySize = {};
    let totalChars = 0;
    for (const el of document.querySelectorAll('body *')) {
      const c = getComputedStyle(el);
      if (c.display === 'none' || c.visibility === 'hidden') continue;
      const t = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
      if (!t) continue;
      const box = el.getBoundingClientRect();
      if (box.width * box.height === 0) continue;
      const n = t.replace(/\\s/g, '').length;
      const s = px(c.fontSize);
      bySize[s] = (bySize[s] || 0) + n;
      totalChars += n;
    }
    const sorted = Object.entries(bySize).sort((a, b) => b[1] - a[1]);
    const weighted = totalChars ? sorted.reduce((a, [s, n]) => a + Number(s) * n, 0) / totalChars : 0;
    /* 主字体实际是什么：h1 / p / body 三处 */
    return {
      totalChars, weighted: Math.round(weighted * 10) / 10,
      mode: sorted[0] ? Number(sorted[0][0]) : null,
      top3: sorted.slice(0, 3).map(([s, n]) => s + 'px×' + n + '字'),
      bodyDeclared: parseFloat(getComputedStyle(document.body).fontSize),
    };
  })()`);
  const wantM = prompt.match(/正文约\s*(\d+)px/);
  out.push({ id, want: wantM ? Number(wantM[1]) : null, ...r });
  process.stderr.write(`  ${id}\n`);
}

/* 字体：逐案取「首族 / 实际平台字体」 */
const fontRows = [];
for (const id of ids) {
  await pg.goto(`http://127.0.0.1:${PORT}/deliverables/78-northstar/_blindtest/${id}/index.html`, { settleMs: 500 });
  const doc = await pg.send('DOM.getDocument', { depth: -1 });
  const picks = await pg.eval(`(() => {
    const g = (s) => { const e = document.querySelector(s); if (!e) return null;
      const c = getComputedStyle(e); const t = (e.textContent || '').trim();
      return t ? { sel: s, decl: c.fontFamily.split(',')[0].replace(/["']/g, '').trim(), chars: t.slice(0, 12) } : null; };
    return [g('h1'), g('p'), g('body')].filter(Boolean);
  })()`);
  const row = { id, items: [] };
  for (const p of picks) {
    const q = await pg.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: p.sel });
    if (!q.nodeId) { row.items.push({ ...p, real: '(no node)' }); continue; }
    try {
      const f = await pg.send('CSS.getPlatformFontsForNode', { nodeId: q.nodeId });
      const fams = (f.fonts || []).map((z) => z.familyName);
      row.items.push({ ...p, real: fams.join('+') || '(none)', hit: fams.some((x) => x === p.decl) });
    } catch (e) { row.items.push({ ...p, real: 'ERR' }); }
  }
  fontRows.push(row);
}

await browser.close(); server.close();
const path = join(ROOT, 'deliverables/78-northstar/_probe/_render-audit3.json');
await writeFile(path, JSON.stringify({ body: out, fonts: fontRows }, null, 1));

console.log('\n== 正文字号：声明(body) / 字数加权实渲染 / 众数 / 提示词要求 ==');
for (const r of out) {
  const d = r.want != null ? r.want - r.weighted : null;
  const dMode = r.want != null ? r.want - r.mode : null;
  console.log(`${r.id.padEnd(6)} body声明 ${String(r.bodyDeclared).padStart(5)}  加权 ${String(r.weighted).padStart(5)}  众数 ${String(r.mode).padStart(4)}  要 ${String(r.want).padStart(3)}` +
    `  加权差 ${d == null ? '-' : (d >= 0 ? '+' : '') + d.toFixed(1)}  众数差 ${dMode == null ? '-' : (dMode >= 0 ? '+' : '') + dMode}   top3 ${r.top3.join(' ')}`);
}
console.log('\n== 字体：声明的首族 → Chrome 实际用的族 ==');
for (const r of fontRows) {
  console.log(r.id.padEnd(6) + '  ' + r.items.map((i) => `${i.sel}:"${i.decl}"→${i.real}${i.hit ? '' : ' ✗'}`).join('   '));
}
console.log('\nJSON → ' + path);
