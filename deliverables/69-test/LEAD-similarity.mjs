// A 项补充验证：3 案端到端产物 vs 原型的视觉相似度（量化「像不像」）
// 这是端到端验证里唯一没被机械判据覆盖的部分
import { Browser } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { createServer } from 'node:http';
import { readFileSync, existsSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = 'D:/Web/style';
const OUT = join(ROOT, 'deliverables/69-test/similarity');
mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf' };
const server = createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const p = join(ROOT, u);
  if (!existsSync(p)) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise(r => server.listen(8570, '127.0.0.1', r));
const browser = await Browser.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, mobile: false });

// 提取「视觉指纹」：色板分布、字号分布、字体、栏结构
async function fingerprint(url) {
  await page.goto(url, { settleMs: 2200 });
  return page.eval(`(() => {
    const toHex = (s) => { const m = s && s.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/); if (!m) return null; const h=n=>(+n).toString(16).padStart(2,'0'); return ('#'+h(m[1])+h(m[2])+h(m[3])).toUpperCase(); };
    const colorArea = {};   // 色 → 面积（近似：元素面积累加）
    const sizeArea = {};    // 字号 → 面积
    const famArea = {};     // 族 → 面积
    let totalArea = 0;
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      const a = r.width * r.height;
      const cs = getComputedStyle(el);
      const bg = toHex(cs.backgroundColor);
      if (bg && cs.backgroundColor !== 'rgba(0, 0, 0, 0)') colorArea[bg] = (colorArea[bg]||0) + a;
      if (el.children.length === 0 && (el.textContent||'').trim()) {
        const fs = Math.round(parseFloat(cs.fontSize));
        sizeArea[fs] = (sizeArea[fs]||0) + a;
        const fam = cs.fontFamily.split(',')[0].replace(/["']/g,'').trim();
        famArea[fam] = (famArea[fam]||0) + a;
        totalArea += a;
      }
    }
    const norm = (o) => { const t = Object.values(o).reduce((a,b)=>a+b,0) || 1; const r = {}; for (const [k,v] of Object.entries(o)) r[k] = +(v/t*100).toFixed(1); return r; };
    // 栏结构
    const grids = [...document.querySelectorAll('*')].filter(e => /repeat|[0-9]+px/.test(getComputedStyle(e).gridTemplateColumns) && getComputedStyle(e).gridTemplateColumns.split(' ').length >= 3);
    const gridCols = grids.slice(0,3).map(g => getComputedStyle(g).gridTemplateColumns.split(' ').length);
    return {
      colors: norm(colorArea),
      sizes: norm(sizeArea),
      fams: norm(famArea),
      gridColCounts: gridCols,
      docH: document.documentElement.scrollHeight,
      screens: +(document.documentElement.scrollHeight / window.innerHeight).toFixed(2),
      hexCount: new Set([...document.querySelectorAll('body *')].map(e=>toHex(getComputedStyle(e).backgroundColor)).filter(Boolean)).size,
    };
  })()`);
}

// 相似度：色板/字号/字体分布的余弦相似度（因为都是百分比向量）
function cosine(a, b) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let dot = 0, na = 0, nb = 0;
  for (const k of keys) { const x = a[k] || 0, y = b[k] || 0; dot += x*y; na += x*x; nb += y*y; }
  return na && nb ? +(dot / Math.sqrt(na*nb)).toFixed(3) : 0;
}

const CASES = [['S20', 'S20-plotter-soundfield'], ['S21', 'S21-interlocking-release-book'], ['S28', 'S28-riso-lp-sleeve-split']];
const rows = [];
for (const [id, dirname] of CASES) {
  const dirs = readdirSync(join(ROOT, 'prototypes')).filter(d => d.startsWith(id + '-'));
  if (!dirs.length) { console.log(`${id}: 原型目录找不到`); continue; }
  const proto = await fingerprint(`http://127.0.0.1:8570/prototypes/${dirs[0]}/index.html`);
  const impl = await fingerprint(`http://127.0.0.1:8570/deliverables/69-test/${id}/index.html`);

  const simColor = cosine(proto.colors, impl.colors);
  const simSize = cosine(proto.sizes, impl.sizes);
  const simFam = cosine(proto.fams, impl.fams);
  const overall = +((simColor + simSize + simFam) / 3).toFixed(3);

  console.log(`\n=== ${id} (原型 ${dirs[0]}) ===`);
  console.log(`  屏数: ${proto.screens} → ${impl.screens}`);
  console.log(`  hex 数: ${proto.hexCount} → ${impl.hexCount}`);
  console.log(`  色板相似度: ${simColor}`);
  console.log(`    原型 top: ${JSON.stringify(Object.entries(proto.colors).sort((a,b)=>b[1]-a[1]).slice(0,4))}`);
  console.log(`    实现 top: ${JSON.stringify(Object.entries(impl.colors).sort((a,b)=>b[1]-a[1]).slice(0,4))}`);
  console.log(`  字号相似度: ${simSize}   原型 ${JSON.stringify(proto.sizes)}  实现 ${JSON.stringify(impl.sizes)}`);
  console.log(`  字体相似度: ${simFam}   原型 ${JSON.stringify(proto.fams)}  实现 ${JSON.stringify(impl.fams)}`);
  console.log(`  ★ 综合视觉相似度: ${overall}`);
  rows.push({ id, simColor, simSize, simFam, overall, protoScreens: proto.screens, implScreens: impl.screens });
}

writeFileSync(join(OUT, 'similarity.json'), JSON.stringify(rows, null, 1), 'utf8');
console.log('\n\n=== 汇总 ===');
for (const r of rows) console.log(`  ${r.id}: 综合 ${r.overall}（色 ${r.simColor} / 字号 ${r.simSize} / 字体 ${r.simFam}）`);
const avg = rows.reduce((a,r)=>a+r.overall,0)/rows.length;
console.log(`  平均: ${avg.toFixed(3)}`);

await browser.close();
server.close();
