// 任务 1 探针 G：五案在 1440px 审查视口下的**单位正确**真值。
// 三条量纲分开记，最后各自折算到屏幕 px：
//   abs    —— CSS border-*-width / outline-width 的 computed 值（真 px，与视口无关）
//   ns     —— SVG stroke 且 vector-effect:non-scaling-stroke（真 px）
//   scaled —— SVG stroke 且会随 viewBox 缩放：declared × (rect.width / viewBox.width)
// 只统计「真的有元素在用」的值（computed 交叉验证），避免把死代码算进去。
import http from 'node:http';
import { readFileSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const P = 'D:/Web/style/prototypes';
const OUT = 'D:/Web/style/deliverables/69-audit';
const PORT = 8532;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const f = join(P, decodeURIComponent(req.url.split('?')[0]));
  if (!existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f).toLowerCase()] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(PORT, r));

const CASES = [
  ['S09', 'S09-batik-price-board'],
  ['S10', 'S10-grid-versus-sheet'],
  ['S15', 'S15-fishery-floor-ledger'],
  ['S25', 'S25-spotcolor-contents-zine'],
  ['S27', 'S27-hand-painted-bill-dispatch'],
];

const b = await Browser.launch({ width: 1440, height: 900 });
const out = {};
for (const [id, dir] of CASES) {
  const p = await b.newPage({ width: 1440, height: 900 });
  await p.goto(`http://127.0.0.1:${PORT}/${dir}/index.html`, { settleMs: 2000 });
  const r = await p.eval(() => {
    const r2 = (n) => Math.round(n * 100) / 100;
    const abs = new Map(), ns = new Map(), scaled = new Map();
    const bump = (mp, k, info) => {
      if (!mp.has(k)) mp.set(k, { n: 0, hosts: [] });
      const rec = mp.get(k); rec.n++;
      if (info && rec.hosts.length < 4 && !rec.hosts.includes(info)) rec.hosts.push(info);
    };
    for (const el of document.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      const tag = el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
      for (const s of ['Top', 'Right', 'Bottom', 'Left']) {
        const w = parseFloat(cs['border' + s + 'Width']);
        if (w > 0 && cs['border' + s + 'Style'] !== 'none' && !/rgba\(0, 0, 0, 0\)/.test(cs['border' + s + 'Color'])) bump(abs, r2(w), tag);
      }
      if (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) bump(abs, r2(parseFloat(cs.outlineWidth)), tag + ' [outline]');
    }
    for (const el of document.querySelectorAll('svg *, svg')) {
      const cs = getComputedStyle(el);
      const sw = parseFloat(cs.strokeWidth);
      if (!(sw > 0)) continue;
      if (!cs.stroke || cs.stroke === 'none' || /rgba\(0, 0, 0, 0\)/.test(cs.stroke)) continue;
      const root = el.ownerSVGElement || (el.tagName.toLowerCase() === 'svg' ? el : null);
      if (!root) continue;
      const rect = root.getBoundingClientRect();
      if (!rect.width) continue;
      if (cs.vectorEffect === 'non-scaling-stroke') { bump(ns, r2(sw), 'svg'); continue; }
      const vb = root.viewBox && root.viewBox.baseVal;
      const vbw = vb && vb.width > 0 ? vb.width : rect.width;
      const scale = rect.width / vbw;
      bump(scaled, r2(sw * scale), 'declared ' + r2(sw) + ' ×scale ' + r2(scale));
    }
    const arr = (mp) => [...mp.entries()].map(([k, v]) => ({ px: +k, n: v.n, hosts: v.hosts })).sort((a, c) => a.px - c.px);
    return { abs: arr(abs), ns: arr(ns), scaled: arr(scaled), vw: innerWidth };
  });
  out[id] = r;
  console.log('\n==== ' + id + ' @' + r.vw + 'px ====');
  console.log('  CSS 绝对(px)      :', r.abs.map((x) => x.px + '×' + x.n).join(', ') || '—');
  console.log('  SVG non-scaling   :', r.ns.map((x) => x.px + '×' + x.n).join(', ') || '—');
  console.log('  SVG 折算到 px     :', r.scaled.map((x) => x.px + '(' + x.hosts[0] + ')').join(', ') || '—');
  await p.close();
}
await b.close(); server.close();
writeFileSync(join(OUT, 't1-five-desktop.json'), JSON.stringify(out, null, 1), 'utf8');
console.log('\nwrote t1-five-desktop.json');
