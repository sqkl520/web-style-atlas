// 任务 1 探针 E：**单位感知**的真值。
//
// 我上一版探针 D 的验证器有一个硬错误：把 SVG 用户单位当成 px。
//   反例 S09：`.ico path{stroke-width:3.6}` 在 viewBox="0 0 24 24" 的图标里，
//   渲染到 20px → 实际 3.0px；写成 "3.6px" 是单位错误，和 "2px 边框" 不同量纲。
//   反例 S27：data-URI 图标 `stroke-width=1.8` 在 24×24 里缩到 16px → 1.2px。
// 把这两类混进同一个集合，就会得出「提示词漏报了 3.6px」这种**我自己的假缺陷**。
//
// 所以这里分三路，各自量纲独立：
//   P1  CSS 绝对长度：computed border-*-width / outline-width（真 px）
//   P2  SVG non-scaling 描边：vector-effect:non-scaling-stroke（真 px，不随缩放）
//   P3  SVG 用户单位描边：declared × (rect.width / viewBox.width)  → 折算成 px
// 提示词说 "Npx" 时，只能与 P1∪P2∪P3 折算后的值比（都换算到屏幕 px）。
import http from 'node:http';
import { readFileSync, existsSync, statSync, readdirSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const P = 'D:/Web/style/prototypes';
const OUT = 'D:/Web/style/deliverables/69-audit';
const PORT = 8531;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.avif': 'image/avif' };
const server = http.createServer((req, res) => {
  const f = join(P, decodeURIComponent(req.url.split('?')[0]));
  if (!existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f).toLowerCase()] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(PORT, r));

const dirs = readdirSync(P).filter((d) => /^S\d\d-/.test(d)).sort();
const b = await Browser.launch({ width: 1440, height: 900 });
const truth = {};

for (const dir of dirs) {
  const id = dir.slice(0, 3);
  const p = await b.newPage({ width: 1440, height: 900 });
  await p.goto(`http://127.0.0.1:${PORT}/${dir}/index.html`, { settleMs: 1500 });
  const r = await p.eval(() => {
    const r2 = (n) => Math.round(n * 100) / 100;
    const P1 = new Map();  // px -> count   CSS 绝对长度
    const P2 = new Map();  // px -> count   non-scaling 描边
    const P3 = new Map();  // 折算 px -> {raw, scale, count}

    const bump = (mp, k, n = 1) => mp.set(k, (mp.get(k) || 0) + n);

    for (const el of document.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      for (const s of ['Top', 'Right', 'Bottom', 'Left']) {
        const w = parseFloat(cs['border' + s + 'Width']);
        if (w > 0 && cs['border' + s + 'Style'] !== 'none' && cs['border' + s + 'Color'] !== 'rgba(0, 0, 0, 0)') bump(P1, r2(w));
      }
      if (cs.outlineStyle !== 'none') {
        const ow = parseFloat(cs.outlineWidth);
        if (ow > 0) bump(P1, r2(ow));
      }
    }

    // SVG 描边
    for (const el of document.querySelectorAll('svg *, svg')) {
      const cs = getComputedStyle(el);
      const sw = parseFloat(cs.strokeWidth);
      if (!(sw > 0)) continue;
      if (!cs.stroke || cs.stroke === 'none' || cs.stroke === 'rgba(0, 0, 0, 0)') continue;
      const root = el.ownerSVGElement || (el.tagName.toLowerCase() === 'svg' ? el : null);
      if (!root) continue;
      const rect = root.getBoundingClientRect();
      if (!rect.width) continue;
      if (cs.vectorEffect === 'non-scaling-stroke') { bump(P2, r2(sw)); continue; }
      const vb = root.viewBox && root.viewBox.baseVal;
      const vbw = vb && vb.width > 0 ? vb.width : rect.width;
      const scale = rect.width / vbw;
      bump(P3, r2(sw * scale), { raw: sw, scale: r2(scale), vbw: r2(vbw), rectw: r2(rect.width) });
    }

    const toArr = (mp) => [...mp.entries()].map(([k, v]) => ({ px: +k, n: typeof v === 'number' ? v : v.count })).sort((a, c) => a.px - c.px);
    return { P1: toArr(P1), P2: toArr(P2), P3: toArr(P3) };
  });
  truth[id] = r;
  const f = (a) => a.map((x) => x.px).join(',') || '—';
  console.log(id, 'CSS绝对=' + f(r.P1).padEnd(20), 'nonScaling=' + f(r.P2).padEnd(10), 'SVG折算=' + r.P3.map((x) => x.px + '(raw' + (x.raw !== undefined ? x.raw : '?') + ')').join(',') || '—');
  await p.close();
}
await b.close(); server.close();
writeFileSync(join(OUT, 't1-truth-units.json'), JSON.stringify(truth, null, 1), 'utf8');
console.log('\nwrote t1-truth-units.json');
